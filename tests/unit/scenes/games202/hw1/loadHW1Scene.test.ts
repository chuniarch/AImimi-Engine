import { describe, expect, it, vi } from 'vitest'
import type { SceneSetup } from '@/engine/SceneSetup'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { loadHW1Scene } from '@/scenes/games202/hw1/loadHW1Scene'
import type { HW1SceneBuildResult } from '@/scenes/games202/hw1/createHW1Scene'

/** 注入只控制异步构建时序；使用真实 Scene 验证释放，而不是伪造 disposed 字段。 */
function candidate() {
  const scene = new Scene()
  const camera = new PerspectiveCamera({ fovY: 1, aspect: 1, near: 0.1, far: 100 })
  scene.add(camera)
  const dispose = vi.fn()
  const result = {
    scene,
    camera,
    passes: [{ name: 'fixture', execute: () => undefined, dispose }]
  } as unknown as HW1SceneBuildResult
  return { result, dispose }
}

/** ready 的完成由测试明确控制，不用延时模拟网络。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

describe('HW1 entry session', () => {
  /** [DESIGN-WEIGHT:3][hw1-entry-early-dispose] 退出必须先使旧请求失效，再触发 abort 的同步回调。 */
  it('立即交出 dispose，忽略取消的迟到结果只能清理，不能安装', async () => {
    const pending = deferred<HW1SceneBuildResult>()
    const host = { setScene: vi.fn(), clearScene: vi.fn() }
    let signal!: AbortSignal
    const session = loadHW1Scene(host, (input) => {
      signal = input
      return pending.promise
    })
    session.dispose()
    expect(signal.aborted).toBe(true)
    const late = candidate()
    pending.resolve(late.result)
    await session.ready
    expect(host.setScene).not.toHaveBeenCalled()
    expect(late.dispose).toHaveBeenCalledOnce()
    expect(late.result.scene.disposed).toBe(true)
    expect(session.current).toBe(null)
    session.dispose()
    expect(host.clearScene).toHaveBeenCalledOnce()
  })

  /** 提交前失败仍归调用者；次序是借用者 Pass 在前，资源拥有者 Scene 在后。 */
  it('安装失败清理全部候选，不清掉 host 中的旧场景', async () => {
    const next = candidate()
    const failure = new Error('installation failed')
    const host = {
      setScene: vi.fn(() => {
        throw failure
      }),
      clearScene: vi.fn()
    }
    const order: string[] = []
    next.dispose.mockImplementation(() => {
      expect(next.result.scene.disposed).toBe(false)
      order.push('pass')
    })
    const session = loadHW1Scene(host, async () => next.result)
    await expect(session.ready).rejects.toBe(failure)
    expect(order).toEqual(['pass'])
    expect(next.result.scene.disposed).toBe(true)
    expect(host.clearScene).not.toHaveBeenCalled()
    expect(session.current).toBe(null)
  })

  /** 正常返回后 Scene 与 Pass 都归 host，loader 不能再重复释放。 */
  it('成功后把完整 setup 交给 host，退出清理失败可重试', async () => {
    const next = candidate()
    let current: SceneSetup | null = null
    const failure = new Error('GPU cleanup failed')
    const clearScene = vi
      .fn()
      .mockImplementationOnce(() => {
        throw failure
      })
      .mockImplementation(() => {
        for (const pass of current!.passes) pass.dispose()
        current!.scene.dispose()
        current = null
      })
    const host = {
      setScene: vi.fn((setup: SceneSetup) => {
        current = setup
      }),
      clearScene
    }
    const session = loadHW1Scene(host, async () => next.result)
    await session.ready
    expect(host.setScene).toHaveBeenCalledWith(next.result)
    expect(session.current).toBe(next.result)
    expect(next.dispose).not.toHaveBeenCalled()
    expect(() => session.dispose()).toThrow(failure)
    expect(session.current).toBe(null)
    session.dispose()
    session.dispose()
    expect(clearScene).toHaveBeenCalledTimes(2)
    expect(next.dispose).toHaveBeenCalledOnce()
  })

  /** 非取消的加载错误必须可观察；不能在 ready 上吞掉失败并声称加载成功。 */
  it('加载失败传播原错误，取消原因本身正常结束', async () => {
    const error = new Error('missing Mary')
    const host = { setScene: vi.fn(), clearScene: vi.fn() }
    const failed = loadHW1Scene(host, async () => {
      throw error
    })
    await expect(failed.ready).rejects.toBe(error)
    const cancelled = loadHW1Scene(host, async (signal) => {
      await Promise.resolve()
      signal.throwIfAborted()
      return candidate().result
    })
    cancelled.dispose()
    await expect(cancelled.ready).resolves.toBeUndefined()
    expect(host.setScene).not.toHaveBeenCalled()
  })

  /** abort 不是吞错许可：factory 取消回滚时的清理错误仍必须交给根 GUI。 */
  it('取消后仍传播工厂清理失败，不把 AggregateError 当作正常取消', async () => {
    const host = { setScene: vi.fn(), clearScene: vi.fn() }
    const cleanup = new Error('CPU cleanup failed')
    const failure = new AggregateError([cleanup], 'build and cleanup failed')
    const session = loadHW1Scene(host, async () => {
      await Promise.resolve()
      throw failure
    })
    session.dispose()
    await expect(session.ready).rejects.toBe(failure)
    expect(host.setScene).not.toHaveBeenCalled()
  })
})
