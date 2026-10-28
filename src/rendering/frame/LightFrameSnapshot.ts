import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import type { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import type { DirectionalShadowSettings } from '@/rendering/shadows/DirectionalShadowSettings'

/** 数值是本帧副本；resource 只保留身份，既不冻结资源也不接管生命周期。 */
export interface DirectionalShadowSnapshot extends DirectionalShadowSettings {
  readonly resource: DirectionalLightShadow
}

/**
 * 一盏方向光在本帧的稳定输入，不包含 Light/SceneNode/Camera 引用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][light-frame-value-reference-boundary]
 * position/target 保留 CPU 数值，方向与 radiance 已量化为有限 Float32。
 * shadow 即使在 castShadow=false 时也可存在，让 Pass 撤销旧发布结果。
 * Resource 仍然可变：后续 Pass 读取本快照的设置，不重新读取 resource.settings。
 */
export interface DirectionalLightSnapshot {
  readonly type: 'directional'
  readonly uuid: string
  readonly debugLabel: string
  readonly positionWorld: Vec3Tuple
  readonly targetWorld: Vec3Tuple
  /** 表面指向光源的方向，与光线传播方向相反。 */
  readonly directionToLightWorld: Vec3Tuple
  readonly directionToLightView: Vec3Tuple
  readonly radiance: Vec3Tuple
  readonly castShadow: boolean
  readonly shadow: DirectionalShadowSnapshot | null
}

/** 新灯型将扩展判别联合；不能把未知 Light 静默当成方向光。 */
export type LightSnapshot = DirectionalLightSnapshot

/** 按可见场景树遍历顺序排列；整帧各 Pass 共用同一冻结数组。 */
export type LightFrameSnapshot = readonly LightSnapshot[]
