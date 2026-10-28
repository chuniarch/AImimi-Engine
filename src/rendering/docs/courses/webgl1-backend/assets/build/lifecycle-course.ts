// 第 28 课的课程版代码（项目源码里没有）：生命周期类的第 1、2、3 版，以及「只核对状态」的变体。
// 课程页上展示的就是这里的代码；lifecycle-edge-entry.ts 把它和真实的 WebGLContextLifecycle、WebGL1Backend 打进同一个包。
// 第 1–3 版原本写在第 13 课里（2026-10-09 移到这一课的草稿），代码没有改。

/** 五个回调，和真实代码的 WebGLContextLifecycleCallbacks 一样。 */
export interface Callbacks {
  onLost(): undefined
  restore(): undefined
  onReady(): undefined
  onRestoreFailed(error: unknown): undefined
  onSuppressedError(report: unknown): undefined
}

type State = 'ready' | 'lost' | 'restoring' | 'restore-failed' | 'disposed'

// ---------------- 第 1 版：一个布尔值，两个监听 ----------------

export class LifecycleV1 {
  ready = true // true：可以 draw

  constructor(canvas: EventTarget, private readonly callbacks: Callbacks) {
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault() // 告诉浏览器「我想恢复」：不调用的话，以后不会有 restored 事件
      this.callbacks.onLost() // 通知后端：这一代的缓存全部作废
      this.ready = false // 标记：不能再 draw
    })
    canvas.addEventListener('webglcontextrestored', () => {
      this.callbacks.restore() // 重新探测能力，建新的 State 和 Manager
      this.callbacks.onReady() // 收尾
      this.ready = true // 可以 draw 了
    })
  }
}

// ---------------- 第 2 版：状态机、先改状态再通知、异常留在监听器里 ----------------

export class LifecycleV2 {
  // ← 改动：一个布尔值分不清「丢了」「正在恢复」「恢复失败」「已关闭」，换成五个状态
  state: State = 'ready'
  // ← 新增：失败要留下记录，供上层查看（哪一步失败、原始错误是什么）
  lastFailure: { phase: string; error: unknown } | null = null

  constructor(
    private readonly canvas: EventTarget,
    private readonly callbacks: Callbacks
  ) {
    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
  }

  // 只有完整走完恢复流程才算可以 draw
  get isReady(): boolean {
    return this.state === 'ready'
  }

  // ← 新增：关闭时摘掉两个监听；以后的事件一概不处理
  dispose(): void {
    if (this.state === 'disposed') return
    this.state = 'disposed'
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
  }

  private readonly handleLost = (event: Event): void => {
    if (this.state === 'disposed') return
    event.preventDefault()
    // ← 新增：重复的 lost 事件不再执行一次 onLost
    if (this.state === 'lost') return
    // ← 改动：先改状态，再调用回调。回调执行时看到的 isReady 已经是 false
    this.state = 'lost'
    this.lastFailure = null
    try {
      this.callbacks.onLost()
    } catch (error) {
      // ← 新增：把错误记下来，不让它逃出 DOM 监听器
      this.lastFailure = { phase: 'on-lost', error }
    }
  }

  private readonly handleRestored = (): void => {
    // ← 新增：只有 lost 或 restore-failed 才接受恢复；ready、restoring、disposed 一律忽略
    if (this.state !== 'lost' && this.state !== 'restore-failed') return
    this.state = 'restoring' // 恢复期间 isReady 是 false：渲染循环不会在半成品上 draw
    this.lastFailure = null
    let phase = 'restore'
    try {
      this.callbacks.restore()
      phase = 'on-ready'
      this.callbacks.onReady()
      this.state = 'ready' // 全部成功，最后才改成 ready
    } catch (error) {
      this.state = 'restore-failed' // 和 lost 分开：上层能看出「恢复过，但失败了」
      this.lastFailure = { phase, error }
      try {
        this.callbacks.onRestoreFailed(error)
      } catch {
        // 通知自己也可能抛错；这一版先吞掉
      }
    }
  }
}

// ---------------- 第 2.5 版：回调返回后核对状态（课程为了对照另写的） ----------------

/**
 * 在第 2 版上只加一条规则：回调返回或抛错以后，先看状态还是不是自己写下的那个；
 * 不是，就说明中途发生过别的转换，这一轮作废。和第 3 版的区别只在「拿什么核对」。
 */
export class LifecycleStateCheck {
  state: State = 'ready'
  lastFailure: { phase: string; error: unknown } | null = null

  constructor(
    private readonly canvas: EventTarget,
    private readonly callbacks: Callbacks
  ) {
    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
  }

  get isReady(): boolean {
    return this.state === 'ready'
  }

  dispose(): void {
    if (this.state === 'disposed') return
    this.state = 'disposed'
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
  }

  private readonly handleLost = (event: Event): void => {
    if (this.state === 'disposed') return
    event.preventDefault()
    if (this.state === 'lost') return
    this.state = 'lost'
    this.lastFailure = null
    try {
      this.callbacks.onLost()
    } catch (error) {
      // ← 核对状态：还是 lost，就认为这一轮仍然有效
      if (this.state === 'lost') this.lastFailure = { phase: 'on-lost', error }
    }
  }

  private readonly handleRestored = (): void => {
    if (this.state !== 'lost' && this.state !== 'restore-failed') return
    this.state = 'restoring'
    this.lastFailure = null
    let phase = 'restore'
    try {
      this.callbacks.restore()
      if (this.state !== 'restoring') return // ← 核对状态
      phase = 'on-ready'
      this.callbacks.onReady()
      if (this.state !== 'restoring') return // ← 核对状态
      this.state = 'ready'
    } catch (error) {
      if (this.state !== 'restoring') return // ← 核对状态
      this.state = 'restore-failed'
      this.lastFailure = { phase, error }
      try {
        this.callbacks.onRestoreFailed(error)
      } catch {
        // 和第 2 版一样先吞掉
      }
    }
  }
}

// ---------------- 第 3 版：给每一轮发一个号码牌 ----------------

export class LifecycleV3 {
  state: State = 'ready'
  lastFailure: { phase: string; error: unknown } | null = null
  // ← 新增：每发生一次转换（lost、开始恢复、dispose）就加 1。它是「现在是第几轮」的号码牌
  private transitionVersion = 0

  constructor(
    private readonly canvas: EventTarget,
    private readonly callbacks: Callbacks
  ) {
    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
  }

  get isReady(): boolean {
    return this.state === 'ready'
  }

  dispose(): void {
    if (this.state === 'disposed') return
    this.state = 'disposed'
    this.transitionVersion++ // ← 新增：dispose 也算一次转换，正在进行的旧一轮因此作废
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
  }

  private readonly handleLost = (event: Event): void => {
    if (this.state === 'disposed') return
    event.preventDefault()
    if (this.state === 'lost') return
    // ← 新增：先把成员加 1，再把新值抄进局部变量 version。
    //   局部变量是这一轮的号码牌，之后不会再变
    const version = ++this.transitionVersion
    this.state = 'lost'
    this.lastFailure = null
    try {
      this.callbacks.onLost()
    } catch (error) {
      // ← 改动：号码牌还对得上，才说明这一轮仍然有效，才有资格记录失败
      if (version === this.transitionVersion) this.lastFailure = { phase: 'on-lost', error }
    }
  }

  private readonly handleRestored = (): void => {
    if (this.state !== 'lost' && this.state !== 'restore-failed') return
    const version = ++this.transitionVersion // ← 新增：这一轮恢复的号码牌
    this.state = 'restoring'
    this.lastFailure = null
    let phase = 'restore'
    try {
      this.callbacks.restore()
      // ← 新增：回调里可能已经发生了更新的转换（又丢失了，或被 dispose 了）。
      //   号码牌对不上，说明这一轮已经作废：立刻退出，不再往下走，更不能写 ready
      if (version !== this.transitionVersion) return
      phase = 'on-ready'
      this.callbacks.onReady()
      if (version !== this.transitionVersion) return // ← 新增：同上
      this.state = 'ready'
    } catch (error) {
      // ← 新增：作废那一轮的错误，不能写进现在的状态
      if (version !== this.transitionVersion) return
      this.state = 'restore-failed'
      this.lastFailure = { phase, error }
      try {
        this.callbacks.onRestoreFailed(error)
      } catch {
        // 这一版先吞掉
      }
    }
  }
}
