import { ResourceDisposedError } from '@/rendering/core/errors'
import type { SceneDisposer } from '@/scenes/types/SceneDisposer'

/** 值同时用于运行时验证和 GUI 选项，避免两份列表漂移。 */
export const HOMEWORK_NAMES = ['HW1', 'HW2', 'HW3', 'HW4', 'Deferred/Lambert'] as const

export type HomeworkName = (typeof HOMEWORK_NAMES)[number]

/**
 * 串行交接作业会话；不认识 WebGL 或具体 GUI。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][games202-serialized-handoff]
 *
 * HW3/4 loader 不支持取消，且 await 后仍会修改 GPU，必须等它交还 disposer。
 * 尚未开始的过期选择可以跳过；已开始的 loader 必须完成并清理，不能假装取消。
 * HW1/HW2 loader 则立即交还会话 disposer，不把默认资产加载放进这个队列。
 */
export class Games202SceneSwitcher {
  /** 队列尾永远恢复为 fulfilled；单次操作的原始 rejection 仍交给调用方。 */
  private tail: Promise<void> = Promise.resolve()

  private generation = 0
  private closed = false

  /** 清理成功后才清空；失败时保留句柄供显式重试。 */
  private activeDisposer: SceneDisposer | null = null

  /** 对“失败后 GPU 半成品不明”的 loader 采取封闭策略，不再启动另一个。 */
  private loadFailure: { readonly cause: unknown } | null = null

  /**
   * @param load - 返回当前作业清理句柄；HW1/HW2 不在此等待 session.ready。
   * @param beforeLoad - 清理成功后执行的设备模式校验与旧 pass 清理屏障。
   */
  constructor(
    private readonly load: (name: HomeworkName) => Promise<SceneDisposer>,
    private readonly beforeLoad: () => void
  ) {}

  /** 请求最新作业；过期排队请求正常结束，故返回不代表该作业一定安装。 */
  async switchTo(name: HomeworkName): Promise<void> {
    if (this.closed) {
      return Promise.reject(new ResourceDisposedError('Games202SceneSwitcher'))
    }

    if (!HOMEWORK_NAMES.includes(name)) {
      return Promise.reject(new RangeError('Unknown homework: ' + String(name)))
    }

    const generation = ++this.generation

    return this.enqueue(async () => {
      if (!this.isCurrent(generation)) return

      if (this.loadFailure) {
        throw new Error('Previous loader failed; reload the application before switching', {
          cause: this.loadFailure.cause
        })
      }

      this.disposeActive()
      if (!this.isCurrent(generation)) return

      this.beforeLoad()
      if (!this.isCurrent(generation)) return

      let next: SceneDisposer

      try {
        next = await this.load(name)
      } catch (cause) {
        // 不能凭一个 reject 推断旧 loader 已回滚 GUI、pass 和 GPU 半成品。
        this.loadFailure = { cause }
        throw cause
      }

      this.activeDisposer = next

      if (!this.isCurrent(generation)) {
        this.disposeActive()
      }
    })
  }

  /**
   * 停止接受新请求，等待在途旧 loader，并清理其返回的资源。
   *
   * 清理失败后可以再次调用；closed 不等于“所有资源已释放”。
   */
  async dispose(): Promise<void> {
    this.closed = true
    this.generation += 1

    return this.enqueue(async () => {
      this.disposeActive()
    })
  }

  /** 清理回调同步提出新选择时，后续 isCurrent 检查会跳过旧选择。 */
  private disposeActive(): void {
    const dispose = this.activeDisposer
    if (!dispose) return

    dispose()
    this.activeDisposer = null
  }

  private isCurrent(generation: number): boolean {
    return !this.closed && generation === this.generation
  }

  /** 捕获只是为了让队列可继续；返回给外界的 result 仍保留原始错误。 */
  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.tail.then(operation)

    this.tail = result.catch(() => undefined)

    return result
  }
}
