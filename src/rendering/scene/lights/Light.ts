import { InvalidLightError } from '@/rendering/core/errors'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { assertNonArrayObject, requireFiniteNumber } from '@/rendering/core/validation'
import { SceneNode } from '@/rendering/scene/SceneNode'

/** 已在线性空间表达的灯光配置，不在这里执行 sRGB 解码或曝光处理。 */
export interface LightOptions {
  readonly colorLinear?: Vec3Tuple
  readonly intensity?: number
}

/**
 * 所有具体灯光共有的 CPU 场景节点，不是 GPU Resource。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][light-model-value-boundary]
 * 颜色、强度保存有限且非负的 JS number，允许大于 1 的 HDR 值。
 * setter 先验证完整候选，再提交；输入和 getter 数组都不与内部存储共享。
 * 实际 color * intensity 能否由 Float32 表示，由帧提取检查。
 * abstract 表示还没有光照方向/衰减等具体模型，不能直接实例化。
 */
export abstract class Light extends SceneNode {
  private colorLinearValue: Vec3Tuple = [1, 1, 1]
  private intensityValue = 1

  /** 子类公开自己的构造器；此处统一验证所有灯光共享的配置。 */
  protected constructor(options: LightOptions = {}) {
    super()
    assertNonArrayObject(options, () => this.lightError('options', 'must be a non-array object'))
    const { colorLinear = [1, 1, 1], intensity = 1 } = options
    this.setColorLinear(colorLinear)
    this.setIntensity(intensity)
  }

  /** 稳定诊断标签不依赖构建工具是否重命名类。 */
  protected override get debugType(): string {
    return 'Light'
  }

  /** 返回新数组；外部修改它不等于修改灯光。 */
  get colorLinear(): Vec3Tuple {
    return [...this.colorLinearValue]
  }

  get intensity(): number {
    return this.intensityValue
  }

  /** 任一分量失败时保留整个旧颜色；不截断到 [0,1]。 */
  setColorLinear(color: Vec3Tuple): void {
    const next = this.copyLightVector(color, 'colorLinear')
    if (next.some((component) => component < 0)) {
      throw this.lightError('colorLinear', 'components must be nonnegative')
    }
    this.colorLinearValue = next
  }

  /** 0 是合法的关闭贡献值；不把 null、字符串或 undefined 转换成数字。 */
  setIntensity(intensity: number): void {
    const next = requireFiniteNumber(intensity, () =>
      this.lightError('intensity', 'must be finite')
    )
    if (next < 0) throw this.lightError('intensity', 'must be nonnegative')
    this.intensityValue = next
  }

  /** 子类的世界目标也复用三分量验证；是否允许负数由具体字段决定。 */
  protected copyLightVector(value: unknown, fieldName: string): Vec3Tuple {
    if (!Array.isArray(value) || value.length !== 3) {
      throw this.lightError(fieldName, 'must contain exactly three finite numbers')
    }
    const entries: readonly unknown[] = value
    const component = (index: number): number =>
      requireFiniteNumber(entries[index], () =>
        this.lightError(fieldName, 'components must be finite')
      )
    return [component(0), component(1), component(2)]
  }

  /** 保存完整 UUID 和当时的显示标签；name 不是资源或节点身份。 */
  protected lightError(fieldName: string, reason: string): InvalidLightError {
    return new InvalidLightError(fieldName, reason, {
      uuid: this.uuid,
      debugLabel: this.debugLabel
    })
  }
}
