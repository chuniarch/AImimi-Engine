import { describe, expect, it, vi } from 'vitest'
import { InvalidRenderTargetError, ResourceDisposedError } from '@/rendering/core/errors'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { createTextureWriteView } from '@/rendering/resources/TextureWriteView'
import { DepthBufferResource } from '@/rendering/resources/DepthBufferResource'

/** 使用明确64像素期望，不从生产验证函数反算测试输入。 */
function color(width = 64, height = width, cube = false) {
  return new RenderTexture({
    label: 'color',
    production: 'manual',
    descriptor: {
      dimension: cube ? 'cube' : '2d',
      width,
      height,
      mipLevelCount: cube ? 9 : 1,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data'
    }
  })
}
function view(texture = color()) {
  return createTextureWriteView({ kind: '2d', texture, mipLevel: 0 })
}

describe('C2 RenderTarget borrowed composition', () => {
  /** 数组Proxy的length同样是运行时读取，不能验证非空后在空循环中发布0尺寸。 */
  it('数组长度只捕获一次，遍历不能被改变的length跳过', () => {
    let reads = 0
    const colors = new Proxy([view()], {
      get(target, key, receiver) {
        if (key === 'length') return ++reads === 1 ? 1 : 0
        return Reflect.get(target, key, receiver)
      }
    })
    const target = new RenderTarget({ colors }, { label: 'T' })
    expect([target.width, target.height]).toEqual([64, 64])
    expect(reads).toBe(1)
  })
  /** 第一次捕获到非法值时必须报错，后续getter返回合法值不能替它洗白。 */
  it('第一次colors为空时拒绝替换，旧组和revision不变', () => {
    const target = new RenderTarget({ colors: [view()] }, { label: 'T' }),
      before = target.attachments
    let reads = 0
    const input = {
      get colors() {
        return ++reads === 1 ? [] : [view()]
      }
    }
    expect(() => target.replaceAttachments(input)).toThrow(InvalidRenderTargetError)
    expect(target.attachments).toBe(before)
    expect(target.revision).toBe(0)
    expect(reads).toBe(1)
  })
  /** getter可以每次返回不同值；验证和快照必须使用同一次捕获的数组。 */
  it('只读取一次colors getter，不能校验旧数组却发布空数组', () => {
    const attachment = view()
    let reads = 0
    const target = new RenderTarget(
      {
        get colors() {
          return ++reads <= 2 ? [attachment] : []
        }
      },
      { label: 'T' }
    )
    expect(reads).toBe(1)
    expect([target.width, target.height]).toEqual([64, 64])
    expect(target.attachments.colors).toHaveLength(1)
  })
  /** depth必须是被检查过的同一个Resource，不能让后续getter值绕过instanceof。 */
  it('只读取一次depth getter，保留被验证的真实Resource', () => {
    const depth = new DepthBufferResource({ label: 'D', width: 64, height: 64 })
    let reads = 0
    const fake = { width: 64, height: 64, assertUsable() {} }
    const target = new RenderTarget(
      {
        colors: [view()],
        get depth() {
          return (++reads <= 2 ? depth : fake) as DepthBufferResource
        }
      },
      { label: 'T' }
    )
    expect(target.attachments.depth).toBe(depth)
    expect(reads).toBe(1)
  })
  it('从64像素有效附件推导尺寸，复制冻结包装但不冻结资源', () => {
    const cube = color(256, 256, true)
    const a = createTextureWriteView({
      kind: 'cube-face',
      texture: cube,
      face: 'positive-x',
      mipLevel: 2
    })
    const colors = [a, view()]
    const depth = new DepthBufferResource({ label: 'depth', width: 64, height: 64 })
    const target = new RenderTarget({ colors, depth }, { label: 'target' })
    colors.pop()
    expect([target.width, target.height]).toEqual([64, 64])
    expect(target.attachments.colors).toHaveLength(2)
    expect(target.attachments.colors[0]!.texture).toBe(cube)
    expect(target.attachments.depth).toBe(depth)
    expect(Object.isFrozen(target.attachments)).toBe(true)
    expect(Object.isFrozen(target.attachments.colors)).toBe(true)
    expect(Object.isFrozen(target.attachments.colors[0])).toBe(true)
    expect(Object.isFrozen(cube)).toBe(false)
    expect(cube.sceneReferenceCount).toBe(0)
  })
  it('语义等价的新wrapper不增加版本，A到B到A增加两次', () => {
    const a = view(),
      b = view()
    const target = new RenderTarget({ colors: [a] }, { label: 'T' })
    const before = target.attachments
    target.replaceAttachments({ colors: [{ ...a }] })
    expect(target.revision).toBe(0)
    expect(target.attachments).toBe(before)
    target.replaceAttachments({ colors: [b] })
    expect(target.revision).toBe(1)
    target.replaceAttachments({ colors: [a] })
    expect(target.revision).toBe(2)
  })
  it('同纹理换face或者mip也算不同组装', () => {
    const texture = color(256, 256, true)
    const a = createTextureWriteView({
      kind: 'cube-face',
      texture,
      face: 'positive-x',
      mipLevel: 0
    })
    const target = new RenderTarget({ colors: [a] }, { label: 'T' })
    target.replaceAttachments({
      colors: [{ kind: 'cube-face', texture, face: 'negative-x', mipLevel: 0 }]
    })
    target.replaceAttachments({ colors: [{ ...a, mipLevel: 1 }] })
    expect(target.revision).toBe(2)
    expect(target.width).toBe(128)
  })
  it.each([
    { colors: [] },
    { colors: null },
    { colors: [undefined] },
    { colors: new Array(1) },
    { colors: [view(), view(color(128, 64))] },
    { colors: [view()], depth: new DepthBufferResource({ label: 'd', width: 32, height: 64 }) },
    { colors: [view()], depth: null },
    { colors: [view()], width: 64 }
  ])('拒绝完整候选 %j 且不修改旧快照或版本', (input) => {
    const target = new RenderTarget({ colors: [view()] }, { label: 'T' }),
      before = target.attachments
    expect(() => target.replaceAttachments(input as never)).toThrow()
    expect(target.attachments).toBe(before)
    expect(target.revision).toBe(0)
  })
  it('同一texture的不同face也不能在同一target重复挂接', () => {
    const texture = color(256, 256, true)
    const a = createTextureWriteView({
      kind: 'cube-face',
      texture,
      face: 'positive-x',
      mipLevel: 0
    })
    expect(
      () =>
        new RenderTarget(
          { colors: [a, { kind: 'cube-face', texture, face: 'negative-x', mipLevel: 0 }] },
          { label: 'T' }
        )
    ).toThrow(InvalidRenderTargetError)
  })
  it('目标关闭不释放借用附件；清理监听器仍只运行一次', () => {
    const attachment = view(),
      depth = new DepthBufferResource({ label: 'd', width: 64, height: 64 })
    const target = new RenderTarget({ colors: [attachment], depth }, { label: 'T' }),
      done = vi.fn()
    target.onDispose(done)
    target.dispose()
    target.dispose()
    expect(done).toHaveBeenCalledTimes(1)
    expect(attachment.texture.disposed).toBe(false)
    expect(depth.disposed).toBe(false)
    expect(() => target.attachments).toThrow(ResourceDisposedError)
    expect(() => target.replaceAttachments({ colors: [view()] })).toThrow(ResourceDisposedError)
  })
  it('消费时重新检查借用资源，旧地址不能使关闭资源复活', () => {
    const attachment = view(),
      target = new RenderTarget({ colors: [attachment] }, { label: 'T' })
    attachment.texture.dispose()
    expect(() => target.attachments).toThrow(ResourceDisposedError)
    expect(() => target.getColorAttachment(0)).toThrow(ResourceDisposedError)
  })
  it('槽位是当前地址；索引验证不隐式创建新存储', () => {
    const target = new RenderTarget({ colors: [view()] }, { label: 'T' })
    expect(target.getColorAttachment(0)).toEqual({ target, kind: 'color', index: 0 })
    expect(target.getDepthAttachment()).toBeNull()
    for (const index of [-1, 0.5, 1, NaN, Infinity])
      expect(() => target.getColorAttachment(index)).toThrow(InvalidRenderTargetError)
  })

  /** 重排颜色和换depth身份都影响FBO组装，不能仅比较宽高或包装地址。 */
  it('颜色顺序和depth身份参与版本判断', () => {
    const a = view(),
      b = view(),
      depth = new DepthBufferResource({ label: 'D', width: 64, height: 64 })
    const target = new RenderTarget({ colors: [a, b], depth }, { label: 'T' })
    target.replaceAttachments({ colors: [b, a], depth })
    target.replaceAttachments({
      colors: [b, a],
      depth: new DepthBufferResource({ label: 'D', width: 64, height: 64 })
    })
    expect(target.revision).toBe(2)
  })

  /** 多个组装借用同一存储，不等于目标数驱动纹理引用计数。 */
  it('两个target共享纹理，关闭其中一个不影响另一个', () => {
    const v = view(),
      a = new RenderTarget({ colors: [v] }, { label: 'A' }),
      b = new RenderTarget({ colors: [v] }, { label: 'B' })
    a.dispose()
    expect(b.width).toBe(64)
    expect(v.texture.sceneReferenceCount).toBe(0)
    expect(v.texture.disposed).toBe(false)
  })

  /** 输入getter是同步用户代码，重入替换不能把外层事务悄悄覆盖。 */
  it('替换期间重入明确拒绝，旧描述与版本不变', () => {
    const target = new RenderTarget({ colors: [view()] }, { label: 'T' }),
      before = target.attachments
    const input = {
      get colors() {
        target.replaceAttachments({ colors: [view()] })
        return [view()]
      }
    }
    expect(() => target.replaceAttachments(input)).toThrow(InvalidRenderTargetError)
    expect(target.attachments).toBe(before)
    expect(target.revision).toBe(0)
  })
})
