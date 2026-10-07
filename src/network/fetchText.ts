import { HttpError } from '@/errors/EngineError/NetworkError/HTTPError'
import { fetchWithTimeout } from './http'
import { FetchOptions } from './types/fetch-options'

/**
 * 获取文本内容：检查 HTTP 状态，再读出全文。
 * 取消、超时、网络错误都由 fetchWithTimeout 统一处理，这里不需要 try/catch。
 */
export async function fetchTextWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  return fetchWithTimeout(url, options, async (response) => {
    // 服务器回应了，但给的不是我们要的文件（404 等）：重试没用
    if (!response.ok) {
      throw new HttpError(url, response.status, response.statusText)
    }

    // 开发服务器对不存在的路径常常回 index.html（SPA fallback），状态码却是 200
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      throw new HttpError(
        url,
        404,
        'Expected text file but got HTML (likely SPA fallback — file does not exist)'
      )
    }

    return await response.text()
  })
}
