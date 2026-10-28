import type { SceneSetup } from '@/engine/SceneSetup'
import { createHW1Scene, type HW1SceneBuildResult } from './createHW1Scene'

/** 复用 Engine 的同步安装合同；入口不需要旧 renderer、camera 或 WebGL context。 */
export interface HW1SceneHost {
  /** 成功后 host 接管整个 setup；抛错时所有候选仍归调用者。 */
  setScene(setup: SceneSetup): void
  /** 清理失败可重试；已退出的会话不能再次安装迟到结果。 */
  clearScene(): void
}

/** 纯取消须原样抛出 signal.reason；回滚失败另行传播，不能伪装成取消成功。 */
export type HW1SceneFactory = (signal: AbortSignal) => Promise<HW1SceneBuildResult>

export interface HW1SceneSession {
  /** 安装完成或取消时完成；网络、装配、安装和清理错误继续传播。 */
  readonly ready: Promise<void>
  /** 给应用 GUI 的借用视图；加载中、失败或关闭后为 null。 */
  readonly current: HW1SceneBuildResult | null
  dispose(): void
}

/**
 * 加载 HW1 并立即交出退出能力，不让网络等待卡住作业切换器。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-entry-early-dispose]
 * host 会话须在调用前打开。先取消本入口，再 clearScene；即使底层忽略 abort，
 * 迟到的候选也只能清理。成功安装后，Scene/Pass 的释放责任整体归 host。
 * 只把加载阶段的已取消 rejection 当成正常退出，不吞掉候选清理失败。
 */
export function loadHW1Scene(
  host: HW1SceneHost,
  factory: HW1SceneFactory = createHW1Scene
): HW1SceneSession {
  const controller = new AbortController()
  let closed = false
  let clearing = false
  let cleared = false
  let current: HW1SceneBuildResult | null = null

  /** 候选尚未转交：先释放 Pass，再释放其借用的 Scene 资源，保留所有清理错误。 */
  function disposeCandidate(candidate: HW1SceneBuildResult): void {
    const errors: unknown[] = []
    for (const pass of candidate.passes) {
      try {
        pass.dispose()
      } catch (error) {
        errors.push(error)
      }
    }
    try {
      candidate.scene.dispose()
    } catch (error) {
      errors.push(error)
    }
    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new AggregateError(errors, 'HW1 candidate cleanup failed')
  }

  async function load(): Promise<void> {
    let candidate: HW1SceneBuildResult
    try {
      candidate = await factory(controller.signal)
    } catch (error) {
      if (controller.signal.aborted && error === controller.signal.reason) return
      throw error
    }
    if (closed) {
      disposeCandidate(candidate)
      return
    }
    try {
      host.setScene(candidate)
    } catch (error) {
      try {
        disposeCandidate(candidate)
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'HW1 installation and candidate cleanup failed',
          { cause: error }
        )
      }
      throw error
    }
    // host 提交期间若有同步回调请求退出，提交成功的候选仍由 host 负责清理。
    if (closed) {
      cleared = false
      dispose()
      return
    }
    current = candidate
  }

  /** 清理失败保留可重试状态；closed 表示不能再安装，不等于设备已经释放。 */
  function dispose(): void {
    if (clearing || cleared) return
    closed = true
    current = null
    clearing = true
    try {
      controller.abort()
      host.clearScene()
      cleared = true
    } finally {
      clearing = false
    }
  }

  const ready = load()
  return Object.freeze({
    ready,
    get current() {
      return current
    },
    dispose
  })
}
