import { assertNever } from '@/errors/helper/helpers'
import { Resource } from '@/rendering/core/Resource'
import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { Texture2D } from '@/rendering/resources/Texture2D'

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
 * mat3/mat4 用平坦的列主序数组表示，运行时分别要求恰好 9/16 个有限数值。
 * int 要求有符号 32 位整数；bool 只接受 boolean，不把 0/1 隐式转换为布尔值。
 *
 * TODO(material-render-target-bindings): 在 RenderTarget 提供稳定的逻辑附件引用后，
 * 扩展纹理参数以接收该引用，并同时验证 resize/dispose、反馈采样和 context 恢复；
 * 不把 GPU 派生附件伪装成 DataTexture2D，也不允许 WebGLTexture 或 null 占位。
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
  | { readonly type: 'texture2D'; readonly value: Texture2D }
  | { readonly type: 'cubeTexture'; readonly value: CubeTexture }

const DEPTH_FUNCTIONS = ['less', 'less-equal', 'always'] as const
const CULL_MODES = ['none', 'back', 'front'] as const
const RENDER_QUEUES = ['background', 'opaque'] as const

/** 深度比较规则；Backend 负责转换为具体 API 常量。 */
export type DepthFunction = (typeof DEPTH_FUNCTIONS)[number]
/** 要剔除哪一侧的三角形；back 表示剔除背面，留下正面。 */
export type CullMode = (typeof CULL_MODES)[number]
/** RenderList/Pass 使用的执行分类，本身不是 GPU 状态。 */
export type RenderQueue = (typeof RENDER_QUEUES)[number]

/** 调用者可以省略任一字段，由构造阶段填充默认值。 */
export interface RenderStateInput {
  /** 是否执行深度测试。 */
  readonly depthTest?: boolean
  /** 通过测试的片元是否允许写入深度缓冲。 */
  readonly depthWrite?: boolean
  readonly depthFunction?: DepthFunction
  readonly cullMode?: CullMode
}

/** 默认值已补齐、可供 Backend 完整应用的状态描述。 */
export type RenderState = Readonly<Required<RenderStateInput>>
// export type RenderState = Required<RenderStateInput>

/** Material 的完整构造输入。 */
export interface MaterialOptions {
  /** 借用一个单语言 ShaderModule，不取得其释放责任。 */
  readonly shaderModule: ShaderModule
  readonly queue?: RenderQueue
  readonly state?: RenderStateInput
  /** 键是实际 uniform 名；同一个参数不能同时由内建映射和 Material 提供。 */
  readonly parameters?: Readonly<Record<string, MaterialParameter>>
}

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

/** 拒绝把 null、数组或普通标量当作对象描述。 */
function requireObject(value: unknown, fieldName: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidMaterialError(fieldName, 'must be a non-array object')
}

/** 枚举值从实际匹配项返回，不靠类型断言把未知字符串变成合法值。 */
function requireChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
  fieldName: string
): T {
  const match = choices.find((choice) => choice === value)

  if (match === undefined) {
    throw new InvalidMaterialError(fieldName, 'unsupported value', { received: value })
  }

  return match
}

/**
 * 只为 undefined 提供默认值，不把非法的 null 当成“没有填写”。
 *
 * @remarks
 * TypeScript 调用方通常不会传入 null，但 JavaScript 或外部数据仍可能绕过类型声明。
 * 用独立的分支保留该运行时语义，后续验证函数才能拒绝 null。
 */
function defaultIfUndefined<T>(value: T | undefined, fallback: T): T {
  if (value === undefined) return fallback
  return value
}

/** boolean 配置不接受 truthy/falsy 自动转换。 */
function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new InvalidMaterialError(fieldName, 'must be a boolean')
  }

  return value
}

/** 拒绝 NaN、正负 Infinity 以及字符串形式的数字。 */
function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new InvalidMaterialError(fieldName, 'must be a finite number')

  return value
}

/**
 * 验证固定长度的平坦数组，并复制每个元素。
 *
 * @remarks
 * 用按索引访问的循环检查每个槽位，所以稀疏数组中的空洞会作为 undefined 被拒绝。
 * 此 API 明确接收普通数组；gl-matrix/TypedArray 调用方应先用 Array.from() 转换。
 */
function copyNumberArray(value: unknown, length: number, fieldName: string): number[] {
  if (!Array.isArray(value) || value.length !== length)
    throw new InvalidMaterialError(fieldName, 'must be an array of ' + length + ' numbers')

  const input: readonly unknown[] = value
  const copy: number[] = []

  for (let index = 0; index < length; index++) {
    copy.push(requireFiniteNumber(input[index], fieldName + '[' + index + ']'))
  }

  return copy
}

/** 纹理或 shader 被其他所有者提前释放时，在实际借用处明确拒绝使用。 */
function requireAlive(resource: Resource, resourceType: string): void {
  if (resource.disposed) {
    throw new ResourceDisposedError(resourceType)
  }
}

/**
 * 复制一个参数；构造、setParameter 和读取副本共用这套类型规则。
 *
 * @remarks
 * texture2D/cubeTexture 复制的只有包装对象，value 始终是原逻辑资源。
 * 这里不复制纹理像素、不 retain、不 release，也不访问 GPU。
 */
function copyParameter(parameter: MaterialParameter, fieldName: string): MaterialParameter {
  requireObject(parameter, fieldName)

  const runtimeType: unknown = parameter.type

  if (typeof runtimeType !== 'string' || !Object.hasOwn(PARAMETER_TYPES, runtimeType))
    throw new InvalidMaterialError(fieldName + '.type', 'unsupported parameter type', {
      received: runtimeType
    })

  switch (parameter.type) {
    case 'float': {
      return { type: 'float', value: requireFiniteNumber(parameter.value, fieldName) }
    }

    case 'int': {
      const value = requireFiniteNumber(parameter.value, fieldName)

      if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
        throw new InvalidMaterialError(fieldName, 'must be a signed 32-bit integer')

      return { type: 'int', value: value }
    }

    case 'bool': {
      return { type: 'bool', value: requireBoolean(parameter.value, fieldName) }
    }

    case 'vec2': {
      const value = copyNumberArray(parameter.value, 2, fieldName)
      return { type: 'vec2', value: [value[0]!, value[1]!] }
    }

    case 'vec3': {
      const value = copyNumberArray(parameter.value, 3, fieldName)
      return { type: 'vec3', value: [value[0]!, value[1]!, value[2]!] }
    }

    case 'vec4': {
      const value = copyNumberArray(parameter.value, 4, fieldName)
      return { type: 'vec4', value: [value[0]!, value[1]!, value[2]!, value[3]!] }
    }

    case 'mat3':
      return { type: 'mat3', value: copyNumberArray(parameter.value, 9, fieldName) }

    case 'mat4':
      return { type: 'mat4', value: copyNumberArray(parameter.value, 16, fieldName) }

    case 'texture2D': {
      if (!(parameter.value instanceof Texture2D)) {
        throw new InvalidMaterialError(fieldName, 'must reference a Texture2D resource')
      }
      requireAlive(parameter.value, 'Texture2D')
      return { type: 'texture2D', value: parameter.value }
    }

    case 'cubeTexture': {
      if (!(parameter.value instanceof CubeTexture)) {
        throw new InvalidMaterialError(fieldName, 'must reference a CubeTexture resource')
      }
      requireAlive(parameter.value, 'CubeTexture')
      return { type: 'cubeTexture', value: parameter.value }
    }

    default:
      assertNever(parameter, 'Unimplemented MaterialParameter copy branch')
  }
}

/**
 * 填充并冻结完整 RenderState。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][material-render-state-snapshot]
 *
 * 只把 undefined 解释为省略；false 必须保留，null 必须报错。
 * 字段均为原始值，所以复制并冻结一层即可安全地共享这个快照。
 */
function createRenderState(input: RenderStateInput | undefined): RenderState {
  const state = defaultIfUndefined(input, {})
  requireObject(state, 'state')

  for (const key of Object.keys(state)) {
    if (!['depthTest', 'depthWrite', 'depthFunction', 'cullMode'].includes(key)) {
      throw new InvalidMaterialError('state.' + key, 'unknown render state field')
    }
  }

  return Object.freeze({
    depthTest: requireBoolean(defaultIfUndefined(state.depthTest, true), 'state.depthTest'),
    depthWrite: requireBoolean(defaultIfUndefined(state.depthWrite, true), 'state.depthWrite'),
    depthFunction: requireChoice(
      defaultIfUndefined(state.depthFunction, 'less-equal'),
      DEPTH_FUNCTIONS,
      'state.depthFunction'
    ),
    cullMode: requireChoice(
      defaultIfUndefined(state.cullMode, 'back'),
      CULL_MODES,
      'state.cullMode'
    )
  })
}

/** 名称按原样保存，不 trim 后改名，也不在 CPU 层解析 GLSL 的 uniform 声明。 */
function requireParameterName(name: string): void {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new InvalidMaterialError('parameterName', 'must be a non-empty string')
  }
}

/**
 * 准备完整的新值，成功后调用者才能修改 Map。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][material-atomic-parameter-write]
 *
 * 内建矩阵/相机由当前 draw 的数据提供，不能被同名 Material 参数覆盖。
 * 拒绝的是映射后的实际 uniform 名，例如 uModel，而不只是 modelMatrix 语义名。
 */
function prepareParameter(
  shader: ShaderModule,
  name: string,
  parameter: MaterialParameter
): MaterialParameter {
  requireParameterName(name)
  requireAlive(shader, 'ShaderModule')

  if (Object.values(shader.builtInUniforms).includes(name))
    throw new InvalidMaterialError('parameters.' + name, 'is reserved by builtInUniforms')

  return copyParameter(parameter, 'parameters.' + name)
}

/**
 * ShaderModule、材质参数、绘制状态和执行队列组成的 CPU 逻辑资源。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][material-borrowed-resources]
 *
 * Material 只借用 ShaderModule/Texture。构造、替换参数与 dispose 都不改变它们的
 * sceneReferenceCount，也不级联 dispose。Scene 必须分别 retain 每个实际需要的资源。
 * 同一 ShaderModule/Texture 可以被多个 Material、Scene 和 Backend 使用。
 *
 * getParameter/getParameterEntries 输出的是调用时的副本。它们不是整帧快照协议；
 * 后续帧提取若要求参数在一帧内固定，需要在那里显式捕获。
 *
 * TODO(material-uniform-reflection): Backend 链接后检查 active uniform 类型和绑定完整性；
 * 缺失的 active uniform 必须有明确策略，不能沿用上一个 Material 留在 Program 中的值。
 */
export class Material extends Resource {
  protected override readonly resourceType = 'Material'

  /** 释放 Material 时断开此借用引用。 */
  private shaderModuleValue: ShaderModule | null
  private readonly queueValue: RenderQueue
  private readonly stateValue: RenderState

  /** Map 属于当前 Material；其中的资源对象仍然只是借用。 */
  private readonly parametersValue = new Map<string, MaterialParameter>()

  /**
   * @throws InvalidMaterialError 输入描述或参数无效。
   * @throws ResourceDisposedError shader 或纹理已经释放。
   */
  constructor(options: MaterialOptions) {
    super()

    requireObject(options, 'options')

    const shader = options.shaderModule

    if (!(shader instanceof ShaderModule))
      throw new InvalidMaterialError('shaderModule', 'must reference a ShaderModule resource')

    requireAlive(shader, 'ShaderModule')

    this.shaderModuleValue = shader
    this.queueValue = requireChoice(
      defaultIfUndefined(options.queue, 'opaque'),
      RENDER_QUEUES,
      'queue'
    )
    this.stateValue = createRenderState(options.state)

    if (options.parameters !== undefined) {
      requireObject(options.parameters, 'parameters')

      for (const [name, parameter] of Object.entries(options.parameters)) {
        this.parametersValue.set(name, prepareParameter(shader, name, parameter))
      }
    }
  }

  /** 获取仍存活的单语言 shader 引用；并不获取已编译的 GPU Program。 */
  get shaderModule(): ShaderModule {
    this.assertUsable()
    const shader = this.shaderModuleValue!
    requireAlive(shader, 'ShaderModule')
    return shader
  }

  /** 获取 RenderList 使用的执行分类。 */
  get queue(): RenderQueue {
    this.assertUsable()
    return this.queueValue
  }

  /** 返回构造时冻结的完整状态快照；无需每次再复制。 */
  get state(): RenderState {
    this.assertUsable()
    return this.stateValue
  }

  /**
   * 获取独立参数副本，名称不存在时返回 undefined。
   *
   * @remarks
   * 返回的 wrapper/数值数组是副本；纹理 value 仍是原 Resource。
   * Material 或取出的纹理已释放时抛 ResourceDisposedError。
   */
  getParameter(name: string): MaterialParameter | undefined {
    this.assertUsable()
    requireParameterName(name)
    const parameter = this.parametersValue.get(name)

    return parameter === undefined ? undefined : copyParameter(parameter, 'parameters.' + name)
  }

  /** 按首次插入顺序复制所有条目；不泄露 Map、wrapper 或数值数组。 */
  getParameterEntries(): readonly (readonly [string, MaterialParameter])[] {
    this.assertUsable()

    return Array.from(
      this.parametersValue,
      ([name, parameter]) => [name, copyParameter(parameter, 'parameters.' + name)] as const
    )
  }

  /**
   * 新增或替换参数。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][material-atomic-parameter-write]
   *
   * 先验证并复制，再 Map.set()。验证失败时旧值和插入顺序都保持不变。
   * 替换纹理参数不负责释放旧纹理，也不负责登记新纹理的 Scene 引用。
   */
  setParameter(name: string, parameter: MaterialParameter): void {
    this.assertUsable()
    const prepared = prepareParameter(this.shaderModule, name, parameter)
    this.parametersValue.set(name, prepared)
  }

  /** 只清除本 Material 的引用；借用资源的生命周期保持不变。 */
  protected override disposeCPUData(): void {
    this.parametersValue.clear()
    this.shaderModuleValue = null
  }
}
