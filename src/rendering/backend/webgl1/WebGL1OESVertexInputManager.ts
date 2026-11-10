import {
  CleanupFailureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import type { Geometry } from '@/rendering/resources/Geometry'
import type { WebGL1GeometryResource } from './WebGL1GeometryManager'
import type { WebGL1ProgramResource } from './WebGL1ProgramManager'
import type { WebGL1VertexInputHooks, WebGL1VertexInputManager } from './WebGL1VertexInputManager'
import { WebGL1VertexInputSupport } from './WebGL1VertexInputSupport'

/** VAO 以及构建它时使用的 GPU Geometry 表示。 */
interface VertexArrayEntry {
  readonly vao: WebGLVertexArrayObjectOES
  readonly gpuGeometry: WebGL1GeometryResource
  readonly geometry: Geometry
  readonly program: WebGLProgram
}

/**
 * 缓存当前 context 的 OES VAO。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][vao-geometry-program-key]
 *
 * 第一层 key 是 CPU Geometry，第二层是实际 linked WebGLProgram。
 * VAO 不保存 program，但其中的 location 布局来自特定 program。
 * 因此不能只按 Geometry 缓存。
 */
export class WebGL1OESVertexInputManager implements WebGL1VertexInputManager {
  private readonly gl: WebGLRenderingContext
  private readonly extension: OES_vertex_array_object
  private readonly hooks: WebGL1VertexInputHooks

  private readonly entries = new Map<Geometry, Map<WebGLProgram, VertexArrayEntry>>()

  private readonly support: WebGL1VertexInputSupport

  /** 本策略最近一次成功绑定的 VAO；不代表可以容忍任意外部 GL 状态修改。 */
  private currentVAO: WebGLVertexArrayObjectOES | null = null
  /** 已退出缓存但尚未删除成功的 VAO；依赖身份持续可达。 */
  private readonly retired = new Set<VertexArrayEntry>()
  private closing = false
  private busy = false

  constructor(
    gl: WebGLRenderingContext,
    extension: OES_vertex_array_object,
    maxAttributes: number,
    hooks: WebGL1VertexInputHooks
  ) {
    this.gl = gl
    this.extension = extension
    this.support = new WebGL1VertexInputSupport(gl, maxAttributes)
    this.hooks = hooks
  }

  /**
   * 命中时只绑定；未命中时配置一个新 VAO，全部成功后才加入缓存。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][vao-creation-rollback]
   *
   * 新建失败恢复进入本方法时的 VAO/ARRAY_BUFFER，并删除部分 VAO。
   * 成功后保留新 VAO 供 draw 使用，但恢复不属于 VAO 的全局 ARRAY_BUFFER 绑定。
   */
  bind(
    geometry: Geometry,
    gpuGeometry: WebGL1GeometryResource,
    program: WebGL1ProgramResource
  ): void {
    if (this.closing) throw new WebGLBackendDisposedError('bind vertex input')
    this.assertNotBusy()
    this.busy = true
    try {
      this.support.assertBindable(geometry)
      if (!this.drainRetired()) throw new WebGLContextLostError('bind vertex input')

      const cached = this.entries.get(geometry)?.get(program.program)

      if (cached?.gpuGeometry === gpuGeometry) {
        this.extension.bindVertexArrayOES(cached.vao)
        this.support.assertReady('bind cached VAO')
        this.currentVAO = cached.vao
        return
      }

      this.support.checkError('prepare VAO')

      const bindings = this.support.resolve(gpuGeometry, program)

      const previousVAO = this.gl.getParameter(
        this.extension.VERTEX_ARRAY_BINDING_OES
      ) as WebGLVertexArrayObjectOES | null

      const previousArray = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null

      this.support.checkError('capture vertex input')

      const candidate = this.extension.createVertexArrayOES()

      this.support.assertReady('create VAO')

      // 保留对历史实现或异常测试替身的 null 防御。
      const vao = requireNonNull(
        candidate,
        () =>
          new WebGLResourceCreationError(
            'vertex-array',
            `Geometry(drawCount=${gpuGeometry.drawCount}) + WebGLProgram(attributes=${[
              ...program.attributes.keys()
            ].join(',')})`
          )
      )

      try {
        this.extension.bindVertexArrayOES(vao)
        this.support.apply(bindings, gpuGeometry.indexBuffer)

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, previousArray)
        this.support.checkError('finish VAO')

        const programs = this.entries.get(geometry) ?? new Map<WebGLProgram, VertexArrayEntry>()

        programs.set(program.program, { vao, gpuGeometry, geometry, program: program.program })
        this.entries.set(geometry, programs)
        this.currentVAO = vao

        // 同一 CPU Geometry 的 GPU 表示若被重新创建，不能复用旧 buffers 的 VAO。
        if (cached !== undefined) this.retired.add(cached)
      } catch (error) {
        if (!this.support.contextLost) {
          this.extension.bindVertexArrayOES(previousVAO)
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, previousArray)
          this.extension.deleteVertexArrayOES(vao)
        }

        throw error
      }
      // 发布之后的旧 VAO 清理独立于候选回滚；失败不能删除已发布的新 VAO。
      if (!this.drainRetired()) throw new WebGLContextLostError('retire replaced VAO')
    } catch (error) {
      if (!this.support.disposed && this.support.contextLost) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('bind vertex input')
      }

      throw error
    } finally {
      this.busy = false
      // VAO 切换改变 EBO；配置过程还会临时改变全局 ARRAY_BUFFER。
      this.hooks.invalidateState()
    }
  }

  /** 回到默认 VAO；成功检查后才提交 currentVAO=null。 */
  unbind(): void {
    if (this.support.disposed) return
    this.assertNotBusy()
    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }
    this.busy = true
    try {
      this.unbindCurrent()
    } finally {
      this.busy = false
      this.hooks.invalidateState()
    }
  }

  /** buffers 删除之前，结束所有借用此 Geometry 的当前及退役 VAO。 */
  releaseGeometry(geometry: Geometry): void {
    this.releaseMatching((entry) => entry.geometry === geometry)
  }

  /** linked program 删除之前，结束所有依赖它的 VAO。 */
  releaseProgram(program: WebGLProgram): void {
    this.releaseMatching((entry) => entry.program === program)
    this.support.forgetProgram(program)
  }

  /**
   * 先转移到退役集合，再逐条删除；成功条目立即移除，失败条目仍可达。
   * [DESIGN-WEIGHT:3][cleanup-retired-records]
   */
  private releaseMatching(matches: (entry: VertexArrayEntry) => boolean): void {
    if (this.support.disposed) return
    this.assertNotBusy()
    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }
    this.busy = true
    try {
      for (const [geometry, programs] of this.entries) {
        for (const [program, entry] of programs) {
          if (!matches(entry)) continue
          this.retired.add(entry)
          programs.delete(program)
        }
        if (programs.size === 0) this.entries.delete(geometry)
      }
      this.drainRetired(matches)
    } finally {
      this.busy = false
      this.hooks.invalidateState()
    }
  }

  /** false 表示旧代已失效，不再发送任何旧 handle 删除命令。 */
  private drainRetired(matches: (entry: VertexArrayEntry) => boolean = () => true): boolean {
    for (const entry of [...this.retired]) {
      if (!matches(entry)) continue
      if (this.support.contextLost) {
        this.invalidateForContextLoss()
        return false
      }
      let phase: 'gpu-dependency' | 'gpu-delete' = 'gpu-dependency'
      try {
        if (this.currentVAO === entry.vao) this.unbindCurrent()
        phase = 'gpu-delete'
        this.extension.deleteVertexArrayOES(entry.vao)
        this.support.checkError('delete VAO')
      } catch (cause) {
        if (this.support.contextLost) {
          this.invalidateForContextLoss()
          return false
        }
        throw new CleanupFailureError('WebGL1OESVertexInputManager', [
          { phase, label: 'vertex-array', cause }
        ])
      }
      this.retired.delete(entry)
    }
    return true
  }

  /** 调用方持有同步 busy 标记；解绑失败时不能先清空 currentVAO。 */
  private unbindCurrent(): void {
    this.extension.bindVertexArrayOES(null)
    this.support.checkError('unbind VAO')
    this.currentVAO = null
  }

  /** context loss 仅丢弃本代责任，不删除旧 VAO。 */
  invalidateForContextLoss(): void {
    this.entries.clear()
    this.retired.clear()
    this.currentVAO = null
    this.support.invalidateForContextLoss()
    this.hooks.invalidateState()
  }

  /** 关闭后拒绝 bind；全部当前/退役 VAO 成功处理后才关闭 Support。 */
  dispose(): void {
    if (this.support.disposed) return
    this.assertNotBusy()
    this.closing = true
    this.releaseMatching(() => true)
    this.support.dispose()
    this.hooks.invalidateState()
  }

  /** 顶点输入屏障中的 no-op 会让 buffer/program 被提前删除，因此必须明确报未完成。 */
  private assertNotBusy(): void {
    if (this.busy) {
      throw new CleanupFailureError('WebGL1OESVertexInputManager', [
        {
          phase: 'gpu-dependency',
          label: 'vertex input',
          cause: new Error('Vertex input operation is already running')
        }
      ])
    }
  }
}
