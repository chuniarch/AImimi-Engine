import { afterEach, describe, expect, it, vi } from 'vitest'
import { CleanupFailureError, ResourceDisposedError } from '@/rendering/core/errors'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import * as textures from '@/rendering/resources/RenderTexture'

/** 输入仅为CPU配置；测试不创建GL或巨大像素数组。 */
function options() {
  return {
    label: 'G',
    width: 64,
    height: 64,
    colors: [
      {
        storage: { format: 'rgba' as const, type: 'float32' as const },
        colorSpace: 'linear' as const
      },
      {
        storage: { format: 'rgba' as const, type: 'float32' as const },
        colorSpace: 'data' as const
      }
    ],
    depth: true
  }
}
afterEach(() => vi.restoreAllMocks())

describe('C2 owned target bundle', () => {
  /** 捕获长度后按索引验证每项，不能让迭代长度变化跳过后面的非法配置。 */
  it('颜色配置长度变化不能跳过非法候选项', () => {
    let reads = 0
    const colors = new Proxy([options().colors[0], {}], {
      get(target, key, receiver) {
        if (key === 'length') return ++reads === 1 ? 2 : 1
        return Reflect.get(target, key, receiver)
      }
    })
    expect(() => new RenderTargetBundle({ ...options(), colors: colors as never })).toThrow()
  })
  /** 先捕获再验证，不能在布尔验证后重新读一个不同的depth值。 */
  it('只读取一次depth选项getter，验证值就是实际创建策略', () => {
    let reads = 0
    const owner = new RenderTargetBundle({
      ...options(),
      get depth() {
        return (++reads <= 2 ? true : 'invalid') as boolean
      }
    })
    expect(owner.target.attachments.depth).toBeDefined()
    expect(reads).toBe(1)
  })
  it('target身份稳定；整组换尺寸，revision只增一次，同尺寸不分配', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      before = target.attachments
    const create = vi.spyOn(textures, 'createRenderTexture')
    owner.resize(128, 64)
    expect(owner.target).toBe(target)
    expect([target.width, target.height, target.revision]).toEqual([128, 64, 1])
    expect(before.colors.every((v) => v.texture.cleanupState === 'complete')).toBe(true)
    expect(before.depth!.cleanupState).toBe('complete')
    expect(target.attachments.colors.every((v) => v.texture.sceneReferenceCount === 0)).toBe(true)
    const current = target.attachments
    owner.resize(128, 64)
    expect(create).toHaveBeenCalledTimes(2)
    expect(target.attachments).toBe(current)
    expect(target.revision).toBe(1)
  })
  it('第2个候选创建失败，回滚第1个候选，旧组及revision不变', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      before = target.attachments
    const real = textures.createRenderTexture,
      created: textures.RenderTexture[] = []
    const failure = new Error('second creation failed')
    let calls = 0
    vi.spyOn(textures, 'createRenderTexture').mockImplementation((input) => {
      if (++calls === 2) throw failure
      const resource = real(input)
      created.push(resource)
      return resource
    })
    expect(() => owner.resize(128, 128)).toThrow(failure)
    expect(target.attachments).toBe(before)
    expect(target.revision).toBe(0)
    expect(created[0]!.cleanupState).toBe('complete')
    expect(before.colors[0]!.texture.disposed).toBe(false)
  })
  it('提交后旧清理失败不回滚；再次同尺寸resize重试，不新增资源', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      old = target.attachments
    const cleanup = vi.fn().mockImplementationOnce(() => {
      throw new Error('once')
    })
    old.colors[0]!.texture.onDispose(cleanup)
    const create = vi.spyOn(textures, 'createRenderTexture')
    expect(() => owner.resize(128, 128)).toThrow(CleanupFailureError)
    const current = target.attachments
    expect(target.width).toBe(128)
    expect(target.revision).toBe(1)
    expect(owner.disposed).toBe(false)
    expect(old.colors[0]!.texture.cleanupState).toBe('failed')
    owner.resize(128, 128)
    expect(cleanup).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenCalledTimes(2)
    expect(target.attachments).toBe(current)
    expect(target.revision).toBe(1)
    expect(old.depth!.cleanupState).toBe('complete')
  })
  it('回滚清理失败仍保留候选，后续操作可以显式重试', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      before = target.attachments
    const real = textures.createRenderTexture,
      created: textures.RenderTexture[] = []
    let calls = 0
    const failure = new Error('create'),
      cleanup = vi.fn().mockImplementationOnce(() => {
        throw new Error('cleanup')
      })
    vi.spyOn(textures, 'createRenderTexture').mockImplementation((input) => {
      if (++calls === 2) throw failure
      const resource = real(input)
      resource.onDispose(cleanup)
      created.push(resource)
      return resource
    })
    expect(() => owner.resize(128, 128)).toThrow(CleanupFailureError)
    expect(target.attachments).toBe(before)
    expect(created[0]!.cleanupState).toBe('failed')
    owner.resize(64, 64)
    expect(created[0]!.cleanupState).toBe('complete')
    expect(calls).toBe(2)
    expect(target.revision).toBe(0)
  })
  it('目标清理没完成前不释放颜色或深度，重试沿用C0', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      group = target.attachments
    target.onDispose(
      vi.fn().mockImplementationOnce(() => {
        throw new Error('FBO')
      })
    )
    expect(() => owner.dispose()).toThrow(CleanupFailureError)
    expect(owner.cleanupState).toBe('failed')
    expect(group.colors[0]!.texture.disposed).toBe(false)
    expect(group.depth!.disposed).toBe(false)
    expect(() => owner.target).toThrow(ResourceDisposedError)
    owner.dispose()
    owner.dispose()
    expect(owner.cleanupState).toBe('complete')
    expect(group.colors.every((v) => v.texture.cleanupState === 'complete')).toBe(true)
    expect(group.depth!.cleanupState).toBe('complete')
  })
  it('非法resize不改变状态，cleanup回调同步重入resize明确拒绝', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      before = target.attachments
    expect(() => owner.resize(0, 128)).toThrow()
    expect(target.attachments).toBe(before)
    const reentry = vi.fn(() => {
      expect(() => owner.resize(256, 256)).toThrow()
    })
    before.colors[0]!.texture.onDispose(reentry)
    owner.resize(128, 128)
    expect(reentry).toHaveBeenCalledTimes(1)
    expect(target.width).toBe(128)
  })

  /** resize要使用构造时复制的布局，而不是再次读取调用者已修改的配置。 */
  it('后续resize不受输入配置修改影响', () => {
    const input = options(),
      owner = new RenderTargetBundle(input)
    Object.assign(input.colors[0]!.storage, { type: 'uint8' })
    input.colors.pop()
    owner.resize(128, 128)
    expect(owner.target.attachments.colors).toHaveLength(2)
    expect(owner.target.attachments.colors[0]!.texture.descriptor.storage.type).toBe('float32')
  })

  /** 真实清理回调可能关闭整个owner；外层resize必须失败，责任仍可显式重试。 */
  it('清理回调关闭owner后不继续声称resize成功', () => {
    const owner = new RenderTargetBundle(options()),
      target = owner.target,
      old = target.attachments
    old.colors[0]!.texture.onDispose(() => {
      expect(() => owner.dispose()).toThrow(CleanupFailureError)
    })
    expect(() => owner.resize(128, 128)).toThrow(ResourceDisposedError)
    expect(owner.cleanupState).toBe('failed')
    const current = target.attachments
    expect(target.revision).toBe(1)
    owner.dispose()
    expect(owner.cleanupState).toBe('complete')
    expect(current.colors.every((v) => v.texture.cleanupState === 'complete')).toBe(true)
  })
})
