import { SceneHandoffError } from '@/errors/EngineError/SceneHandoffError'
import { Scene } from '@/rendering/scene/Scene'
import type { SceneNode } from '@/rendering/scene/SceneNode'
import { Camera } from '@/rendering/scene/cameras/Camera'

/**
 * Engine 当前接管的场景与相机。
 *
 * @remarks
 * 只冻结配对关系，不冻结 Scene、Camera 或它们的 Transform。
 * 读取者借用这些对象，不因此取得 dispose 权限。
 */
export interface SceneBinding {
  readonly scene: Scene
  readonly camera: Camera
}

/**
 * 已经完成槽位变更，但旧 Scene.dispose() 抛错的诊断。
 *
 * @remarks
 * 场景定位字段只保存 UUID，不另设旧 Scene 引用。cause 保留原始抛出值，
 * 不能假定总是 Error；如果 cause 自身引用了其他对象，这些引用也会被保留。
 * 本记录不能证明旧 Scene 的剩余资源已经清理完成。
 */
export interface SceneCleanupFailure {
  readonly operation: 'replace' | 'clear' | 'dispose'
  readonly sceneUuid: string
  readonly cause: unknown
}

/**
 * Engine 内部使用的 CPU 场景所有权槽位，不是新的渲染层。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][engine-scene-handoff]
 * 不创建 Backend、不绘制、不加载资源、不调整相机，也不调度 rAF。
 * Engine 必须先完成可能失败的设备准备，再调用 setScene 提交配对。
 *
 * 正常调用关系是 Engine → 本对象；Controller 仍只依赖 Engine 的窄接口。
 * 同一个 Scene 不得同时交给两个独立 Engine 管理；共享的是 Scene.retain 的
 * Resource，而不是 Scene 实例本身。本类不建立跨 Engine 的全局所有权注册表。
 */
export class EngineSceneSlot {
  /** 一个引用代表整个配对，避免分别赋值留下“新 Scene + 旧 Camera”。 */
  private currentValue: SceneBinding | null = null

  /** 结束槽位生命周期后，不允许再次接管场景。 */
  private disposedValue = false

  /** 阻止 dispose listener 同步重入并改变正在交接的槽位。 */
  private transitioning = false

  /** 有界的“最近一次”清理失败状态；成功操作不会将它悄悄清空。 */
  private cleanupFailureValue: SceneCleanupFailure | null = null

  /** 返回只读配对；这里不是整个场景数据的深拷贝快照。 */
  get current(): SceneBinding | null {
    return this.currentValue
  }

  /** 槽位自身是否已结束生命周期，与某个 Scene.disposed 不同。 */
  get disposed(): boolean {
    return this.disposedValue
  }

  /**
   * 提供独立的错误观察入口，Engine/UI 应在交接操作后检查并报告。
   * 不在 setScene 内调用外部日志回调，避免日志再次抛错破坏交接结果。
   */
  get lastCleanupFailure(): SceneCleanupFailure | null {
    return this.cleanupFailureValue
  }

  /**
   * 验证、原子接管配对，再释放被替换的 Scene。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-handoff]
   * 提交前拒绝：旧配对不变，候选 Scene 仍归调用者。
   * 提交后旧场景清理失败：新配对保留，本方法正常返回，并记录诊断。
   * 同一个 Scene 更换 Camera 不能 dispose 该 Scene。
   *
   * @throws SceneHandoffError 输入、生命周期或同步重入不符合契约。
   */
  setScene(scene: Scene, camera: Camera): void {
    this.assertCanTransition()
    this.transitioning = true

    try {
      this.validatePair(scene, camera)
      const previous = this.currentValue

      if (previous?.scene === scene && previous.camera === camera) return

      // 在赋值前完成包装对象的创建；这次赋值就是所有权提交点。
      const next: SceneBinding = Object.freeze({ scene, camera })
      this.currentValue = next

      if (previous !== null && previous.scene !== scene) {
        this.disposeScene(previous.scene, 'replace')
      }
    } finally {
      this.transitioning = false
    }
  }

  /**
   * 先摘除当前配对，再释放原场景；槽位仍可接收下一场景。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-detach-before-cleanup]
   * 清理回调读到的 current 必须已经是 null，不能再次看到待释放的场景。
   * 本方法只处理 CPU Scene；Backend 的释放仍由 Engine 负责。
   */
  clearScene(): void {
    if (this.disposedValue) return
    this.assertCanTransition()
    this.transitioning = true

    try {
      const previous = this.currentValue
      this.currentValue = null

      if (previous !== null) this.disposeScene(previous.scene, 'clear')
    } finally {
      this.transitioning = false
    }
  }

  /**
   * 永久关闭槽位并清理当前场景；重复调用无副作用。
   *
   * @remarks
   * 先关闭、摘除，再通知资源释放逻辑。释放回调不能重新安装场景；
   * 回调再次调用 dispose 则是幂等的空操作。
   */
  dispose(): void {
    if (this.disposedValue) return
    this.assertCanTransition()
    this.transitioning = true

    try {
      this.disposedValue = true
      const previous = this.currentValue
      this.currentValue = null

      if (previous !== null) this.disposeScene(previous.scene, 'dispose')
    } finally {
      this.transitioning = false
    }
  }

  /** 在任何写操作之前拒绝已关闭状态或同步嵌套的交接。 */
  private assertCanTransition(): void {
    if (this.disposedValue) throw new SceneHandoffError('slot-disposed')
    if (this.transitioning) throw new SceneHandoffError('transition-in-progress')
  }

  /**
   * 从 Camera 沿 parent 链向上验证归属，允许 Camera 放在 Scene 内的 Group 中。
   * 只检查受 SceneNode 场景树契约管理的父链，不重新遍历整个场景。
   */
  private validatePair(scene: Scene, camera: Camera): void {
    if (!(scene instanceof Scene)) throw new SceneHandoffError('invalid-scene')
    if (!(camera instanceof Camera)) throw new SceneHandoffError('invalid-camera')
    if (scene.disposed) {
      throw new SceneHandoffError('scene-disposed', { sceneUuid: scene.uuid })
    }

    let ancestor: SceneNode | null = camera
    while (ancestor !== null) {
      if (ancestor === scene) return
      ancestor = ancestor.parent
    }

    throw new SceneHandoffError('camera-outside-scene', {
      sceneUuid: scene.uuid,
      cameraUuid: camera.uuid
    })
  }

  /**
   * 清理已经退出槽位的 Scene，并将失败保存为可观察状态。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][engine-post-commit-cleanup]
   * 这里的 catch 不是“失败等于成功”：它区分交接成功与旧资源清理失败。
   * 不能把清理错误重新抛给 Controller，否则 Controller 会误释放已接管的新场景。
   */
  // TODO(scene-dispose-failure-policy): 本层只记录 Scene.dispose 的失败；
  // 不宣称能重试或补齐 Scene/Resource 尚未定义的剩余资源清理语义。
  private disposeScene(scene: Scene, operation: SceneCleanupFailure['operation']): void {
    try {
      scene.dispose()
    } catch (cause: unknown) {
      this.cleanupFailureValue = Object.freeze({
        operation,
        sceneUuid: scene.uuid,
        cause
      })
    }
  }
}
