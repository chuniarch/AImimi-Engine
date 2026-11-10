/** backend无关的纹理维度；不包含WebGL枚举。 */
export type TextureDimension = '2d' | 'cube'
/** 来源由具体类固定；它不是“内容已生产”的状态。 */
export type TextureOrigin = 'source' | 'render'
export type TextureWrapMode = 'clamp-to-edge' | 'repeat' | 'mirrored-repeat'
export type TextureMagFilter = 'nearest' | 'linear'
export type TextureMinFilter =
  | 'nearest'
  | 'linear'
  | 'nearest-mipmap-nearest'
  | 'linear-mipmap-nearest'
  | 'nearest-mipmap-linear'
  | 'linear-mipmap-linear'
export type TextureFormat = 'r' | 'rg' | 'rgb' | 'rgba'
export type TextureDataType = 'uint8' | 'float32'
export type TextureColorSpace = 'srgb' | 'linear' | 'data'
/** source上传base后的普通mip策略，不表示GPU生成的roughness层。 */
export type TextureMipmapPolicy = 'none' | 'generate'
export interface TextureSamplerInput {
  readonly wrapS?: TextureWrapMode
  readonly wrapT?: TextureWrapMode
  readonly minFilter?: TextureMinFilter
  readonly magFilter?: TextureMagFilter
}
export interface TextureSamplerDescriptor {
  readonly wrapS: TextureWrapMode
  readonly wrapT: TextureWrapMode
  readonly minFilter: TextureMinFilter
  readonly magFilter: TextureMagFilter
}
export interface TextureStorageDescriptor {
  readonly format: TextureFormat
  readonly type: TextureDataType
}
/**
 * 单一纹理身份的固定布局。没有sampler、CPU像素、handle或生产完成标记。
 * [DESIGN-WEIGHT:3][texture-storage-single-identity]
 * mipLevelCount只是声明布局；不保证当前context已分配或所有内容已生产。
 */
export interface TextureResourceDescriptor {
  readonly dimension: TextureDimension
  readonly width: number
  readonly height: number
  readonly mipLevelCount: number
  readonly storage: Readonly<TextureStorageDescriptor>
  readonly colorSpace: TextureColorSpace
}
export interface TextureResourceOptions {
  readonly label: string
  readonly descriptor: TextureResourceDescriptor
  readonly defaultSampler?: TextureSamplerInput
}
export type CubeFace =
  | 'positive-x'
  | 'negative-x'
  | 'positive-y'
  | 'negative-y'
  | 'positive-z'
  | 'negative-z'
/** manual保留生产者手绘层；generated-from-base另由backend显式生成，不在CPU构造执行。 */
export type RenderTextureProduction = 'manual' | 'generated-from-base'
