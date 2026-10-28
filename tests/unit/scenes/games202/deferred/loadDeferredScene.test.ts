import { describe, expect, it, vi } from 'vitest'
import {
  createDeferredScene,
  type DeferredSceneBuildResult
} from '@/scenes/games202/deferred/createDeferredScene'
import { loadDeferredScene } from '@/scenes/games202/deferred/loadDeferredScene'

/** Promise 由测试精确推进；不依赖定时器速度模拟取消或迟到 I/O。 */
function pending<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

describe('Deferred entry session', () => {
  /** 成功提交后，session 只能让 host 清场，不能再重复释放候选。 */
  it('提交完整候选，退出只交给 host，并允许 host 清理失败后重试', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    const failure = new Error('host cleanup')
    const host = {
      setScene: vi.fn(),
      clearScene: vi
        .fn()
        .mockImplementationOnce(() => {
          throw failure
        })
        .mockImplementation(() => {
          for (const pass of result.passes) pass.dispose()
          result.scene.dispose()
        })
    }
    const session = loadDeferredScene(host, async () => result)
    await session.ready
    expect(host.setScene).toHaveBeenCalledWith(result)
    expect(session.current).toBe(result)
    expect(() => session.dispose()).toThrow(failure)
    expect(session.current).toBe(null)
    session.dispose()
    session.dispose()
    expect(host.clearScene).toHaveBeenCalledTimes(2)
    expect(result.scene.disposed).toBe(true)
  })

  /** 若 closed 写在 abort 后，abort 同步回调可能装入已经退出的候选。 */
  it('先关闭再取消；忽略 abort 的迟到候选只清理、不安装', async () => {
    const wait = pending<DeferredSceneBuildResult>()
    const host = { setScene: vi.fn(), clearScene: vi.fn() }
    let signal!: AbortSignal
    const session = loadDeferredScene(host, async (value) => {
      signal = value
      return wait.promise
    })
    session.dispose()
    expect(signal.aborted).toBe(true)
    const result = await createDeferredScene(new AbortController().signal)
    wait.resolve(result)
    await session.ready
    expect(host.setScene).not.toHaveBeenCalled()
    expect(result.scene.disposed).toBe(true)
    session.dispose()
    expect(host.clearScene).toHaveBeenCalledOnce()
  })

  /** 候选清理失败不遗失句柄；后续 dispose 只重试失败项，不再执行成功项。 */
  it('安装失败汇总清理错误，显式退出可以补做失败的候选清理', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    const original = result.passes[0]!.dispose.bind(result.passes[0])
    const cleanup = vi
      .spyOn(result.passes[0]!, 'dispose')
      .mockImplementationOnce(() => {
        throw new Error('candidate cleanup')
      })
      .mockImplementation(original)
    const second = vi.spyOn(result.passes[1]!, 'dispose')
    const installation = new Error('install')
    const host = {
      setScene: vi.fn(() => {
        throw installation
      }),
      clearScene: vi.fn()
    }
    const session = loadDeferredScene(host, async () => result)
    await expect(session.ready).rejects.toMatchObject({ cause: installation })
    expect(host.clearScene).not.toHaveBeenCalled()
    session.dispose()
    expect(cleanup).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledOnce()
    expect(result.scene.disposed).toBe(true)
  })

  /** host 的同步安装回调也可能要求退出；返回后不得再次发布 current。 */
  it('setScene 中同步退出不发布已经清理的结果', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    const host = {
      setScene: vi.fn(() => session.dispose()),
      clearScene: vi.fn(() => {
        for (const pass of result.passes) pass.dispose()
        result.scene.dispose()
      })
    }
    const session = loadDeferredScene(host, async () => result)
    await session.ready
    expect(session.current).toBe(null)
    expect(result.scene.disposed).toBe(true)
    expect(host.clearScene).toHaveBeenCalledOnce()
  })

  /** abort 只吞 signal.reason，不能吞取消回滚期间出现的真实故障。 */
  it('正常取消结束，但其他加载或清理失败仍传播', async () => {
    const host = { setScene: vi.fn(), clearScene: vi.fn() }
    const cancelled = loadDeferredScene(host, async (signal) => {
      await Promise.resolve()
      signal.throwIfAborted()
      throw new Error('unreachable')
    })
    cancelled.dispose()
    await expect(cancelled.ready).resolves.toBeUndefined()
    const error = new Error('build failed')
    const failed = loadDeferredScene(host, async () => {
      await Promise.resolve()
      throw error
    })
    failed.dispose()
    await expect(failed.ready).rejects.toBe(error)
  })

  /** 候选回滚也会运行用户 dispose 回调；重入不能再次启动同一项任务。 */
  it('候选清理中的同步退出不会重入同一个 Pass 清理', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    const original = result.passes[0]!.dispose.bind(result.passes[0])
    const cleanup = vi.spyOn(result.passes[0]!, 'dispose').mockImplementationOnce(() => {
      session.dispose()
      original()
    })
    const installation = new Error('install')
    const host = {
      setScene: vi.fn(() => {
        throw installation
      }),
      clearScene: vi.fn()
    }
    const session = loadDeferredScene(host, async () => result)
    await expect(session.ready).rejects.toBe(installation)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(host.clearScene).toHaveBeenCalledOnce()
  })
})
