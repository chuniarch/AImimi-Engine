import { Resource } from '@/rendering/core/Resource'
import { InvalidRenderTargetError } from '@/rendering/core/errors'

/**
 * 当前逻辑描述接受的颜色附件格式；不是具体设备的能力列表。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][render-target-owner-boundary]
 *
 * 类型和运行时验证共同使用此列表，避免两处定义发生漂移。
 * 增加条目只扩展 CPU 描述；对应 GPU 支持仍须由 Backend 实现和验证。
 */
const COLOR_ATTACHMENT_FORMATS = Object.freeze(['rgba8'] as const)

/** 当前逻辑描述接受的深度附件格式；GPU 存储方式由 Backend 决定。 */
const DEPTH_ATTACHMENT_FORMATS = Object.freeze(['depth16'] as const)

/** 从实际允许列表推导颜色格式联合类型。 */
export type ColorAttachmentFormat = (typeof COLOR_ATTACHMENT_FORMATS)[number]

/** 从实际允许列表推导深度格式联合类型。 */
export type DepthAttachmentFormat = (typeof DEPTH_ATTACHMENT_FORMATS)[number]

/**
 * 一个离屏目标的完整逻辑描述。
 *
 * @remarks
 * width/height 使用像素单位，不是 CSS 尺寸；至少包含一个颜色附件。
 * rgba8 只规定存储格式，不自动执行 sRGB/线性颜色转换。
 * 多颜色附件可以被描述，是否有足够的 MRT 能力由具体 Backend 判断。
 *
 * TODO(render-target-subresources): 在环境烘焙或 FFT 接入前，一并设计浮点格式、
 * cubemap face/mip 写入视图、采样描述和手工 mip 所有权，并补齐能力及恢复测试。
 * 当前不把尚未支持的 face、mip、HDR 字段作为无效占位参数。
 */
export interface RenderTargetDescriptor {
  readonly width: number
  readonly height: number
  readonly colors: readonly { readonly format: ColorAttachmentFormat }[]
  readonly depth?: { readonly format: DepthAttachmentFormat }
}

/**
 * RenderTarget 的诊断元数据，不属于 GPU 存储描述。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
 *
 * label 必须显式提供且不能全为空白，例如 shadow/main 或 gbuffer/main。
 * 允许多个目标重名；Manager 仍使用 RenderTarget 对象身份作为缓存键。
 * 将它与 descriptor 分开，避免诊断名称参与附件布局、resize 或 revision 的语义。
 */
export interface RenderTargetOptions {
  readonly label: string
}

/**
 * 保留预期字段名，但不信任字段是否存在以及字段值是否正确。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * 用于提供验证代码中的字段名提示和拼写检查。
 * 所有字段均可缺失，所有字段值均保持 unknown。
 *
 * 此类型不执行运行时验证，也不复制或冻结对象。
 */
type UnvalidatedFields<T extends object> = {
  readonly [K in keyof T]?: unknown
}

/**
 * 附件的逻辑地址，不是像素副本或 GPU handle。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
 *
 * 地址由 target 对象身份、kind 和 index 共同确定；不保存 revision。
 * resize 后仍表示同一个附件槽位，由 Manager 解析为当前版本的 GPU 存储。
 * depth 的 index 固定为 0，但 depth16 在本阶段不能作为纹理采样。
 * 保存此引用不会 retain 目标，也不会阻止其 owner 释放目标。
 * TypeScript 接口不是可信凭证：Backend 消费时仍须验证 target/kind/index。
 */
export interface RenderTargetAttachmentRef {
  readonly target: RenderTarget
  readonly kind: 'color' | 'depth'
  readonly index: number
}

/**
 * 验证外层对象形状，返回字段值仍为 unknown 的同一个对象。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * 本函数是对象描述的入口检查，可以直接接收任意 unknown 值。
 * 成功只保证输入是非 null、非数组的对象，不保证它是普通对象，
 * 也不保证必填字段存在、字段名已知或字段值符合描述类型。
 * 返回值不是副本；Readonly 只提供静态约束，不执行运行时冻结。
 *
 * 当前描述验证流程先调用本函数，再把返回值交给 requireKnownFields()，
 * 最后逐项验证字段值。嵌套附件也必须分别完成自己的外层对象检查，
 * 不能因为根描述通过检查，就假设 colors[index] 或 depth 同样合法。
 *
 * @param value - 尚未验证的外部值。
 * @param fieldName - 错误诊断使用的字段路径。
 * @returns 已通过外层形状检查、字段值仍待验证的原对象。
 * @throws InvalidRenderTargetError 输入是 null、数组或非对象值。
 */
function requireRecord(value: unknown, fieldName: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidRenderTargetError(fieldName, 'must be a non-array object')

  return value as Readonly<Record<string, unknown>>
}

/**
 * 检查输入对象自身可枚举的字符串键是否都在允许列表中。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * 前置条件：input 已通过 requireRecord() 或等价的外层对象检查，
 * 确认它不是 null、数组或其他非对象值。
 * 本函数依赖该前置条件，不重复进行外层对象检查。
 *
 * 本函数仅检查字段名：
 * - 不保证必填字段已经存在；
 * - 不验证字段值的类型或范围；
 * - 不验证嵌套对象；
 * - 不将 input 判定为完整的 T。
 *
 * T 仅约束 allowed 中可以填写的字符串字段名。
 * 成功返回后，调用者仍须逐项验证实际使用的字段值。
 * 这里的“成功”只覆盖 Object.keys() 返回的自身可枚举字符串键，
 * 不覆盖继承键、不可枚举键或 Symbol 键。
 *
 * @param input - 已完成外层对象检查、字段值仍待验证的对象。
 * @param allowed - 允许出现的字符串字段名。
 * @param fieldName - 错误诊断使用的字段路径。
 * @throws InvalidRenderTargetError 出现不允许的可枚举字符串键。
 */
function requireKnownFields<T extends object>(
  input: Readonly<Record<string, unknown>>,
  allowed: readonly Extract<keyof T, string>[],
  fieldName: string
): void {
  const allowedNames: readonly string[] = allowed

  for (const key of Object.keys(input)) {
    if (!allowedNames.includes(key)) {
      throw new InvalidRenderTargetError(fieldName + '.' + key, 'unknown field')
    }
  }
}

/**
 * 独立验证一个尺寸值，并返回未经转换的正安全整数。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * 本函数自行检查 typeof、整数精度范围和正数约束，可直接接收 unknown。
 * 它不依赖 requireRecord() 或 requireKnownFields() 的调用结果：
 * 描述构造流程传入已安全读取的字段值，resize() 则直接传入尺寸参数。
 *
 * 不把字符串转成数字，不取整，也不钳制输入。
 * 通过此处检查只说明 CPU 逻辑尺寸合法；设备最大尺寸仍由 Backend 验证。
 * 调用者必须在所有相关尺寸验证成功后再发布新描述，避免部分更新。
 *
 * @param value - 尚未验证的单个尺寸值。
 * @param fieldName - 错误诊断使用的字段路径。
 * @returns 已收窄为 number 的原始正安全整数。
 * @throws InvalidRenderTargetError 输入不是正安全整数。
 */
function requireDimension(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new InvalidRenderTargetError(fieldName, 'must be a positive safe integer', {
      received: value
    })

  return value
}

/**
 * 验证并返回允许列表中的真实格式，不使用默认格式替换输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * value 可以是任意 unknown，不要求调用者提前验证字符串类型。
 * allowedFormats 来自本模块的格式列表，不来自未经验证的外部输入。
 * 成功结果取自列表本身，因此属于 T，无须把外部值强制断言为 T。
 *
 * 本函数只验证逻辑格式名称，不查询 WebGL 扩展或验证 framebuffer。
 *
 * @param value - 尚未验证的格式字段。
 * @param allowedFormats - 本类附件允许的逻辑格式。
 * @param fieldName - 错误诊断使用的字段路径。
 * @returns 与输入严格相等的合法格式。
 * @throws InvalidRenderTargetError 输入不在允许列表中。
 */
function requireAttachmentFormat<T extends string>(
  value: unknown,
  allowedFormats: readonly T[],
  fieldName: string
): T {
  const format = allowedFormats.find((candidate) => candidate === value)

  if (format === undefined) {
    throw new InvalidRenderTargetError(fieldName, 'must be one of: ' + allowedFormats.join(', '), {
      received: value
    })
  }

  return format
}

/**
 * 验证渲染目标描述，并创建由内部拥有的不可变快照。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
 *
 * 本函数按以下顺序验证根描述：
 * 1. requireRecord() 检查外层对象形状；
 * 2. requireKnownFields() 拒绝未知字段；
 * 3. requireDimension() 验证 width、height；
 * 4. 验证颜色附件数组及每个附件描述；
 * 5. 验证可选的深度附件描述；
 * 6. 发布逐层复制并冻结的完整快照。
 *
 * 每个嵌套附件同样先检查对象形状，再检查字段名，最后检查字段值。
 * 外层检查失败后立即抛错，不继续读取该对象的字段。
 * requireKnownFields() 的必要前提是外层形状检查已成功；
 * 先拒绝未知字段再验证尺寸，是本函数选定的首个错误报告顺序，
 * 并不表示字段名检查能够证明尺寸值合法。
 *
 * 所有验证成功前，不向 RenderTarget 发布描述。
 * 本函数只冻结自己创建的容器，不冻结调用者的输入对象。
 * 按索引遍历颜色数组，确保稀疏数组中的空槽也会被检查。
 *
 * 此顺序属于本函数的验证流程，不代表 requireDimension()
 * 在其他调用位置也必须依赖 requireRecord() 或 requireKnownFields()。
 *
 * @param value - 尚未验证的描述输入。
 * @returns 已验证、复制并逐层冻结的完整描述。
 * @throws InvalidRenderTargetError 任一描述字段不符合当前契约。
 */
function createDescriptorSnapshot(value: unknown): RenderTargetDescriptor {
  const input: UnvalidatedFields<RenderTargetDescriptor> = requireRecord(value, 'descriptor')

  requireKnownFields<RenderTargetDescriptor>(
    input,
    ['width', 'height', 'colors', 'depth'],
    'descriptor'
  )

  const width = requireDimension(input.width, 'width')
  const height = requireDimension(input.height, 'height')
  const rawColors = input.colors

  if (!Array.isArray(rawColors) || rawColors.length === 0) {
    throw new InvalidRenderTargetError('colors', 'must be a non-empty array')
  }

  const entries: readonly unknown[] = rawColors
  const colors: { readonly format: ColorAttachmentFormat }[] = []

  for (let index = 0; index < entries.length; index++) {
    const fieldName = 'colors[' + index + ']'
    const color = requireRecord(entries[index], fieldName)
    requireKnownFields(color, ['format'], fieldName)

    const format = requireAttachmentFormat(
      color.format,
      COLOR_ATTACHMENT_FORMATS,
      fieldName + '.format'
    )
    colors.push(Object.freeze({ format }))
  }

  let depth: RenderTargetDescriptor['depth']
  if (input.depth !== undefined) {
    const entry = requireRecord(input.depth, 'depth')
    requireKnownFields(entry, ['format'], 'depth')

    const format = requireAttachmentFormat(entry.format, DEPTH_ATTACHMENT_FORMATS, 'depth.format')
    depth = Object.freeze({ format })
  }

  return Object.freeze({
    width,
    height,
    /**
     * 冻结颜色附件数组本身，而不只是其中的附件描述对象。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
     *
     * 每个附件对象已在前面的循环中冻结。
     * 此处继续禁止修改数组索引、增删元素以及改变 length，
     * 避免调用者绕过 RenderTarget 的受控修改与 revision 机制。
     *
     * colors 是本函数新建的数组，不是调用者传入的原始数组。
     */
    colors: Object.freeze(colors),
    ...(depth === undefined ? {} : { depth })
  })
}

/**
 * 由 Pass/feature 拥有的离屏渲染目标；构造时不分配 GPU 存储。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][render-target-owner-boundary]
 *
 * Owner 管理逻辑生命周期，Backend 只管理当前 context 的 GPU 表示。
 * 本类不继承 Texture：没有可重新上传的 CPU 图片或像素源。
 * context 恢复后，GPU 生成的内容须由 owner 重新执行生产 Pass。
 * 继承 Resource 的严格 dispose/tryDispose 和 Scene 引用计数，不另造释放协议。
 */
export class RenderTarget extends Resource {
  protected override readonly resourceType = 'RenderTarget'

  /**
   * 创建时复制的诊断名称；对 TypeScript 调用者只读，不是唯一标识。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
   *
   * 保存字符串值而非 options 引用，因此修改输入对象不会改变此标签。
   * resize 只更新存储描述与 revision；dispose 仍保留标签，便于事后诊断。
   */
  public readonly label: string

  /** 当前完整的不可变 CPU 描述；正常释放通知结束后清空。 */
  private descriptorValue: RenderTargetDescriptor | null
  /** 描述版本，不是 GPU 已完成创建的证明，也不是撤销历史。 */
  private revisionValue = 0

  /**
   * @param descriptor - 完整尺寸与附件布局。
   * @param options - 独立诊断选项，必须包含非空白的 label。
   * @throws InvalidRenderTargetError 描述或标签不合法；不会留下 GPU 半成品。
   */
  constructor(descriptor: RenderTargetDescriptor, options: RenderTargetOptions) {
    super()

    const input = requireRecord(options, 'options')
    const label = input.label
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new InvalidRenderTargetError('options.label', 'must be a non-blank string', {
        received: label
      })
    }

    this.label = label
    this.descriptorValue = createDescriptorSnapshot(descriptor)
  }

  /** 返回已深层冻结的快照；调用者缓存旧快照不会跟随 resize 改变。 */
  get descriptor(): RenderTargetDescriptor {
    this.assertUsable()
    return this.descriptorValue!
  }

  /** 返回当前 CPU 描述版本；读取不会增加版本，释放后拒绝读取。 */
  get revision(): number {
    this.assertUsable()
    return this.revisionValue
  }

  /**
   * 只改变尺寸，保留附件数量和格式。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-atomic-resize]
   *
   * 先验证两个尺寸，再准备完整新快照，最后提交并增加一次 revision。
   * 非法输入保持旧快照和版本不变；尺寸未变直接返回。
   * A → B → A 是两次修改，revision 不倒退；本方法不缓存历史版本。
   * Manager 后续看到 revision 不同才重建 GPU 表示；失败不得缓存半成品。
   *
   * @throws InvalidRenderTargetError 尺寸不是正安全整数。
   * @throws ResourceDisposedError 目标已开始释放。
   */
  resize(width: number, height: number): void {
    this.assertUsable()

    const nextWidth = requireDimension(width, 'width')
    const nextHeight = requireDimension(height, 'height')

    const current = this.descriptorValue!

    if (current.width === nextWidth && current.height === nextHeight) return

    const next = Object.freeze({
      ...current,
      width,
      height
    })

    this.descriptorValue = next
    this.revisionValue++
  }

  /**
   * 获取一个冻结的颜色附件地址；每次可返回新的包装对象。
   * @param index - 从 0 开始的颜色槽位。
   * @throws InvalidRenderTargetError 索引不是安全整数或超出范围。
   * @throws ResourceDisposedError 目标已开始释放。
   */
  getColorAttachment(index: number): RenderTargetAttachmentRef {
    this.assertUsable()

    const colors = this.descriptorValue!.colors
    if (!Number.isSafeInteger(index) || index < 0 || index >= colors.length) {
      throw new InvalidRenderTargetError('colorAttachment.index', 'must name an existing slot', {
        received: index,
        colorCount: colors.length
      })
    }

    return Object.freeze({ target: this, kind: 'color', index })
  }

  /**
   * 获取深度地址；没有配置 depth 时返回 null。
   * 这里的 null 只表示“没有深度附件”，绝不表示默认 framebuffer。
   */
  getDepthAttachment(): RenderTargetAttachmentRef | null {
    this.assertUsable()
    if (this.descriptorValue!.depth === undefined) return null

    return Object.freeze({ target: this, kind: 'depth', index: 0 })
  }

  /** 只交还 CPU 描述；各 context 的 GPU 删除由 Resource listener 通知 Manager。 */
  protected override disposeCPUData(): void {
    this.descriptorValue = null
  }
}
