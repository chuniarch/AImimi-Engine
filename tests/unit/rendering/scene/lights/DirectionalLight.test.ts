import { describe, expect, it } from 'vitest'

import { InvalidLightError, ResourceDisposedError } from '@/rendering/core/errors'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { Group } from '@/rendering/scene/Group'
import { Scene } from '@/rendering/scene/Scene'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { Light } from '@/rendering/scene/lights/Light'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'

/** 创建真实 CPU 资源，不使用假对象替代生命周期行为。 */
function createShadow(label = 'sun-shadow'): DirectionalLightShadow {
  return new DirectionalLightShadow({
    label,
    mapSize: 512,
    halfExtent: 10,
    near: 1,
    far: 30,
    bias: 0.001
  })
}

describe('DirectionalLight world-target model', () => {
  it('可选字段 undefined 使用构造默认值', () => {
    // Given/When: 显式 undefined 是可选构造配置的合法缺省。
    const light = new DirectionalLight({
      targetWorld: undefined,
      castShadow: undefined,
      shadow: undefined
    })
    // Then: 不把 undefined 误判为显式 setter 输入。
    expect(light.targetWorld).toEqual([0, -1, 0])
    expect(light.castShadow).toBe(false)
    expect(light.shadow).toBeNull()
  })

  it('默认指向世界负 Y，默认不投影且不借用 shadow', () => {
    // Given/When: 创建无配置的具体方向光。
    const light = new DirectionalLight()
    // Then: 传播方向由世界原点指向默认目标，类型和光照默认来自 Light。
    expect(light).toBeInstanceOf(Light)
    expect(light.targetWorld).toEqual([0, -1, 0])
    expect(light.directionWorld).toEqual([0, -1, 0])
    expect(light.castShadow).toBe(false)
    expect(light.shadow).toBeNull()
    expect(light.colorLinear).toEqual([1, 1, 1])
    expect(light.debugLabel).toBe('DirectionalLight#' + light.uuid.slice(0, 8))
  })

  it('复制世界目标并保留负数和小于 Float32 的 Number 值', () => {
    // Given: 目标是世界空间的 Number 配置，不是会被 local transform 量化的向量。
    const input: [number, number, number] = [-0.1, 2, Number.MIN_VALUE]
    const light = new DirectionalLight({ targetWorld: input })
    // When: 外部修改所有可见的数组引用。
    input[0] = 9
    const readback = light.targetWorld as [number, number, number]
    readback[1] = 9
    // Then: 内部目标保持原值。
    expect(light.targetWorld).toEqual([-0.1, 2, Number.MIN_VALUE])
    const next: [number, number, number] = [-1, -2, -3]
    light.setTargetWorld(next)
    next[0] = 9
    expect(light.targetWorld).toEqual([-1, -2, -3])
    expect(light.targetWorld).not.toBe(light.targetWorld)
  })

  it('P=(0,10,0)、T=0 时向下传播，自身旋转不控制方向', () => {
    // Given: 指向场景原点的高处光源。
    const light = new DirectionalLight({ targetWorld: [0, 0, 0] })
    light.transform.setPosition([0, 10, 0])
    // When: 旋转光源自己的 local 坐标轴。
    light.transform.setRotation([1, 2, 3])
    // Then: 方向仍为 normalize(T-P)，不是 local -Z。
    expect(light.directionWorld).toEqual([0, -1, 0])
    expect(light.targetWorld).toEqual([0, 0, 0])
  })

  it('父节点平移、旋转和 reparent 改变 P，却不移动世界目标', () => {
    // Given: 子光源在父坐标系 x=2，目标固定于世界原点。
    const light = new DirectionalLight({ targetWorld: [0, 0, 0] })
    light.transform.setPosition([2, 0, 0])
    const parent = new Group()
    parent.add(light)
    // When: 父节点平移，再绕 Z 旋转 90°。
    parent.transform.setPosition([0, 2, 0])
    expect(light.directionWorld[0]).toBeCloseTo(-Math.SQRT1_2, 6)
    expect(light.directionWorld[1]).toBeCloseTo(-Math.SQRT1_2, 6)
    parent.transform.setPosition([0, 0, 0])
    parent.transform.setRotation([0, 0, Math.PI / 2])
    // Then: P 约为 (0,2,0)，方向向下；换到新父节点后也不能使用旧缓存。
    expect(light.directionWorld[0]).toBeCloseTo(0, 6)
    expect(light.directionWorld[1]).toBeCloseTo(-1, 6)
    const secondParent = new Group()
    secondParent.transform.setPosition([-4, 0, 0])
    secondParent.add(light)
    expect(light.directionWorld).toEqual([1, 0, 0])
    expect(light.targetWorld).toEqual([0, 0, 0])
  })

  it.each([
    { target: [Number.MIN_VALUE, 0, 0] as const, want: [1, 0, 0] },
    {
      target: [Number.MAX_VALUE, Number.MAX_VALUE, 0] as const,
      want: [Math.SQRT1_2, Math.SQRT1_2, 0]
    }
  ])('无任意 epsilon 地归一化有限极端目标 $target', ({ target, want }) => {
    // Given: 直接平方会下溢或溢出，但方向本身有效。
    const light = new DirectionalLight({ targetWorld: target })
    // When: 读取派生的传播方向。
    const actual = light.directionWorld
    // Then: 缩放归一化保留真正的非零方向。
    actual.forEach((component, index) => expect(component).toBeCloseTo(want[index]!, 14))
  })

  it('真正重合或世界位置溢出时失败，修复后可以重新读取', () => {
    // Given: coincident P/T 可以暂存在模型中，但不能提取方向。
    const light = new DirectionalLight({ targetWorld: [0, 0, 0] })
    expect(() => light.directionWorld).toThrow(InvalidLightError)
    // When: 先给无穷世界位置，再修复为有限位置。
    light.transform.setPosition([Number.MAX_VALUE, 0, 0])
    expect(() => light.directionWorld).toThrow(InvalidLightError)
    light.transform.setPosition([10, 0, 0])
    // Then: 失败没有留下会污染重试的方向缓存。
    expect(light.directionWorld).toEqual([-1, 0, 0])
  })

  it.each([
    undefined,
    null,
    [],
    [1, 2],
    [1, 2, 3, 4],
    new Array(3),
    [1, NaN, 2],
    [1, 2, Infinity],
    ['1', 2, 3]
  ])('拒绝非法目标 %s 且 setter 保留旧目标', (value) => {
    // Given: 原目标有效，最后一个非法分量也不能造成部分写入。
    const light = new DirectionalLight({ targetWorld: [1, 2, 3] })
    // When: 运行时目标绕过 tuple 类型。
    expect(() => light.setTargetWorld(value as unknown as Vec3Tuple)).toThrow(InvalidLightError)
    if (value !== undefined) {
      expect(() => new DirectionalLight({ targetWorld: value as unknown as Vec3Tuple })).toThrow(
        InvalidLightError
      )
    }
    // Then: 原目标保持完整。
    expect(light.targetWorld).toEqual([1, 2, 3])
  })

  it.each([undefined, null, 0, 1, '', 'false', NaN])('拒绝非布尔 castShadow %s', (value) => {
    // Given: true 是有效旧值，falsey 非 boolean 不能被当成 false。
    const light = new DirectionalLight({ castShadow: true })
    // When: setter 接收非法值。
    expect(() => {
      light.castShadow = value as unknown as boolean
    }).toThrow(InvalidLightError)
    if (value !== undefined) {
      expect(() => new DirectionalLight({ castShadow: value as unknown as boolean })).toThrow(
        InvalidLightError
      )
    }
    // Then: 旧值不变，合法 false 可以显式关闭。
    expect(light.castShadow).toBe(true)
    light.castShadow = false
    expect(light.castShadow).toBe(false)
  })

  it('借用 shadow 的替换、清除和 Scene 层级都不 retain 或 dispose', () => {
    // Given: 两个未被 Scene retain 的真实资源。
    const first = createShadow('first')
    const second = createShadow('second')
    const light = new DirectionalLight({ shadow: first })
    const scene = new Scene()
    scene.add(light)
    // When: 替换、清除，再释放只持有场景节点的 Scene。
    light.setShadow(second)
    light.setShadow(null)
    scene.dispose()
    // Then: Light 只借用，资源计数和生命周期仍由显式所有者控制。
    expect(light.shadow).toBeNull()
    for (const resource of [first, second]) {
      expect(resource.sceneReferenceCount).toBe(0)
      expect(resource.disposed).toBe(false)
      resource.dispose()
    }
  })

  it('Scene.retain 独立管理 shadow；已释放借用仍报告 ResourceDisposedError', () => {
    // Given: Scene 显式持有 shadow，Light 只借用它。
    const scene = new Scene()
    const shadow = scene.retain(createShadow())
    const light = new DirectionalLight({ shadow })
    expect(shadow.sceneReferenceCount).toBe(1)
    // When: Scene 释放最后的资源引用。
    scene.dispose()
    // Then: 正确资源类型的生命周期失败不能被包装为 InvalidLightError。
    expect(() => light.setShadow(shadow)).toThrow(ResourceDisposedError)
    expect(() => new DirectionalLight({ shadow })).toThrow(ResourceDisposedError)
    expect(light.shadow).toBe(shadow)
  })

  it.each([undefined, false, 0, {}, { assertUsable: () => undefined }])(
    'setShadow 拒绝错误类型 %s 并保留旧借用',
    (value) => {
      // Given: 已有有效借用；形似 Resource 的对象不是正确资源类型。
      const shadow = createShadow()
      const light = new DirectionalLight({ shadow })
      // When: setter 收到非法输入，包含显式 undefined。
      expect(() => light.setShadow(value as DirectionalLightShadow)).toThrow(InvalidLightError)
      if (value !== undefined) {
        expect(() => new DirectionalLight({ shadow: value as DirectionalLightShadow })).toThrow(
          InvalidLightError
        )
      }
      // Then: 不影响原借用或其生命周期。
      expect(light.shadow).toBe(shadow)
      expect(shadow.disposed).toBe(false)
      shadow.dispose()
    }
  )
})
