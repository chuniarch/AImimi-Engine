import { describe, expect, it, vi } from 'vitest'

import { EngineError } from '@/errors/EngineError/BaseError'
import { Resource } from '@/rendering/core/Resource'
import {
  InvalidRenderTargetError,
  RenderingError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError
} from '@/rendering/core/errors'
import { RenderTarget, type RenderTargetDescriptor } from '@/rendering/resources/RenderTarget'
import { Scene } from '@/rendering/scene/Scene'

/** 每个测试创建自己的输入，防止某个测试的修改污染其他测试。 */
function descriptor(): RenderTargetDescriptor {
  return {
    width: 256,
    height: 128,
    colors: [{ format: 'rgba8' }, { format: 'rgba8' }],
    depth: { format: 'depth16' }
  }
}

describe('RenderTarget CPU contract', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
   * 故意修改输入的三层结构。如果只保存原引用或只冻结最外层，这个测试会失败。
   */
  it('复制所有描述层，不冻结或依赖调用者的容器', () => {
    const input = descriptor()
    const target = new RenderTarget(input)
    const snapshot = target.descriptor

    expect(target).toBeInstanceOf(Resource)
    expect(target.revision).toBe(0)
    expect(snapshot).toEqual(input)
    expect(snapshot).not.toBe(input)
    expect(snapshot.colors).not.toBe(input.colors)
    expect(snapshot.colors[0]).not.toBe(input.colors[0])
    expect(snapshot.depth).not.toBe(input.depth)
    expect(Object.isFrozen(input)).toBe(false)

    Reflect.set(input, 'width', 999)
    Reflect.set(input.colors[0]!, 'format', 'rgba32f')
    Reflect.set(input.colors, 'length', 0)
    Reflect.set(input.depth!, 'format', 'depth24')

    expect(target.descriptor).toEqual(descriptor())
  })

  /** 通过公开 getter 尝试修改，验证冻结不是只存在于 TypeScript 声明中。 */
  it('返回的描述、颜色数组、每个颜色描述和深度描述均被冻结', () => {
    const target = new RenderTarget(descriptor())
    const snapshot = target.descriptor

    expect(Reflect.set(snapshot, 'width', 1)).toBe(false)
    expect(Reflect.set(snapshot.colors, 'length', 0)).toBe(false)
    expect(Reflect.set(snapshot.colors[0]!, 'format', 'bad')).toBe(false)
    expect(Reflect.set(snapshot.depth!, 'format', 'bad')).toBe(false)
    expect(target.descriptor).toEqual(descriptor())
  })

  /** MRT 和 NPOT 的设备支持不应被无 context 的 CPU 类擅自否决。 */
  it('接受非二次幂尺寸和多个颜色附件，且允许省略深度', () => {
    const target = new RenderTarget({
      width: 300,
      height: 150,
      colors: [{ format: 'rgba8' }, { format: 'rgba8' }]
    })
    expect(target.descriptor.width).toBe(300)
    expect(target.descriptor.colors).toHaveLength(2)
    expect(target.getDepthAttachment()).toBeNull()
  })

  /** 无效尺寸不隐式取整、截断或把字符串转换为数字。 */
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '256'])(
    '拒绝非法尺寸 %s',
    (value) => {
      for (const field of ['width', 'height'] as const) {
        const input = {
          ...descriptor(),
          [field]: value
        } as unknown as RenderTargetDescriptor
        expect(() => new RenderTarget(input)).toThrow(InvalidRenderTargetError)
      }
    }
  )

  /** 此表保护外部数据边界，特别包含稀疏数组，不能用会跳过空槽的 every 验证。 */
  it.each([
    null,
    undefined,
    [],
    { ...descriptor(), colors: [] },
    { ...descriptor(), colors: {} },
    { ...descriptor(), colors: new Array(1) },
    { ...descriptor(), colors: [null] },
    { ...descriptor(), colors: [{ format: 'rgba32f' }] },
    { ...descriptor(), colors: [{ format: 'rgba8', mip: 1 }] },
    { ...descriptor(), depth: null },
    { ...descriptor(), depth: [] },
    { ...descriptor(), depth: { format: 'depth24' } },
    { ...descriptor(), depth: { format: 'depth16', sampleable: true } },
    { ...descriptor(), samples: 4 }
  ])('拒绝非法或尚未支持的描述 %#', (input) => {
    expect(() => new RenderTarget(input as unknown as RenderTargetDescriptor)).toThrow(
      InvalidRenderTargetError
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-atomic-resize]
   * 相同输入不是一次更新；读描述也不是更新。返回旧尺寸则是一次新的配置修改。
   */
  it('真实 resize 恰增一次版本；旧快照不变，恢复旧尺寸不回退版本', () => {
    const target = new RenderTarget(descriptor())
    const original = target.descriptor

    target.resize(256, 128)
    expect(target.revision).toBe(0)
    expect(target.descriptor).toBe(original)

    target.resize(512, 128)
    expect(target.revision).toBe(1)
    expect(target.descriptor).toEqual({ ...descriptor(), width: 512 })
    expect(original.width).toBe(256)

    target.resize(512, 128)
    expect(target.revision).toBe(1)

    target.resize(256, 128)
    expect(target.revision).toBe(2)
    expect(target.descriptor).toEqual(original)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-atomic-resize]
   * 如果先写 width 再检查 height，第二次断言就能发现部分提交。
   */
  it('任一 resize 输入失败都保留同一快照和版本', () => {
    const target = new RenderTarget(descriptor())
    const before = target.descriptor

    expect(() => target.resize(512, 0)).toThrow(InvalidRenderTargetError)
    expect(() => target.resize(NaN, 256)).toThrow(InvalidRenderTargetError)
    expect(target.descriptor).toBe(before)
    expect(target.revision).toBe(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
   * 引用不捕获旧 revision，也不拥有资源；只能在消费时解析当前 target。
   */
  it('颜色与深度引用保留目标身份、槽位和冻结包装，resize 后仍指向原目标', () => {
    const target = new RenderTarget(descriptor())
    const color = target.getColorAttachment(1)
    const depth = target.getDepthAttachment()

    expect(color).toEqual({ target, kind: 'color', index: 1 })
    expect(depth).toEqual({ target, kind: 'depth', index: 0 })
    expect(Object.isFrozen(color)).toBe(true)
    expect(Object.isFrozen(depth)).toBe(true)
    expect(target.sceneReferenceCount).toBe(0)

    target.resize(512, 256)
    expect(color.target).toBe(target)
    expect(color.target.descriptor.width).toBe(512)
    expect(color.target.revision).toBe(1)
    expect(color.index).toBe(1)
  })

  /** 两个目标的 color[0] 不是同一附件；不能只用 index 当作缓存 key。 */
  it('相同尺寸和索引的两个目标仍具有不同对象身份', () => {
    const first = new RenderTarget(descriptor()).getColorAttachment(0)
    const second = new RenderTarget(descriptor()).getColorAttachment(0)
    expect(first.target).not.toBe(second.target)
    expect(first.index).toBe(second.index)
  })

  /** 后端收到伪造的引用时仍需复验；这里先保证工厂方法不会产生越界地址。 */
  it.each([-1, 2, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    '拒绝非法颜色附件索引 %s',
    (index) => {
      const target = new RenderTarget(descriptor())
      expect(() => target.getColorAttachment(index)).toThrow(InvalidRenderTargetError)
    }
  )

  /**
   * @remarks
   * [DESIGN-WEIGHT:2][render-target-owner-boundary]
   * 引用仍被 JavaScript 保存，不代表 Resource 仍处于可用生命周期。
   */
  it('owner 可以直接释放没有 Scene 引用的目标，旧附件引用不能使它复活', () => {
    const target = new RenderTarget(descriptor())
    const attachment = target.getColorAttachment(0)
    const listener = vi.fn(() => {
      expect(target.disposed).toBe(true)
      expect(() => target.descriptor).toThrow(ResourceDisposedError)
    })
    target.onDispose(listener)

    target.dispose()
    target.dispose()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(attachment.target.disposed).toBe(true)
    expect(() => target.descriptor).toThrow(ResourceDisposedError)
    expect(() => target.revision).toThrow(ResourceDisposedError)
    expect(() => target.resize(1, 1)).toThrow(ResourceDisposedError)
    expect(() => target.getColorAttachment(0)).toThrow(ResourceDisposedError)
    expect(() => target.getDepthAttachment()).toThrow(ResourceDisposedError)
  })

  /** 不重写 Resource 协议；最后一个明确登记的 Scene 引用消失才自动释放。 */
  it('沿用严格 dispose、tryDispose 与共享 Scene 引用计数', () => {
    const target = new RenderTarget(descriptor())
    const first = new Scene()
    const second = new Scene()
    first.retain(target)
    second.retain(target)

    expect(() => target.dispose()).toThrow(ResourceHasSceneReferencesError)
    expect(target.tryDispose()).toBe(false)
    first.release(target)
    expect(target.disposed).toBe(false)
    second.release(target)
    expect(target.disposed).toBe(true)
  })
})

describe('InvalidRenderTargetError', () => {
  /** 错误仍沿用统一层级；保留字段语义，不让调用方 details 覆盖它。 */
  it('保留稳定错误码和冻结诊断现场', () => {
    const error = new InvalidRenderTargetError('width', 'must be positive', {
      fieldName: 'wrong',
      reason: 'wrong',
      received: -1
    })
    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidRenderTargetError')
    expect(error.code).toBe('INVALID_RENDER_TARGET')
    expect(error.details).toEqual({
      fieldName: 'width',
      reason: 'must be positive',
      received: -1
    })
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
