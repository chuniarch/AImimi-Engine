// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 依赖 gl-sandbox.js（RTeach.gl.runCode 等），必须在它之后加载。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  /**
   * 「先预测、再运行」组件。
   *
   * 每张卡片给出一小段 GL 代码。学习者先选一个预测（例如「这次会从哪条失败通道报出来」），
   * 选完才真正运行：在新的记录代理上执行 prelude + 这段代码，展示 GL 错误（精确到这一段的
   * 第几个调用）、log 输出、异常和画布像素，再给出判定和解析。
   * 先预测、后看证据，是为了逼自己先调动心智模型，再用真实的运行结果去校正它。
   *
   * @param options.mount       容器元素
   * @param options.storageKey  记录作答结果的键（localStorage；不可用时忽略）
   * @param options.choices     预测选项（字符串数组），所有卡片共用；某张卡片可以用 item.choices 覆盖
   * @param options.prelude     每段代码之前先跑的公共代码；卡片里不显示，调用日志也只显示卡片自己的部分
   * @param options.width       画布宽（像素，默认 160）
   * @param options.height      画布高（像素，默认 100）
   * @param options.canvas      false 表示这组卡片不画图：证据里不显示画布和像素（第 4 课起跑真实项目代码时用）
   * @param options.items       [{ title, code, answer, explain（HTML）, choices?: string[], pixel?: [x, y],
   *                              note?: 显示在代码下方的一行纯文本，例如标明哪些代码是课程自己写的、不在项目源码里,
   *                              overrides?: 故障注入表，原样交给 RTeach.gl.runCode（格式见 gl-sandbox.js 的 instrument） }]
   *                              卡片界面会列出注入了哪些调用，免得学习者以为那是真实设备的行为。
   */
  RTeach.predict = function predict(options) {
    const width = options.width || 160
    const height = options.height || 100
    const showCanvas = options.canvas !== false
    const key = 'webgl1-teach:predict:' + (options.storageKey || 'predict')
    const root = element('div', 'predict')
    const score = element('div', 'score')
    let correct = 0
    let answered = 0

    // 卡片自带的选项（item.choices）按整组均匀地排答案位置（同 quiz.js）；
    // 全组共用的选项是一份图例，保持原顺序。
    const own = options.items.filter((item) => item.choices)
    const layouts = new Map()
    if (own.length > 0 && RTeach.answerLayout) {
      const orders = RTeach.answerLayout(
        own.map((item) => ({ key: item.title, count: item.choices.length, answer: item.answer })),
        // 加前缀：和同一页检查题的 data-quiz 同名时，两组也不会排出一模一样的位置
        'predict:' + (options.storageKey || 'predict')
      )
      own.forEach((item, index) => layouts.set(item, orders[index]))
    }

    options.items.forEach((item) => {
      const card = element('div', 'predict-card')
      card.append(element('p', 'head', item.title))

      const pre = element('pre')
      const code = element('code')
      code.textContent = item.code
      pre.append(code)
      card.append(pre)

      // 课程自写的代码要明说：学习者会去源码里找它，找不到就会困惑。
      if (item.note) card.append(element('p', 'note', item.note))

      // 故障注入要明说：这一张卡片里，下面这些调用的返回值是假的。
      if (item.overrides) {
        const names = Object.keys(item.overrides).join('、')
        card.append(element('p', 'note', '故障注入：这张卡片把 ' + names + ' 的返回值换成了假的，用来模拟设备出错。'))
      }

      const choices = element('div', 'choices')
      const result = element('div', 'result')
      result.hidden = true

      let done = false
      const labels = item.choices || options.choices
      const order = layouts.get(item) || labels.map((_, index) => index)
      // buttons 按原始下标存放，item.answer 始终指原始下标。
      const buttons = new Array(labels.length)
      order.forEach((choiceIndex) => {
        const label = labels[choiceIndex]
        const button = element('button', 'choice', label)
        button.type = 'button'
        button.addEventListener('click', () => {
          if (done) return
          done = true
          const right = choiceIndex === item.answer
          button.dataset.state = right ? 'ok' : 'bad'
          if (!right) buttons[item.answer].dataset.state = 'ok'
          answered += 1
          if (right) correct += 1
          show(right, choiceIndex)
          updateScore()
        })
        choices.append(button)
        buttons[choiceIndex] = button
      })

      card.append(choices, result)
      root.append(card)

      function show(right, choiceIndex) {
        const canvas = element('canvas')
        const outcome = RTeach.gl.runCode(item.code, {
          canvas,
          width,
          height,
          prelude: options.prelude || '',
          overrides: item.overrides || null
        })

        const verdict = element('p', 'verdict ' + (right ? 'ok' : 'bad'))
        verdict.textContent = right
          ? '预测正确：' + labels[item.answer]
          : '不对。你选的是「' + labels[choiceIndex] + '」，答案是「' + labels[item.answer] + '」'
        result.replaceChildren(verdict)

        if (outcome.noContext) {
          result.append(element('p', '', '没有拿到 WebGL context，无法运行。'))
          result.hidden = false
          return
        }

        const evidence = element('div', 'evidence')
        if (showCanvas) evidence.append(canvas)
        const list = element('ul')
        const own = outcome.calls.slice(outcome.markIndex)

        const ownErrors = own.filter((entry) => entry.error)
        if (ownErrors.length === 0) list.append(element('li', '', 'GL 错误：没有'))
        for (const entry of ownErrors) {
          const position = entry.index - outcome.markIndex + 1
          list.append(element('li', 'err', 'GL 错误：第 ' + position + ' 个调用 ' + outcome.formatCall(entry)))
        }
        for (const line of outcome.logs) list.append(element('li', '', 'log：' + line))
        if (outcome.threw) list.append(element('li', 'err', '异常：' + outcome.describeThrow()))

        const [x, y] = item.pixel || [Math.floor(width / 2), Math.floor(height / 2)]
        const pixel = showCanvas ? outcome.readPixel(x, y) : null
        if (!showCanvas) {
          // 不画图的卡片：像素没有意义，不显示
        } else if (pixel) {
          const row = element('li', '', '画布中心像素：[' + pixel.join(', ') + ']')
          const swatch = element('span', 'swatch')
          swatch.style.background =
            'rgba(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ', ' + pixel[3] / 255 + ')'
          row.append(swatch)
          list.append(row)
        } else {
          list.append(element('li', '', '画布：context 已丢失，读不到像素'))
        }
        evidence.append(list)
        result.append(evidence)

        const explain = element('div', 'explain')
        explain.innerHTML = item.explain
        result.append(explain)

        const details = element('details')
        details.append(element('summary', '', '这一段的调用日志'))
        const logPre = element('pre')
        logPre.textContent =
          own
            .map((entry, index) => '#' + String(index + 1).padStart(2, ' ') + '  ' + outcome.formatCall(entry))
            .join('\n') || '（这一段没有 gl.* 调用）'
        details.append(logPre)
        result.append(details)

        result.hidden = false
        if (RTeach.linkSources) RTeach.linkSources(result)
      }
    })

    root.append(score)
    options.mount.replaceChildren(root)

    const previous = readPrevious()
    score.textContent =
      previous === null ? '' : '上次预测：' + previous.correct + '/' + previous.total + '（' + previous.when + '）'

    function updateScore() {
      score.textContent = '本次预测：' + correct + '/' + answered
      if (answered === options.items.length) {
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

    function readPrevious() {
      try {
        const raw = localStorage.getItem(key)
        return raw === null ? null : JSON.parse(raw)
      } catch {
        return null
      }
    }
  }
})()
