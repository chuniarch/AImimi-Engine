// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 依赖 course.css 里的 .cv-* 样式。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 把一段代码按行显示，配一排按钮：点一个按钮，高亮属于这一类的行，再点一次取消。
   *
   * 用法：
   *   RTeach.codeView({
   *     mount,                          // 放组件的元素
   *     code,                           // 字符串；通常是 someFunction.toString()，这样显示的就是正在运行的代码
   *     caption,                        // 可选：代码上方的一行说明
   *     groups: [{ label, test }]       // test(line, index, lines) 返回 true 表示这一行属于这一类
   *   })
   * 返回 { highlight(label), clear() }，课程页和自动验证可以直接调用。
   *
   * 一行可以同时属于几类；同一时刻只高亮一类，免得颜色叠在一起看不清。
   */
  RTeach.codeView = function codeView(options) {
    const lines = String(options.code).replace(/\r\n/g, '\n').split('\n')
    const root = document.createElement('div')
    root.className = 'cv'

    if (options.caption) {
      const caption = document.createElement('p')
      caption.className = 'cv-caption'
      caption.textContent = options.caption
      root.append(caption)
    }

    const bar = document.createElement('div')
    bar.className = 'cv-bar'
    const status = document.createElement('p')
    status.className = 'cv-status'

    const pre = document.createElement('pre')
    pre.className = 'cv-code'
    const rows = lines.map((text, index) => {
      const row = document.createElement('span')
      row.className = 'cv-line'
      const number = document.createElement('span')
      number.className = 'cv-no'
      number.textContent = String(index + 1).padStart(3, ' ')
      const body = document.createElement('span')
      body.className = 'cv-text'
      body.textContent = text
      row.append(number, body, '\n')
      pre.append(row)
      return row
    })

    let active = null
    const buttons = new Map()

    function clear() {
      active = null
      for (const row of rows) row.classList.remove('cv-hit')
      for (const button of buttons.values()) button.setAttribute('aria-pressed', 'false')
      status.textContent = '点上面的按钮，高亮对应的行。'
    }

    function highlight(label) {
      const group = options.groups.find((g) => g.label === label)
      if (!group) return 0
      if (active === label) {
        clear()
        return 0
      }
      clear()
      active = label
      buttons.get(label).setAttribute('aria-pressed', 'true')
      let count = 0
      lines.forEach((text, index) => {
        if (group.test(text, index, lines)) {
          rows[index].classList.add('cv-hit')
          count += 1
        }
      })
      status.textContent = '「' + label + '」：' + count + ' 行' + (group.note ? '。' + group.note : '')
      return count
    }

    for (const group of options.groups) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'cv-button'
      button.textContent = group.label
      button.setAttribute('aria-pressed', 'false')
      button.addEventListener('click', () => highlight(group.label))
      buttons.set(group.label, button)
      bar.append(button)
    }

    root.append(bar, status, pre)
    options.mount.append(root)
    clear()
    return { highlight, clear, lines }
  }

  /**
   * 按「① …」「② …」这种注释把代码分段：返回一个 test 函数，
   * 判断某一行是否落在指定的段里（从这一段的标记行开始，到下一个标记行之前）。
   */
  RTeach.codeView.section = function section(mark) {
    const marks = '①②③④⑤⑥⑦⑧⑨⑩'
    return (line, index, lines) => {
      for (let i = index; i >= 0; i--) {
        const found = [...lines[i]].find((ch) => marks.includes(ch) && /\/\/\s*[①-⑩]/.test(lines[i]))
        if (found) return found === mark
      }
      return false
    }
  }
})()
