import { describe, expect, it } from 'vitest'

import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import type { HW2SceneFactory, SceneHost } from '@/scenes/games202/hw2/HW2SceneController'
import { loadHW2Scene, type MountHW2GUI } from '@/scenes/games202/hw2/loadHW2Scene'

/** 手动控制 I/O；不用 setTimeout 猜测网络完成顺序。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void

  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })

  return { promise, resolve, reject }
}

/** 工厂输出真实 CPU 场景，不用伪造的 disposed 字段替代生命周期。 */
function candidate() {
  return {
    scene: new Scene(),
    camera: new PerspectiveCamera({
      fovY: Math.PI / 3,
      aspect: 1,
      near: 0.1,
      far: 100
    })
  }
}

/**
 * 模拟 Engine 的同步交接边界，保留提交前/提交后的所有权语义。
 *
 * 故障注入只模拟 GPU 退出失败，不替代被测 Controller。
 */
function fixture(factory: HW2SceneFactory) {
  let current: Scene | null = null
  let select!: (label: string) => Promise<void>
  let labels: readonly string[] = []
  let initialLabel = ''
  let unmounts = 0
  let clears = 0
  let failClear = false
  let failUnmount = false

  const cleanupError = new Error('cleanup failed')

  const host: SceneHost = {
    setScene({ scene }) {
      const old = current
      current = scene
      old?.dispose()
    },

    clearScene() {
      clears++

      if (failClear) throw cleanupError

      const old = current
      current = null
      old?.dispose()
    }
  }

  const mount: MountHW2GUI = (options) => {
    select = options.onSelect
    labels = options.labels
    initialLabel = options.initialLabel

    return () => {
      unmounts++
      if (failUnmount) throw cleanupError
    }
  }

  const session = loadHW2Scene(host, mount, factory)

  return {
    session,
    select: (label: string) => select(label),

    get current() {
      return current
    },

    get labels() {
      return labels
    },

    get initialLabel() {
      return initialLabel
    },

    get unmounts() {
      return unmounts
    },

    get clears() {
      return clears
    },

    set failClear(value: boolean) {
      failClear = value
    },

    set failUnmount(value: boolean) {
      failUnmount = value
    },

    cleanupError
  }
}

describe('HW2 entry session', () => {
  /** 防止入口仍默认使用 Bunny，或 GUI 列表遗漏环境/transport 组合。 */
  it('安装默认 CornellBox Mary，并向 GUI 提供十二个唯一预设', async () => {
    const requests: string[] = []
    const next = candidate()

    const f = fixture(async (preset) => {
      requests.push(preset.label)
      return next
    })

    await f.session.ready

    expect(requests).toEqual(['CornellBox / Mary / Shadowed'])
    expect(f.initialLabel).toBe('CornellBox / Mary / Shadowed')
    expect(f.labels).toHaveLength(12)
    expect(new Set(f.labels).size).toBe(12)
    expect(f.labels.every((label) => label.includes(' / Mary / '))).toBe(true)
    expect(f.current).toBe(next.scene)

    f.session.dispose()

    expect(next.scene.disposed).toBe(true)
  })

  /**
   * [DESIGN-WEIGHT:3][hw2-entry-early-dispose]
   *
   * 删除“立即返回会话”能力后，加载未完成时就无法取消。
   */
  it('ready 尚未完成也能关闭，迟到场景只释放而不安装', async () => {
    const pending = deferred<ReturnType<typeof candidate>>()
    let signal!: AbortSignal

    const f = fixture((_preset, receivedSignal) => {
      signal = receivedSignal
      return pending.promise
    })

    f.session.dispose()

    expect(signal.aborted).toBe(true)
    expect(f.unmounts).toBe(1)

    const late = candidate()
    pending.resolve(late)
    await f.session.ready

    expect(late.scene.disposed).toBe(true)
    expect(f.current).toBe(null)

    await f.select('Indoor / Mary / Shadowed')
    f.session.dispose()

    expect(f.clears).toBe(1)
  })

  /** 第一次 preset 迟到不能覆盖第二次结果；测试真实 Controller 的协作。 */
  it('快速选择只安装最新场景', async () => {
    const initial = candidate()
    const slow = deferred<ReturnType<typeof candidate>>()
    const latest = candidate()

    const f = fixture(async (preset) => {
      if (preset.label === 'Indoor / Mary / Shadowed') return slow.promise
      if (preset.label === 'Skybox / Mary / Shadowed') return latest
      return initial
    })

    await f.session.ready

    const first = f.select('Indoor / Mary / Shadowed')
    await f.select('Skybox / Mary / Shadowed')

    const stale = candidate()
    slow.resolve(stale)
    await first

    expect(f.current).toBe(latest.scene)
    expect(initial.scene.disposed).toBe(true)
    expect(stale.scene.disposed).toBe(true)

    f.session.dispose()
  })

  /** 加载失败不是“清掉正在显示的场景”的理由。 */
  it('新 preset 失败保留旧场景，未知标签也不会触发工厂', async () => {
    const next = candidate()
    const error = new Error('network failed')
    let calls = 0

    const f = fixture(async () => {
      if (++calls > 1) throw error
      return next
    })

    await f.session.ready

    await expect(f.select('Indoor / Mary / Shadowed')).rejects.toBe(error)
    await expect(f.select('not-a-preset')).rejects.toBeInstanceOf(RangeError)

    expect(calls).toBe(2)
    expect(f.current).toBe(next.scene)
    expect(next.scene.disposed).toBe(false)

    f.session.dispose()
  })

  /** 初次加载失败仍保有退出句柄，不在拒绝 Promise 时遗失 GUI。 */
  it('ready 拒绝后仍能关闭会话', async () => {
    const error = new Error('initial load failed')

    const f = fixture(async () => {
      throw error
    })

    await expect(f.session.ready).rejects.toBe(error)

    f.session.dispose()

    expect(f.unmounts).toBe(1)
    expect(f.clears).toBe(1)
  })

  /**
   * [DESIGN-WEIGHT:3][hw2-entry-cleanup-retry]
   *
   * Controller 已终止后再次 dispose 是 no-op；
   * 必须直接重试 host.clearScene。
   */
  it('GPU 退出失败仍卸载 GUI，下一次 dispose 重试退出', async () => {
    const f = fixture(async () => candidate())
    await f.session.ready

    f.failClear = true

    expect(() => f.session.dispose()).toThrow(f.cleanupError)
    expect(f.unmounts).toBe(1)

    f.failClear = false

    f.session.dispose()
    f.session.dispose()

    expect(f.clears).toBe(2)
    expect(f.unmounts).toBe(1)
    expect(f.current).toBe(null)
  })

  /** 两项独立清理都要尝试；全部错误必须保留下来。 */
  it('同时保留 host 和 GUI 清理失败，成功部分不重复执行', async () => {
    const f = fixture(async () => candidate())
    await f.session.ready

    f.failClear = true
    f.failUnmount = true

    expect(() => f.session.dispose()).toThrow(AggregateError)

    f.failClear = false
    f.failUnmount = false

    f.session.dispose()
    f.session.dispose()

    expect(f.clears).toBe(2)
    expect(f.unmounts).toBe(2)
  })
})
