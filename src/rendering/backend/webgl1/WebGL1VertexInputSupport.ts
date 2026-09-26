import {
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import type { Geometry } from '@/rendering/resources/Geometry'
import type { WebGL1AttributeResource, WebGL1GeometryResource } from './WebGL1GeometryManager'
import type { WebGL1ProgramResource } from './WebGL1ProgramManager'

/** 一条已验证的紧密排列属性绑定；只借用 attribute 中的 buffer。 */
export interface VertexBinding {
  readonly location: number
  readonly attribute: WebGL1AttributeResource
}

/** 一个已验证的 shader 输入，不保存任何 Geometry 的 buffer。 */
interface ProgramInput {
  readonly name: string
  readonly location: number
}

/**
 * 两条顶点输入策略共用的验证和 GL 配置工具，不是新的资源 Manager。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][vertex-input-active-layout]
 *
 * ProgramManager 只缓存 location，尚无 shader attribute 的 type/size。
 * 这里每个 program 首次使用时补查并缓存，避免把 mat4 错当成一个 vec4 location。
 * 不重新编译、链接，也不修改 ProgramManager 的公开接口。
 */
export class WebGL1VertexInputSupport {
  private readonly gl: WebGLRenderingContext

  readonly maxAttributes: number

  private readonly inputs = new Map<WebGLProgram, readonly ProgramInput[]>()
  private lostValue = false
  private disposedValue = false

  constructor(gl: WebGLRenderingContext, maxAttributes: number) {
    this.gl = gl
    this.maxAttributes = maxAttributes

    if (!Number.isSafeInteger(maxAttributes) || maxAttributes <= 0) {
      throw new UnsupportedRenderFeatureError('vertex input', 'invalid MAX_VERTEX_ATTRIBS')
    }
  }

  /** 此 Support 所属策略是否已经结束生命周期。 */
  get disposed(): boolean {
    return this.disposedValue
  }

  /** 同时考虑已记录的失效状态与浏览器当前状态。 */
  get contextLost(): boolean {
    return this.lostValue || this.gl.isContextLost()
  }

  /** bind 开始前验证策略生命周期和 CPU Geometry 生命周期。 */
  assertBindable(geometry: Geometry): void {
    this.assertReady('bind vertex input')

    if (geometry.disposed) {
      throw new ResourceDisposedError('Geometry')
    }
  }

  /**
   * 先验证全部 active 属性，再允许策略修改绑定。
   *
   * @remarks
   * 名称完全匹配，不猜测 position 与 aVertexPosition 的别名。
   * Geometry 多余的属性不参与本次配置；shader 需要但 Geometry 缺失的属性明确报错。
   * 当前支持 float/vec2/vec3/vec4，itemSize 为 1..4，stride/offset 均为 0。
   * 不要求 shader 向量宽度与 itemSize 相等；缺失分量遵循 WebGL 的补齐规则。
   */
  resolve(
    geometry: WebGL1GeometryResource,
    program: WebGL1ProgramResource
  ): readonly VertexBinding[] {
    const inputs = this.readInputs(program)

    return inputs.map(({ name, location }) => {
      const attribute = geometry.attributes.get(name)

      if (attribute === undefined) {
        throw new UnsupportedRenderFeatureError('vertex input', `missing active attribute ${name}`)
      }

      if (
        !Number.isInteger(attribute.itemSize) ||
        attribute.itemSize < 1 ||
        attribute.itemSize > 4
      ) {
        throw new UnsupportedRenderFeatureError('vertex input', `${name}: itemSize must be 1..4`)
      }

      return { location, attribute }
    })
  }

  /**
   * 执行已经验证的属性绑定。
   *
   * @remarks
   * 每条 pointer 捕获此刻绑定的 ARRAY_BUFFER。
   * 后续只改变 ARRAY_BUFFER 当前绑定，不会改写已经配置的 pointer 关联。
   */
  apply(bindings: readonly VertexBinding[], indexBuffer: WebGLBuffer | null): void {
    const gl = this.gl

    for (const { location, attribute } of bindings) {
      gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer)

      gl.vertexAttribPointer(
        location,
        attribute.itemSize,
        attribute.type,
        attribute.normalized,
        0,
        0
      )

      gl.enableVertexAttribArray(location)
    }

    // 非索引 Geometry 也要显式传 null，不能残留上一物体的 EBO。
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    this.checkError('configure vertex input')
  }

  /** 删除 program 的输入元数据，不负责删除 GPU program。 */
  forgetProgram(program: WebGLProgram): void {
    this.inputs.delete(program)
  }

  /** 旧代记录失效后不可重新启用此实例。 */
  invalidateForContextLoss(): void {
    this.lostValue = true
    this.inputs.clear()
  }

  /** 只结束内部记录的生命周期，不删除借用的 GPU 对象。 */
  dispose(): void {
    this.disposedValue = true
    this.inputs.clear()
  }

  /** 已关闭或 context 丢失时，拒绝正常顶点输入工作。 */
  assertReady(operation: string): void {
    if (this.disposedValue) {
      throw new WebGLBackendDisposedError(operation)
    }

    if (this.contextLost) {
      throw new WebGLContextLostError(operation)
    }
  }

  /** 保留 GL error 与 context lost 的错误边界，不静默清除错误后继续配置。 */
  checkError(operation: string): void {
    this.assertReady(operation)

    const code = this.gl.getError()

    this.assertReady(operation)

    if (code !== this.gl.NO_ERROR) {
      throw new WebGLOperationError(operation, 'vertex input', `GL error ${code}`)
    }
  }

  /**
   * 每个不可重链接的 program 只查询一次 shader 输入类型。
   *
   * @remarks
   * 这里使用真实 WebGLProgram 身份，不使用名称或包装对象身份。
   * 外部不得重新链接 Manager 已发布的 program。
   */
  private readInputs(program: WebGL1ProgramResource): readonly ProgramInput[] {
    const cached = this.inputs.get(program.program)

    if (cached !== undefined) return cached

    const gl = this.gl
    const count: unknown = gl.getProgramParameter(program.program, gl.ACTIVE_ATTRIBUTES)

    this.assertReady('reflect vertex layout')

    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new WebGLOperationError('reflect vertex layout', 'program', 'invalid attribute count')
    }

    const inputs: ProgramInput[] = []
    const locations = new Set<number>()
    const supportedTypes: readonly number[] = [
      gl.FLOAT,
      gl.FLOAT_VEC2,
      gl.FLOAT_VEC3,
      gl.FLOAT_VEC4
    ]

    for (let index = 0; index < count; index += 1) {
      const info = gl.getActiveAttrib(program.program, index)

      this.assertReady('reflect vertex layout')

      if (info === null) {
        throw new WebGLOperationError('reflect vertex layout', 'program', `missing entry ${index}`)
      }

      // TODO(vertex-input-matrix-layout): 增加矩阵属性时按列拆 location/stride/offset，
      // 并同步验证连续 location 上限；不能只放开下面的 type 条件。
      if (info.size !== 1 || !supportedTypes.includes(info.type)) {
        throw new UnsupportedRenderFeatureError(
          'vertex input',
          `${info.name}: matrix/array layout is unsupported`
        )
      }

      const location = program.attributes.get(info.name)

      if (
        location === undefined ||
        !Number.isSafeInteger(location) ||
        location < 0 ||
        location >= this.maxAttributes ||
        locations.has(location)
      ) {
        throw new UnsupportedRenderFeatureError(
          'vertex input',
          `${info.name}: invalid attribute location`
        )
      }

      locations.add(location)
      inputs.push({ name: info.name, location })
    }

    if (inputs.length !== program.attributes.size) {
      throw new WebGLOperationError('reflect vertex layout', 'program', 'reflection maps disagree')
    }

    this.checkError('reflect vertex layout')
    this.inputs.set(program.program, inputs)

    return inputs
  }
}
