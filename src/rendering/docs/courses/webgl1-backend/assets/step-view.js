// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 依赖 course.js（RTeach.linkSources）和 course.css 里的 .sv-* 样式。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 步骤代码框：一段调用链放在同一个代码框里，配一排步骤按钮。
   * 点一个步骤：高亮属于它的行、把代码滚到那里、旁边的解释栏换成这一步的说明、位置图点亮它在哪。
   * 代码可以有几个版本（例如「真实代码」和「小引擎」），切换版本时停在同一步。
   *
   * 第 47 课起用。写它是因为第 19 课把一条调用链拆成很多段代码，读到下面就忘了上面（2026-10-20 用户反馈）。
   *
   * 用法：
   *   RTeach.stepView({
   *     mount,
   *     route: [{ key, label }],                       // 位置图：一排格子，从左到右是调用的方向
   *     versions: [{ key, label, segments: [{ file, start, text }], dim: [[file, from, to]] }],
   *     steps: [{ mark, title, route: [key], lines: { 版本 key: [[file, from, to]] }, html }]
   *   })
   * segments 的 text 是源码原文，start 是它在文件里的第一行行号，所以框里显示的是真实行号。
   * dim 列出校验行：默认调暗，读主线时可以先跳过；高亮时照样点亮。
   * 返回 { select(mark), setVersion(key), hits() }，课程页和自动验证可以直接调用。
   */
  RTeach.stepView = function stepView(options) {
    const root = el('div', 'sv')

    // ---- 位置图 ----
    const route = el('div', 'sv-route')
    const chips = new Map()
    options.route.forEach((stop, index) => {
      if (index > 0) route.append(el('span', 'sv-arrow', '→'))
      const chip = el('span', 'sv-chip', stop.label)
      chips.set(stop.key, chip)
      route.append(chip)
    })

    // ---- 控制条：版本、步骤、上一步下一步、调暗校验行 ----
    const bar = el('div', 'sv-bar')
    const versionGroup = el('div', 'sv-versions')
    const versionButtons = new Map()
    for (const version of options.versions) {
      const button = el('button', 'sv-version', version.label)
      button.type = 'button'
      button.addEventListener('click', () => setVersion(version.key))
      versionButtons.set(version.key, button)
      versionGroup.append(button)
    }
    const stepGroup = el('div', 'sv-steps')
    const stepButtons = new Map()
    for (const step of options.steps) {
      const button = el('button', 'sv-step', step.mark)
      button.type = 'button'
      button.title = step.title
      button.addEventListener('click', () => select(step.mark))
      stepButtons.set(step.mark, button)
      stepGroup.append(button)
    }
    const prev = el('button', 'sv-nav', '上一步')
    const next = el('button', 'sv-nav', '下一步')
    prev.type = next.type = 'button'
    prev.addEventListener('click', () => move(-1))
    next.addEventListener('click', () => move(1))
    const dimLabel = el('label', 'sv-dim')
    const dimBox = document.createElement('input')
    dimBox.type = 'checkbox'
    dimBox.checked = true
    dimBox.addEventListener('change', () => root.classList.toggle('sv-dimmed', dimBox.checked))
    dimLabel.append(dimBox, document.createTextNode(' 调暗校验行'))
    bar.append(versionGroup, stepGroup, prev, next, dimLabel)

    // ---- 代码和解释栏 ----
    const body = el('div', 'sv-body')
    const code = el('pre', 'sv-code')
    const panel = el('div', 'sv-panel')
    const status = el('p', 'sv-status')
    body.append(code, panel)
    root.append(route, bar, status, body)
    root.classList.add('sv-dimmed')
    options.mount.append(root)

    let version = options.versions[0].key
    let current = null
    let rows = new Map() // 'file:行号' → 行元素

    function renderCode() {
      const spec = options.versions.find((v) => v.key === version)
      code.replaceChildren()
      rows = new Map()
      const dimmed = new Set()
      for (const [file, from, to] of spec.dim || []) {
        for (let n = from; n <= to; n++) dimmed.add(file + ':' + n)
      }
      for (const segment of spec.segments) {
        code.append(el('span', 'sv-file', '── ' + segment.file + ' ──'), '\n')
        segment.text.split('\n').forEach((text, offset) => {
          const n = segment.start + offset
          const key = segment.file + ':' + n
          const row = el('span', 'sv-line' + (dimmed.has(key) ? ' sv-check' : ''))
          row.append(el('span', 'sv-no', String(n).padStart(4, ' ')), el('span', 'sv-text', text), '\n')
          rows.set(key, row)
          code.append(row)
        })
      }
      for (const [key, button] of versionButtons) button.setAttribute('aria-pressed', String(key === version))
    }

    function select(mark) {
      const step = options.steps.find((s) => s.mark === mark)
      if (!step) return 0
      current = mark
      for (const row of rows.values()) row.classList.remove('sv-hit')
      let first = null
      let count = 0
      for (const [file, from, to] of (step.lines && step.lines[version]) || []) {
        for (let n = from; n <= to; n++) {
          const row = rows.get(file + ':' + n)
          if (!row) continue
          row.classList.add('sv-hit')
          count += 1
          if (first === null) first = row
        }
      }
      if (first !== null) code.scrollTop = Math.max(0, first.offsetTop - 24) // .sv-code 是定位元素，offsetTop 相对它
      for (const [key, button] of stepButtons) button.setAttribute('aria-pressed', String(key === mark))
      for (const [key, chip] of chips) chip.classList.toggle('sv-here', (step.route || []).includes(key))
      const label = options.versions.find((v) => v.key === version).label
      status.textContent =
        step.mark + ' ' + step.title + '：' + (count > 0 ? label + '里高亮了 ' + count + ' 行' : label + '里没有对应的行')
      panel.replaceChildren()
      const head = el('p', 'sv-panel-head', step.mark + ' ' + step.title)
      const content = el('div', 'sv-panel-body')
      content.innerHTML = step.html
      panel.append(head, content)
      panel.scrollTop = 0
      if (RTeach.linkSources) RTeach.linkSources(panel)
      return count
    }

    function move(delta) {
      const index = options.steps.findIndex((s) => s.mark === current)
      const nextIndex = Math.min(options.steps.length - 1, Math.max(0, index + delta))
      select(options.steps[nextIndex].mark)
    }

    function setVersion(key) {
      version = key
      renderCode()
      if (current !== null) select(current)
    }

    function hits() {
      return [...rows.values()].filter((row) => row.classList.contains('sv-hit')).length
    }

    renderCode()
    select(options.steps[0].mark)
    return { select, setVersion, hits }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }
})()
