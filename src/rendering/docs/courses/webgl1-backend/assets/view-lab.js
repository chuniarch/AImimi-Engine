// 经典脚本 (classic script)，不是 ES module：课程页用 file:// 双击打开也能加载。
// 第 32–35 课用（相机数学零基础重写）：侧视图滑块、可以拖的线框画布、歪头读数。
// 依赖 camera-bundle.js（window.RTeachCamera：项目的 PerspectiveCamera、mountOrbitCameraInput 和 gl-matrix）
// 与 orbit-lab.js（RTeach.orbitLab.draw 画线框、hw2Camera 建 HW2 的初始相机）。样式用 course.css 里的 .vl-* 类。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  const lab = (RTeach.viewLab = RTeach.viewLab || {})
  const C = () => window.RTeachCamera
  const DEG = 180 / Math.PI
  const TARGET = [0, 10, 0]
  lab.TARGET = TARGET

  /** 保留 n 位小数；-0 显示成 0。 */
  function num(x, n = 2) {
    if (!Number.isFinite(x)) return String(x)
    const s = x.toFixed(n)
    return /^-0\.?0*$/.test(s) ? s.slice(1) : s
  }
  lab.num = num

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  // ======================================================================
  // 1. 侧视图：深度 D、高度 y、视场角 fovY 三个滑块，算出 P 落在第几行像素
  // ======================================================================

  /**
   * 左边画「从侧面看相机」：相机在左，视线向右；在深度 D 处立一块垂直于视线的板，P 在板上高 y 处。
   * 右边画画布的一列像素（H = 600 行），标出 P 落在哪一行。
   * 下面的读数一步一步代入公式，最后一行用项目的 PerspectiveCamera 矩阵再算一遍，两者应该相同。
   */
  lab.sideView = function sideView(mount, options = {}) {
    const H = 600
    const W = 900
    const state = { D: options.D ?? 50.99, y: options.y ?? 5, fov: options.fov ?? 45 }
    mount.replaceChildren()
    const root = element('div', 'vl-side')
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 640 300')
    svg.setAttribute('class', 'vl-side-svg')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', '侧视图：相机在左，视线向右，深度 D 处的板和板上的点 P；右边是画布的一列像素')
    root.append(svg)

    const bar = element('div', 'vl-sliders')
    const sliders = {}
    for (const [key, label, min, max, step] of [
      ['D', '深度 D（相机正前方多远）', 5, 120, 0.01],
      ['y', 'P 的高度 y（在视线上方多少）', -40, 40, 0.1],
      ['fov', '垂直视场角 fovY（度）', 20, 100, 1]
    ]) {
      const row = element('label', 'vl-slider')
      row.append(element('span', '', label))
      const input = element('input')
      input.type = 'range'
      input.min = String(min)
      input.max = String(max)
      input.step = String(step)
      input.value = String(state[key])
      const value = element('output', '', '')
      input.addEventListener('input', () => {
        state[key] = Number(input.value)
        update()
      })
      sliders[key] = { input, value }
      row.append(input, value)
      bar.append(row)
    }
    root.append(bar)
    const read = element('pre', 'vl-read')
    root.append(read)
    mount.append(root)

    const S = 3.2 // 侧视图里 1 个世界单位画成 3.2 个 SVG 单位
    const camX = 30
    const midY = 150
    function line(x1, y1, x2, y2, cls) {
      const l = document.createElementNS(svgNS, 'line')
      l.setAttribute('x1', x1)
      l.setAttribute('y1', y1)
      l.setAttribute('x2', x2)
      l.setAttribute('y2', y2)
      l.setAttribute('class', cls)
      svg.append(l)
      return l
    }
    function text(x, y, content, cls = '') {
      const t = document.createElementNS(svgNS, 'text')
      t.setAttribute('x', x)
      t.setAttribute('y', y)
      t.setAttribute('class', cls)
      t.textContent = content
      svg.append(t)
      return t
    }

    /** 用项目的 PerspectiveCamera（放在原点、不旋转，所以世界坐标就是相机坐标）把 (0, y, −D) 变成像素行号。 */
    function projectWithProjectCamera() {
      const R = C()
      if (!R) return null
      const camera = new R.PerspectiveCamera({ fovY: (state.fov * Math.PI) / 180, aspect: W / H, near: 0.1, far: 1000 })
      const projection = R.mat4.create()
      camera.copyProjectionMatrixTo(projection)
      const clip = R.vec4.transformMat4(R.vec4.create(), R.vec4.fromValues(0, state.y, -state.D, 1), projection)
      return ((1 - clip[1] / clip[3]) / 2) * H
    }

    function update() {
      const { D, y, fov } = state
      sliders.D.value.textContent = num(D, 2)
      sliders.y.value.textContent = num(y, 1)
      sliders.fov.value.textContent = num(fov, 0) + '°'
      const t = Math.tan(((fov / 2) * Math.PI) / 180)
      const half = D * t
      const h = 2 * half
      const perPixel = h / H
      const py = H / 2 - y / perPixel

      svg.replaceChildren()
      // 视线（虚线）、上下边界、深度 D 处的板
      const px = camX + D * S
      line(camX, midY, 470, midY, 'vl-axis')
      text(475, midY + 4, '视线', 'vl-small')
      const edgeX = 470
      line(camX, midY, edgeX, midY - (edgeX - camX) * t, 'vl-edge')
      line(camX, midY, edgeX, midY + (edgeX - camX) * t, 'vl-edge')
      line(px, midY - half * S, px, midY + half * S, 'vl-plane')
      // 半高的标注：放在板的右边 30 个单位处，免得和 P 的名字挤在一起
      line(px + 30, midY, px + 30, midY - half * S, 'vl-measure')
      text(px + 35, midY - (half * S) / 2, '半高 ' + num(half, 2), 'vl-small')
      // 深度 D 的标注：放在板的下端再往下一点
      const dY = Math.min(268, midY + half * S + 14)
      line(camX, dY, px, dY, 'vl-measure')
      text((camX + px) / 2 - 18, dY + 14, 'D = ' + num(D, 2), 'vl-small')
      // 点 P 和它到相机的连线
      const pY = midY - y * S
      line(camX, midY, px, pY, 'vl-ray')
      const dot = document.createElementNS(svgNS, 'circle')
      dot.setAttribute('cx', px)
      dot.setAttribute('cy', pY)
      dot.setAttribute('r', 4)
      dot.setAttribute('class', 'vl-dot')
      svg.append(dot)
      text(px + 8, pY + 4, 'P', 'vl-label')
      // 相机
      const cam = document.createElementNS(svgNS, 'circle')
      cam.setAttribute('cx', camX)
      cam.setAttribute('cy', midY)
      cam.setAttribute('r', 5)
      cam.setAttribute('class', 'vl-cam')
      svg.append(cam)
      text(camX - 14, midY + 22, '相机', 'vl-small')
      // 角度标注
      text(camX + 50, midY + 13, 'fovY/2', 'vl-small')

      // 右边：画布的一列像素，0 行在上，600 行在下
      const colX = 560
      const colTop = 20
      const colH = 260
      const rect = document.createElementNS(svgNS, 'rect')
      rect.setAttribute('x', colX)
      rect.setAttribute('y', colTop)
      rect.setAttribute('width', 30)
      rect.setAttribute('height', colH)
      rect.setAttribute('class', 'vl-column')
      svg.append(rect)
      text(colX - 6, colTop - 6, '画布 600 px', 'vl-small')
      text(colX + 34, colTop + 4, '0', 'vl-small')
      text(colX + 34, colTop + colH / 2 + 4, '300', 'vl-small')
      text(colX + 34, colTop + colH + 4, '600', 'vl-small')
      if (py >= 0 && py <= H) {
        const rowY = colTop + (py / H) * colH
        line(colX, rowY, colX + 30, rowY, 'vl-row')
        text(colX - 24, rowY + 4, 'py', 'vl-label')
      } else {
        text(colX - 6, colTop + colH + 18, 'P 在画面外', 'vl-small')
      }

      const check = projectWithProjectCamera()
      read.textContent = [
        '① tan(fovY/2) = tan(' + num(fov / 2, 1) + '°) = ' + num(t, 5),
        '② 半高 = D × tan(fovY/2) = ' + num(D, 2) + ' × ' + num(t, 5) + ' = ' + num(half, 4),
        '   可见高度 h = 2 × 半高 = ' + num(h, 4) + ' 个世界单位',
        '③ 画布高 H = 600 px 铺满这 ' + num(h, 4) + ' 个单位：1 px = h ÷ H = ' + num(perPixel, 6) + ' 个单位',
        '④ P 在视线上方 y = ' + num(y, 1) + ' 个单位 = ' + num(y, 1) + ' ÷ ' + num(perPixel, 6) + ' = ' + num(y / perPixel, 2) + ' px',
        '⑤ 中心是第 300 行，屏幕的行号向下增大：py = 300 − ' + num(y / perPixel, 2) + ' = ' + num(py, 2) + (py < 0 || py > H ? '（不在 0–600 之间：画面外）' : ''),
        check === null ? '' : '   项目的 PerspectiveCamera 矩阵算出：py = ' + num(check, 2)
      ].join('\n')
    }
    update()
    return { state, update }
  }

  // ======================================================================
  // 2. 线框画布：HW2 的相机、地面网格、几个标记点；可以接真实的轨道控制或课程写的控制
  // ======================================================================

  /** 相机 world 矩阵 → 三根轴（右 r、上 u、后 b）和位置。第 25 课：矩阵的前三列就是三根轴。 */
  lab.axesOf = function axesOf(world) {
    return {
      right: [world[0], world[1], world[2]],
      up: [world[4], world[5], world[6]],
      back: [world[8], world[9], world[10]],
      position: [world[12], world[13], world[14]]
    }
  }
  /** 歪头角：右方向 r 离开水平面的角度。没歪时 r 的 y 分量是 0。 */
  lab.rollOf = function rollOf(world) {
    return Math.atan2(world[1], world[5]) * DEG
  }

  /**
   * options：
   *   markers   [{ name, point: [x, y, z], color }]：要标出来的点
   *   orbit     传给 mountOrbitCameraInput 的选项（target 默认 [0, 10, 0]）；不传就不接真实轨道控制
   *   attach    (canvas, api) => 卸载函数：接课程自己写的输入（比如 arcball、每格减 5 的滚轮）
   *   getWorld  (api) => 相机 world 矩阵：相机不由 PerspectiveCamera.transform 决定时提供（arcball）
   *   guide     true 时画一条穿过画面中心的水平虚线，用来对照地平线有没有斜
   *   readout   (api, marks) => string：画布下面的读数；marks 是每个标记点这一帧的像素位置和深度
   *   buttons   [{ label, run(api) }]
   */
  lab.scene = function scene(mount, options = {}) {
    const R = C()
    mount.replaceChildren()
    const root = element('div', 'vl-scene')
    const canvas = element('canvas', 'vl-canvas')
    const read = element('pre', 'vl-read')
    const bar = element('div', 'vl-bar')
    root.append(canvas, bar, read)
    mount.append(root)

    // 布局还没算出来时 clientWidth 是 0，先按 900 × 600 的 1.5 建相机，下一帧再按实际尺寸改
    const aspect = () => (canvas.clientWidth > 0 && canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1.5)
    let camera = RTeach.orbitLab.hw2Camera(aspect())
    const api = {
      canvas,
      get camera() {
        return camera
      },
      snapshot: null,
      lastMarks: [],
      world() {
        if (options.getWorld) return options.getWorld(api)
        const world = R.mat4.create()
        camera.copyWorldMatrixTo(world)
        return world
      },
      /** 世界点 → { x, y（画布 CSS 像素，左上角为 0）, depth（相机正前方多远） }；在相机背后返回 null。 */
      project(point) {
        const world = api.world()
        const view = R.mat4.invert(R.mat4.create(), world)
        const projection = R.mat4.create()
        camera.copyProjectionMatrixTo(projection)
        const inCamera = R.vec4.transformMat4(R.vec4.create(), R.vec4.fromValues(point[0], point[1], point[2], 1), view)
        const clip = R.vec4.transformMat4(R.vec4.create(), inCamera, projection)
        if (clip[3] <= 1e-6) return null
        return {
          x: ((clip[0] / clip[3] + 1) / 2) * canvas.clientWidth,
          y: ((1 - clip[1] / clip[3]) / 2) * canvas.clientHeight,
          depth: -inCamera[2]
        }
      },
      marks() {
        return (options.markers || []).map((m) => ({ ...m, at: api.project(m.point) }))
      },
      /** 记下每个标记点现在的位置；读数里的「挪了多少」都相对这一刻。 */
      takeSnapshot() {
        api.snapshot = api.marks()
      },
      reset() {
        camera = RTeach.orbitLab.hw2Camera(aspect())
        if (options.onReset) options.onReset(api)
        api.snapshot = null
      },
      /** 合成一次拖动：真实的 PointerEvent，只把 setPointerCapture 临时换成记账版（合成指针没法真的被捕获）。 */
      drag({ button = 0, dx = 0, dy = 0, steps = 1 } = {}) {
        const bit = button === 2 ? 2 : button === 1 ? 4 : 1
        const r = canvas.getBoundingClientRect()
        const x0 = r.left + r.width / 2
        const y0 = r.top + r.height / 2
        const init = (x, y, b, bs) => ({ pointerId: 7, pointerType: 'mouse', isPrimary: true, button: b, buttons: bs, clientX: x, clientY: y, bubbles: true, cancelable: true })
        lab.scripted(canvas, () => {
          canvas.dispatchEvent(new PointerEvent('pointerdown', init(x0, y0, button, bit)))
          for (let i = 1; i <= steps; i++) {
            canvas.dispatchEvent(new PointerEvent('pointermove', init(x0 + (dx * i) / steps, y0 + (dy * i) / steps, -1, bit)))
          }
          canvas.dispatchEvent(new PointerEvent('pointerup', init(x0 + dx, y0 + dy, button, 0)))
        })
      },
      /** 合成一系列拖动路径：path 是相对起点的 [dx, dy] 序列，一次按下、依次移动、最后松开。 */
      dragPath({ button = 0, path = [] } = {}) {
        const bit = button === 2 ? 2 : 1
        const r = canvas.getBoundingClientRect()
        const x0 = r.left + r.width / 2
        const y0 = r.top + r.height / 2
        const init = (x, y, b, bs) => ({ pointerId: 7, pointerType: 'mouse', isPrimary: true, button: b, buttons: bs, clientX: x, clientY: y, bubbles: true, cancelable: true })
        lab.scripted(canvas, () => {
          canvas.dispatchEvent(new PointerEvent('pointerdown', init(x0, y0, button, bit)))
          let last = [0, 0]
          for (const p of path) {
            canvas.dispatchEvent(new PointerEvent('pointermove', init(x0 + p[0], y0 + p[1], -1, bit)))
            last = p
          }
          canvas.dispatchEvent(new PointerEvent('pointerup', init(x0 + last[0], y0 + last[1], button, 0)))
        })
      },
      wheel(deltaY) {
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY, deltaMode: 0, bubbles: true, cancelable: true }))
      }
    }

    // 先登记「记下位置」，再接控制：同一个元素上的监听按登记顺序执行，所以这里总在控制改相机之前运行
    canvas.addEventListener('pointerdown', () => api.takeSnapshot())
    canvas.addEventListener('wheel', () => api.takeSnapshot())
    canvas.addEventListener('contextmenu', (event) => event.preventDefault())

    let stop = null
    if (options.orbit) {
      stop = R.mountOrbitCameraInput(canvas, () => camera, { target: TARGET, minDistance: 1, maxDistance: 300, ...options.orbit })
    } else if (options.attach) {
      stop = options.attach(canvas, api)
    }
    api.stop = () => stop && stop()

    for (const b of options.buttons || []) {
      const button = element('button', '', b.label)
      button.type = 'button'
      button.addEventListener('click', () => b.run(api))
      bar.append(button)
    }

    function frame() {
      if (!mount.isConnected) return
      const a = aspect()
      if (Math.abs(camera.aspect - a) > 1e-6) camera.setPerspective({ fovY: camera.fovY, aspect: a, near: camera.near, far: camera.far })
      const world = api.world()
      const view = R.mat4.invert(R.mat4.create(), world)
      const projection = R.mat4.create()
      camera.copyProjectionMatrixTo(projection)
      RTeach.orbitLab.draw(canvas, view, projection)
      const g = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      if (options.guide) {
        g.save()
        g.setLineDash([6 * dpr, 6 * dpr])
        g.strokeStyle = '#888'
        g.lineWidth = dpr
        g.beginPath()
        g.moveTo(0, canvas.height / 2)
        g.lineTo(canvas.width, canvas.height / 2)
        g.stroke()
        g.restore()
      }
      const marks = api.marks()
      for (const m of marks) {
        if (!m.at) continue
        g.fillStyle = m.color || '#b23a2f'
        g.beginPath()
        g.arc(m.at.x * dpr, m.at.y * dpr, 5 * dpr, 0, Math.PI * 2)
        g.fill()
        g.font = 12 * dpr + 'px sans-serif'
        g.fillText(m.name, (m.at.x + 8) * dpr, (m.at.y - 8) * dpr)
      }
      api.lastMarks = marks
      if (options.readout) read.textContent = options.readout(api, marks)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    return api
  }

  /**
   * 合成事件期间，在元素实例上盖一层只记账的 capture 方法，结束后删掉，露出浏览器自己的方法。
   * 合成的 PointerEvent 没有真实的指针，浏览器的 setPointerCapture 会抛 NotFoundError。
   */
  lab.scripted = function scripted(target, fn) {
    let captured = null
    target.setPointerCapture = (id) => (captured = id)
    target.hasPointerCapture = (id) => captured === id
    target.releasePointerCapture = (id) => {
      if (captured === id) captured = null
    }
    try {
      fn()
    } finally {
      delete target.setPointerCapture
      delete target.hasPointerCapture
      delete target.releasePointerCapture
    }
  }

  /** 函数自己的源码，去掉整体缩进：最后一行的「}」放到第 0 列。页面上显示的代码就是正在运行的代码。 */
  lab.sourceOf = function sourceOf(fn) {
    const lines = fn.toString().split('\n')
    const last = lines[lines.length - 1]
    const indent = last.length - last.trimStart().length
    return lines.map((line, i) => (i === 0 ? line : line.slice(Math.min(indent, line.length - line.trimStart().length)))).join('\n')
  }

  /** 相机到目标点的距离。 */
  lab.distance = function distance(position, target = TARGET) {
    return Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
  }
})()
