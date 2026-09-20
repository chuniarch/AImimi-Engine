/** 这是引擎观察到的事件状态，不是对浏览器物理 context 状态的实时轮询。 */
export type WebGLContextState = 'ready' | 'lost' | 'restoring' | 'restore-failed' | 'disposed'

/**
 * 已抛错、但无权再修改当前生命周期的旧回调诊断快照。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-context-suppressed-error-observability]
 * `stale` 恒为 true，用于让日志/监控明确区分「旧回调失败」与当前
 * `lastFailure`。版本号描述生命周期转换的先后，不表示恢复成功次数。
 * 该对象只冻结外层诊断字段，不冻结调用者提供的原始 error。
 */
export interface WebGLContextSuppressedError {
  /** 被旧调用栈抛出的原始值。 */
  readonly error: unknown
  /** 抛错的生命周期回调阶段。 */
  readonly phase: 'on-lost' | 'restore' | 'on-ready' | 'on-restore-failed'
  /** 明确表示本错误所属转换已经被更新转换取代。 */
  readonly stale: true
  /** 旧调用栈开始时取得、之后不再变化的转换版本。 */
  readonly capturedVersion: number
  /** 报告发生时真正有效的转换版本。 */
  readonly currentVersion: number
}

/**
 * Backend 注入的同步生命周期操作。
 *
 * @remarks
 * 返回 undefined 而不是 void，拒绝普通 async 回调。
 * 这仍不能阻止回调内部偷偷启动异步任务；实现和审查必须保持同步。
 */
export interface WebGLContextLifecycleCallbacks {
  /** 已标记 lost 后，使资源和状态缓存失效；不删除失效的 GPU handles。 */
  onLost(): undefined
  /** 重新探测能力，创建新的 State/Managers；失败由本类捕获。 */
  restore(): undefined
  /** 同步恢复收尾；此回调返回之前，isReady 仍为 false，不能在这里 draw。 */
  onReady(): undefined
  /** 恢复失败通知；调用时 state 已是 restore-failed。 */
  onRestoreFailed(error: unknown): undefined
  /**
   * 观察已过期回调抛出的错误；不得修改生命周期、重试恢复或再次抛错。
   *
   * @remarks
   * 这是诊断出口，不是第二条失败状态。调用时更新转换已经取得状态写权限，
   * 因此错误不会写入 `lastFailure`，也不会把 lost/disposed 改回 restore-failed。
   */
  onSuppressedError(error: WebGLContextSuppressedError): undefined
}

/** 原始失败保持可观察；不把不同失败一律包装成新的裸 Error。 */
export interface WebGLContextFailure {
  readonly phase: 'on-lost' | 'restore' | 'on-ready'
  readonly error: unknown
  /** 如果失败通知自身又抛错，同时保存它，不覆盖原始失败。 */
  readonly notificationError?: unknown
}

/**
 * 仅负责 canvas 事件、状态转换和回调顺序。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
 *
 * 构造前由 Backend 确认 context 已创建且可用。本类不创建 GL 资源，
 * 不停止 rAF，不承诺浏览器一定恢复，也不发起无限自动重试。
 * onLost 抛错时保持 lost 并记录 lastFailure；恢复/就绪回调抛错时
 * 进入 restore-failed 并通知。已经被更新转换取代的回调错误只通过
 * onSuppressedError 观察，不取得状态写权限。所有业务回调异常均不逃出 DOM listener。
 */
export class WebGLContextLifecycle {
  private readonly canvas: EventTarget

  private stateValue: WebGLContextState = 'ready'
  private failureValue: WebGLContextFailure | null = null
  private readonly callbacks: Readonly<WebGLContextLifecycleCallbacks>

  /**
   * 同步重入的观察令牌；不是 GPU 资源版本或撤销历史。
   * 每次 lost、恢复尝试、dispose 都改变令牌，使旧回调不能覆盖新状态。
   */
  private transitionVersion = 0

  /**
   * 只借用事件接口，因此测试可传 EventTarget；真实运行传 HTMLCanvasElement。
   * 本类拥有两个 listener 的注册责任，但不拥有 canvas。
   */
  constructor(canvas: EventTarget, callbacks: WebGLContextLifecycleCallbacks) {
    this.canvas = canvas

    this.callbacks = Object.freeze({
      onLost: callbacks.onLost,
      restore: callbacks.restore,
      onReady: callbacks.onReady,
      onRestoreFailed: callbacks.onRestoreFailed,
      onSuppressedError: callbacks.onSuppressedError
    })

    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
  }

  /** disposed 后也可读，用于诊断最终状态。 */
  get state(): WebGLContextState {
    return this.stateValue
  }

  /** 只在本类完成所有同步恢复步骤后为 true。 */
  get isReady(): boolean {
    return this.stateValue === 'ready'
  }

  /** 新一轮有效 lost/restore 清除旧记录；dispose 保留最后的诊断。 */
  get lastFailure(): WebGLContextFailure | null {
    return this.failureValue
  }

  /**
   * 幂等地移除监听并终止本生命周期对象；不触发 loseContext 或删除资源。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
   * 先改变状态与令牌；即使正在某个回调内 dispose，外层恢复也不能再写回 ready。
   */
  dispose(): void {
    if (this.stateValue === 'disposed') return
    this.stateValue = 'disposed'
    this.transitionVersion++
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
  }

  /**
   * 响应浏览器的 context 丢失通知，先禁止绘制，再通知 Backend 使缓存失效。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
   *
   * 这里处理的是「已经丢失之后怎么办」，不是主动调用 loseContext，
   * 也不是在事件中立即重建 GPU 资源。正常执行顺序如下：
   * 1. disposed 对象不再处理事件；dispose 已负责解除两个事件监听。
   * 2. 调用 preventDefault，表达允许浏览器后续尝试恢复的意愿。
   *    它不撤销已经发生的丢失，也不保证一定收到 restored 事件。
   * 3. 如果已经处于 lost，直接返回，避免重复执行 onLost 和清空诊断。
   *    preventDefault 放在这个判断之前，因此重复 lost 事件仍会被取消默认行为。
   * 4. 增加转换版本，先写入 lost 并清除上一轮失败，再同步执行 onLost。
   *    因而回调内观察到的 isReady 已为 false，不会把资源失效期间误判为可绘制。
   * 5. onLost 由 Backend 注入，负责使资源与状态缓存失效；它不应删除已经失效的
   *    GPU handles。本类只协调调用顺序，不负责停止 rAF 或实现 Manager 清理。
   *
   * 若 onLost 抛错，本轮仍保持 lost，并通过 lastFailure 保存原始错误；
   * 这不是恢复阶段失败，因此不调用 onRestoreFailed，也不把异常抛出 DOM listener。
   * 这里的「本轮」有前提：回调没有通过同步重入启动更新的转换或 dispose。
   *
   * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
   *
   * 前置 ++ 先增加成员版本，再把新值复制到局部 version；例如 4 → 5，
   * 此时两者都是 5。局部 number 是本轮令牌，不会跟随成员后续变化。
   * 如果 onLost 内先调用 dispose，再抛错，成员版本会变成 6，局部仍是 5。
   * catch 必须确认版本仍相等才能记录失败，否则旧回调会覆盖更新转换的诊断。
   * 若版本已经变化，原始错误通过 onSuppressedError 报告为 stale，不写入
   * lastFailure，也不改变新转换已经发布的状态。
   * 这是同步回调重入保护，不要求存在多个线程或 async/await。
   *
   * @param event 浏览器发送的丢失事件；测试用可取消的 Event 模拟事件协议，
   * 不代表测试真的使 GPU context 丢失。
   */
  private readonly handleLost = (event: Event): void => {
    if (this.stateValue === 'disposed') return

    event.preventDefault()

    if (this.stateValue === 'lost') return

    const version = ++this.transitionVersion
    this.stateValue = 'lost'
    this.failureValue = null

    try {
      this.callbacks.onLost()
    } catch (error: unknown) {
      if (version === this.transitionVersion) {
        this.failureValue = Object.freeze({ phase: 'on-lost', error })
      } else {
        this.reportSuppressedError(error, 'on-lost', version)
      }
    }
  }

  /**
   * 响应浏览器的 context 恢复通知，完成引擎重建与收尾后才重新允许绘制。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
   *
   * 浏览器发送 restored 只说明 context 已恢复，不代表旧 GPU handles 重新有效，
   * 也不代表引擎已经完成资源重建。只有 lost 或 restore-failed 状态接受此通知；
   * ready、restoring、disposed 状态均忽略，因此恢复中的重复事件不会递归恢复。
   * 接受通知后的同步顺序为：
   * 1. 增加转换版本，进入 restoring，并清除上一轮失败记录。
   * 2. 调用 Backend 注入的 restore，重新探测能力并建立新的 State/Managers。
   *    实际重建策略由 Backend 负责，本类不直接创建任何 GL 对象。
   * 3. 确认仍属于本轮后，调用 onReady 做同步恢复收尾。
   *    尽管回调名为 onReady，它执行期间仍是 restoring，isReady 仍为 false，
   *    因此不能在该回调里开始 draw。
   * 4. 收尾成功返回且版本仍相等，最后才发布 ready 状态。
   *
   * 若 restore 或 onReady 抛错且本轮仍有效，先进入 restore-failed，
   * 再保存带 phase 的原始错误并调用 onRestoreFailed；通知回调观察到的
   * isReady 已为 false。若通知自身又抛错，同时记录 notificationError，
   * 不覆盖最初的恢复错误。上述回调异常均不逃出 DOM listener。
   * 本类不自动制造 restored 事件，也不因失败进入无限重试。
   *
   * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
   *
   * 每次外部回调返回或抛错后，都必须先检查本轮 version 是否仍然有效。
   * 例如恢复开始时两者都是 2；restore 内同步触发新的 lost 转换后，
   * 成员版本变成 3，旧调用栈里的 version 仍为 2。旧恢复必须立即退出，
   * 不能继续调用 onReady，更不能把较新的 lost 覆盖成 ready。
   * 回调内 dispose 同理；失败通知自身重入后，旧通知错误也不能覆盖新诊断。
   * 若旧回调随后抛错，onSuppressedError 接收冻结的 phase/version 快照；
   * 它只用于日志/监控，不重试恢复，也不把该错误写成当前 lastFailure。
   * 这些检查保护的是「旧调用栈不能提交新生命周期的状态」，不是 GPU 资源版本，
   * 也不表示允许异步恢复；所有注入回调仍须遵守同步返回 undefined 的契约。
   */
  private readonly handleRestored = (): void => {
    if (this.stateValue !== 'lost' && this.stateValue !== 'restore-failed') return

    const version = ++this.transitionVersion
    this.stateValue = 'restoring'
    this.failureValue = null
    let phase: 'restore' | 'on-ready' = 'restore'

    try {
      this.callbacks.restore()
      if (version !== this.transitionVersion) return

      phase = 'on-ready'
      this.callbacks.onReady()
      if (version !== this.transitionVersion) return

      this.stateValue = 'ready'
    } catch (error: unknown) {
      if (version !== this.transitionVersion) {
        this.reportSuppressedError(error, phase, version)
        return
      }

      this.stateValue = 'restore-failed'
      const failure: WebGLContextFailure = Object.freeze({ phase, error })
      this.failureValue = failure

      try {
        this.callbacks.onRestoreFailed(error)
      } catch (notificationError: unknown) {
        if (version === this.transitionVersion) {
          this.failureValue = Object.freeze({ ...failure, notificationError })
        } else {
          this.reportSuppressedError(notificationError, 'on-restore-failed', version)
        }
      }
    }
  }

  /**
   * 创建冻结的 stale 诊断快照并交给 Backend 提供的观察者。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-context-suppressed-error-observability]
   * 观察者必须是非抛出的日志/监控出口；运行时仍用 try/catch 隔离违反约定的
   * 实现，避免诊断失败逃出 DOM listener 或覆盖更新生命周期。这里不能递归调用
   * 同一个观察者报告它自己的错误，也没有第二个 logger 依赖，因此该二次错误
   * 只能被丢弃。若未来要求监控诊断通道自身，应在 Lifecycle 外提供非抛出的
   * fallback，而不是把它写入当前 `lastFailure`。
   *
   * @param error 旧生命周期回调抛出的原始值。
   * @param phase 抛错回调所处的精确阶段。
   * @param capturedVersion 旧调用栈进入转换时捕获的版本。
   */
  private reportSuppressedError(
    error: unknown,
    phase: WebGLContextSuppressedError['phase'],
    capturedVersion: number
  ): void {
    try {
      this.callbacks.onSuppressedError(
        Object.freeze({
          error,
          phase,
          stale: true,
          capturedVersion,
          currentVersion: this.transitionVersion
        })
      )
    } catch {
      // The diagnostic boundary must not regain lifecycle control by throwing.
    }
  }
}
