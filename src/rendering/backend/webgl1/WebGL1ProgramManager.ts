import {
  ProgramLinkError,
  ResourceDisposedError,
  ShaderCompilationError,
  UnsupportedShaderLanguageError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError,
  type ShaderStage
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import type { ShaderModule } from '@/rendering/resources/ShaderModule'

/**
 * 当前 context 的 program 表示；调用者只借用，不负责删除。
 *
 * @remarks
 * Map 属于 Backend 内部协议；ReadonlyMap 是类型约束，不是运行时深冻结。
 * location 为 0 仍然有效；uniform 保留驱动返回的完整名称，不添加数组别名。
 */
export interface WebGL1ProgramResource {
  readonly program: WebGLProgram
  readonly attributes: ReadonlyMap<string, number>
  readonly uniforms: ReadonlyMap<string, WebGLUniformLocation>
}

interface ProgramEntry {
  readonly resource: WebGL1ProgramResource
  readonly unsubscribe: () => void
}

/** 同步的内部协作点；不是应用层事件系统。 */
export interface WebGL1ProgramManagerHooks {
  /** 删除或解绑 program 后使 State 缓存失效；不得发 GL 命令或抛错。 */
  readonly invalidateState: () => undefined

  /**
   * Task 14 接入 vertexInputs.releaseProgram(program)。
   *
   * 正常返回代表依赖清理完成；抛错则保留此缓存记录，允许再次 release。
   */
  readonly beforeDelete?: (program: WebGLProgram) => undefined
}

/**
 * 将不可变 ShaderModule 懒编译为当前 context 的 program。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 *
 * cache key 是完整 CPU 对象身份，不是 name。Manager 不调用 shader.dispose()。
 * lost 后本实例不可再用于 get；恢复时应创建新 Manager，避免复用旧代 handles。
 */
export class WebGL1ProgramManager {
  private readonly gl: WebGLRenderingContext
  private readonly hooks: WebGL1ProgramManagerHooks

  private readonly entries = new Map<ShaderModule, ProgramEntry>()
  private readonly releasing = new Set<ShaderModule>()

  private disposedValue = false
  private lostValue = false
  private disposing = false

  constructor(gl: WebGLRenderingContext, hooks: WebGL1ProgramManagerHooks) {
    this.gl = gl
    this.hooks = hooks
  }

  /**
   * 首次调用完成 compile → link → reflect → subscribe → cache；重复调用复用记录。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-transaction]
   *
   * 未全部成功前不发布缓存。创建期间的 shader/program 失败时全部回收；
   * 成功链接后 detach/delete 临时 shader，仅保留 program。
   */
  get(shader: ShaderModule): WebGL1ProgramResource {
    this.assertAvailable('get program')

    if (shader.disposed) throw new ResourceDisposedError('ShaderModule')

    if (this.releasing.has(shader)) {
      throw new WebGLOperationError('get program', shader.name, 'release is in progress')
    }

    const cached = this.entries.get(shader)
    if (cached !== undefined) return cached.resource

    if (shader.language !== 'glsl-es-100') {
      throw new UnsupportedShaderLanguageError(shader.name, shader.language, 'webgl1')
    }

    const gl = this.gl

    // 发现既有 GL 错误时停止，不把它伪装成本次编译产生的错误。
    this.checkError('preflight', shader.name)

    const shaders: WebGLShader[] = []
    let program: WebGLProgram | null = null

    try {
      const vertex = this.compile(shader, 'vertex', gl.VERTEX_SHADER, shaders)
      const fragment = this.compile(shader, 'fragment', gl.FRAGMENT_SHADER, shaders)

      const candidate = gl.createProgram()
      this.assertAvailable('create program')

      program = requireNonNull(
        candidate,
        () => new WebGLResourceCreationError('program', shader.name)
      )

      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)

      const linked: unknown = gl.getProgramParameter(program, gl.LINK_STATUS)
      this.assertAvailable('link program')

      if (linked !== true) {
        throw new ProgramLinkError(shader.name, gl.getProgramInfoLog(program) ?? '')
      }

      /**
       * 成功链接后的 program 已保留可执行结果。
       *
       * @remarks
       * 解除两个临时 shader 与 program 的连接，避免仅调用 deleteShader 时，
       * shader 仍因 attachment 关系而继续存活。
       *
       * shader 对象的删除统一留给 finally，避免在成功路径重复删除。
       */
      gl.detachShader(program, vertex)
      gl.detachShader(program, fragment)

      this.checkError('link program', shader.name)

      const attributes = new Map<string, number>()
      const uniforms = new Map<string, WebGLUniformLocation>()

      const attributeCount = this.readCount(program, gl.ACTIVE_ATTRIBUTES, shader.name)
      const uniformCount = this.readCount(program, gl.ACTIVE_UNIFORMS, shader.name)

      for (let index = 0; index < attributeCount; index++) {
        const info = gl.getActiveAttrib(program, index)
        this.assertAvailable('reflect attribute')

        if (info === null)
          throw new WebGLOperationError('reflect attribute', shader.name, `missing entry ${index}`)

        const location = gl.getAttribLocation(program, info.name)

        if (location < 0) throw new WebGLOperationError('reflect attribute', shader.name, info.name)

        attributes.set(info.name, location)
      }

      for (let index = 0; index < uniformCount; index += 1) {
        const info = gl.getActiveUniform(program, index)
        this.assertAvailable('reflect uniform')

        if (info === null)
          throw new WebGLOperationError('reflect uniform', shader.name, `missing entry ${index}`)

        const location = gl.getUniformLocation(program, info.name)

        // null 不是 create* 失败；它表示此名称没有可上传的 location。
        if (location !== null) uniforms.set(info.name, location)
      }

      const resource: WebGL1ProgramResource = Object.freeze({
        program,
        attributes,
        uniforms
      })

      const unsubscribe = shader.onDispose(() => this.release(shader))
      this.entries.set(shader, { resource, unsubscribe })

      return resource
    } catch (error) {
      if (gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('create program')
      }

      if (program !== null) gl.deleteProgram(program)

      throw error
    } finally {
      if (!gl.isContextLost() && !this.lostValue) {
        for (const compiled of shaders) gl.deleteShader(compiled)
      }
    }
  }

  /**
   * 先清理关联 VAO，再删除 program；重复 release 不重复删除。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   *
   * releasing 防止 beforeDelete 同步重入造成重复删除。
   * beforeDelete 抛错时保留 entry，不冒险越过依赖清理屏障。
   */
  release(shader: ShaderModule): void {
    const entry = this.entries.get(shader)

    if (entry === undefined || this.releasing.has(shader)) return

    if (this.gl.isContextLost() || this.lostValue) {
      this.invalidateForContextLoss()
      return
    }

    this.releasing.add(shader)

    try {
      this.hooks.beforeDelete?.(entry.resource.program)

      if (this.gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss()
        return
      }

      entry.unsubscribe()
      this.entries.delete(shader)

      if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === entry.resource.program) {
        this.gl.useProgram(null)
      }

      this.gl.deleteProgram(entry.resource.program)
      this.hooks.invalidateState()
    } finally {
      this.releasing.delete(shader)
    }
  }

  /** lost 时只取消订阅、丢弃记录；不能向失效 context 发 delete 命令。 */
  invalidateForContextLoss(): void {
    this.lostValue = true

    for (const entry of this.entries.values()) entry.unsubscribe()

    this.entries.clear()
    this.hooks.invalidateState()
  }

  /**
   * 先取消全部 CPU 订阅，再逐项释放；不释放 CPU ShaderModule。
   *
   * @remarks
   * 若 beforeDelete 抛错，get 仍被禁止；再次 dispose 可重试剩余条目。
   * 本方法不改变 Resource 基类尚未定义的 listener 异常传播语义。
   */
  dispose(): void {
    if (this.disposing) return

    this.disposedValue = true
    this.disposing = true

    try {
      for (const entry of this.entries.values()) entry.unsubscribe()

      for (const shader of [...this.entries.keys()]) this.release(shader)
    } finally {
      this.disposing = false
    }
  }

  /** GL 查询返回 any；先收进 unknown，再验证反射计数。 */
  private readCount(program: WebGLProgram, parameter: number, label: string): number {
    const count: unknown = this.gl.getProgramParameter(program, parameter)

    this.assertAvailable('reflect count')

    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new WebGLOperationError('reflect count', label, String(count))
    }

    return count
  }

  /** owned 在编译前登记 handle，保证编译失败也能回收。 */
  private compile(
    source: ShaderModule,
    stage: ShaderStage,
    type: number,
    owned: WebGLShader[]
  ): WebGLShader {
    const gl = this.gl
    const candidate = gl.createShader(type)

    this.assertAvailable('create shader')

    const compiled = requireNonNull(
      candidate,
      () => new WebGLResourceCreationError('shader', `${source.name}:${stage}`)
    )

    owned.push(compiled)

    gl.shaderSource(compiled, stage === 'vertex' ? source.vertexSource : source.fragmentSource)
    gl.compileShader(compiled)

    const success: unknown = gl.getShaderParameter(compiled, gl.COMPILE_STATUS)

    this.assertAvailable('compile shader')

    if (success !== true) {
      throw new ShaderCompilationError(source.name, stage, gl.getShaderInfoLog(compiled) ?? '')
    }

    this.checkError('compile shader', source.name)

    return compiled
  }

  /** 错误检查仅出现在创建冷路径；cache hit 不执行 getError。 */
  private checkError(operation: string, label: string): void {
    this.assertAvailable(operation)

    const code = this.gl.getError()

    this.assertAvailable(operation)

    if (code !== this.gl.NO_ERROR) {
      throw new WebGLOperationError(operation, label, `GL error ${code}`)
    }
  }

  /** 物理 lost 可以早于 DOM 事件，因此不能只依赖 onLost 回调。 */
  private assertAvailable(operation: string): void {
    if (this.disposedValue) throw new WebGLBackendDisposedError(operation)

    if (this.lostValue || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError(operation)
    }
  }
}
