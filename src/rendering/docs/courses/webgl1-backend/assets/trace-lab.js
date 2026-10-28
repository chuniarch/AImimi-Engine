// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 依赖 course.js（RTeach.answerLayout、RTeach.linkSources），必须在它之后加载。样式用 course.css 里的 .lab-* 类。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 通用的「先猜再跑」实验卡片：每张卡片提供一个 run()，返回逐条记录；学习者先选预测，再看记录和解析。
   *
   * 和 fetch-lab.js 的区别：这里不关心实验内容，只负责界面。实验本身由各课提供，
   * 比如第 13 课的生命周期执行器（lifecycle-lab.js）和在真实浏览器里探测 WebGL 的函数。
   *
   * report 的格式：{ lines: [{ t?: number | string, text: string, kind?: string }], summary?: string }
   * kind 取 course.css 里已有的样式：'server' | 'user' | 'abort' | 'result' | 'muted' | 'late'，也可以留空。
   */
  const lab = (RTeach.traceLab = RTeach.traceLab || {})

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  /** 把一份 report 画进 box。t 是数字时显示成「N ms」，是字符串时原样显示（比如「第 3 步」）。 */
  lab.render = function render(box, report) {
    box.replaceChildren()
    const list = element('ol', 'lab-trace')
    for (const line of report.lines) {
      const item = element('li', 'lab-line ' + (line.kind || ''))
      const t = line.t === undefined ? '' : typeof line.t === 'number' ? String(line.t).padStart(4, ' ') + ' ms' : String(line.t)
      item.append(element('span', 'lab-t', t))
      item.append(element('span', 'lab-text', line.text))
      list.append(item)
    }
    box.append(list)
    if (report.summary) box.append(element('p', 'lab-summary', report.summary))
  }

  /** 运行失败（实验代码自己抛错）时也要显示出来，不能让卡片卡在「运行中」。 */
  async function safeRun(run) {
    try {
      return await run()
    } catch (error) {
      return { lines: [{ text: '实验本身出错了：' + (error && error.message ? error.message : String(error)), kind: 'late' }] }
    }
  }

  /**
   * @param options.mount       容器
   * @param options.storageKey  localStorage 键
   * @param options.cards       [{ title, tags?: string[], desc?, code?, note?, question, choices, answer, explain（HTML）, run }]
   */
  lab.cards = function cards(options) {
    const key = 'webgl1-teach:trace-lab:' + (options.storageKey || 'lab')
    const root = element('div', 'lab')
    const layouts = RTeach.answerLayout
      ? RTeach.answerLayout(
          options.cards.map((card) => ({ key: card.title, count: card.choices.length, answer: card.answer })),
          'trace-lab:' + (options.storageKey || 'lab')
        )
      : options.cards.map((card) => card.choices.map((_, i) => i))
    let correct = 0
    let answered = 0
    const score = element('div', 'lab-score')

    options.cards.forEach((card, index) => {
      const box = element('div', 'lab-card')
      box.append(element('p', 'lab-head', card.title))
      if (card.tags && card.tags.length) {
        const meta = element('p', 'lab-meta')
        for (const tag of card.tags) meta.append(element('span', 'lab-tag', tag))
        box.append(meta)
      }
      if (card.desc) box.append(element('p', 'lab-desc', card.desc))
      // 第 48 课起：卡片可以带一段要运行的代码（通常取自函数自己的源码），显示在描述下面
      if (card.code) box.append(element('pre', 'lab-code', card.code))
      // 卡片里用到的课程自写函数（项目源码里没有的）在这里标明，和 predict.js 的 note 一样
      if (card.note) box.append(element('p', 'lab-note', card.note))
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
          out.hidden = false
          out.replaceChildren(element('p', 'lab-running', '运行中……'))
          const report = await safeRun(card.run)
          lab.render(out, report)
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
          localStorage.setItem(key, JSON.stringify({ correct, total: answered, when: new Date().toLocaleDateString('zh-CN') }))
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

  /**
   * 自由组合：几个下拉框加一个「运行」按钮。
   * @param options.selects [{ id, options: [[value, label]] }]
   * @param options.describe (values) => string，显示在下拉框下面的说明，可省略
   * @param options.run (values) => Promise<report>
   */
  lab.playground = function playground(options) {
    const root = element('div', 'lab-card lab-play')
    root.append(element('p', 'lab-head', options.title || '自由组合'))
    const bar = element('p', 'lab-bar')
    const selects = {}
    for (const spec of options.selects) {
      const select = element('select')
      for (const [value, label] of spec.options) {
        const option = element('option', '', label)
        option.value = value
        select.append(option)
      }
      selects[spec.id] = select
      bar.append(select)
    }
    const go = element('button', 'lab-go', '运行')
    go.type = 'button'
    bar.append(go)
    root.append(bar)
    const desc = element('p', 'lab-desc')
    const values = () => Object.fromEntries(Object.entries(selects).map(([id, select]) => [id, select.value]))
    const showDesc = () => (desc.textContent = options.describe ? options.describe(values()) : '')
    for (const select of Object.values(selects)) select.addEventListener('change', showDesc)
    showDesc()
    root.append(desc)
    const out = element('div', 'lab-out')
    root.append(out)
    go.addEventListener('click', async () => {
      go.disabled = true
      out.replaceChildren(element('p', 'lab-running', '运行中……'))
      lab.render(out, await safeRun(() => options.run(values())))
      go.disabled = false
    })
    options.mount.replaceChildren(root)
  }
})()
