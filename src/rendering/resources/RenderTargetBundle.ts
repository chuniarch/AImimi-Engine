import { Resource } from '@/rendering/core/Resource'
import { CleanupFailureError, InvalidRenderTargetError } from '@/rendering/core/errors'
import { createDepthBufferResource, type DepthBufferResource } from './DepthBufferResource'
import { createRenderTexture, type RenderTexture } from './RenderTexture'
import { RenderTarget, type RenderTargetAttachments } from './RenderTarget'
import type {
  TextureSamplerInput,
  TextureSamplerDescriptor,
  TextureStorageDescriptor
} from './textureTypes'
import {
  textureChoice,
  textureDimension,
  textureKnownFields,
  textureLabel,
  textureRecord,
  textureSamplerSnapshot,
  textureStorageSnapshot,
  type TextureErrorFactory
} from './textureResourceValidation'

/** 常用2D独占颜色配置；多mip/cube的环境owner直接组合C1资源，不使用本便利组。 */
export interface RenderTargetBundleColor {
  readonly storage: TextureStorageDescriptor
  readonly colorSpace: 'linear' | 'data'
  readonly defaultSampler?: TextureSamplerInput
}
export interface RenderTargetBundleOptions {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly colors: readonly RenderTargetBundleColor[]
  readonly depth?: boolean
}
interface ColorConfig {
  readonly storage: Readonly<TextureStorageDescriptor>
  readonly colorSpace: 'linear' | 'data'
  readonly sampler: Readonly<TextureSamplerDescriptor>
}
interface Group {
  readonly colors: RenderTexture[]
  depth: DepthBufferResource | null
}
const error: TextureErrorFactory = (field, reason, details) =>
  new InvalidRenderTargetError(field, reason, details)
const empty = (): Group => ({ colors: [], depth: null })

/**
 * 先归一化全部配置，再创建任何子资源；格式和sampler与C1保持一致。
 * [DESIGN-WEIGHT:3][validated-input-value-snapshot]
 * 长度捕获一次并逐项检查，不能让外部迭代器/length变化跳过后续非法项。
 */
function config(value: unknown): readonly ColorConfig[] {
  if (!Array.isArray(value)) throw error('colors', 'must be a non-empty array')
  const length = value.length
  if (!Number.isSafeInteger(length) || length <= 0)
    throw error('colors', 'must be a non-empty array')
  const entries: readonly unknown[] = value
  const result: ColorConfig[] = []
  for (let i = 0; i < length; i++) {
    const field = 'colors[' + i + ']',
      input = textureRecord(entries[i], field, error)
    textureKnownFields(input, ['storage', 'colorSpace', 'defaultSampler'], field, error)
    const storage = textureStorageSnapshot(input.storage, error)
    if (storage.format !== 'rgba') throw error(field + '.storage.format', 'must be rgba')
    const colorSpace = textureChoice(
      input.colorSpace,
      ['linear', 'data'],
      field + '.colorSpace',
      error
    )
    const sampler = textureSamplerSnapshot(input.defaultSampler, error)
    textureChoice(
      sampler.minFilter,
      ['nearest', 'linear'],
      field + '.defaultSampler.minFilter',
      error
    )
    result.push(Object.freeze({ storage, colorSpace, sampler }))
  }
  return Object.freeze(result)
}
/** 构造普通2D/base-mip地址，仅复制包装，资源身份来自owner的当前组。 */
function attachments(group: Group): RenderTargetAttachments {
  return {
    colors: group.colors.map((texture) => ({ kind: '2d', texture, mipLevel: 0 })),
    ...(group.depth ? { depth: group.depth } : {})
  }
}
/** C0正常返回也可能仍running；依赖清理必须确认complete才能继续。 */
function disposeChild(child: Resource, label: string): void {
  const complete = () => child.cleanupState === 'complete'
  if (complete()) return
  child.dispose()
  if (!complete())
    throw new CleanupFailureError(label, [
      {
        phase: 'owner-child',
        label,
        cause: new Error('Child cleanup is still ' + child.cleanupState)
      }
    ])
}
/** 独占组内顺序固定；失败后各Resource自己保留C0进度，成功子项不重放。 */
function disposeGroup(group: Group, label: string): void {
  for (let i = 0; i < group.colors.length; i++)
    disposeChild(group.colors[i]!, label + '/color/' + i)
  if (group.depth) disposeChild(group.depth, label + '/depth')
}

/**
 * 常用2D目标的CPU所有者；target身份稳定，底层颜色/深度随resize整组替换。
 * [DESIGN-WEIGHT:3][render-target-owner-resize]
 * 本对象是组合owner，不是第二份纹理身份。Scene可retain它，不能再retain其独占子项。
 * 自己创建的target/颜色/depth由它清理；共享外传纹理应另用普通RenderTarget组装。
 */
export class RenderTargetBundle extends Resource {
  protected override readonly resourceType = 'RenderTargetBundle'
  public readonly label: string
  private readonly colors: readonly ColorConfig[]
  private readonly hasDepth: boolean
  private readonly targetValue: RenderTarget
  private current: Group = empty()
  /** 已退役或未发布候选的剩余清理责任，成功前绝不丢弃。 */
  private readonly retired: Group[] = []
  /** 同步resize事务与Resource清理状态不同；CPU清理不能越过此执行屏障。 */
  private resizing = false

  constructor(options: RenderTargetBundleOptions) {
    super()
    const input = textureRecord(options, 'options', error)
    textureKnownFields(input, ['label', 'width', 'height', 'colors', 'depth'], 'options', error)
    this.label = textureLabel(input.label, error)
    const width = textureDimension(input.width, 'width', error),
      height = textureDimension(input.height, 'height', error)
    this.colors = config(input.colors)
    // [DESIGN-WEIGHT:3][validated-input-value-snapshot]
    // 捕获一次再验证/使用，不能在getter的不同结果之间切换创建策略。
    const depth = input.depth
    if (depth !== undefined && typeof depth !== 'boolean') throw error('depth', 'must be a boolean')
    this.hasDepth = depth === true
    // 初始构建只创建尚未公开、无GPU订阅的CPU子项；返回owner之前不会交给设备。
    try {
      this.populate(this.current, width, height)
      this.targetValue = new RenderTarget(attachments(this.current), {
        label: this.label + '/target'
      })
    } catch (cause) {
      disposeGroup(this.current, this.label + '/initial')
      throw cause
    }
  }
  /** 借用稳定target，不转交其中任何子资源的释放责任。 */
  get target(): RenderTarget {
    this.assertUsable()
    this.targetValue.assertUsable()
    return this.targetValue
  }
  /** 只构造CPU资源；实际GPU创建失败属于后续Manager，不在此伪造回滚画面。 */
  private populate(group: Group, width: number, height: number): void {
    for (let i = 0; i < this.colors.length; i++) {
      const color = this.colors[i]!
      group.colors.push(
        createRenderTexture({
          label: this.label + '/color/' + i,
          production: 'manual',
          descriptor: {
            dimension: '2d',
            width,
            height,
            mipLevelCount: 1,
            storage: color.storage,
            colorSpace: color.colorSpace
          },
          defaultSampler: color.sampler
        })
      )
    }
    if (this.hasDepth)
      group.depth = createDepthBufferResource({ label: this.label + '/depth', width, height })
  }
  /** 不在清理失败时继续分配新组，避免连续resize积累无界退役资源。 */
  private drainRetired(): void {
    while (this.retired.length) {
      disposeGroup(this.retired[0]!, this.label + '/retired')
      this.retired.shift()
    }
  }
  /**
   * 验证尺寸→重试retired→创建全组→替换附件→记账→清旧组。
   * [DESIGN-WEIGHT:3][render-target-resize-publication-boundary]
   * 提交前失败保留旧组；提交后清理失败抛错但保留新组，不冒称回滚。
   * 再次同尺寸调用会重试retired，但不增加revision、不重新分配。
   */
  resize(width: number, height: number): void {
    this.assertUsable()
    if (this.resizing) throw error('resize', 'must not re-enter')
    const w = textureDimension(width, 'width', error),
      h = textureDimension(height, 'height', error)
    this.resizing = true
    try {
      this.drainRetired()
      this.assertUsable()
      if (this.targetValue.width === w && this.targetValue.height === h) return
      const candidate = empty()
      try {
        this.populate(candidate, w, h)
        this.assertUsable()
        this.targetValue.replaceAttachments(attachments(candidate))
      } catch (cause) {
        this.retired.push(candidate)
        try {
          this.drainRetired()
        } catch (cleanupCause) {
          throw new CleanupFailureError(this.label, [
            { phase: 'owner-child', label: 'candidate construction/replacement', cause },
            { phase: 'owner-child', label: 'candidate rollback cleanup', cause: cleanupCause }
          ])
        }
        throw cause
      }
      const old = this.current
      this.current = candidate
      this.retired.push(old)
      // 已经发布的新组不属于前面catch的回滚范围。
      this.drainRetired()
      this.assertUsable()
    } finally {
      this.resizing = false
    }
  }
  /**
   * 停止服务→target完整清理→retired/current存储完整清理。
   * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
   * 不调用关闭后的公开getter，不以disposed代替complete，失败保留所有私有责任。
   */
  protected override disposeCPUData(): void {
    if (this.resizing)
      throw new CleanupFailureError(this.label, [
        { phase: 'owner-child', label: 'resize', cause: new Error('Resize is still running') }
      ])
    disposeChild(this.targetValue, this.label + '/target')
    this.drainRetired()
    disposeGroup(this.current, this.label + '/current')
  }
}
