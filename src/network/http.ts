import { NetworkTimeoutError } from '@/errors/EngineError/NetworkError/NetworkTimeoutError'
import { FetchOptions } from './types/fetch-options'
import { NetworkError } from '@/errors/EngineError/NetworkError/BaseError'

/**
 * 发一次请求，并在同一个范围里把响应读完。
 *
 * - 调用者取消：抛出调用者写在 abort(原因) 里的那个原因；
 * - 超时：抛出 NetworkTimeoutError，只计算到响应头到达为止；
 * - 连不上、传输中断：抛出 NetworkError；
 * - read 里抛出的错误（比如 HttpError）：原样抛出。
 *
 * 浏览器基线 2022：用到 AbortSignal.throwIfAborted 和 abort(reason)，
 * Chrome 100、Firefox 97、Safari 15.4 起支持。
 *
 * @param url - 请求地址，也用于生成错误信息。
 * @param options - 交给 fetch 的选项，外加 timeout（毫秒，默认 6000）；signal 是调用者的取消开关。
 * @param read - 拿到响应以后怎样读正文（读成文本、二进制……）。读正文发生在本函数里面，
 *   所以停计时器、摘监听这些收拾工作会等正文读完再做。
 * @returns read 交回的结果。
 *
 * @example
 * ```ts
 * const text = await fetchWithTimeout(url, { signal }, async (response) => {
 *   if (!response.ok) throw new HttpError(url, response.status, response.statusText)
 *   return await response.text()
 * })
 * ```
 *
 * @remarks
 * [DESIGN-WEIGHT:3][fetch-cleanup-after-body]
 *
 * 为什么要有 read 参数，而不是直接把 Response 交回去：收拾（停计时器、摘掉挂在调用者
 * signal 上的监听）必须等到正文读完。早一步收拾，读正文期间的取消就传不进来了。
 *
 * 知识点：
 * 1. fetch 分两步完成。`await fetch(...)` 在响应头到达时就交回 Response，正文还在路上；
 *    `response.text()` 才去读正文，是另一段异步等待。正文大的时候，第二段远比第一段长。
 * 2. 读正文期间 fetch 的 signal 被 abort，正在进行的 `text()` 会以 signal 的原因失败。
 *    所以从发出请求到正文读完，转发监听都必须挂在调用者的 signal 上。
 * 3. finally 在 try 里的 return 完成时执行。try 里 return 的是 Response 的话，
 *    finally 就在响应头到达的那一刻执行，这时正文还没开始读。
 * 4. 监听用完要摘：调用者的 signal 可能活得很久（比如一个场景会话里的多次请求共用一个），
 *    不摘的话，每次请求都留下一个监听，并通过闭包抓着这次请求的 controller。
 * 5. 计时器用完要停：否则请求早已成功，到点还会去 abort 一个已经没人用的 controller。
 *
 * 反例（教学用，不要这样写）：知道要收拾，但收拾得太早。
 *
 * ```ts
 * async function fetchWithTimeout(url: string, options: FetchOptions): Promise<Response> {
 *   const { timeout = 6000, signal: callerSignal, ...fetchOptions } = options
 *   callerSignal?.throwIfAborted()
 *   const controller = new AbortController()
 *   const timerId = setTimeout(() => {
 *     controller.abort(new NetworkTimeoutError(url, timeout))
 *   }, timeout)
 *   const forwardAbort = (): void => controller.abort(callerSignal?.reason)
 *   callerSignal?.addEventListener('abort', forwardAbort, { once: true })
 *   try {
 *     // 响应头一到，这里就 return 了
 *     return await fetch(url, { ...fetchOptions, signal: controller.signal })
 *   } catch (error) {
 *     if (controller.signal.aborted) throw controller.signal.reason
 *     if (error instanceof TypeError) {
 *       throw new NetworkError(url, `Network error: ${error.message}`, { cause: error })
 *     }
 *     throw error
 *   } finally {
 *     // 时机错了：这里在响应头到达时就执行，正文还没读
 *     clearTimeout(timerId)
 *     callerSignal?.removeEventListener('abort', forwardAbort)
 *   }
 * }
 *
 * async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
 *   const response = await fetchWithTimeout(url, options)
 *   // 读正文时，上面的 finally 早就执行完了：转发监听已经摘掉，调用者再取消也传不进来
 *   return await response.text()
 * }
 * ```
 *
 * 实测（Node 24 的真实 fetch，本地服务器 50 ms 回响应头、900 ms 传完正文，调用者在 200 ms 取消）：
 *
 * ```text
 *   67 ms  反例的 finally 执行：停计时器、摘监听
 *   67 ms  fetchWithTimeout 交回 Response，开始 response.text()
 *  206 ms  调用者 abort(new Error('用户切换了场景'))     ← 已经没有监听接收它
 *  918 ms  反例成功返回完整正文                          ← 取消被悄悄吞掉，没有任何报错
 * ```
 *
 * 同样的场景，本函数在 200 ms 左右停下，抛出的就是调用者传的那个 Error 对象。
 *
 * 本函数的写法：把读正文放进 read，在 try 里 await 它。finally 要等 read 结束才执行，
 * 所以读正文期间转发监听一直挂着；收拾仍然只写在 finally 一处，成功、失败、取消都会经过。
 *
 * 顺带的设计决定：响应头一到就 clearTimeout。超时只管「服务器多久开始回应」，
 * 不管正文要传多久，免得几十 MB 的文件在慢网络上被误杀。代价是响应头之后卡住的正文没有超时，
 * 只能靠调用者取消；需要的话，以后再加「多久没有收到新数据」的空闲超时。
 *
 * 详细讲解见 `docs/fetch-with-timeout.zh-CN.md`。
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: FetchOptions,
  read: (response: Response) => Promise<T>
): Promise<T> {
  // 取出超时时间和调用者的 signal；剩下的 method、headers 等原样交给 fetch
  const { timeout = 6000, signal: callerSignal, ...fetchOptions } = options

  // 调用之前就取消了：abort 事件已经发生过，后面挂的监听等不到它，所以进门先查
  callerSignal?.throwIfAborted()

  // fetch 只认一个 signal，而「该停了」有两个理由：调用者取消、超时。
  // 调用者的 signal 我们按不了，所以自己建一个开关，两个理由都来按它，按的时候把原因写在上面
  const controller = new AbortController()

  // 理由一：超时。到点就按开关，原因写成超时错误
  const timerId = setTimeout(() => {
    controller.abort(new NetworkTimeoutError(url, timeout))
  }, timeout)

  // 理由二：调用者取消。调用者的 signal 一亮就按开关，原因照抄调用者的。
  // 存成常量，是为了在 finally 里用同一个函数对象摘掉这个监听
  const forwardAbort = (): void => controller.abort(callerSignal?.reason)
  callerSignal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
    // 响应头到了：超时只管「服务器多久开始回应」，不管正文要传多久
    clearTimeout(timerId)
    // 在 try 里面读正文：读的期间转发监听还挂着，调用者取消照样有效
    return await read(response)
  } catch (error) {
    // 开关被按过：是有人要停，不是出错。以开关上写的原因为准
    if (controller.signal.aborted) throw controller.signal.reason
    // 连不上或传输中断：浏览器给 TypeError，换成项目的 NetworkError
    if (error instanceof TypeError) {
      throw new NetworkError(url, `Network error: ${error.message}`, { cause: error })
    }
    // read 里抛出的错误（比如 HttpError）：原样抛出
    throw error
  } finally {
    // 整件事结束了（正文已读完，或已经失败）：停掉计时器，摘掉挂在调用者 signal 上的监听
    clearTimeout(timerId)
    callerSignal?.removeEventListener('abort', forwardAbort)
  }
}
