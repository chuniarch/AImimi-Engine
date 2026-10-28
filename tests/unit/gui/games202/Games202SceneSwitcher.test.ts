import { describe, expect, it } from 'vitest'

import { Games202SceneSwitcher } from '@/gui/games202/Games202SceneSwitcher'
import type { SceneDisposer } from '@/scenes/types/SceneDisposer'

/** 用显式完成信号安排并发，不依赖执行速度或定时器。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void

  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })

  return { promise, resolve, reject }
}

describe('Games202 scene handoff', () => {
  /**
   * [DESIGN-WEIGHT:3][games202-serialized-handoff]
   *
   * 旧 loader 不认识 AbortSignal；
   * 前一个未交还资源前，不能启动另一个。
   */
  it('等待旧 loader，丢弃过期排队选择，再进入最新作业', async () => {
    const loading = deferred<SceneDisposer>()
    const started = deferred<void>()
    const events: string[] = []

    const switcher = new Games202SceneSwitcher(
      async (name) => {
        events.push('load ' + name)

        if (name === 'HW1') {
          started.resolve()
          return loading.promise
        }

        return () => {
          events.push('dispose ' + name)
        }
      },
      () => {
        events.push('barrier')
      }
    )

    const first = switcher.switchTo('HW1')
    await started.promise

    const second = switcher.switchTo('HW2')
    const third = switcher.switchTo('HW3')

    expect(events).toEqual(['barrier', 'load HW1'])

    loading.resolve(() => {
      events.push('dispose HW1')
    })

    await Promise.all([first, second, third])

    expect(events).toEqual(['barrier', 'load HW1', 'dispose HW1', 'barrier', 'load HW3'])

    await switcher.dispose()
  })

  /** 退出失败时保留句柄；删除保护会让两种 Renderer 同时使用 context。 */
  it('退出失败阻止下一个 loader，并允许显式再次选择重试', async () => {
    const events: string[] = []
    const cleanupError = new Error('device still closing')
    let fail = true

    const switcher = new Games202SceneSwitcher(
      async (name) => {
        events.push('load ' + name)

        return () => {
          events.push('dispose ' + name)

          if (name === 'HW2' && fail) {
            throw cleanupError
          }
        }
      },
      () => {
        events.push('barrier')
      }
    )

    await switcher.switchTo('HW2')
    await expect(switcher.switchTo('HW1')).rejects.toBe(cleanupError)

    expect(events).toEqual(['barrier', 'load HW2', 'dispose HW2'])

    fail = false
    await switcher.switchTo('HW1')

    expect(events).toEqual([
      'barrier',
      'load HW2',
      'dispose HW2',
      'dispose HW2',
      'barrier',
      'load HW1'
    ])

    await switcher.dispose()
  })

  /** context gate 抛错后，不允许继续启动写 GPU 的 loader。 */
  it('前置屏障失败时不启动 loader', async () => {
    const error = new Error('context unavailable')
    let loads = 0

    const switcher = new Games202SceneSwitcher(
      async () => {
        loads++
        return () => undefined
      },
      () => {
        throw error
      }
    )

    await expect(switcher.switchTo('HW2')).rejects.toBe(error)

    expect(loads).toBe(0)

    await switcher.dispose()
  })

  /** 根会话关闭期间，旧异步 loader 迟到的 disposer 也不能遗失。 */
  it('关闭会等待旧 loader 交还清理句柄，并拒绝新请求', async () => {
    const loading = deferred<SceneDisposer>()
    const started = deferred<void>()
    let disposed = 0

    const switcher = new Games202SceneSwitcher(
      async () => {
        started.resolve()
        return loading.promise
      },
      () => undefined
    )

    const request = switcher.switchTo('HW1')
    await started.promise

    const closing = switcher.dispose()

    loading.resolve(() => {
      disposed++
    })

    await request
    await closing
    await switcher.dispose()

    expect(disposed).toBe(1)

    await expect(switcher.switchTo('HW2')).rejects.toThrow()
  })

  /**
   * 旧 loader 失败时可能留下未知 GPU 半成品。
   *
   * 不能把 Promise 队列恢复等同于“GPU 状态恢复”，
   * 必须阻止后续加载。
   */
  it('loader 拒绝后锁定入口，不自动回退到另一个作业', async () => {
    const error = new Error('legacy partial construction failed')
    let loads = 0

    const switcher = new Games202SceneSwitcher(
      async () => {
        loads++
        throw error
      },
      () => undefined
    )

    await expect(switcher.switchTo('HW1')).rejects.toBe(error)
    await expect(switcher.switchTo('HW3')).rejects.toThrow()

    expect(loads).toBe(1)

    await switcher.dispose()
  })

  /** 清理回调同步提出新选择时，旧任务不得继续加载。 */
  it('清理回调重入的新请求覆盖尚未开始的选择', async () => {
    const loaded: string[] = []
    let nested: Promise<void> | undefined

    const switcher = new Games202SceneSwitcher(
      async (name) => {
        loaded.push(name)

        return () => {
          if (name === 'HW1') {
            nested = switcher.switchTo('HW3')
          }
        }
      },
      () => undefined
    )

    await switcher.switchTo('HW1')
    await switcher.switchTo('HW2')
    await nested

    expect(loaded).toEqual(['HW1', 'HW3'])

    await switcher.dispose()
  })
})
