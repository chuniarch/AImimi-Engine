import type { SceneSetup } from '@/engine/SceneSetup'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import { createHW2Scene, type HW2SceneBuildResult } from './createHW2Scene'
import type { HW2ScenePreset } from './types/HW2ScenePreset'

/**
 * Controller 所需的最小场景安装接口。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-controller-scene-handoff]
 *
 * Controller 必须独占此 host 的场景切换会话，不能多个 Controller 共用并互相清场。
 * 不 import 旧 Engine，避免通过类型依赖重新引入旧 Renderer；SceneSetup 来自只放类型的文件。
 * host 的渲染会话由交出 host 的一方先打开（Engine.enterRenderMode），本接口只有同步操作。
 * EngineSceneSlot/hw2RenderMode 测试验证此契约：提交后的旧 Scene、旧 Pipeline 清理失败
 * 通过 Engine.lastSceneCleanupFailure / lastPipelineCleanupFailure 报告，
 * 不能再向本 Controller 抛安装错误。
 */
export interface SceneHost {
  /**
   * 同步安装 scene、camera 和整条 passes。
   *
   * 正常返回：host 接管新 Scene 和全部 Pass，并负责以后替换或清场时释放它们。
   * 抛错：host 一个都没有接管，旧安装保持不变；Scene 和 Pass 仍归调用者释放。
   * 不能返回 Promise，不能先提交再通过此异常通道报告旧资源清理失败。
   */
  setScene(setup: SceneSetup): void

  /**
   * 同步断开当前安装，再释放旧 Scene 和渲染会话。
   * 不负责重新开放已 dispose 的 Controller。
   */
  clearScene(): void
}

/**
 * 可注入的异步 CPU 工厂。
 *
 * 每次成功返回独立、尚未安装的 Scene；失败时由工厂清理自己的半成品。
 * 注入是为了控制 I/O 完成时机，不是允许工厂自行调用 host.setScene。
 */
export type HW2SceneFactory = (
  preset: HW2ScenePreset,
  signal: AbortSignal
) => Promise<HW2SceneBuildResult>

/**
 * 负责 HW2 preset 构建的取消、过期结果处理与场景交接。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-controller-latest-request]
 *
 * abort 是“请求停止”，不是“保证底层已经停止”。
 * 所以成功返回后仍要验证请求身份；过期 Scene 必须释放，不能安装。
 * 本类不保存第二份 currentScene，也不创建 Renderer/Backend。
 */
export class HW2SceneController {
  private readonly engine: SceneHost
  private readonly factory: HW2SceneFactory = createHW2Scene

  /** 每次新请求和 dispose 都使旧版本失效；不是帧计数。 */
  private requestVersion = 0

  /** 只指向最新请求；旧请求仍可能在等待一个忽略取消的依赖。 */
  private activeAbortController: AbortController | null = null

  /** 终止是单向操作；dispose 后不再接受新 preset。 */
  private disposedValue = false

  /**
   * @param engine - 已打开渲染会话、由本 Controller 独占的同步场景 host。
   * @param factory - 默认使用 Task 19 工厂；测试可注入可控异步加载。
   */
  constructor(engine: SceneHost, factory: HW2SceneFactory = createHW2Scene) {
    this.engine = engine
    this.factory = factory
  }

  /**
   * 请求切换到一个 preset。
   *
   * @returns 安装成功，或本次请求被后续请求/dispose 取消时正常结束。
   * Promise<void> 的完成不等于“这个 preset 一定被安装”，取消也正常完成。
   * @throws 当前加载失败、安装失败或 Scene 清理失败时传播错误。
   * @throws {@link ResourceDisposedError} Controller 已终止时拒绝新请求。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-controller-abort-reentrancy]
   *
   * 先登记本次 active，再 abort 旧请求。abort listener 会同步运行，
   * 它可能递归调用 applyPreset 或 dispose；返回后必须再次检查本次身份。
   * finally 也只能清掉“仍属于自己”的 active，不能擦除新请求。
   */
  async applyPreset(preset: HW2ScenePreset): Promise<void> {
    if (this.disposedValue) throw new ResourceDisposedError('HW2SceneController')

    const version = ++this.requestVersion
    const previous = this.activeAbortController
    const abortController = new AbortController()
    this.activeAbortController = abortController

    try {
      previous?.abort()
      if (!this.isCurrent(version, abortController)) return

      let next: HW2SceneBuildResult
      try {
        next = await this.factory(preset, abortController.signal)
      } catch (error) {
        // 不检查 error.name：网络封装可能把取消包装为其他异常。
        // 只在本次 signal 确实被取消时，把加载失败视为预期取消。
        if (abortController.signal.aborted) return
        throw error
      }

      if (!this.isCurrent(version, abortController)) {
        // 位于加载 catch 之外：清理失败不能被当成取消而静默吞掉。
        next.scene.dispose()
        return
      }

      // 过了最新请求检查才创建 Pass，过期结果只需释放 Scene。
      // 每次安装都交新实例：host 拒绝它接管过的 Pass。
      const passes = [new ForwardPass()]

      try {
        this.engine.setScene({ scene: next.scene, camera: next.camera, passes })
      } catch (installationError) {
        this.disposeCandidate(next, passes, installationError)
        throw installationError
      }

      // 交接成功后不再 dispose next 或 passes，也不重复管理 host 的当前安装。
    } finally {
      if (this.activeAbortController === abortController) {
        this.activeAbortController = null
      }
    }
  }

  /**
   * 结束当前 HW2 会话：失效旧请求、取消加载，并要求 host 清场景。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-controller-abort-reentrancy]
   *
   * 先提交 disposed/version/active 状态，再触发 abort 或 host 回调。
   * 即使 clearScene 抛错，控制器也保持终止，不通过再次 dispose 重试未知的部分清理。
   * 本函数不会等待忽略取消的加载器；它以后成功返回时，由 applyPreset 释放迟到 Scene。
   *
   * 本类传播 Scene/Resource 的清理错误；若 listener 抛错，不能据此认为全部资源已释放。
   */
  dispose(): void {
    if (this.disposedValue) return

    this.disposedValue = true
    this.requestVersion += 1
    const active = this.activeAbortController
    this.activeAbortController = null

    active?.abort()
    this.engine.clearScene()
  }

  /**
   * 安装失败时释放仍归本 Controller 的候选：先 Pass（借用者）后 Scene（拥有者）。
   *
   * @remarks
   * 每一项都尝试，清理失败与安装错误一起抛出，不让清理错误盖掉安装错误。
   * 全部清理成功时直接返回，由调用者原样重抛安装错误。
   */
  private disposeCandidate(
    next: HW2SceneBuildResult,
    passes: readonly ForwardPass[],
    installationError: unknown
  ): void {
    const cleanupErrors: unknown[] = []

    for (const pass of passes) {
      try {
        pass.dispose()
      } catch (error) {
        cleanupErrors.push(error)
      }
    }

    try {
      next.scene.dispose()
    } catch (error) {
      cleanupErrors.push(error)
    }

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [installationError, ...cleanupErrors],
        'HW2 scene installation and candidate cleanup both failed',
        { cause: installationError }
      )
    }
  }

  /** 同时验证控制器存活、版本、active 对象身份和取消状态。 */
  private isCurrent(version: number, controller: AbortController): boolean {
    return (
      !this.disposedValue &&
      version === this.requestVersion &&
      this.activeAbortController === controller &&
      !controller.signal.aborted
    )
  }
}
