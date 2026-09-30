import { WebGLBackendDisposedError, WebGLContextLostError } from '@/rendering/core/errors'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import { WebGL1CubeTextureManager } from './WebGL1CubeTextureManager'
import { WebGL1GeometryManager } from './WebGL1GeometryManager'
import { WebGL1ProgramManager } from './WebGL1ProgramManager'
import { WebGL1RenderTargetManager } from './WebGL1RenderTargetManager'
import {
  createWebGL1VertexInputManager,
  type WebGL1VertexInputManager
} from './WebGL1VertexInputManager'

/**
 * Backend 提供的同步协作点，不是应用层事件回调。
 *
 * @remarks
 * 应连接完整的 state.invalidate()，而不是仅清除 EBO 缓存。
 * 回调只修改 CPU 缓存标记：不得发 GL 命令、抛错、返回 Promise 或重入资源操作。
 */
export interface WebGL1ResourceManagerHooks {
  readonly invalidateState: () => undefined
}

/** 只提取批量清理所需的公共协议，不替代各个 Manager 的专用接口。 */
interface ManagedLifecycle {
  invalidateForContextLoss(): void
  dispose(): void
}

/**
 * 组装单个 WebGL1 context 当前一代的 GPU Managers，负责跨 Manager 生命周期顺序。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 *
 * 本类不拥有 CPU Resource，不执行 draw，不上传 uniform，不创建另一套资源缓存。
 * ShaderModule/Geometry/Texture 的 GPU cache 仍保存在各自 Manager 中。
 * 每个 Backend/context 创建自己的实例；恢复后重新探测 capabilities 并创建新实例。
 *
 * 子 Manager 只供 Backend 内部借用，不应暴露给 Mesh、Material 或应用层。
 * get 入口关闭后，调用者也不得继续使用提前保存的子 Manager 引用。
 * Getter 不是 JavaScript 引用撤销机制，无法收回已经交给调用者的对象。
 */
export class WebGL1ResourceManager {
  private readonly gl: WebGLRenderingContext

  private readonly programsValue: WebGL1ProgramManager
  private readonly geometriesValue: WebGL1GeometryManager
  private readonly cubeTexturesValue: WebGL1CubeTextureManager
  private readonly renderTargetsValue: WebGL1RenderTargetManager
  private readonly vertexInputsValue: WebGL1VertexInputManager
  private readonly disposalOrder: readonly ManagedLifecycle[]

  /** 开始关闭即拒绝新工作；不代表全部 GPU 清理已经成功。 */
  private closing = false

  /** 当前实例所属的 context generation 已失效，恢复事件不会把它改回 false。 */
  private lost = false

  /** 防止同步重入 dispose；不是跨线程锁。 */
  private disposing = false

  /** 指向下一个尚未成功完成的清理步骤，只在该步骤正常返回后前进。 */
  private disposalIndex = 0

  /**
   * 组装已有 Manager；构造时不创建 program、buffer、texture、FBO 或 VAO。
   *
   * @param gl 当前 Backend 独占管理的 context。
   * @param capabilities 从同一 context 当前代探测得到的能力快照。
   * @param hooks 连接该 Backend 的 State 缓存失效入口。
   */
  constructor(
    gl: WebGLRenderingContext,
    capabilities: WebGL1Capabilities,
    hooks: WebGL1ResourceManagerHooks
  ) {
    if (gl.isContextLost()) throw new WebGLContextLostError('create resource manager')

    this.gl = gl

    this.vertexInputsValue = createWebGL1VertexInputManager(gl, capabilities, hooks)

    /**
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-before-delete-order]
     *
     * 显式接线，而不是给 CPU Resource 追加一个“需要先触发”的 listener。
     * 回调正常返回后，Geometry/Program Manager 才能继续删除自己拥有的 handles。
     * 块体不返回值，以满足同步 undefined 回调协议。
     */
    this.geometriesValue = new WebGL1GeometryManager(gl, capabilities, {
      invalidateState: hooks.invalidateState,
      beforeDelete: (geometry) => {
        this.vertexInputsValue.releaseGeometry(geometry)
      }
    })

    this.programsValue = new WebGL1ProgramManager(gl, {
      invalidateState: hooks.invalidateState,
      beforeDelete: (program) => {
        this.vertexInputsValue.releaseProgram(program)
      }
    })

    this.cubeTexturesValue = new WebGL1CubeTextureManager(gl, capabilities, hooks)
    this.renderTargetsValue = new WebGL1RenderTargetManager(gl, capabilities, hooks)

    // 先结束借用方，再结束被借用的 GPU 资源所有者。
    this.disposalOrder = Object.freeze([
      this.vertexInputsValue,
      this.renderTargetsValue,
      this.cubeTexturesValue,
      this.geometriesValue,
      this.programsValue
    ])
  }

  /** 借用 program Manager；关闭或 lost 后拒绝从协调器开始新工作。 */
  get programs(): WebGL1ProgramManager {
    this.assertAvailable()
    return this.programsValue
  }

  /** 借用静态 Geometry buffer Manager，不移交其所有权。 */
  get geometries(): WebGL1GeometryManager {
    this.assertAvailable()
    return this.geometriesValue
  }

  /** 借用 cubemap Manager；本阶段没有在此悄悄加入通用 Texture2D Manager。 */
  get cubeTextures(): WebGL1CubeTextureManager {
    this.assertAvailable()
    return this.cubeTexturesValue
  }

  /** 借用 RenderTarget Manager；surface 作用域的捕获/恢复仍属于 Backend。 */
  get renderTargets(): WebGL1RenderTargetManager {
    this.assertAvailable()
    return this.renderTargetsValue
  }

  /** 借用已按 capabilities 选定的 OES 或 manual 顶点输入策略。 */
  get vertexInputs(): WebGL1VertexInputManager {
    this.assertAvailable()
    return this.vertexInputsValue
  }

  /**
   * 永久失效当前一代的全部缓存并取消 CPU Resource 订阅，不执行 GL 删除。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
   *
   * 由 ContextLifecycle 的 lost 通知，或入口检测到物理 lost 时调用。
   * 这些子方法是无 GL、无用户回调的内部清理路径；hooks 必须遵守不抛错契约。
   * 不在这里恢复 context，也不重新上传 CPU 数据或重跑烘焙 Pipeline。
   */
  invalidateForContextLoss(): void {
    if (this.lost) return

    this.lost = true

    for (const manager of this.disposalOrder) {
      manager.invalidateForContextLoss()
    }
  }

  /**
   * 按固定依赖顺序关闭全部 Manager；不调用任何 CPU Resource.dispose()。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-manager-disposal]
   *
   * vertexInputs → renderTargets → cubeTextures → geometries → programs。
   *
   * 某一步抛错：立即向调用者传播，停在该步，不删除后续依赖资源。
   * 下一次显式 dispose 从该步重试，已完成的步骤不重复执行。
   * 这不是事务回滚；当前步骤内部的部分清理和重试安全仍由该 Manager 保证。
   *
   * closing 在首次调用时即置 true，即使清理失败也不能恢复绘制。
   * 调用者必须处理异常并决定重试或报告失败；本方法不吞错、不自动循环重试。
   * 不改变 Resource 基类尚未固定的 listener 异常传播语义。
   */
  dispose(): void {
    if (this.disposing || this.disposalIndex === this.disposalOrder.length) return

    this.closing = true
    this.disposing = true

    try {
      while (this.disposalIndex < this.disposalOrder.length) {
        if (this.gl.isContextLost()) this.invalidateForContextLoss()

        // 下标由 while 上界和仅成功后递增的不变量保证有效。
        const manager = this.disposalOrder[this.disposalIndex]!
        manager.dispose()
        this.disposalIndex += 1
      }
    } finally {
      this.disposing = false
    }
  }

  /** 物理 lost 可能早于 DOM 事件；观察到后立即失效全部 Manager，而不只失效某一个。 */
  private assertAvailable(): void {
    if (this.closing) {
      throw new WebGLBackendDisposedError('access resource manager')
    }

    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError('access resource manager')
    }
  }
}
