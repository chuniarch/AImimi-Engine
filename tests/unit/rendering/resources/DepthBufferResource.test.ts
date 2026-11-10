import { describe, expect, it, vi } from 'vitest'
import { Resource } from '@/rendering/core/Resource'
import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'
import { InvalidDepthBufferResourceError } from '@/rendering/core/errors/InvalidDepthBufferResourceError'
import { DepthBufferResource } from '@/rendering/resources/DepthBufferResource'
import { TextureResource } from '@/rendering/resources/TextureResource'

describe('C1 depth16 CPU resource', () => {
  /** depth16逻辑存储没有sampler，也不是颜色纹理的伪装。 */
  it('保存固定尺寸与label，直接沿用Resource', () => {
    const input = { label: 'depth', width: 256, height: 128 }
    const depth = new DepthBufferResource(input)
    input.width = 512
    expect(depth).toBeInstanceOf(Resource)
    expect(depth).not.toBeInstanceOf(TextureResource)
    expect([depth.width, depth.height, depth.format]).toEqual([256, 128, 'depth16'])
    expect(depth.label).toBe('depth')
    expect(depth.sceneReferenceCount).toBe(0)
  })

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('拒绝无效尺寸 %s', (width) => {
    expect(() => new DepthBufferResource({ label: 'depth', width, height: 1 })).toThrow(
      InvalidDepthBufferResourceError
    )
  })

  it('未知字段与空label通过领域错误拒绝', () => {
    expect(() => new DepthBufferResource({ label: ' ', width: 1, height: 1 })).toThrow(
      InvalidDepthBufferResourceError
    )
    expect(
      () =>
        new DepthBufferResource({ label: 'D', width: 1, height: 1, format: 'depth32f' } as never)
    ).toThrow(InvalidDepthBufferResourceError)
  })

  /** 真实Resource listener失败一次，不靠模拟dispose方法证明可重试。 */
  it('C0失败后可以显式重试，成功完成后幂等', () => {
    const depth = new DepthBufferResource({ label: 'depth', width: 1, height: 1 })
    const listener = vi.fn().mockImplementationOnce(() => {
      throw new Error('retry')
    })
    depth.onDispose(listener)
    expect(() => depth.dispose()).toThrow(CleanupFailureError)
    depth.dispose()
    depth.dispose()
    expect(depth.cleanupState).toBe('complete')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
