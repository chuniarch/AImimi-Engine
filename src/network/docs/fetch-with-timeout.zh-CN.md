# fetchWithTimeout：超时、取消，以及什么时候收拾

对应源码：`../http.ts`、`../fetchText.ts`。回归测试：`tests/unit/network/http.test.ts`（主题标记 `[fetch-cleanup-after-body]`）。

## 要解决的问题

HW2 切换 preset 时，上一次加载还在下载 OBJ 和 PRT 文本。Controller 会取消它（`abort(原因)`），新的加载才开始。所以下载文本的函数要做到四件事：

1. 调用者取消时停下来，并且抛出调用者写的那个原因，不要换成别的错误。
2. 服务器迟迟不回应时，按超时失败。
3. 连不上、传到一半断了，抛出项目自己的 `NetworkError`。
4. 不管怎样结束，都不在调用者的 signal 上留下监听，不留下还在跑的计时器。

难点在第 4 条的「什么时候」。

## 先弄清 fetch 的两步

HTTP 响应是一串字节：先是状态行和响应头，空一行，然后是正文。浏览器收到响应头就把 `Response` 交给你，正文还在路上：

```ts
const response = await fetch(url) // 第一步：等到响应头，就返回
const text = await response.text() // 第二步：等正文全部到达
```

本地实测：服务器 50 ms 回响应头，900 ms 传完正文。第一个 `await` 在约 50 ms 结束，第二个在约 900 ms 结束。正文越大、网越慢，第二步越长。

两步都会被 signal 打断：响应头到达前取消，`fetch` 以 signal 的原因 reject；读正文期间取消，正在进行的 `text()` 以 signal 的原因失败。

## 一个开关，两个理由

`fetch` 只收一个 signal，而「该停了」有两个理由：调用者取消、超时。调用者的 signal 我们按不了，所以自己建一个开关，两个理由都去按它：

```ts
const controller = new AbortController() // 自己的开关，交给 fetch

// 理由一：超时。到点按开关，原因写成超时错误
const timerId = setTimeout(() => {
  controller.abort(new NetworkTimeoutError(url, timeout))
}, timeout)

// 理由二：调用者取消。原因照抄调用者的
const forwardAbort = (): void => controller.abort(callerSignal?.reason)
callerSignal?.addEventListener('abort', forwardAbort, { once: true })
```

- `{ once: true }`：监听执行一次后自动摘掉。
- `forwardAbort` 存成常量：`removeEventListener` 必须拿到挂上去的同一个函数对象，才摘得掉。
- 进门先 `callerSignal?.throwIfAborted()`：如果调用前就取消了，abort 事件已经发生过，后挂的监听永远等不到它。

## 收拾：难的是时机

要收拾的有两样：计时器，和挂在调用者 signal 上的 `forwardAbort`。写在 `finally` 里最自然，成功、失败都会经过它。问题是 `finally` 在什么时候执行。

### 反例：知道要收拾，但收拾得太早

```ts
// 反例：fetchWithTimeout 交回 Response，读正文在外面
async function fetchWithTimeout(url: string, options: FetchOptions): Promise<Response> {
  // ……开关、计时器、转发监听，和上面一样……
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal }) // 响应头一到就 return
  } finally {
    clearTimeout(timerId) // 时机错了：这时正文还没读
    callerSignal?.removeEventListener('abort', forwardAbort)
  }
}

async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const response = await fetchWithTimeout(url, options)
  return await response.text() // 读正文时，监听早就摘了
}
```

用 Node 24 的真实 fetch 跑一遍：服务器 50 ms 回响应头、900 ms 传完正文，调用者在 200 ms 取消。

```text
  67 ms  反例的 finally 执行：停计时器、摘监听
  67 ms  fetchWithTimeout 交回 Response，开始 response.text()
 206 ms  调用者 abort(new Error('用户切换了场景'))     ← 已经没有监听接收它
 918 ms  反例成功返回完整正文                          ← 取消被悄悄吞掉，没有任何报错
```

取消没有报错，也没有生效。放到 HW2 里，就是用户已经切到 Skybox，上一个 preset 的文件还在照常下载、解析。

### 正确的写法：把读正文搬进来

让调用者用一个 `read` 函数告诉我们「拿到响应以后怎么读」，读正文就发生在 `try` 里面，`finally` 会等它读完：

```ts
export async function fetchWithTimeout<T>(
  url: string,
  options: FetchOptions,
  read: (response: Response) => Promise<T> // 新增：怎么读正文，由调用者决定
): Promise<T> {
  // ……开关、计时器、转发监听……
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
    clearTimeout(timerId) // 响应头到了，停掉计时器（设计决定，见下一节）
    return await read(response) // 在 try 里读：读的期间转发监听还挂着
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason // 有人要停：以开关上写的原因为准
    if (error instanceof TypeError) {
      throw new NetworkError(url, `Network error: ${error.message}`, { cause: error })
    }
    throw error // read 自己抛的错误（比如 HttpError），原样抛出
  } finally {
    clearTimeout(timerId) // 没等到响应头就失败时，计时器还在跑
    callerSignal?.removeEventListener('abort', forwardAbort) // 整件事结束了，才摘监听
  }
}
```

同样的场景，这一版在约 200 ms 停下，抛出的就是调用者传进来的那个 `Error` 对象（`err === reason` 为 `true`）。

`fetchText.ts` 因此不需要自己的 try/catch，只需要提供 `read`：

```ts
return fetchWithTimeout(url, options, async (response) => {
  if (!response.ok) throw new HttpError(url, response.status, response.statusText)
  return await response.text()
})
```

要点：**收拾的时机，要等到「这件事」真正结束。** 对一次请求来说，结束是正文读完，不是响应头到达。返回 `Response` 等于把「读正文」这一半交了出去，收拾就只能提前做。

## 超时只管响应头

`fetch` 一返回就 `clearTimeout`，这是一个设计决定：超时只管「服务器多久开始回应」，不管正文要传多久。否则一个几十 MB 的文件在慢网络上会被超时误杀，而服务器明明在正常发送。

代价：响应头之后卡住的正文没有超时，只能靠调用者取消。需要的话，以后加「多久没有收到新数据」的空闲超时，而不是把总时长再限死。

## 错误怎么分

| 发生了什么                 | 抛出什么                                         |
| -------------------------- | ------------------------------------------------ |
| 调用者取消（调用前或途中） | 调用者 `abort(原因)` 里的那个原因，原样抛出      |
| 响应头迟迟不到             | `NetworkTimeoutError`                            |
| 连不上、传到一半断了       | `NetworkError`（`cause` 是浏览器的 `TypeError`） |
| `read` 里抛出的错误        | 原样抛出（比如 `fetchText` 的 `HttpError`）      |

判断「是不是取消」只看 `controller.signal.aborted`，不看 `error.name`：生产构建压缩代码后，类名可能变成空字符串，按名字判断会失效。

## 浏览器基线：2022

| API                                 | Chrome | Firefox | Safari |
| ----------------------------------- | -----: | ------: | -----: |
| `AbortController`                   |     66 |      57 |   12.1 |
| `abort(reason)`、`signal.reason`    |     98 |      97 |   15.4 |
| `signal.throwIfAborted()`           |    100 |      97 |   15.4 |
| `addEventListener` 的 `once` 选项   |     55 |      50 |     10 |
| `AbortSignal.any()`（本项目没有用） |    116 |     124 |   17.4 |

不用 `AbortSignal.any()`，所以要自己写转发监听，也要自己负责摘掉它。

## 和 axios 对比

axios 把同样的事情包在了库里面，所以平时只写 `axios.get(url, { timeout, signal })`。注意 axios 的 timeout 默认是 0，也就是不超时。本地实测（axios 1.18.1；xhr 适配器在无界面 Chrome 154 里跑，fetch 适配器和本项目在 Node 24 里跑；同一台服务器 50 ms 回响应头、900 ms 传完正文）：

| 场景                            | axios（浏览器默认 xhr 适配器）            | axios（fetch 适配器）                           | 本项目 fetchTextWithTimeout      |
| ------------------------------- | ----------------------------------------- | ----------------------------------------------- | -------------------------------- |
| timeout 500，正文 900 ms 传完   | 505 ms 超时失败                           | 512 ms 超时失败                                 | 约 900 ms 成功                   |
| 200 ms 读正文时取消             | 约 201 ms 停下，`CanceledError: canceled` | 约 202 ms 停下，`CanceledError: 用户切换了场景` | 约 202 ms 停下，抛出原因对象本身 |
| 正常结束后，signal 上剩下的监听 | 0                                         | 0                                               | 0                                |
| 调用前已取消                    | 不发请求                                  | 不发请求                                        | 不发请求                         |

- 收拾的时机，axios 也是等正文读完：xhr 适配器在 `onloadend` 之后摘监听；fetch 适配器在读完正文之后才调用 `unsubscribe`（流式响应则在流结束时调用）。
- 两处不同是有意的取舍：axios 的 timeout 管到正文读完；axios 不把调用者的原因对象原样交回（xhr 适配器只给 `canceled`，fetch 适配器只保留原因的 message）。本项目选择超时只管响应头、取消时原样抛出原因，所以要自己写这些代码。

## 自查清单：写一个可取消的异步函数

1. 进门先检查 signal 是否已经取消。
2. 取消时，以 `signal.reason` 失败，不要自己生成另一个错误。
3. 挂到调用者 signal 上的监听，在整件事结束后摘掉；「结束」以最后一步异步操作为准。
4. 自己启动的计时器、子请求，结束时都要停掉。
5. 写一条测试：在最后一步异步操作进行中取消，断言抛出的是调用者的原因对象，并且没有等到操作完成。

参考：MDN「Implementing an abortable API」（AbortSignal 页面）；MDN Using Fetch；RFC 9112（HTTP/1.1 报文格式）。
