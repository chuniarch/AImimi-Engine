import { InvalidTextureResourceError } from '@/rendering/core/errors/InvalidTextureResourceError'
import { TextureResource } from './TextureResource'
import type { RenderTextureProduction, TextureResourceOptions } from './textureTypes'
import {
  fullTextureMipCount,
  textureChoice,
  textureDiagnosticLabel,
  textureKnownFields,
  textureRecord,
  type TextureErrorFactory
} from './textureResourceValidation'

/** caller声明存储和生产方式；没有CPU像素，也没有“已烘焙”布尔值。 */
export interface RenderTextureOptions extends TextureResourceOptions {
  readonly production: RenderTextureProduction
}

/**
 * GPU生产内容的逻辑身份。C1仅交付CPU契约，C3/C4以后才接GPU分配/使用。
 * [DESIGN-WEIGHT:3][render-texture-production-ownership]
 * manual由生产者绘制层；generated-from-base仍需生产者成功后显式请求生成。
 * dispose沿用Resource/C0；view与binding都不能取得另一份释放责任。
 */
export class RenderTexture extends TextureResource {
  protected override readonly resourceType = 'RenderTexture'
  public readonly production: RenderTextureProduction

  constructor(options: RenderTextureOptions) {
    const label = textureDiagnosticLabel(options?.label)
    const error: TextureErrorFactory = (field, reason, details) =>
      new InvalidTextureResourceError(label, field, reason, details)
    const input = textureRecord(options, 'options', error)
    textureKnownFields(
      input,
      ['label', 'descriptor', 'defaultSampler', 'production'],
      'options',
      error
    )
    const production = textureChoice(
      input.production,
      ['manual', 'generated-from-base'],
      'production',
      error
    )
    super(
      { label: input.label, descriptor: input.descriptor, defaultSampler: input.defaultSampler },
      'render',
      error
    )
    const descriptor = this.descriptor
    if (descriptor.storage.format !== 'rgba')
      throw error('descriptor.storage.format', 'render textures currently require rgba')
    if (descriptor.colorSpace === 'srgb')
      throw error('descriptor.colorSpace', 'render textures currently require linear or data')
    if (
      production === 'generated-from-base' &&
      descriptor.mipLevelCount !== fullTextureMipCount(descriptor.width, descriptor.height)
    ) {
      throw error('production', 'generated-from-base requires a complete declared mip chain')
    }
    this.production = production
  }

  /** 没有CPU像素；GPU记录的清理由Resource监听器与所属Manager协作。 */
  protected override disposeCPUData(): void {}
}

/** 与类型提案中的工厂调用保持一致，仍创建一个Resource身份。 */
export function createRenderTexture(options: RenderTextureOptions): RenderTexture {
  return new RenderTexture(options)
}
