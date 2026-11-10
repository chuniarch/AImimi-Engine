import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DataTexture2D,
  ImageTexture2D,
  Texture2D,
  type TextureImageSource
} from '@/rendering/resources/Texture2D'
import type { TextureOptions } from '@/rendering/resources/Texture'
import {
  InvalidTextureSourceError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { WebGL1TextureManager } from '@/rendering/backend/webgl1/WebGL1TextureManager'
import { createFakeWebGL1TextureContext } from '../fakes/createFakeWebGL1TextureContext'

/** 独立生成完整像素，不借用被测 Manager 的通道映射来计算期望值。 */
function dataTexture(width = 2, height = 2, options: Partial<TextureOptions> = {}) {
  const channels = { r: 1, rg: 2, rgb: 3, rgba: 4 }[options.storage?.format ?? 'rgba']
  const length = width * height * channels
  return new DataTexture2D({
    label: 'hw1/albedo',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    ...options,
    source: {
      width,
      height,
      data:
        options.storage?.type === 'float32'
          ? new Float32Array(length).fill(0.25)
          : new Uint8Array(length).fill(128)
    }
  })
}

/** 仅替换 GL 边界；CPU 资源、生命周期和 Manager 均为真实实现。 */
function setup(float = false, linear = false) {
  const fake = createFakeWebGL1TextureContext()
  const invalidateState = vi.fn(() => undefined)
  const manager = new WebGL1TextureManager(
    fake.gl,
    { textureFloat: float ? {} : null, textureFloatLinear: linear ? {} : null },
    new WebGL1ResourceGeneration(fake.gl),
    { invalidateState, assertAvailable: () => {}, beforeDelete: () => undefined }
  )
  return { ...fake, manager, invalidateState }
}

/** Node 测试只模拟浏览器对象边界；像素方向由独立 browser 测试验证。 */
class TestImage {
  complete = true
  naturalWidth = 2
  naturalHeight = 2
  width = 900
  height = 900
}

/** close 后尺寸归零；Manager 不拥有图片，所以不能主动调用 close。 */
class TestBitmap {
  width = 2
  height = 2
  close = vi.fn(() => {
    this.width = 0
    this.height = 0
  })
}

/** 保留原对象身份；不把模拟图片当作真正 GPU 像素证据。 */
function imageTexture(source: object, options: Partial<TextureOptions> = {}) {
  return new ImageTexture2D({
    label: 'hw1/image',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    ...options,
    source: source as TextureImageSource
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('WebGL1TextureManager', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
   * Given RGB 每行 9 字节；When 上传两行；Then alignment 必须为 1。
   * 身份缓存既不能按 label 合并对象，也不能跨 context 共享 handle。
   */
  it('紧密 RGB 上传，缓存按对象及 context 隔离', () => {
    const f = setup()
    const cpu = dataTexture(3, 2, { storage: { format: 'rgb', type: 'uint8' } })
    const gpu = f.manager.get(cpu)
    expect(gpu.target).toBe(f.gl.TEXTURE_2D)
    expect(f.uploads[0]?.args).toEqual([
      f.gl.TEXTURE_2D,
      0,
      f.gl.RGB,
      3,
      2,
      0,
      f.gl.RGB,
      f.gl.UNSIGNED_BYTE,
      new Uint8Array(18).fill(128)
    ])
    expect(f.uploads[0]?.alignment).toBe(1)
    expect(f.manager.get(cpu)).toBe(gpu)
    expect(f.api.texImage2D).toHaveBeenCalledTimes(1)
    expect(f.manager.get(dataTexture()).handle).not.toBe(gpu.handle)
    expect(setup().manager.get(cpu).handle).not.toBe(gpu.handle)
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
  })

  /** Given 显示宽高远超设备上限；When 上传；Then 使用 naturalWidth/naturalHeight。 */
  it('图片上传使用真实像素尺寸和图片重载，借用 Bitmap 不 close', () => {
    vi.stubGlobal('HTMLImageElement', TestImage)
    vi.stubGlobal('ImageBitmap', TestBitmap)
    const f = setup()
    f.parameters.set(f.gl.MAX_TEXTURE_SIZE, 4)
    const image = new TestImage()
    const bitmap = new TestBitmap()
    f.manager.get(imageTexture(image))
    const cpu = imageTexture(bitmap)
    f.manager.get(cpu)
    expect(f.uploads[0]?.args).toEqual([
      f.gl.TEXTURE_2D,
      0,
      f.gl.RGBA,
      f.gl.RGBA,
      f.gl.UNSIGNED_BYTE,
      image
    ])
    f.manager.dispose()
    expect(cpu.disposed).toBe(false)
    expect(bitmap.close).not.toHaveBeenCalled()
  })

  /** Given 来源还未加载或已失效；When 首次上传；Then 在分配之前拒绝。 */
  it.each(['unloaded', 'zero', 'fractional', 'closed', 'invalid'] as const)(
    '拒绝图片来源 %s',
    (kind) => {
      vi.stubGlobal('HTMLImageElement', TestImage)
      vi.stubGlobal('ImageBitmap', TestBitmap)
      const f = setup()
      const image = new TestImage()
      if (kind === 'unloaded') image.complete = false
      if (kind === 'zero') image.naturalWidth = 0
      if (kind === 'fractional') image.naturalHeight = 1.5
      const bitmap = new TestBitmap()
      bitmap.close()
      const source = kind === 'closed' ? bitmap : kind === 'invalid' ? {} : image
      expect(() => f.manager.get(imageTexture(source))).toThrow(InvalidTextureSourceError)
      expect(f.api.createTexture).not.toHaveBeenCalled()
    }
  )

  /** 新子类不能在尚无上传协议时被误当 DataTexture2D。 */
  it('明确拒绝未知 Texture2D 子类', () => {
    class CustomTexture extends Texture2D {
      protected readonly resourceType = 'CustomTexture'
      constructor() {
        super(
          { label: 'custom', storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' },
          (reason) => new InvalidTextureSourceError('custom', reason),
          { width: 1, height: 1 }
        )
      }
      protected disposeCPUData(): void {}
    }
    const f = setup()
    expect(() => f.manager.get(new CustomTexture())).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  /** 不以静默降级掩盖颜色、通道、NPOT 或设备限制。 */
  it.each([
    { storage: { format: 'r', type: 'uint8' } },
    { storage: { format: 'rg', type: 'uint8' } },
    { sampler: { wrapS: 'repeat' } },
    { sampler: { wrapT: 'mirrored-repeat' } },
    { mipmapPolicy: 'generate', sampler: { minFilter: 'nearest-mipmap-nearest' } }
  ] satisfies Partial<TextureOptions>[])('分配前拒绝不支持的描述 %j', (options) => {
    const f = setup()
    expect(() => f.manager.get(dataTexture(3, 2, options))).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  /** 设备限制作用于宽和高，不能只检查正方形的一条边。 */
  it.each([
    [5, 2],
    [2, 5]
  ])('拒绝超过 MAX_TEXTURE_SIZE 的 %ix%i', (width, height) => {
    const f = setup()
    f.parameters.set(f.gl.MAX_TEXTURE_SIZE, 4)
    expect(() => f.manager.get(dataTexture(width, height))).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  /** POT + uint8 的自动 mip 是明确请求，不是每次上传的隐含行为。 */
  it('保留 POT sampler 并按策略生成 mip', () => {
    const f = setup()
    f.manager.get(
      dataTexture(4, 2, {
        sampler: { wrapS: 'repeat', wrapT: 'mirrored-repeat', minFilter: 'linear-mipmap-linear' },
        mipmapPolicy: 'generate'
      })
    )
    expect(f.api.generateMipmap).toHaveBeenCalledWith(f.gl.TEXTURE_2D)
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_WRAP_S,
      f.gl.REPEAT
    )
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_WRAP_T,
      f.gl.MIRRORED_REPEAT
    )
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_MIN_FILTER,
      f.gl.LINEAR_MIPMAP_LINEAR
    )
  })

  /** float 可上传不等于 float 可线性过滤；两个能力分别验证。 */
  it('浮点数据分别检查上传和线性过滤能力', () => {
    const options: Partial<TextureOptions> = { storage: { format: 'rgba', type: 'float32' } }
    const nearest = dataTexture(2, 2, {
      ...options,
      sampler: { minFilter: 'nearest', magFilter: 'nearest' }
    })
    const absent = setup()
    expect(() => absent.manager.get(nearest)).toThrow(UnsupportedRenderFeatureError)
    expect(absent.api.createTexture).not.toHaveBeenCalled()
    const f = setup(true)
    f.manager.get(nearest)
    expect(f.uploads[0]?.args[7]).toBe(f.gl.FLOAT)
    const linear = dataTexture(2, 2, options)
    const noLinear = setup(true)
    expect(() => noLinear.manager.get(linear)).toThrow(UnsupportedRenderFeatureError)
    expect(noLinear.api.createTexture).not.toHaveBeenCalled()
    expect(() => setup(true, true).manager.get(linear)).not.toThrow()
  })

  /** 即使扩展存在，也不承诺本批尚未实现的浮点 mip 与 sRGB 存储组合。 */
  it.each([
    { mipmapPolicy: 'generate' },
    { colorSpace: 'srgb' }
  ] satisfies Partial<TextureOptions>[])('拒绝浮点组合 %j', (extra) => {
    const f = setup(true, true)
    expect(() =>
      f.manager.get(
        dataTexture(2, 2, {
          storage: { format: 'rgba', type: 'float32' },
          ...extra
        })
      )
    ).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  /** HTML 图片不能假装已经持有 float32 像素数组。 */
  it('float32 不接受图片来源', () => {
    vi.stubGlobal('HTMLImageElement', TestImage)
    const f = setup(true, true)
    expect(() =>
      f.manager.get(
        imageTexture(new TestImage(), {
          storage: { format: 'rgba', type: 'float32' }
        })
      )
    ).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })

  /** sRGB 使用扩展格式；缺失扩展时不能悄悄上传成线性 RGBA。 */
  it.each(['rgb', 'rgba'] as const)('sRGB %s 查询并使用当前 context 的扩展', (format) => {
    const cpu = dataTexture(2, 2, { storage: { format, type: 'uint8' }, colorSpace: 'srgb' })
    const absent = setup()
    expect(() => absent.manager.get(cpu)).toThrow(UnsupportedRenderFeatureError)
    expect(absent.api.createTexture).not.toHaveBeenCalled()
    const f = setup()
    f.api.getExtension.mockReturnValue({ SRGB_EXT: 0x8c40, SRGB_ALPHA_EXT: 0x8c42 })
    f.manager.get(cpu)
    const expectedFormat = format === 'rgb' ? 0x8c40 : 0x8c42
    expect(f.uploads[0]?.args[2]).toBe(expectedFormat)
    expect(f.uploads[0]?.args[6]).toBe(expectedFormat)
    f.manager.get(dataTexture(2, 2, { storage: { format, type: 'uint8' }, colorSpace: 'srgb' }))
    expect(f.api.getExtension).toHaveBeenCalledExactlyOnceWith('EXT_sRGB')
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
   * Given 非默认外部状态；When 上传成功/失败；Then 恢复快照而非默认值。
   * 失败后的下一次 get 必须重新尝试，不能返回半成品缓存。
   */
  it.each(['success', 'null', 'throw', 'gl-error'] as const)('上传 %s 后恢复状态', (kind) => {
    const f = setup()
    const old = f.api.createTexture()
    f.gl.activeTexture(f.gl.TEXTURE0 + 3)
    f.gl.bindTexture(f.gl.TEXTURE_2D, old)
    f.gl.pixelStorei(f.gl.UNPACK_ALIGNMENT, 8)
    f.gl.pixelStorei(f.gl.UNPACK_FLIP_Y_WEBGL, true)
    f.gl.pixelStorei(f.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    const failure = new Error('upload failed')
    if (kind === 'null') f.api.createTexture.mockReturnValueOnce(null)
    if (kind === 'throw')
      f.api.texImage2D.mockImplementationOnce(() => {
        throw failure
      })
    if (kind === 'gl-error')
      f.api.texImage2D.mockImplementationOnce(() => f.setError(f.gl.OUT_OF_MEMORY))
    const cpu = dataTexture()
    if (kind === 'success') f.manager.get(cpu)
    else
      expect(() => f.manager.get(cpu)).toThrow(
        kind === 'null'
          ? WebGLResourceCreationError
          : kind === 'throw'
            ? failure
            : WebGLOperationError
      )
    expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 3)
    expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_2D)).toBe(old)
    expect(f.gl.getParameter(f.gl.UNPACK_ALIGNMENT)).toBe(8)
    expect(f.gl.getParameter(f.gl.UNPACK_FLIP_Y_WEBGL)).toBe(true)
    expect(f.gl.getParameter(f.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(true)
    expect(f.gl.getParameter(f.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)).toBe(
      f.gl.BROWSER_DEFAULT_WEBGL
    )
    expect(f.deleted).not.toContain(old)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(
      kind === 'throw' || kind === 'gl-error' ? 1 : 0
    )
    expect(f.invalidateState).toHaveBeenCalled()
    const beforeRetry = f.api.createTexture.mock.calls.length
    f.manager.get(cpu)
    expect(f.api.createTexture).toHaveBeenCalledTimes(beforeRetry + (kind === 'success' ? 0 : 1))
  })

  /** 上传中丢失 context 后，不再恢复旧 binding 或删除旧代对象。 */
  it('上传中 lost 只丢弃旧代，新 Manager 可以重传 CPU 来源', () => {
    const f = setup()
    const cpu = dataTexture()
    f.api.texImage2D.mockImplementationOnce(() => {
      f.setLost(true)
      f.api.bindTexture.mockClear()
      f.api.activeTexture.mockClear()
      f.api.pixelStorei.mockClear()
    })
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    expect(f.api.bindTexture).not.toHaveBeenCalled()
    expect(f.api.activeTexture).not.toHaveBeenCalled()
    expect(f.api.pixelStorei).not.toHaveBeenCalled()
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
    f.setLost(false)
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    const next = new WebGL1TextureManager(
      f.gl,
      { textureFloat: null, textureFloatLinear: null },
      new WebGL1ResourceGeneration(f.gl),
      {
        invalidateState: f.invalidateState,
        assertAvailable: () => {},
        beforeDelete: () => undefined
      }
    )
    expect(() => next.get(cpu)).not.toThrow()
    expect(cpu.disposed).toBe(false)
  })

  /** CPU 先标记 disposed 再通知；release 不能再查询 CPU source。 */
  it('CPU 释放删除 GPU，Manager 释放不接管 CPU 所有权', () => {
    const f = setup()
    const a = dataTexture()
    const b = dataTexture()
    const first = f.manager.get(a)
    f.manager.get(b)
    a.dispose()
    f.manager.release(a)
    expect(f.deleted.filter((handle) => handle === first.handle)).toHaveLength(1)
    expect(() => f.manager.get(a)).toThrow(ResourceDisposedError)
    f.manager.dispose()
    f.manager.dispose()
    expect(b.disposed).toBe(false)
    b.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(() => f.manager.get(dataTexture())).toThrow(WebGLBackendDisposedError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
   * Given 两个 GPU 对象；When 第二个删除抛错；Then 保留待清理项，
   * 下一次 dispose 只重试失败项，不能重复删除已成功项。
   */
  it('dispose 中途失败仍关闭 get，并可继续剩余清理', () => {
    const f = setup()
    const a = dataTexture()
    const b = dataTexture()
    const first = f.manager.get(a).handle
    const second = f.manager.get(b).handle
    const failure = new Error('delete failed')
    f.api.deleteTexture
      .mockImplementationOnce((handle) => {
        f.deleted.push(handle)
      })
      .mockImplementationOnce(() => {
        throw failure
      })
    expectCleanupCause(() => f.manager.dispose(), failure)
    expect(() => f.manager.get(a)).toThrow(WebGLBackendDisposedError)
    expect(a.disposed).toBe(false)
    expect(b.disposed).toBe(false)
    f.manager.dispose()
    expect(f.deleted.filter((handle) => handle === first)).toHaveLength(1)
    expect(f.deleted.filter((handle) => handle === second)).toHaveLength(1)
    a.dispose()
    b.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(3)
  })

  /** 已缓存对象遇到 lost 只取消订阅，不在随后 CPU dispose 时发旧代 delete。 */
  it('显式 lost 丢弃已缓存 GPU，恢复不复活旧 Manager', () => {
    const f = setup()
    const cpu = dataTexture()
    f.manager.get(cpu)
    f.setLost(true)
    f.manager.invalidateForContextLoss()
    f.setLost(false)
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    f.manager.dispose()
    cpu.dispose()
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })
})

describe('Texture cleanup progress', () => {
  /** 真实 Resource 的捕获任务应能在删除失败后继续，而不是找不到已移出的 Entry。 */
  it('Resource.dispose 失败后再次调用会完成 GPU 清理', () => {
    const f = setup()
    const cpu = dataTexture()
    const gpu = f.manager.get(cpu)
    f.api.deleteTexture.mockImplementationOnce(() => {
      throw new Error('delete texture')
    })
    expect(() => cpu.dispose()).toThrow(CleanupFailureError)
    expect(cpu.cleanupState).toBe('failed')
    cpu.dispose()
    expect(cpu.cleanupState).toBe('complete')
    expect(f.deleted.filter((value) => value === gpu.handle)).toHaveLength(1)
  })

  /** 直接 Manager.release 中触发 Resource.dispose 时，注册任务仍须存在。 */
  it('同步重入不重复删除，也不让 Resource 提前 complete', () => {
    const f = setup()
    const cpu = dataTexture()
    const gpu = f.manager.get(cpu)
    const remove = f.api.deleteTexture.getMockImplementation()!
    f.api.deleteTexture.mockImplementationOnce((handle) => {
      expect(() => cpu.dispose()).toThrow(CleanupFailureError)
      expect(cpu.cleanupState).toBe('failed')
      remove(handle)
    })
    f.manager.release(cpu)
    cpu.dispose()
    expect(cpu.cleanupState).toBe('complete')
    expect(f.deleted.filter((value) => value === gpu.handle)).toHaveLength(1)
  })

  /** 关闭失败不恢复 get；正常返回的 dispose 才可让上层继续依赖清理。 */
  it('整体关闭失败后继续剩余工作，running 重入必须报告未完成', () => {
    const f = setup()
    const cpu = dataTexture()
    f.manager.get(cpu)
    f.api.deleteTexture.mockImplementationOnce(() => {
      expect(() => f.manager.dispose()).toThrow(CleanupFailureError)
      throw new Error('first delete')
    })
    expect(() => f.manager.dispose()).toThrow(CleanupFailureError)
    expect(() => f.manager.get(cpu)).toThrow(WebGLBackendDisposedError)
    f.manager.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
  })
})

/** 清理错误统一包装，但最底层原始异常的身份必须完整保留。 */
function expectCleanupCause(action: () => void, expected: unknown): void {
  let failure: unknown
  try {
    action()
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(CleanupFailureError)
  const causes: unknown[] = []
  const visit = (error: unknown): void => {
    causes.push(error)
    if (error instanceof CleanupFailureError) {
      for (const entry of error.failures) visit(entry.cause)
    }
  }
  visit(failure)
  expect(causes).toContain(expected)
}
