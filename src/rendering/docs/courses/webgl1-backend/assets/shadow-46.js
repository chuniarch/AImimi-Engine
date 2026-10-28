// 经典脚本 (classic script)：第 46 课「不正常的时候」的小引擎：设备（context）丢失与恢复。
// 课程页把这里的类和函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js、shadow-41.js 到 shadow-45.js。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const S42 = RTeach.shadow42
  const S45 = RTeach.shadow45

  /** 丢失时：只忘掉，不删除。旧句柄已经作废，删也没用；取消对资源的订阅 */
  function forgetAll(managers) {
    for (const manager of Object.values(managers)) {
      for (const entry of manager.entries.values()) entry.unsubscribe()
      manager.entries.clear()
    }
  }

  /** context 的三个状态：ready（能画）、lost（丢了）、restoring（正在重建） */
  class ContextLifecycle {
    constructor(canvas, { onLost, restore }) {
      this.state = 'ready'
      canvas.addEventListener('webglcontextlost', (event) => {
        // 不调用它，浏览器就不会恢复这个 context（WebGL 规范 5.15.2）
        event.preventDefault()
        this.state = 'lost'
        onLost()
      })
      canvas.addEventListener('webglcontextrestored', () => {
        this.state = 'restoring'
        restore() // 重建完才回到 ready：重建期间也不许画
        this.state = 'ready'
      })
    }

    get isReady() {
      return this.state === 'ready'
    }
  }

  /** 第 45 课的 Renderer，加上丢失与恢复 */
  class Renderer extends S45.Renderer {
    constructor(gl, BackendClass) {
      super(gl, BackendClass)
      this.skippedFrames = 0
      this.lifecycle = new ContextLifecycle(gl.canvas, {
        onLost: () => forgetAll(this.backend.managers),
        // 新的一代：一套全新的空表，第一次用到时照 CPU 资源重建
        restore: () => {
          this.backend.managers = S42.createManagers(gl)
        }
      })
    }

    render(scene, camera) {
      // 没准备好：整帧跳过——不读场景、不碰 GL、不抛错
      if (!this.lifecycle.isReady || this.backend.gl.isContextLost()) {
        this.skippedFrames++
        return
      }
      super.render(scene, camera)
    }
  }

  RTeach.shadow46 = {
    forgetAll,
    ContextLifecycle,
    Renderer
  }
})()
