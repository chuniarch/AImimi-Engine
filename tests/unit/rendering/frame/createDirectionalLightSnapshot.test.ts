import { describe, expect, it } from 'vitest'

import { InvalidLightError, ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { ViewState } from '@/rendering/frame/ViewState'
import { createDirectionalLightSnapshot } from '@/rendering/frame/createDirectionalLightSnapshot'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** helper 只构造相机值输入，不计算任何被测方向或辐射亮度。 */
function view(matrix: Mat4Tuple = IDENTITY): ViewState {
  return { viewMatrix: matrix, projectionMatrix: IDENTITY, cameraWorldPosition: [0, 0, 0] }
}

function createLight(): DirectionalLight {
  const light = new DirectionalLight({
    targetWorld: [0, 0, 0],
    colorLinear: [0.25, 0.5, 1],
    intensity: 4
  })
  light.transform.setPosition([0, 10, 0])
  return light
}

function createShadow(): DirectionalLightShadow {
  return new DirectionalLightShadow({
    label: 'sun-shadow',
    mapSize: 512,
    halfExtent: 10,
    near: 1,
    far: 30,
    bias: 0.001,
    up: [0, 0, 1]
  })
}

describe('createDirectionalLightSnapshot', () => {
  it('把向下传播的光转成向上照光方向并计算线性 radiance', () => {
    // Given: P=(0,10,0)、T=(0,0,0)，颜色乘强度手算为 [1,2,4]。
    const light = createLight()
    light.name = 'sun'
    // When: 提取当前帧光照值。
    const snapshot = createDirectionalLightSnapshot(light, view())
    // Then: toLight 与传播方向相反，且快照不保存可变 Light/Transform。
    expect(snapshot).toMatchObject({
      type: 'directional',
      uuid: light.uuid,
      debugLabel: light.debugLabel,
      positionWorld: [0, 10, 0],
      targetWorld: [0, 0, 0],
      directionToLightWorld: [0, 1, 0],
      directionToLightView: [0, 1, 0],
      radiance: [1, 2, 4],
      castShadow: false,
      shadow: null
    })
    expect('light' in snapshot).toBe(false)
    expect('transform' in snapshot).toBe(false)
    expect('camera' in snapshot).toBe(false)
  })

  it('view 平移不影响方向，view 旋转只作用于 3x3', () => {
    // Given: 世界向上方向；列主序矩阵的平移位于最后一列。
    const light = createLight()
    const translated: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, -200, 300, 1]
    const rotated: Mat4Tuple = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 100, -200, 300, 1]
    // When/Then: 平移保持 +Y；绕 Z 正转 90° 后 +Y 变为 -X。
    expect(createDirectionalLightSnapshot(light, view(translated)).directionToLightView).toEqual([
      0, 1, 0
    ])
    expect(createDirectionalLightSnapshot(light, view(rotated)).directionToLightView).toEqual([
      -1, 0, 0
    ])
  })

  it('归一化 view 缩放后的方向，并在归一化后量化 Float32', () => {
    // Given: P=(1,1,0)；世界单位方向是 (1/sqrt(2),1/sqrt(2),0)。
    const light = new DirectionalLight({ targetWorld: [0, 0, 0] })
    light.transform.setPosition([1, 1, 0])
    const scaled: Mat4Tuple = [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1]
    // When: view 的线性部分统一缩放两倍。
    const snapshot = createDirectionalLightSnapshot(light, view(scaled))
    // Then: 方向长度恢复为一，量化结果用手算的 Float32 常量验证。
    expect(snapshot.directionToLightWorld).toEqual([0.7071067690849304, 0.7071067690849304, 0])
    expect(snapshot.directionToLightView).toEqual([0.7071067690849304, 0.7071067690849304, 0])
  })

  it('快照逐层冻结并隔离下一帧 light 和 shadow settings 的修改', () => {
    // Given: 可变 Light 和可变 Resource，帧输出只能复制值并保留 Resource 身份。
    const light = createLight()
    const shadow = createShadow()
    light.castShadow = true
    light.setShadow(shadow)
    const first = createDirectionalLightSnapshot(light, view())
    // When: 下一帧前修改节点、颜色和阴影设置。
    light.name = 'changed'
    light.transform.setPosition([10, 0, 0])
    light.setTargetWorld([1, 2, 3])
    light.setColorLinear([3, 4, 5])
    light.setIntensity(2)
    light.castShadow = false
    shadow.setMapSize(1024)
    shadow.setExtent(20, 2, 50)
    shadow.setBias(0.002)
    shadow.setUp([1, 0, 0])
    // Then: 旧快照保留旧数值，资源本身不冻结、不 retain。
    expect(first.positionWorld).toEqual([0, 10, 0])
    expect(first.targetWorld).toEqual([0, 0, 0])
    expect(first.radiance).toEqual([1, 2, 4])
    expect(first.castShadow).toBe(true)
    expect(first.debugLabel).not.toBe(light.debugLabel)
    expect(first.shadow).toEqual({
      resource: shadow,
      mapSize: 512,
      halfExtent: 10,
      near: 1,
      far: 30,
      bias: 0.001,
      up: [0, 0, 1]
    })
    for (const value of [
      first,
      first.positionWorld,
      first.targetWorld,
      first.directionToLightWorld,
      first.directionToLightView,
      first.radiance,
      first.shadow,
      first.shadow!.up
    ]) {
      expect(Object.isFrozen(value)).toBe(true)
    }
    expect(first.shadow!.resource).toBe(shadow)
    expect(Object.isFrozen(shadow)).toBe(false)
    expect(shadow.sceneReferenceCount).toBe(0)
    expect(createDirectionalLightSnapshot(light, view()).shadow!.mapSize).toBe(1024)
    shadow.dispose()
  })

  it('位置与方向使用同一次 world 读取，target getter 也只采样一次', () => {
    // Given: 可观察 getter 的真实子类模拟读取之间发生更新。
    class ChangingLight extends DirectionalLight {
      reads = 0
      override get targetWorld(): readonly [number, number, number] {
        this.reads += 1
        this.transform.setPosition([this.reads === 1 ? 0 : 10, 10, 0])
        return [0, 0, 0]
      }
    }
    const light = new ChangingLight()
    light.transform.setPosition([0, 10, 0])
    // When: 一个快照只允许采集一次目标和一次世界位置。
    const snapshot = createDirectionalLightSnapshot(light, view())
    // Then: 不通过 directionWorld 再读一次场景状态；P 与方向始终配套。
    expect(light.reads).toBe(1)
    expect(snapshot.positionWorld).toEqual([0, 10, 0])
    expect(snapshot.directionToLightWorld).toEqual([0, 1, 0])
  })

  it('支持 Number 极小目标且 radiance 下溢为零', () => {
    // Given: 非零世界目标比 Float32 最小正数更小，不能先量化目标再归一化。
    const light = new DirectionalLight({
      targetWorld: [Number.MIN_VALUE, 0, 0],
      colorLinear: [Number.MIN_VALUE, 0, 0],
      intensity: 1
    })
    // When: 提取 Float32 方向和 radiance。
    const snapshot = createDirectionalLightSnapshot(light, view())
    // Then: 方向依然有效，极弱辐射量化为零属于允许行为。
    expect(snapshot.directionToLightWorld).toEqual([-1, 0, 0])
    expect(snapshot.targetWorld).toEqual([Number.MIN_VALUE, 0, 0])
    expect(snapshot.radiance).toEqual([0, 0, 0])
  })

  it.each([
    { color: [Number.MAX_VALUE, 1, 1] as const, intensity: 2 },
    { color: [1e40, 1, 1] as const, intensity: 1 }
  ])('拒绝 Number 或 Float32 radiance 溢出并允许修复重试', ({ color, intensity }) => {
    // Given: 模型允许有限 HDR 配置；乘法和 GPU 数值边界由帧提取检查。
    const light = new DirectionalLight({ colorLinear: color, intensity })
    // When: 提取超出数值范围的 radiance。
    expect(() => createDirectionalLightSnapshot(light, view())).toThrow(InvalidLightError)
    light.setColorLinear([0.25, 0.5, 1])
    light.setIntensity(4)
    // Then: 失败不污染下一次快照。
    expect(createDirectionalLightSnapshot(light, view()).radiance).toEqual([1, 2, 4])
  })

  it('零方向、溢出位置均失败，修复后能够重新提取', () => {
    // Given: P=T 为真正零方向。
    const light = new DirectionalLight({ targetWorld: [0, 0, 0] })
    expect(() => createDirectionalLightSnapshot(light, view())).toThrow(InvalidLightError)
    // When: 世界矩阵不能表示输入位置，随后恢复有限位置。
    light.transform.setPosition([Number.MAX_VALUE, 0, 0])
    expect(() => createDirectionalLightSnapshot(light, view())).toThrow(InvalidLightError)
    light.transform.setPosition([0, 10, 0])
    // Then: 下一次快照无需清除额外缓存。
    expect(createDirectionalLightSnapshot(light, view()).directionToLightWorld).toEqual([0, 1, 0])
  })

  it.each([
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, Infinity, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, NaN, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  ])('view 线性部分产生无效方向时保留视图错误类型 %#', (...matrix) => {
    // Given: helper 通常接收 Builder 验证后的 view；这里直接覆盖派生方向防线。
    const light = createLight()
    // When/Then: 归因到 view，而不是把相机问题包装成 Light 错误。
    expect(() =>
      createDirectionalLightSnapshot(light, view(matrix as unknown as Mat4Tuple))
    ).toThrow(InvalidRenderViewError)
  })

  it('允许 enabled+null 暂存配置，但提取时拒绝', () => {
    // Given: 场景装配可以先打开开关、稍后提供资源。
    const light = new DirectionalLight({ castShadow: true })
    // When/Then: 帧边界必须完整，不允许缺失 shadow 的可执行快照。
    expect(() => createDirectionalLightSnapshot(light, view())).toThrow(InvalidLightError)
    const shadow = createShadow()
    light.setShadow(shadow)
    expect(createDirectionalLightSnapshot(light, view()).shadow!.resource).toBe(shadow)
    shadow.dispose()
  })

  it.each([false, true])('castShadow=%s 时都拒绝已释放的借用资源', (castShadow) => {
    // Given: 资源在 setter 通过之后被所有者释放。
    const shadow = createShadow()
    const light = new DirectionalLight({ castShadow, shadow })
    shadow.dispose()
    // When/Then: 即使禁用阴影，快照也不能借用死资源；错误保持生命周期类型。
    expect(() => createDirectionalLightSnapshot(light, view())).toThrow(ResourceDisposedError)
  })

  it('两个灯可分别借用同一 shadow，helper 不抢占未来 Pass 的共享策略', () => {
    // Given: 共享限制尚未属于逐灯快照 helper。
    const shadow = createShadow()
    const first = new DirectionalLight({ shadow, castShadow: true })
    const second = new DirectionalLight({ shadow, castShadow: true })
    // When/Then: 分别提取仅保留相同资源身份。
    expect(createDirectionalLightSnapshot(first, view()).shadow!.resource).toBe(shadow)
    expect(createDirectionalLightSnapshot(second, view()).shadow!.resource).toBe(shadow)
    expect(shadow.sceneReferenceCount).toBe(0)
    shadow.dispose()
  })
})
