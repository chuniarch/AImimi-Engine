import { RenderingError } from './RenderingError'

/** 失败发生的清理阶段，用于定位依赖链中的具体责任。 */
export type CleanupFailurePhase =
  | 'listener'
  | 'cpu'
  | 'scene-reference'
  | 'scene-cleanup'
  | 'gpu-dependency'
  | 'gpu-delete'
  | 'owner-child'

/**
 * 一项清理工作的本轮失败。
 *
 * @remarks
 * cause 保留原始抛出值，因此允许 Error、undefined 或其他 JavaScript 值。
 */
export interface CleanupFailure {
  readonly phase: CleanupFailurePhase
  readonly label: string
  readonly cause: unknown
}

/**
 * 一次显式清理调用未能完成的工作集合。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][resource-disposal-progress]
 *
 * 只记录本轮失败；下一轮成功后不重新抛出上一轮错误。
 * failures 的容器和记录是冻结副本，cause 本身保留身份且不被冻结。
 * 嵌套 CleanupFailureError 保留其层级，方便追踪 Scene → Resource → Manager。
 */
export class CleanupFailureError extends RenderingError {
  /** 调用者可以稍后显式重试清理；这不承诺资源恢复使用或重试必定成功。 */
  public override readonly recoverable: boolean = true

  /** 保留本轮所有原始原因，兼容 EngineError 的 Error 类型 cause。 */
  public override readonly cause: AggregateError

  /** 按本轮失败发生顺序保存的诊断快照。 */
  public readonly failures: readonly CleanupFailure[]

  /**
   * @param ownerLabel - 本层清理责任者的稳定类型或诊断标签。
   * @param failures - 本轮失败列表；调用者仅在确实存在失败时创建此错误。
   */
  constructor(ownerLabel: string, failures: readonly CleanupFailure[]) {
    const snapshot: readonly CleanupFailure[] = Object.freeze(
      failures.map((failure) =>
        Object.freeze({
          phase: failure.phase,
          label: failure.label,
          cause: failure.cause
        })
      )
    )
    const message = 'Cleanup failed for ' + ownerLabel + '; failure count: ' + snapshot.length

    super(message, 'CLEANUP_FAILED', {
      ownerLabel,
      failureCount: snapshot.length
    })

    this.name = 'CleanupFailureError'
    this.failures = snapshot
    this.cause = new AggregateError(
      snapshot.map((failure) => failure.cause),
      message
    )
  }
}
