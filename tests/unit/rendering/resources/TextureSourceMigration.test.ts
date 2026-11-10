import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidCubeTextureError, InvalidTextureSourceError } from '@/rendering/core/errors'
import { TextureResource } from '@/rendering/resources/TextureResource'
import { CubeTexture, type CubeFaces } from '@/rendering/resources/CubeTexture'
import {
  DataTexture2D,
  ImageTexture2D,
  type TextureImageSource
} from '@/rendering/resources/Texture2D'
import { WebGL1TextureManager } from '@/rendering/backend/webgl1/WebGL1TextureManager'
import { createFakeWebGL1TextureContext } from '../backend/fakes/createFakeWebGL1TextureContext'

/** Node图片边界替身；GPU颜色依旧由已有browser测试独立验证。 */
class Bitmap {
  width = 4
  height = 4
  close = vi.fn()
}

/** 六面容器保留同一图片身份，便于验证统一存储布局而非复制图片对象。 */
function faces(image: TextureImageSource): CubeFaces<TextureImageSource> {
  return [image, image, image, image, image, image]
}

afterEach(() => vi.unstubAllGlobals())

describe('C1 source migration compatibility', () => {
  it('data与cube共享TextureResource祖先，布局从已复制source推导', () => {
    const pixels = new Uint8Array(16).fill(2)
    const texture = new DataTexture2D({
      label: 'D',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data',
      source: { width: 2, height: 2, data: pixels },
      mipmapPolicy: 'generate'
    })
    pixels[0] = 99
    expect(texture).toBeInstanceOf(TextureResource)
    expect(texture.origin).toBe('source')
    expect(texture.descriptor).toMatchObject({
      dimension: '2d',
      width: 2,
      height: 2,
      mipLevelCount: 2
    })
    expect(texture.copySource().data[0]).toBe(2)
    expect(texture.sampler).toBe(texture.defaultSampler)
    const f = { width: 1, height: 1, data: new Uint8Array(4) }
    const cube = new CubeTexture({
      label: 'cube',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data',
      source: { kind: 'data', faces: [f, f, f, f, f, f] }
    })
    expect(cube).toBeInstanceOf(TextureResource)
    expect(cube.descriptor.dimension).toBe('cube')
  })

  it('HTML图片在构造时必须decoded，使用natural尺寸而非CSS尺寸', () => {
    const image = {
      complete: true,
      naturalWidth: 16,
      naturalHeight: 8,
      width: 900,
      height: 900
    } as HTMLImageElement
    const texture = new ImageTexture2D({
      label: 'I',
      source: image,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'srgb'
    })
    expect(texture.source).toBe(image)
    expect(texture.descriptor).toMatchObject({ width: 16, height: 8 })
    expect(
      () =>
        new ImageTexture2D({
          label: 'early',
          source: { ...image, complete: false },
          storage: { format: 'rgba', type: 'uint8' },
          colorSpace: 'srgb'
        })
    ).toThrow(InvalidTextureSourceError)
  })

  it.each([{ width: 0, height: 4 }, { width: 4, height: 1.5 }, {}])(
    '图片构造拒绝不确定布局 %j',
    (source) => {
      expect(
        () =>
          new ImageTexture2D({
            label: 'I',
            source: source as TextureImageSource,
            storage: { format: 'rgba', type: 'uint8' },
            colorSpace: 'linear'
          })
      ).toThrow(InvalidTextureSourceError)
    }
  )

  it('image cube在构造时检查六面同尺寸与square，仍不close图片', () => {
    const image = new Bitmap()
    const cube = new CubeTexture({
      label: 'cube',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear',
      source: { kind: 'images', faces: faces(image as ImageBitmap) }
    })
    expect(cube.descriptor.width).toBe(4)
    cube.dispose()
    expect(image.close).not.toHaveBeenCalled()
    const rectangle = { width: 4, height: 2 } as ImageBitmap
    expect(
      () =>
        new CubeTexture({
          label: 'bad',
          storage: { format: 'rgba', type: 'uint8' },
          colorSpace: 'linear',
          source: { kind: 'images', faces: faces(rectangle) }
        })
    ).toThrow(InvalidCubeTextureError)
  })

  /** 构造成功不代表后来图片尺寸永远不变；首次上传必须与固定布局一致。 */
  it('二维图片在首次上传前变化尺寸时零分配拒绝', () => {
    vi.stubGlobal('ImageBitmap', Bitmap)
    const image = new Bitmap()
    const texture = new ImageTexture2D({
      label: 'I',
      source: image as ImageBitmap,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear'
    })
    image.width = 8
    const fake = createFakeWebGL1TextureContext()
    const manager = new WebGL1TextureManager(
      fake.gl,
      { textureFloat: null, textureFloatLinear: null },
      new WebGL1ResourceGeneration(fake.gl),
      { invalidateState: vi.fn(), assertAvailable: () => {}, beforeDelete: () => undefined }
    )
    expect(() => manager.get(texture)).toThrow(InvalidTextureSourceError)
    expect(fake.api.createTexture).not.toHaveBeenCalled()
  })

  it('六面一起变大也不能默默背离固定cube布局', () => {
    vi.stubGlobal('ImageBitmap', Bitmap)
    const image = new Bitmap()
    const texture = new CubeTexture({
      label: 'C',
      source: { kind: 'images', faces: faces(image as ImageBitmap) },
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear'
    })
    image.width = 8
    image.height = 8
    const fake = createFakeWebGL1TextureContext()
    const manager = new WebGL1TextureManager(
      fake.gl,
      { textureFloat: null, textureFloatLinear: null },
      new WebGL1ResourceGeneration(fake.gl),
      { invalidateState: vi.fn(), assertAvailable: () => {}, beforeDelete: () => undefined }
    )
    expect(() => manager.get(texture)).toThrow(InvalidTextureSourceError)
    expect(fake.api.createTexture).not.toHaveBeenCalled()
  })
})
