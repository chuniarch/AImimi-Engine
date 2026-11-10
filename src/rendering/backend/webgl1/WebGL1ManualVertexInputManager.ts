import {
  CleanupFailureError,
  WebGLBackendDisposedError,
  WebGLContextLostError
} from '@/rendering/core/errors'
import type { Geometry } from '@/rendering/resources/Geometry'
import type { WebGL1GeometryResource } from './WebGL1GeometryManager'
import type { WebGL1ProgramResource } from './WebGL1ProgramManager'
import type { WebGL1VertexInputHooks, WebGL1VertexInputManager } from './WebGL1VertexInputManager'
import { WebGL1VertexInputSupport } from './WebGL1VertexInputSupport'

/**
 * 没有 OES VAO 时，每次 draw 前手动重建顶点输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][manual-stale-location-cleanup]
 *
 * 只记住当前启用的 location，不缓存“已经绑过，所以可以跳过 pointer”。
 * 本策略独占该 context 的默认顶点输入状态，不能与任意外部 GL 写入交错使用。
 */
export class WebGL1ManualVertexInputManager implements WebGL1VertexInputManager {
  private readonly gl: WebGLRenderingContext
  private readonly hooks: WebGL1VertexInputHooks

  private readonly support: WebGL1VertexInputSupport

  /** 上一次成功配置后，由本策略启用的位置。 */
  private readonly enabled = new Set<number>()

  /** 首次接管时需要扫描全部位置；之后才能使用 enabled 跟踪。 */
  private initialized = false

  /** 用于资源释放前判断当前输入是否正在借用该 Geometry。 */
  private currentGeometry: Geometry | null = null

  /** 用于 program 释放前判断是否需要结束当前输入绑定。 */
  private currentProgram: WebGLProgram | null = null

  private closing = false
  private busy = false
  /** 部分修改或解绑失败时，仍需保守重置全部位置。 */
  private resetPending = false

  constructor(gl: WebGLRenderingContext, maxAttributes: number, hooks: WebGL1VertexInputHooks) {
    this.gl = gl
    this.hooks = hooks
    this.support = new WebGL1VertexInputSupport(gl, maxAttributes)
  }

  /**
   * 先完整验证，再禁用旧 location、配置本次 pointer 和 EBO。
   *
   * @remarks
   * 首次使用不知道此前启用了哪些 location，因此扫一遍设备上限。
   * 后续只禁用自己跟踪到、但本次不再使用的位置。
   * 配置中失败会禁用顶点属性数组并清空当前 buffer 绑定；
   * 不尝试恢复旧 pointer，调用者必须跳过本次 draw。
   */
  bind(
    geometry: Geometry,
    gpuGeometry: WebGL1GeometryResource,
    program: WebGL1ProgramResource
  ): void {
    if (this.closing) throw new WebGLBackendDisposedError('bind vertex input')
    this.assertNotBusy()
    this.busy = true
    // 输入验证失败时不碰旧配置；开始修改 GL 后失败才执行保守清理。
    let changed = false

    try {
      this.support.assertBindable(geometry)
      if (this.resetPending) this.resetBindings(true)
      this.support.checkError('prepare manual vertex input')

      const bindings = this.support.resolve(gpuGeometry, program)
      const nextEnabled = new Set(bindings.map((binding) => binding.location))

      changed = true
      this.resetPending = true

      const previous = this.initialized
        ? this.enabled
        : Array.from({ length: this.support.maxAttributes }, (_, index) => index)

      for (const location of previous) {
        if (!nextEnabled.has(location)) {
          this.gl.disableVertexAttribArray(location)
        }
      }

      this.support.apply(bindings, gpuGeometry.indexBuffer)

      // 只有全部配置成功，才提交新的 CPU 跟踪状态。
      this.enabled.clear()

      for (const location of nextEnabled) {
        this.enabled.add(location)
      }

      this.initialized = true
      this.currentGeometry = geometry
      this.currentProgram = program.program
      this.resetPending = false
    } catch (error) {
      if (!this.support.disposed && this.support.contextLost) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('bind vertex input')
      }

      // apply 中可能已经启用了新位置，不能只清理旧 enabled 集合。
      if (changed) {
        this.resetBindings(true)
      }

      throw error
    } finally {
      this.busy = false
      this.hooks.invalidateState()
    }
  }

  /**
   * 禁用受管理的位置并清空 buffer 绑定，不删除 CPU/GPU 资源。
   * 清理失败统一保留原始 cause；lost 则放弃旧代责任，不重试旧句柄。
   */
  unbind(): void {
    if (this.support.disposed) return

    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }

    this.assertNotBusy()
    this.busy = true
    try {
      this.resetBindings(false)
    } catch (cause: unknown) {
      if (this.support.contextLost) {
        this.invalidateForContextLoss()
        return
      }
      throw new CleanupFailureError('WebGL1ManualVertexInputManager', [
        { phase: 'gpu-dependency', label: 'unbind vertex input', cause }
      ])
    } finally {
      this.busy = false
      this.hooks.invalidateState()
    }
  }

  /** 当前输入借用了该 Geometry 时先解绑，其他 Geometry 不受影响。 */
  releaseGeometry(geometry: Geometry): void {
    if (this.currentGeometry === geometry || this.resetPending) {
      this.unbind()
    }
  }

  /** 放弃布局元数据，并在必要时解绑；不调用 deleteProgram。 */
  releaseProgram(program: WebGLProgram): void {
    if (this.currentProgram === program || this.resetPending) {
      this.unbind()
    }
    this.support.forgetProgram(program)
  }

  /** lost 期间不执行 disable/bind，只丢弃 CPU 侧跟踪状态。 */
  invalidateForContextLoss(): void {
    this.enabled.clear()
    this.currentGeometry = null
    this.currentProgram = null
    this.initialized = false
    this.resetPending = false
    this.support.invalidateForContextLoss()
    this.hooks.invalidateState()
  }

  /** 幂等结束策略生命周期，不释放借用的 Geometry、program 或 buffer。 */
  dispose(): void {
    if (this.support.disposed) return

    this.assertNotBusy()
    this.closing = true
    this.unbind()
    // 只有解绑与错误检查都成功，才关闭 Support；失败后必须还能继续清理。
    this.support.dispose()
  }

  /**
   * 禁用属性数组并清空当前 buffer 绑定。
   *
   * @remarks
   * forceAll 用于失败后的保守清理，覆盖尚未进入 enabled 记录的新 location。
   * 禁用属性数组不等于擦除其全部 pointer 元数据；后续 bind 会重新配置。
   */
  private resetBindings(forceAll: boolean): void {
    const locations =
      forceAll || this.resetPending || !this.initialized
        ? Array.from({ length: this.support.maxAttributes }, (_, index) => index)
        : this.enabled

    this.resetPending = true
    for (const location of locations) {
      this.gl.disableVertexAttribArray(location)
    }

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    this.support.checkError('reset manual vertex input')

    // GL error 也会阻止提交；保留 currentGeometry/currentProgram 供下一次重试。
    this.enabled.clear()
    this.currentGeometry = null
    this.currentProgram = null
    this.initialized = true
    this.resetPending = false
  }

  /** 正常返回不能越过尚未结束的同步解绑屏障。 */
  private assertNotBusy(): void {
    if (this.busy) {
      throw new CleanupFailureError('WebGL1ManualVertexInputManager', [
        {
          phase: 'gpu-dependency',
          label: 'vertex input',
          cause: new Error('Vertex input operation is already running')
        }
      ])
    }
  }
}
