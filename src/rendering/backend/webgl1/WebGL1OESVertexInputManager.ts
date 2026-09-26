import { WebGLContextLostError, WebGLResourceCreationError } from '@/rendering/core/errors'
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
    try {
      this.support.assertBindable(geometry)

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

        programs.set(program.program, { vao, gpuGeometry })
        this.entries.set(geometry, programs)
        this.currentVAO = vao

        // 同一 CPU Geometry 的 GPU 表示若被重新创建，不能复用旧 buffers 的 VAO。
        if (cached !== undefined) {
          this.extension.deleteVertexArrayOES(cached.vao)
        }
      } catch (error) {
        if (!this.support.contextLost) {
          this.extension.bindVertexArrayOES(previousVAO)
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, previousArray)
          this.extension.deleteVertexArrayOES(vao)
        }

        throw error
      }
    } catch (error) {
      if (!this.support.disposed && this.support.contextLost) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('bind vertex input')
      }

      throw error
    } finally {
      // VAO 切换改变 EBO；配置过程还会临时改变全局 ARRAY_BUFFER。
      this.hooks.invalidateState()
    }
  }

  /** 回到默认 VAO，不删除缓存；默认 VAO 自己原有的状态仍然存在。 */
  unbind(): void {
    if (this.support.disposed) return

    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }

    this.extension.bindVertexArrayOES(null)
    this.currentVAO = null
    this.hooks.invalidateState()
  }

  /**
   * 删除关联此 Geometry 的全部 VAO。
   *
   * @remarks
   * Geometry 可以已经 disposed；这里只按对象身份查关联，不再读其 CPU getter。
   * 不删除 GeometryManager 拥有的 buffers。
   */
  releaseGeometry(geometry: Geometry): void {
    if (this.support.disposed) return

    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }

    const programs = this.entries.get(geometry)

    if (programs === undefined) return

    for (const entry of programs.values()) {
      this.deleteEntry(entry)
    }

    this.entries.delete(geometry)
  }

  /** 删除该实际 program 的所有关联 VAO，不影响其他 program，也不删除 program。 */
  releaseProgram(program: WebGLProgram): void {
    if (this.support.disposed) return

    if (this.support.contextLost) {
      this.invalidateForContextLoss()
      return
    }

    for (const [geometry, programs] of this.entries) {
      const entry = programs.get(program)

      if (entry === undefined) continue

      this.deleteEntry(entry)
      programs.delete(program)

      if (programs.size === 0) {
        this.entries.delete(geometry)
      }
    }

    this.support.forgetProgram(program)
  }

  /** lost 只丢记录；恢复时工厂应创建新策略实例并使用重新取得的扩展对象。 */
  invalidateForContextLoss(): void {
    this.entries.clear()
    this.currentVAO = null
    this.support.invalidateForContextLoss()
    this.hooks.invalidateState()
  }

  /** 只删除自己创建的 VAO，绝不删除 program 或 buffers。 */
  dispose(): void {
    if (this.support.disposed) return

    if (this.support.contextLost) {
      this.invalidateForContextLoss()
    } else {
      this.unbind()

      for (const programs of this.entries.values()) {
        for (const entry of programs.values()) {
          this.extension.deleteVertexArrayOES(entry.vao)
        }
      }

      this.entries.clear()
    }

    this.support.dispose()
    this.hooks.invalidateState()
  }

  /** 删除当前 VAO 前先解绑；删除非当前 VAO 不打断另一个当前布局。 */
  private deleteEntry(entry: VertexArrayEntry): void {
    if (this.currentVAO === entry.vao) {
      this.unbind()
    }

    this.extension.deleteVertexArrayOES(entry.vao)
  }
}
