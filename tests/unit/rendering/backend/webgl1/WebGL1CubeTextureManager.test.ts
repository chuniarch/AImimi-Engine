import { afterEach, describe, expect, it, vi } from 'vitest'
import { CubeTexture, type CubeFaces } from '@/rendering/resources/CubeTexture'
import type { TextureOptions } from '@/rendering/resources/Texture'
import type { TexturePixelSource2D } from '@/rendering/resources/texturePixelSnapshot'
import {
  InvalidTextureSourceError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { WebGL1CubeTextureManager } from '@/rendering/backend/webgl1/WebGL1CubeTextureManager'
import { createFakeWebGL1TextureContext } from '../fakes/createFakeWebGL1TextureContext'

/** 每一面用不同首像素，能发现面序颠倒；不依赖 Manager 的映射代码生成期望值。 */
function cube(size = 2, options: Partial<TextureOptions> = {}): CubeTexture {
  const channels = options.storage?.format === 'rgb' ? 3 : options.storage?.format === 'r' ? 1 : 4
  const face = (value: number): TexturePixelSource2D => ({
    width: size,
    height: size,
    data:
      options.storage?.type === 'float32'
        ? new Float32Array(size * size * channels).fill(value)
        : new Uint8Array(size * size * channels).fill(value)
  })

  return new CubeTexture({
    label: 'sky',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    ...options,
    source: { kind: 'data', faces: [face(1), face(2), face(3), face(4), face(5), face(6)] }
  })
}

/** 只替换外部 GL；CubeTexture、Resource 和 Manager 都使用真实实现。 */
function setup(float = false, linear = false) {
  const fake = createFakeWebGL1TextureContext()
  const invalidateState = vi.fn(() => undefined)

  const manager = new WebGL1CubeTextureManager(
    fake.gl,
    {
      textureFloat: float ? {} : null,
      textureFloatLinear: linear ? {} : null
    },
    { invalidateState }
  )

  return { ...fake, manager, invalidateState }
}

afterEach(() => vi.unstubAllGlobals())

describe('WebGL1CubeTextureManager', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][cubemap-upload-transaction]
   * 少上传一面、颠倒面序或按 label 合并两个资源，都必须失败。
   */
  it('上传六面，按对象身份缓存，同 label 不共享 GPU 对象', () => {
    const f = setup()
    const texture = cube()
    const first = f.manager.get(texture)

    expect(f.manager.get(texture)).toBe(first)
    expect(f.api.texImage2D.mock.calls.map((args) => args[0])).toEqual([
      0x8515, 0x8516, 0x8517, 0x8518, 0x8519, 0x851a
    ])
    expect(f.api.texImage2D.mock.calls.map((args) => (args[8] as Uint8Array)[0])).toEqual([
      1, 2, 3, 4, 5, 6
    ])
    expect(f.manager.get(cube()).handle).not.toBe(first.handle)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][texture-upload-state-scope]
   * 旧 unit 为 3，旧 alignment 为 8；不能恢复到硬编码的 unit 0/default 值。
   */
  it('恢复当前 texture unit、binding 和四个 unpack 参数', () => {
    const f = setup()
    const old = f.api.createTexture()

    f.api.activeTexture(f.gl.TEXTURE0 + 3)
    f.api.bindTexture(f.gl.TEXTURE_CUBE_MAP, old)
    f.api.pixelStorei(f.gl.UNPACK_ALIGNMENT, 8)
    f.api.pixelStorei(f.gl.UNPACK_FLIP_Y_WEBGL, true)
    f.api.pixelStorei(f.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)

    f.manager.get(cube(3, { storage: { format: 'rgb', type: 'uint8' } }))

    expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 3)
    expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_CUBE_MAP)).toBe(old)
    expect(f.gl.getParameter(f.gl.UNPACK_ALIGNMENT)).toBe(8)
    expect(f.gl.getParameter(f.gl.UNPACK_FLIP_Y_WEBGL)).toBe(true)
    expect(f.gl.getParameter(f.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(true)
    expect(f.gl.getParameter(f.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)).toBe(
      f.gl.BROWSER_DEFAULT_WEBGL
    )
    expect(f.uploads[0]?.alignment).toBe(1)
    expect(f.invalidateState).toHaveBeenCalled()
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
  })

  it.each([
    { sampler: { wrapS: 'repeat' as const } },
    { sampler: { wrapT: 'mirrored-repeat' as const } },
    { mipmapPolicy: 'generate' as const }
  ])('在创建 GPU 对象前拒绝非法 NPOT 组合 %j', (options) => {
    const f = setup()
    expect(() => f.manager.get(cube(3, options))).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  it('POT 按明确策略生成 mipmap，不偷偷改 sampler', () => {
    const f = setup()

    f.manager.get(
      cube(4, {
        sampler: { wrapS: 'repeat', minFilter: 'linear-mipmap-linear' },
        mipmapPolicy: 'generate'
      })
    )

    expect(f.api.generateMipmap).toHaveBeenCalledWith(f.gl.TEXTURE_CUBE_MAP)
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_CUBE_MAP,
      f.gl.TEXTURE_WRAP_S,
      f.gl.REPEAT
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][cubemap-storage-color-contract]
   * 浮点上传和浮点线性过滤是两个独立能力，不能只检查前者。
   */
  it('浮点 nearest 只要求 float，linear 还要求 float-linear', () => {
    const nearest = cube(2, {
      storage: { format: 'rgba', type: 'float32' },
      sampler: { minFilter: 'nearest', magFilter: 'nearest' }
    })

    expect(() => setup().manager.get(nearest)).toThrow(UnsupportedRenderFeatureError)

    const f = setup(true)
    f.manager.get(nearest)
    expect(f.api.texImage2D.mock.calls[0]?.[7]).toBe(f.gl.FLOAT)

    expect(() =>
      f.manager.get(
        cube(2, {
          storage: { format: 'rgba', type: 'float32' }
        })
      )
    ).toThrow(UnsupportedRenderFeatureError)

    expect(() =>
      setup(true, true).manager.get(
        cube(2, {
          storage: { format: 'rgba', type: 'float32' }
        })
      )
    ).not.toThrow()
  })

  it('明确拒绝本批未实现的 r 通道和 float mipmap', () => {
    expect(() =>
      setup().manager.get(
        cube(2, {
          storage: { format: 'r', type: 'uint8' }
        })
      )
    ).toThrow(UnsupportedRenderFeatureError)

    expect(() =>
      setup(true, true).manager.get(
        cube(2, {
          storage: { format: 'rgba', type: 'float32' },
          mipmapPolicy: 'generate'
        })
      )
    ).toThrow(UnsupportedRenderFeatureError)
  })

  it('sRGB 必须用扩展格式，不得当作线性 RGBA 上传', () => {
    const texture = cube(2, { colorSpace: 'srgb' })

    expect(() => setup().manager.get(texture)).toThrow(UnsupportedRenderFeatureError)

    const f = setup()
    f.api.getExtension.mockReturnValue({ SRGB_EXT: 0x8c40, SRGB_ALPHA_EXT: 0x8c42 })
    f.manager.get(texture)

    expect(f.api.texImage2D.mock.calls[0]?.[2]).toBe(0x8c42)
    expect(f.api.texImage2D.mock.calls[0]?.[6]).toBe(0x8c42)
  })

  it('HTMLImageElement 使用 natural 尺寸并拒绝未加载图片', () => {
    class ImageDouble {
      complete = true
      naturalWidth = 4
      naturalHeight = 4
      width = 1
      height = 1
    }

    vi.stubGlobal('HTMLImageElement', ImageDouble)

    const image = new ImageDouble()
    const source = image as unknown as HTMLImageElement
    const faces: CubeFaces<HTMLImageElement> = [source, source, source, source, source, source]

    const texture = new CubeTexture({
      label: 'image',
      source: { kind: 'images', faces },
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear'
    })

    const f = setup()
    image.complete = false

    expect(() => f.manager.get(texture)).toThrow(InvalidTextureSourceError)
    expect(f.api.createTexture).not.toHaveBeenCalled()

    image.complete = true
    f.manager.get(texture)

    expect(f.api.texImage2D.mock.calls[0]).toEqual([
      0x8515,
      0,
      f.gl.RGBA,
      f.gl.RGBA,
      f.gl.UNSIGNED_BYTE,
      image
    ])
  })

  it('null 创建和 GL 上传失败不留下缓存或半成品，可重试', () => {
    const f = setup()
    const texture = cube()

    f.api.createTexture.mockReturnValueOnce(null)
    expect(() => f.manager.get(texture)).toThrow(WebGLResourceCreationError)

    f.api.texImage2D.mockImplementationOnce(() => f.setError(f.gl.OUT_OF_MEMORY))
    expect(() => f.manager.get(texture)).toThrow(WebGLOperationError)

    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
    expect(() => f.manager.get(texture)).not.toThrow()
    expect(f.api.texImage2D).toHaveBeenCalledTimes(7)
  })

  it('ImageBitmap 使用像素尺寸，拒绝已关闭或尺寸不一致的面，不替 owner close', () => {
    class BitmapDouble {
      width = 4
      height = 4
      close = vi.fn()
    }

    vi.stubGlobal('ImageBitmap', BitmapDouble)

    const bitmaps = Array.from({ length: 6 }, () => new BitmapDouble())
    const faces = bitmaps as unknown as CubeFaces<ImageBitmap>

    const texture = new CubeTexture({
      label: 'bitmaps',
      source: { kind: 'images', faces },
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear'
    })

    const f = setup()
    bitmaps[5]!.width = 0
    expect(() => f.manager.get(texture)).toThrow(InvalidTextureSourceError)

    bitmaps[5]!.width = 8
    bitmaps[5]!.height = 8
    expect(() => f.manager.get(texture)).toThrow(InvalidTextureSourceError)

    bitmaps[5]!.width = 4
    bitmaps[5]!.height = 4
    f.manager.get(texture)
    texture.dispose()

    expect(bitmaps[0]!.close).not.toHaveBeenCalled()
  })

  it('DOM 安全异常原样报告，同时清理半成品并恢复绑定', () => {
    const f = setup()
    const old = f.api.createTexture()

    f.gl.bindTexture(f.gl.TEXTURE_CUBE_MAP, old)

    const failure = new DOMException('origin is not clean', 'SecurityError')
    f.api.texImage2D.mockImplementationOnce(() => {
      throw failure
    })

    expect(() => f.manager.get(cube())).toThrow(failure)
    expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_CUBE_MAP)).toBe(old)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('同一个 CPU 对象在两个 context 各有自己的 GPU 表示', () => {
    const first = setup()
    const second = setup()
    const texture = cube()

    expect(first.manager.get(texture).handle).not.toBe(second.manager.get(texture).handle)

    first.manager.release(texture)
    expect(first.api.deleteTexture).toHaveBeenCalledTimes(1)
    expect(second.api.deleteTexture).not.toHaveBeenCalled()

    texture.dispose()
    expect(second.api.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('创建返回 null 但已经 lost 时，优先报告 context loss', () => {
    const f = setup()

    f.api.createTexture.mockImplementationOnce(() => {
      f.setLost(true)
      return null
    })

    expect(() => f.manager.get(cube())).toThrow(WebGLContextLostError)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })

  it('CPU dispose 自动删除；Manager dispose 退订且不 dispose CPU', () => {
    const f = setup()
    const a = cube()
    const b = cube()

    f.manager.get(a)
    f.manager.get(b)

    a.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
    expect(() => f.manager.get(a)).toThrow(ResourceDisposedError)

    f.manager.dispose()
    f.manager.dispose()
    expect(b.disposed).toBe(false)

    b.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(() => f.manager.get(cube())).toThrow(WebGLBackendDisposedError)
  })

  it('上传中丢失 context 不删除失效 handle，旧 Manager 恢复后仍不可用', () => {
    const f = setup()
    const texture = cube()

    f.api.texImage2D.mockImplementationOnce(() => f.setLost(true))
    expect(() => f.manager.get(texture)).toThrow(WebGLContextLostError)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()

    f.setLost(false)
    expect(() => f.manager.get(texture)).toThrow(WebGLContextLostError)

    f.manager.dispose()
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })
})
