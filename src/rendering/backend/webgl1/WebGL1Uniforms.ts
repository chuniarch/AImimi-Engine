import { mat3, mat4 } from 'gl-matrix'
import { assertNever } from '@/errors/helper/helpers'
import {
  InvalidMaterialError,
  UnsupportedRenderFeatureError,
  WebGLContextLostError,
  WebGLOperationError
} from '@/rendering/core/errors'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import type { MaterialParameter } from '@/rendering/resources/Material'
import type { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import type { Texture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
import type { CubeTexture } from '@/rendering/resources/CubeTexture'
import type { BuiltInUniformSemantic } from '@/rendering/resources/ShaderModule'
import type { WebGL1ProgramResource } from './WebGL1ProgramManager'
import type { WebGL1CubeTextureResource } from './WebGL1CubeTextureManager'

/** 一条已经验证输入、尚未执行的同步上传命令；只能在本次 draw 内使用。 */
export type PreparedUniformUpload = () => void

interface ActiveUniform {
  readonly name: string
  readonly type: number
  readonly location: WebGLUniformLocation
}

/**
 * 将 CPU 数值复制到实际上传使用的 Float32 表示。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][uniform-float32-boundary]
 * CPU 中有限的 1e300 转成 Float32 后仍会溢出，必须在量化后再检查。
 * 此处不修改 Material、RenderItem 或 ViewState 中的数组。
 */
function copyFloat32(values: readonly number[], length: number, field: string): Float32Array {
  const raw: unknown = values
  if (!Array.isArray(raw) || raw.length !== length) {
    throw new InvalidMaterialError(field, 'invalid numeric array length')
  }

  const result = new Float32Array(length)

  for (let index = 0; index < length; index++) {
    const value = values[index]

    if (typeof value !== 'number' || !Number.isFinite(Math.fround(value))) {
      throw new InvalidMaterialError(field, 'must contain finite Float32 values')
    }

    result[index] = value
  }

  return result
}

/**
 * 当前 WebGL1 program 的 uniform 反射、验证和上传。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][uniform-complete-draw-input]
 * prepare 先验证整批输入，返回命令；upload 才写入当前 program。
 * 缺少 active uniform 时拒绝绘制，不能沿用共享 program 上一次 draw 的值。
 *
 * 不拥有 ShaderModule、Material、Texture 或 WebGLProgram。
 * 本实例属于一个 context generation；恢复后必须创建新实例。
 *
 * TODO(material-uniform-reflection): WebGL 使用链接后的反射信息；未来 WebGPU
 * 使用 ShaderModule 的声明元数据或受控的布局推导，不复用本类查询 GL 的实现。
 */
export class WebGL1Uniforms {
  private readonly gl: WebGLRenderingContext
  private readonly maxTextureUnits: number
  private readonly resolveCube: (texture: CubeTexture) => WebGL1CubeTextureResource

  /** 由 Backend 分流 CPU 纹理与附件地址；结果只在本次 draw 内借用。 */
  private readonly resolve2D: (source: Texture2DSamplingSource, uniformName: string) => WebGLTexture

  /** 只缓存元数据；真正的 GPU program 仍由 ProgramManager 拥有。 */
  private readonly layouts = new WeakMap<WebGLProgram, readonly ActiveUniform[]>()

  /**
   * 注入当前 generation 的两种解析器，不让 Uniforms 自己拥有 GPU cache。
   * resolve2D 同时收到 uniformName，供附件反馈错误提供具体参数现场。
   */
  constructor(
    gl: WebGLRenderingContext,
    maxTextureUnits: number,
    resolveCube: (texture: CubeTexture) => WebGL1CubeTextureResource,
    resolve2D: (source: Texture2DSamplingSource, uniformName: string) => WebGLTexture
  ) {
    this.gl = gl
    this.maxTextureUnits = maxTextureUnits
    this.resolveCube = resolveCube
    this.resolve2D = resolve2D
  }

  /**
   * 解析本次 draw 的全部 active uniforms，但不调用 uniform*。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][uniform-prepare-before-upload]
   * 二维纹理、附件和 cubemap 解析可能创建 GPU 存储，因此这不是“所有 GPU 状态
   * 都不变”的事务。保证的是验证失败时不会部分写入本次 program 的 uniforms。
   * Backend 必须在 prepare 返回后重新应用 program/state，再调用 upload。
   */
  prepare(
    program: WebGL1ProgramResource,
    submission: DrawSubmission
  ): readonly PreparedUniformUpload[] {
    this.assertContext()

    const material = submission.item.material
    const shader = material.shaderModule
    const layout = this.reflect(program, shader.name)
    const parameters = new Map(material.getParameterEntries())
    const blocks = material.blocks
    const builtIns = new Map<string, BuiltInUniformSemantic>()

    for (const [semantic, name] of Object.entries(shader.builtInUniforms)) {
      if (builtIns.has(name)) {
        throw new InvalidMaterialError(name, 'multiple built-in semantics share one uniform')
      }

      // ShaderModule 已验证 key；这里恢复 Object.entries 丢失的窄 key 类型。
      builtIns.set(name, semantic as BuiltInUniformSemantic)
    }

    /**
     * [DESIGN-WEIGHT:3][uniform-sampler-unit-allocation]
     * 两种 sampler 共用 fragment 单元预算；先统计，再调用任何纹理 resolver。
     * 每个 active uniform 分配独立单元，即使两个参数借用同一个来源也不合并。
     * 本批不提供 sampler 数组或通用 vertex texture 的能力协商。
     */
    const samplerCount = layout.filter(
      (entry) => entry.type === this.gl.SAMPLER_2D || entry.type === this.gl.SAMPLER_CUBE
    ).length

    if (samplerCount > this.maxTextureUnits) {
      throw new UnsupportedRenderFeatureError(
        'texture units',
        'active sampler uniforms exceed the fragment texture-unit limit'
      )
    }

    // 游标属于一次 prepare，不能跨 draw 延续；uniform1i 接收下标而非 TEXTURE0 枚举。
    let nextTextureUnit = 0

    const uploads = layout.map((entry): PreparedUniformUpload => {
      const semantic = builtIns.get(entry.name)

      const parameter =
        semantic === undefined
          ? (parameters.get(entry.name) ?? this.blockParameter(blocks, entry.name))
          : this.builtInParameter(semantic, submission)

      if (parameter === undefined) {
        throw new InvalidMaterialError(entry.name, 'active uniform has no value for this draw')
      }

      if (this.uniformType(parameter.type) !== entry.type) {
        throw new InvalidMaterialError(entry.name, 'parameter type does not match active uniform')
      }

      if (parameter.type === 'cubeTexture') {
        const unit = nextTextureUnit++
        const resource = this.resolveCube(parameter.value)

        return () => {
          this.gl.activeTexture(this.gl.TEXTURE0 + unit)
          this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, resource.handle)
          this.gl.uniform1i(entry.location, unit)
        }
      }

      if (parameter.type === 'texture2D') {
        const unit = nextTextureUnit++
        const handle = this.resolve2D(parameter.value, entry.name)

        return () => {
          this.gl.activeTexture(this.gl.TEXTURE0 + unit)
          this.gl.bindTexture(this.gl.TEXTURE_2D, handle)
          this.gl.uniform1i(entry.location, unit)
        }
      }

      return this.numericUpload(entry.location, entry.name, parameter)
    })

    this.assertContext()
    return uploads
  }

  /**
   * 写入已经绑定的 program；不能跨 draw、跨 program 或跨 context 恢复复用命令。
   * 本方法不自行 useProgram，也不决定 surface 和 draw 顺序。
   */
  upload(commands: readonly PreparedUniformUpload[]): void {
    this.assertContext()

    for (const command of commands) command()

    this.assertContext()
  }

  /**
   * 每个真实 program 反射一次 type/size，location 借用 ProgramManager 的缓存。
   *
   * @remarks
   * 目前 ProgramManager 只导出 location；这里额外做一次冷路径反射，避免
   * 本批悄悄改变 Task 11 的接口。不是每帧查询，也不创建第二份 program。
   * 数组尚无 CPU 参数契约，因此明确拒绝，不只上传数组第一个元素。
   */
  private reflect(program: WebGL1ProgramResource, label: string): readonly ActiveUniform[] {
    const cached = this.layouts.get(program.program)
    if (cached !== undefined) return cached

    const count: unknown = this.gl.getProgramParameter(program.program, this.gl.ACTIVE_UNIFORMS)

    this.assertContext()

    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new WebGLOperationError('reflect uniforms', label, 'invalid active uniform count')
    }

    const result: ActiveUniform[] = []

    for (let index = 0; index < count; index++) {
      const info = this.gl.getActiveUniform(program.program, index)
      this.assertContext()

      if (info === null) {
        throw new WebGLOperationError('reflect uniforms', label, 'missing active uniform info')
      }

      if (info.size !== 1 || /\[\d+\]/.test(info.name)) {
        throw new UnsupportedRenderFeatureError('uniform arrays', info.name)
      }

      const location = program.uniforms.get(info.name)

      if (location === undefined) {
        throw new WebGLOperationError('reflect uniforms', label, 'missing uniform location')
      }

      result.push({ name: info.name, type: info.type, location })
    }

    this.layouts.set(program.program, result)
    return result
  }

  /**
   * 只读取当前 active uniform 需要的块项。
   * @remarks
   * [DESIGN-WEIGHT:3][uniform-live-parameter-block]
   * 每次 prepare 重新读取；不按 program 缓存块值，不合并或复制全部块项。
   * Material 已保证名称只有一个来源，所以这不是“后者覆盖前者”。
   * 返回值是本次读取的副本，后续 numericUpload 再量化并捕获到本次 draw 命令。
   * 共享引用不保证跨 draw 的帧一致性；生产者必须在消费者绘制前完成更新。
   */
  private blockParameter(
    blocks: readonly ParameterBlock[],
    name: string
  ): MaterialParameter | undefined {
    for (const block of blocks) {
      const parameter = block.get(name)
      if (parameter !== undefined) return parameter
    }
    return undefined
  }

  /** 内建值属于本次 RenderItem/ViewState，不写回共享 Material。 */
  private builtInParameter(
    semantic: BuiltInUniformSemantic,
    submission: DrawSubmission
  ): MaterialParameter {
    const { item, view } = submission

    switch (semantic) {
      case 'modelMatrix':
        return { type: 'mat4', value: item.worldMatrix }

      case 'viewMatrix':
        return { type: 'mat4', value: view.viewMatrix }

      case 'projectionMatrix':
        return { type: 'mat4', value: view.projectionMatrix }

      case 'cameraPosition':
        return { type: 'vec3', value: view.cameraWorldPosition }

      case 'normalMatrix': {
        /**
         * [DESIGN-WEIGHT:3][normal-matrix-view-space]
         * n_view = transpose(inverse(mat3(V * M))) * n_local。
         * P 不参与法线变换；相机旋转也必须参与，所以不能只使用 M。
         * 只在 shader 实际使用 normalMatrix 时计算并拒绝奇异矩阵。
         */
        const model = copyFloat32(item.worldMatrix, 16, 'modelMatrix')
        const camera = copyFloat32(view.viewMatrix, 16, 'viewMatrix')
        const modelView = new Float32Array(16)
        const normal = new Float32Array(9)

        mat4.multiply(modelView, camera, model)
        mat3.fromMat4(normal, modelView)

        if (mat3.invert(normal, normal) === null) {
          throw new InvalidMaterialError('normalMatrix', 'model-view matrix is singular')
        }

        mat3.transpose(normal, normal)

        return { type: 'mat3', value: Array.from(normal) }
      }

      default:
        return assertNever(semantic)
    }
  }

  /** 把 CPU 参数标签转换成反射返回的 GLSL 类型。 */
  private uniformType(type: MaterialParameter['type']): number {
    switch (type) {
      case 'float':
        return this.gl.FLOAT
      case 'int':
        return this.gl.INT
      case 'bool':
        return this.gl.BOOL
      case 'vec2':
        return this.gl.FLOAT_VEC2
      case 'vec3':
        return this.gl.FLOAT_VEC3
      case 'vec4':
        return this.gl.FLOAT_VEC4
      case 'mat3':
        return this.gl.FLOAT_MAT3
      case 'mat4':
        return this.gl.FLOAT_MAT4
      case 'texture2D':
        return this.gl.SAMPLER_2D
      case 'cubeTexture':
        return this.gl.SAMPLER_CUBE
      default:
        return assertNever(type)
    }
  }

  /** 数值先复制/量化，再捕获进命令；transpose 固定 false，输入采用列主序。 */
  private numericUpload(
    location: WebGLUniformLocation,
    name: string,
    parameter: Exclude<MaterialParameter, { type: 'texture2D' | 'cubeTexture' }>
  ): PreparedUniformUpload {
    const gl = this.gl

    switch (parameter.type) {
      case 'float': {
        const value = copyFloat32([parameter.value], 1, name)[0]!
        return () => gl.uniform1f(location, value)
      }

      case 'int':
        return () => gl.uniform1i(location, parameter.value)

      case 'bool':
        return () => gl.uniform1i(location, parameter.value ? 1 : 0)

      case 'vec2': {
        const value = copyFloat32(parameter.value, 2, name)
        return () => gl.uniform2fv(location, value)
      }

      case 'vec3': {
        const value = copyFloat32(parameter.value, 3, name)
        return () => gl.uniform3fv(location, value)
      }

      case 'vec4': {
        const value = copyFloat32(parameter.value, 4, name)
        return () => gl.uniform4fv(location, value)
      }

      case 'mat3': {
        const value = copyFloat32(parameter.value, 9, name)
        return () => gl.uniformMatrix3fv(location, false, value)
      }

      case 'mat4': {
        const value = copyFloat32(parameter.value, 16, name)
        return () => gl.uniformMatrix4fv(location, false, value)
      }

      default:
        return assertNever(parameter)
    }
  }

  /** 物理 lost 可以早于 DOM 事件；不能把其反射异常误报成普通材质错误。 */
  private assertContext(): void {
    if (this.gl.isContextLost()) {
      throw new WebGLContextLostError('prepare/upload uniforms')
    }
  }
}
