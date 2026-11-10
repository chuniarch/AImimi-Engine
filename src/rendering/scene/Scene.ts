import type { CleanupState } from '@/rendering/core/CleanupState'
import { Resource } from '@/rendering/core/Resource'
import {
  CleanupFailureError,
  ResourceDisposedError,
  type CleanupFailure
} from '@/rendering/core/errors'
import { Group } from '@/rendering/scene/Group'

/**
 * 场景图根节点，以及 Scene 引用和遗留清理责任的管理者。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][scene-reference-versus-cleanup]
 *
 * retainedResources 表示“我仍要求资源存活”，每项贡献一个 Scene 引用。
 * pendingCleanup 表示“引用已经交还，但我还负责推进未完成的清理”，不增加引用。
 * 活动 Scene 的某次 release 失败，不会使整个 Scene 自动关闭。
 */
export class Scene extends Group {
  /** Scene 自身 dispose 的进度；活动时 release 失败不会修改此状态。 */
  private cleanupStateValue: CleanupState = 'not-started'

  /** 当前 Scene 持有的资源引用，按对象身份去重。 */
  private readonly retainedResources = new Set<Resource>()

  /** 已交还最后引用后仍待完成的清理，以及稳定的本地诊断标签。 */
  private readonly pendingCleanup = new Map<Resource, string>()

  /** 仅用于 pendingCleanup 诊断，不是 Resource 的机器身份。 */
  private nextCleanupTaskId = 1

  /** 标记 dispose/retryPendingCleanup 整轮正在执行。 */
  private cleanupBusy = false

  /** 标记正在交还引用的调用，防止其回调重入整轮清理。 */
  private readonly releasingResources = new Set<Resource>()

  /** 子节点已成功断开后，失败重试不重复该步骤。 */
  private childrenDetached = false

  /** 不依赖类名压缩的诊断类型。 */
  protected override get debugType(): string {
    return 'Scene'
  }

  /** Scene.dispose 已开始；此后禁止 retain，release 返回 false。 */
  get disposed(): boolean {
    return this.cleanupStateValue !== 'not-started'
  }

  /** Scene.dispose 的进度，不等同于活动 Scene 是否存在失败的 release。 */
  get cleanupState(): CleanupState {
    return this.cleanupStateValue
  }

  /** 为本 Scene 登记一次存活引用，保留具体 Resource 子类型。 */
  retain<T extends Resource>(resource: T): T {
    if (this.disposed) throw new ResourceDisposedError('Scene')

    if (this.retainedResources.has(resource)) return resource

    resource.retainSceneReference()
    this.retainedResources.add(resource)
    return resource
  }

  /**
   * 交还本 Scene 持有的一次引用。
   *
   * @returns 没有该登记或 Scene 已关闭时返回 false；成功交还返回 true。
   * @throws CleanupFailureError 引用交还触发的清理失败，或不允许的同步重入。
   *
   * @remarks
   * 先删除登记再触发回调，重入 release(同一资源) 因而返回 false。
   * 最后引用的清理失败时，计数不会补回；随后调用 retryPendingCleanup()。
   */
  release(resource: Resource): boolean {
    if (this.disposed || !this.retainedResources.has(resource)) return false

    if (this.cleanupBusy) {
      throw this.createBusyError('release')
    }

    try {
      this.releaseRetainedResource(resource)
    } catch (cause) {
      throw new CleanupFailureError(this.debugLabel, [
        { phase: 'scene-reference', label: 'releaseSceneReference', cause }
      ])
    }

    return true
  }

  /**
   * 在保持 Scene 活动的情况下，重试此前 release 留下的清理。
   *
   * @remarks
   * 不再减少引用计数，每项待办本轮至多调用一次 Resource.dispose()。
   * Scene.dispose 已开始后，统一通过 Scene.dispose() 继续清理。
   */
  retryPendingCleanup(): void {
    if (this.disposed) throw new ResourceDisposedError('Scene')
    this.assertCleanupIdle('retryPendingCleanup')

    this.cleanupBusy = true
    const failures: CleanupFailure[] = []

    try {
      for (const [resource, label] of [...this.pendingCleanup]) {
        try {
          this.retryResourceCleanup(resource, label)
        } catch (cause) {
          failures.push({ phase: 'scene-cleanup', label, cause })
        }
      }

      if (failures.length > 0) {
        throw new CleanupFailureError(this.debugLabel, failures)
      }
    } finally {
      this.cleanupBusy = false
    }
  }

  /**
   * 关闭 Scene，断开子节点，并推进所有引用交还与遗留清理。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][scene-reference-versus-cleanup]
   * [DESIGN-WEIGHT:3][cleanup-reentry]
   *
   * 独立资源失败不会阻止其他资源交还引用。进入本轮前已有的待办可以重试；
   * 本轮刚失败的任务保留到下次，避免一次调用反复尝试同一失败。
   *
   * 重入本方法抛错，不能让上层把“内层直接返回”当成 Scene 已完成。
   * 只有 complete 后重复调用才直接返回。
   */
  dispose(): void {
    if (this.cleanupStateValue === 'complete') return
    this.assertCleanupIdle('dispose')

    const pendingAtStart = [...this.pendingCleanup]
    const retainedAtStart = [...this.retainedResources]
    const failures: CleanupFailure[] = []

    this.cleanupStateValue = 'running'
    this.cleanupBusy = true

    try {
      if (!this.childrenDetached) {
        try {
          this.removeAllChildren()
          this.childrenDetached = true
        } catch (cause) {
          failures.push({ phase: 'owner-child', label: 'removeAllChildren', cause })
        }
      }

      // 场景树断开是引用交还的前置步骤，失败时保持该依赖屏障。
      if (this.childrenDetached) {
        for (const resource of retainedAtStart) {
          try {
            this.releaseRetainedResource(resource)
          } catch (cause) {
            failures.push({ phase: 'scene-reference', label: 'releaseSceneReference', cause })
          }
        }

        for (const [resource, label] of pendingAtStart) {
          try {
            this.retryResourceCleanup(resource, label)
          } catch (cause) {
            failures.push({ phase: 'scene-cleanup', label, cause })
          }
        }
      }

      if (failures.length > 0) {
        throw new CleanupFailureError(this.debugLabel, failures)
      }

      this.cleanupStateValue = 'complete'
    } finally {
      if (this.cleanupStateValue === 'running') {
        this.cleanupStateValue = 'failed'
      }
      this.cleanupBusy = false
    }
  }

  /**
   * 实际交还引用，公开 release 和整场景 dispose 共用此顺序。
   *
   * @remarks
   * 回调之前发布 pending 责任和正在交还标记；完成之后才删除 pending。
   * 此处不恢复已交还的引用，也不在 finally 再次调用 releaseSceneReference。
   */
  private releaseRetainedResource(resource: Resource): void {
    if (!this.retainedResources.delete(resource)) return

    const releasesLastReference = resource.sceneReferenceCount === 1
    const label = 'resource cleanup ' + this.nextCleanupTaskId

    if (releasesLastReference) {
      this.nextCleanupTaskId += 1
      this.pendingCleanup.set(resource, label)
    }

    this.releasingResources.add(resource)

    try {
      resource.releaseSceneReference()

      if (releasesLastReference) {
        this.assertResourceCleanupComplete(resource, label)
      }
    } finally {
      if (resource.cleanupState === 'complete') {
        this.pendingCleanup.delete(resource)
      }
      this.releasingResources.delete(resource)
    }
  }

  /** 对已交还引用的资源继续清理；该方法永远不减少引用计数。 */
  private retryResourceCleanup(resource: Resource, label: string): void {
    if (!this.pendingCleanup.has(resource)) return

    if (resource.cleanupState !== 'complete') {
      resource.dispose()
    }

    this.assertResourceCleanupComplete(resource, label)
    this.pendingCleanup.delete(resource)
  }

  /**
   * 防止把 Resource.dispose 的同步重入 no-op 当作完成。
   *
   * @remarks
   * disposed=true 只说明不能继续使用，无法证明 GPU/CPU 清理已经结束。
   */
  private assertResourceCleanupComplete(resource: Resource, label: string): void {
    if (resource.cleanupState !== 'complete') {
      throw new CleanupFailureError(this.debugLabel, [
        {
          phase: 'scene-cleanup',
          label,
          cause: new Error('Resource cleanup is ' + resource.cleanupState + ', not complete')
        }
      ])
    }
  }

  /** 整轮清理不能插入尚未返回的引用交还或另一轮清理。 */
  private assertCleanupIdle(operation: string): void {
    if (this.cleanupBusy || this.releasingResources.size > 0) {
      throw this.createBusyError(operation)
    }
  }

  /** 以领域错误报告同步调用尚未结束；不改变清理状态或责任记录。 */
  private createBusyError(operation: string): CleanupFailureError {
    return new CleanupFailureError(this.debugLabel, [
      {
        phase: 'scene-cleanup',
        label: operation,
        cause: new Error('Scene cleanup or reference release is already running')
      }
    ])
  }
}
