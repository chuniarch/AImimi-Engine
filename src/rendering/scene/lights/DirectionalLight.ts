import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { requireBoolean } from '@/rendering/core/validation'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import { Light, type LightOptions } from './Light'

export interface DirectionalLightOptions extends LightOptions {
  readonly targetWorld?: Vec3Tuple
  readonly castShadow?: boolean
  readonly shadow?: DirectionalLightShadow | null
}

/**
 * 对方向先缩放再归一化，供 CPU 方向与帧快照共同使用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][light-direction-normalization]
 * 先除以最大绝对分量，避免直接平方导致上溢或下溢。
 * 只拒绝真正的零向量和非有限值，不使用会吞掉微小合法方向的固定 epsilon。
 * errorFactory 让光源问题与相机 view 问题保留各自的领域错误。
 */
export function normalizeLightDirection(
  x: number,
  y: number,
  z: number,
  errorFactory: () => Error
): Vec3Tuple {
  const scale = Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
  if (!Number.isFinite(scale) || scale === 0) throw errorFactory()
  const sx = x / scale
  const sy = y / scale
  const sz = z / scale
  const length = Math.hypot(sx, sy, sz)
  return [sx === 0 ? 0 : sx / length, sy === 0 ? 0 : sy / length, sz === 0 ? 0 : sz / length]
}

/**
 * 以当前世界位置 P 指向显式世界目标 T 的方向光。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][directional-light-world-target]
 * 传播方向为 normalize(T-P)，不是 local -Z。自身旋转不决定方向；
 * 父节点的变换可移动 P，但不会修改世界目标 T。方向按需推导，不另建缓存。
 *
 * [DESIGN-WEIGHT:3][directional-light-borrowed-shadow]
 * Light 仅借用 shadow。Scene.retain(shadow) 才登记生命周期责任；
 * 替换引用、移除节点都不 retain 或 dispose 资源。
 */
export class DirectionalLight extends Light {
  private targetWorldValue: Vec3Tuple = [0, -1, 0]
  private castShadowValue = false
  private shadowValue: DirectionalLightShadow | null = null

  /** undefined 表示缺省；显式 null 只对 shadow 合法。 */
  constructor(options: DirectionalLightOptions = {}) {
    super(options)
    const { targetWorld = [0, -1, 0], castShadow = false, shadow = null } = options
    this.setTargetWorld(targetWorld)
    this.castShadow = castShadow
    this.setShadow(shadow)
  }

  protected override get debugType(): string {
    return 'DirectionalLight'
  }

  /** 返回世界目标的副本，不随父节点的旋转或平移一起移动。 */
  get targetWorld(): Vec3Tuple {
    return [...this.targetWorldValue]
  }

  /** 候选完整验证后提交；P=T 可以暂存，但提取方向时拒绝。 */
  setTargetWorld(target: Vec3Tuple): void {
    this.targetWorldValue = this.copyLightVector(target, 'targetWorld')
  }

  /** 当前世界空间的光线传播方向；光照着色所需 toLight 与它相反。 */
  get directionWorld(): Vec3Tuple {
    const world = new Float32Array(16)
    this.copyWorldMatrixTo(world)
    const target = this.targetWorld
    return normalizeLightDirection(
      target[0] - world[12]!,
      target[1] - world[13]!,
      target[2] - world[14]!,
      () =>
        this.lightError(
          'directionWorld',
          'position and target must define a finite nonzero direction'
        )
    )
  }

  get castShadow(): boolean {
    return this.castShadowValue
  }

  /** 允许先打开开关再配置资源；enabled+null 在帧提取边界才拒绝。 */
  set castShadow(value: boolean) {
    this.castShadowValue = requireBoolean(value, () =>
      this.lightError('castShadow', 'must be a boolean')
    )
  }

  /** 返回借用身份；实际提取会再次验证存活，避免引用被外部提前释放。 */
  get shadow(): DirectionalLightShadow | null {
    return this.shadowValue
  }

  /** null 清除借用；错误类型或已释放资源都不会替换原引用。 */
  setShadow(shadow: DirectionalLightShadow | null): void {
    if (shadow !== null) {
      if (!(shadow instanceof DirectionalLightShadow)) {
        throw this.lightError('shadow', 'must be a DirectionalLightShadow or null')
      }
      shadow.assertUsable()
    }
    this.shadowValue = shadow
  }
}
