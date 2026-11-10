import type { CleanupState } from './CleanupState'
import {
  CleanupFailureError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError,
  ResourceSceneReferenceUnderflowError,
  type CleanupFailure
} from './errors'

/**
 * 同步、可安全重试的清理任务。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
 *
 * 正常返回表示该任务负责的清理已经完成；抛错表示仍有剩余工作。
 * 任务若已经产生部分副作用，必须自己保存进度或保证重复执行安全。
 *
 * 不允许 async/Promise 清理。这里的 void 类型不会阻止 TypeScript 接受
 * async 函数；同步执行是注册者必须遵守的契约。
 */
export type DisposeListener = () => void

/**
 * CPU 逻辑渲染资源的生命周期和清理进度管理。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][resource-disposal-progress]
 *
 * 基类先关闭使用入口，再推进各 context 的独立清理任务。
 * 所有任务成功后才释放 CPU 数据；失败后保留剩余责任，等待显式重试。
 * 本类不保存 WebGL handle，也不自动安排重试。
 */
export abstract class Resource {
  /** 唯一生命周期状态；disposed 由它推导，避免两个字段互相矛盾。 */
  private cleanupStateValue: CleanupState = 'not-started'

  /** Scene 存活引用数，不统计 Mesh、JavaScript 引用或 GPU context 数量。 */
  private sceneReferenceCountValue = 0

  /** 尚未开始释放时的注册集合；此时允许退订。 */
  private readonly disposeListeners = new Set<DisposeListener>()

  /**
   * 已经接手的清理任务及其稳定序号。
   *
   * @remarks
   * 释放开始时从注册集合捕获。成功任务被移除，失败任务保留。
   * 退订函数不能修改此集合，避免“先退订、后抛错”遗失清理责任。
   */
  private readonly pendingDisposeListeners = new Map<DisposeListener, number>()

  /** 子类提供稳定的诊断类型，不依赖 constructor.name。 */
  protected abstract readonly resourceType: string

  /**
   * 清理具体资源的 CPU 数据。
   *
   * @remarks
   * 仅在所有注册清理任务完成后调用。此方法抛错时，下轮只重试 CPU 阶段。
   * 组合资源须保存子资源进度；不能因为子资源 disposed=true 就认为它已完成清理。
   * 使用私有字段完成清理，不能调用要求资源仍可用的 getter。
   */
  protected abstract disposeCPUData(): void

  /** 只检查当前可用性，不增加引用、不触发清理。 */
  public assertUsable(): void {
    if (this.disposed) {
      throw new ResourceDisposedError(this.resourceType)
    }
  }

  /** 已退出正常使用。running、failed、complete 三种状态均返回 true。 */
  get disposed(): boolean {
    return this.cleanupStateValue !== 'not-started'
  }

  /** 清理的实际进度；只有 complete 表示本对象的工作全部完成。 */
  get cleanupState(): CleanupState {
    return this.cleanupStateValue
  }

  /** 当前持有该资源的 Scene 数量。 */
  get sceneReferenceCount(): number {
    return this.sceneReferenceCountValue
  }

  /**
   * 注册同步、可安全重试的清理任务。
   *
   * @returns 幂等退订函数。释放开始前可取消注册，开始后不取消已接手的任务。
   * @throws ResourceDisposedError 已开始释放时不再接受新任务。
   *
   * @remarks
   * 同一函数对象重复注册仍按 Set 去重。任务可能在一次失败后再次被调用；
   * 不应在这里放置无法安全重复的普通业务事件。
   */
  onDispose(listener: DisposeListener): () => void {
    this.assertUsable()
    this.disposeListeners.add(listener)

    return () => {
      if (this.cleanupStateValue === 'not-started') {
        this.disposeListeners.delete(listener)
      }
    }
  }

  /** 登记一个 Scene 存活引用；已经关闭使用入口的资源不能重新 retain。 */
  retainSceneReference(): void {
    this.assertUsable()
    this.sceneReferenceCountValue += 1
  }

  /**
   * 交还一个 Scene 引用；1 → 0 时立即开始清理。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][scene-reference-versus-cleanup]
   *
   * 计数只减少一次。清理失败后计数仍为 0，重试必须调用 dispose()，
   * 不能再次调用 releaseSceneReference()。
   */
  releaseSceneReference(): void {
    if (this.sceneReferenceCountValue === 0) {
      throw new ResourceSceneReferenceUnderflowError(this.resourceType)
    }

    this.sceneReferenceCountValue -= 1

    if (this.sceneReferenceCountValue === 0) {
      this.finalizeDisposal()
    }
  }

  /**
   * 在允许清理时执行一轮。
   *
   * @returns 已完成清理返回 true；仍有 Scene 引用或当前正在清理返回 false。
   * @throws CleanupFailureError 本轮清理失败。失败不转换成 false。
   */
  tryDispose(): boolean {
    if (this.cleanupStateValue === 'complete') return true

    if (this.cleanupStateValue === 'running' || this.sceneReferenceCountValue > 0) {
      return false
    }

    this.finalizeDisposal()
    return true
  }

  /**
   * 无 Scene 引用时开始或继续清理。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][cleanup-reentry]
   *
   * complete 时幂等返回；running 时同步重入只返回，不递归执行任务。
   * 因而在回调中调用 dispose() 的正常返回不证明 complete：
   * owner 必须检查 cleanupState，由最外层调用负责最终结果。
   *
   * @throws ResourceHasSceneReferencesError 仍有 Scene 引用，状态保持不变。
   * @throws CleanupFailureError 本轮剩余任务未全部成功。
   */
  dispose(): void {
    if (this.cleanupStateValue === 'complete' || this.cleanupStateValue === 'running') {
      return
    }

    if (this.sceneReferenceCountValue > 0) {
      throw new ResourceHasSceneReferencesError(this.resourceType, this.sceneReferenceCountValue)
    }

    this.finalizeDisposal()
  }

  /**
   * 推进一轮清理：捕获任务 → 关闭使用入口 → 独立任务 → CPU 阶段。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][resource-disposal-progress]
   *
   * 每轮对每个待办至多尝试一次。一个任务失败后继续尝试其他独立任务，
   * 成功任务立即移出待办。存在依赖的操作应封装在同一个任务内部。
   */
  private finalizeDisposal(): void {
    if (this.cleanupStateValue === 'complete' || this.cleanupStateValue === 'running') {
      return
    }

    if (this.cleanupStateValue === 'not-started') {
      let taskIndex = 1
      for (const listener of this.disposeListeners) {
        this.pendingDisposeListeners.set(listener, taskIndex)
        taskIndex += 1
      }
      this.disposeListeners.clear()
    }

    this.cleanupStateValue = 'running'
    const failures: CleanupFailure[] = []

    try {
      for (const [listener, taskIndex] of [...this.pendingDisposeListeners]) {
        try {
          listener()
          this.pendingDisposeListeners.delete(listener)
        } catch (cause) {
          failures.push({
            phase: 'listener',
            label: 'dispose listener ' + taskIndex,
            cause
          })
        }
      }

      if (this.pendingDisposeListeners.size === 0) {
        try {
          this.disposeCPUData()
        } catch (cause) {
          failures.push({
            phase: 'cpu',
            label: 'disposeCPUData',
            cause
          })
        }
      }

      if (failures.length > 0) {
        throw new CleanupFailureError(this.resourceType, failures)
      }

      this.cleanupStateValue = 'complete'
    } finally {
      // 无论哪一步退出，只要尚未完成，都不能永远停留在 running。
      if (this.cleanupStateValue === 'running') {
        this.cleanupStateValue = 'failed'
      }
    }
  }
}
