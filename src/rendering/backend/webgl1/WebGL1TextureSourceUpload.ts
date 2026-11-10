import { InvalidTextureSourceError, UnsupportedRenderFeatureError } from '@/rendering/core/errors'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import {
  DataTexture2D,
  ImageTexture2D,
  type TextureImageSource
} from '@/rendering/resources/Texture2D'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import type { TextureResource } from '@/rendering/resources/TextureResource'
import type { TextureResourceDescriptor } from '@/rendering/resources/textureTypes'
import type { TexturePixelSource2D } from '@/rendering/resources/texturePixelSnapshot'
import { assertTextureOperation } from './WebGL1TextureUploadSupport'

type UploadFace =
  | ({ readonly kind: 'data' } & TexturePixelSource2D)
  | {
      readonly kind: 'image'
      readonly image: TextureImageSource
      readonly width: number
      readonly height: number
    }

/** 一次 get 捕获的 CPU 来源；不持有 handle、不订阅生命周期、不建立缓存。 */
export interface WebGL1TextureSourceSnapshot {
  readonly faces: readonly UploadFace[]
  readonly generateMipmap: boolean
}

/** 图片可被外部关闭或换源，首次上传仍检查真实像素尺寸；从不 close 借用图片。 */
function imageFace(image: TextureImageSource, label: string): UploadFace {
  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    if (!image.complete)
      throw new InvalidTextureSourceError(label, 'image has not finished loading')
    return { kind: 'image', image, width: image.naturalWidth, height: image.naturalHeight }
  }
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    return { kind: 'image', image, width: image.width, height: image.height }
  }
  throw new InvalidTextureSourceError(
    label,
    'expected HTMLImageElement or ImageBitmap in this realm'
  )
}

/**
 * 在分配前读取一次来源并验证固定布局，后续上传只消费这个快照。
 * @remarks
 * [DESIGN-WEIGHT:3][texture-storage-single-identity]
 * null 表示 RenderTexture 的无来源分配策略；未知子类不按 origin 猜测来源。
 */
export function readWebGL1TextureSource(
  texture: TextureResource,
  descriptor: TextureResourceDescriptor
): WebGL1TextureSourceSnapshot | null {
  if (texture instanceof RenderTexture) return null
  let faces: readonly UploadFace[]
  let generateMipmap: boolean
  if (texture instanceof DataTexture2D) {
    faces = [{ kind: 'data', ...texture.copySource() }]
    generateMipmap = texture.mipmapPolicy === 'generate'
  } else if (texture instanceof ImageTexture2D) {
    faces = [imageFace(texture.source, texture.label)]
    generateMipmap = texture.mipmapPolicy === 'generate'
  } else if (texture instanceof CubeTexture) {
    const source = texture.copySource()
    faces =
      source.kind === 'data'
        ? source.faces.map((face) => ({
            kind: 'data' as const,
            width: face.width,
            height: face.height,
            data: face.data
          }))
        : source.faces.map((face) => imageFace(face, texture.label))
    generateMipmap = texture.mipmapPolicy === 'generate'
  } else {
    throw new UnsupportedRenderFeatureError('texture ' + texture.label, 'unknown source class')
  }
  for (const face of faces) {
    if (face.width !== descriptor.width || face.height !== descriptor.height) {
      throw new InvalidTextureSourceError(
        texture.label,
        'source dimensions changed after construction'
      )
    }
  }
  return { faces, generateMipmap }
}

/** 已绑定 handle 的上传策略；每面检查错误和同步关闭，不分配/删除 GPU 对象。 */
export function uploadWebGL1TextureSource(
  gl: WebGLRenderingContext,
  target: number,
  format: number,
  type: number,
  source: WebGL1TextureSourceSnapshot,
  label: string,
  assertBuilding: () => void
): void {
  for (const [index, face] of source.faces.entries()) {
    assertBuilding()
    const faceTarget =
      target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + index : target
    if (face.kind === 'data')
      gl.texImage2D(faceTarget, 0, format, face.width, face.height, 0, format, type, face.data)
    else gl.texImage2D(faceTarget, 0, format, format, type, face.image)
    assertTextureOperation(gl, 'upload texture face ' + index, label)
    assertBuilding()
  }
}
