// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 组件挂在 window.RTeach 下；每一课的「手敲原生 GL」练习都用它。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /*
   * 这个沙盒做四件事：
   *
   * 1. 每次运行新建一个干净的 WebGL1 context（旧的用 WEBGL_lose_context 主动释放），
   *    所以上一次运行留下的绑定、program、buffer 不会污染这一次。
   * 2. 用 Proxy 把 context 包一层「记录代理 (instrumentation proxy)」：记下每个 gl.* 调用的
   *    参数和返回值，并在每个调用之后立刻 getError()，于是能精确指出「哪一行调用」产生了哪个错误。
   *    代理先把错误取走、暂存在自己的队列里；用户代码自己调用 gl.getError() 时再从队列交还，
   *    所以用户看到的 getError 语义不变。
   * 3. 运行结束后执行本课的检查 (checks)：读像素、查调用日志。
   * 4. 故障注入 (fault injection)：把用户代码在新的隐藏 context 上再跑几遍，每遍把某个 GL 调用
   *    改成返回失败值（例如 createBuffer 返回 null），看代码是否在正确的地方停下。
   *    项目的单元测试用假 context 做的是同一件事（tests/unit/rendering/backend/fakes/）。
   */

  // ---------------------------------------------------------------- 枚举名反查

  const MODE_NAMES = [
    'POINTS',
    'LINES',
    'LINE_LOOP',
    'LINE_STRIP',
    'TRIANGLES',
    'TRIANGLE_STRIP',
    'TRIANGLE_FAN'
  ]

  const CLEAR_BITS = [
    [0x4000, 'COLOR_BUFFER_BIT'],
    [0x0100, 'DEPTH_BUFFER_BIT'],
    [0x0400, 'STENCIL_BUFFER_BIT']
  ]

  const ERROR_NAMES = {
    0x0000: 'NO_ERROR',
    0x0500: 'INVALID_ENUM',
    0x0501: 'INVALID_VALUE',
    0x0502: 'INVALID_OPERATION',
    0x0505: 'OUT_OF_MEMORY',
    0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
    0x9242: 'CONTEXT_LOST_WEBGL'
  }

  /** 哪些参数位置是 GLenum。只列课程会用到的函数；其余参数按普通数字显示。 */
  const ENUM_ARGS = {
    bindBuffer: [0],
    bindFramebuffer: [0],
    bindRenderbuffer: [0],
    bindTexture: [0],
    blendFunc: [0, 1],
    bufferData: [0, 2],
    bufferSubData: [0],
    checkFramebufferStatus: [0],
    createShader: [0],
    cullFace: [0],
    depthFunc: [0],
    disable: [0],
    enable: [0],
    isEnabled: [0],
    frontFace: [0],
    framebufferRenderbuffer: [0, 1, 2],
    framebufferTexture2D: [0, 1, 2],
    generateMipmap: [0],
    getBufferParameter: [0, 1],
    getParameter: [0],
    getProgramParameter: [1],
    getShaderParameter: [1],
    getTexParameter: [0, 1],
    getVertexAttrib: [1],
    hint: [0, 1],
    pixelStorei: [0],
    readPixels: [4, 5],
    renderbufferStorage: [0, 1],
    texParameteri: [0, 1, 2],
    texParameterf: [0, 1],
    vertexAttribPointer: [2],
    drawElements: [2]
  }

  let enumTable = null

  /** 从 WebGLRenderingContext.prototype 上的常量建一张「数值 → 名字」表。 */
  function enumNames() {
    if (enumTable !== null) return enumTable
    enumTable = new Map()
    if (typeof WebGLRenderingContext === 'undefined') return enumTable
    const proto = WebGLRenderingContext.prototype
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue
      let value
      try {
        value = proto[key]
      } catch {
        continue
      }
      if (typeof value !== 'number') continue
      const list = enumTable.get(value) || []
      list.push(key)
      enumTable.set(value, list)
    }
    return enumTable
  }

  function enumText(value) {
    if (typeof value !== 'number') return String(value)
    if (value === 0 || value === 1) return String(value)
    const names = enumNames().get(value)
    if (!names || names.length === 0) return '0x' + value.toString(16)
    return names.length === 1 ? names[0] : names.slice(0, 2).join('|')
  }

  function errorText(code) {
    return ERROR_NAMES[code] || '0x' + Number(code).toString(16)
  }

  function clearText(mask) {
    if (typeof mask !== 'number') return String(mask)
    const parts = CLEAR_BITS.filter(([bit]) => (mask & bit) !== 0).map(([, name]) => name)
    const known = CLEAR_BITS.reduce((acc, [bit]) => acc | bit, 0)
    if ((mask & ~known) !== 0) parts.push('0x' + (mask & ~known).toString(16))
    return parts.length === 0 ? '0' : parts.join(' | ')
  }

  // ---------------------------------------------------------------- 记录代理

  /**
   * 给真实 context 套一层记录代理。
   *
   * @param real 浏览器给的 WebGLRenderingContext。判分用的像素读取直接走它，不进日志。
   * @param overrides 故障注入表：{ 方法名: (args, callReal, real) => 返回值 }。
   *   扩展方法写成 'OES_vertex_array_object.createVertexArrayOES' 这样的全名。
   */
  function instrument(real, overrides) {
    const ids = new WeakMap()
    const counters = Object.create(null)
    const calls = []
    const errors = []
    const pendingErrors = []
    const methodCache = new Map()
    const extensionCache = new WeakMap()

    function labelObject(value, tag) {
      if (!ids.has(value)) {
        counters[tag] = (counters[tag] || 0) + 1
        ids.set(value, counters[tag])
      }
      return tag + '#' + ids.get(value)
    }

    function describe(value) {
      if (value === null) return 'null'
      if (value === undefined) return 'undefined'
      switch (typeof value) {
        case 'number':
          return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
        case 'boolean':
          return String(value)
        case 'string': {
          const trimmed = value.replace(/^\s+/, '')
          const firstLine = trimmed.split('\n')[0]
          const short = firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine
          return JSON.stringify(short) + (trimmed.includes('\n') && short === firstLine ? '…' : '')
        }
        case 'function':
          return 'ƒ'
        default:
          break
      }
      if (ArrayBuffer.isView(value)) return value.constructor.name + '(' + value.length + ')'
      if (Array.isArray(value)) return '[' + value.map(describe).join(', ') + ']'
      const tag = Object.prototype.toString.call(value).slice(8, -1)
      if (tag === 'WebGLActiveInfo') {
        return `{name: ${JSON.stringify(value.name)}, size: ${value.size}, type: ${enumText(value.type)}}`
      }
      if (tag.startsWith('WebGL')) return labelObject(value, tag)
      return tag
    }

    function baseName(name) {
      const dot = name.lastIndexOf('.')
      return dot === -1 ? name : name.slice(dot + 1)
    }

    function formatArgs(name, args) {
      const base = baseName(name)
      let enumPositions = ENUM_ARGS[base] || []
      if (base === 'texImage2D') enumPositions = args.length >= 9 ? [0, 2, 6, 7] : [0, 2, 3, 4]
      if (base === 'texSubImage2D') enumPositions = args.length >= 9 ? [0, 6, 7] : [0, 4, 5]
      return args.map((arg, index) => {
        if ((base === 'drawArrays' || base === 'drawElements') && index === 0) {
          return MODE_NAMES[arg] || String(arg)
        }
        if (base === 'clear' && index === 0) return clearText(arg)
        if (base === 'activeTexture' && index === 0 && typeof arg === 'number') {
          return 'TEXTURE0 + ' + (arg - 0x84c0)
        }
        if (base === 'pixelStorei' && index === 1 && typeof arg === 'number' && arg >= 0x100) {
          return enumText(arg)
        }
        if (base === 'drawBuffersWEBGL' && index === 0 && Array.isArray(arg)) {
          return '[' + arg.map(enumText).join(', ') + ']'
        }
        if (enumPositions.includes(index) && typeof arg === 'number') return enumText(arg)
        return describe(arg)
      })
    }

    function formatReturn(name, value) {
      const base = baseName(name)
      if (base === 'getError') return errorText(value)
      if (base === 'checkFramebufferStatus') return enumText(value)
      return describe(value)
    }

    /** 一条调用日志：「名字(参数) → 返回值   ⚠ 错误」。 */
    function formatCall(entry) {
      let text = entry.name + '(' + formatArgs(entry.name, entry.args).join(', ') + ')'
      if (entry.threw) text += '  ✗ 抛出 ' + String(entry.threw && entry.threw.name)
      else if (entry.ret !== undefined) text += ' → ' + formatReturn(entry.name, entry.ret)
      if (entry.error) text += '   ⚠ ' + errorText(entry.error)
      return text
    }

    function wrap(target, prefix, name, fn) {
      const qualified = prefix + name
      return function instrumented(...args) {
        const entry = {
          index: calls.length,
          name: qualified,
          args,
          ret: undefined,
          error: 0,
          threw: null
        }
        calls.push(entry)
        const callReal = (...realArgs) => fn.apply(target, realArgs)
        const override = overrides ? overrides[qualified] : undefined
        let ret
        try {
          ret = override ? override(args, callReal, real) : fn.apply(target, args)
        } catch (error) {
          // 例如 bindBuffer 收到的不是 WebGLBuffer：浏览器在参数类型转换阶段直接抛 TypeError，
          // 不会记 GL 错误。（反过来，给 bufferData 传普通数组并不会抛错：它匹配到
          // bufferData(target, size, usage) 这个重载，数组被转成数字 0，分配了 0 字节——Chromium 实测。）
          entry.threw = error
          throw error
        }
        entry.ret = ret
        const code = real.getError()
        if (code !== real.NO_ERROR) {
          entry.error = code
          errors.push(entry)
          pendingErrors.push(code)
        }
        if (qualified === 'getExtension' && ret !== null && typeof ret === 'object') {
          return wrapExtension(ret, String(args[0]))
        }
        return ret
      }
    }

    function wrapExtension(extension, name) {
      const cached = extensionCache.get(extension)
      if (cached) return cached
      const cache = new Map()
      const wrapped = new Proxy(extension, {
        get(target, prop) {
          const value = target[prop]
          if (typeof value !== 'function') return value
          let fn = cache.get(prop)
          if (!fn) {
            fn = wrap(target, name + '.', String(prop), value)
            cache.set(prop, fn)
          }
          return fn
        }
      })
      extensionCache.set(extension, wrapped)
      return wrapped
    }

    const gl = new Proxy(real, {
      get(target, prop) {
        // 用 target 作 receiver：drawingBufferWidth 这类原生 getter 不能在 Proxy 上调用。
        const value = target[prop]
        if (typeof value !== 'function') return value
        if (prop === 'getError') {
          return function getError() {
            const entry = { index: calls.length, name: 'getError', args: [], ret: 0, error: 0, threw: null }
            calls.push(entry)
            const code = pendingErrors.length > 0 ? pendingErrors.shift() : target.getError()
            entry.ret = code
            return code
          }
        }
        let wrapped = methodCache.get(prop)
        if (!wrapped) {
          wrapped = wrap(target, '', String(prop), value)
          methodCache.set(prop, wrapped)
        }
        return wrapped
      }
    })

    return { gl, calls, errors, describe, formatCall }
  }

  // ---------------------------------------------------------------- 运行一次

  /** new Function 生成的源码前面多了两行（function anonymous(...) 与 {），这里减掉。 */
  function userLineOf(error) {
    const stack = error && typeof error.stack === 'string' ? error.stack : ''
    const match = stack.match(/<anonymous>:(\d+):(\d+)/)
    if (!match) return null
    const line = Number(match[1]) - 2
    return line >= 1 ? line : null
  }

  function releaseContext(canvas) {
    if (!canvas) return
    try {
      const context = canvas.getContext('webgl')
      const extension = context && context.getExtension('WEBGL_lose_context')
      if (extension) extension.loseContext()
    } catch {
      /* 释放失败不影响下一次运行 */
    }
  }

  // ------------------------------------------------ 判分用的额外 context

  /** 判分函数里临时创建的 context；一轮判分结束后由沙盒统一释放。 */
  const trackedContexts = []

  /** 新建一个隐藏的 WebGL1 context，给判分函数当「真实设备」用。 */
  function freshContext(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width || 8
    canvas.height = height || 8
    const context = canvas.getContext('webgl', { antialias: false })
    if (!context) throw new Error('浏览器没有给出 WebGL1 context')
    trackedContexts.push(context)
    return context
  }

  /** 用 WEBGL_lose_context 让 context 立刻进入丢失状态（模拟 GPU 重置）。 */
  function lose(context) {
    const extension = context.getExtension('WEBGL_lose_context')
    if (extension) extension.loseContext()
  }

  function releaseTrackedContexts() {
    while (trackedContexts.length > 0) {
      const context = trackedContexts.pop()
      try {
        if (!context.isContextLost()) lose(context)
      } catch {
        /* 已经失效的 context 不需要再释放 */
      }
    }
  }

  /** 调用一个可能抛错的函数，把结果和异常都收下来，方便判分函数检查。 */
  function attempt(fn) {
    try {
      return { value: fn(), error: null }
    } catch (error) {
      return { value: undefined, error }
    }
  }

  /**
   * 在新的记录代理上运行一段用户代码。
   *
   * options.prelude 是可选的前置代码：它先跑，跑完调用 __mark() 记下调用日志的位置，
   * 这样展示时可以只显示用户那一段自己的调用（markIndex 之后的部分）。
   * 用户代码最后 return 的值放在 result.returned 里（第 2 课起用来拿到用户写的函数）。
   */
  function runCode(code, options) {
    const canvas = options.canvas
    canvas.width = options.width
    canvas.height = options.height
    const real = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true })
    if (!real) return { noContext: true, canvas }

    const inst = instrument(real, options.overrides || null)
    const logs = []
    const log = (...values) => {
      logs.push(values.map((value) => (typeof value === 'string' ? value : inst.describe(value))).join(' '))
    }
    let markIndex = 0
    const mark = () => {
      markIndex = inst.calls.length
    }

    // userLineOf 算的是整个函数体里的行号；有 prelude 时，用户代码前面还有
    // prelude 的全部行和 `;__mark();` 这一行，要减掉。落在 prelude 里的异常不显示行号。
    const preludeLines = options.prelude ? options.prelude.split('\n').length + 1 : 0
    const userLine = (error) => {
      const line = userLineOf(error)
      return line === null || line - preludeLines < 1 ? null : line - preludeLines
    }

    let threw = null
    let fn = null
    let returned
    try {
      // 'use strict' 与第一行代码写在同一行，行号不受影响（没有 prelude 时）。
      const body = options.prelude
        ? "'use strict';" + options.prelude + '\n;__mark();\n' + code
        : "'use strict';" + code
      fn = new Function('gl', 'canvas', 'log', '__mark', body)
    } catch (error) {
      threw = error
    }
    if (fn) {
      try {
        returned = fn(inst.gl, canvas, log, mark)
      } catch (error) {
        threw = error
      }
    }

    const result = {
      noContext: false,
      real,
      gl: inst.gl,
      canvas,
      calls: inst.calls,
      errors: inst.errors,
      logs,
      threw,
      returned,
      markIndex,
      describe: inst.describe,
      formatCall: inst.formatCall,
      enumText,
      errorText,
      count(name, predicate) {
        return inst.calls.filter((call) => call.name === name && (!predicate || predicate(call))).length
      },
      called(name, predicate) {
        return result.count(name, predicate) > 0
      },
      find(name, predicate) {
        return inst.calls.find((call) => call.name === name && (!predicate || predicate(call)))
      },
      lastCall() {
        return inst.calls.length === 0 ? null : inst.calls[inst.calls.length - 1]
      },
      /** 读默认 framebuffer 的一个像素；y 从画布底部算起（readPixels 的原点在左下角）。 */
      readPixel(x, y) {
        if (real.isContextLost()) return null
        const out = new Uint8Array(4)
        real.bindFramebuffer(real.FRAMEBUFFER, null)
        real.readPixels(x, y, 1, 1, real.RGBA, real.UNSIGNED_BYTE, out)
        return Array.from(out)
      },
      near(actual, expected, tolerance) {
        return (
          Array.isArray(actual) &&
          actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance)
        )
      },
      throwLine() {
        return threw && threw.name !== 'SyntaxError' ? userLine(threw) : null
      },
      describeThrow() {
        if (!threw) return ''
        // V8 给 new Function 里的语法错误报的行号不可靠，只显示信息。
        const line = threw && threw.name === 'SyntaxError' ? null : userLine(threw)
        const name = threw && threw.name ? threw.name : 'Error'
        const message = threw && threw.message ? threw.message : String(threw)
        return (line ? '第 ' + line + ' 行：' : '') + name + ': ' + message
      }
    }
    return result
  }

  function evaluate(test, result) {
    try {
      const verdict = test(result)
      if (verdict === true) return { pass: true, detail: '' }
      return { pass: false, detail: typeof verdict === 'string' ? verdict : '' }
    } catch (error) {
      // 多半是用户代码本身抛错，或者 return 的内容不对，判分函数拿不到要测的东西。
      return { pass: false, detail: '无法判分：' + escapeHtml(error && error.message ? error.message : String(error)) }
    }
  }

  // ---------------------------------------------------------------- 界面

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function listItem(state, label, detail, detailClass) {
    const item = element('li', state)
    item.append(document.createTextNode(label))
    if (detail) {
      const extra = element('span', 'detail' + (detailClass ? ' ' + detailClass : ''))
      extra.innerHTML = detail
      item.append(extra)
    }
    return item
  }

  /**
   * 创建一个沙盒。
   *
   * @param options.mount 放沙盒的容器元素
   * @param options.storageKey 本课的存档键；代码存进 localStorage，刷新页面不会丢
   * @param options.template 初始代码（「重置为模板」恢复到它）
   * @param options.checks [{ label, test(result) → true | 失败说明(可含 HTML), optional?: true }]
   *   optional 的检查是「选做」：没通过时显示 ○，不计入必做的通过数。
   * @param options.scenarios [{ label, overrides, expect(result) → true | 失败说明, note?(result) → 附注 | null }]
   * @param options.canvas 设为 false 时不显示画布（只测函数、不画图的课）
   */
  RTeach.sandbox = function sandbox(options) {
    const width = options.width || 320
    const height = options.height || 200
    const checks = options.checks || []
    const scenarios = options.scenarios || []
    const showCanvas = options.canvas !== false
    const storageKey = 'webgl1-teach:sandbox:' + options.storageKey

    const root = element('div', 'sandbox')

    const bar = element('div', 'bar')
    const runButton = element('button', 'primary', '▶ 运行')
    runButton.type = 'button'
    runButton.title = '⌘ / Ctrl + Enter'
    const resetButton = element('button', '', '重置为模板')
    resetButton.type = 'button'
    const summary = element('span', 'summary', '⌘/Ctrl + Enter 运行')
    bar.append(runButton, resetButton, summary)

    const editor = element('div', 'editor')
    const gutter = element('div', 'gutter')
    const textarea = element('textarea', 'code')
    textarea.spellcheck = false
    textarea.setAttribute('autocapitalize', 'off')
    textarea.setAttribute('autocomplete', 'off')
    textarea.setAttribute('aria-label', 'WebGL 练习代码')
    editor.append(gutter, textarea)

    const view = element('div', 'view')
    const screen = element('div', 'screen')
    const canvasHolder = element('div')
    const caption = element('div', 'caption', width + '×' + height + ' · WebGL1 · 每次运行都新建 context')
    screen.append(canvasHolder, caption)
    const results = element('div', 'results')
    if (showCanvas) view.append(screen, results)
    else view.append(results)

    const callsBox = element('details', 'calls')
    const callsSummary = element('summary', '', '调用日志：每个 gl.* 调用的参数、返回值和 GL 错误')
    const callsPre = element('pre')
    callsBox.append(callsSummary, callsPre)

    root.append(bar, editor, view, callsBox)
    options.mount.replaceChildren(root)

    let currentCanvas = null

    textarea.value = loadCode() ?? options.template
    syncGutter()
    renderPending()

    // ------------------------------------------------ 编辑体验：Tab 缩进、回车保持缩进、⌘/Ctrl+Enter 运行

    textarea.addEventListener('keydown', (event) => {
      if (event.isComposing || event.keyCode === 229) return // 中文输入法组字中，不拦截
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        run()
        return
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        indent(event.shiftKey)
        return
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        const before = textarea.value.slice(0, textarea.selectionStart)
        const lineStart = before.lastIndexOf('\n') + 1
        const leading = before.slice(lineStart).match(/^[ \t]*/)[0]
        const opens = /[{([]\s*$/.test(before) ? '  ' : ''
        insertText('\n' + leading + opens)
      }
    })
    textarea.addEventListener('input', () => {
      syncGutter()
      saveCode()
    })
    textarea.addEventListener('scroll', () => {
      gutter.scrollTop = textarea.scrollTop
    })

    runButton.addEventListener('click', run)
    resetButton.addEventListener('click', () => {
      if (textarea.value !== options.template && !window.confirm('用模板覆盖当前代码？')) return
      textarea.value = options.template
      syncGutter()
      saveCode()
      renderPending()
    })

    function insertText(text) {
      textarea.focus()
      let inserted = false
      try {
        inserted = document.execCommand('insertText', false, text) // 保留撤销历史
      } catch {
        inserted = false
      }
      if (!inserted) {
        const start = textarea.selectionStart
        textarea.setRangeText(text, start, textarea.selectionEnd, 'end')
        textarea.dispatchEvent(new Event('input'))
      }
    }

    function indent(outdent) {
      const value = textarea.value
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (!outdent && start === end) {
        insertText('  ')
        return
      }
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const blockEnd = end > start && value[end - 1] === '\n' ? end - 1 : end
      const lines = value.slice(lineStart, blockEnd).split('\n')
      const changed = lines
        .map((line) => (outdent ? line.replace(/^ {1,2}/, '') : '  ' + line))
        .join('\n')
      textarea.setSelectionRange(lineStart, blockEnd)
      insertText(changed)
      textarea.setSelectionRange(lineStart, lineStart + changed.length)
    }

    function syncGutter() {
      const lines = textarea.value.split('\n').length
      if (Number(gutter.dataset.lines) !== lines) {
        gutter.textContent = Array.from({ length: lines }, (_, index) => String(index + 1)).join('\n')
        gutter.dataset.lines = String(lines)
      }
      gutter.scrollTop = textarea.scrollTop
    }

    function loadCode() {
      try {
        return localStorage.getItem(storageKey)
      } catch {
        return null
      }
    }

    function saveCode() {
      try {
        localStorage.setItem(storageKey, textarea.value)
      } catch {
        /* 隐私模式等情况下忽略：代码仍在编辑框里 */
      }
    }

    // ------------------------------------------------ 运行与判分

    function run() {
      saveCode()
      const code = textarea.value

      releaseContext(currentCanvas)
      const canvas = element('canvas')
      canvasHolder.replaceChildren(canvas)
      currentCanvas = canvas

      const main = runCode(code, { canvas, width, height, overrides: null })
      if (main.noContext) {
        results.replaceChildren(element('p', '', '浏览器没有给出 WebGL1 context（getContext("webgl") 返回 null）。'))
        return
      }

      const checkResults = checks.map((check) => ({ check, verdict: evaluate(check.test, main) }))
      releaseTrackedContexts()

      const scenarioResults = scenarios.map((scenario) => {
        const hidden = element('canvas')
        const outcome = runCode(code, { canvas: hidden, width, height, overrides: scenario.overrides })
        const verdict = outcome.noContext
          ? { pass: false, detail: '没有拿到 context' }
          : evaluate(scenario.expect, outcome)
        let note = null
        if (scenario.note && !outcome.noContext) {
          try {
            note = scenario.note(outcome)
          } catch {
            note = null
          }
        }
        releaseContext(hidden)
        return { scenario, verdict, note }
      })

      render(main, checkResults, scenarioResults)
    }

    function renderPending() {
      const nodes = []
      if (checks.length > 0) {
        nodes.push(element('h4', '', '检查'))
        const list = element('ul')
        for (const check of checks) {
          list.append(listItem('pending', check.label + (check.optional ? '（选做）' : '')))
        }
        nodes.push(list)
      }
      if (scenarios.length > 0) {
        nodes.push(element('h4', '', '故障注入'))
        const list = element('ul')
        for (const scenario of scenarios) list.append(listItem('pending', scenario.label))
        nodes.push(list)
      }
      results.replaceChildren(...nodes)
      callsPre.textContent = '（还没有运行）'
      summary.textContent = '⌘/Ctrl + Enter 运行'
    }

    function render(main, checkResults, scenarioResults) {
      const nodes = []

      // 输出：log() 与异常
      if (main.logs.length > 0 || main.threw) {
        nodes.push(element('h4', '', '输出'))
        const out = element('div', 'console')
        for (const line of main.logs) out.append(document.createTextNode(line + '\n'))
        if (main.threw) out.append(element('span', 'err', main.describeThrow()))
        nodes.push(out)
      }

      // GL 错误：精确到产生它的那个调用
      if (main.errors.length > 0) {
        nodes.push(element('h4', '', 'GL 错误'))
        const list = element('ul')
        for (const entry of main.errors.slice(0, 6)) {
          list.append(listItem('fail', '#' + entry.index + ' ' + main.formatCall(entry)))
        }
        if (main.errors.length > 6) list.append(listItem('info', '…共 ' + main.errors.length + ' 个'))
        nodes.push(list)
      }

      if (checkResults.length > 0) {
        nodes.push(element('h4', '', '检查'))
        const list = element('ul')
        for (const { check, verdict } of checkResults) {
          const label = check.label + (check.optional ? '（选做）' : '')
          const state = verdict.pass ? 'pass' : check.optional ? 'optional' : 'fail'
          list.append(listItem(state, label, verdict.detail, check.optional ? '' : 'bad'))
        }
        nodes.push(list)
      }

      if (scenarioResults.length > 0) {
        nodes.push(element('h4', '', '故障注入'))
        const list = element('ul')
        for (const { scenario, verdict, note } of scenarioResults) {
          const item = listItem(verdict.pass ? 'pass' : 'fail', scenario.label, verdict.detail, 'bad')
          if (note) {
            const extra = element('span', 'detail')
            extra.innerHTML = 'ⓘ ' + note
            item.append(extra)
          }
          list.append(item)
        }
        nodes.push(list)
      }

      results.replaceChildren(...nodes)
      if (window.RTeach.linkSources) window.RTeach.linkSources(results)

      // 调用日志
      callsPre.replaceChildren()
      for (const entry of main.calls) {
        const line = '#' + String(entry.index).padStart(2, ' ') + '  ' + main.formatCall(entry) + '\n'
        if (entry.error || entry.threw) callsPre.append(element('span', 'err', line))
        else callsPre.append(document.createTextNode(line))
      }
      if (main.calls.length === 0) callsPre.textContent = '（没有任何 gl.* 调用）'

      const required = checkResults.filter((item) => !item.check.optional)
      const optional = checkResults.filter((item) => item.check.optional)
      const passedRequired = required.filter((item) => item.verdict.pass).length
      const passedOptional = optional.filter((item) => item.verdict.pass).length
      const passedScenarios = scenarioResults.filter((item) => item.verdict.pass).length
      summary.textContent =
        '检查 ' +
        passedRequired +
        '/' +
        required.length +
        (optional.length > 0 ? ' · 选做 ' + passedOptional + '/' + optional.length : '') +
        (scenarioResults.length > 0 ? ' · 故障注入 ' + passedScenarios + '/' + scenarioResults.length : '') +
        (showCanvas ? ' · ' + main.calls.length + ' 个调用' : '')
    }

    return {
      run,
      getCode: () => textarea.value,
      setCode(code) {
        textarea.value = code
        syncGutter()
        saveCode()
      }
    }
  }

  /** 检查函数返回的说明会以 HTML 插入；把异常信息等外来文本放进去之前先转义。 */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // 供其它课程页复用的工具
  RTeach.gl = {
    enumText,
    errorText,
    clearText,
    instrument,
    runCode,
    releaseContext,
    freshContext,
    lose,
    attempt,
    escape: escapeHtml
  }
})()
