import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { InvalidCubeTextureError } from '@/rendering/core/errors'
import { assertValidCubeFaceDimensions } from '@/rendering/resources/assertValidCubeFaceDimensions'
import type { CubeFaces } from '@/rendering/resources/CubeTexture'

/** 与当前资源加载策略保持一致；这是请求等待上限，不是 GPU 上传超时。 */
const IMAGE_TIMEOUT_MS = 6000

/**
 * 加载一张图片，并在成功、失败、取消、超时四条出口解除全部监听。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-image-load-cancellation]
 *
 * 成功后保留 src，供 CubeTexture 使用。
 * 失败或取消时移除 src，尽力终止图片请求；这不保证浏览器已经发出的网络包被撤回。
 * settled 防止 load/error/abort/timeout 的竞争造成二次清理或二次交付。
 */
async function loadFace(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()

    const image = new Image()
    let settled = false

    /** 只解除本次加载登记的回调，不改变成功图片的像素来源。 */
    function cleanup(): void {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', handleAbort)
      clearTimeout(timer)
    }

    /** 失败时不把不完整图片交给调用者；保留原取消原因或领域错误。 */
    function fail(error: unknown): void {
      if (settled) return
      settled = true
      cleanup()
      image.removeAttribute('src')
      reject(error)
    }

    /** AbortSignal.reason 可以不是 Error；这里原样传递。 */
    function handleAbort(): void {
      fail(signal.reason)
    }

    image.onload = () => {
      if (settled) return
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        fail(new ResourceLoadError('image', url, { reason: 'image has no decoded pixels' }))
        return
      }

      settled = true
      cleanup()
      resolve(image)
    }

    image.onerror = () => {
      fail(new ResourceLoadError('image', url, { reason: 'image loading failed' }))
    }

    // 先建立计时器，再登记取消监听和启动请求，保证所有 cleanup 出口均能访问 timer。
    const timer = setTimeout(() => {
      fail(new ResourceLoadError('image', url, { reason: 'image loading timed out' }))
    }, IMAGE_TIMEOUT_MS)

    signal.addEventListener('abort', handleAbort, { once: true })

    try {
      // 跨域图片必须由服务端允许 CORS；不能把被污染的图片留到 texImage2D 才发现。
      image.crossOrigin = 'anonymous'
      image.src = url
    } catch (error) {
      fail(error)
    }
  })
}

/**
 * 并发加载一个 HW2 cubemap 的六张图片。
 *
 * @param urls - 固定顺序 +X、-X、+Y、-Y、+Z、-Z，不按完成顺序排列。
 * @param signal - 本次场景构建的取消信号。
 * @returns 冻结的六面容器；图片对象未冻结，交付后由资源持有引用。
 * @throws ResourceLoadError 图片失败、超时或没有可用像素。
 * @throws InvalidCubeTextureError URL 列表或六面尺寸无效。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-image-load-cancellation]
 *
 * 本地 AbortController 管理六个子请求。一面失败会取消其余 pending 请求，
 * 但不会反向取消调用者的 signal。finally 解除父 signal 的监听。
 *
 * Promise.all 保留输入顺序。它自己不会取消其余 Promise，因此 catch 中的
 * controller.abort(error) 不能省略。
 *
 * 只检查通用 cubemap 尺寸；NPOT、格式扩展等 WebGL1 能力由 Manager 检查。
 * 成功之后不再响应旧 signal，避免误清空已经交付给 Scene 的图片。
 */
export async function loadHW2CubeImages(
  urls: CubeFaces<string>,
  signal: AbortSignal
): Promise<CubeFaces<HTMLImageElement>> {
  signal.throwIfAborted()

  const rawUrls: unknown = urls
  if (!Array.isArray(rawUrls) || rawUrls.length !== 6) {
    throw new InvalidCubeTextureError(
      'HW2 environment',
      'exactly six non-empty image URLs are required'
    )
  }

  for (const url of urls) {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new InvalidCubeTextureError('HW2 environment', 'each image URL must be non-empty text')
    }
  }

  const controller = new AbortController()
  const forwardAbort = (): void => controller.abort(signal.reason)
  signal.addEventListener('abort', forwardAbort, { once: true })

  try {
    const faces = await Promise.all([
      loadFace(urls[0], controller.signal),
      loadFace(urls[1], controller.signal),
      loadFace(urls[2], controller.signal),
      loadFace(urls[3], controller.signal),
      loadFace(urls[4], controller.signal),
      loadFace(urls[5], controller.signal)
    ])

    signal.throwIfAborted()

    /** 读取实际像素尺寸，不使用可能被 CSS 或 width 属性修改过的显示尺寸。 */
    const dimensions = (image: HTMLImageElement) => ({
      width: image.naturalWidth,
      height: image.naturalHeight
    })

    assertValidCubeFaceDimensions(
      [
        dimensions(faces[0]),
        dimensions(faces[1]),
        dimensions(faces[2]),
        dimensions(faces[3]),
        dimensions(faces[4]),
        dimensions(faces[5])
      ],
      (reason, details) => new InvalidCubeTextureError('HW2 environment', reason, details)
    )

    return Object.freeze(faces)
  } catch (error) {
    controller.abort(error)
    throw error
  } finally {
    signal.removeEventListener('abort', forwardAbort)
  }
}
