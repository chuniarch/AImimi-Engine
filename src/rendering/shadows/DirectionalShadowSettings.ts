import { InvalidDirectionalShadowError } from '@/rendering/core/errors'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { assertNonArrayObject, requireFiniteNumber } from '@/rendering/core/validation'
import { requireShadowBias } from './requireShadowBias'

/** 阴影配置输入。世界空间长度与归一化深度 bias 是不同单位。 */
export interface DirectionalShadowSettingsInput {
  /** 正方形阴影图边长（像素）；硬件上限由 Backend 检查。 */
  readonly mapSize: number
  /** 对称正交视锥的半宽、半高（世界空间长度）。 */
  readonly halfExtent: number
  /** 沿光源观察方向的近、远距离；0 <= near < far。 */
  readonly near: number
  readonly far: number
  /** receiverDepth - bias <= storedDepth 中的非负归一化深度偏移。 */
  readonly bias: number
  /** 世界空间参考上方向；缺省 [0,1,0]，不要求输入已归一化。 */
  readonly up?: Vec3Tuple
}

/** 已验证且逐层冻结的设置；up 不再可缺省。 */
export type DirectionalShadowSettings = Readonly<Required<DirectionalShadowSettingsInput>>

/** 给诊断命名，不以 label 作为唯一身份。 */
export function requireShadowLabel(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new InvalidDirectionalShadowError('<unnamed>', 'label', 'must be a non-blank string')

  return value
}

/** 复制三个有限的 JS number；不在此处量化世界坐标或擅自归一化。 */
export function copyShadowVector(label: string, fieldName: string, value: unknown): Vec3Tuple {
  if (!Array.isArray(value) || value.length !== 3)
    throw new InvalidDirectionalShadowError(label, fieldName, 'must contain exactly three numbers')

  const entries: unknown[] = value
  const component = (index: number): number =>
    requireFiniteNumber(
      entries[index],
      () =>
        new InvalidDirectionalShadowError(label, fieldName + '[' + index + ']', 'must be finite')
    )

  return Object.freeze([component(0), component(1), component(2)])
}

/**
 * 验证完整候选配置，再创建不可变快照；本函数没有资源副作用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][directional-shadow-frame-settings]
 * 构造、setter 和独立 view helper 共用入口，不能把 TS 类型当作运行时证明。
 * 这里只检查配置范围；up 是否平行于视线，以及 Float32 矩阵是否退化，
 * 由拿到 position/target 的 view helper 检查。输入不被修改或冻结。
 */
export function copyDirectionalShadowSettings(
  label: string,
  input: DirectionalShadowSettingsInput
): DirectionalShadowSettings {
  assertNonArrayObject(
    input,
    () => new InvalidDirectionalShadowError(label, 'settings', 'must be a non-array object')
  )

  const finite = (value: unknown, field: string) =>
    requireFiniteNumber(
      value,
      () => new InvalidDirectionalShadowError(label, field, 'must be finite')
    )

  const mapSize = finite(input.mapSize, 'mapSize')
  if (!Number.isSafeInteger(mapSize) || mapSize <= 0)
    throw new InvalidDirectionalShadowError(label, 'mapSize', 'must be a positive safe integer')

  const halfExtent = finite(input.halfExtent, 'halfExtent')
  const near = finite(input.near, 'near')
  const far = finite(input.far, 'far')
  if (halfExtent <= 0 || near < 0 || far <= near)
    throw new InvalidDirectionalShadowError(
      label,
      'extent',
      'must satisfy halfExtent > 0 and 0 <= near < far'
    )

  const bias = requireShadowBias(
    input.bias,
    (reason, details) => new InvalidDirectionalShadowError(label, 'bias', reason, details)
  )

  // 解构默认值只替换 undefined；显式 null 必须继续进入验证并被拒绝。
  const { up: inputUp = [0, 1, 0] } = input
  const up = copyShadowVector(label, 'up', inputUp)
  if (up.every((componet) => componet === 0))
    throw new InvalidDirectionalShadowError(label, 'up', 'must not be the zero vector')

  return Object.freeze({ mapSize, halfExtent, near, far, bias, up })
}
