// 经典脚本 (classic script)：第 48 课「两遍之间谁插得进来」的实验。
// 课程页把这里的函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 这里的函数全是课程写的，项目源码里没有。
// 实验台依赖 shadow-raw.js、shadow-41.js、shadow-42.js、shadow-43.js（第 43 课的两遍）。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  // ============ 工具 ============

  /** 原地空转 ms 毫秒：模拟一遍要算很久（JS 没有「停一下」，只能忙等） */
  function busy(ms) {
    const start = performance.now()
    while (performance.now() - start < ms) {}
  }

  /** 一份记录：每一行记下离这一帧开始过了几毫秒 */
  function createLog() {
    let start = performance.now()
    const lines = []
    return {
      lines,
      /** 这一帧开始了：之后的时间都从这里量 */
      begin() {
        start = performance.now()
      },
      add(text, kind) {
        lines.push({ t: Math.round(performance.now() - start), text, kind })
      },
      /** 把别的时刻（比如 event.timeStamp）换到同一把尺子上 */
      since(time) {
        return Math.round(time - start)
      }
    }
  }

  /** 一遍：记下开始，忙 ms 毫秒，记下结束 */
  function pass(log, name, ms) {
    log.add(name + ' 开始')
    busy(ms)
    log.add(name + ' 结束')
  }

  /** 让出主线程，等一个定时器任务：在它之前排好的任务都会先跑 */
  function nextTask() {
    return new Promise((resolve) => setTimeout(resolve, 0))
  }

  /**
   * 跑一张卡片：card(log, done, home) 调 done() 表示结束。
   * 超过 timeoutMs 还没结束，也交回已有的记录，不让卡片卡在「运行中」。
   */
  function runCard(card, home, timeoutMs = 3000) {
    const log = createLog()
    return new Promise((resolve) => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        // 晚一点交：让 done() 之后同一批里排着的回调也记进来
        setTimeout(() => resolve({ lines: log.lines }), 30)
      }
      setTimeout(() => {
        if (!finished) log.add('（' + timeoutMs + ' ms 内没有结束）', 'late')
        finish()
      }, timeoutMs)
      card(log, finish, home)
    })
  }

  // ============ 卡片 ============

  /** 卡片 A：这一帧开始后 50 ms 就到点的定时器，什么时候能跑 */
  function timerDuringFrame(log, done) {
    requestAnimationFrame(() => {
      log.begin()
      log.add('rAF 回调开始（相当于 Engine.loop）')
      setTimeout(() => {
        log.add('定时器回调（50 ms 时就到点了）')
        done()
      }, 50)
      pass(log, 'Pass 1', 150)
      pass(log, 'Pass 2', 150)
      log.add('rAF 回调返回')
    })
  }

  /** 卡片 B：Pass 1 里排一个 then，Pass 2 看不看得到它改的值 */
  function microtaskInPass(log, done) {
    let bias = 0.003
    requestAnimationFrame(() => {
      log.begin()
      log.add('Pass 1 用 bias = ' + bias)
      Promise.resolve().then(() => {
        bias = 0.02
        log.add('then 回调：bias 改成 0.02')
      })
      busy(20)
      log.add('Pass 2 用 bias = ' + bias)
      log.add('rAF 回调返回')
      requestAnimationFrame(() => {
        log.add('下一帧的 rAF 回调：bias = ' + bias)
        done()
      })
    })
  }

  /** 卡片 C：两遍之间 await 一个定时器，早就排好的回调会不会插进来 */
  function awaitTaskBetweenPasses(log, done) {
    requestAnimationFrame(async () => {
      log.begin()
      // 一开始就排好、马上能跑的回调：相当于一次正在排队的点击
      setTimeout(() => log.add('早就排好的定时器回调'), 0)
      pass(log, 'Pass 1', 100)
      await nextTask() // 两遍之间「等一下」
      pass(log, 'Pass 2', 100)
      log.add('回调结束')
      done()
    })
  }

  /** 卡片 D：帧里自己 dispatchEvent，监听器什么时候跑 */
  function dispatchInFrame(log, done) {
    let inFrame = false
    const onResize = () => log.add('resize 监听器：inFrame = ' + inFrame)
    window.addEventListener('resize', onResize)
    requestAnimationFrame(() => {
      log.begin()
      inFrame = true // 和 Engine.loop 一样：进帧时立起来
      log.add('Pass 1：window.dispatchEvent(new Event(\'resize\'))')
      window.dispatchEvent(new Event('resize'))
      log.add('Pass 1 结束')
      inFrame = false
      window.removeEventListener('resize', onResize)
      done()
    })
  }

  /** 卡片 E：Pass 1 里 context 丢了，Pass 2 和 lost 事件各在什么时候知道 */
  function loseInPass(log, done) {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      log.add('webglcontextlost 回调')
      done()
    })
    requestAnimationFrame(() => {
      log.begin()
      log.add('Pass 1：isContextLost() = ' + gl.isContextLost())
      gl.getExtension('WEBGL_lose_context').loseContext() // 模拟 GPU 出事
      log.add('Pass 1 末尾：context 丢了')
      log.add('Pass 2：isContextLost() = ' + gl.isContextLost())
      log.add('rAF 回调返回')
    })
  }

  /** 卡片 F：画完以后再读画布，什么时候还读得到 */
  function readBackLater(log, done, home) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 24
    home.replaceChildren(canvas) // 挂在页面上：浏览器才会把它合成到屏幕上
    const gl = canvas.getContext('webgl') // preserveDrawingBuffer 默认 false
    const read = () => {
      const p = new Uint8Array(4)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p)
      return '(' + p.join(', ') + ')'
    }
    requestAnimationFrame(() => {
      log.begin()
      gl.clearColor(1, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT) // 画成红色
      log.add('同一个回调里读：' + read())
      Promise.resolve().then(() => log.add('then 回调里读：' + read()))
      setTimeout(() => {
        log.add('setTimeout 0 里读：' + read())
        done()
      }, 0)
    })
  }

  // ============ 量你的显示器 ============

  /**
   * 连续 frames 帧，每帧在 rAF 回调里忙 workMs 毫秒。先空跑 10 帧热身。
   * 返回每两帧之间 rAF 时间戳的差（stamps）和回调真正开始时刻的差（starts）。
   */
  function measureCadence({ frames = 90, workMs = 0 } = {}) {
    return new Promise((resolve) => {
      const stamps = []
      const starts = []
      let warm = 10
      function tick(stamp) {
        if (warm > 0) {
          warm -= 1
          requestAnimationFrame(tick)
          return
        }
        stamps.push(stamp)
        starts.push(performance.now())
        busy(workMs)
        if (stamps.length <= frames) requestAnimationFrame(tick)
        else resolve({ stamps: diffs(stamps), starts: diffs(starts) })
      }
      requestAnimationFrame(tick)
    })
  }

  function diffs(list) {
    return list.slice(1).map((value, i) => value - list[i])
  }

  function median(list) {
    const sorted = [...list].sort((a, b) => a - b)
    return sorted[sorted.length >> 1]
  }

  function mean(list) {
    return list.reduce((sum, value) => sum + value, 0) / list.length
  }

  // ============ 实验台：第 43 课的两遍，加上「慢」和「两遍之间等一下」 ============

  /** 灯的方向换回角度：toLight 的 x、y 分量是 sin、cos（再乘同一个数） */
  function angleOf(light) {
    return Math.round((Math.atan2(light.toLight[0], light.toLight[1]) * 180) / Math.PI)
  }

  /**
   * 实验台的一帧。options：
   *   snapshot  true 用第 43 课「先抄一份」，false 用第 42 课切开的两半（每一半自己读场景）
   *   passMs    每一遍额外忙多少毫秒，模拟很重的一遍
   *   between   两遍之间做什么：'none' 什么都不做，'microtask' await null，'task' await 一个定时器
   * 返回两遍各自用的灯角度。
   */
  async function twoPasses(app, options, log) {
    const { gl, managers, scene, camera } = app
    const S43 = RTeach.shadow43
    const aspect = gl.canvas.width / gl.canvas.height
    const frame = options.snapshot ? S43.buildFrame(scene, camera, aspect) : null

    const first = angleOf(frame ? frame.lights[0] : scene.lights[0])
    log.add('Pass 1 开始，用灯 ' + first + '°')
    busy(options.passMs)
    if (frame) S43.shadowPass(gl, managers, frame)
    else S43.shadowPassLive(gl, managers, scene)
    log.add('Pass 1 结束')

    if (options.between === 'microtask') await null
    if (options.between === 'task') await nextTask()

    const second = angleOf(frame ? frame.lights[0] : scene.lights[0])
    log.add('Pass 2 开始，用灯 ' + second + '°')
    busy(options.passMs)
    if (frame) S43.mainPass(gl, managers, frame)
    else S43.mainPassLive(gl, managers, scene, camera)
    log.add('Pass 2 结束')
    return { first, second }
  }

  RTeach.frameLab = {
    busy,
    createLog,
    pass,
    nextTask,
    runCard,
    timerDuringFrame,
    microtaskInPass,
    awaitTaskBetweenPasses,
    dispatchInFrame,
    loseInPass,
    readBackLater,
    measureCadence,
    median,
    mean,
    angleOf,
    twoPasses
  }
})()
