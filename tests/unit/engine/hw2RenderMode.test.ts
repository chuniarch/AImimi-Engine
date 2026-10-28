import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Engine } from '@/engine'
import type { SceneSetup } from '@/engine/SceneSetup'
import { EngineOperationError } from '@/errors/EngineError/EngineOperationError'
import { SceneHandoffError } from '@/errors/EngineError/SceneHandoffError'
import { Renderer } from '@/rendering/Renderer'
import type { DrawSubmission, RenderBackend } from '@/rendering/backend/RenderBackend'
import type { WebGLContextFailure } from '@/rendering/backend/webgl1/WebGLContextLifecycle'
import { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import { Resource } from '@/rendering/core/Resource'
import { WebGLContextLostError } from '@/rendering/core/errors'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

/** 只替换设备和旧平台边界；新 Renderer/Pipeline/Builder 与 CPU 场景保持真实。 */
const hooks = vi.hoisted(() => ({
  createBackend: vi.fn<(canvas: HTMLCanvasElement) => object>(),
  legacyRender: vi.fn(),
  legacyClear: vi.fn(),
  controls: { enabled: true, update: vi.fn(), dispose: vi.fn(), target: { set: vi.fn() } },
  loadAxes: vi.fn<() => Promise<void>>(async () => undefined),
  monitorUpdate: vi.fn()
}))

vi.mock('@/rendering/backend/webgl1/WebGL1Backend', () => ({
  WebGL1Backend: class {
    constructor(canvas: HTMLCanvasElement) {
      return hooks.createBackend(canvas)
    }
  }
}))

vi.mock('@/renderers/WebGLRenderer', () => ({
  WebGLRenderer: class {
    render = hooks.legacyRender
    clearRenderPasses = hooks.legacyClear
    getOverlayRenderPass() {
      return { dispose() {} }
    }
  }
}))

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor() {
      return hooks.controls
    }
  }
}))

vi.mock('@/logging/Logger', () => ({
  logger: { info: vi.fn(), debug: vi.fn() }
}))

vi.mock('@/monitors/PerformanceMonitor', () => ({
  PerformanceMonitor: class {
    update = hooks.monitorUpdate
  }
}))

vi.mock('@/scenes/axes/loadAxes', () => ({ loadAxes: hooks.loadAxes }))

vi.mock('@/_config/glCapabilities', () => ({
  initCapabilities() {},
  getCapabilities: () => ({ elementIndexUint: true, floatLinearFilter: true })
}))

vi.mock('@/utils/platform', () => ({ getClampedDPR: () => 2 }))

/** 可控设备端口；不模拟 Scene、矩阵或新 Renderer 的行为。 */
class Device implements RenderBackend {
  ready = true
  lastFailure: WebGLContextFailure | null = null
  lastSuppressedError = null
  scopes = 0
  disposals = 0
  failDispose = false

  constructor(private readonly canvas: HTMLCanvasElement) {}

  resizeDrawingBuffer(width: number, height: number, ratio: number): void {
    this.canvas.width = Math.max(1, Math.floor(width * ratio))
    this.canvas.height = Math.max(1, Math.floor(height * ratio))
  }

  withRenderSurface(_descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void {
    this.scopes++
    callback()
  }

  draw(_submission: DrawSubmission): void {}

  dispose(): void {
    this.disposals++
    if (this.failDispose) throw new Error('GPU cleanup failed')
    this.ready = false
  }
}

/**
 * 代替后端预检的替身设备：每次进门按 WebGL1ProgramManager.checkError 的规则收集 GL 错误，
 * 最多读 32 次、读到 NO_ERROR 为止，收集到就抛错，和真实预检一样让整帧失败。
 * 真实预检只在 program 第一次 draw 前（冷路径）做；空场景没有 draw，所以放在进门时，而且每次都查。
 */
class PreflightDevice extends Device {
  constructor(
    canvas: HTMLCanvasElement,
    private readonly gl: { readonly NO_ERROR: number; getError(): number },
    private readonly preflights: number[][]
  ) {
    super(canvas)
  }

  override withRenderSurface(
    descriptor: RenderSurfaceScopeDescriptor,
    callback: () => undefined
  ): void {
    const codes: number[] = []
    for (let read = 0; read < 32; read += 1) {
      const code = this.gl.getError()
      if (code === this.gl.NO_ERROR) break
      codes.push(code)
    }
    this.preflights.push(codes)
    if (codes.length > 0) throw new Error('WebGL preflight failed: GL errors: ' + codes.join(', '))
    super.withRenderSurface(descriptor, callback)
  }
}

/** 通过真实 Scene → Resource 生命周期制造同步释放回调。 */
class TestResource extends Resource {
  protected readonly resourceType = 'TestResource'
  protected override disposeCPUData(): void {}
}

/** 不需要 Mesh 就能观察空场景进入 ForwardPass 的清屏 scope。 */
function createPair() {
  const scene = new Scene()
  const camera = new PerspectiveCamera({
    fovY: Math.PI / 4,
    aspect: 1,
    near: 0.1,
    far: 100
  })
  scene.add(camera)
  return { scene, camera }
}

type Pair = ReturnType<typeof createPair>
type Fixture = ReturnType<typeof createFixture>

/** HW2 的安装形状：默认交一个新的真实 ForwardPass。 */
function setupOf(pair: Pair, passes: readonly RenderPass[] = [new ForwardPass()]): SceneSetup {
  return { scene: pair.scene, camera: pair.camera, passes }
}

/**
 * 记录执行与释放的 Pass；不 draw，所以不改变设备的 scope 计数。
 * failDispose 用来模拟旧 Pipeline 清理失败，onDispose 用来模拟释放回调重入。
 */
class ProbePass implements RenderPass {
  executions = 0
  disposals = 0
  failDispose: unknown = null
  onDispose: (() => void) | null = null

  constructor(
    readonly name: string,
    private readonly events: string[] = []
  ) {}

  execute(): undefined {
    this.executions++
    this.events.push(this.name)
    return undefined
  }

  dispose(): void {
    this.disposals++
    this.events.push('dispose ' + this.name)
    this.onDispose?.()
    if (this.failDispose !== null) throw this.failDispose
  }
}

/** 使用可控 rAF 队列，防止测试依赖真实时间或留下无限动画循环。 */
function createFixture() {
  const windowTarget = Object.assign(new EventTarget(), { innerWidth: 320, innerHeight: 200 })
  const callbacks = new Map<number, FrameRequestCallback>()
  let requestId = 0
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++requestId
    callbacks.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))

  let lost = false
  /** 旧路径留在 context 上、还没被读走的 GL 错误；getError 每次读走一个，读空后返回 NO_ERROR。 */
  const pendingGLErrors: number[] = []
  const enabledCapabilities = new Set<number>()
  let depthWrite = true
  const canvas = Object.assign(new EventTarget(), {
    width: 1,
    height: 1,
    style: { width: '', height: '' },
    getContext: () => gl
  })
  const gl = {
    canvas,
    CULL_FACE: 0x0b44,
    FRONT: 0x0404,
    BACK: 0x0405,
    DEPTH_WRITEMASK: 0x0b72,
    enable: vi.fn((capability: number) => enabledCapabilities.add(capability)),
    disable: vi.fn((capability: number) => enabledCapabilities.delete(capability)),
    isEnabled: (capability: number) => enabledCapabilities.has(capability),
    cullFace: vi.fn(),
    depthMask: vi.fn((value: boolean) => {
      depthWrite = value
    }),
    getParameter: (parameter: number) => (parameter === 0x0b72 ? depthWrite : undefined),
    isContextLost: () => lost,
    NO_ERROR: 0,
    getError: vi.fn(() => pendingGLErrors.shift() ?? 0),
    viewport: vi.fn(),
    get drawingBufferWidth() {
      return canvas.width
    },
    get drawingBufferHeight() {
      return canvas.height
    }
  }
  const devices: Device[] = []
  hooks.createBackend.mockImplementation((target) => {
    const device = new Device(target)
    devices.push(device)
    return device
  })
  const engine = Engine.create(canvas as unknown as HTMLCanvasElement)
  hooks.controls.update.mockClear()

  /** 一次只运行已经安排的一帧，新安排的下一帧留在队列中。 */
  function step(): void {
    const entry = callbacks.entries().next().value
    if (!entry) throw new Error('No scheduled frame')
    callbacks.delete(entry[0])
    entry[1](0)
  }

  return {
    engine,
    canvas,
    gl,
    devices,
    windowTarget,
    callbacks,
    step,
    pendingGLErrors,
    setLost(value: boolean) {
      lost = value
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.controls.enabled = true
  hooks.loadAxes.mockImplementation(async () => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Engine HW2 模式接线', () => {
  /** 没有新 Scene 时仍走旧路径；重复 start 不能产生第二条帧链。 */
  it('保留 legacy 渲染并保证 start/stop 幂等', () => {
    const f = createFixture()
    f.engine.start()
    f.engine.start()
    expect(f.callbacks.size).toBe(1)
    f.step()
    expect(hooks.legacyRender).toHaveBeenCalledTimes(1)
    expect(hooks.controls.update).toHaveBeenCalledTimes(1)
    f.engine.stop()
    f.engine.stop()
    expect(f.callbacks.size).toBe(0)
    f.engine.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-exclusive-render-mode]
   * 使用真实新 Renderer；若 Engine 同时调用旧 renderer/controls，该测试失败。
   */
  it('HW2 帧只执行新链，且先 update 再 render', async () => {
    const f = createFixture()
    const pair = createPair()
    const order: string[] = []
    const original = f.engine.render.bind(f.engine)
    vi.spyOn(f.engine, 'update').mockImplementation(() => {
      order.push('update')
    })
    vi.spyOn(f.engine, 'render').mockImplementation((frame) => {
      order.push('render')
      original(frame)
    })
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.step()

    expect(order).toEqual(['update', 'render'])
    expect(f.devices[0]!.scopes).toBe(1)
    expect(hooks.legacyRender).not.toHaveBeenCalled()
    expect(hooks.controls.update).not.toHaveBeenCalled()
    expect(hooks.controls.enabled).toBe(false)
    f.engine.dispose()
  })

  /** FrameClock 会复用 FrameContext；Engine 必须每帧复制六个标量。 */
  it('FrameSnapshot 不共享旧帧对象，且按 drawing buffer 提供尺寸', async () => {
    const f = createFixture()
    const pair = createPair()
    const render = vi.spyOn(Renderer.prototype, 'render')
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.step()
    const first = render.mock.calls[0]![0].frame
    f.step()
    const second = render.mock.calls[1]![0].frame

    expect(first.frameNumber).toBe(0)
    expect(second.frameNumber).toBe(1)
    expect(first).not.toBe(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first.drawingBufferWidth).toBe(640)
    expect(first.drawingBufferHeight).toBe(400)
    expect(first.pixelRatio).toBe(2)
    expect('textureUnitCounter' in first).toBe(false)
    f.engine.dispose()
  })

  /** 输入预检必须早于 resize 和修改候选 Camera。 */
  it('错误配对不会修改候选 Camera，也不会修改旧配对', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    await f.engine.enterRenderMode()
    const wrong = { scene: a.scene, camera: b.camera, passes: [new ForwardPass()] }
    expect(() => f.engine.setScene(wrong)).toThrow(SceneHandoffError)
    expect(b.camera.aspect).toBe(1)
    f.engine.setScene(setupOf(a))
    const swapped = { scene: b.scene, camera: a.camera, passes: [new ForwardPass()] }
    expect(() => f.engine.setScene(swapped)).toThrow(SceneHandoffError)
    expect(f.engine.currentSceneBinding?.scene).toBe(a.scene)
    expect(a.scene.disposed).toBe(false)
    expect(b.scene.disposed).toBe(false)
    f.engine.dispose()
    b.scene.dispose()
  })

  /** 后续 preset 共用当前 Backend，不为每个 Scene 重建一套设备管理对象。 */
  it('替换 Scene 复用设备，并释放旧 Scene', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a))
    f.engine.setScene(setupOf(b))
    expect(f.devices).toHaveLength(1)
    expect(a.scene.disposed).toBe(true)
    expect(b.scene.disposed).toBe(false)
    f.engine.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-render-session-entry]
   * 设备构造失败时会话没有建成：入口以 rejection 报告，Engine 仍在旧路径，
   * 之后的 setScene 因为没有会话被拒，候选 Scene 仍归调用者。
   */
  it('Backend 创建失败时入口拒绝，旧路径照常可用', async () => {
    const f = createFixture()
    const pair = createPair()
    const failure = new Error('device unavailable')
    hooks.createBackend.mockImplementation(() => {
      throw failure
    })
    await expect(f.engine.enterRenderMode()).rejects.toBe(failure)
    expect(() => f.engine.assertLegacyMode()).not.toThrow()
    expect(hooks.controls.enabled).toBe(true)
    expect(() => f.engine.setScene(setupOf(pair))).toThrow(EngineOperationError)
    expect(f.engine.currentSceneBinding).toBeNull()
    expect(pair.scene.disposed).toBe(false)
    f.engine.dispose()
    pair.scene.dispose()
  })

  /**
   * 会话不是 setScene 建的，准备失败不回收它；候选 Scene 和 Pass 仍归调用者。
   * 同一组 Pass 没被接管过，修好原因后可以原样再交一次。
   */
  it('投影准备失败时保留会话，候选 Scene 和 Pass 仍归调用者', async () => {
    const f = createFixture()
    const pair = createPair()
    const pass = new ProbePass('ForwardPass')
    await f.engine.enterRenderMode()
    const projection = vi.spyOn(pair.camera, 'setPerspective').mockImplementation(() => {
      throw new Error('projection failed')
    })
    expect(() => f.engine.setScene(setupOf(pair, [pass]))).toThrow('projection failed')
    expect(f.devices).toHaveLength(1)
    expect(f.devices[0]!.disposals).toBe(0)
    expect(f.engine.currentSceneBinding).toBeNull()
    expect(pair.scene.disposed).toBe(false)
    expect(pass.disposals).toBe(0)

    projection.mockRestore()
    f.engine.setScene(setupOf(pair, [pass]))
    f.engine.start()
    f.step()
    expect(pass.executions).toBe(1)
    f.engine.dispose()
    expect(pass.disposals).toBe(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-render-mode-exit-barrier]
   * GPU 清理失败后禁止 legacy draw；显式重试成功后才允许恢复旧路径。
   */
  it('退出失败时保留待清理设备，不恢复 legacy', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.devices[0]!.failDispose = true
    expect(() => f.engine.clearScene()).toThrow('GPU cleanup failed')
    expect(pair.scene.disposed).toBe(true)
    expect(() => f.engine.assertLegacyMode()).toThrow(EngineOperationError)
    f.engine.start()
    f.step()
    expect(hooks.legacyRender).not.toHaveBeenCalled()
    expect(f.devices[0]!.scopes).toBe(0)

    f.devices[0]!.failDispose = false
    f.engine.clearScene()
    f.step()
    expect(hooks.legacyRender).toHaveBeenCalledTimes(1)
    expect(hooks.controls.enabled).toBe(true)
    f.engine.dispose()
  })

  /**
   * [DESIGN-WEIGHT:3][engine-legacy-state-handoff]
   * GPU 对象被删除不等于固定状态复原；真实 WebGL1State 留下的背面剔除
   * 会让旧 HW1 的双面地板消失。旧清屏也依赖可写的深度缓冲。
   * 只有 Backend 清理成功后才交还这些状态，失败期间不能提前操作旧链。
   */
  it.each([false, true])('退出 HW2 恢复旧链固定状态，首次清理失败=%s', async (failFirst) => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    const state = new WebGL1State(f.gl as unknown as WebGLRenderingContext)
    state.setCullMode('back')
    f.gl.depthMask(false)
    const device = f.devices[0]!

    if (failFirst) {
      device.failDispose = true
      expect(() => f.engine.clearScene()).toThrow('GPU cleanup failed')
      expect(f.gl.isEnabled(f.gl.CULL_FACE)).toBe(true)
      expect(f.gl.getParameter(f.gl.DEPTH_WRITEMASK)).toBe(false)
      expect(() => f.engine.assertLegacyMode()).toThrow(EngineOperationError)
      device.failDispose = false
    }

    f.engine.clearScene()

    expect(f.gl.isEnabled(f.gl.CULL_FACE)).toBe(false)
    expect(f.gl.getParameter(f.gl.DEPTH_WRITEMASK)).toBe(true)
    expect(() => f.engine.assertLegacyMode()).not.toThrow()
    f.engine.dispose()
  })

  /** 清场景不是销毁 Engine；下次进入 HW2 必须产生新的设备会话。 */
  it('正常退出后要重新进入，才能再次安装', async () => {
    const f = createFixture()
    const a = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a))
    f.engine.clearScene()
    expect(f.devices[0]!.disposals).toBe(1)
    const b = createPair()
    expect(() => f.engine.setScene(setupOf(b))).toThrow(EngineOperationError)
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(b))
    expect(f.devices).toHaveLength(2)
    f.engine.dispose()
  })

  /** 320×200 CSS、DPR=2 产生 640×400 缓冲，aspect 必须是 1.6。 */
  it('安装和 resize 都同步新 PerspectiveCamera', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    expect(pair.camera.aspect).toBe(1.6)
    f.windowTarget.innerWidth = 500
    f.windowTarget.innerHeight = 250
    f.windowTarget.dispatchEvent(new Event('resize'))
    expect(f.canvas.width).toBe(1000)
    expect(f.canvas.height).toBe(500)
    expect(pair.camera.aspect).toBe(2)
    f.engine.dispose()
  })

  /** lost 时不走 legacy 替代绘制；恢复后的第一帧补做待处理 resize。 */
  it('设备未 ready 时跳过绘制，恢复后使用最新尺寸', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.devices[0]!.ready = false
    f.windowTarget.innerWidth = 400
    f.windowTarget.dispatchEvent(new Event('resize'))
    f.engine.start()
    f.step()
    expect(f.devices[0]!.scopes).toBe(0)
    expect(hooks.legacyRender).not.toHaveBeenCalled()
    f.devices[0]!.ready = true
    f.step()
    expect(f.devices[0]!.scopes).toBe(1)
    expect(pair.camera.aspect).toBe(2)
    f.engine.dispose()
  })

  /**
   * [DESIGN-WEIGHT:3][engine-resize-context-loss]
   * ready 检查成功并不保证后续 resize 仍成功；模拟两次检查之间发生物理 loss。
   * DOM resize 边界必须保留正在运行的 HW2 帧链，恢复后才有下一帧重试尺寸同步。
   */
  it('resize 期间丢失 context 后保留帧链，恢复后补齐尺寸并继续绘制', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    const device = f.devices[0]!
    const failure = new WebGLContextLostError('resize drawing buffer')
    vi.spyOn(device, 'resizeDrawingBuffer').mockImplementationOnce(() => {
      f.setLost(true)
      device.ready = false
      throw failure
    })

    f.windowTarget.innerWidth = 400
    f.windowTarget.dispatchEvent(new Event('resize'))
    f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))

    expect(f.engine.running).toBe(true)
    expect(f.engine.lastFailure?.cause).toBe(failure)
    f.step()
    expect(device.scopes).toBe(0)
    expect(hooks.legacyRender).not.toHaveBeenCalled()

    f.setLost(false)
    device.ready = true
    f.canvas.dispatchEvent(new Event('webglcontextrestored'))
    f.step()

    expect(f.canvas.width).toBe(800)
    expect(pair.camera.aspect).toBe(2)
    expect(device.scopes).toBe(1)
    f.engine.dispose()
  })

  /** 不能因日志/旧场景清理失败而让 Controller 误判新场景没有被接管。 */
  it('旧场景清理错误通过独立状态暴露', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const resource = a.scene.retain(new TestResource())
    const failure = new Error('CPU cleanup failed')
    resource.onDispose(() => {
      throw failure
    })
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a))
    expect(() => f.engine.setScene(setupOf(b))).not.toThrow()
    expect(f.engine.currentSceneBinding?.scene).toBe(b.scene)
    expect(f.engine.lastSceneCleanupFailure?.cause).toBe(failure)
    f.engine.dispose()
  })

  /** Engine 自己也必须保护整个交接，不能只依赖内部 Slot 的保护。 */
  it('释放回调不能通过 Engine 提前拆除新设备', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const resource = a.scene.retain(new TestResource())
    resource.onDispose(() => f.engine.clearScene())
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a))
    expect(() => f.engine.setScene(setupOf(b))).not.toThrow()
    expect(f.engine.currentSceneBinding?.scene).toBe(b.scene)
    expect(f.devices[0]!.disposals).toBe(0)
    expect(f.engine.lastSceneCleanupFailure?.cause).toBeInstanceOf(EngineOperationError)
    f.engine.dispose()
  })

  /** rAF 异常不能变成无穷重试，也不能作为 DOM 外的未处理异常继续抛出。 */
  it('非 context-loss 帧错误会停止循环并保存诊断', async () => {
    const f = createFixture()
    const pair = createPair()
    const failure = new Error('frame failed')
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    vi.spyOn(f.engine, 'update').mockImplementation(() => {
      throw failure
    })
    f.engine.start()
    expect(() => f.step()).not.toThrow()
    expect(f.engine.running).toBe(false)
    expect(f.callbacks.size).toBe(0)
    expect(f.engine.lastFailure?.cause).toBe(failure)
    f.engine.dispose()
  })

  /** 旧 GPU 资源不会被新 Backend 恢复；不能在 context restore 后悄悄复用。 */
  it('legacy context lost 不直接抛 DOM 错误，并阻止复用旧资源', () => {
    const f = createFixture()
    f.engine.start()
    f.setLost(true)
    const event = new Event('webglcontextlost', { cancelable: true })
    f.canvas.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(f.engine.running).toBe(false)
    expect(f.callbacks.size).toBe(0)
    f.setLost(false)
    f.canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(() => f.engine.assertLegacyMode()).toThrow(EngineOperationError)
    f.engine.dispose()
  })

  /** 释放 Engine 后，旧 resize/rAF 不能再修改 canvas 或访问 Renderer。 */
  it('dispose 释放新路径、停止 rAF 并解绑 Engine 事件', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.engine.dispose()
    f.engine.dispose()
    expect(f.callbacks.size).toBe(0)
    expect(pair.scene.disposed).toBe(true)
    expect(f.devices[0]!.disposals).toBe(1)
    expect(hooks.controls.dispose).toHaveBeenCalledTimes(1)
    f.windowTarget.innerWidth = 900
    f.windowTarget.dispatchEvent(new Event('resize'))
    expect(f.canvas.width).toBe(640)
    expect(() => f.engine.start()).toThrow(EngineOperationError)
  })

  /** Loader 收到的旧 renderer 仍在原字段中，同时获得窄接线所需的 Engine。 */
  it('SceneContext 保留旧字段并加入 engine', async () => {
    const f = createFixture()
    const loader = vi.fn(async (context) => {
      expect(context.engine).toBe(f.engine)
      expect(context.renderer).toBe(f.engine.legacyRenderer)
      expect(context.camera).toBe(f.engine.camera)
    })
    await f.engine.loadScene(loader)
    expect(loader).toHaveBeenCalledTimes(1)
    f.engine.dispose()
  })

  /**
   * 会话释放失败时设备仍留在 Engine 内等待回收：
   * 既不能重新进入（会建第二个会话），也不能在半释放的会话上安装。
   */
  it('会话清理未完成时拒绝进入和安装，重试成功后可以重新进入', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a))
    f.devices[0]!.failDispose = true
    expect(() => f.engine.clearScene()).toThrow('GPU cleanup failed')

    await expect(f.engine.enterRenderMode()).rejects.toThrow(EngineOperationError)
    expect(() => f.engine.setScene(setupOf(b))).toThrow(EngineOperationError)
    expect(f.devices).toHaveLength(1)
    expect(b.scene.disposed).toBe(false)

    f.devices[0]!.failDispose = false
    f.engine.clearScene()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(b))
    expect(f.devices).toHaveLength(2)
    f.engine.dispose()
  })

  /** 一旦开始永久关闭，只允许继续清理，不允许用 start 重新激活。 */
  it('Engine.dispose 失败后可以重试，但不能重新 start', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.devices[0]!.failDispose = true
    expect(() => f.engine.dispose()).toThrow('GPU cleanup failed')
    expect(f.callbacks.size).toBe(0)
    expect(() => f.engine.start()).toThrow(EngineOperationError)
    f.devices[0]!.failDispose = false
    f.engine.dispose()
    expect(f.devices[0]!.disposals).toBe(2)
    expect(hooks.controls.dispose).toHaveBeenCalledTimes(1)
  })

  /** resize 在同一帧内同步到达时，只登记请求，下一帧开始才应用。 */
  it('update 中触发 resize 不改变本帧 drawing buffer', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    vi.spyOn(f.engine, 'update').mockImplementation(() => {
      f.windowTarget.innerWidth = 400
      f.windowTarget.dispatchEvent(new Event('resize'))
    })
    f.engine.start()
    f.step()
    expect(f.canvas.width).toBe(640)
    f.step()
    expect(f.canvas.width).toBe(800)
    expect(pair.camera.aspect).toBe(2)
    f.engine.dispose()
  })

  /** Engine 不抢占 Backend 的恢复协议；场景存活，旧 GPU 数据仍标记失效。 */
  it('HW2 context lost 保留场景与帧链，恢复后仅恢复 HW2', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.devices[0]!.ready = false
    f.setLost(true)
    f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    f.step()
    expect(f.engine.running).toBe(true)
    expect(pair.scene.disposed).toBe(false)
    expect(f.devices[0]!.scopes).toBe(0)
    f.setLost(false)
    f.devices[0]!.ready = true
    f.canvas.dispatchEvent(new Event('webglcontextrestored'))
    f.step()
    expect(f.devices[0]!.scopes).toBe(1)
    f.engine.clearScene()
    expect(() => f.engine.assertLegacyMode()).toThrow(EngineOperationError)
    f.engine.dispose()
  })

  /** 旧 loadAxes 没有取消能力，因此不能一边初始化旧 GPU 一边切换新设备。 */
  it('等待旧初始化完成后才能交接或释放', async () => {
    const f = createFixture()
    const pair = createPair()
    let finish!: () => void
    hooks.loadAxes.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const pending = f.engine.init()
    await expect(f.engine.enterRenderMode()).rejects.toThrow(EngineOperationError)
    expect(f.devices).toHaveLength(0)
    expect(() => f.engine.dispose()).toThrow(EngineOperationError)
    finish()
    await pending
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.dispose()
  })

  /** 根 loader 自己会进入新模式并安装 HW2；不能把整个异步 loader 都置于交接锁之内。 */
  it('根 loader 可以通过 SceneContext.engine 进入新模式并安装新场景', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.loadScene(async (context) => {
      await Promise.resolve()
      await context.engine.enterRenderMode()
      context.engine.setScene(setupOf(pair))
    })
    expect(f.engine.currentSceneBinding?.scene).toBe(pair.scene)
    f.engine.dispose()
  })

  /** 恢复失败被设备事件层捕获；Engine 仍须提供 UI 能观察的诊断出口。 */
  it('暴露 Backend 恢复失败，不用 legacy 假装恢复', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    const failure: WebGLContextFailure = {
      phase: 'restore',
      error: new Error('rebuild failed')
    }
    f.devices[0]!.ready = false
    f.devices[0]!.lastFailure = failure
    f.engine.start()
    f.step()
    expect(f.engine.lastBackendFailure).toBe(failure)
    expect(hooks.legacyRender).not.toHaveBeenCalled()
    expect(pair.scene.disposed).toBe(false)
    f.engine.dispose()
  })
})

describe('Engine 通用安装（SceneSetup → 整条换 Pipeline）', () => {
  /** setScene 只复用会话；没有会话时不能偷偷建一个，也不能先改候选再拒绝。 */
  it('没有会话时 setScene 被拒，不建设备、不改候选', () => {
    const f = createFixture()
    const pair = createPair()
    const pass = new ProbePass('ForwardPass')
    expect(() => f.engine.setScene(setupOf(pair, [pass]))).toThrow(EngineOperationError)
    expect(f.devices).toHaveLength(0)
    expect(pair.camera.aspect).toBe(1)
    expect(pair.scene.disposed).toBe(false)
    expect(pass.disposals).toBe(0)
    expect(() => f.engine.assertLegacyMode()).not.toThrow()
    f.engine.dispose()
    pair.scene.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-render-session-entry]
   * [DESIGN-WEIGHT:3][engine-session-canvas]
   * 入口打开会话后就不走旧链；还没有场景时新链也不画。重复进入不建第二个会话。
   * WebGL1 会话绑定构造时那块 canvas（与旧路径共用 context）。
   */
  it('enterRenderMode 只建一个会话，打开后即关闭旧链', async () => {
    const f = createFixture()
    await f.engine.enterRenderMode()
    await f.engine.enterRenderMode()
    expect(f.devices).toHaveLength(1)
    expect(hooks.createBackend).toHaveBeenCalledWith(f.canvas)
    expect(hooks.controls.enabled).toBe(false)
    expect(() => f.engine.assertLegacyMode()).toThrow(EngineOperationError)

    f.engine.start()
    f.step()
    expect(hooks.legacyRender).not.toHaveBeenCalled()
    expect(f.devices[0]!.scopes).toBe(0)
    f.engine.dispose()
  })

  /** 类型上只有 webgl1；无类型调用方传来的其他值不能默默退回 WebGL1。 */
  it('不支持的会话种类被拒，不建设备', async () => {
    const f = createFixture()
    await expect(f.engine.enterRenderMode('webgpu' as never)).rejects.toThrow(EngineOperationError)
    expect(f.devices).toHaveLength(0)
    expect(() => f.engine.assertLegacyMode()).not.toThrow()
    f.engine.dispose()
  })

  /**
   * HW2 只有 ForwardPass；HW1 是 [ShadowMapPass, ForwardPass]。
   * 切换时整条换 Pipeline：旧 Pass 被释放，下一帧按新顺序执行，设备复用。
   * 清理顺序跟随提交顺序：Slot 先释放旧 Scene，然后才释放旧 Pipeline。
   */
  it('HW2 切 HW1：旧 Pass 被释放，新顺序正确，设备复用', async () => {
    const f = createFixture()
    const events: string[] = []
    const hw2 = createPair()
    const hw1 = createPair()
    hw2.scene.retain(new TestResource()).onDispose(() => {
      events.push('dispose HW2 scene')
    })
    const hw2Forward = new ProbePass('HW2/ForwardPass', events)
    const hw1Shadow = new ProbePass('HW1/ShadowMapPass', events)
    const hw1Forward = new ProbePass('HW1/ForwardPass', events)

    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(hw2, [hw2Forward]))
    f.engine.start()
    f.step()
    expect(events).toEqual(['HW2/ForwardPass'])

    events.length = 0
    f.engine.setScene(setupOf(hw1, [hw1Shadow, hw1Forward]))
    expect(events).toEqual(['dispose HW2 scene', 'dispose HW2/ForwardPass'])
    expect(hw2.scene.disposed).toBe(true)
    expect(f.engine.currentSceneBinding?.scene).toBe(hw1.scene)

    events.length = 0
    f.step()
    expect(events).toEqual(['HW1/ShadowMapPass', 'HW1/ForwardPass'])
    expect(hw2Forward.executions).toBe(1)
    expect(hw2Forward.disposals).toBe(1)
    expect(f.devices).toHaveLength(1)
    expect(f.engine.lastPipelineCleanupFailure).toBeNull()

    f.engine.dispose()
    expect(hw1Shadow.disposals).toBe(1)
    expect(hw1Forward.disposals).toBe(1)
    expect(hw2Forward.disposals).toBe(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-handoff]
   * [DESIGN-WEIGHT:3][engine-scene-setup-ownership]
   * 提交前的每一种失败：旧场景、旧 Pipeline 原样继续工作，
   * 候选 Scene 和新 Pass 都没被释放，仍归调用者。
   */
  it.each([
    {
      reason: 'Camera 不在候选 Scene 里',
      error: SceneHandoffError,
      arrange: (_f: Fixture, next: Pair, _old: ProbePass, fresh: ProbePass[]): SceneSetup => ({
        scene: next.scene,
        camera: createPair().camera,
        passes: fresh
      })
    },
    {
      reason: '投影准备失败',
      error: Error,
      arrange: (_f: Fixture, next: Pair, _old: ProbePass, fresh: ProbePass[]): SceneSetup => {
        vi.spyOn(next.camera, 'setPerspective').mockImplementation(() => {
          throw new Error('projection failed')
        })
        return setupOf(next, fresh)
      }
    },
    {
      reason: 'drawing buffer resize 失败',
      error: Error,
      arrange: (f: Fixture, next: Pair, _old: ProbePass, fresh: ProbePass[]): SceneSetup => {
        vi.spyOn(f.devices[0]!, 'resizeDrawingBuffer').mockImplementation(() => {
          throw new Error('resize failed')
        })
        return setupOf(next, fresh)
      }
    },
    {
      reason: 'passes 为空',
      error: EngineOperationError,
      arrange: (_f: Fixture, next: Pair): SceneSetup => setupOf(next, [])
    },
    {
      reason: 'passes 里有不是 RenderPass 的值',
      error: EngineOperationError,
      arrange: (_f: Fixture, next: Pair, _old: ProbePass, fresh: ProbePass[]): SceneSetup =>
        setupOf(next, [...fresh, { name: 'broken' } as unknown as RenderPass])
    },
    {
      reason: '同一个 Pass 在列表里出现两次',
      error: EngineOperationError,
      arrange: (_f: Fixture, next: Pair, _old: ProbePass, fresh: ProbePass[]): SceneSetup =>
        setupOf(next, [fresh[0]!, fresh[0]!])
    },
    {
      reason: '交出正在运行的旧 Pass',
      error: EngineOperationError,
      arrange: (_f: Fixture, next: Pair, old: ProbePass, fresh: ProbePass[]): SceneSetup =>
        setupOf(next, [...fresh, old])
    }
  ])('提交前失败（$reason）：旧场景与旧 Pipeline 原样，新 Pass 未被释放', async (entry) => {
    const f = createFixture()
    const current = createPair()
    const next = createPair()
    const old = new ProbePass('old/ForwardPass')
    const fresh = [new ProbePass('next/ShadowMapPass'), new ProbePass('next/ForwardPass')]

    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(current, [old]))
    const setup = entry.arrange(f, next, old, fresh)

    expect(() => f.engine.setScene(setup)).toThrow(entry.error)

    expect(f.engine.currentSceneBinding?.scene).toBe(current.scene)
    expect(f.engine.currentSceneBinding?.camera).toBe(current.camera)
    expect(current.scene.disposed).toBe(false)
    expect(next.scene.disposed).toBe(false)
    expect(old.disposals).toBe(0)
    expect(fresh.map((pass) => pass.disposals)).toEqual([0, 0])
    expect(f.devices[0]!.disposals).toBe(0)

    vi.restoreAllMocks()
    f.engine.start()
    f.step()
    expect(old.executions).toBe(1)
    expect(fresh.map((pass) => pass.executions)).toEqual([0, 0])

    f.engine.dispose()
    next.scene.dispose()
  })

  /** 被换下（已释放）的 Pass 再交一次：新 Pipeline 会执行一个已释放的对象。 */
  it('已经被换下的 Pass 也不能再交', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const c = createPair()
    const reused = new ProbePass('ForwardPass')
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a, [reused]))
    f.engine.setScene(setupOf(b))
    expect(reused.disposals).toBe(1)

    expect(() => f.engine.setScene(setupOf(c, [reused]))).toThrow(EngineOperationError)
    expect(f.engine.currentSceneBinding?.scene).toBe(b.scene)
    f.engine.dispose()
    c.scene.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-post-commit-cleanup]
   * 提交后旧 Pipeline 释放抛错：不能让 Controller 误判安装失败而释放已接管的新场景。
   * 诊断带上旧 Pass 的名字和原始错误；之后成功的交接不擦掉它。
   */
  it('旧 Pipeline 释放抛错：新场景照常接管，诊断可读', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const c = createPair()
    const failure = new Error('pass cleanup failed')
    const faulty = new ProbePass('FaultyPass')
    faulty.failDispose = failure
    const next = new ProbePass('ForwardPass')

    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a, [faulty]))
    expect(() => f.engine.setScene(setupOf(b, [next]))).not.toThrow()

    expect(f.engine.currentSceneBinding?.scene).toBe(b.scene)
    expect(b.scene.disposed).toBe(false)
    expect(next.disposals).toBe(0)
    const record = f.engine.lastPipelineCleanupFailure
    expect(record).toEqual({ operation: 'replace', passNames: ['FaultyPass'], cause: failure })
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record?.passNames)).toBe(true)
    expect(f.engine.lastFailure).toBeNull()

    f.engine.start()
    f.step()
    expect(next.executions).toBe(1)
    expect(faulty.executions).toBe(0)

    f.engine.setScene(setupOf(c))
    expect(f.engine.lastPipelineCleanupFailure).toBe(record)
    f.engine.dispose()
  })

  /** 旧 Pass 的释放回调不能借 Engine 拆掉刚接管的会话；重入错误成为清理诊断。 */
  it('旧 Pass 释放回调不能通过 Engine 重入', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const old = new ProbePass('ForwardPass')
    old.onDispose = () => f.engine.clearScene()

    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a, [old]))
    expect(() => f.engine.setScene(setupOf(b))).not.toThrow()

    expect(f.engine.currentSceneBinding?.scene).toBe(b.scene)
    expect(f.devices[0]!.disposals).toBe(0)
    expect(f.engine.lastPipelineCleanupFailure?.cause).toBeInstanceOf(EngineOperationError)
    f.engine.dispose()
  })

  /** 帧中途换场景会让同一帧的后半段跑在另一条 Pipeline 上；Engine 在入口就拒绝。 */
  it('渲染中 setScene 被拒，当前帧与当前安装不变', async () => {
    const f = createFixture()
    const a = createPair()
    const b = createPair()
    const rejected: unknown[] = []
    const guard = new ProbePass('GuardPass')
    guard.execute = () => {
      guard.executions++
      try {
        f.engine.setScene(setupOf(b))
      } catch (error) {
        rejected.push(error)
      }
      return undefined
    }
    const forward = new ForwardPass()

    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(a, [guard, forward]))
    f.engine.start()
    f.step()

    expect(rejected).toHaveLength(1)
    expect(rejected[0]).toBeInstanceOf(EngineOperationError)
    expect(f.devices[0]!.scopes).toBe(1)
    expect(f.engine.currentSceneBinding?.scene).toBe(a.scene)
    expect(b.scene.disposed).toBe(false)
    expect(guard.disposals).toBe(0)
    f.engine.dispose()
    b.scene.dispose()
  })
})

describe('旧路径 GL 错误交接与帧循环失败通知', () => {
  /** [DESIGN-WEIGHT:3][engine-legacy-error-handoff] HW3 的帧留下 1282，进入新模式前要读走。 */
  it('进入前读空旧路径残留的 GL 错误，并保留诊断', async () => {
    const f = createFixture()
    f.pendingGLErrors.push(1282)
    await f.engine.enterRenderMode()
    expect(f.gl.getError).toHaveBeenCalledTimes(2)
    expect(f.engine.legacyGLErrorsAtLastEntry).toEqual([1282])
    expect(Object.isFrozen(f.engine.legacyGLErrorsAtLastEntry)).toBe(true)
    expect(f.pendingGLErrors).toHaveLength(0)
    f.engine.dispose()
  })

  /** 替身一直返回非零也不能卡死：读满 32 次就拒绝进入，不建设备。 */
  it('读取有上限：一直读不空时拒绝进入', async () => {
    const f = createFixture()
    f.gl.getError.mockImplementation(() => 1282)
    await expect(f.engine.enterRenderMode()).rejects.toThrow(EngineOperationError)
    expect(f.gl.getError).toHaveBeenCalledTimes(32)
    expect(f.devices).toHaveLength(0)
    expect(() => f.engine.assertLegacyMode()).not.toThrow()
    f.engine.dispose()
  })

  /** 丢失期间 getError 只报告丢失本身；交给新 Backend 处理。 */
  it('context 丢失时不调用 getError', async () => {
    const f = createFixture()
    f.setLost(true)
    await f.engine.enterRenderMode()
    expect(f.gl.getError).not.toHaveBeenCalled()
    expect(f.engine.legacyGLErrorsAtLastEntry).toBeNull()
    f.engine.dispose()
  })

  /** [DESIGN-WEIGHT:3][engine-loop-failure-notice] 停止循环的帧失败要通知；context lost 保留帧链时不通知。 */
  it('帧失败停止循环时通知订阅方，监听器里可以调用 Engine', async () => {
    const f = createFixture()
    const pair = createPair()
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    const seen: unknown[] = []
    f.engine.onLoopFailure((failure) => {
      seen.push(failure)
      f.engine.clearScene()
    })
    const update = vi.spyOn(f.engine, 'update')
    update.mockImplementationOnce(() => {
      throw new WebGLContextLostError('frame')
    })
    f.engine.start()
    f.step()
    expect(seen).toHaveLength(0)
    expect(f.engine.running).toBe(true)

    const failure = new Error('preflight failed: GL errors: 1282')
    update.mockImplementationOnce(() => {
      throw failure
    })
    f.step()
    expect(seen).toEqual([f.engine.lastFailure])
    expect(f.engine.lastFailure?.cause).toBe(failure)
    expect(f.engine.running).toBe(false)
    expect(f.devices[0]!.disposals).toBe(1)
    f.engine.dispose()
  })

  /**
   * [DESIGN-WEIGHT:3][engine-legacy-error-handoff]
   * 浏览器里 HW3 → HW2 的卡死：旧路径的帧留下 1282，新 Backend 第一次画之前的预检读到它，整帧失败。
   * 入口读走它以后，第一帧的预检通过。后半段在进入之后再留一个错误：替身照样拦下并通知，
   * 说明前半段「通过」不是因为替身不查。
   */
  it('旧路径留下 1282 → enterRenderMode → 第一次 render 的预检通过', async () => {
    const f = createFixture()
    const pair = createPair()
    const preflights: number[][] = []
    hooks.createBackend.mockImplementation((target) => {
      const device = new PreflightDevice(target, f.gl, preflights)
      f.devices.push(device)
      return device
    })
    const listener = vi.fn()
    f.engine.onLoopFailure(listener)

    // 旧路径（HW3）的帧留下、没人读走的 INVALID_OPERATION
    f.pendingGLErrors.push(1282)
    await f.engine.enterRenderMode()
    f.engine.setScene(setupOf(pair))
    f.engine.start()
    f.step()

    expect(f.engine.legacyGLErrorsAtLastEntry).toEqual([1282])
    expect(preflights).toEqual([[]])
    expect(f.devices[0]!.scopes).toBe(1)
    expect(f.engine.lastFailure).toBeNull()
    expect(listener).not.toHaveBeenCalled()
    expect(f.engine.running).toBe(true)

    // 进入之后才出现的错误不归入口管：预检拦下，帧循环停止，订阅方收到通知
    f.pendingGLErrors.push(1282)
    f.step()
    expect(preflights).toEqual([[], [1282]])
    expect(f.devices[0]!.scopes).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0]).toBe(f.engine.lastFailure)
    expect(f.engine.lastFailure?.operation).toBe('frame')
    expect(String(f.engine.lastFailure?.cause)).toContain('GL errors: 1282')
    expect(f.engine.running).toBe(false)
    f.engine.dispose()
  })
})
