import { Resource } from '@/rendering/core/Resource'
import { InvalidMaterialError } from '@/rendering/core/errors'
import { assertNonArrayObject, requireBoolean } from '@/rendering/core/validation'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import {
  assertValidParameterName,
  copyParameter,
  type MaterialParameter,
  type ParameterErrorFactory
} from '@/rendering/resources/materialParameters'

/** 保留旧 import 路径；参数类型与规则的唯一实现迁至 materialParameters。 */
export type {
  MaterialParameter,
  Vec2ParameterValue,
  Vec4ParameterValue
} from '@/rendering/resources/materialParameters'

/** 共享规则在 Material 入口仍报告原来的领域错误。 */
const materialError: ParameterErrorFactory = (fieldName, reason, details) =>
  new InvalidMaterialError(fieldName, reason, details)

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
  /**
   * 是否允许颜色量化抖动，默认 true。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][draw-dither-state]
   *
   * 普通颜色可以开启；RGBA 编码的深度是数据，写入时必须关闭。
   * Backend 每次 draw 都应用此值，不能继承上一材质或 clear 留下的状态。
   */
  readonly dither?: boolean
}

/** 默认值已补齐、可供 Backend 完整应用的状态描述。 */
export type RenderState = Readonly<Required<RenderStateInput>>

/** Material 的完整构造输入。 */
export interface MaterialOptions {
  /** 借用一个单语言 ShaderModule，不取得其释放责任。 */
  readonly shaderModule: ShaderModule
  readonly queue?: RenderQueue
  readonly state?: RenderStateInput
  /** 键是实际 uniform 名；同一个参数不能同时由内建映射和 Material 提供。 */
  readonly parameters?: Readonly<Record<string, MaterialParameter>>
  /** 固定的借用列表；块内容可以更新，但本 Material 不接管块的生命周期。 */
  readonly blocks?: readonly ParameterBlock[]
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
  assertNonArrayObject(state, () => new InvalidMaterialError('state', 'must be a non-array object'))

  for (const key of Object.keys(state)) {
    if (!['depthTest', 'depthWrite', 'depthFunction', 'cullMode', 'dither'].includes(key)) {
      throw new InvalidMaterialError('state.' + key, 'unknown render state field')
    }
  }

  return Object.freeze({
    depthTest: requireBoolean(
      defaultIfUndefined(state.depthTest, true),
      () => new InvalidMaterialError('state.depthTest', 'must be a boolean')
    ),
    depthWrite: requireBoolean(
      defaultIfUndefined(state.depthWrite, true),
      () => new InvalidMaterialError('state.depthWrite', 'must be a boolean')
    ),
    depthFunction: requireChoice(
      defaultIfUndefined(state.depthFunction, 'less-equal'),
      DEPTH_FUNCTIONS,
      'state.depthFunction'
    ),
    cullMode: requireChoice(
      defaultIfUndefined(state.cullMode, 'back'),
      CULL_MODES,
      'state.cullMode'
    ),
    dither: requireBoolean(
      defaultIfUndefined(state.dither, true),
      () => new InvalidMaterialError('state.dither', 'must be a boolean')
    )
  })
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
  assertValidParameterName(name, materialError)
  shader.assertUsable()

  if (Object.values(shader.builtInUniforms).includes(name))
    throw new InvalidMaterialError(name, 'is reserved by builtInUniforms')

  return copyParameter(parameter, 'parameters.' + name, materialError)
}

/**
 * ShaderModule、材质参数、绘制状态和执行队列组成的 CPU 逻辑资源。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][material-borrowed-resources]
 *
 * Material 只借用 ShaderModule/Texture/RenderTarget/ParameterBlock。构造、替换参数与 dispose 都不改变它们的
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

  /** 列表复制并冻结，但块对象本身不复制、不冻结。 */
  private blocksValue: readonly ParameterBlock[] = Object.freeze([])

  /** 固定布局允许构造时登记名称；setter 不得在本地新增同名覆盖值。 */
  private readonly blockParameterNames = new Set<string>()

  /**
   * @throws InvalidMaterialError 输入描述或参数无效。
   * @throws ResourceDisposedError shader、纹理或附件所属目标已经释放。
   */
  constructor(options: MaterialOptions) {
    super()

    assertNonArrayObject(
      options,
      () => new InvalidMaterialError('options', 'must be a non-array object')
    )

    const shader = options.shaderModule

    if (!(shader instanceof ShaderModule))
      throw new InvalidMaterialError('shaderModule', 'must reference a ShaderModule resource')

    shader.assertUsable()

    this.shaderModuleValue = shader
    this.queueValue = requireChoice(
      defaultIfUndefined(options.queue, 'opaque'),
      RENDER_QUEUES,
      'queue'
    )
    this.stateValue = createRenderState(options.state)

    if (options.parameters !== undefined) {
      assertNonArrayObject(
        options.parameters,
        () => new InvalidMaterialError('parameters', 'must be a non-array object')
      )

      for (const [name, parameter] of Object.entries(options.parameters)) {
        this.parametersValue.set(name, prepareParameter(shader, name, parameter))
      }
    }

    const blocks = defaultIfUndefined(options.blocks, [])
    if (!Array.isArray(blocks)) {
      throw new InvalidMaterialError('blocks', 'must be an array')
    }
    const seen = new Set<ParameterBlock>()
    const copiedBlocks: ParameterBlock[] = []
    const reserved = new Set(Object.values(shader.builtInUniforms))
    for (const block of blocks) {
      if (!(block instanceof ParameterBlock)) {
        throw new InvalidMaterialError('blocks', 'must contain ParameterBlock resources')
      }
      block.assertUsable()
      if (seen.has(block)) {
        throw new InvalidMaterialError('blocks', 'duplicate block reference', {
          label: block.label
        })
      }
      seen.add(block)
      for (const name of block.names) {
        if (
          reserved.has(name) ||
          this.parametersValue.has(name) ||
          this.blockParameterNames.has(name)
        ) {
          throw new InvalidMaterialError(name, 'uniform must have exactly one source', {
            label: block.label
          })
        }
        this.blockParameterNames.add(name)
      }
      copiedBlocks.push(block)
    }
    this.blocksValue = Object.freeze(copiedBlocks)
  }

  /** 获取仍存活的单语言 shader 引用；并不获取已编译的 GPU Program。 */
  get shaderModule(): ShaderModule {
    this.assertUsable()
    const shader = this.shaderModuleValue!
    shader.assertUsable()
    return shader
  }

  /**
   * 获取固定的借用列表，并检查每个块的生命周期。
   * @remarks
   * [DESIGN-WEIGHT:3][material-single-parameter-source]
   * 构造已拒绝：重复块、块之间同名、块与本地参数同名、块与内建实际名称同名。
   * 列表不变且各块布局不变，所以后续 draw 只需读取当前值，不再决定覆盖优先级。
   */
  get blocks(): readonly ParameterBlock[] {
    this.assertUsable()
    for (const block of this.blocksValue) block.assertUsable()
    return this.blocksValue
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
   * 获取本地参数的独立副本，名称不存在时返回 undefined；不会搜索 blocks。
   *
   * @remarks
   * 返回的 wrapper/数值数组是副本；CPU 纹理 value 仍是原 Resource。
   * 附件 value 是新的冻结地址，其中 target 仍为原 RenderTarget。
   * Material、取出的纹理或附件所属目标已释放时抛 ResourceDisposedError。
   */
  getParameter(name: string): MaterialParameter | undefined {
    this.assertUsable()
    assertValidParameterName(name, materialError)
    const parameter = this.parametersValue.get(name)

    return parameter === undefined
      ? undefined
      : copyParameter(parameter, 'parameters.' + name, materialError)
  }

  /** 按首次插入顺序复制本地条目，不合并 blocks；不泄露 Map、wrapper 或数值数组。 */
  getParameterEntries(): readonly (readonly [string, MaterialParameter])[] {
    this.assertUsable()

    return Array.from(
      this.parametersValue,
      ([name, parameter]) =>
        [name, copyParameter(parameter, 'parameters.' + name, materialError)] as const
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
    if (this.blockParameterNames.has(name)) {
      throw new InvalidMaterialError(name, 'is provided by a ParameterBlock')
    }
    const prepared = prepareParameter(this.shaderModule, name, parameter)
    this.parametersValue.set(name, prepared)
  }

  /** 只清除本 Material 的引用；借用资源的生命周期保持不变。 */
  protected override disposeCPUData(): void {
    this.parametersValue.clear()
    this.blocksValue = Object.freeze([])
    this.blockParameterNames.clear()
    this.shaderModuleValue = null
  }
}
