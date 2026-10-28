// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 第 28 课用（2026-10-07 为第 13 课写，10-09 随边角内容移到第 28 课）：把一个「context 生命周期」类放在假的 canvas 上，按剧本派发事件，逐条记下发生了什么。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 生命周期执行器。
   *
   * - 假 canvas 就是一个 EventTarget：浏览器真实派发的 webglcontextlost / webglcontextrestored
   *   也是普通 DOM 事件，类只用到 addEventListener / removeEventListener，所以行为一致。
   *   真实浏览器里的事件是异步排队派发的；这里在剧本的每一步同步派发，方便看清顺序。
   * - 回调由剧本决定做什么：正常返回、抛错、在回调里 dispose、在回调里又派发一次 lost。
   * - 每个回调被调用时，记下那一刻的 state 和 isReady。
   * - 如果有异常逃出 DOM 监听器，浏览器会把它当作「未捕获的错误」报告（window 的 error 事件），
   *   这里接住并记下来，免得控制台里一片红。
   *
   * 版本类的约定：constructor(canvas, callbacks)；可以有 state、isReady 或 ready、lastFailure、dispose()。
   */
  const lab = (RTeach.lifecycleLab = RTeach.lifecycleLab || {})

  function describeError(error) {
    if (error && typeof error === 'object' && 'message' in error) return 'Error「' + error.message + '」'
    return String(error)
  }

  function snapshot(instance) {
    if (!instance) return '（还没构造完）'
    const parts = []
    if ('state' in instance) parts.push('state=' + instance.state)
    if ('isReady' in instance) parts.push('isReady=' + instance.isReady)
    else if ('ready' in instance) parts.push('ready=' + instance.ready)
    return parts.join('，')
  }

  function describeFailure(failure) {
    if (failure === null || failure === undefined) return 'null'
    let text = '{ phase: ' + failure.phase + '，error: ' + describeError(failure.error)
    if ('notificationError' in failure) text += '，notificationError: ' + describeError(failure.notificationError)
    return text + ' }'
  }

  /**
   * @param Version  版本类
   * @param scenario { steps: ('lost' | 'restored' | 'dispose')[], behaviors?: { [callback]: behavior | behavior[] } }
   *   behavior：'ok' | { throw: '消息' } | { dispose: true, thenThrow?: '消息' } | { fireLost: true }
   *     | { fire: ('lost' | 'restored')[], thenThrow?: '消息' }（回调里按顺序同步派发几个事件，再决定是否抛错）
   *   数组表示第 1、2……次调用各自的行为，超出部分按 'ok'。
   */
  lab.run = async function run(Version, scenario) {
    const lines = []
    let step = 0
    const log = (text, kind) => lines.push({ t: '第 ' + step + ' 步', text, kind: kind || '' })
    const canvas = new EventTarget()
    let instance = null
    const calls = {}

    const behaviorOf = (name) => {
      const spec = (scenario.behaviors || {})[name]
      const index = (calls[name] = (calls[name] || 0) + 1) - 1
      if (Array.isArray(spec)) return spec[index] || 'ok'
      return index === 0 ? spec || 'ok' : 'ok'
    }

    const fire = (type) => {
      const event = new Event(type, { cancelable: true })
      canvas.dispatchEvent(event)
      return event
    }

    const perform = (name, behavior) => {
      if (behavior === 'ok') return
      if (behavior.dispose) {
        log('（剧本）回调里调用了 dispose()', 'user')
        if (typeof instance.dispose === 'function') instance.dispose()
        else log('这一版没有 dispose，什么也没发生', 'muted')
        log('dispose() 返回了：' + snapshot(instance), 'muted')
        if (behavior.thenThrow) {
          log('（剧本）' + name + ' 接着抛出 Error「' + behavior.thenThrow + '」', 'user')
          throw new Error(behavior.thenThrow)
        }
        return
      }
      if (behavior.fire) {
        for (const kind of behavior.fire) {
          const type = kind === 'lost' ? 'webglcontextlost' : 'webglcontextrestored'
          log('（剧本）回调里同步派发一次 ' + type, 'user')
          fire(type)
          log('内层的 ' + kind + ' 处理完了，回到 ' + name + '：' + snapshot(instance), 'muted')
        }
        if (behavior.thenThrow) {
          log('（剧本）' + name + ' 接着抛出 Error「' + behavior.thenThrow + '」', 'user')
          throw new Error(behavior.thenThrow)
        }
        return
      }
      if (behavior.fireLost) {
        log('（剧本）回调里 context 又丢了：同步派发一次 webglcontextlost', 'user')
        fire('webglcontextlost')
        log('内层的 lost 处理完了，回到 ' + name + '：' + snapshot(instance), 'muted')
        return
      }
      if (behavior.throw) {
        log('（剧本）' + name + ' 抛出 Error「' + behavior.throw + '」', 'user')
        throw new Error(behavior.throw)
      }
    }

    const callbacks = {}
    for (const name of ['onLost', 'restore', 'onReady']) {
      callbacks[name] = () => {
        log('→ 调用 ' + name + '（这时 ' + snapshot(instance) + '）', 'abort')
        perform(name, behaviorOf(name))
        return undefined
      }
    }
    callbacks.onRestoreFailed = (error) => {
      log('→ 调用 onRestoreFailed(' + describeError(error) + ')（这时 ' + snapshot(instance) + '）', 'abort')
      perform('onRestoreFailed', behaviorOf('onRestoreFailed'))
      return undefined
    }
    callbacks.onSuppressedError = (report) => {
      log(
        '→ 调用 onSuppressedError：旧回调 ' + report.phase + ' 抛出的 ' + describeError(report.error) +
          '（capturedVersion=' + report.capturedVersion + '，currentVersion=' + report.currentVersion + '）',
        'abort'
      )
      return undefined
    }

    // 接住逃出 DOM 监听器的异常：浏览器会在 window 上派发 error 事件
    const onWindowError = (event) => {
      log('⚠ 异常逃出了 DOM 监听器，浏览器把它当作未捕获的错误：' + (event.message || describeError(event.error)), 'late')
      event.preventDefault()
    }
    const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function'
    if (hasWindow) window.addEventListener('error', onWindowError)

    try {
      instance = new Version(canvas, callbacks)
      log('构造完成：' + snapshot(instance), 'muted')
      for (const action of scenario.steps) {
        step += 1
        if (action === 'dispose') {
          log('（剧本）应用调用 dispose()', 'user')
          if (typeof instance.dispose === 'function') instance.dispose()
          else log('这一版没有 dispose', 'muted')
          log('之后：' + snapshot(instance), 'muted')
          continue
        }
        const type = action === 'lost' ? 'webglcontextlost' : 'webglcontextrestored'
        log('浏览器派发 ' + type, 'server')
        const event = fire(type)
        if (action === 'lost') log('lost 事件处理完：' + snapshot(instance) + '；preventDefault ' + (event.defaultPrevented ? '已调用' : '没调用'), 'muted')
        else log('restored 事件处理完：' + snapshot(instance), 'muted')
      }
    } finally {
      if (hasWindow) window.removeEventListener('error', onWindowError)
    }

    const tail = ['最后：' + snapshot(instance)]
    if ('lastFailure' in instance) tail.push('lastFailure=' + describeFailure(instance.lastFailure))
    lines.push({ t: '结果', text: tail.join('；'), kind: 'result' })
    return { lines }
  }
})()
