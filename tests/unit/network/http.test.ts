import { afterEach, describe, expect, it, vi } from 'vitest'

import { NetworkTimeoutError } from '@/errors/EngineError/NetworkError/NetworkTimeoutError'
import { fetchWithTimeout } from '@/network/http'

/**
 * 假 fetch：headersMs 后交回响应头，bodyMs 时正文传完。
 *
 * 取消的行为和真实 fetch 一致：响应头到达之前取消，fetch 以 signal 的原因 reject；
 * 读正文期间取消，正文流以 signal 的原因出错，正在进行的 text() 随之失败。
 */
function stubFetch(timing: { headersMs: number; bodyMs: number }): ReturnType<typeof vi.fn> {
  const fake = vi.fn((_url: string, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal ?? undefined

    return new Promise<Response>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason)
        return
      }

      const headersTimer = setTimeout(() => {
        const body = new ReadableStream<Uint8Array>({
          start(stream) {
            const bodyTimer = setTimeout(() => {
              stream.enqueue(new TextEncoder().encode('完整正文'))
              stream.close()
            }, timing.bodyMs - timing.headersMs)

            signal?.addEventListener(
              'abort',
              () => {
                clearTimeout(bodyTimer)
                stream.error(signal.reason)
              },
              { once: true }
            )
          }
        })

        resolve(new Response(body, { headers: { 'content-type': 'text/plain' } }))
      }, timing.headersMs)

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(headersTimer)
          reject(signal.reason)
        },
        { once: true }
      )
    })
  })

  vi.stubGlobal('fetch', fake)
  return fake
}

const readText = (response: Response): Promise<string> => response.text()

/**
 * @remarks
 * [DESIGN-WEIGHT:3][fetch-cleanup-after-body]
 *
 * 这些测试守的是「收拾要等正文读完」。把读正文挪到 fetchWithTimeout 外面、
 * 让它直接交回 Response（http.ts 注释里的反例），第一条测试就会失败：正文照常读完，取消被吞掉。
 */
describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('读正文期间取消：抛出调用者传的原因对象，不再等正文读完', async () => {
    stubFetch({ headersMs: 10, bodyMs: 300 })
    const controller = new AbortController()
    const reason = new Error('用户切换了场景')
    setTimeout(() => controller.abort(reason), 50)

    const started = performance.now()
    await expect(fetchWithTimeout('/slow', { signal: controller.signal }, readText)).rejects.toBe(
      reason
    )
    expect(performance.now() - started).toBeLessThan(250)
  })

  it('超时只计算到响应头：正文传得比 timeout 久，也能读完', async () => {
    stubFetch({ headersMs: 10, bodyMs: 150 })

    await expect(fetchWithTimeout('/slow', { timeout: 50 }, readText)).resolves.toBe('完整正文')
  })

  it('响应头迟迟不到：抛出 NetworkTimeoutError', async () => {
    stubFetch({ headersMs: 200, bodyMs: 210 })

    await expect(fetchWithTimeout('/slow', { timeout: 50 }, readText)).rejects.toBeInstanceOf(
      NetworkTimeoutError
    )
  })

  it('正常结束后，摘掉挂在调用者 signal 上的同一个监听', async () => {
    stubFetch({ headersMs: 5, bodyMs: 10 })
    const signal = new AbortController().signal
    const add = vi.spyOn(signal, 'addEventListener')
    const remove = vi.spyOn(signal, 'removeEventListener')

    await expect(fetchWithTimeout('/fast', { signal }, readText)).resolves.toBe('完整正文')

    expect(add).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0]![1])
  })

  it('调用之前就取消了：不发请求，直接抛出原因', async () => {
    const fake = stubFetch({ headersMs: 5, bodyMs: 10 })
    const controller = new AbortController()
    const reason = new Error('早就取消了')
    controller.abort(reason)

    await expect(fetchWithTimeout('/fast', { signal: controller.signal }, readText)).rejects.toBe(
      reason
    )
    expect(fake).not.toHaveBeenCalled()
  })
})
