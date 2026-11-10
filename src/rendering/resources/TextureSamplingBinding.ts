import { InvalidTextureResourceError } from '@/rendering/core/errors/InvalidTextureResourceError'
import { TextureResource } from './TextureResource'
import type { TextureSamplerDescriptor, TextureSamplerInput } from './textureTypes'
import {
  assertTextureSamplerLayout,
  textureSamplerSnapshot,
  type TextureErrorFactory
} from './textureResourceValidation'

/** 借用一张完整纹理身份和完整sampler，不包含face/mip写入地址或生产有效性。 */
export interface TextureSamplingBinding {
  readonly texture: TextureResource
  readonly sampler: Readonly<TextureSamplerDescriptor>
}

/**
 * 创建采样请求，不复制纹理、不retain、不分配GPU存储。
 * [DESIGN-WEIGHT:3][texture-sampling-borrowing]
 * overrides仅作用于本wrapper；默认sampler和其他消费者不变。
 * 设备过滤能力、同draw采样冲突及feedback留给C4。
 */
export function createTextureSamplingBinding(
  texture: TextureResource,
  overrides?: TextureSamplerInput
): TextureSamplingBinding {
  const label = texture instanceof TextureResource ? texture.label : '<unnamed>'
  const error: TextureErrorFactory = (field, reason, details) =>
    new InvalidTextureResourceError(label, field, reason, details)
  if (!(texture instanceof TextureResource))
    throw error('texture', 'must reference a TextureResource')
  texture.assertUsable()
  const sampler = textureSamplerSnapshot(overrides, error, texture.defaultSampler)
  assertTextureSamplerLayout(sampler, texture.descriptor, error)
  return Object.freeze({ texture, sampler })
}
