import { describe, expect, it } from 'vitest'

import { WebGLContextLifecycle } from '@/rendering/backend/webgl1/WebGLContextLifecycle'

/**
 * 等待浏览器真正派发的 WebGL context 事件。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-real-context-events]
 * 不通过 dispatchEvent 伪造状态转换。若浏览器始终没有派发事件，
 * 超时会使测试失败，而不是把“没有恢复”误判为成功。
 */
function nextContextEvent(
  canvas: HTMLCanvasElement,
  type: 'webglcontextlost' | 'webglcontextrestored'
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const onEvent = (event: Event) => {
      window.clearTimeout(timeout)
      resolve(event)
    }

    const timeout = window.setTimeout(() => {
      canvas.removeEventListener(type, onEvent)
      reject(new Error(`Timed out waiting for ${type}`))
    }, 10_000)

    canvas.addEventListener(type, onEvent, { once: true })
  })
}

/**
 * 用真实 WebGL1 context 验证 DOM 事件与生命周期状态机的连接。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-context-lifecycle-browser-boundary]
 * 本文件不创建 Backend，也不证明 GPU program、buffer 已经重建；
 * 那部分仍需 WebGL1Backend 的浏览器测试验收。
 */
describe('WebGLContextLifecycle real browser events', () => {
  it('真实 lost 事件允许恢复，restored 收尾完成后才重新 ready', async (context) => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8

    const gl = canvas.getContext('webgl', { antialias: false })
    if (gl === null) throw new Error('Browser test requires WebGL1')

    const extension = gl.getExtension('WEBGL_lose_context')
    if (extension === null) {
      context.skip()
      return
    }

    const observations: string[] = []

    const lifecycle: WebGLContextLifecycle = new WebGLContextLifecycle(canvas, {
      onLost: () => {
        observations.push(`onLost:${lifecycle.state}:${lifecycle.isReady}`)
        return undefined
      },
      restore: () => {
        observations.push(`restore:${lifecycle.state}:${lifecycle.isReady}`)
        return undefined
      },
      onReady: () => {
        observations.push(`onReady:${lifecycle.state}:${lifecycle.isReady}`)
        return undefined
      },
      onRestoreFailed: () => {
        observations.push('onRestoreFailed')
        return undefined
      },
      onSuppressedError: () => {
        observations.push('onSuppressedError')
        return undefined
      }
    })

    try {
      expect(lifecycle.state).toBe('ready')

      const lostEvent = nextContextEvent(canvas, 'webglcontextlost')
      extension.loseContext()
      const lost = await lostEvent

      expect(lost.defaultPrevented).toBe(true)
      expect(gl.isContextLost()).toBe(true)
      expect(lifecycle.state).toBe('lost')
      expect(observations).toEqual(['onLost:lost:false'])

      /**
       * [DESIGN-WEIGHT:3][test-context-restore-event-boundary]
       * lost Promise 在事件 listener 内 resolve；await 的续体不保证事件派发已结束。
       * 下一轮任务开始时，浏览器才已完成该事件的可恢复性判定。
       */
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 0)
      })

      const restoredEvent = nextContextEvent(canvas, 'webglcontextrestored')
      extension.restoreContext()
      await restoredEvent

      expect(gl.isContextLost()).toBe(false)
      expect(observations).toEqual([
        'onLost:lost:false',
        'restore:restoring:false',
        'onReady:restoring:false'
      ])
      expect(lifecycle.state).toBe('ready')
      expect(lifecycle.isReady).toBe(true)
      expect(lifecycle.lastFailure).toBeNull()
    } finally {
      lifecycle.dispose()
      if (gl.isContextLost()) extension.restoreContext()
    }
  }, 25_000)
})
