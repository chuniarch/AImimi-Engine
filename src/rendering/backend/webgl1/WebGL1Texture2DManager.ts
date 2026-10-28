import {
  InvalidTextureSourceError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import {
  DataTexture2D,
  ImageTexture2D,
  Texture2D,
  type TextureImageSource
} from '@/rendering/resources/Texture2D'
import type { TextureMinFilter, TextureWrapMode } from '@/rendering/resources/Texture'
import type { TexturePixelSource2D } from '@/rendering/resources/texturePixelSnapshot'
import type { WebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
import {
  assertTextureOperation,
  requireTextureLimit,
  withTextureUploadState,
  type WebGL1TextureManagerHooks
} from '@/rendering/backend/webgl1/WebGL1TextureUploadSupport'

/** 仅由所属 context 的 Backend 借用；CPU Texture2D 不保存此 GPU 表示。 */
export interface WebGL1Texture2DResource {
  readonly handle: WebGLTexture
  readonly target: number
}

/** 一个成功上传结果和对应的 CPU 生命周期订阅。 */
interface Entry {
  readonly resource: WebGL1Texture2DResource
  readonly unsubscribe: () => void
}

/** 显式区分 texImage2D 的像素数组重载与浏览器图片重载。 */
type UploadSource =
  | ({ readonly kind: 'data' } & TexturePixelSource2D)
  | {
      readonly kind: 'image'
      readonly image: TextureImageSource
      readonly width: number
      readonly height: number
    }

/**
 * 获取本次上传的来源；图片在上传时重新检查加载状态，而不信任构造时的状态。
 * HTMLImageElement 使用 naturalWidth/naturalHeight，CSS/display 尺寸不参与 GPU 分配。
 */
function readSource(texture: Texture2D): UploadSource {
  if (texture instanceof DataTexture2D) {
    return { kind: 'data', ...texture.copySource() }
  }
  if (!(texture instanceof ImageTexture2D)) {
    throw new UnsupportedRenderFeatureError('texture2D ' + texture.label, 'unknown source class')
  }

  const image = texture.source
  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    if (!image.complete) {
      throw new InvalidTextureSourceError(texture.label, 'image has not finished loading')
    }
    return { kind: 'image', image, width: image.naturalWidth, height: image.naturalHeight }
  }
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    return { kind: 'image', image, width: image.width, height: image.height }
  }
  throw new InvalidTextureSourceError(
    texture.label,
    'expected HTMLImageElement or ImageBitmap in this realm'
  )
}

/**
 * 管理一个 context/generation 的静态二维纹理，不管理 RenderTarget 附件。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
 *
 * get 的顺序是：验证 → 分配/上传 → 恢复外部上传状态 → 订阅并发布缓存。
 * 未成功完成的上传不能成为缓存。非 lost 失败删除本次临时 handle；
 * lost 时只丢弃本代引用，不向丢失的 context 发删除或恢复旧绑定的命令。
 *
 * Map 的 key 是 CPU 对象身份，不是 label。Manager 只拥有 GPU texture，
 * 不 dispose CPU Texture2D、不 close 借用的 ImageBitmap。
 */
export class WebGL1Texture2DManager {
  private readonly entries = new Map<Texture2D, Entry>()
  /** 进入关闭状态后 get 永久拒绝；dispose 仍可重试未完成的删除。 */
  private closing = false
  /** context 恢复时创建新 Manager，不能复活此实例。 */
  private lost = false
  /** undefined 表示尚未查询，null 表示当前 context 不支持。 */
  private srgbExtension: EXT_sRGB | null | undefined

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly capabilities: Pick<WebGL1Capabilities, 'textureFloat' | 'textureFloatLinear'>,
    private readonly hooks: WebGL1TextureManagerHooks
  ) {}

  /** 首次调用完整上传；后续借用相同 GPU 对象，静态来源更新需新建 CPU Texture。 */
  get(texture: Texture2D): WebGL1Texture2DResource {
    this.assertReady()
    texture.assertUsable()
    const cached = this.entries.get(texture)
    if (cached !== undefined) return cached.resource

    const gl = this.gl
    let handle: WebGLTexture | null = null
    try {
      assertTextureOperation(gl, 'begin texture2D upload', texture.label)
      const source = readSource(texture)
      const format = this.validateStorage(texture, source)
      const type = texture.storage.type === 'float32' ? gl.FLOAT : gl.UNSIGNED_BYTE

      withTextureUploadState(gl, gl.TEXTURE_2D, () => {
        handle = requireNonNull(
          gl.createTexture(),
          () => new WebGLResourceCreationError('texture2D', texture.label)
        )
        gl.bindTexture(gl.TEXTURE_2D, handle)
        if (source.kind === 'data') {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            format,
            source.width,
            source.height,
            0,
            format,
            type,
            source.data
          )
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, source.image)
        }
        assertTextureOperation(gl, 'upload texture2D pixels', texture.label)
        this.applySampler(texture)
        if (texture.mipmapPolicy === 'generate') gl.generateMipmap(gl.TEXTURE_2D)
        assertTextureOperation(gl, 'configure texture2D', texture.label)
      })

      assertTextureOperation(gl, 'restore texture2D upload state', texture.label)
      texture.assertUsable()
      const resource = Object.freeze({
        handle: requireNonNull<WebGLTexture>(
          handle,
          () => new WebGLResourceCreationError('texture2D', texture.label)
        ),
        target: gl.TEXTURE_2D
      })
      const unsubscribe = texture.onDispose(() => this.release(texture))
      this.entries.set(texture, { resource, unsubscribe })
      return resource
    } catch (error: unknown) {
      if (this.lost || gl.isContextLost()) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('create texture2D')
      }
      if (handle !== null) gl.deleteTexture(handle)
      throw error
    } finally {
      // 上传 helper 恢复真实 GL 状态后，上层缓存也必须失效。
      this.hooks.invalidateState()
    }
  }

  /**
   * 在分配 handle 之前，验证当前 WebGL1 设备能否准确实现描述。
   *
   * @remarks
   * r/rg 不冒充 LUMINANCE 系列；float 上传与 float 线性过滤分别检查。
   * sRGB uint8 必须使用 EXT_sRGB，不能静默改成线性格式。
   * 本批不实现 float 自动 mip；支持上传不代表支持自动 mip 生成。
   */
  private validateStorage(texture: Texture2D, source: UploadSource): number {
    const gl = this.gl
    const unsupported = (reason: string): never => {
      throw new UnsupportedRenderFeatureError('texture2D ' + texture.label, reason)
    }
    const { width, height } = source
    if (
      !Number.isSafeInteger(width) ||
      width <= 0 ||
      !Number.isSafeInteger(height) ||
      height <= 0
    ) {
      throw new InvalidTextureSourceError(
        texture.label,
        'pixel dimensions must be positive safe integers'
      )
    }
    const maximum = requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, 'MAX_TEXTURE_SIZE')
    if (width > maximum || height > maximum) unsupported('pixel dimensions exceed device limit')

    const pot = Number.isInteger(Math.log2(width)) && Number.isInteger(Math.log2(height))
    if (
      !pot &&
      (texture.sampler.wrapS !== 'clamp-to-edge' ||
        texture.sampler.wrapT !== 'clamp-to-edge' ||
        texture.mipmapPolicy !== 'none' ||
        (texture.sampler.minFilter !== 'nearest' && texture.sampler.minFilter !== 'linear'))
    ) {
      unsupported('WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps')
    }

    const storage = texture.storage
    if (storage.format !== 'rgb' && storage.format !== 'rgba') {
      unsupported('r/rg channel mapping is not implemented')
    }
    if (storage.type === 'float32') {
      if (source.kind !== 'data') unsupported('float32 requires CPU pixel data')
      if (this.capabilities.textureFloat === null) unsupported('OES_texture_float is required')
      const linear =
        texture.sampler.magFilter === 'linear' || texture.sampler.minFilter.includes('linear')
      if (linear && this.capabilities.textureFloatLinear === null) {
        unsupported('OES_texture_float_linear is required')
      }
      if (texture.mipmapPolicy !== 'none')
        unsupported('float32 mipmap generation is not implemented')
      if (texture.colorSpace === 'srgb') unsupported('sRGB storage requires uint8')
    }
    if (texture.colorSpace === 'srgb') {
      if (this.srgbExtension === undefined) this.srgbExtension = gl.getExtension('EXT_sRGB')
      if (gl.isContextLost()) throw new WebGLContextLostError('query EXT_sRGB')
      if (this.srgbExtension === null)
        unsupported('EXT_sRGB is required; no implicit color-space fallback')
      const extension = this.srgbExtension!
      return storage.format === 'rgb' ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT
    }
    return storage.format === 'rgb' ? gl.RGB : gl.RGBA
  }

  /** 将经过 CPU/设备验证的逻辑 sampler 翻译成 GL 常量；不修改调用者描述。 */
  private applySampler(texture: Texture2D): void {
    const gl = this.gl
    const wraps: Record<TextureWrapMode, number> = {
      'clamp-to-edge': gl.CLAMP_TO_EDGE,
      repeat: gl.REPEAT,
      'mirrored-repeat': gl.MIRRORED_REPEAT
    }
    const filters: Record<TextureMinFilter, number> = {
      nearest: gl.NEAREST,
      linear: gl.LINEAR,
      'nearest-mipmap-nearest': gl.NEAREST_MIPMAP_NEAREST,
      'linear-mipmap-nearest': gl.LINEAR_MIPMAP_NEAREST,
      'nearest-mipmap-linear': gl.NEAREST_MIPMAP_LINEAR,
      'linear-mipmap-linear': gl.LINEAR_MIPMAP_LINEAR
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps[texture.sampler.wrapS])
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wraps[texture.sampler.wrapT])
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters[texture.sampler.minFilter])
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters[texture.sampler.magFilter])
  }

  /**
   * 删除成功后才从待清理集合移除；抛错时保留条目供 release/dispose 重试。
   * 不读取 CPU source，因此也能在 Resource 的同步 dispose listener 中使用。
   */
  release(texture: Texture2D): void {
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }
    const entry = this.entries.get(texture)
    if (entry === undefined) return
    entry.unsubscribe()
    try {
      this.gl.deleteTexture(entry.resource.handle)
      this.entries.delete(texture)
      if (this.gl.isContextLost()) this.invalidateForContextLoss()
    } finally {
      this.hooks.invalidateState()
    }
  }

  /** 丢弃本代缓存和订阅，不 delete 旧 handles，也不释放 CPU 来源。 */
  invalidateForContextLoss(): void {
    this.lost = true
    for (const entry of this.entries.values()) entry.unsubscribe()
    this.entries.clear()
    this.hooks.invalidateState()
  }

  /**
   * 关闭此 Manager，并继续清理仍由它持有的 GPU 对象。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
   *
   * 关闭访问与完成清理是两件事。即便某次 delete 抛错，get 仍必须拒绝；
   * 但不能因为 closing 已经为 true 就跳过下次 dispose 的剩余清理。
   */
  dispose(): void {
    this.closing = true
    for (const entry of this.entries.values()) entry.unsubscribe()
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }
    for (const texture of [...this.entries.keys()]) this.release(texture)
  }

  /** 所有权关闭优先；context 丢失是永久代际失效，不因浏览器恢复而撤销。 */
  private assertReady(): void {
    if (this.closing) throw new WebGLBackendDisposedError('get texture2D')
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError('get texture2D')
    }
  }
}
