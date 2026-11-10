import { InvalidTextureSourceError } from '@/rendering/core/errors'
import {
  Texture,
  createTextureDescriptorSnapshot,
  type TextureOptions,
  type TextureValidationErrorFactory
} from './Texture'
import {
  copyTexturePixelSnapshot2D,
  createTexturePixelSnapshot2D,
  type TexturePixelSnapshot2D,
  type TexturePixelSource2D
} from './texturePixelSnapshot'
import { textureImageDimensions } from './textureImageDimensions'
import { textureDiagnosticLabel } from './textureResourceValidation'

/** 静态浏览器来源；不纳入Canvas/Video或动态update协议。 */
export type TextureImageSource = HTMLImageElement | ImageBitmap
export interface ImageTexture2DOptions extends TextureOptions {
  readonly source: TextureImageSource
}
export interface DataTexture2DOptions extends TextureOptions {
  readonly source: TexturePixelSource2D
}

/** 2D source分类节点；具体子类必须先验证并提供真实固定尺寸。 */
export abstract class Texture2D extends Texture {
  protected constructor(
    options: TextureOptions,
    createError: TextureValidationErrorFactory,
    dimensions: Readonly<{ width: number; height: number }>
  ) {
    super(options, createError, {
      dimension: '2d',
      width: dimensions.width,
      height: dimensions.height
    })
  }
}

/**
 * 已解码图片的静态逻辑资源；只借用图片，不接管close。
 * [DESIGN-WEIGHT:3][source-texture-fixed-layout]
 * 固定布局在构造完成前建立。首次实际上传仍由Manager验证真实浏览器对象、
 * source当前可用性及其尺寸是否仍等于descriptor，不能让外部变化改写布局。
 */
export class ImageTexture2D extends Texture2D {
  protected override readonly resourceType = 'ImageTexture2D'
  private sourceValue: TextureImageSource | null

  constructor(options: ImageTexture2DOptions) {
    const label = textureDiagnosticLabel(options?.label)
    const fail: TextureValidationErrorFactory = (reason) =>
      new InvalidTextureSourceError(label, reason)
    createTextureDescriptorSnapshot(options, fail)
    const dimensions = textureImageDimensions(options.source, 'source', (field, reason) =>
      fail(field + ': ' + reason)
    )
    super(options, fail, dimensions)
    this.sourceValue = options.source
  }

  /** 返回借用图片，资源关闭后不允许取出；不把它复制成CPU像素数组。 */
  get source(): TextureImageSource {
    this.assertUsable()
    return this.sourceValue!
  }
  get width(): number {
    return this.descriptor.width
  }
  get height(): number {
    return this.descriptor.height
  }

  /** 不调用ImageBitmap.close；所有者仍负责图片本身。 */
  protected override disposeCPUData(): void {
    this.sourceValue = null
  }
}

/** 深复制像素source；descriptor尺寸来自同一份已验证snapshot。 */
export class DataTexture2D extends Texture2D {
  protected override readonly resourceType = 'DataTexture2D'
  private sourceValue: TexturePixelSnapshot2D | null

  constructor(options: DataTexture2DOptions) {
    const label = textureDiagnosticLabel(options?.label)
    const fail: TextureValidationErrorFactory = (reason) =>
      new InvalidTextureSourceError(label, reason)
    const snapshot = createTextureDescriptorSnapshot(options, fail)
    const source = createTexturePixelSnapshot2D(options.source, snapshot.storage, fail)
    super(options, fail, source)
    this.sourceValue = source
  }

  get width(): number {
    return this.descriptor.width
  }
  get height(): number {
    return this.descriptor.height
  }

  /** 每次复制wrapper和TypedArray，调用方不能通过返回值改内部像素。 */
  copySource(): TexturePixelSource2D {
    this.assertUsable()
    return copyTexturePixelSnapshot2D(this.sourceValue!)
  }

  protected override disposeCPUData(): void {
    this.sourceValue = null
  }
}
