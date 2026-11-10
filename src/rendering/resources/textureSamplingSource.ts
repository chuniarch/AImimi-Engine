import { InvalidMaterialError } from '@/rendering/core/errors'
import type { RenderingErrorDetails } from '@/rendering/core/errors/RenderingError'
import { CubeTexture } from './CubeTexture'
import { RenderTexture } from './RenderTexture'
import { Texture2D } from './Texture2D'
import { TextureResource } from './TextureResource'
import { RenderTarget, type RenderTargetAttachmentRef } from './RenderTarget'
import { createTextureSamplingBinding, type TextureSamplingBinding } from './TextureSamplingBinding'
import type { TextureDimension } from './textureTypes'
import {
  assertTextureSamplerLayout,
  textureKnownFields,
  textureRecord,
  textureSamplerSnapshot,
  type TextureErrorFactory
} from './textureResourceValidation'

/** 参数复制保留legacy直接资源、固定绑定或活动槽位，不能把三者混为同一生命周期。 */
export type Texture2DSamplingSource =
  | Texture2D
  | RenderTexture
  | TextureSamplingBinding
  | RenderTargetAttachmentRef
export type CubeTextureSamplingSource = CubeTexture | RenderTexture | TextureSamplingBinding
export type TextureSamplingSource = Texture2DSamplingSource | CubeTextureSamplingSource
/** Material与ParameterBlock共用验证，调用者保留自己的错误领域和字段上下文。 */
export type SamplingSourceErrorFactory = (
  field: string,
  reason: string,
  details?: RenderingErrorDetails
) => Error
const materialError: SamplingSourceErrorFactory = (field, reason, details) =>
  new InvalidMaterialError(field, reason, details)

/** dimension是逻辑纹理种类，不是GL target；存活检查的领域错误原样传播。 */
function requireDimension(
  texture: TextureResource,
  dimension: TextureDimension,
  field: string,
  error: SamplingSourceErrorFactory
): void {
  texture.assertUsable()
  if (texture.descriptor.dimension !== dimension)
    throw error(field, 'texture dimension must be ' + dimension)
}
/**
 * 消费活动槽位时重新验证当前资源，仅允许2D/mip0颜色作为旧sampler2D入口。
 * [DESIGN-WEIGHT:3][active-slot-versus-fixed-texture-binding]
 * cube face不是二维纹理，mip地址不是整张纹理的LOD限制，depth16不可采样。
 */
function slot(
  value: unknown,
  dimension: TextureDimension,
  field: string,
  error: SamplingSourceErrorFactory
): RenderTargetAttachmentRef {
  const fail: TextureErrorFactory = (part, reason, details) =>
    error(field + '.' + part, reason, details)
  const input = textureRecord(value, 'source', fail)
  textureKnownFields(input, ['target', 'kind', 'index'], 'source', fail)
  if (dimension !== '2d') throw error(field, 'target slots are only a legacy sampler2D input')
  const target = input.target,
    index = input.index
  if (!(target instanceof RenderTarget))
    throw error(field + '.target', 'must reference a RenderTarget')
  target.assertUsable()
  if (input.kind !== 'color')
    throw error(field + '.kind', 'must reference a sampleable color slot; depth16 is not a texture')
  const entries = target.attachments.colors
  if (
    typeof index !== 'number' ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= entries.length
  )
    throw error(field + '.index', 'must name an existing color slot')
  const view = entries[index]!
  if (view.kind !== '2d' || view.mipLevel !== 0)
    throw error(field, 'legacy sampler2D slots require a 2d mip0 attachment')
  requireDimension(view.texture, '2d', field, error)
  return Object.freeze({ target, kind: 'color', index })
}

export function copyTextureSamplingSource(
  value: unknown,
  dimension: '2d',
  field: string,
  error?: SamplingSourceErrorFactory
): Texture2DSamplingSource
export function copyTextureSamplingSource(
  value: unknown,
  dimension: 'cube',
  field: string,
  error?: SamplingSourceErrorFactory
): CubeTextureSamplingSource
export function copyTextureSamplingSource(
  value: unknown,
  dimension: TextureDimension,
  field: string,
  error?: SamplingSourceErrorFactory
): TextureSamplingSource
/**
 * 复制参数输入但保留它的语义：直接资源仍为原资源，fixed复制sampler，slot不提前解析。
 * [DESIGN-WEIGHT:3][material-parameter-copy-boundary]
 * 创建新wrapper不retain、不复制像素、不冻结Resource。外部JavaScript输入逐字段验证。
 */
export function copyTextureSamplingSource(
  value: unknown,
  dimension: TextureDimension,
  field: string,
  error: SamplingSourceErrorFactory = materialError
): TextureSamplingSource {
  if (dimension !== '2d' && dimension !== 'cube')
    throw error(field, 'unsupported sampling dimension')
  if (
    value instanceof Texture2D ||
    value instanceof CubeTexture ||
    value instanceof RenderTexture
  ) {
    requireDimension(value, dimension, field, error)
    return value
  }
  const fail: TextureErrorFactory = (part, reason, details) =>
    error(field + '.' + part, reason, details)
  const input = textureRecord(value, 'source', fail)
  if ('target' in input) return slot(input, dimension, field, error)
  textureKnownFields(input, ['texture', 'sampler'], 'source', fail)
  const texture = input.texture
  if (!(texture instanceof TextureResource))
    throw error(field + '.texture', 'must reference a TextureResource')
  requireDimension(texture, dimension, field, error)
  // [DESIGN-WEIGHT:3][validated-input-value-snapshot]
  // null必须按第一次读到的值被拒绝，不能再读取undefined后退回默认sampler。
  const samplerInput = input.sampler
  if (samplerInput === undefined)
    throw error(field + '.sampler', 'must provide a sampler descriptor')
  const sampler = textureSamplerSnapshot(samplerInput, fail, texture.defaultSampler)
  assertTextureSamplerLayout(sampler, texture.descriptor, fail)
  return createTextureSamplingBinding(texture, sampler)
}

/**
 * 本次消费才得到固定的{texture,sampler}；下一次消费slot仍需重新调用。
 * [DESIGN-WEIGHT:3][active-slot-versus-fixed-texture-binding]
 * 此函数不创建GPU表示、不检查设备能力或画面完成状态；这些由C3/C4和生产者负责。
 */
export function resolveTextureSamplingSource(
  value: unknown,
  dimension: TextureDimension,
  field: string,
  error: SamplingSourceErrorFactory = materialError
): TextureSamplingBinding {
  const copied = copyTextureSamplingSource(value, dimension, field, error)
  if (copied instanceof TextureResource) return createTextureSamplingBinding(copied)
  if ('target' in copied) {
    const view = copied.target.attachments.colors[copied.index]!
    return createTextureSamplingBinding(view.texture)
  }
  return copied
}
