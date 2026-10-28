// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 第 14 课用：一个会记账的假 WebGL1 context。它跟踪 GL 里真实的绑定和开关，
// 记下每一条命令和每一次查询，好让卡片并排显示「State 记住的值」和「GL 里实际的值」。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /**
   * 只模拟本课用到的那部分 WebGL1：program、ARRAY_BUFFER、EBO（跟着 VAO 走）、OES VAO、
   * 几个开关、深度与剔除设置、framebuffer 与 viewport、清屏用到的写掩码，以及 getError。
   * 常量取 WebGL 规范里的真实数值，所以 State 换成 gl.LEQUAL 之类得到的是同一个数。
   *
   * 和真实 GL 的区别：不画像素，drawElements 只检查「有没有绑 EBO」；丢失由 setLost 手动切换。
   */
  const lab = (RTeach.stateLab = RTeach.stateLab || {})

  const C = {
    DEPTH_BUFFER_BIT: 0x100, STENCIL_BUFFER_BIT: 0x400, COLOR_BUFFER_BIT: 0x4000,
    TRIANGLES: 4, UNSIGNED_SHORT: 0x1403,
    ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893,
    ARRAY_BUFFER_BINDING: 0x8894, ELEMENT_ARRAY_BUFFER_BINDING: 0x8895,
    CULL_FACE: 0x0b44, DEPTH_TEST: 0x0b71, BLEND: 0x0be2, DITHER: 0x0bd0, STENCIL_TEST: 0x0b90,
    SCISSOR_TEST: 0x0c11, POLYGON_OFFSET_FILL: 0x8037, SAMPLE_ALPHA_TO_COVERAGE: 0x809e, SAMPLE_COVERAGE: 0x80a0,
    FRONT: 0x0404, BACK: 0x0405, CCW: 0x0901,
    NEVER: 0x0200, LESS: 0x0201, EQUAL: 0x0202, LEQUAL: 0x0203, ALWAYS: 0x0207,
    DEPTH_WRITEMASK: 0x0b72, DEPTH_FUNC: 0x0b74, CULL_FACE_MODE: 0x0b45, COLOR_WRITEMASK: 0x0c23,
    VIEWPORT: 0x0ba2, DEPTH_BITS: 0x0d56, STENCIL_BITS: 0x0d57,
    STENCIL_WRITEMASK: 0x0b98, STENCIL_BACK_WRITEMASK: 0x8ca5,
    CURRENT_PROGRAM: 0x8b8d, FRAMEBUFFER: 0x8d40, FRAMEBUFFER_BINDING: 0x8ca6,
    NO_ERROR: 0, INVALID_OPERATION: 0x0502
  }
  const CONST_NAME = new Map()
  for (const [name, value] of Object.entries(C)) if (!CONST_NAME.has(value)) CONST_NAME.set(value, name)
  // 同一个数既是 DEPTH_BUFFER_BIT 又是别的常量时，按参数位置解释；这里只处理本课会遇到的几个
  CONST_NAME.set(0x0201, 'LESS')
  CONST_NAME.set(0x0203, 'LEQUAL')
  CONST_NAME.set(0x0207, 'ALWAYS')

  /** 创建一个会记账的假 context。options.width / height 是 drawing buffer 尺寸。 */
  lab.createGL = function createGL(options) {
    const opts = options || {}
    const labels = new WeakMap()
    const calls = []
    let lost = false
    let error = C.NO_ERROR

    const defaultVao = { ebo: null }
    const real = {
      program: null,
      arrayBuffer: null,
      vao: null, // null = 默认 VAO
      caps: new Set([C.DITHER]), // GL 的初始状态：只有 DITHER 是开着的
      depthMask: true,
      depthFunc: C.LESS,
      cullFace: C.BACK,
      framebuffer: null,
      viewport: [0, 0, opts.width || 800, opts.height || 600],
      colorMask: [true, true, true, true],
      stencilMask: 0xffffffff,
      stencilBackMask: 0xffffffff
    }
    const vaoState = (vao) => (vao === null ? defaultVao : vao.state)

    function name(value) {
      if (value === null) return 'null'
      if (value === undefined) return 'undefined'
      if (typeof value === 'object' && labels.has(value)) return labels.get(value)
      if (typeof value === 'number' && CONST_NAME.has(value)) return CONST_NAME.get(value)
      if (Array.isArray(value) || ArrayBuffer.isView(value)) return '[' + Array.from(value).join(', ') + ']'
      return String(value)
    }
    function record(kind, method, args, result) {
      calls.push({ kind, method, args, result })
    }
    const cmd = (method, fn) =>
      function () {
        const args = Array.from(arguments)
        record('cmd', method, args)
        if (lost) return undefined // 丢失期间命令被浏览器默默丢掉
        return fn.apply(null, args)
      }

    const gl = {
      ...C,
      get drawingBufferWidth() { return opts.width || 800 },
      get drawingBufferHeight() { return opts.height || 600 },
      isContextLost() { return lost },
      getError() {
        const value = error
        error = C.NO_ERROR
        record('query', 'getError', [], value)
        return value
      },
      useProgram: cmd('useProgram', (p) => { real.program = p }),
      bindBuffer: cmd('bindBuffer', (target, buffer) => {
        if (target === C.ARRAY_BUFFER) real.arrayBuffer = buffer
        else vaoState(real.vao).ebo = buffer // EBO 绑定属于当前 VAO
      }),
      enable: cmd('enable', (cap) => { real.caps.add(cap) }),
      disable: cmd('disable', (cap) => { real.caps.delete(cap) }),
      depthMask: cmd('depthMask', (flag) => { real.depthMask = flag }),
      depthFunc: cmd('depthFunc', (func) => { real.depthFunc = func }),
      cullFace: cmd('cullFace', (mode) => { real.cullFace = mode }),
      frontFace: cmd('frontFace', () => {}),
      depthRange: cmd('depthRange', () => {}),
      lineWidth: cmd('lineWidth', () => {}),
      colorMask: cmd('colorMask', (r, g, b, a) => { real.colorMask = [r, g, b, a] }),
      clearColor: cmd('clearColor', () => {}),
      clearDepth: cmd('clearDepth', () => {}),
      clearStencil: cmd('clearStencil', () => {}),
      stencilMask: cmd('stencilMask', (m) => { real.stencilMask = m; real.stencilBackMask = m }),
      stencilMaskSeparate: cmd('stencilMaskSeparate', (face, m) => {
        if (face === C.FRONT) real.stencilMask = m
        else real.stencilBackMask = m
      }),
      clear: cmd('clear', () => {}),
      bindFramebuffer: cmd('bindFramebuffer', (target, fb) => { real.framebuffer = fb }),
      viewport: cmd('viewport', (x, y, w, h) => { real.viewport = [x, y, w, h] }),
      deleteProgram: cmd('deleteProgram', (p) => { if (p) p.deleted = true }),
      drawElements: cmd('drawElements', () => {
        if (vaoState(real.vao).ebo === null) error = C.INVALID_OPERATION // 没有绑 EBO：规范规定 INVALID_OPERATION
      }),
      drawArrays: cmd('drawArrays', () => {}),
      isEnabled(cap) {
        const value = lost ? false : real.caps.has(cap)
        record('query', 'isEnabled', [cap], value)
        return value
      },
      isFramebuffer(fb) {
        const value = !lost && fb !== null && typeof fb === 'object' && !fb.deleted
        record('query', 'isFramebuffer', [fb], value)
        return value
      },
      getParameter(pname) {
        let value = null
        if (!lost) {
          switch (pname) {
            case C.CURRENT_PROGRAM: value = real.program; break
            case C.ARRAY_BUFFER_BINDING: value = real.arrayBuffer; break
            case C.ELEMENT_ARRAY_BUFFER_BINDING: value = vaoState(real.vao).ebo; break
            case C.FRAMEBUFFER_BINDING: value = real.framebuffer; break
            case C.VIEWPORT: value = Int32Array.from(real.viewport); break
            case C.DEPTH_WRITEMASK: value = real.depthMask; break
            case C.DEPTH_FUNC: value = real.depthFunc; break
            case C.CULL_FACE_MODE: value = real.cullFace; break
            case C.COLOR_WRITEMASK: value = real.colorMask.slice(); break
            case C.DEPTH_BITS: value = real.framebuffer === null ? (opts.depthBits ?? 24) : (real.framebuffer.depthBits ?? 0); break
            case C.STENCIL_BITS: value = real.framebuffer === null ? (opts.stencilBits ?? 0) : (real.framebuffer.stencilBits ?? 0); break
            case C.STENCIL_WRITEMASK: value = real.stencilMask; break
            case C.STENCIL_BACK_WRITEMASK: value = real.stencilBackMask; break
            default: value = null
          }
        }
        record('query', 'getParameter', [pname], value)
        return value
      }
    }

    const ext = {
      createVertexArrayOES() {
        const vao = { state: { ebo: null } }
        labels.set(vao, 'VAO' + (calls.filter((c) => c.method === 'createVertexArrayOES').length + 1))
        record('cmd', 'createVertexArrayOES', [], vao)
        return vao
      },
      bindVertexArrayOES: cmd('bindVertexArrayOES', (vao) => { real.vao = vao })
    }

    return {
      gl,
      ext,
      calls,
      name,
      /** 给一个空对象起名字，当作 program、buffer、framebuffer 的假句柄。 */
      handle(label, extra) {
        const object = Object.assign({}, extra || {})
        labels.set(object, label)
        return object
      },
      label(object, text) { labels.set(object, text); return object },
      setLost(value) { lost = value },
      real,
      /** GL 里现在的真实值（不记账，供卡片显示用）。 */
      actual() {
        return {
          program: real.program,
          arrayBuffer: real.arrayBuffer,
          elementArrayBuffer: vaoState(real.vao).ebo,
          vao: real.vao,
          depthTest: real.caps.has(C.DEPTH_TEST),
          depthMask: real.depthMask,
          depthFunc: real.depthFunc,
          cullFace: real.caps.has(C.CULL_FACE) ? real.cullFace : '（CULL_FACE 关着）',
          framebuffer: real.framebuffer,
          viewport: real.viewport.slice()
        }
      },
      count(kind) { return calls.filter((c) => c.kind === kind).length }
    }
  }

  /** 哪些方法的哪几个参数是 GL 枚举；其余数字按原样显示（viewport(0, 0, …) 里的 0 不是 NO_ERROR）。 */
  const ENUM_ARGS = {
    bindBuffer: [0], enable: [0], disable: [0], isEnabled: [0], depthFunc: [0], cullFace: [0],
    bindFramebuffer: [0], getParameter: [0], drawElements: [0, 2], drawArrays: [0], stencilMaskSeparate: [0], frontFace: [0]
  }
  /** 查询结果里，只有这几种是枚举。 */
  const ENUM_RESULTS = new Set([C.DEPTH_FUNC, C.CULL_FACE_MODE])

  function bits(value) {
    const names = []
    if (value & C.COLOR_BUFFER_BIT) names.push('COLOR_BUFFER_BIT')
    if (value & C.DEPTH_BUFFER_BIT) names.push('DEPTH_BUFFER_BIT')
    if (value & C.STENCIL_BUFFER_BIT) names.push('STENCIL_BUFFER_BIT')
    return names.join(' | ')
  }

  /** 把一条记账写成人能读的一行，例如 gl.bindBuffer(ARRAY_BUFFER, B1)。 */
  function describeCall(fake, call) {
    const enums = ENUM_ARGS[call.method] || []
    const args = call.args
      .map((arg, index) => {
        if (call.method === 'clear') return bits(arg)
        if (typeof arg === 'number' && !enums.includes(index)) return String(arg)
        return fake.name(arg)
      })
      .join(', ')
    let text = 'gl.' + call.method + '(' + args + ')'
    if (call.kind === 'query') {
      const enumResult = call.method === 'getError' || (call.method === 'getParameter' && ENUM_RESULTS.has(call.args[0]))
      text += ' → ' + (typeof call.result === 'number' && !enumResult ? String(call.result) : fake.name(call.result))
    }
    return text
  }

  /**
   * State 对象里记住的值；undefined 写成「不知道」。
   * 只列出这个对象上有的字段（各版本、真实代码都用 define 语义编译，没有初值的字段也是自有属性）。
   */
  function describeCache(fake, state) {
    const fields = [
      ['programValue', 'program'],
      ['arrayBufferValue', 'ARRAY_BUFFER'],
      ['elementArrayBufferValue', 'EBO'],
      ['depthTestValue', '深度测试'],
      ['depthWriteValue', '深度写入'],
      ['depthFunctionValue', '深度比较'],
      ['cullModeValue', '剔除']
    ]
    const parts = []
    for (const [key, label] of fields) {
      if (!(key in state)) continue
      const value = state[key]
      parts.push(label + '=' + (value === undefined ? '不知道' : fake.name(value)))
    }
    return parts.join('，')
  }

  /**
   * 剧本记录器：每一步写一行「做了什么」，下面列出这一步发出的 GL 命令和查询。
   * 用法：const t = lab.trace(fake)；t.step('说明', () => { … })；t.note('…')；最后 t.report()
   */
  lab.trace = function trace(fake) {
    const lines = []
    let stepNo = 0
    return {
      step(text, fn, options) {
        stepNo += 1
        lines.push({ t: '第 ' + stepNo + ' 步', text, kind: 'user' })
        const start = fake.calls.length
        let thrown = null
        try {
          fn()
        } catch (error) {
          thrown = error
        }
        const made = fake.calls.slice(start)
        const commands = made.filter((c) => c.kind === 'cmd')
        const queries = made.filter((c) => c.kind === 'query')
        const quiet = options && options.quiet
        if (!quiet) {
          if (commands.length === 0 && queries.length === 0) lines.push({ text: '　（没有发任何 GL 命令）', kind: 'muted' })
          for (const call of made) lines.push({ text: '　' + describeCall(fake, call), kind: call.kind === 'cmd' ? 'server' : 'muted' })
        } else if (made.length > 0) {
          lines.push({ text: '　发出 ' + commands.length + ' 条命令，' + queries.length + ' 次查询', kind: 'muted' })
        }
        if (thrown) lines.push({ text: '　抛出 ' + (thrown.name || 'Error') + '：' + thrown.message, kind: 'late' })
        return { commands: commands.length, queries: queries.length, thrown }
      },
      note(text, kind) {
        lines.push({ text, kind: kind || 'muted' })
      },
      cache(state) {
        lines.push({ text: '　State 记住的：' + describeCache(fake, state), kind: 'muted' })
      },
      actual(keys) {
        const actual = fake.actual()
        lines.push({ text: '　GL 里实际的：' + keys.map((key) => key + '=' + fake.name(actual[key])).join('，'), kind: 'abort' })
      },
      result(text) {
        lines.push({ t: '结果', text, kind: 'result' })
      },
      report() {
        return { lines }
      }
    }
  }

  lab.describeCall = describeCall
})()
