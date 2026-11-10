import { describe, expect, it } from 'vitest'
import { InvalidDirectionalShadowError, ResourceDisposedError } from '@/rendering/core/errors'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { Scene } from '@/rendering/scene/Scene'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'

/** 独立的单位矩阵夹具，不借助被测计算函数构造期望值。 */
const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const ZERO = Array<number>(16).fill(0)

/** 每例拥有自己的资源；不共享可变 target 或 block。 */
function shadow(): DirectionalLightShadow {
  return new DirectionalLightShadow({
    label: 'shadow/key',
    mapSize: 512,
    halfExtent: 5,
    near: 0,
    far: 20,
    bias: 0.003
  })
}

describe('DirectionalLightShadow', () => {
  /**
   * Given 输入数组；When 构造后修改输入；Then 冻结快照与采样布局仍完整。
   * 防止泄露输入引用，以及打包深度意外使用线性过滤。
   */
  it('复制设置，建立 nearest rgba8 + depth16 及无阴影初值', () => {
    const up: [number, number, number] = [0, 1, 0]
    const source = {
      label: 'shadow/key',
      mapSize: 512,
      halfExtent: 5,
      near: 0,
      far: 20,
      bias: 0.003,
      up
    }
    const value = new DirectionalLightShadow(source)
    up[1] = 9
    source.mapSize = 1024
    expect(value.settings.up).toEqual([0, 1, 0])
    expect(value.settings.mapSize).toBe(512)
    expect(Object.isFrozen(value.settings)).toBe(true)
    expect(Object.isFrozen(value.settings.up)).toBe(true)
    expect([value.target.width, value.target.height]).toEqual([512, 512])
    const color = value.target.attachments.colors[0]!.texture
    expect(color.descriptor.storage).toEqual({ format: 'rgba', type: 'uint8' })
    expect(color.defaultSampler).toMatchObject({ minFilter: 'nearest', magFilter: 'nearest' })
    expect(value.target.attachments.depth?.format).toBe('depth16')
    expect(value.block.get('uShadowMap')).toEqual({
      type: 'texture2D',
      value: value.target.getColorAttachment(0)
    })
    expect(value.block.get('uLightViewProjection')).toEqual({ type: 'mat4', value: ZERO })
    expect(value.block.get('uShadowBias')).toEqual({ type: 'float', value: 0.003 })
    value.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-frame-settings]
   * Given 已提取的旧帧；When GUI 修改设置；Then 不立即改变目标/已发布块。
   */
  it('所有 setter 只发布新设置，旧帧、target 和 block 不被改写', () => {
    const value = shadow()
    const old = value.settings
    const target = value.target
    const block = value.block
    const blockVersion = block.version
    value.setMapSize(1024)
    value.setBias(0.006)
    value.setExtent(10, 1, 40)
    value.setUp([1, 0, 0])
    expect(value.settings).toEqual({
      mapSize: 1024,
      bias: 0.006,
      halfExtent: 10,
      near: 1,
      far: 40,
      up: [1, 0, 0]
    })
    expect(old).toEqual({
      mapSize: 512,
      bias: 0.003,
      halfExtent: 5,
      near: 0,
      far: 20,
      up: [0, 1, 0]
    })
    expect(value.target).toBe(target)
    expect(value.block).toBe(block)
    expect(target.width).toBe(512)
    expect(target.revision).toBe(0)
    expect(block.version).toBe(blockVersion)
    value.dispose()
  })

  /** 非法修改必须原子失败，不能先改 halfExtent 再发现 far 错误。 */
  it.each([
    (value: DirectionalLightShadow) => value.setMapSize(0),
    (value: DirectionalLightShadow) => value.setMapSize(1.5),
    (value: DirectionalLightShadow) => value.setMapSize(Number.MAX_SAFE_INTEGER + 1),
    (value: DirectionalLightShadow) => value.setBias(-1),
    (value: DirectionalLightShadow) => value.setBias(1e100),
    (value: DirectionalLightShadow) => value.setExtent(10, 2, 1),
    (value: DirectionalLightShadow) => value.setExtent(0, 0, 20),
    (value: DirectionalLightShadow) => value.setExtent(5, -1, 20),
    (value: DirectionalLightShadow) => value.setUp([0, 0, 0]),
    (value: DirectionalLightShadow) => value.setUp([0, NaN, 0]),
    (value: DirectionalLightShadow) => value.setUp(undefined as never)
  ])('失败 setter 保留同一个设置快照 %#', (change) => {
    const value = shadow()
    const old = value.settings
    expect(() => change(value)).toThrow(InvalidDirectionalShadowError)
    expect(value.settings).toBe(old)
    expect(value.target.revision).toBe(0)
    value.dispose()
  })

  /** 静态类型不阻止 JS、反序列化或断言传入坏数据；构造也必须验证。 */
  it.each([
    null,
    undefined,
    [],
    {},
    { label: '' },
    {
      label: 'bad',
      mapSize: 8,
      halfExtent: 1,
      near: 0,
      far: 2,
      bias: 0,
      up: [0, 1]
    }
  ])('拒绝不完整运行时描述 %j', (options) => {
    expect(() => new DirectionalLightShadow(options as never)).toThrow(
      InvalidDirectionalShadowError
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-result-publication]
   * Given 快照 bias=0.003，GUI 已改为0.006；When 发布旧帧；Then 使用绘图的值而非新设置。
   */
  it('按目标 revision 发布帧结果，撤销后恢复无阴影哨兵', () => {
    const value = shadow()
    const frame = value.settings
    value.setBias(0.006)
    value.publish(IDENTITY, frame.bias, value.target.revision)
    expect(value.block.get('uLightViewProjection')).toEqual({ type: 'mat4', value: IDENTITY })
    expect(value.block.get('uShadowBias')).toEqual({ type: 'float', value: 0.003 })
    value.publishNoShadow()
    expect(value.block.get('uLightViewProjection')).toEqual({ type: 'mat4', value: ZERO })
    value.dispose()
  })

  /** Given 绘图后目标 resize；When 发布旧 revision；Then 不把旧矩阵匹配到新存储。 */
  it('拒绝过时 revision，且失败不改变块值或版本', () => {
    const value = shadow()
    const revision = value.target.revision
    value.prepareSize(1024)
    const before = value.block.getEntries()
    const version = value.block.version
    expect(() => value.publish(IDENTITY, 0.1, revision)).toThrow(InvalidDirectionalShadowError)
    expect(value.block.getEntries()).toEqual(before)
    expect(value.block.version).toBe(version)
    value.dispose()
  })

  /** 发布入口不是可信类型证明：长度、稀疏、非有限、Float32 溢出和奇异矩阵都拒绝。 */
  it.each([
    [],
    Array(16),
    ZERO,
    [...IDENTITY.slice(0, 15), NaN],
    [...IDENTITY.slice(0, 15), 1e100]
  ])('拒绝无效发布矩阵 %#，不先提交 bias', (matrix) => {
    const value = shadow()
    const version = value.block.version
    expect(() => value.publish(matrix as Mat4Tuple, 0.1, 0)).toThrow(InvalidDirectionalShadowError)
    expect(value.block.get('uShadowBias')).toEqual({ type: 'float', value: 0.003 })
    expect(value.block.version).toBe(version)
    value.dispose()
  })

  /** bias/版本也须在任一 ParameterBlock.set 之前完成验证。 */
  it.each([
    { bias: -1, revision: 0 },
    { bias: Infinity, revision: 0 },
    { bias: 0, revision: 0.5 }
  ])('拒绝非法发布元数据 %j', ({ bias, revision }) => {
    const value = shadow()
    const version = value.block.version
    expect(() => value.publish(IDENTITY, bias, revision)).toThrow(InvalidDirectionalShadowError)
    expect(value.block.version).toBe(version)
    value.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-owned-resources]
   * 只有最后一个 Scene 释放父资源才释放孩子。
   */
  it('Scene 共享父资源，最后一次 release 级联释放自有块和目标', () => {
    const value = shadow()
    const target = value.target
    const block = value.block
    const a = new Scene()
    const b = new Scene()
    a.retain(value)
    b.retain(value)
    a.dispose()
    expect(value.disposed).toBe(false)
    expect(target.disposed).toBe(false)
    expect(block.disposed).toBe(false)
    b.dispose()
    expect(value.disposed).toBe(true)
    expect(target.disposed).toBe(true)
    expect(block.disposed).toBe(true)
    expect(() => value.dispose()).not.toThrow()
    expect(() => value.settings).toThrow(ResourceDisposedError)
    expect(() => value.target).toThrow(ResourceDisposedError)
    expect(() => value.block).toThrow(ResourceDisposedError)
    expect(() => value.setBias(0)).toThrow(ResourceDisposedError)
    expect(() => value.publishNoShadow()).toThrow(ResourceDisposedError)
    expect(() => value.publish(IDENTITY, 0, 0)).toThrow(ResourceDisposedError)
  })

  /** 外部误释放孩子时必须报生命周期错误，而不是伪装配置错误或复活资源。 */
  it.each(['target', 'block'] as const)('拒绝提前释放的自有 %s', (child) => {
    const value = shadow()
    value[child].dispose()
    expect(() => value.publish(IDENTITY, 0, 0)).toThrow(ResourceDisposedError)
    value.dispose()
  })
})

describe('DirectionalLightShadow cleanup progress', () => {
  /** block 未断开借用前，target 不能越过该屏障；成功 block 不应在重试中重放。 */
  it('block 失败保留 target，后续 target 失败只重试 target', () => {
    const value = shadow()
    const block = value.block
    const target = value.target
    let blockAttempts = 0
    let targetAttempts = 0
    block.onDispose(() => {
      if (++blockAttempts === 1) throw new Error('block')
    })
    target.onDispose(() => {
      if (++targetAttempts === 1) throw new Error('target')
    })
    expect(() => value.dispose()).toThrow()
    expect(target.disposed).toBe(false)
    expect(value.cleanupState).toBe('failed')
    expect(() => value.dispose()).toThrow()
    expect(block.cleanupState).toBe('complete')
    expect(target.cleanupState).toBe('failed')
    value.dispose()
    expect(blockAttempts).toBe(2)
    expect(targetAttempts).toBe(2)
    expect(value.cleanupState).toBe('complete')
  })

  /** 防止只看 child.disposed，跳过仍在 failed 的子资源。 */
  it('子资源已退出使用但清理失败，owner 仍继续完成它', () => {
    const value = shadow()
    const target = value.target
    let attempts = 0
    target.onDispose(() => {
      if (++attempts === 1) throw new Error('target')
    })
    expect(() => target.dispose()).toThrow()
    expect(target.disposed).toBe(true)
    value.dispose()
    expect(target.cleanupState).toBe('complete')
    expect(value.cleanupState).toBe('complete')
  })
})
