// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 第 25 课用：检查相机朝向、假 canvas、合成拖动，以及两块并排的线框画布（左：项目代码；右：three.js r177）。
// 依赖 camera-bundle.js（window.RTeachCamera）。样式用 course.css 里的 .orbit-* 类。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  // 只为课程演示：SceneNode 用 crypto.randomUUID 生成 UUID，它要求安全上下文。
  // 个别浏览器在 file:// 下没有这个函数（第 5 课），这里用 getRandomValues 补一个同格式的实现。
  if (window.crypto && typeof window.crypto.randomUUID !== 'function') {
    Object.defineProperty(window.crypto, 'randomUUID', {
      configurable: true,
      value: function randomUUID() {
        const bytes = window.crypto.getRandomValues(new Uint8Array(16))
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
      }
    })
  }

  const lab = (RTeach.orbitLab = RTeach.orbitLab || {})
  const C = () => window.RTeachCamera
  const DEG = 180 / Math.PI

  // ---------- 数字格式 ----------

  /** 保留 n 位小数；-0 显示成 0，免得读者以为有区别。 */
  function num(x, n = 2) {
    if (!Number.isFinite(x)) return String(x)
    const s = x.toFixed(n)
    return /^-0\.?0*$/.test(s) ? s.slice(1) : s
  }
  lab.num = num
  lab.vec = (v, n = 2) => '[' + Array.from(v, (x) => num(x, n)).join(', ') + ']'
  lab.deg = (rad, n = 2) => num(rad * DEG, n) + '°'
  lab.degVec = (v, n = 2) => '[' + Array.from(v, (x) => num(x * DEG, n) + '°').join(', ') + ']'

  // ---------- 看相机：前方、上方、右方，以及目标点落在屏幕哪里 ----------

  /**
   * 读项目相机：world matrix 的第 0、1、2 列分别是相机的 +X（右）、+Y（上）、+Z（后）方向，
   * 所以前方是 −第 2 列。view = world 的逆，和 RenderListBuilder.ts:84 一样。
   */
  lab.inspect = function inspect(camera, target) {
    const { mat4, vec4 } = C()
    const world = mat4.create()
    camera.copyWorldMatrixTo(world)
    const view = mat4.invert(mat4.create(), world)
    const projection = mat4.create()
    camera.copyProjectionMatrixTo(projection)
    return describe(world, view, projection, target)
  }

  /** 读 three.js 相机：同样的三列、同样的 view 和 projection，只是存法不同（Matrix4.elements 也是列主序）。 */
  lab.inspectThree = function inspectThree(camera, target) {
    camera.updateMatrixWorld()
    return describe(
      Float32Array.from(camera.matrixWorld.elements),
      Float32Array.from(camera.matrixWorldInverse.elements),
      Float32Array.from(camera.projectionMatrix.elements),
      target
    )
  }

  function describe(world, view, projection, target) {
    const { vec4 } = C()
    const right = [world[0], world[1], world[2]]
    const up = [world[4], world[5], world[6]]
    const forward = [-world[8], -world[9], -world[10]]
    const position = [world[12], world[13], world[14]]
    const out = { world, view, projection, right, up, forward, position }
    if (target) {
      const v = vec4.fromValues(target[0], target[1], target[2], 1)
      vec4.transformMat4(v, v, view)
      out.targetView = [v[0], v[1], v[2]]
      vec4.transformMat4(v, v, projection)
      out.targetClipW = v[3]
      out.targetNdc = v[3] > 0 ? [v[0] / v[3], v[1] / v[3], v[2] / v[3]] : null
      const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]]
      const len = Math.hypot(d[0], d[1], d[2])
      const cos = (forward[0] * d[0] + forward[1] * d[1] + forward[2] * d[2]) / len
      out.offAxisDeg = Math.acos(Math.max(-1, Math.min(1, cos))) * DEG
    }
    return out
  }

  /** 由相机位置和目标算出距离、方位角、仰角，算法和 mountOrbitCameraInput.ts:119–130 相同。 */
  lab.spherical = function spherical(position, target) {
    const x = position[0] - target[0]
    const y = position[1] - target[1]
    const z = position[2] - target[2]
    const horizontal = Math.hypot(x, z)
    return { distance: Math.hypot(horizontal, y), azimuth: Math.atan2(x, z), elevation: Math.atan2(y, horizontal) }
  }

  /** 屏幕上的话：NDC 的 x、y 在 [−1, 1] 里才看得见；(0, 0) 是正中央。 */
  lab.where = function where(info) {
    if (!info.targetNdc) return '在相机背后或正侧面（clip w = ' + num(info.targetClipW, 3) + '），画面上看不到'
    const [x, y] = info.targetNdc
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1
    if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) return '正中央（NDC ' + num(x, 3) + ', ' + num(y, 3) + '）'
    return (inside ? '在画面里，' : '在画面外，') + 'NDC (' + num(x, 3) + ', ' + num(y, 3) + ')'
  }

  // ---------- 假 canvas：只替换浏览器事件表面，和单元测试的 InputCanvas 一样 ----------

  /**
   * 合成事件没有真实的指针，真 canvas 的 setPointerCapture 会抛 NotFoundError。
   * 这里用 EventTarget 做一个只记账的 canvas：捕获记在 captured 上，监听器的增减记在 listeners 上。
   */
  lab.fakeCanvas = function fakeCanvas(options = {}) {
    const canvas = new EventTarget()
    const root = new EventTarget()
    const win = new EventTarget()
    const log = []
    const listeners = new Map()
    const add = canvas.addEventListener.bind(canvas)
    const remove = canvas.removeEventListener.bind(canvas)
    canvas.addEventListener = (type, fn, opt) => {
      const key = type + '#' + (fn.name || 'fn')
      if (!listeners.has(key)) listeners.set(key, fn)
      add(type, fn, opt)
    }
    canvas.removeEventListener = (type, fn, opt) => {
      for (const [key, value] of listeners) if (value === fn && key.startsWith(type + '#')) listeners.delete(key)
      remove(type, fn, opt)
    }
    Object.assign(canvas, {
      clientHeight: options.height ?? 600,
      clientWidth: options.width ?? 900,
      style: { touchAction: options.touchAction ?? '' },
      ownerDocument: { defaultView: win },
      captured: null,
      log,
      listeners,
      getRootNode: () => root,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: canvas.clientWidth, height: canvas.clientHeight }),
      setPointerCapture(id) {
        canvas.captured = id
        log.push('setPointerCapture(' + id + ')')
      },
      hasPointerCapture: (id) => canvas.captured === id,
      releasePointerCapture(id) {
        if (canvas.captured === id) canvas.captured = null
        log.push('releasePointerCapture(' + id + ')')
      }
    })
    return canvas
  }

  /** 和测试里的 pointer() 一样：一个普通 Event 补上处理器会读的字段（Node 里没有 PointerEvent）。 */
  lab.pointer = function pointer(canvas, type, values = {}) {
    const event = new Event(type, { cancelable: true })
    Object.assign(event, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: 300,
      clientY: 300,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...values
    })
    canvas.dispatchEvent(event)
    return event
  }

  lab.wheel = function wheel(canvas, deltaY, deltaMode = 0) {
    const event = new Event('wheel', { cancelable: true })
    Object.assign(event, { deltaY, deltaMode, clientX: 300, clientY: 300, ctrlKey: false })
    canvas.dispatchEvent(event)
    return event
  }

  /** 按下 → 分 steps 次移动 dx、dy 像素 → 松开。 */
  lab.drag = function drag(canvas, dx, dy, steps = 1, x0 = 300, y0 = 300) {
    lab.pointer(canvas, 'pointerdown', { clientX: x0, clientY: y0 })
    for (let i = 1; i <= steps; i++) {
      lab.pointer(canvas, 'pointermove', { clientX: x0 + (dx * i) / steps, clientY: y0 + (dy * i) / steps })
    }
    lab.pointer(canvas, 'pointerup', { clientX: x0 + dx, clientY: y0 + dy })
  }

  /** HW2 的初始相机：createHW2Scene.ts:373–382。 */
  lab.hw2Camera = function hw2Camera(aspect = 1.5) {
    const camera = new (C().PerspectiveCamera)({ fovY: Math.PI / 4, aspect, near: 0.1, far: 1000 })
    camera.transform.setPosition([0, 20, 50])
    camera.transform.setRotation([-Math.atan2(10, 50), 0, 0])
    return camera
  }

  /** 同样的初始取景交给 three.js：位置一样，target 一样，lookAt 由 controls.update() 做。 */
  lab.hw2ThreeCamera = function hw2ThreeCamera(aspect = 1.5) {
    const camera = new (C().ThreePerspectiveCamera)(45, aspect, 0.1, 1000)
    camera.position.set(0, 20, 50)
    return camera
  }

  // ---------- 线框画布 ----------

  /** 场景：y = 0 的地面网格、原点的三根轴、一个代表模型的盒子、目标点十字。 */
  function sceneLines() {
    const lines = []
    for (let i = -40; i <= 40; i += 10) {
      lines.push({ a: [i, 0, -40], b: [i, 0, 40], kind: 'grid' })
      lines.push({ a: [-40, 0, i], b: [40, 0, i], kind: 'grid' })
    }
    lines.push({ a: [0, 0, 0], b: [15, 0, 0], kind: 'x' }, { a: [0, 0, 0], b: [0, 15, 0], kind: 'y' }, { a: [0, 0, 0], b: [0, 0, 15], kind: 'z' })
    const lo = [-6, 0, -4]
    const hi = [6, 20, 4]
    const p = (i) => [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]
    for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) {
      lines.push({ a: p(i), b: p(j), kind: 'box' })
    }
    lines.push({ a: [-2, 10, 0], b: [2, 10, 0], kind: 'target' }, { a: [0, 8, 0], b: [0, 12, 0], kind: 'target' }, { a: [0, 10, -2], b: [0, 10, 2], kind: 'target' })
    return lines
  }
  const LINES = sceneLines()

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  }

  /** 把线段变到 clip space，按 w > 0.05 裁掉相机背后的部分，再除以 w、映射到画布像素。 */
  lab.draw = function draw(canvas, view, projection) {
    const { mat4, vec4 } = C()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const g = canvas.getContext('2d')
    const vp = mat4.multiply(mat4.create(), projection, view)
    const colors = {
      grid: cssVar('--orbit-grid', '#9aa3ad'),
      box: cssVar('--orbit-box', '#3b6fd8'),
      x: '#d64545',
      y: '#2e9e4f',
      z: '#3b6fd8',
      target: cssVar('--orbit-target', '#c47a00')
    }
    g.fillStyle = cssVar('--orbit-bg', '#f7f7f5')
    g.fillRect(0, 0, w, h)
    const clip = (p) => vec4.transformMat4(vec4.create(), vec4.fromValues(p[0], p[1], p[2], 1), vp)
    for (const line of LINES) {
      let a = clip(line.a)
      let b = clip(line.b)
      const near = 0.05
      if (a[3] < near && b[3] < near) continue
      if (a[3] < near || b[3] < near) {
        const t = (near - a[3]) / (b[3] - a[3])
        const m = vec4.lerp(vec4.create(), a, b, t)
        if (a[3] < near) a = m
        else b = m
      }
      const sx = (c) => ((c[0] / c[3]) * 0.5 + 0.5) * w
      const sy = (c) => (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * h
      g.strokeStyle = colors[line.kind]
      g.lineWidth = (line.kind === 'grid' ? 1 : 2) * dpr
      g.globalAlpha = line.kind === 'grid' ? 0.55 : 1
      g.beginPath()
      g.moveTo(sx(a), sy(a))
      g.lineTo(sx(b), sy(b))
      g.stroke()
    }
    g.globalAlpha = 1
  }

  // ---------- 并排的两块画布 ----------

  const TARGET = [0, 10, 0]

  /**
   * 左：项目的 PerspectiveCamera + mountOrbitCameraInput（setup.ts:123–127 的配置）。
   * 右：three.js r177 的 PerspectiveCamera + OrbitControls，target、距离范围设成一样。
   */
  lab.viewer = function viewer(mount) {
    const R = C()
    mount.innerHTML = `
      <div class="orbit-pair">
        <figure class="orbit-view"><figcaption>项目代码：PerspectiveCamera + mountOrbitCameraInput</figcaption>
          <canvas class="orbit-canvas" data-side="ours"></canvas><pre class="orbit-read" data-side="ours"></pre></figure>
        <figure class="orbit-view"><figcaption>three.js r177：PerspectiveCamera + OrbitControls</figcaption>
          <canvas class="orbit-canvas" data-side="three"></canvas><pre class="orbit-read" data-side="three"></pre></figure>
      </div>
      <div class="orbit-bar">
        <button type="button" data-act="right">两边都向右拖 ¼ 个画布高</button>
        <button type="button" data-act="down">两边都向下拖 ⅙ 个画布高</button>
        <button type="button" data-act="wheel">两边都滚 deltaY = +100 一格</button>
        <button type="button" data-act="reset">复位</button>
        <label><input type="checkbox" data-opt="damping" /> three.js 打开阻尼 enableDamping</label>
        <label><input type="checkbox" data-opt="legacy" /> three.js 用旧 HW2 的 rotateSpeed 0.3</label>
      </div>`
    const left = mount.querySelector('canvas[data-side="ours"]')
    const right = mount.querySelector('canvas[data-side="three"]')
    const readLeft = mount.querySelector('pre[data-side="ours"]')
    const readRight = mount.querySelector('pre[data-side="three"]')
    const aspect = () => left.clientWidth / Math.max(1, left.clientHeight)

    let ours = lab.hw2Camera(aspect())
    const stop = R.mountOrbitCameraInput(left, () => ours, { target: TARGET, minDistance: 1, maxDistance: 300 })
    const three = lab.hw2ThreeCamera(aspect())
    const controls = new R.ThreeOrbitControls(three, right)
    controls.target.set(TARGET[0], TARGET[1], TARGET[2])
    controls.minDistance = 1
    controls.maxDistance = 300
    controls.update()

    function reset() {
      ours = lab.hw2Camera(aspect())
      three.position.set(0, 20, 50)
      controls.target.set(TARGET[0], TARGET[1], TARGET[2])
      controls.update()
    }

    /**
     * 合成事件期间，在 canvas 实例上盖一层只记账的 capture 方法，结束后删掉这一层，
     * 露出原型上浏览器自己的方法。见 fakeCanvas 的说明。
     */
    function scripted(canvas, fn) {
      let captured = null
      canvas.setPointerCapture = (id) => (captured = id)
      canvas.hasPointerCapture = (id) => captured === id
      canvas.releasePointerCapture = (id) => {
        if (captured === id) captured = null
      }
      try {
        fn()
      } finally {
        delete canvas.setPointerCapture
        delete canvas.hasPointerCapture
        delete canvas.releasePointerCapture
      }
    }
    function realDrag(canvas, dx, dy) {
      const r = canvas.getBoundingClientRect()
      const x0 = r.left + r.width / 2
      const y0 = r.top + r.height / 2
      const init = (type, x, y, buttons) => ({ pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons, clientX: x, clientY: y, bubbles: true, cancelable: true })
      scripted(canvas, () => {
        canvas.dispatchEvent(new PointerEvent('pointerdown', init('pointerdown', x0, y0, 1)))
        canvas.dispatchEvent(new PointerEvent('pointermove', init('pointermove', x0 + dx, y0 + dy, 1)))
        canvas.dispatchEvent(new PointerEvent('pointerup', init('pointerup', x0 + dx, y0 + dy, 0)))
      })
    }
    mount.querySelector('.orbit-bar').addEventListener('click', (event) => {
      const act = event.target.closest('button')?.dataset.act
      if (!act) return
      if (act === 'reset') return reset()
      if (act === 'wheel') {
        for (const c of [left, right]) c.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, deltaMode: 0, cancelable: true, bubbles: true }))
        return
      }
      for (const c of [left, right]) {
        if (act === 'right') realDrag(c, c.clientHeight / 4, 0)
        if (act === 'down') realDrag(c, 0, c.clientHeight / 6)
      }
    })
    mount.querySelector('[data-opt="damping"]').addEventListener('change', (event) => {
      controls.enableDamping = event.target.checked
    })
    mount.querySelector('[data-opt="legacy"]').addEventListener('change', (event) => {
      controls.rotateSpeed = event.target.checked ? 0.3 : 1
    })

    function readout(info, extra) {
      const s = lab.spherical(info.position, TARGET)
      return [
        'position  ' + lab.vec(info.position, 2),
        '距离 ' + num(s.distance, 2) + '   方位角 ' + lab.deg(s.azimuth, 1) + '   仰角 ' + lab.deg(s.elevation, 1),
        extra,
        '目标点    ' + lab.where(info)
      ].join('\n')
    }
    function frame() {
      if (!mount.isConnected) return
      const a = aspect()
      if (Math.abs(ours.aspect - a) > 1e-6) ours.setPerspective({ fovY: ours.fovY, aspect: a, near: ours.near, far: ours.far })
      if (Math.abs(three.aspect - a) > 1e-6) {
        three.aspect = a
        three.updateProjectionMatrix()
      }
      if (controls.enableDamping) controls.update()
      const io = lab.inspect(ours, TARGET)
      const it = lab.inspectThree(three, TARGET)
      lab.draw(left, io.view, io.projection)
      lab.draw(right, it.view, it.projection)
      readLeft.textContent = readout(io, 'rotation  ' + lab.degVec(ours.transform.rotation, 1) + '（Transform，R = Rz·Ry·Rx）')
      const r = three.rotation
      readRight.textContent = readout(it, 'rotation  ' + lab.degVec([r.x, r.y, r.z], 1) + '（three 默认的 XYZ 读法）')
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    return { stop, controls, get ours() { return ours }, three }
  }
})()
