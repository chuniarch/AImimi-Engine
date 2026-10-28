import { describe, expect, it, onTestFinished } from 'vitest'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import {
  ResourceDisposedError,
  ResourceHasSceneReferencesError,
  RenderTargetUnavailableError,
  UnsupportedRenderFeatureError
} from '@/rendering/core/errors'
import { InvalidDeferredLightingError } from '@/rendering/core/errors/InvalidDeferredLightingError'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { LightFrameSnapshot } from '@/rendering/frame/LightFrameSnapshot'
import { createDirectionalLightSnapshot } from '@/rendering/frame/createDirectionalLightSnapshot'
import { RenderList } from '@/rendering/frame/RenderList'
import { createGBufferShaderModule } from '@/rendering/gbuffer/createGBufferMaterial'
import { DeferredLightingPass } from '@/rendering/passes/DeferredLightingPass'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { RecordingBackend } from '../helpers/createRenderFixture'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** 只替代设备边界；保留真实 Pass、资源、灯光快照和完成记录。 */
class BoundaryBackend extends RecordingBackend {
  failAt: 'enter' | 'draw' | 'exit' | null = null
  readonly failure = new Error('device boundary failed')
  beforeDraw?: () => void
  beforeScope?: () => void

  override withRenderSurface(
    descriptor: RenderSurfaceScopeDescriptor,
    callback: () => undefined
  ): void {
    this.beforeScope?.()
    if (this.failAt === 'enter') throw this.failure
    super.withRenderSurface(descriptor, callback)
    if (this.failAt === 'exit') throw this.failure
  }

  override draw(submission: DrawSubmission): void {
    this.beforeDraw?.()
    if (this.failAt === 'draw') throw this.failure
    super.draw(submission)
  }
}

/** 空 GBuffer 仍是完成的表面输入；像素计算另由真实 GPU 测试证明。 */
function fixture() {
  const shader = createGBufferShaderModule()
  const producer = new GBufferPass({ shaderModule: shader, label: 'test/deferred/gbuffer' })
  const pass = new DeferredLightingPass(producer)
  const backend = new BoundaryBackend()
  const light = new DirectionalLight({ targetWorld: [0, 0, 0], intensity: Math.PI })
  light.transform.setPosition([0, 0, 1])
  const view = {
    viewMatrix: IDENTITY,
    projectionMatrix: IDENTITY,
    cameraWorldPosition: [0, 0, 0] as const
  }
  const snapshot = createDirectionalLightSnapshot(light, view)
  function context(lights: LightFrameSnapshot = [snapshot]): RenderPassContext {
    return {
      backend,
      view,
      lights,
      frame: {
        frameNumber: 1,
        timeSeconds: 0,
        deltaSeconds: 0,
        drawingBufferWidth: 4,
        drawingBufferHeight: 3,
        pixelRatio: 1
      },
      renderList: new RenderList([], [])
    }
  }
  function produce(ctx = context()): RenderPassContext {
    producer.execute(ctx)
    backend.events.length = 0
    backend.scopes.length = 0
    backend.submissions.length = 0
    return ctx
  }
  onTestFinished(() => {
    backend.beforeDraw = undefined
    backend.beforeScope = undefined
    backend.failAt = null
    pass.dispose()
    producer.dispose()
    shader.dispose()
  })
  return { producer, shader, pass, backend, light, snapshot, view, context, produce }
}

describe('DeferredLightingPass frame consumption', () => {
  /** Given 未完成生产；When 单独执行 Lighting；Then 连屏幕清除都不能发生。 */
  it('要求先生产同一个 context 的 GBuffer', () => {
    const f = fixture()
    expect(() => f.pass.execute(f.context())).toThrow(RenderTargetUnavailableError)
    expect(f.backend.scopes).toHaveLength(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][deferred-lambert-display-encoding]
   * Given world +Z 被 view 旋转为 +X；Then 上传观察空间方向而不是世界方向。
   * 同时检查真正提交的全屏覆盖 Geometry、附件地址与关闭的深度状态。
   */
  it('提交一张覆盖屏幕的三角形，采样颜色和法线并使用本帧方向', () => {
    const f = fixture()
    const rotated = {
      ...f.view,
      viewMatrix: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1] as Mat4Tuple
    }
    const light = createDirectionalLightSnapshot(f.light, rotated)
    const ctx = f.produce({ ...f.context([light]), view: rotated })
    f.pass.execute(ctx)
    expect(f.backend.events).toEqual(['enter', 'draw', 'leave'])
    expect(f.backend.scopes[0]).toEqual({
      surface: { kind: 'default-framebuffer' },
      clear: { color: [0, 0, 0, 1] }
    })
    const { item, view } = f.backend.submissions[0]!
    expect(view).toBe(ctx.view)
    expect(item.castShadow).toBe(false)
    expect(item.worldMatrix).toEqual(IDENTITY)
    expect(item.geometry.getAttribute('position')!.copyData()).toEqual(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0])
    )
    expect(item.material.state).toMatchObject({
      depthTest: false,
      depthWrite: false,
      cullMode: 'none',
      dither: false
    })
    expect(item.material.shaderModule.builtInUniforms).toEqual({})
    const output = f.producer.getOutput(ctx)
    expect(item.material.getParameter('uBaseColor')).toEqual({
      type: 'texture2D',
      value: output.baseColorLinear
    })
    expect(item.material.getParameter('uNormal')).toEqual({
      type: 'texture2D',
      value: output.normalView
    })
    expect(item.material.getParameter('uDirectionToLightView')).toEqual({
      type: 'vec3',
      value: [1, 0, 0]
    })
    expect(item.material.getParameter('uRadiance')).toEqual({
      type: 'vec3',
      value: [Math.fround(Math.PI), Math.fround(Math.PI), Math.fround(Math.PI)]
    })
  })

  /** 删除光源后必须覆盖旧 radiance；不能保留前一帧亮度。 */
  it('下一帧零灯光明确提交零 radiance', () => {
    const f = fixture()
    f.pass.execute(f.produce())
    f.pass.execute(f.produce(f.context([])))
    expect(f.backend.submissions[0]!.item.material.getParameter('uRadiance')).toEqual({
      type: 'vec3',
      value: [0, 0, 0]
    })
  })

  /** 多灯不允许悄悄取第一盏；失败必须发生在改写屏幕之前。 */
  it('拒绝两盏方向光且不清屏', () => {
    const f = fixture()
    const ctx = f.produce(f.context([f.snapshot, f.snapshot]))
    expect(() => f.pass.execute(ctx)).toThrow(UnsupportedRenderFeatureError)
    expect(f.backend.events).toEqual([])
  })

  /** 运行时未知灯型不可借用相同字段伪装成方向光。 */
  it('拒绝未知灯型', () => {
    const f = fixture()
    const lights = [{ ...f.snapshot, type: 'point' }] as unknown as LightFrameSnapshot
    expect(() => f.pass.execute(f.produce(f.context(lights)))).toThrow(
      UnsupportedRenderFeatureError
    )
    expect(f.backend.scopes).toHaveLength(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
   * frameNumber 相同也不能代替 context 身份；resize 后同一地址必须重新生产。
   */
  it('拒绝其他 context 和旧 revision，重画后才恢复消费', () => {
    const f = fixture()
    const ctx = f.produce()
    expect(() => f.pass.execute(f.context())).toThrow(RenderTargetUnavailableError)
    f.producer.target.resize(8, 6)
    expect(() => f.pass.execute(ctx)).toThrow(RenderTargetUnavailableError)
    expect(f.backend.scopes).toHaveLength(0)
    f.pass.execute(f.produce())
    expect(f.backend.submissions).toHaveLength(1)
  })

  /** ready 恢复不自动恢复像素；旧 context 依然不能被重放。 */
  it('失效设备拒绝消费，恢复后必须重画', () => {
    const f = fixture()
    const ctx = f.produce()
    f.backend.ready = false
    expect(() => f.pass.execute(ctx)).toThrow(RenderTargetUnavailableError)
    f.backend.ready = true
    expect(() => f.pass.execute(ctx)).toThrow(RenderTargetUnavailableError)
    f.pass.execute(f.produce())
    expect(f.backend.submissions).toHaveLength(1)
  })

  /** scope 入口发生同步回调时，已过期输入也不能继续提交。 */
  it('进入默认输出后再检查生产记录', () => {
    const f = fixture()
    const ctx = f.produce()
    f.backend.beforeScope = () => f.producer.target.resize(9, 9)
    expect(() => f.pass.execute(ctx)).toThrow(RenderTargetUnavailableError)
    expect(f.backend.submissions).toHaveLength(0)
  })

  /** 所有异常都原样传播，finally 必须解除忙碌标记以允许下一帧。 */
  it.each(['enter', 'draw', 'exit'] as const)('%s 失败后可以在下一帧重试', (stage) => {
    const f = fixture()
    const ctx = f.produce()
    f.backend.failAt = stage
    expect(() => f.pass.execute(ctx)).toThrow(f.backend.failure)
    f.backend.failAt = null
    f.pass.execute(f.produce())
    expect(f.backend.submissions).toHaveLength(1)
  })

  /** draw 的同步调用栈中不能覆盖当前材质，也不能释放当前提交引用。 */
  it('拒绝执行期间同步重入 execute/dispose', () => {
    const f = fixture()
    const ctx = f.produce()
    f.backend.beforeDraw = () => {
      expect(() => f.pass.execute(ctx)).toThrow(InvalidDeferredLightingError)
      expect(() => f.pass.dispose()).toThrow(InvalidDeferredLightingError)
    }
    f.pass.execute(ctx)
    expect(f.backend.submissions).toHaveLength(1)
  })
})

describe('DeferredLightingPass ownership', () => {
  /** 拒绝无效生产者，避免到第一次 draw 才报普通 property access 异常。 */
  it('构造要求真实 GBufferPass', () => {
    expect(() => new DeferredLightingPass(null as unknown as GBufferPass)).toThrow(
      InvalidDeferredLightingError
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:2][deferred-owned-fullscreen-resources]
   * 通过公开 Backend submission 观察资源，避免穿透 Pass 私有字段。
   */
  it('只释放全屏资源，重复释放不重复通知，生产者仍可使用', () => {
    const f = fixture()
    const ctx = f.produce()
    f.pass.execute(ctx)
    const { geometry, material } = f.backend.submissions[0]!.item
    const shader = material.shaderModule
    const calls: string[] = []
    for (const [name, resource] of [
      ['material', material],
      ['geometry', geometry],
      ['shader', shader]
    ] as const) {
      resource.onDispose(() => calls.push(name))
    }
    f.pass.dispose()
    f.pass.dispose()
    expect(calls).toEqual(['material', 'geometry', 'shader'])
    expect(f.producer.target.disposed).toBe(false)
    expect(f.shader.disposed).toBe(false)
    expect(() => f.pass.execute(ctx)).toThrow(ResourceDisposedError)
  })

  /** 先释放生产者后，Material 清理不得读取已经失效的附件。 */
  it('Pipeline 按 GBuffer 再 Lighting 执行并按登记顺序清理', () => {
    const f = fixture()
    const pipeline = new RenderPipeline()
    pipeline.addPass(f.producer)
    pipeline.addPass(f.pass)
    const target = f.producer.target
    pipeline.execute(f.context())
    expect(f.backend.scopes.map((scope) => scope.surface.kind)).toEqual([
      'render-target',
      'default-framebuffer'
    ])
    pipeline.dispose()
    expect(target.disposed).toBe(true)
    expect(f.backend.submissions[0]!.item.material.disposed).toBe(true)
    expect(f.backend.ready).toBe(true)
  })

  /** 失败后只允许继续清理，并且不能遗失尚未处理的 shader。 */
  it('清理中途被 Scene 引用阻止时保留重试进度', () => {
    const f = fixture()
    const ctx = f.produce()
    f.pass.execute(ctx)
    const { geometry, material } = f.backend.submissions[0]!.item
    const shader = material.shaderModule
    geometry.retainSceneReference()
    try {
      expect(() => f.pass.dispose()).toThrow(ResourceHasSceneReferencesError)
      expect(material.disposed).toBe(true)
      expect(shader.disposed).toBe(false)
      expect(() => f.pass.execute(ctx)).toThrow(ResourceDisposedError)
    } finally {
      geometry.releaseSceneReference()
    }
    f.pass.dispose()
    expect(shader.disposed).toBe(true)
  })
})
