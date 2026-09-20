import { describe, expect, it, vi } from 'vitest'

import {
  WebGLContextLifecycle,
  type WebGLContextLifecycleCallbacks,
  type WebGLContextSuppressedError
} from '@/rendering/backend/webgl1/WebGLContextLifecycle'

/** 显式返回 undefined，使测试回调也遵守同步接口。 */
function createCallbacks() {
  return {
    onLost: vi.fn((): undefined => undefined),
    restore: vi.fn((): undefined => undefined),
    onReady: vi.fn((): undefined => undefined),
    onRestoreFailed: vi.fn((_error: unknown): undefined => undefined),
    onSuppressedError: vi.fn((_error: WebGLContextSuppressedError): undefined => undefined)
  }
}

/**
 * 让 listener 异常按普通函数调用直接传播，用于验证 Lifecycle 自身确实隔离异常。
 *
 * @remarks
 * 原生 DOM EventTarget 会把 listener 异常报告为 uncaught，而不传给 dispatchEvent
 * 调用者；如果只用原生对象，`not.toThrow()` 无法证明异常是本类捕获的。
 */
class SynchronousEventTarget extends EventTarget {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null
  ): void {
    if (callback === null) return
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
    listeners.add(callback)
    this.listeners.set(type, listeners)
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null
  ): void {
    if (callback === null) return
    this.listeners.get(type)?.delete(callback)
  }

  override dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === 'function') listener.call(this, event)
      else listener.handleEvent(event)
    }
    return !event.defaultPrevented
  }
}

/** 模拟可取消的 DOM lost 事件；不假装真的丢失 GPU context。 */
function lose(canvas: EventTarget): Event {
  const event = new Event('webglcontextlost', { cancelable: true })
  canvas.dispatchEvent(event)
  return event
}

/** 模拟浏览器通知；测试不能据此证明浏览器一定会恢复。 */
function restore(canvas: EventTarget): void {
  canvas.dispatchEvent(new Event('webglcontextrestored'))
}

/** 由 tsc 而不是普通 Vitest 转译验证：async 不能充当同步恢复实现。 */
function checkSyncContract(callbacks: WebGLContextLifecycleCallbacks): void {
  // @ts-expect-error Promise<undefined> 不满足同步返回 undefined 的契约。
  callbacks.restore = async () => undefined
}
void checkSyncContract

/**
 * 从事件前后的公共状态和回调记录验证状态机，不读取 private 字段。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-context-transition-order]
 */
describe('WebGLContextLifecycle', () => {
  it('按 lost → restoring → ready 执行，收尾完成前禁止 ready', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    const observations: string[] = []
    callbacks.onLost.mockImplementation(() => {
      observations.push('onLost:' + lifecycle.state)
      return undefined
    })
    callbacks.restore.mockImplementation(() => {
      observations.push('restore:' + lifecycle.state)
      return undefined
    })
    callbacks.onReady.mockImplementation(() => {
      observations.push('onReady:' + lifecycle.state)
      expect(lifecycle.isReady).toBe(false)
      return undefined
    })
    expect(lifecycle.isReady).toBe(true)
    expect(lose(canvas).defaultPrevented).toBe(true)
    expect(lifecycle.state).toBe('lost')
    expect(callbacks.restore).not.toHaveBeenCalled()
    restore(canvas)
    expect(observations).toEqual(['onLost:lost', 'restore:restoring', 'onReady:restoring'])
    expect(lifecycle.isReady).toBe(true)
    expect(lifecycle.lastFailure).toBeNull()
    lifecycle.dispose()
  })

  it('忽略无 lost 的 restored 和重复事件，不重复执行恢复', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    restore(canvas)
    expect(callbacks.restore).not.toHaveBeenCalled()
    lose(canvas)
    expect(lose(canvas).defaultPrevented).toBe(true)
    callbacks.restore.mockImplementation(() => {
      restore(canvas)
      return undefined
    })
    restore(canvas)
    restore(canvas)
    expect(callbacks.onLost).toHaveBeenCalledTimes(1)
    expect(callbacks.restore).toHaveBeenCalledTimes(1)
    expect(callbacks.onReady).toHaveBeenCalledTimes(1)
    lifecycle.dispose()
  })

  /** 不吞掉失败，也不让 DOM listener 异常变成未捕获异常。 */
  it.each(['restore', 'onReady'] as const)('%s 失败后保持不可绘制并通知原始错误', (method) => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const error = new Error('primary')
    callbacks[method].mockImplementation(() => {
      throw error
    })
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    lose(canvas)
    expect(() => restore(canvas)).not.toThrow()
    expect(lifecycle.state).toBe('restore-failed')
    expect(lifecycle.isReady).toBe(false)
    expect(callbacks.onRestoreFailed).toHaveBeenCalledExactlyOnceWith(error)
    expect(lifecycle.lastFailure).toEqual({
      phase: method === 'restore' ? 'restore' : 'on-ready',
      error
    })
    expect(Object.isFrozen(lifecycle.lastFailure)).toBe(true)
    if (method === 'restore') expect(callbacks.onReady).not.toHaveBeenCalled()
    lifecycle.dispose()
  })

  it('通知自身失败时同时保留主错误和通知错误', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const error = new Error('restore')
    const notificationError = new Error('notification')
    callbacks.restore.mockImplementation(() => {
      throw error
    })
    callbacks.onRestoreFailed.mockImplementation(() => {
      throw notificationError
    })
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    lose(canvas)
    restore(canvas)
    expect(lifecycle.lastFailure).toEqual({ phase: 'restore', error, notificationError })
    expect(lifecycle.state).toBe('restore-failed')
    lifecycle.dispose()
  })

  it('onLost 失败可诊断，新一轮成功恢复清除失败记录', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const error = new Error('invalidate')
    callbacks.onLost.mockImplementation(() => {
      throw error
    })
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    lose(canvas)
    expect(lifecycle.state).toBe('lost')
    expect(lifecycle.lastFailure).toEqual({ phase: 'on-lost', error })
    expect(callbacks.onRestoreFailed).not.toHaveBeenCalled()
    restore(canvas)
    expect(lifecycle.isReady).toBe(true)
    expect(lifecycle.lastFailure).toBeNull()
    lifecycle.dispose()
  })

  /** callback 中 dispose 是同步重入；外层不得把 disposed 再改回 ready。 */
  it.each(['restore', 'onReady'] as const)('%s 中 dispose 后不能复活', (method) => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    callbacks[method].mockImplementation(() => {
      lifecycle.dispose()
      return undefined
    })
    lose(canvas)
    restore(canvas)
    expect(lifecycle.state).toBe('disposed')
    if (method === 'restore') expect(callbacks.onReady).not.toHaveBeenCalled()
  })

  it('恢复回调中再次 lost 时保留较新的 lost 状态', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    callbacks.restore.mockImplementation(() => {
      lose(canvas)
      return undefined
    })
    lose(canvas)
    restore(canvas)
    expect(lifecycle.state).toBe('lost')
    expect(callbacks.onReady).not.toHaveBeenCalled()
    lifecycle.dispose()
  })

  /**
   * 防止旧恢复异常为了可观测性而重新取得状态写权限。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][test-context-suppressed-error-observability]
   * lost 产生版本 1，restored 产生版本 2；restore 内 dispose 再产生版本 3。
   * dispose 后继续抛出的异常属于版本 2，只能作为 stale 诊断上报，不能把
   * disposed 改写成 restore-failed，也不能成为当前 lastFailure。
   */
  it('restore 中 dispose 后抛错时报告过期错误但保留 disposed', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const error = new Error('obsolete restore')
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)

    callbacks.restore.mockImplementation(() => {
      lifecycle.dispose()
      throw error
    })

    lose(canvas)
    expect(() => restore(canvas)).not.toThrow()

    expect(lifecycle.state).toBe('disposed')
    expect(lifecycle.lastFailure).toBeNull()
    expect(callbacks.onRestoreFailed).not.toHaveBeenCalled()
    expect(callbacks.onSuppressedError).toHaveBeenCalledExactlyOnceWith({
      error,
      phase: 'restore',
      stale: true,
      capturedVersion: 2,
      currentVersion: 3
    })
    expect(Object.isFrozen(callbacks.onSuppressedError.mock.calls[0]![0])).toBe(true)
  })

  /** onLost 也可能在同步 dispose 后继续抛错；不得形成当前 lastFailure。 */
  it('onLost 中 dispose 后抛错时通过相同诊断出口报告', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const error = new Error('obsolete onLost')
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)

    callbacks.onLost.mockImplementation(() => {
      lifecycle.dispose()
      throw error
    })

    expect(() => lose(canvas)).not.toThrow()

    expect(lifecycle.state).toBe('disposed')
    expect(lifecycle.lastFailure).toBeNull()
    expect(callbacks.onSuppressedError).toHaveBeenCalledExactlyOnceWith({
      error,
      phase: 'on-lost',
      stale: true,
      capturedVersion: 1,
      currentVersion: 2
    })
  })

  /** 失败通知的异常不能覆盖更早的恢复错误，也不能复活已 dispose 的对象。 */
  it('onRestoreFailed 中 dispose 后抛出的通知错误作为过期诊断报告', () => {
    const canvas = new EventTarget()
    const callbacks = createCallbacks()
    const restoreError = new Error('restore')
    const notificationError = new Error('obsolete notification')
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)

    callbacks.restore.mockImplementation(() => {
      throw restoreError
    })
    callbacks.onRestoreFailed.mockImplementation(() => {
      lifecycle.dispose()
      throw notificationError
    })

    lose(canvas)
    expect(() => restore(canvas)).not.toThrow()

    expect(lifecycle.state).toBe('disposed')
    expect(lifecycle.lastFailure).toEqual({ phase: 'restore', error: restoreError })
    expect(callbacks.onSuppressedError).toHaveBeenCalledExactlyOnceWith({
      error: notificationError,
      phase: 'on-restore-failed',
      stale: true,
      capturedVersion: 2,
      currentVersion: 3
    })
  })

  /** 监控实现违反非抛出约定时，生命周期仍必须保持隔离边界。 */
  it('onSuppressedError 自身抛错时不逃出 listener', () => {
    const canvas = new SynchronousEventTarget()
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)

    callbacks.restore.mockImplementation(() => {
      lifecycle.dispose()
      throw new Error('obsolete restore')
    })
    callbacks.onSuppressedError.mockImplementation(() => {
      throw new Error('diagnostic failure')
    })

    lose(canvas)
    expect(() => restore(canvas)).not.toThrow()
    expect(lifecycle.state).toBe('disposed')
    expect(callbacks.onSuppressedError).toHaveBeenCalledTimes(1)
  })

  it('dispose 只移除一次两个 listener，后续事件不再调用业务逻辑', () => {
    const canvas = new EventTarget()
    const remove = vi.spyOn(canvas, 'removeEventListener')
    const callbacks = createCallbacks()
    const lifecycle = new WebGLContextLifecycle(canvas, callbacks)
    lifecycle.dispose()
    lifecycle.dispose()
    expect(remove.mock.calls.map(([type]) => type)).toEqual([
      'webglcontextlost',
      'webglcontextrestored'
    ])
    lose(canvas)
    restore(canvas)
    expect(callbacks.onLost).not.toHaveBeenCalled()
    expect(callbacks.restore).not.toHaveBeenCalled()
    expect(lifecycle.isReady).toBe(false)
  })
})
