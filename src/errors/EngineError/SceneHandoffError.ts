import { EngineError } from '@/errors/EngineError/BaseError'

/** 场景交接在提交前被拒绝的原因，不包括旧场景提交后的清理失败。 */
export type SceneHandoffRejection =
  | 'slot-disposed'
  | 'transition-in-progress'
  | 'invalid-scene'
  | 'invalid-camera'
  | 'scene-disposed'
  | 'camera-outside-scene'

/**
 * 表示本次场景交接没有发生。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][engine-scene-handoff]
 * 调用者收到这个错误时，不能把候选场景视为已被接管。
 * 已经提交新场景之后的旧场景清理错误，必须通过独立诊断状态报告。
 */
export class SceneHandoffError extends EngineError {
  constructor(
    public readonly reason: SceneHandoffRejection,
    details: Readonly<Record<string, unknown>> = {}
  ) {
    super(`Scene handoff rejected: ${reason}`, 'SCENE_HANDOFF_REJECTED', {
      context: Object.freeze({ ...details, reason }),
      recoverable: reason !== 'slot-disposed'
    })
    this.name = 'SceneHandoffError'
  }
}
