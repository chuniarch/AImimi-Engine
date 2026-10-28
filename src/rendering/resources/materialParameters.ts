import { assertNever } from '@/errors/helper/helpers'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import {
  assertNonArrayObject,
  requireBoolean,
  requireFiniteNumber
} from '@/rendering/core/validation'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import {
  copyTexture2DSamplingSource,
  type Texture2DSamplingSource,
  type SamplingSourceErrorFactory
} from '@/rendering/resources/Texture2DSamplingSource'

/** 共享验证只决定规则，具体领域错误与诊断字段由调用方提供。 */
export type ParameterErrorFactory = SamplingSourceErrorFactory

/** 与 shader 的 vec2/vec4 对应的固定长度数值。 */
export type Vec2ParameterValue = readonly [number, number]
export type Vec4ParameterValue = readonly [number, number, number, number]

/**
 * 一个具备明确类型标签的材质参数。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][material-parameter-copy-boundary]
 *
 * 数值在 CPU 侧保留 JavaScript number，不在这里提前量化为 Float32。
 * 向量和矩阵在写入、读取时复制；纹理保留同一个逻辑 Resource 引用。
 * 附件则复制并冻结地址包装，但保留其中的 RenderTarget 身份。
 * 参数值不保存 GPU handle，也不因被 Material 使用而自动增加资源引用数。
 * mat3/mat4 用平坦的列主序数组表示，运行时分别要求恰好 9/16 个有限数值。
 * int 要求有符号 32 位整数；bool 只接受 boolean，不把 0/1 隐式转换为布尔值。
 *
 * WebGL1 Backend 已接通当前 revision 的颜色附件解析，并在采样前拒绝当前输出反馈环。
 * resize 或 context 恢复只重建附件存储；内容仍须由生产者重新绘制，Material 不负责重画。
 *
 * TODO(material-render-target-bindings): 后续补充可采样深度与 face/mip/layer 子资源视图，
 * 并与生产者协作设计附件内容有效性跟踪及恢复后的重画调度；当前不自动恢复附件内容。
 */
export type MaterialParameter =
  | { readonly type: 'float'; readonly value: number }
  | { readonly type: 'int'; readonly value: number }
  | { readonly type: 'bool'; readonly value: boolean }
  | { readonly type: 'vec2'; readonly value: Vec2ParameterValue }
  | { readonly type: 'vec3'; readonly value: Vec3Tuple }
  | { readonly type: 'vec4'; readonly value: Vec4ParameterValue }
  | { readonly type: 'mat3'; readonly value: readonly number[] }
  | { readonly type: 'mat4'; readonly value: readonly number[] }
  | { readonly type: 'texture2D'; readonly value: Texture2DSamplingSource }
  | { readonly type: 'cubeTexture'; readonly value: CubeTexture }

/**
 * 为运行时验证保留允许的类型名。
 *
 * @remarks
 * Record 要求所有联合分支都登记。default 中的 assertNever 则检查复制逻辑是否穷尽；
 * 前者拒绝 JavaScript 的非法输入，后者防止维护时漏写新分支。
 */
const PARAMETER_TYPES: Readonly<Record<MaterialParameter['type'], true>> = {
  float: true,
  int: true,
  bool: true,
  vec2: true,
  vec3: true,
  vec4: true,
  mat3: true,
  mat4: true,
  texture2D: true,
  cubeTexture: true
}

/**
 * 验证固定长度的平坦数组，并复制每个元素。
 *
 * @remarks
 * 用按索引访问的循环检查每个槽位，所以稀疏数组中的空洞会作为 undefined 被拒绝。
 * 此 API 明确接收普通数组；gl-matrix/TypedArray 调用方应先用 Array.from() 转换。
 */
function copyNumberArray(
  value: unknown,
  length: number,
  fieldName: string,
  createError: ParameterErrorFactory
): number[] {
  if (!Array.isArray(value) || value.length !== length)
    throw createError(fieldName, 'must be an array of ' + length + ' numbers')

  const input: readonly unknown[] = value
  const copy: number[] = []

  for (let i = 0; i < length; i++) {
    const num = requireFiniteNumber(input[i], () =>
      createError(fieldName + '[' + i + ']', 'must be a finite number')
    )
    copy.push(num)
  }

  return copy
}

/**
 * 验证 材质或参数块借用的 cubemap，并返回原资源。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][material-borrowed-resources]
 *
 * 本函数不导出；参数复制器通过 createError 保留调用方自己的领域诊断。
 * 先检查资源类型，再让 CubeTexture 自己验证生命周期，避免非法值触发 TypeError。
 * 不复制像素、不 retain，也不接管释放责任；参数包装由 copyParameter 创建。
 *
 * @param value - 尚未验证的参数资源引用。
 * @param fieldName - 调用方参数的诊断路径。
 * @returns 原始 CubeTexture 实例。
 * @throws createError 返回的错误：输入不是 CubeTexture。
 * @throws ResourceDisposedError cubemap 已开始或完成释放。
 */
function requireCubeTexture(
  value: unknown,
  fieldName: string,
  createError: ParameterErrorFactory
): CubeTexture {
  if (!(value instanceof CubeTexture))
    throw createError(fieldName, 'must reference a CubeTexture resource')

  value.assertUsable()

  return value
}

/**
 * 复制一个参数；Material 与 ParameterBlock 的构造、写入和读取共用同一套规则。
 *
 * @param createError - 仅在验证失败时创建领域错误；存活检查的错误原样传播。
 *
 * @remarks
 * CPU 纹理的 value 保留原资源；附件的 value 则是新的冻结地址包装。
 * 附件包装中的 target 始终是原 RenderTarget，不复制目标资源。
 * 这里不复制纹理像素、不 retain、不 release，也不访问 GPU。
 */
export function copyParameter(
  parameter: MaterialParameter,
  fieldName: string,
  createError: ParameterErrorFactory
): MaterialParameter {
  assertNonArrayObject(parameter, () => createError(fieldName, 'must be a non-array object'))

  const runtimeType: unknown = parameter.type

  if (typeof runtimeType !== 'string' || !Object.hasOwn(PARAMETER_TYPES, runtimeType))
    throw createError(fieldName + '.type', 'unsupported parameter type', {
      received: runtimeType
    })

  switch (parameter.type) {
    case 'float': {
      return {
        type: 'float',
        value: requireFiniteNumber(parameter.value, () =>
          createError(fieldName, 'must be a finite number')
        )
      }
    }

    case 'int': {
      const value = requireFiniteNumber(parameter.value, () =>
        createError(fieldName, 'must be a finite number')
      )

      if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
        throw createError(fieldName, 'must be a signed 32-bit integer')

      return { type: 'int', value: value }
    }

    case 'bool': {
      return {
        type: 'bool',
        value: requireBoolean(parameter.value, () => createError(fieldName, 'must be a boolean'))
      }
    }

    case 'vec2': {
      const value = copyNumberArray(parameter.value, 2, fieldName, createError)
      return { type: 'vec2', value: [value[0]!, value[1]!] }
    }

    case 'vec3': {
      const value = copyNumberArray(parameter.value, 3, fieldName, createError)
      return { type: 'vec3', value: [value[0]!, value[1]!, value[2]!] }
    }

    case 'vec4': {
      const value = copyNumberArray(parameter.value, 4, fieldName, createError)
      return { type: 'vec4', value: [value[0]!, value[1]!, value[2]!, value[3]!] }
    }

    case 'mat3':
      return { type: 'mat3', value: copyNumberArray(parameter.value, 9, fieldName, createError) }

    case 'mat4':
      return { type: 'mat4', value: copyNumberArray(parameter.value, 16, fieldName, createError) }

    case 'texture2D':
      return {
        type: 'texture2D',
        value: copyTexture2DSamplingSource(parameter.value, fieldName, createError)
      }

    case 'cubeTexture':
      return {
        type: 'cubeTexture',
        value: requireCubeTexture(parameter.value, fieldName, createError)
      }

    default:
      assertNever(parameter, 'Unimplemented MaterialParameter copy branch')
  }
}

/**
 * 验证实际 uniform 名，不 trim、不尝试解析 GLSL。
 * @remarks
 * [DESIGN-WEIGHT:3][material-single-parameter-source]
 * 这里只检查非空名称；是否与内建或其他来源冲突，由 Material 接线时检查。
 */
export function assertValidParameterName(name: string, createError: ParameterErrorFactory): void {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw createError('parameterName', 'must be a non-empty string')
  }
}
