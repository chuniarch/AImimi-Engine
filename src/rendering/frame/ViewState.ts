import type { Mat4Tuple, Vec3Tuple } from '@/rendering/core/math/tuples'

/**
 * 一次帧提取产生的相机值快照。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][draw-submission-value-boundary]
 *
 * 后续 Builder 负责复制、验证并冻结数据。本接口的 readonly 只作类型约束，
 * 不会自动复制或冻结数组，也不保证任意 number 都是有限数。
 * Backend 不接收 Camera，因此不能在同一批 draw 中重新读取可变相机状态。
 */
export interface ViewState {
  /** world → view，即相机 world matrix 的逆矩阵。 */
  readonly viewMatrix: Mat4Tuple
  /** view → clip。 */
  readonly projectionMatrix: Mat4Tuple
  /** 相机在 world space 中的位置。 */
  readonly cameraWorldPosition: Vec3Tuple
}
