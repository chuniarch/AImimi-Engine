import { Resource } from '@/rendering/core/Resource'
import { InvalidParameterBlockError } from '@/rendering/core/errors'
import { assertNonArrayObject } from '@/rendering/core/validation'
import { SamplingSourceErrorFactory } from './Texture2DSamplingSource'
import { MaterialParameter } from './materialParameters'
import { assertValidParameterName, copyParameter } from '@/rendering/resources/materialParameters'

/** 布局由 entries 的名称及各项 type 确定；构造后只能替换已有项的值。 */
export interface ParameterBlockOptions {
  readonly label: string
  readonly entries: Readonly<Record<string, MaterialParameter>>
}

/**
 * 可被多个 Material 按身份借用的 CPU 参数资源，不是 GPU uniform buffer。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][parameter-block-fixed-layout]
 * 名字与类型固定，因此 Material 可以在构造时一次检查同名冲突。
 * 数值/wrapper 在写入和读取时复制；纹理和附件目标只借用，不 retain、不 dispose。
 * 块本身沿用 Resource 的 Scene 引用计数；WebGL1 不为它创建 Manager。
 *
 * 每次成功 set 增加一次 version，包括相同值；version 不等于整帧编号。
 * 单次 set 原子，不表示多次 set 或“矩阵 + 阴影图”整体原子。
 * 生产者须在消费者 draw 之前完成更新；不要在一组消费者的绘制之间写块。
 */
export class ParameterBlock extends Resource {
  protected override readonly resourceType: string = 'ParameterBlock'

  /** 仅用于诊断，不作为资源 cache key。 */
  public readonly label: string

  private namesValue: readonly string[]
  private readonly entriesValue = new Map<string, MaterialParameter>()
  private readonly createError: SamplingSourceErrorFactory

  private versionValue = 0

  /** 所有输入先验证与复制；失败不会登记 Scene 引用或分配 GPU 对象。 */
  constructor(options: ParameterBlockOptions) {
    super()

    assertNonArrayObject(
      options,
      () => new InvalidParameterBlockError('<unnamed>', 'options', 'must be a non-array object')
    )

    if (typeof options.label !== 'string' || options.label.trim().length === 0)
      throw new InvalidParameterBlockError('<unnamed>', 'label', 'must be a non-empty string')

    this.label = options.label

    this.createError = (fieldName, reason, details) =>
      new InvalidParameterBlockError(this.label, fieldName, reason, details)

    assertNonArrayObject(options.entries, () =>
      this.createError('entries', 'must be a non-array object')
    )

    for (const [name, parameter] of Object.entries(options.entries)) {
      assertValidParameterName(name, this.createError)
      this.entriesValue.set(name, copyParameter(parameter, 'entries.' + name, this.createError))
    }

    this.namesValue = Object.freeze([...this.entriesValue.keys()])
  }

  /** 冻结的布局名称，不读取纹理，不泄露内部 Map。 */
  get names(): readonly string[] {
    this.assertUsable()
    return this.namesValue
  }

  /** 成功写入的递增版本；读取不会清零或增加版本。 */
  get version(): number {
    this.assertUsable()
    return this.versionValue
  }

  /**
   * 仅复制被请求的一项，不存在时返回 undefined。
   * 读取纹理项时重新验证其存活；读取其他项不访问无关纹理。
   */
  get(name: string): MaterialParameter | undefined {
    this.assertUsable()
    assertValidParameterName(name, this.createError)
    const parameter = this.entriesValue.get(name)
    return parameter === undefined
      ? undefined
      : copyParameter(parameter, 'entries.' + name, this.createError)
  }

  /** 复制全部条目，故也会检查全部纹理依赖；Backend 不用它读取 inactive 项。 */
  getEntries(): ReadonlyArray<readonly [string, MaterialParameter]> {
    this.assertUsable()
    return Array.from(
      this.entriesValue,
      ([name, parameter]) =>
        [name, copyParameter(parameter, 'entries.' + name, this.createError)] as const
    )
  }

  /**
   * 替换已存在且类型相同的一项。
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-atomic-write]
   * 顺序：检查存活/名称 → 完整验证和复制 → 检查类型/版本容量 → 提交值和版本。
   * 任何检查失败，原值、插入顺序和版本保持不变。不会释放被替换的纹理。
   */
  set(name: string, paramter: MaterialParameter): void {
    this.assertUsable()
    assertValidParameterName(name, this.createError)

    const current = this.entriesValue.get(name)
    if (current === undefined)
      throw this.createError('entries.' + name, 'name is not declared in this block')

    const next = copyParameter(paramter, 'entries.' + name, this.createError)
    if (next.type !== current.type)
      throw this.createError('entries.' + name, 'parameter type cannot change', {
        expected: current.type,
        received: next.type
      })

    if (this.versionValue === Number.MAX_SAFE_INTEGER)
      throw this.createError('version', 'safe integer range exhausted')

    this.entriesValue.set(name, next)
    this.versionValue++
  }

  /**
   * 断开借用关系，不级联释放纹理或 RenderTarget。
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-borrowing]
   * Material 借用块，块再借用纹理；每种实际 Resource 的存活责任由所有者承担。
   */
  protected override disposeCPUData(): void {
    this.entriesValue.clear()
    this.namesValue = Object.freeze([])
  }
}
