import { PerspectiveCamera as LegacyPerspectiveCamera } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { getCapabilities, initCapabilities } from '@/_config/glCapabilities'
import type { Updatable } from '@/animators/types/Updatable'
import { EngineSceneSlot } from '@/engine/EngineSceneSlot'
import type { SceneBinding, SceneCleanupFailure } from '@/engine/EngineSceneSlot'
import type { SceneSetup } from '@/engine/SceneSetup'
import { EngineOperationError } from '@/errors/EngineError/EngineOperationError'
import { SceneHandoffError } from '@/errors/EngineError/SceneHandoffError'
import { WebGLExtensionError } from '@/errors/EngineError/WebGLError/WebGLExtensionError'
import { WebGLNotSupportedError } from '@/errors/EngineError/WebGLError/WebGLNotSupportedError'
import { PerformanceMonitor } from '@/monitors/PerformanceMonitor'
import { Renderer } from '@/rendering/Renderer'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { WebGLContextFailure } from '@/rendering/backend/webgl1/WebGLContextLifecycle'
import { WebGLContextLostError } from '@/rendering/core/errors'
import type { FrameSnapshot } from '@/rendering/frame/FrameSnapshot'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Scene } from '@/rendering/scene/Scene'
import type { SceneNode } from '@/rendering/scene/SceneNode'
import { Camera } from '@/rendering/scene/cameras/Camera'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { FrameClock } from '@/renderers/FrameClock'
import { WebGLRenderer } from '@/renderers/WebGLRenderer'
import { loadAxes } from '@/scenes/axes/loadAxes'
import type { SceneContext } from '@/scenes/types/SceneContext'
import type { SceneLoader } from '@/types/engine'
import { getClampedDPR } from '@/utils/platform'

/** 最近一次异步事件/帧边界失败；不在关键交接内调用可能抛错的用户回调。 */
export interface EngineFailure {
  readonly operation: string
  readonly cause: unknown
}

/** 帧循环因失败停止时的通知；收到时调度已经停止，failure 就是 lastFailure 记下的那一次。 */
export type EngineLoopFailureListener = (failure: EngineFailure) => void

/**
 * 进入新模式前读空旧路径 GL 错误的预算，含确认结束的那一次 NO_ERROR 读取。
 * 与后端 WebGL1ProgramManager.checkError 的 32 次一致：这是防御性上限，不是 WebGL 规定的错误数量。
 */
const LEGACY_GL_ERROR_READ_BUDGET = 32

/** 新渲染会话可选的后端种类；本批只有 WebGL1，WebGPU 以后加在这里。 */
export type RenderSessionKind = 'webgl1'

/** drawing buffer 的实际像素尺寸，不是 CSS 尺寸。 */
interface DrawingBufferSize {
  readonly width: number
  readonly height: number
}

/**
 * 一个新渲染模式的设备会话；Renderer 拥有当前 Pipeline 和 Backend 的释放责任。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][engine-session-canvas]
 * 会话记下自己绑定的 canvas 和读取 drawing buffer 尺寸的办法。
 * 会话路径（相机宽高比、帧快照尺寸、resize）只经由这里取值，
 * 不直接读 Engine 构造时的 canvas/gl；那两个只属于旧路径。
 */
interface RenderSession {
  readonly kind: RenderSessionKind
  readonly canvas: HTMLCanvasElement
  readonly backend: WebGL1Backend
  readonly renderer: Renderer
  readonly readDrawingBufferSize: () => DrawingBufferSize
}

/**
 * 场景已经提交、被换下的旧 Pipeline 释放抛错的诊断。
 *
 * @remarks
 * passNames 是旧 Pipeline 安装时的 Pass 名字和顺序，只用于定位；不保存 Pass 引用。
 * cause 保留原始抛出值，不能假定总是 Error。
 * 本记录不能证明旧 Pass 的剩余资源已经清理完成（同 SceneCleanupFailure）。
 */
export interface PipelineCleanupFailure {
  readonly operation: 'replace'
  readonly passNames: readonly string[]
  readonly cause: unknown
}

/**
 * RenderPass 是接口，运行时只能按形状检查：名字是字符串，execute/dispose 是函数。
 * 方法可以来自原型（class 实例），所以读属性而不是查 own key。
 */
function isRenderPass(value: unknown): value is RenderPass {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { readonly name?: unknown; execute?: unknown; dispose?: unknown }
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.execute === 'function' &&
    typeof candidate.dispose === 'function'
  )
}

/** 窗口尺寸请求与已经应用的 drawing buffer 不是同一状态。 */
interface ViewportRequest {
  readonly width: number
  readonly height: number
  readonly ratio: number
}

/**
 * 装配渲染链、拥有当前 Scene，并调度浏览器帧；不实现具体 draw。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][engine-exclusive-render-mode]
 * 新模式: Engine → Renderer → RenderPipeline（场景交出的 Pass）→ WebGL1Backend。
 * legacy: 旧 Updatable → OrbitControls → legacyRenderer。
 * 同一帧只选其中一条；enterRenderMode 打开会话后即不走旧链，
 * 新模式 lost/退出失败时也不能退回旧链。
 */
export class Engine {
  private readonly sceneSlot = new EngineSceneSlot()
  private session: RenderSession | null = null

  /** 当前 Pipeline 里 Pass 的名字和顺序；只给提交后的清理诊断用。 */
  private installedPassNames: readonly string[] = []

  /**
   * 本 Engine 接管过的全部 Pass。WeakSet 不阻止 GC，但能拒绝再次交来的同一实例：
   * 否则新 Pipeline 接受它之后，释放旧 Pipeline 会把新 Pipeline 正在用的 Pass 也释放掉。
   * 各 Pipeline 只检查自己的登记，跨 Pipeline 的重复只能在这一层发现。
   */
  private readonly acceptedPasses = new WeakSet<RenderPass>()

  private pipelineCleanupFailureValue: PipelineCleanupFailure | null = null

  /** 最近一次 enterRenderMode 从旧路径读空的 GL 错误码；没有读（context 已失效）时为 null。 */
  private legacyGLErrorsValue: readonly number[] | null = null

  /** 帧循环因失败停止时要通知的 UI；Engine 不 import GUI，只认这个函数签名。 */
  private readonly loopFailureListeners = new Set<EngineLoopFailureListener>()

  /** CPU Scene 已摘除，但设备可能尚未释放；此时仍不能恢复 legacy。 */
  private closing = false
  private state: 'active' | 'closing' | 'disposed' = 'active'
  private transitioning = false
  private inFrame = false
  private rendering = false
  private runningValue = false
  private rafId: number | null = null
  private failureValue: EngineFailure | null = null

  private updaters: Updatable[] = []
  private viewportRequest: ViewportRequest
  private appliedPixelRatio: number
  private resizePending = false
  private legacyContextInvalid = false
  private controlsDisposed = false
  private initialized = false
  private initializing = false

  /**
   * 同步创建旧平台入口；新 Backend 延迟到 enterRenderMode。
   *
   * @remarks
   * getContext 的属性只在第一次创建 context 时生效，必须与新 Backend 保持一致。
   * 本批保留旧入口原有扩展要求；新 Backend 仍独立探测自己的 per-context 能力。
   */
  static create(canvas: HTMLCanvasElement): Engine {
    const viewport = Engine.readViewport()
    canvas.width = Math.max(1, Math.floor(viewport.width * viewport.ratio))
    canvas.height = Math.max(1, Math.floor(viewport.height * viewport.ratio))
    canvas.style.width = viewport.width + 'px'
    canvas.style.height = viewport.height + 'px'

    const gl = canvas.getContext('webgl', { alpha: false, depth: true })
    if (gl === null) throw new WebGLNotSupportedError()
    gl.drawingBufferColorSpace = 'srgb'
    initCapabilities(gl)
    const caps = getCapabilities()
    if (!caps.elementIndexUint) throw new WebGLExtensionError('OES_element_index_uint')
    if (!caps.floatLinearFilter) throw new WebGLExtensionError('OES_texture_float_linear')
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

    const camera = new LegacyPerspectiveCamera(50, canvas.width / canvas.height, 0.1, 2000)
    camera.position.set(0, 0, 100)
    const controls = new OrbitControls(camera, canvas)
    controls.minDistance = 0.1
    controls.maxDistance = 1000
    controls.zoomSpeed = 1
    controls.rotateSpeed = 0.3
    controls.panSpeed = 0.8
    controls.target.set(0, 0, 0)
    controls.update()

    return new Engine(
      canvas,
      gl,
      camera,
      controls,
      new FrameClock(gl),
      new WebGLRenderer(gl, camera),
      new PerformanceMonitor(gl),
      viewport
    )
  }

  /** 工厂完成平台装配后才注册可解绑的具名监听。 */
  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGLRenderingContext,
    public readonly camera: LegacyPerspectiveCamera,
    private readonly cameraControls: OrbitControls,
    private readonly frameClock: FrameClock,
    public readonly legacyRenderer: WebGLRenderer,
    private readonly perfMonitor: PerformanceMonitor,
    viewport: ViewportRequest
  ) {
    this.viewportRequest = viewport
    this.appliedPixelRatio = viewport.ratio
    window.addEventListener('resize', this.handleResize)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
  }

  /** 借用当前配对；调用者不能因此取得 Scene.dispose 权限。 */
  get currentSceneBinding(): SceneBinding | null {
    return this.sceneSlot.current
  }

  /** 即使交接成功，也应单独检查旧 Scene 是否清理失败。 */
  get lastSceneCleanupFailure(): SceneCleanupFailure | null {
    return this.sceneSlot.lastCleanupFailure
  }

  /** 同上，检查被换下的旧 Pipeline；只保留最近一次，成功的交接不会把它清空。 */
  get lastPipelineCleanupFailure(): PipelineCleanupFailure | null {
    return this.pipelineCleanupFailureValue
  }

  /** rAF 是否继续被调度；不等同于 Backend.ready。 */
  get running(): boolean {
    return this.runningValue
  }

  /** 异步边界错误供 UI 观察；保留最近一次，不由成功帧自动擦除。 */
  get lastFailure(): EngineFailure | null {
    return this.failureValue
  }

  /** 恢复回调中的失败不会逃出 DOM 事件，因此需要单独暴露 Backend 的诊断。 */
  get lastBackendFailure(): WebGLContextFailure | null {
    return this.session?.backend.lastFailure ?? null
  }

  /**
   * 最近一次 enterRenderMode 前从旧路径读空的 GL 错误码，按读出顺序，冻结。
   * 空数组表示读过、没有残留；null 表示这次没有读（context 已丢失或旧资源已失效），或者还没进入过。
   * 读满预算仍没读空、拒绝进入时，是读到的那些码。
   * 读出顺序不是错误发生的顺序，WebGL 不保证这一点。
   */
  get legacyGLErrorsAtLastEntry(): readonly number[] | null {
    return this.legacyGLErrorsValue
  }

  /**
   * 订阅「帧循环因失败停止」：rAF 帧里的非 context-loss 错误、会停止循环的 resize 失败、
   * 旧路径的 context 丢失。新模式 context 丢失时保留帧链、等浏览器恢复的那条路不通知（循环没停）。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-loop-failure-notice]
   * 这些失败发生在 rAF 回调和 DOM 事件里，没有调用者能接住异常；只记进 lastFailure 的话，
   * UI 不轮询就什么也看不到（HW3 → HW2 时画面停了，界面却一切正常）。
   * Engine 不 import GUI：由 UI 层订阅，自己决定怎样显示。
   * 通知在 Engine 状态一致之后同步发出：帧已经退出、调度已经停止，监听器里可以调用 Engine 的公共方法。
   * 一个监听器抛错不影响其他监听器，也不会从 rAF 回调或 DOM 事件里抛出；监听器自己负责报告自己的错误。
   * 同一个函数重复订阅只算一次。
   *
   * @returns 取消订阅的函数；重复调用没有副作用。
   */
  onLoopFailure(listener: EngineLoopFailureListener): () => void {
    this.loopFailureListeners.add(listener)
    return () => {
      this.loopFailureListeners.delete(listener)
    }
  }

  /**
   * 打开新渲染模式的设备会话；之后才能 setScene，离开时用 clearScene。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-render-session-entry]
   * 会话（含 Backend）在 setScene 之前建好，setScene 才能保持同步事务，
   * 也不打乱 Controller 的「最新请求获胜」时序。
   * 返回 Promise 是给只能异步创建的后端（WebGPU 申请 adapter/device）留的形状；
   * WebGL1 在本次调用内同步建好，返回时 Promise 已经完成。
   * 失败一律以 rejection 报告；会话没建成，Engine 状态不变，旧路径照常可用。
   * 会话已经打开时直接完成，不新建第二个会话。
   * 建会话之前先读空旧路径留在共享 context 上的 GL 错误（drainLegacyGLErrors）；
   * 读满预算仍没读空时拒绝进入。
   */
  // TODO(engine-async-session-open): 接入异步后端时，await 期间要有「打开中」状态：
  // 拒绝 setScene、处理期间到来的 clearScene/dispose（创建完成后释放迟到的 Backend）。
  // 本批只有同步的 WebGL1，不存在这段时间窗。
  async enterRenderMode(kind: RenderSessionKind = 'webgl1'): Promise<void> {
    this.assertActive('enterRenderMode')
    this.assertIdle('enterRenderMode')
    if (this.closing) {
      throw new EngineOperationError('enterRenderMode', 'render session cleanup is incomplete')
    }
    if (this.session !== null) return

    this.transitioning = true
    try {
      // 旧路径从不调用 getError，它留下的错误要在新 Backend 第一次预检之前读走。
      this.drainLegacyGLErrors()
      // 构造失败时还没有任何东西写进 Engine，无需回滚。
      this.session = this.openSession(kind)
      this.installedPassNames = []
      this.cameraControls.enabled = false
      // 尺寸在 setScene 里或下一帧同步，入口本身不触碰 drawing buffer。
      this.resizePending = true
    } finally {
      this.transitioning = false
    }
  }

  /**
   * 在已打开的会话上同步安装一次 SceneSetup：准备 → 提交 → 清理。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-handoff]
   * ① 准备：校验配对和 passes，建新 Pipeline，resize，同步相机。任何一步失败：
   *   旧场景和旧 Pipeline 原样，候选 Scene 和 Pass 仍归调用者；会话不是本方法建的，不回收。
   * ② 提交：Slot 接管配对，再把新 Pipeline 换进 Renderer。可能失败的检查都已在提交前做完，
   *   replacePipeline 的四种拒绝（busy、closing、disposed、同一条）在这里都不会出现：
   *   外层锁排除了 render 和重入，closing/disposed 的 Renderer 只出现在 Engine closing 或已释放时，
   *   新 Pipeline 是本次刚建的。
   * ③ 清理：释放旧 Pipeline；失败只记 lastPipelineCleanupFailure，不对调用者抛「安装失败」。
   * 旧 Scene 的清理失败同样只由 Slot 记录。
   * 外层锁覆盖三段，防止释放回调同步调用 clearScene/dispose/setScene。
   *
   * @throws EngineOperationError 会话没打开、清理未完成、passes 不合法或 Engine 忙碌。
   * @throws SceneHandoffError scene/camera 配对不合法。
   */
  setScene(setup: SceneSetup): void {
    this.assertActive('setScene')
    this.assertIdle('setScene')
    if (this.closing) {
      throw new EngineOperationError('setScene', 'render session cleanup is incomplete')
    }
    const session = this.session
    if (session === null) {
      throw new EngineOperationError(
        'setScene',
        'render session is not open; call enterRenderMode first'
      )
    }
    const { scene, camera, passes, passNames } = this.validateSetup(setup)
    this.transitioning = true

    try {
      // ① 准备。addPass 只登记，不触碰设备；本条 Pipeline 失败时直接丢弃，不 dispose 调用者的 Pass。
      const pipeline = new RenderPipeline()
      for (const pass of passes) pipeline.addPass(pass)

      if (session.backend.ready) {
        const size = this.viewportRequest
        session.backend.resizeDrawingBuffer(size.width, size.height, size.ratio)
        this.syncCamera(session, camera)
        this.appliedPixelRatio = size.ratio
        this.resizePending = false
      } else {
        // lost 期间仍允许切换 CPU 场景；恢复后的首帧同步最新尺寸与投影。
        this.resizePending = true
      }

      // ② 提交。Slot 返回后新配对已接管（旧 Scene 也已尝试释放），之后的步骤都不能抛错。
      this.sceneSlot.setScene(scene, camera)
      const previous = session.renderer.replacePipeline(pipeline)
      const previousPassNames = this.installedPassNames
      for (const pass of passes) this.acceptedPasses.add(pass)
      this.installedPassNames = passNames

      // ③ 清理。
      this.disposeReplacedPipeline(previous, previousPassNames)
    } finally {
      this.transitioning = false
    }
  }

  /**
   * 离开新渲染模式：先摘除 CPU 场景，再释放会话的 Renderer（当前 Pipeline、Backend）。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-render-mode-exit-barrier]
   * 与 enterRenderMode 配对。没有打开会话时没有设备可释放，只重设旧路径的固定 GL 状态。
   * 设备释放抛错时保留会话和 closing 标记；显式再次调用可重试。
   * 释放成功后，还要建立旧路径依赖的固定 GL 状态，才能重新开放旧 loader。
   * 删除 GPU 对象不会自动关闭背面剔除或恢复深度写入。
   */
  clearScene(): void {
    this.assertActive('clearScene')
    this.assertIdle('clearScene')
    this.transitioning = true
    this.closing = true
    this.cameraControls.enabled = false
    try {
      this.sceneSlot.clearScene()
      this.session?.renderer.dispose()
      /**
       * [DESIGN-WEIGHT:3][engine-legacy-state-handoff]
       * 旧场景依赖默认双面绘制，旧 Renderer 的 clear 又不主动恢复 depthMask。
       * 在 Backend 完成释放后关闭剔除、开放深度写入；这不是全 GL 状态快照，
       * 也不修改 surface scope 恢复 framebuffer/viewport 的既有职责。
       * context 已失效时不发恢复命令，assertLegacyMode 仍会拒绝旧路径。
       */
      if (!this.legacyContextInvalid && !this.gl.isContextLost()) {
        this.gl.disable(this.gl.CULL_FACE)
        this.gl.depthMask(true)
      }
      this.session = null
      this.installedPassNames = []
      this.closing = false
      this.resizePending = true
      this.cameraControls.enabled = !this.legacyContextInvalid
    } finally {
      this.transitioning = false
    }
  }

  /**
   * Task 22 的旧场景入口必须先通过此门禁；不能用 currentScene=null 判断 GPU 已空闲。
   * context lost 后旧 GPU 对象没有重建，此时要求重新创建页面/完整旧资源，而非静默复用。
   */
  assertLegacyMode(): void {
    this.assertActive('use legacy mode')
    this.assertIdle('use legacy mode')
    if (
      this.session !== null ||
      this.closing ||
      this.legacyContextInvalid ||
      this.gl.isContextLost()
    ) {
      throw new EngineOperationError(
        'use legacy mode',
        'device is owned by the render session or legacy resources are invalid'
      )
    }
  }

  /**
   * 新模式的 CPU 更新入口。
   * 当前唯一的新模式场景 HW2 是静态 CPU 场景，没有逐帧系统；这里不驱动旧 Updatable/OrbitControls。
   * 世界矩阵仍由 RenderListBuilder 在提取时按需更新，不能在此重复做 GPU 工作。
   */
  update(_frame: FrameSnapshot): void {
    this.assertActive('update')
  }

  /** 借用当前配对向新 Renderer 提交一帧；不把 Scene 长期存进 Renderer。 */
  render(frame: FrameSnapshot): void {
    this.assertActive('render')
    if (this.transitioning || this.rendering)
      throw new EngineOperationError('render', 'operation in progress')
    const binding = this.sceneSlot.current
    if (binding === null || this.session === null || this.closing) return
    this.rendering = true
    try {
      this.session.renderer.render({ ...binding, frame })
    } finally {
      this.rendering = false
    }
  }

  /** 安排唯一一条 rAF 链；重复调用不增加第二条链。 */
  start(): void {
    this.assertActive('start')
    if (this.runningValue) return
    this.runningValue = true
    this.scheduleFrame()
  }

  /** 可在帧回调中请求停止；finally 不会再次调度。 */
  stop(): void {
    this.runningValue = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  /** 旧更新器只属于 legacy 分支，不把旧相机/FrameContext 泄漏到新模式。 */
  addUpdater(updater: Updatable): void {
    this.assertActive('addUpdater')
    if (!this.updaters.includes(updater)) this.updaters.push(updater)
  }

  /** 先摘除再通知，防止 dispose 回调再次找到同一个注册项。 */
  removeUpdater(updater: Updatable): void {
    this.assertActive('removeUpdater')
    const index = this.updaters.indexOf(updater)
    if (index < 0) return
    this.updaters.splice(index, 1)
    updater.dispose?.()
  }

  /**
   * 旧坐标轴初始化仍有异步 GPU 工作；完成前拒绝模式交接和 Engine.dispose。
   * 本批不为旧 loadAxes 虚构 AbortSignal 支持。
   */
  async init(): Promise<void> {
    this.assertLegacyMode()
    if (this.initialized) return
    this.initializing = true
    try {
      await loadAxes(this.createSceneContext())
      this.initialized = true
    } finally {
      this.initializing = false
    }
  }

  /**
   * 运行根场景入口。不能在整个 await 期间锁住 enterRenderMode/setScene：
   * Task 22 的根 loader 正需要通过 ctx.engine 进入新模式并安装 HW2。
   * loader 自己负责异步取消/返回的清理函数；此处不猜测 Promise<unknown> 的含义。
   */
  async loadScene(loader: SceneLoader): Promise<void> {
    this.assertLegacyMode()
    await loader(this.createSceneContext())
  }

  /**
   * 永久停止 Engine；GPU 清理失败可显式重试 dispose，但不能再 start/enterRenderMode/setScene。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-dispose-order]
   * 先关闭调度/监听，再释放 CPU 场景与新 Renderer，最后处理旧注册资源。
   */
  // TODO(legacy-engine-disposal): PerformanceMonitor 尚无 dispose，
  // OverlayRenderPass.dispose 目前为空；这里不宣称已修复旧 UI/HUD 的全部释放责任。
  dispose(): void {
    if (this.state === 'disposed') return
    this.assertIdle('dispose')
    this.transitioning = true
    this.state = 'closing'
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored)
    // 关闭之后循环不会再跑，也就不会再有要通知的失败；先放掉对 UI 回调的引用。
    this.loopFailureListeners.clear()
    this.cameraControls.enabled = false

    try {
      if (!this.controlsDisposed) {
        this.cameraControls.dispose()
        this.controlsDisposed = true
      }
      this.sceneSlot.dispose()
      this.session?.renderer.dispose()
      this.session = null
      this.installedPassNames = []
      while (this.updaters.length > 0) {
        this.updaters[0]!.dispose?.()
        this.updaters.shift()
      }
      this.legacyRenderer.clearRenderPasses()
      this.legacyRenderer.getOverlayRenderPass().dispose()
      this.state = 'disposed'
    } finally {
      this.transitioning = false
    }
  }

  /**
   * 进入新模式前，读空旧路径留在共享 context 上的 GL 错误标志，结果写进 legacyGLErrorsAtLastEntry。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-legacy-error-handoff]
   * WebGL 的错误是 context 上的标志：谁调用 getError 就被谁读走，它不记得是哪段代码产生的。
   * 旧路径从不调用 getError，它留下的标志会一直留着（浏览器实测：HW3 的帧留下 1282 INVALID_OPERATION）。
   * WebGL1 会话和旧路径共用这个 context；新 Backend 第一次 draw 前做预检
   * （WebGL1ProgramManager.checkError），读到这个标志，就把旧路径的错误算到自己的 program 头上，
   * 整帧失败，帧循环停止，画面停在 HW3 的最后一帧。
   * 所以交接时由 Engine 先读空。它和 clearScene 里交回旧路径的固定状态
   * （engine-legacy-state-handoff）是对称的两次交接：离开新模式时整理旧路径要的状态，
   * 进入新模式时清掉旧路径留下的错误。后端的预检不放宽：它只该看到自己这一代命令产生的错误。
   *
   * 预算 32 次，含确认结束的那一次 NO_ERROR，与后端 checkError 一致。WebGL 每种错误只有一个标志，
   * 正常几次就读空；上限防的是驱动或测试替身一直返回非零时卡死在这个循环里。
   * 读满仍没见到 NO_ERROR 就拒绝进入：新 Backend 的第一次预检反正会失败，不如在入口明确报出来。
   *
   * context 已丢失或旧资源已失效时不读：丢失期间 getError 只报告丢失本身，
   * 丢失与恢复由新 Backend 自己处理；恢复后的 context 不带旧的错误标志。
   *
   * @throws EngineOperationError 读满预算仍没读空。
   */
  private drainLegacyGLErrors(): void {
    if (this.legacyContextInvalid || this.gl.isContextLost()) {
      this.legacyGLErrorsValue = null
      return
    }

    const codes: number[] = []
    for (let read = 0; read < LEGACY_GL_ERROR_READ_BUDGET; read += 1) {
      const code = this.gl.getError()
      if (code === this.gl.NO_ERROR) {
        this.legacyGLErrorsValue = Object.freeze(codes)
        return
      }
      codes.push(code)
    }

    this.legacyGLErrorsValue = Object.freeze(codes)
    throw new EngineOperationError(
      'enterRenderMode',
      'legacy GL errors did not clear after ' +
        LEGACY_GL_ERROR_READ_BUDGET +
        ' reads: ' +
        codes.join(', ')
    )
  }

  /**
   * 先构造不触碰设备的部件，最后创建 Backend；后续包装构造只保存引用。
   *
   * @remarks
   * Renderer 先拿一条空 Pipeline，场景的 Pass 只经由 setScene 换进来。
   * 所以会话里从来没有调用者尚未交出的 Pass：释放会话不会误释放它们。
   */
  private openSession(kind: RenderSessionKind): RenderSession {
    const pipeline = new RenderPipeline()
    const builder = new RenderListBuilder()
    const canvas = this.selectSessionCanvas(kind)
    const backend = new WebGL1Backend(canvas, 'Engine WebGL1 session')
    return {
      kind,
      canvas,
      backend,
      renderer: new Renderer(backend, pipeline, builder),
      // 与旧路径共用同一个 context（见 selectSessionCanvas），实际尺寸由它给出。
      readDrawingBufferSize: () => ({
        width: this.gl.drawingBufferWidth,
        height: this.gl.drawingBufferHeight
      })
    }
  }

  /**
   * 会话绑定哪块 canvas，只在这里决定。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-session-canvas]
   * WebGL1 用构造时那块：旧路径已经在它上面 getContext('webgl')，
   * 一块 canvas 只能有一种 context，新 Backend 拿到的就是同一个 context。
   * WebGPU 模式要用另一块 canvas：已有 WebGL context 的 canvas 永远拿不到 webgpu context。
   */
  // TODO(engine-session-canvas-switch): 会话 canvas 与构造时的 canvas 不同时，
  // resize 的 style 同步、Engine 的 DOM 监听、场景的输入监听都要迁到会话 canvas，
  // 并处理两块 canvas 的显示切换。本批只有 WebGL1，不实现切换。
  private selectSessionCanvas(kind: RenderSessionKind): HTMLCanvasElement {
    // 类型上只有 webgl1；这里仍拦住来自无类型调用方的其他值，不默默退回 WebGL1。
    if (kind !== 'webgl1') {
      throw new EngineOperationError('enterRenderMode', 'unsupported render session kind')
    }
    return this.canvas
  }

  /**
   * 预检要早于建 Pipeline、resize 和改 Camera：无效输入不能先产生副作用再被拒绝。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-setup-ownership]
   * passes 先复制再检查，调用者之后改原数组不影响本次安装。
   * Pass 名字在这里读出并冻结，提交之后不再读调用者的对象。
   * 拒绝本 Engine 接管过的实例（见 acceptedPasses），不只是列表内的重复。
   */
  private validateSetup(setup: SceneSetup): {
    readonly scene: Scene
    readonly camera: Camera
    readonly passes: readonly RenderPass[]
    readonly passNames: readonly string[]
  } {
    const input: unknown = setup
    if (typeof input !== 'object' || input === null) {
      throw new EngineOperationError('setScene', 'setup must be an object')
    }
    const { scene, camera } = setup
    this.validatePair(scene, camera)

    const candidates: unknown = setup.passes
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new EngineOperationError('setScene', 'passes must be a non-empty array')
    }

    const passes: RenderPass[] = []
    const passNames: string[] = []
    const seen = new Set<RenderPass>()
    for (const candidate of candidates as readonly unknown[]) {
      if (!isRenderPass(candidate)) {
        throw new EngineOperationError('setScene', 'every pass needs a name, execute and dispose')
      }
      if (seen.has(candidate)) {
        throw new EngineOperationError('setScene', 'the same pass appears twice in passes')
      }
      if (this.acceptedPasses.has(candidate)) {
        throw new EngineOperationError(
          'setScene',
          'pass "' + candidate.name + '" was already accepted; create a new instance'
        )
      }
      seen.add(candidate)
      passes.push(candidate)
      passNames.push(candidate.name)
    }

    return { scene, camera, passes, passNames: Object.freeze(passNames) }
  }

  /**
   * 释放提交后换下的旧 Pipeline，把失败保存为可观察状态。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-post-commit-cleanup]
   * 这里的 catch 不是「失败等于成功」：新场景和新 Pipeline 已经接管，
   * 把清理错误抛给 Controller，它会误释放已经接管的新场景。
   * 失败的旧 Pipeline 停在 closing，剩余 Pass 不会再执行；本层不重试
   * （同 EngineSceneSlot 的 TODO(scene-dispose-failure-policy)）。
   */
  private disposeReplacedPipeline(pipeline: RenderPipeline, passNames: readonly string[]): void {
    try {
      pipeline.dispose()
    } catch (cause: unknown) {
      this.pipelineCleanupFailureValue = Object.freeze({ operation: 'replace', passNames, cause })
    }
  }

  /**
   * Slot 自己也会验证；这里的预检要提前到创建 Pipeline/调整 Camera 之前。
   * 重复的是边界保护，不是让无效配对先产生 GPU 副作用再由 Slot 拒绝。
   */
  private validatePair(scene: Scene, camera: Camera): void {
    if (!(scene instanceof Scene)) throw new SceneHandoffError('invalid-scene')
    if (!(camera instanceof Camera)) throw new SceneHandoffError('invalid-camera')
    if (scene.disposed) throw new SceneHandoffError('scene-disposed', { sceneUuid: scene.uuid })
    let ancestor: SceneNode | null = camera
    while (ancestor !== null) {
      if (ancestor === scene) return
      ancestor = ancestor.parent
    }
    throw new SceneHandoffError('camera-outside-scene', {
      sceneUuid: scene.uuid,
      cameraUuid: camera.uuid
    })
  }

  /** 保留 fov/near/far，仅把透视相机 aspect 同步到会话的实际 drawing buffer。 */
  private syncCamera(session: RenderSession, camera: Camera): void {
    if (!(camera instanceof PerspectiveCamera)) return
    const size = session.readDrawingBufferSize()
    camera.setPerspective({
      fovY: camera.fovY,
      aspect: size.width / size.height,
      near: camera.near,
      far: camera.far
    })
  }

  /** 使用具名 handler，dispose 可以准确解绑。busy/lost 时只保存尺寸请求。 */
  private readonly handleResize = (): void => {
    if (this.state !== 'active') return
    this.viewportRequest = Engine.readViewport()
    this.canvas.style.width = this.viewportRequest.width + 'px'
    this.canvas.style.height = this.viewportRequest.height + 'px'
    this.resizePending = true
    if (this.inFrame || this.transitioning || this.rendering) return
    try {
      this.applyResize()
    } catch (cause: unknown) {
      const failure = this.recordFailure('resize', cause)
      // ready 检查与实际 resize 之间仍可能发生物理 loss。
      // 新模式保留原有帧链与 resizePending，恢复后下一帧重试；
      // 其他错误仍停止循环，不能把任意失败都当作可恢复的 context loss。
      if (this.session === null || !(cause instanceof WebGLContextLostError)) {
        this.stop()
        this.notifyLoopFailure(failure)
      }
    }
  }

  /**
   * 新 Backend 处理自己的 loss/restoration。Engine 只保留 CPU Scene、暂停旧控制器。
   * 本监听挂在构造时的 canvas 上，管的是旧路径的 context：即使丢失发生在新模式中，
   * 旧 GPU 对象也失效，不能在以后退出新模式时复用。
   */
  private readonly handleContextLost = (event: Event): void => {
    this.legacyContextInvalid = true
    this.resizePending = true
    if (this.session !== null) return
    event.preventDefault()
    this.stop()
    const failure = this.recordFailure(
      'legacy context lost',
      new WebGLContextLostError('legacy rendering')
    )
    this.notifyLoopFailure(failure)
  }

  /** Backend 自己重建 GPU generation；Engine 不抢先 draw，只标记需要重新同步尺寸。 */
  private readonly handleContextRestored = (): void => {
    this.resizePending = true
  }

  /**
   * resize 操作只发生在绘制 scope 外，且只有当前路径能修改 drawing buffer。
   * 会话路径只看会话自己的 Backend 是否 ready，不看旧路径的 context：
   * 两者以后可能不在同一块 canvas 上（见 selectSessionCanvas）。
   */
  private applyResize(): void {
    if (!this.resizePending || this.closing) return
    const size = this.viewportRequest
    const session = this.session
    if (session !== null) {
      if (!session.backend.ready) return
      session.backend.resizeDrawingBuffer(size.width, size.height, size.ratio)
      const binding = this.sceneSlot.current
      if (binding !== null) this.syncCamera(session, binding.camera)
    } else {
      if (this.legacyContextInvalid || this.gl.isContextLost()) return
      const width = Math.max(1, Math.floor(size.width * size.ratio))
      const height = Math.max(1, Math.floor(size.height * size.ratio))
      if (this.canvas.width !== width) this.canvas.width = width
      if (this.canvas.height !== height) this.canvas.height = height
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
      this.camera.aspect = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight
      this.camera.updateProjectionMatrix()
    }
    this.appliedPixelRatio = size.ratio
    this.resizePending = false
  }

  /**
   * 每次回调只 tick 一次。FrameClock 的可变对象留在 legacy 分支，
   * 新模式复制六个标量，不能把 textureUnitCounter 等旧 draw 状态带进新链。
   */
  private readonly loop = (): void => {
    this.rafId = null
    if (!this.runningValue || this.state !== 'active') return
    this.inFrame = true
    let stoppedBy: EngineFailure | null = null
    try {
      this.applyResize()
      const oldFrame = this.frameClock.tick()
      const session = this.session
      if (session !== null) {
        if (!this.closing) {
          const size = session.readDrawingBufferSize()
          const frame: FrameSnapshot = Object.freeze({
            frameNumber: oldFrame.frame,
            timeSeconds: oldFrame.elapsedTime,
            deltaSeconds: oldFrame.deltaTime,
            drawingBufferWidth: size.width,
            drawingBufferHeight: size.height,
            pixelRatio: this.appliedPixelRatio
          })
          this.update(frame)
          this.render(frame)
        }
      } else if (!this.legacyContextInvalid && !this.gl.isContextLost()) {
        for (const updater of [...this.updaters]) {
          updater.update({
            frameContext: oldFrame,
            camera: this.camera,
            controls: this.cameraControls
          })
        }
        this.cameraControls.update()
        this.legacyRenderer.render(oldFrame)
      }
      this.perfMonitor.update()
    } catch (cause: unknown) {
      const failure = this.recordFailure('frame', cause)
      // context lost 等待浏览器恢复；其他错误停止循环，避免每帧重放相同故障。
      if (!(cause instanceof WebGLContextLostError)) {
        this.stop()
        stoppedBy = failure
      }
    } finally {
      this.inFrame = false
      this.scheduleFrame()
    }
    // 帧已经退出、不会再调度之后才通知：监听器看到的是一致的 Engine，可以调用 clearScene 等。
    if (stoppedBy !== null) this.notifyLoopFailure(stoppedBy)
  }

  /** stop 在当前帧内发生时，不再安排下一次回调。 */
  private scheduleFrame(): void {
    if (this.runningValue && this.rafId === null) this.rafId = requestAnimationFrame(this.loop)
  }

  /** 有界诊断，不调用外部 Logger/UI，因此不会把二次异常混进交接协议。 */
  private recordFailure(operation: string, cause: unknown): EngineFailure {
    const failure: EngineFailure = Object.freeze({ operation, cause })
    this.failureValue = failure
    return failure
  }

  /**
   * 帧循环因失败停止后通知订阅方。调用前失败已经记进 lastFailure、调度已经停止。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-loop-failure-notice]
   * 遍历副本：监听器在通知中订阅或取消订阅，不影响这一轮。
   * 监听器抛错时接住并继续下一个：rAF 回调和 DOM 事件里没有调用者能处理它，
   * 一个坏的监听器也不能挡住其他监听器。原始失败仍在 lastFailure 里。
   */
  private notifyLoopFailure(failure: EngineFailure): void {
    for (const listener of [...this.loopFailureListeners]) {
      try {
        listener(failure)
      } catch {
        // 监听器自己负责报告自己的错误（setup.ts 的 reportFailure 已兜住日志失败）。
      }
    }
  }

  /** 保留旧 loader 字段名，显式增加新的 Engine 交接入口。 */
  private createSceneContext(): SceneContext {
    return {
      gl: this.gl,
      renderer: this.legacyRenderer,
      camera: this.camera,
      controls: this.cameraControls,
      engine: this
    }
  }

  /** 全窗口策略与当前入口一致；以后嵌入容器再单独引入 ResizeObserver。 */
  private static readViewport(): ViewportRequest {
    return { width: window.innerWidth, height: window.innerHeight, ratio: getClampedDPR() }
  }

  private assertActive(operation: string): void {
    if (this.state !== 'active')
      throw new EngineOperationError(operation, 'Engine is ' + this.state)
  }

  /** 外层 guard 比 Slot 更宽：还保护设备、帧 scope 与旧异步坐标轴初始化。 */
  private assertIdle(operation: string): void {
    if (this.transitioning || this.inFrame || this.rendering || this.initializing) {
      throw new EngineOperationError(operation, 'operation in progress')
    }
  }
}
