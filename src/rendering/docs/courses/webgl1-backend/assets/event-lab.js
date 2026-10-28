// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 第 36–38 课用（浏览器事件零基础）：把一段课程代码真的挂到一块「舞台」上运行，
// 页面上显示的代码就是正在运行的代码（取自函数自己的源码），你在舞台上按键、拖动、滚轮，下面逐条记下发生了什么。
// 样式用 course.css 里的 .ev-* 类。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  const lab = (RTeach.eventLab = RTeach.eventLab || {})
  lab.instances = []

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  /** 函数自己的源码，去掉整体缩进：最后一行的「}」放到第 0 列。 */
  lab.sourceOf = function sourceOf(fn) {
    const lines = fn.toString().split('\n')
    const last = lines[lines.length - 1]
    const indent = last.length - last.trimStart().length
    return lines.map((line, i) => (i === 0 ? line : line.slice(Math.min(indent, line.length - line.trimStart().length)))).join('\n')
  }

  /**
   * options：
   *   mount        容器
   *   fn           课程代码：function 名字(stage, box, print) { ... }。stage 是舞台元素，box 是舞台里的方块，
   *                print(文字) 在下面的记录里加一行
   *   showCode     默认 true：在舞台上方显示 fn 的源码
   *   box          默认 false：舞台里放不放一个方块
   *   height       舞台高度（CSS 像素），默认 200
   *   touchAction  舞台的 CSS touch-action，默认 'none'
   *   sims         [{ label, steps }]：合成事件的按钮。steps 里每一项是
   *                { type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', x, y（相对舞台左上角）,
   *                  pointerId, pointerType, button, buttons } 或 { type: 'wheel', deltaY, deltaMode, ctrlKey }
   *   note         舞台上方的一句提示
   */
  lab.run = function run(options) {
    const mount = options.mount
    mount.replaceChildren()
    const root = element('div', 'ev-lab')
    if (options.showCode !== false) root.append(element('pre', 'ev-code', lab.sourceOf(options.fn)))
    if (options.note) root.append(element('p', 'ev-note', options.note))
    const holder = element('div', 'ev-holder')
    const bar = element('div', 'ev-bar')
    const log = element('ol', 'ev-log')
    root.append(holder, bar, log)
    mount.append(root)

    let generation = 0
    let started = 0
    let stage = null
    let box = null
    let lines = []

    function addLine(text, kind) {
      const t = Math.round(performance.now() - started)
      lines.push({ t, text })
      const li = element('li', 'ev-line' + (kind ? ' ' + kind : ''))
      li.append(element('span', 'ev-t', String(t).padStart(5, ' ') + ' ms'), element('span', 'ev-text', text))
      log.append(li)
      while (log.children.length > 400) log.firstChild.remove()
      log.scrollTop = log.scrollHeight
    }

    /** 建一块新舞台、运行课程代码。旧舞台连同它身上的监听一起丢掉；旧代码里的 print 从此不再写记录。 */
    function start() {
      generation += 1
      const mine = generation
      holder.replaceChildren()
      log.replaceChildren()
      lines = []
      started = performance.now()
      stage = element('div', 'ev-stage')
      stage.style.height = (options.height || 200) + 'px'
      stage.style.touchAction = options.touchAction ?? 'none'
      stage.append(element('span', 'ev-hint', options.hint || '在这块灰色区域里操作'))
      box = null
      if (options.box) {
        box = element('div', 'ev-box')
        stage.append(box)
      }
      holder.append(stage)
      const print = (text) => {
        if (mine === generation) addLine(String(text))
      }
      try {
        options.fn(stage, box, print)
      } catch (error) {
        addLine('课程代码抛错：' + (error && error.message ? error.message : String(error)), 'bad')
      }
    }

    function sim(steps, label) {
      addLine('（下面是合成的事件：' + label + '）', 'muted')
      const rect = stage.getBoundingClientRect()
      // 合成的指针没法被浏览器真的捕获，setPointerCapture 会抛错；这段时间临时换成只记账的版本
      let captured = new Set()
      stage.setPointerCapture = (id) => captured.add(id)
      stage.hasPointerCapture = (id) => captured.has(id)
      stage.releasePointerCapture = (id) => captured.delete(id)
      try {
        for (const step of steps) {
          if (step.type === 'wheel') {
            stage.dispatchEvent(
              new WheelEvent('wheel', {
                deltaY: step.deltaY ?? 100,
                deltaMode: step.deltaMode ?? 0,
                ctrlKey: !!step.ctrlKey,
                clientX: rect.left + (step.x ?? rect.width / 2),
                clientY: rect.top + (step.y ?? rect.height / 2),
                bubbles: true,
                cancelable: true
              })
            )
            continue
          }
          stage.dispatchEvent(
            new PointerEvent(step.type, {
              pointerId: step.pointerId ?? 1,
              pointerType: step.pointerType ?? 'mouse',
              isPrimary: step.isPrimary ?? true,
              button: step.button ?? (step.type === 'pointermove' ? -1 : 0),
              buttons: step.buttons ?? (step.type === 'pointerup' || step.type === 'pointercancel' ? 0 : 1),
              clientX: rect.left + step.x,
              clientY: rect.top + step.y,
              bubbles: true,
              cancelable: true
            })
          )
        }
      } finally {
        delete stage.setPointerCapture
        delete stage.hasPointerCapture
        delete stage.releasePointerCapture
      }
    }

    const clear = element('button', '', '清空记录')
    clear.type = 'button'
    clear.addEventListener('click', () => {
      log.replaceChildren()
      lines = []
    })
    const restart = element('button', '', '重新开始')
    restart.type = 'button'
    restart.title = '换一块新舞台，重新运行上面的代码（所有变量回到初始值）'
    restart.addEventListener('click', start)
    bar.append(clear, restart)
    for (const s of options.sims || []) {
      const button = element('button', 'ev-sim', s.label)
      button.type = 'button'
      button.addEventListener('click', () => sim(s.steps, s.label))
      bar.append(button)
    }

    start()
    const api = {
      get stage() {
        return stage
      },
      get box() {
        return box
      },
      /** 每一行 { t（毫秒，从这块舞台建好算起）, text }。 */
      lines: () => lines.slice(),
      restart: start,
      sim
    }
    lab.instances.push({ mount, api })
    return api
  }

  /** 一段固定的记录（比如在无界面 Chrome 里用真实触摸录下来的），用和实验台一样的样式显示。 */
  lab.recorded = function recorded(mount, title, text) {
    mount.replaceChildren()
    const root = element('div', 'ev-lab')
    root.append(element('p', 'ev-note', title))
    const log = element('ol', 'ev-log ev-static')
    for (const raw of text.trim().split('\n')) {
      const m = /^\s*(\d+) ms\s+(.*)$/.exec(raw)
      const li = element('li', 'ev-line' + (/^（/.test(m ? m[2] : raw) ? ' muted' : ''))
      li.append(element('span', 'ev-t', m ? m[1].padStart(5, ' ') + ' ms' : ''), element('span', 'ev-text', m ? m[2] : raw))
      log.append(li)
    }
    root.append(log)
    mount.append(root)
  }
})()
