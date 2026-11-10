import { describe, expect, it, vi } from 'vitest'
import { Resource } from '@/rendering/core/Resource'
import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidTextureResourceError } from '@/rendering/core/errors/InvalidTextureResourceError'
import { RenderTexture, type RenderTextureOptions } from '@/rendering/resources/RenderTexture'
import { TextureResource } from '@/rendering/resources/TextureResource'

/** 独立生成256 cube/9层描述，测试不复用生产验证helper。 */
function options(): RenderTextureOptions {
  return {
    label: 'env/P',
    production: 'manual',
    descriptor: {
      dimension: 'cube',
      width: 256,
      height: 256,
      mipLevelCount: 9,
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'linear'
    }
  }
}

describe('C1 TextureResource single identity', () => {
  /** 同一实例直接继承Resource，不能另包一层资源或第二套引用数。 */
  it('RenderTexture具有唯一Resource祖先和稳定origin', () => {
    const texture = new RenderTexture(options())
    expect(texture).toBeInstanceOf(TextureResource)
    expect(texture).toBeInstanceOf(Resource)
    expect(texture.origin).toBe('render')
    expect(texture.production).toBe('manual')
    expect(texture.sceneReferenceCount).toBe(0)
    expect(texture.disposed).toBe(false)
    expect(Object.isFrozen(texture)).toBe(false)
  })

  /** wrapper/storage深冻结，不能把调用者对象留作可修改的布局。 */
  it('复制并冻结布局和sampler，不冻结调用者', () => {
    const descriptor = {
      dimension: 'cube' as const,
      width: 256,
      height: 256,
      mipLevelCount: 9,
      storage: { format: 'rgba' as const, type: 'float32' as const },
      colorSpace: 'linear' as const
    }
    const sampler = { minFilter: 'linear-mipmap-linear' as const, magFilter: 'nearest' as const }
    const texture = new RenderTexture({
      label: 'P',
      descriptor,
      defaultSampler: sampler,
      production: 'manual'
    })
    descriptor.width = 512
    descriptor.storage.type = 'uint8' as 'float32'
    sampler.magFilter = 'linear' as 'nearest'
    expect(texture.descriptor.width).toBe(256)
    expect(texture.descriptor.storage.type).toBe('float32')
    expect(texture.defaultSampler.magFilter).toBe('nearest')
    expect(Object.isFrozen(texture.descriptor)).toBe(true)
    expect(Object.isFrozen(texture.descriptor.storage)).toBe(true)
    expect(Object.isFrozen(texture.defaultSampler)).toBe(true)
    expect(Object.isFrozen(descriptor)).toBe(false)
  })

  it('同label不合并逻辑身份', () => {
    const a = new RenderTexture(options()),
      b = new RenderTexture(options())
    expect(a.label).toBe(b.label)
    expect(a).not.toBe(b)
  })

  it('完整generated-from-base链合法，CPU不假装已经生成内容', () => {
    const texture = new RenderTexture({ ...options(), production: 'generated-from-base' })
    expect(texture.descriptor.mipLevelCount).toBe(9)
    expect(texture.cleanupState).toBe('not-started')
  })

  /**
   * 2^53 - 1 仍是合法CPU尺寸，但不能因Math.log2舍入而凭空多出第54层。
   * 不分配像素或GPU内存；这里独立列出期望53，而不调用生产helper算期望值。
   */
  it('安全整数上界只允许53层，完整链可使用mipmap过滤', () => {
    const descriptor = {
      ...options().descriptor,
      dimension: '2d' as const,
      width: Number.MAX_SAFE_INTEGER,
      height: 1,
      mipLevelCount: 53
    }
    const texture = new RenderTexture({
      ...options(),
      descriptor,
      production: 'generated-from-base',
      defaultSampler: { minFilter: 'linear-mipmap-linear' }
    })
    expect(texture.descriptor.mipLevelCount).toBe(53)
    expect(
      () => new RenderTexture({ ...options(), descriptor: { ...descriptor, mipLevelCount: 54 } })
    ).toThrow(InvalidTextureResourceError)
  })

  /** 非法runtime输入必须由领域错误报告，而非裸TypeError或静默默认。 */
  it.each([
    { dimension: 'volume' },
    { width: 0 },
    { width: -1 },
    { width: 1.5 },
    { width: NaN },
    { width: Infinity },
    { width: Number.MAX_SAFE_INTEGER + 1 },
    { height: 128 },
    { mipLevelCount: 0 },
    { mipLevelCount: 1.5 },
    { mipLevelCount: 10 },
    { storage: { format: 'rgb', type: 'float32' } },
    { storage: { format: 'rgba', type: 'float64' } },
    { colorSpace: 'srgb' },
    { unknown: 1 }
  ])('拒绝render布局 %j', (override) => {
    const input = { ...options(), descriptor: { ...options().descriptor, ...override } }
    expect(() => new RenderTexture(input as RenderTextureOptions)).toThrow(
      InvalidTextureResourceError
    )
  })

  it.each([null, undefined, [], 'P'])('拒绝非对象options %j', (input) => {
    expect(() => new RenderTexture(input as unknown as RenderTextureOptions)).toThrow(
      InvalidTextureResourceError
    )
  })

  it.each([null, [], { minFilter: 'trilinear' }, { wrapS: null }, { extra: 1 }])(
    '拒绝sampler %j',
    (sampler) => {
      expect(
        () => new RenderTexture({ ...options(), defaultSampler: sampler } as RenderTextureOptions)
      ).toThrow(InvalidTextureResourceError)
    }
  )

  it('mipmap过滤与generated策略不接受未声明完整链', () => {
    const descriptor = { ...options().descriptor, mipLevelCount: 3 }
    expect(
      () =>
        new RenderTexture({
          ...options(),
          descriptor,
          defaultSampler: { minFilter: 'nearest-mipmap-nearest' }
        })
    ).toThrow(InvalidTextureResourceError)
    expect(
      () => new RenderTexture({ ...options(), descriptor, production: 'generated-from-base' })
    ).toThrow(InvalidTextureResourceError)
    expect(() => new RenderTexture({ ...options(), descriptor })).not.toThrow()
  })

  /** 与真实C0配合：已完成listener不重放，失败listener保留到显式重试。 */
  it('沿用C0失败重试并在关闭后拒绝descriptor消费', () => {
    const texture = new RenderTexture(options())
    const done = vi.fn(),
      failed = vi.fn().mockImplementationOnce(() => {
        throw new Error('once')
      })
    texture.onDispose(done)
    texture.onDispose(failed)
    expect(() => texture.dispose()).toThrow(CleanupFailureError)
    expect(texture.cleanupState).toBe('failed')
    expect(texture.disposed).toBe(true)
    expect(() => texture.descriptor).toThrow(ResourceDisposedError)
    texture.dispose()
    texture.dispose()
    expect(texture.cleanupState).toBe('complete')
    expect(done).toHaveBeenCalledTimes(1)
    expect(failed).toHaveBeenCalledTimes(2)
  })

  it('错误保留领域code、fieldName及冻结details', () => {
    const error = new InvalidTextureResourceError('P', 'descriptor.width', 'must be positive')
    expect(error.code).toBe('INVALID_TEXTURE_RESOURCE')
    expect(error.details.fieldName).toBe('descriptor.width')
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
