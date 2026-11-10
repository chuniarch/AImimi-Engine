import { Resource } from '@/rendering/core/Resource'
import { InvalidRenderTargetError } from '@/rendering/core/errors'
import { DepthBufferResource } from './DepthBufferResource'
import {
  createTextureWriteView,
  getTextureWriteViewSize,
  type TextureWriteView
} from './TextureWriteView'
import {
  textureKnownFields,
  textureLabel,
  textureRecord,
  type TextureErrorFactory
} from './textureResourceValidation'

/** 只组装借用的子资源；尺寸从每个实际mip推导，没有重复的width/height输入。 */
export interface RenderTargetAttachments {
  readonly colors: readonly TextureWriteView[]
  readonly depth?: DepthBufferResource
}
/** 诊断标签独立于附件，允许重复，不作为缓存key。 */
export interface RenderTargetOptions {
  readonly label: string
}
/** 活动槽位地址：不保存纹理或revision，每次消费时解析目标当前槽位。 */
export interface RenderTargetAttachmentRef {
  readonly target: RenderTarget
  readonly kind: 'color' | 'depth'
  readonly index: number
}
interface Snapshot {
  readonly attachments: RenderTargetAttachments
  readonly width: number
  readonly height: number
}
const error: TextureErrorFactory = (field, reason, details) =>
  new InvalidRenderTargetError(field, reason, details)

/**
 * 在完整候选上验证尺寸和身份；只冻结新包装，不冻结Resource。
 * [DESIGN-WEIGHT:3][validated-input-value-snapshot]
 * 外部字段可能是getter：每个字段只读取一次，验证和发布使用同一份捕获值。
 */
function snapshot(value: unknown): Snapshot {
  const input = textureRecord(value, 'attachments', error)
  textureKnownFields(input, ['colors', 'depth'], 'attachments', error)
  const rawColors = input.colors
  if (!Array.isArray(rawColors)) throw error('colors', 'must be a non-empty array')
  const length = rawColors.length
  if (!Number.isSafeInteger(length) || length <= 0)
    throw error('colors', 'must be a non-empty array')
  const entries: readonly unknown[] = rawColors,
    colors: TextureWriteView[] = [],
    seen = new Set<object>()
  let width = 0,
    height = 0
  for (let i = 0; i < length; i++) {
    const view = createTextureWriteView(entries[i] as TextureWriteView)
    if (seen.has(view.texture))
      throw error('colors[' + i + ']', 'same texture may not appear twice')
    seen.add(view.texture)
    const [w, h] = getTextureWriteViewSize(view)
    if (i === 0) {
      width = w
      height = h
    } else if (w !== width || h !== height)
      throw error('colors[' + i + ']', 'effective attachment sizes must match')
    colors.push(view)
  }
  let depth: DepthBufferResource | undefined
  const rawDepth = input.depth
  if (rawDepth !== undefined) {
    if (!(rawDepth instanceof DepthBufferResource))
      throw error('depth', 'must reference a DepthBufferResource')
    depth = rawDepth
    depth.assertUsable()
    if (depth.width !== width || depth.height !== height)
      throw error('depth', 'size must match all color attachments')
  }
  // 后面输入的getter可能关闭前面的资源；发布前再次核对借用对象。
  for (const view of colors) view.texture.assertUsable()
  depth?.assertUsable()
  return Object.freeze({
    width,
    height,
    attachments: Object.freeze({ colors: Object.freeze(colors), ...(depth ? { depth } : {}) })
  })
}
/** wrapper身份不参与组装相等性；顺序、真实纹理、face、mip和depth身份才参与。 */
function equivalent(a: RenderTargetAttachments, b: RenderTargetAttachments): boolean {
  return (
    a.depth === b.depth &&
    a.colors.length === b.colors.length &&
    a.colors.every((v, i) => {
      const other = b.colors[i]!
      return (
        v.texture === other.texture &&
        v.kind === other.kind &&
        v.mipLevel === other.mipLevel &&
        (v.kind === '2d' || (other.kind === 'cube-face' && v.face === other.face))
      )
    })
  )
}

/**
 * 一份FBO组装的CPU身份。它借用附件，不分配或拥有附件存储。
 * [DESIGN-WEIGHT:3][render-target-borrowed-composition]
 * replaceAttachments只发布完整CPU候选，不承诺GPU分配或像素生产完成。
 * 不再提供resize；需要新尺寸时由owner创建新资源再替换整组附件。
 */
export class RenderTarget extends Resource {
  protected override readonly resourceType = 'RenderTarget'
  public readonly label: string
  private snapshotValue: Snapshot | null
  private revisionValue = 0
  /** 拒绝由输入getter造成的同步替换重入；不与Resource清理状态混用。 */
  private replacing = false
  constructor(attachments: RenderTargetAttachments, options: RenderTargetOptions) {
    super()
    const input = textureRecord(options, 'options', error)
    textureKnownFields(input, ['label'], 'options', error)
    this.label = textureLabel(input.label, error)
    this.snapshotValue = snapshot(attachments)
  }
  /** 正常消费既检查目标也检查借用资源；旧包装不能让已关闭附件复活。 */
  private readSnapshot(): Snapshot {
    this.assertUsable()
    const value = this.snapshotValue!
    for (const view of value.attachments.colors) view.texture.assertUsable()
    value.attachments.depth?.assertUsable()
    return value
  }
  get attachments(): RenderTargetAttachments {
    return this.readSnapshot().attachments
  }
  get width(): number {
    return this.readSnapshot().width
  }
  get height(): number {
    return this.readSnapshot().height
  }
  /** 组装版本，而非内容版本、设备代次或GPU完成计数。 */
  get revision(): number {
    this.assertUsable()
    return this.revisionValue
  }
  /**
   * 完整验证→等价判断→一次发布。失败保留旧快照/版本；不释放新旧附件。
   * [DESIGN-WEIGHT:3][render-target-atomic-attachment-replacement]
   */
  replaceAttachments(next: RenderTargetAttachments): void {
    this.assertUsable()
    if (this.replacing) throw error('replaceAttachments', 'must not re-enter')
    this.replacing = true
    try {
      const candidate = snapshot(next)
      this.assertUsable()
      if (equivalent(this.snapshotValue!.attachments, candidate.attachments)) return
      this.snapshotValue = candidate
      this.revisionValue++
    } finally {
      this.replacing = false
    }
  }
  /** 创建活动颜色槽位地址，不复制存储、不retain。 */
  getColorAttachment(index: number): RenderTargetAttachmentRef {
    const attachments = this.attachments
    if (!Number.isSafeInteger(index) || index < 0 || index >= attachments.colors.length)
      throw error('colorAttachment.index', 'must name an existing slot', { received: index })
    return Object.freeze({ target: this, kind: 'color', index })
  }
  /** depth地址不代表可采样；没有depth返回null，不代表默认framebuffer。 */
  getDepthAttachment(): RenderTargetAttachmentRef | null {
    return this.attachments.depth === undefined
      ? null
      : Object.freeze({ target: this, kind: 'depth', index: 0 })
  }
  /** 只丢弃描述；CPU附件及其GPU表示的释放由真正owner和Manager负责。 */
  protected override disposeCPUData(): void {
    this.snapshotValue = null
  }
}
