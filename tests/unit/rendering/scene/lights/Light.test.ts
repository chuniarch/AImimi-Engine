import { describe, expect, it } from 'vitest'

import { InvalidLightError, RenderingError } from '@/rendering/core/errors'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { Group } from '@/rendering/scene/Group'
import { SceneNode } from '@/rendering/scene/SceneNode'
import { Light, type LightOptions } from '@/rendering/scene/lights/Light'

/** 具体测试子类只公开构造器，全部颜色和强度行为仍来自真实 Light。 */
class TestLight extends Light {
  constructor(options: LightOptions = {}) {
    super(options)
  }
}

/** 类型边界只由编译器检查，不执行故意非法的调用。 */
function checkLightTypes(light: Light): void {
  // @ts-expect-error Light 只能通过具体子类构造。
  new Light()
  // @ts-expect-error 颜色只能通过验证 setter 修改。
  light.colorLinear = [1, 1, 1]
  // @ts-expect-error 强度只能通过验证 setter 修改。
  light.intensity = 1
}
void checkLightTypes

describe('Light CPU model', () => {
  it('以白色单位强度成为非 Resource 场景节点', () => {
    // Given: 没有提供光照配置，默认白色必须能直接参与后续 radiance 计算。
    const light = new TestLight()
    // When: 从公共 API 观察节点和配置。
    // Then: 默认是线性白色，且 Light 不承担资源释放或引用计数。
    expect(light).toBeInstanceOf(SceneNode)
    expect(light.colorLinear).toEqual([1, 1, 1])
    expect(light.intensity).toBe(1)
    expect(light.debugLabel).toBe('Light#' + light.uuid.slice(0, 8))
    expect('dispose' in light).toBe(false)
    expect('retainSceneReference' in light).toBe(false)
  })

  it('保留大于一及精确 Number 的颜色，并隔离构造、setter、getter 数组', () => {
    // Given: HDR 线性颜色不是 sRGB，也不应在 CPU 模型阶段量化成 Float32。
    const input: [number, number, number] = [0.1, 2, Number.MAX_VALUE]
    const light = new TestLight({ colorLinear: input, intensity: 0 })
    // When: 修改构造输入、setter 输入和 getter 副本。
    input[0] = 9
    const readback = light.colorLinear as [number, number, number]
    readback[1] = 9
    // Then: 两种外部数组都不能绕过 setter 污染内部状态。
    expect(light.colorLinear).toEqual([0.1, 2, Number.MAX_VALUE])
    expect(light.intensity).toBe(0)

    const next: [number, number, number] = [0.2, 3, 4]
    light.setColorLinear(next)
    next[2] = 9
    expect(light.colorLinear).toEqual([0.2, 3, 4])
    expect(light.colorLinear).not.toBe(light.colorLinear)
    light.setIntensity(Number.MAX_VALUE)
    expect(light.intensity).toBe(Number.MAX_VALUE)
  })

  it.each([
    { label: 'undefined setter', value: undefined },
    { label: 'null', value: null },
    { label: '短数组', value: [1, 2] },
    { label: '长数组', value: [1, 2, 3, 4] },
    { label: '稀疏数组', value: new Array(3) },
    { label: '最后分量负数', value: [1, 2, -1] },
    { label: 'NaN', value: [1, NaN, 1] },
    { label: 'Infinity', value: [1, 1, Infinity] },
    { label: '字符串分量', value: ['1', 1, 1] },
    { label: '伪 array-like', value: { 0: 1, 1: 1, 2: 1, length: 3 } }
  ])('拒绝 $label 颜色并保持整个旧配置', ({ value }) => {
    // Given: 旧颜色有效；故障放在末尾也不能造成前面分量已提交。
    const light = new TestLight({ colorLinear: [0.25, 0.5, 1], intensity: 4 })
    const invalid = value as unknown as Vec3Tuple
    // When: 构造和更新接收到同一种非法颜色。
    if (value !== undefined) {
      expect(() => new TestLight({ colorLinear: invalid })).toThrow(InvalidLightError)
    }
    expect(() => light.setColorLinear(invalid)).toThrow(InvalidLightError)
    // Then: 验证失败不改变颜色或独立的强度。
    expect(light.colorLinear).toEqual([0.25, 0.5, 1])
    expect(light.intensity).toBe(4)
  })

  it('构造中的显式 undefined 使用默认值', () => {
    // Given/When: 可选配置来自合并后的 options，字段存在但为 undefined。
    const light = new TestLight({ colorLinear: undefined, intensity: undefined })
    // Then: 只有 undefined 使用缺省值；null 已在非法输入表中覆盖。
    expect(light.colorLinear).toEqual([1, 1, 1])
    expect(light.intensity).toBe(1)
  })

  it.each([undefined, null, -1, NaN, Infinity, -Infinity, '1', false])(
    '拒绝非法 intensity %s 且 setter 原子',
    (value) => {
      // Given: setter 的 undefined 是非法请求，构造 options 的 undefined 才代表缺省。
      const light = new TestLight({ intensity: 4 })
      // When: 尝试提交非法强度。
      expect(() => light.setIntensity(value as number)).toThrow(InvalidLightError)
      if (value !== undefined) {
        expect(() => new TestLight({ intensity: value as number })).toThrow(InvalidLightError)
      }
      // Then: 上一份有效配置保留。
      expect(light.intensity).toBe(4)
    }
  )

  it.each([null, [], 3, 'light', false])('拒绝非法 options %s', (value) => {
    // Given/When: 运行时输入绕过 TypeScript 的非数组对象约束。
    // Then: 应报告 Light 领域错误，而非访问属性时泄漏 TypeError。
    expect(() => new TestLight(value as LightOptions)).toThrow(InvalidLightError)
  })

  it('重命名和换父节点不改变 UUID，诊断保存当时节点信息', () => {
    // Given: UUID 是机器身份，name 只是可变的人类标签。
    const light = new TestLight()
    const uuid = light.uuid
    new Group().add(light)
    light.name = 'sun'
    new Group().add(light)
    // When: 已命名节点发生非法更新。
    let thrown: unknown
    try {
      light.setIntensity(-1)
    } catch (error) {
      thrown = error
    }
    // Then: 节点身份稳定，错误上下文包含当时完整身份与显示标签。
    expect(light.uuid).toBe(uuid)
    expect(light.debugLabel).toBe('sun#' + uuid.slice(0, 8))
    expect(thrown).toBeInstanceOf(InvalidLightError)
    expect((thrown as InvalidLightError).details).toMatchObject({
      uuid,
      debugLabel: light.debugLabel,
      fieldName: 'intensity'
    })
  })

  it('InvalidLightError 保持领域基类、稳定名称和冻结诊断', () => {
    // Given: 外部诊断字典在错误生成后仍可能变化。
    const details = { uuid: 'test-uuid', debugLabel: 'sun#test' }
    // When: 错误复制诊断，随后调用者修改原字典。
    const error = new InvalidLightError('colorLinear', 'must be nonnegative', details)
    details.debugLabel = 'changed'
    // Then: 错误保存发生时的事实。
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidLightError')
    expect(error.code).toBe('INVALID_LIGHT')
    expect(error.details).toEqual({
      uuid: 'test-uuid',
      debugLabel: 'sun#test',
      fieldName: 'colorLinear',
      reason: 'must be nonnegative'
    })
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
