import { describe, expect, it, vi } from 'vitest'

import { EngineError } from '@/errors/EngineError/BaseError'
import { Resource } from '@/rendering/core/Resource'
import {
  InvalidRenderTargetError,
  RenderingError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError
} from '@/rendering/core/errors'
import {
  RenderTarget,
  type RenderTargetDescriptor,
  type RenderTargetOptions
} from '@/rendering/resources/RenderTarget'
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

/**
 * 只由 TypeScript 检查，不在运行时调用。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
 * 构造调用不能省略标签；普通调用者不能通过赋值改变已发布的诊断名称。
 */
function checkLabelTypes(target: RenderTarget): void {
  // @ts-expect-error 必须显式提供独立的 options。
  new RenderTarget(descriptor())
  // @ts-expect-error options 中的 label 是必填字段。
  new RenderTarget(descriptor(), {})
  // @ts-expect-error label 对普通 TypeScript 调用者只读。
  target.label = 'renamed'
}
void checkLabelTypes

describe('RenderTarget CPU contract', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
   * 如果保存整个 options 并从中读取 label，调用者修改输入后标签会漂移。
   * 如果把 label 混入存储 descriptor，描述比较与 resize 版本语义也会改变。
   */
  it('复制独立标签，修改 options 和 resize 都不改变诊断名称', () => {
    const options = { label: 'gbuffer/main' }
    const target = new RenderTarget(descriptor(), options)

    options.label = 'caller/changed'
    expect(target.label).toBe('gbuffer/main')
    expect(target.descriptor).not.toHaveProperty('label')
    expect(target.revision).toBe(0)

    target.resize(512, 256)
    expect(target.label).toBe('gbuffer/main')
    expect(target.revision).toBe(1)
    target.resize(512, 256)
    expect(target.revision).toBe(1)
  })

  /** options 不是对象时也必须给出领域错误，不能泄漏读取 null.label 的 TypeError。 */
  it.each([undefined, null, [], 'gbuffer/main', 1])('拒绝非法诊断 options %#', (options) => {
    expect(() => new RenderTarget(descriptor(), options as unknown as RenderTargetOptions)).toThrow(
      InvalidRenderTargetError
    )
  })

  /** 标签必须来自有效字符串，禁止用隐式转换或类名掩盖缺失的诊断信息。 */
  it.each([undefined, null, '', ' \t\n', 123, false, {}])(
    '拒绝缺失、空白或非字符串 label %#',
    (label) => {
      expect(
        () => new RenderTarget(descriptor(), { label } as unknown as RenderTargetOptions)
      ).toThrow(InvalidRenderTargetError)
    }
  )

  /** 防止构造 API 漂移回 label 与存储字段混放的旧提案。 */
  it('拒绝在存储 descriptor 中夹带 label', () => {
    expect(
      () =>
        new RenderTarget({ ...descriptor(), label: 'misplaced' } as RenderTargetDescriptor, {
          label: 'gbuffer/main'
        })
    ).toThrow(InvalidRenderTargetError)
  })

  /** 释放后错误诊断仍需要目标名称；label 不跟随 CPU 存储描述一同清空。 */
  it('dispose 后仍保留诊断标签', () => {
    const target = new RenderTarget(descriptor(), { label: 'fft/ping' })
    target.dispose()
    expect(target.label).toBe('fft/ping')
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
   * 故意修改输入的三层结构。如果只保存原引用或只冻结最外层，这个测试会失败。
   */
  it('复制所有描述层，不冻结或依赖调用者的容器', () => {
    const input = descriptor()
    const target = new RenderTarget(input, { label: 'test/render-target' })
    const snapshot = target.descriptor

    expect(target).toBeInstanceOf(Resource)
    expect(target.revision).toBe(0)
    expect(snapshot).toEqual(normalizedDescriptor())
    expect(snapshot).not.toBe(input)
    expect(snapshot.colors).not.toBe(input.colors)
    expect(snapshot.colors[0]).not.toBe(input.colors[0])
    expect(snapshot.depth).not.toBe(input.depth)
    expect(Object.isFrozen(input)).toBe(false)

    Reflect.set(input, 'width', 999)
    Reflect.set(input.colors[0]!, 'format', 'rgba32f')
    Reflect.set(input.colors, 'length', 0)
    Reflect.set(input.depth!, 'format', 'depth24')

    expect(target.descriptor).toEqual(normalizedDescriptor())
  })

  /** 通过公开 getter 尝试修改，验证冻结不是只存在于 TypeScript 声明中。 */
  it('返回的描述、颜色数组、每个颜色描述和深度描述均被冻结', () => {
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
    const snapshot = target.descriptor

    expect(Reflect.set(snapshot, 'width', 1)).toBe(false)
    expect(Reflect.set(snapshot.colors, 'length', 0)).toBe(false)
    expect(Reflect.set(snapshot.colors[0]!, 'format', 'bad')).toBe(false)
    expect(Reflect.set(snapshot.depth!, 'format', 'bad')).toBe(false)
    expect(target.descriptor).toEqual(normalizedDescriptor())
  })

  /** MRT 和 NPOT 的设备支持不应被无 context 的 CPU 类擅自否决。 */
  it('接受非二次幂尺寸和多个颜色附件，且允许省略深度', () => {
    const target = new RenderTarget(
      {
        width: 300,
        height: 150,
        colors: [{ format: 'rgba8' }, { format: 'rgba8' }]
      },
      { label: 'test/npot-mrt' }
    )
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
        expect(() => new RenderTarget(input, { label: 'test/render-target' })).toThrow(
          InvalidRenderTargetError
        )
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
    { ...descriptor(), colors: [{ format: 'rgba16f' }] },
    { ...descriptor(), colors: [{ format: 'rgba8', mip: 1 }] },
    { ...descriptor(), depth: null },
    { ...descriptor(), depth: [] },
    { ...descriptor(), depth: { format: 'depth24' } },
    { ...descriptor(), depth: { format: 'depth16', sampleable: true } },
    { ...descriptor(), samples: 4 }
  ])('拒绝非法或尚未支持的描述 %#', (input) => {
    expect(
      () =>
        new RenderTarget(input as unknown as RenderTargetDescriptor, {
          label: 'test/render-target'
        })
    ).toThrow(InvalidRenderTargetError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-atomic-resize]
   * 相同输入不是一次更新；读描述也不是更新。返回旧尺寸则是一次新的配置修改。
   */
  it('真实 resize 恰增一次版本；旧快照不变，恢复旧尺寸不回退版本', () => {
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
    const original = target.descriptor

    target.resize(256, 128)
    expect(target.revision).toBe(0)
    expect(target.descriptor).toBe(original)

    target.resize(512, 128)
    expect(target.revision).toBe(1)
    expect(target.descriptor).toEqual({ ...normalizedDescriptor(), width: 512 })
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
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
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
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
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
    const first = new RenderTarget(descriptor(), {
      label: 'test/render-target'
    }).getColorAttachment(0)
    const second = new RenderTarget(descriptor(), {
      label: 'test/render-target'
    }).getColorAttachment(0)
    expect(first.target).not.toBe(second.target)
    expect(first.index).toBe(second.index)
  })

  /** 后端收到伪造的引用时仍需复验；这里先保证工厂方法不会产生越界地址。 */
  it.each([-1, 2, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    '拒绝非法颜色附件索引 %s',
    (index) => {
      const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
      expect(() => target.getColorAttachment(index)).toThrow(InvalidRenderTargetError)
    }
  )

  /**
   * @remarks
   * [DESIGN-WEIGHT:2][render-target-owner-boundary]
   * 引用仍被 JavaScript 保存，不代表 Resource 仍处于可用生命周期。
   */
  it('owner 可以直接释放没有 Scene 引用的目标，旧附件引用不能使它复活', () => {
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
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
    const target = new RenderTarget(descriptor(), { label: 'test/render-target' })
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

/** 独立写出的预期输出，不能调用生产归一化函数来生成自己的测试答案。 */
function normalizedDescriptor() {
  return {
    width: 256,
    height: 128,
    colors: [
      { format: 'rgba8', sampler: { minFilter: 'linear', magFilter: 'linear' } },
      { format: 'rgba8', sampler: { minFilter: 'linear', magFilter: 'linear' } }
    ],
    depth: { format: 'depth16' }
  }
}

describe('RenderTarget color attachment sampler', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
   * Given 可选 sampler 输入；When 发布描述；Then Backend 总能读到两个完整过滤字段。
   */
  it.each([
    [undefined, { minFilter: 'linear', magFilter: 'linear' }],
    [{}, { minFilter: 'linear', magFilter: 'linear' }],
    [
      { minFilter: undefined, magFilter: undefined },
      { minFilter: 'linear', magFilter: 'linear' }
    ],
    [{ minFilter: 'nearest' }, { minFilter: 'nearest', magFilter: 'linear' }],
    [{ magFilter: 'nearest' }, { minFilter: 'linear', magFilter: 'nearest' }],
    [
      { minFilter: 'nearest', magFilter: 'nearest' },
      { minFilter: 'nearest', magFilter: 'nearest' }
    ],
    [
      { minFilter: 'linear', magFilter: 'linear' },
      { minFilter: 'linear', magFilter: 'linear' }
    ]
  ] as const)('补齐 sampler 默认值并保留显式过滤 %#', (sampler, expected) => {
    const target = new RenderTarget(
      { width: 3, height: 5, colors: [{ format: 'rgba8', sampler }] },
      { label: 'shadow/sampler' }
    )
    expect(target.descriptor.colors[0]!.sampler).toEqual(expected)
    target.dispose()
  })

  /** 显式非法值不能被当作缺省值；本批不接受 wrap、mipmap 或设备枚举。 */
  it.each([
    null,
    [],
    1,
    'nearest',
    { wrapS: 'repeat' },
    { minFilter: null },
    { magFilter: null },
    { minFilter: false },
    { magFilter: 9728 },
    { minFilter: 'nearest-mipmap-nearest' },
    { magFilter: 'linear-mipmap-linear' }
  ])('拒绝非法 sampler %#', (sampler) => {
    const input = { width: 16, height: 16, colors: [{ format: 'rgba8', sampler }] }
    expect(
      () =>
        new RenderTarget(input as unknown as RenderTargetDescriptor, { label: 'shadow/invalid' })
    ).toThrow(InvalidRenderTargetError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
   * Given 嵌套可变 sampler；When 修改输入或返回值再 resize；
   * Then 快照和旧快照仍保持同一采样配置，不能绕过 revision 修改 GPU 配置。
   */
  it('逐层复制冻结 sampler，resize 保留过滤、标签和旧快照', () => {
    const sampler = { minFilter: 'nearest' as const, magFilter: 'nearest' as const }
    const colors = [{ format: 'rgba8' as const, sampler }]
    const target = new RenderTarget({ width: 16, height: 16, colors }, { label: 'shadow/hard' })
    const before = target.descriptor
    expect(Object.isFrozen(sampler)).toBe(false)
    expect(before.colors[0]!.sampler).not.toBe(sampler)
    expect(Object.isFrozen(before.colors[0]!.sampler)).toBe(true)
    Reflect.set(sampler, 'minFilter', 'linear')
    Reflect.set(colors[0]!, 'sampler', { minFilter: 'linear', magFilter: 'linear' })
    expect(Reflect.set(before.colors[0]!.sampler, 'magFilter', 'linear')).toBe(false)
    expect(before.colors[0]!.sampler).toEqual({ minFilter: 'nearest', magFilter: 'nearest' })
    target.resize(32, 64)
    expect(target.descriptor.colors[0]!.sampler).toEqual({
      minFilter: 'nearest',
      magFilter: 'nearest'
    })
    expect(before.width).toBe(16)
    expect(target.descriptor.width).toBe(32)
    expect(target.label).toBe('shadow/hard')
    expect(target.revision).toBe(1)
    const after = target.descriptor
    target.resize(32, 64)
    expect(target.revision).toBe(1)
    expect(target.descriptor).toBe(after)
    target.dispose()
  })
})

/** 编译期保证归一化后 sampler 必填且只读；Vitest 不负责检查这些类型断言。 */
function checkSamplerTypes(target: RenderTarget): void {
  const filter: 'nearest' | 'linear' = target.descriptor.colors[0]!.sampler.minFilter
  void filter
  // @ts-expect-error 冻结快照不提供 sampler setter。
  target.descriptor.colors[0]!.sampler.minFilter = 'nearest'
}
void checkSamplerTypes

/**
 * CPU 接受浮点格式不等于当前设备支持浮点输出；设备判断留给 Manager。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
 * 这里使用真实 RenderTarget；如果遗漏 rgba32f 或擅自改默认 sampler，就会失败。
 */
describe('RenderTarget float descriptor', () => {
  /** Given 浮点格式；When 构造；Then 默认 linear 与显式 nearest 各自保留。 */
  it.each([
    { sampler: undefined, expected: { minFilter: 'linear', magFilter: 'linear' } },
    {
      sampler: { minFilter: 'nearest', magFilter: 'nearest' },
      expected: { minFilter: 'nearest', magFilter: 'nearest' }
    }
  ] as const)('接受 rgba32f 并保留 sampler %#', ({ sampler, expected }) => {
    const target = new RenderTarget(
      { width: 3, height: 5, colors: [{ format: 'rgba32f', sampler }] },
      { label: 'gbuffer/float' }
    )
    expect(target.descriptor.colors[0]).toEqual({ format: 'rgba32f', sampler: expected })
    expect(Object.isFrozen(target.descriptor)).toBe(true)
    expect(Object.isFrozen(target.descriptor.colors)).toBe(true)
    expect(Object.isFrozen(target.descriptor.colors[0])).toBe(true)
    expect(Object.isFrozen(target.descriptor.colors[0]!.sampler)).toBe(true)
    target.dispose()
  })

  /**
   * Given 调用者可变输入；When 修改输入并 resize；Then 格式、过滤与地址不漂移。
   * 此测试防止新增格式时绕过原来的快照与原子 resize 机制。
   */
  it('浮点快照隔离输入，resize 保留格式、标签和逻辑地址', () => {
    const sampler = { minFilter: 'nearest' as const, magFilter: 'nearest' as const }
    const colors = [{ format: 'rgba32f' as const, sampler }]
    const target = new RenderTarget({ width: 8, height: 4, colors }, { label: 'gbuffer/main' })
    const before = target.descriptor
    const ref = target.getColorAttachment(0)
    Reflect.set(colors[0]!, 'format', 'rgba8')
    Reflect.set(sampler, 'minFilter', 'linear')

    expect(Reflect.set(before.colors[0]!, 'format', 'rgba8')).toBe(false)
    expect(Reflect.set(before.colors[0]!.sampler, 'magFilter', 'linear')).toBe(false)
    target.resize(16, 8)
    expect(target.descriptor.colors[0]).toEqual({
      format: 'rgba32f',
      sampler: { minFilter: 'nearest', magFilter: 'nearest' }
    })
    expect(before.width).toBe(8)
    expect(target.descriptor.width).toBe(16)
    expect(target.revision).toBe(1)
    expect(target.label).toBe('gbuffer/main')
    expect(ref).toEqual({ target, kind: 'color', index: 0 })
    expect(ref).not.toHaveProperty('revision')
    target.resize(16, 8)
    expect(target.revision).toBe(1)
    target.dispose()
  })
})
