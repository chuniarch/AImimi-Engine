// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 依赖 course.js（RTeach.answerLayout、RTeach.linkSources），必须在它之后加载。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 请求实验台：在浏览器里用「模拟服务器」跑一段请求代码，逐条记下发生了什么。
   *
   * 为什么要模拟：课程页用 file:// 打开，发不了真的网络请求；而且要能精确控制
   * 「服务器第几毫秒回响应头、正文传多久、用户第几毫秒取消」。
   * 模拟的 fetch 按 Fetch 规范的取消语义来写，并且在 Node 里用真实的 fetch 和本地服务器逐格对照过：
   *   - 调用时 signal 已经亮了：不发请求，直接用 signal.reason 让 Promise 失败；
   *   - 等响应头时 signal 亮了：中止请求，用 signal.reason 失败；
   *   - 读正文时 signal 亮了：response.text() 用 signal.reason 失败；
   *   - 连不上服务器：失败值是 TypeError。
   *
   * 记录的内容：模拟服务器的动作、每一次 controller.abort()（谁按的、写下了什么原因）、
   * 在「你的 signal」上挂上和摘掉的 abort 监听，以及函数最后交回了什么。
   * 函数结束以后还会再观察一小段时间，用来暴露没停掉的计时器。
   */
  const lab = (RTeach.fetchLab = RTeach.fetchLab || {})

  // ---- 与项目同名的三个错误类（简化版，只保留课程用得到的字段） ----
  class NetworkError extends Error {
    constructor(url, message, options) {
      super(message, options)
      this.name = 'NetworkError'
      this.url = url
    }
  }
  class NetworkTimeoutError extends NetworkError {
    constructor(url, timeout) {
      super(url, 'Network timeout after ' + timeout + 'ms: ' + url)
      this.name = 'NetworkTimeoutError'
      this.timeout = timeout
    }
  }
  class HttpError extends NetworkError {
    constructor(url, status, statusText) {
      super(url, 'HTTP ' + status + ' ' + statusText + ': ' + url)
      this.name = 'HttpError'
      this.status = status
    }
  }
  lab.errors = { NetworkError, NetworkTimeoutError, HttpError }

  /** 超时时间：页面上的版本都用这个值代替默认的 6000 ms，免得每次实验等 6 秒。 */
  lab.TIMEOUT = 500
  /** 函数超过这么久还没结果，就当成「会一直等下去」。 */
  lab.HANG = 1500

  const original = {
    add: EventTarget.prototype.addEventListener,
    remove: EventTarget.prototype.removeEventListener,
    abort: AbortController.prototype.abort
  }

  let current = null
  let queue = Promise.resolve()

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  /** 把任意值说成一句人话。run.reason 是「你传的原因」那个对象。 */
  function describe(value, run) {
    if (value === run.reason) return '你传的原因「' + run.reason.message + '」（就是你传的那个对象）'
    if (value instanceof DOMException && value.name === 'AbortError') return '浏览器自动生成的 AbortError（不是你传的那个原因）'
    if (value instanceof NetworkTimeoutError) return 'NetworkTimeoutError（超时）'
    if (value instanceof HttpError) return 'HttpError（' + value.status + '）'
    if (value instanceof NetworkError) return 'NetworkError（连不上服务器）'
    if (value instanceof TypeError) return 'TypeError（浏览器的原始错误，没有换成项目的 NetworkError）'
    if (typeof value === 'string') return '文本「' + value + '」'
    if (value === undefined) return 'undefined'
    return String(value)
  }

  function signalName(signal, run) {
    if (!signal) return '没有 signal'
    return signal === run.caller.signal ? '你的 signal' : '函数里那个 controller 的 signal'
  }

  /** 实验期间临时替换 abort / addEventListener / removeEventListener，记下它们被怎样调用。 */
  function instrument(run) {
    AbortController.prototype.abort = function (reason) {
      const who = this === run.caller ? '你的 controller' : '函数里的 controller'
      if (this.signal.aborted) {
        run.log(who + ' 又按了一次取消：它早就亮过了，这一次没有任何效果', 'muted')
      } else if (arguments.length === 0 || reason === undefined) {
        run.log(who + ' 按下了取消，没写原因（浏览器会自动生成一个 AbortError）', 'abort')
      } else {
        const timer = reason instanceof NetworkTimeoutError ? '——这是计时器到点了' : ''
        run.log(who + ' 按下了取消，写下的原因：' + describe(reason, run) + timer, 'abort')
      }
      const result = original.abort.apply(this, arguments)
      if (this === run.caller) {
        for (const [listener, once] of run.listeners) {
          if (once) {
            run.listeners.delete(listener)
            run.log('你的 signal 上那个 once 监听执行完，自动摘掉了', 'muted')
          }
        }
      }
      return result
    }
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === run.caller.signal && type === 'abort') {
        const once = Boolean(options && typeof options === 'object' && options.once)
        run.listeners.set(listener, once)
        run.log('在你的 signal 上挂了一个 abort 监听' + (once ? '（{ once: true }）' : ''))
      }
      return original.add.apply(this, arguments)
    }
    EventTarget.prototype.removeEventListener = function (type, listener) {
      if (this === run.caller.signal && type === 'abort' && run.listeners.delete(listener)) {
        run.log('从你的 signal 上摘掉了这个监听')
      }
      return original.remove.apply(this, arguments)
    }
  }

  function restore() {
    AbortController.prototype.abort = original.abort
    EventTarget.prototype.addEventListener = original.add
    EventTarget.prototype.removeEventListener = original.remove
  }

  /**
   * 模拟的 fetch。只在实验进行中可用；它自己挂在 signal 上的监听用原始方法，不计入记录。
   * 场景字段：head（响应头延迟，Infinity 表示一直不回）、body（正文传输时间）、
   * status、statusText、text（正文内容）、fail: 'network'（连不上）。
   */
  lab.fetch = function fetch(url, init) {
    const run = current
    if (!run) return Promise.reject(new Error('fetch-lab：只能在实验里调用'))
    const scenario = run.scenario
    const signal = init && init.signal ? init.signal : null

    return new Promise((resolve, reject) => {
      run.requestsTried += 1
      if (signal && signal.aborted) {
        run.log('fetch 一看，' + signalName(signal, run) + ' 早就亮了：不发请求，直接失败', 'server')
        reject(signal.reason)
        return
      }
      run.requests += 1
      run.log('发出请求（fetch 盯着：' + signalName(signal, run) + '）', 'server')

      let stage = 'head'
      let headTimer = null
      let bodyTimer = null
      let rejectBody = null

      function onAbort() {
        if (stage === 'done' || stage === 'aborted') return
        clearTimeout(headTimer)
        clearTimeout(bodyTimer)
        const during = stage === 'head' ? '还在等响应头' : '正在读正文'
        run.log('fetch 盯着的 signal 亮了（' + during + '）：中止请求', 'server')
        if (stage === 'head') reject(signal.reason)
        else if (rejectBody) rejectBody(signal.reason)
        stage = 'aborted'
      }
      if (signal) original.add.call(signal, 'abort', onAbort, { once: true })
      const finish = () => {
        stage = 'done'
        if (signal) original.remove.call(signal, 'abort', onAbort)
      }

      if (scenario.fail === 'network') {
        headTimer = setTimeout(() => {
          if (run.closed) return
          finish()
          run.log('连不上服务器', 'server')
          reject(new TypeError('Failed to fetch'))
        }, 20)
        return
      }
      if (scenario.head === Infinity) return

      headTimer = setTimeout(() => {
        if (run.closed) return
        stage = 'body'
        const status = scenario.status || 200
        run.log('服务器回了响应头：' + status + (status === 200 ? '' : ' ' + (scenario.statusText || '')), 'server')
        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: scenario.statusText || 'OK',
          headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'text/plain' : null) },
          text() {
            return new Promise((resolveBody, rejectBodyNow) => {
              if (stage === 'aborted') {
                rejectBodyNow(signal.reason)
                return
              }
              rejectBody = rejectBodyNow
              bodyTimer = setTimeout(() => {
                if (run.closed) return
                finish()
                run.log('正文传完了', 'server')
                resolveBody(scenario.text || 'attribute vec3 position;')
              }, scenario.body || 0)
            })
          }
        })
      }, scenario.head)
    })
  }

  /**
   * 跑一次实验。同一时刻只跑一个（排队），因为要临时替换全局的 abort / addEventListener。
   * @param version  { label, call(url, signal, timeout): Promise }
   * @param scenario { head, body, status, statusText, text, fail, abortAt, preAbort }
   * @returns Promise<{ lines, outcome, listenersLeft, requests }>
   */
  lab.run = function run(version, scenario) {
    const next = queue.then(() => runOne(version, scenario))
    queue = next.catch(() => undefined)
    return next
  }

  async function runOne(version, scenario) {
    const run = {
      scenario,
      lines: [],
      listeners: new Map(),
      requests: 0,
      requestsTried: 0,
      settled: false,
      closed: false,
      reason: new Error('用户切换了场景'),
      caller: new AbortController(),
      t0: performance.now()
    }
    run.log = (text, kind) => {
      if (run.closed) return
      run.lines.push({ t: Math.round(performance.now() - run.t0), text, kind: kind || '', late: run.settled })
    }
    current = run
    instrument(run)
    let outcome
    try {
      if (scenario.preAbort) {
        run.log('（场景）你先按了取消，过了一会儿代码才调用这个函数', 'user')
        run.caller.abort(run.reason)
      }
      if (typeof scenario.abortAt === 'number') {
        setTimeout(() => {
          if (run.closed) return
          run.log('（场景）你在 GUI 里换了场景', 'user')
          run.caller.abort(run.reason)
        }, scenario.abortAt)
      }
      run.log('调用 ' + version.label, 'call')
      let promise
      try {
        promise = Promise.resolve(version.call('/shaders/prt.vert', run.caller.signal, lab.TIMEOUT))
      } catch (error) {
        promise = Promise.reject(error)
      }
      const result = await Promise.race([
        promise.then(
          (value) => ({ kind: 'value', value }),
          (error) => ({ kind: 'error', error })
        ),
        sleep(lab.HANG).then(() => ({ kind: 'hang' }))
      ])
      if (result.kind === 'value') {
        outcome = { kind: 'value', text: '函数返回了：' + describe(result.value, run) }
      } else if (result.kind === 'error') {
        outcome = { kind: 'error', text: '函数抛出了：' + describe(result.error, run) }
      } else {
        outcome = { kind: 'hang', text: (lab.HANG / 1000) + ' 秒了，函数还没有结果——它会一直等下去' }
      }
      run.log(outcome.text, 'result')
      run.settled = true
      // 再观察一会儿：没停掉的计时器会在这段时间里冒出来
      const elapsed = performance.now() - run.t0
      await sleep(Math.max(150, lab.TIMEOUT + 150 - elapsed))
    } finally {
      run.closed = true
      restore()
      current = null
    }
    return {
      lines: run.lines,
      outcome,
      listenersLeft: run.listeners.size,
      requests: run.requests
    }
  }

  // ---------------------------------------------------------------- 界面

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function renderTrace(box, report) {
    box.replaceChildren()
    const list = element('ol', 'lab-trace')
    for (const line of report.lines) {
      const item = element('li', 'lab-line ' + line.kind + (line.late ? ' late' : ''))
      item.append(element('span', 'lab-t', String(line.t).padStart(4, ' ') + ' ms'))
      item.append(element('span', 'lab-text', (line.late ? '（函数已结束）' : '') + line.text))
      list.append(item)
    }
    box.append(list)
    const summary = element('p', 'lab-summary')
    summary.textContent =
      '真正发出的请求：' + report.requests + ' 次　｜　结束时你的 signal 上还挂着 ' + report.listenersLeft + ' 个监听'
    box.append(summary)
  }

  /**
   * 「先预测、再运行」卡片。
   * @param options.mount     容器
   * @param options.storageKey localStorage 键
   * @param options.versions  { id: { label, call } }
   * @param options.scenarios { id: { title, desc, ...场景字段 } }
   * @param options.cards     [{ title, version, scenario, question, choices, answer, explain（HTML） }]
   */
  lab.cards = function cards(options) {
    const key = 'webgl1-teach:fetch-lab:' + (options.storageKey || 'lab')
    const root = element('div', 'lab')
    const layouts = RTeach.answerLayout
      ? RTeach.answerLayout(
          options.cards.map((card) => ({ key: card.title, count: card.choices.length, answer: card.answer })),
          'fetch-lab:' + (options.storageKey || 'lab')
        )
      : options.cards.map((card) => card.choices.map((_, i) => i))
    let correct = 0
    let answered = 0
    const score = element('div', 'lab-score')

    options.cards.forEach((card, index) => {
      const version = options.versions[card.version]
      const scenario = options.scenarios[card.scenario]
      const box = element('div', 'lab-card')
      box.append(element('p', 'lab-head', card.title))
      const meta = element('p', 'lab-meta')
      meta.append(element('span', 'lab-tag', version.label))
      meta.append(element('span', 'lab-tag', '场景：' + scenario.title))
      box.append(meta)
      box.append(element('p', 'lab-desc', scenario.desc))
      box.append(element('p', 'lab-q', card.question))

      const choices = element('div', 'lab-choices')
      const out = element('div', 'lab-out')
      out.hidden = true
      let done = false
      layouts[index].forEach((choiceIndex) => {
        const button = element('button', 'lab-choice', card.choices[choiceIndex])
        button.type = 'button'
        button.dataset.index = String(choiceIndex)
        button.addEventListener('click', async () => {
          if (done) return
          done = true
          for (const other of choices.querySelectorAll('button')) other.disabled = true
          button.dataset.picked = 'true'
          out.hidden = false
          out.replaceChildren(element('p', 'lab-running', '运行中……'))
          const report = await lab.run(version, scenario)
          renderTrace(out, report)
          const isRight = choiceIndex === card.answer
          answered += 1
          if (isRight) correct += 1
          button.dataset.state = isRight ? 'ok' : 'bad'
          const right = choices.querySelector('[data-index="' + card.answer + '"]')
          if (right) right.dataset.state = 'ok'
          const verdict = element('div', 'lab-verdict')
          verdict.innerHTML = (isRight ? '<strong>猜对了。</strong>' : '<strong>和你猜的不一样。</strong>') + card.explain
          if (RTeach.linkSources) RTeach.linkSources(verdict)
          out.append(verdict)
          updateScore()
        })
        choices.append(button)
      })
      box.append(choices)
      box.append(out)
      root.append(box)
    })
    root.append(score)
    options.mount.replaceChildren(root)

    const previous = read()
    score.textContent = previous ? '上次：' + previous.correct + '/' + previous.total + '（' + previous.when + '）' : ''

    function updateScore() {
      score.textContent = '本次：' + correct + '/' + answered
      if (answered === options.cards.length) {
        try {
          localStorage.setItem(
            key,
            JSON.stringify({ correct, total: answered, when: new Date().toLocaleDateString('zh-CN') })
          )
        } catch {
          /* 隐私模式等情况下忽略 */
        }
      }
    }
    function read() {
      try {
        const raw = localStorage.getItem(key)
        return raw === null ? null : JSON.parse(raw)
      } catch {
        return null
      }
    }
  }

  /** 自由组合：任选一个版本和一个场景，运行看记录。 */
  lab.playground = function playground(options) {
    const root = element('div', 'lab-card lab-play')
    root.append(element('p', 'lab-head', options.title || '自由组合'))
    const bar = element('p', 'lab-bar')
    const pickVersion = element('select')
    for (const [id, version] of Object.entries(options.versions)) {
      const option = element('option', '', version.label)
      option.value = id
      pickVersion.append(option)
    }
    const pickScenario = element('select')
    for (const [id, scenario] of Object.entries(options.scenarios)) {
      const option = element('option', '', scenario.title)
      option.value = id
      pickScenario.append(option)
    }
    const go = element('button', 'lab-go', '运行')
    go.type = 'button'
    bar.append(pickVersion, pickScenario, go)
    root.append(bar)
    const desc = element('p', 'lab-desc')
    const showDesc = () => (desc.textContent = options.scenarios[pickScenario.value].desc)
    pickScenario.addEventListener('change', showDesc)
    showDesc()
    root.append(desc)
    const out = element('div', 'lab-out')
    root.append(out)
    go.addEventListener('click', async () => {
      go.disabled = true
      out.replaceChildren(element('p', 'lab-running', '运行中……'))
      const report = await lab.run(options.versions[pickVersion.value], options.scenarios[pickScenario.value])
      renderTrace(out, report)
      go.disabled = false
    })
    options.mount.replaceChildren(root)
  }
})()
