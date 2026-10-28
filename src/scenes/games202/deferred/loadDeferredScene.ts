import type { SceneSetup } from '@/engine/SceneSetup'
import {
  createDeferredScene,
  type DeferredSceneBuildResult
} from '@/scenes/games202/deferred/createDeferredScene'

/** 入口只需要安装/清场，不读取 WebGL，也不依赖完整 Engine 类。 */
export interface DeferredSceneHost {
  setScene(setup: SceneSetup): void
  clearScene(): void
}

export type DeferredSceneFactory = (signal: AbortSignal) => Promise<DeferredSceneBuildResult>

/** ready 不是退出能力；pending 时也必须立即得到 dispose。 */
export interface DeferredSceneSession {
  readonly ready: Promise<void>
  readonly current: DeferredSceneBuildResult | null
  dispose(): void
}

/**
 * 打开可取消的装配请求；本函数不负责打开 Engine 的 render mode。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-entry-transfer-and-cancellation]
 * setScene 成功返回是所有权交接点。之前的失败候选由本入口清理；
 * 之后只调用 host.clearScene，不能再直接 dispose 已安装的 Scene/Pass。
 * closed 先于 abort 写入，阻止取消的同步回调重新发布结果。
 * 只有 signal.reason 本身被当作正常取消；其他故障仍由 ready 拒绝。
 *
 * [DESIGN-WEIGHT:3][deferred-entry-cleanup-progress]
 * 候选清理按 Pass → Scene 顺序尝试，保留失败步骤供下次显式 dispose。
 * 这只保留本入口的任务，不保证底层 Resource 的失败清理可重试；该能力属于 C0。
 */
export function loadDeferredScene(
  host: DeferredSceneHost,
  factory: DeferredSceneFactory = createDeferredScene
): DeferredSceneSession {
  const controller = new AbortController()
  let closed = false
  let disposing = false
  let candidateCleaning = false
  let hostCleared = false
  let current: DeferredSceneBuildResult | null = null
  let pending: { readonly run: () => void; done: boolean }[] | null = null

  /** 成功的步骤不重做；多个独立错误同时保留。 */
  function disposeCandidate(): void {
    if (pending === null || candidateCleaning) return
    candidateCleaning = true
    const errors: unknown[] = []
    try {
      for (const task of pending) {
        if (task.done) continue
        try {
          task.run()
          task.done = true
        } catch (error) {
          errors.push(error)
        }
      }
      if (pending.every((task) => task.done)) pending = null
    } finally {
      candidateCleaning = false
    }
    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new AggregateError(errors, 'Deferred candidate cleanup failed')
  }

  /** 只能登记尚未交给 host 的候选。闭包保留尚待清理的对象，不丢失责任。 */
  function rejectCandidate(candidate: DeferredSceneBuildResult): void {
    pending = [
      ...candidate.passes.map((pass) => ({ run: () => pass.dispose(), done: false })),
      { run: () => candidate.scene.dispose(), done: false }
    ]
    disposeCandidate()
  }

  /** 幂等退出；清理失败可显式再调用，同步重入只让外层继续负责。 */
  function dispose(): void {
    if (disposing) return
    closed = true
    current = null
    disposing = true
    const errors: unknown[] = []
    try {
      controller.abort()
      try {
        disposeCandidate()
      } catch (error) {
        errors.push(error)
      }
      if (!hostCleared) {
        try {
          host.clearScene()
          hostCleared = true
        } catch (error) {
          errors.push(error)
        }
      }
    } finally {
      disposing = false
    }
    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new AggregateError(errors, 'Deferred session cleanup failed')
  }

  /** Promise 边界使调用者在构建完成前就能拿到退出句柄。 */
  const ready = (async (): Promise<void> => {
    let candidate: DeferredSceneBuildResult
    try {
      candidate = await factory(controller.signal)
    } catch (error) {
      if (controller.signal.aborted && error === controller.signal.reason) return
      throw error
    }
    if (closed) {
      rejectCandidate(candidate)
      return
    }
    try {
      host.setScene(candidate)
    } catch (error) {
      try {
        rejectCandidate(candidate)
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Deferred installation rollback failed', {
          cause: error
        })
      }
      throw error
    }
    if (!closed) current = candidate
  })()

  return Object.freeze({
    ready,
    get current() {
      return current
    },
    dispose
  })
}
