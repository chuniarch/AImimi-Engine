import { TextureResource } from './TextureResource'
import type {
  TextureColorSpace,
  TextureDimension,
  TextureMipmapPolicy,
  TextureSamplerDescriptor,
  TextureSamplerInput,
  TextureStorageDescriptor
} from './textureTypes'
import {
  textureChoice,
  textureLabel,
  textureRecord,
  textureSamplerSnapshot,
  textureStorageSnapshot,
  type TextureErrorFactory
} from './textureResourceValidation'
import { fullTextureMipCount } from './textureResourceValidation'
export type {
  TextureColorSpace,
  TextureDataType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureMipmapPolicy,
  TextureSamplerDescriptor,
  TextureSamplerInput,
  TextureStorageDescriptor,
  TextureWrapMode
} from './textureTypes'

/** 兼容既有source构造入口；布局尺寸由具体source解析，不由调用者重复声明。 */
export interface TextureOptions {
  readonly label: string
  readonly sampler?: TextureSamplerInput
  readonly storage: TextureStorageDescriptor
  readonly colorSpace: TextureColorSpace
  readonly mipmapPolicy?: TextureMipmapPolicy
}
export type TextureValidationErrorFactory = (reason: string) => Error
export interface TextureDescriptorSnapshot {
  readonly label: string
  readonly sampler: Readonly<TextureSamplerDescriptor>
  readonly storage: Readonly<TextureStorageDescriptor>
  readonly colorSpace: TextureColorSpace
  readonly mipmapPolicy: TextureMipmapPolicy
}
/** source子类提供的固定像素尺寸；不是GPU分配结果。 */
export interface TextureSourceLayout {
  readonly dimension: TextureDimension
  readonly width: number
  readonly height: number
}

/** 保留旧入口并集中复用规则；具体子类仍选择自己的领域错误。 */
export function createTextureDescriptorSnapshot(
  options: TextureOptions,
  createError: TextureValidationErrorFactory
): TextureDescriptorSnapshot {
  const error: TextureErrorFactory = (field, reason) => createError(field + ': ' + reason)
  const input = textureRecord(options, 'options', error)
  const label = textureLabel(input.label, error)
  const sampler = textureSamplerSnapshot(input.sampler, error)
  const storage = textureStorageSnapshot(input.storage, error)
  const colorSpace = textureChoice(
    input.colorSpace,
    ['srgb', 'linear', 'data'],
    'colorSpace',
    error
  )
  const mipmapPolicy = textureChoice(
    input.mipmapPolicy === undefined ? 'none' : input.mipmapPolicy,
    ['none', 'generate'],
    'mipmapPolicy',
    error
  )
  if (mipmapPolicy === 'none' && sampler.minFilter.includes('mipmap')) {
    throw createError('minFilter ' + sampler.minFilter + ' requires mipmapPolicy "generate"')
  }
  return Object.freeze({ label, sampler, storage, colorSpace, mipmapPolicy })
}

/**
 * CPU source纹理的兼容抽象base，直接继承唯一TextureResource。
 * [DESIGN-WEIGHT:3][texture-source-compatibility]
 * 旧sampler/storage/colorSpace/mipmapPolicy入口保持，新增descriptor描述固定布局。
 * generated source仍由现有Manager上传；RenderTexture不伪装成这个source类。
 */
export abstract class Texture extends TextureResource {
  public readonly sampler: Readonly<TextureSamplerDescriptor>
  public readonly storage: Readonly<TextureStorageDescriptor>
  public readonly colorSpace: TextureColorSpace
  public readonly mipmapPolicy: TextureMipmapPolicy

  protected constructor(
    options: TextureOptions,
    createError: TextureValidationErrorFactory,
    layout: TextureSourceLayout
  ) {
    const snapshot = createTextureDescriptorSnapshot(options, createError)
    super(
      {
        label: snapshot.label,
        descriptor: {
          ...layout,
          mipLevelCount:
            snapshot.mipmapPolicy === 'generate'
              ? fullTextureMipCount(layout.width, layout.height)
              : 1,
          storage: snapshot.storage,
          colorSpace: snapshot.colorSpace
        },
        defaultSampler: snapshot.sampler
      },
      'source',
      (field, reason) => createError(field + ': ' + reason)
    )
    this.sampler = this.defaultSampler
    this.storage = this.descriptor.storage
    this.colorSpace = this.descriptor.colorSpace
    this.mipmapPolicy = snapshot.mipmapPolicy
  }
}
