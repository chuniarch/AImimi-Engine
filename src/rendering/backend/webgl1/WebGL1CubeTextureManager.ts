import {
  InvalidTextureSourceError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { CubeTexture, type CubeFaces } from '@/rendering/resources/CubeTexture'
import { assertValidCubeFaceDimensions } from '@/rendering/resources/assertValidCubeFaceDimensions'
import type { TextureImageSource } from '@/rendering/resources/Texture2D'
import type { TextureMinFilter, TextureWrapMode } from '@/rendering/resources/Texture'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import {
  assertTextureOperation,
  requireTextureLimit,
  withTextureUploadState,
  type WebGL1TextureManagerHooks
} from './WebGL1TextureUploadSupport'

/** 只供当前 Backend 借用；生命周期由本 Manager 管理，不能保存进 CPU Texture。 */
export interface WebGL1CubeTextureResource {
  readonly handle: WebGLTexture
  readonly target: number
}

interface Entry {
  readonly resource: WebGL1CubeTextureResource
  readonly unsubscribe: () => void
}

/**
 * 读取真正的图片像素尺寸，而不是 HTML 的 CSS/display width。
 *
 * @remarks
 * 图片被借用且可变，所以加载状态与尺寸在首次实际上传时重新检查。
 * 成功上传后按静态资源缓存；改变图片内容须创建新的 CubeTexture。
 */
function imageDimensions(image: TextureImageSource, label: string) {
  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    if (!image.complete)
      throw new InvalidTextureSourceError(label, 'image has not finished loading')
    return { width: image.naturalWidth, height: image.naturalHeight }
  }
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    return { width: image.width, height: image.height }
  }
  throw new InvalidTextureSourceError(
    label,
    'expected HTMLImageElement or ImageBitmap in this realm'
  )
}

/**
 * 一个 context/generation 的静态 cubemap GPU 表示管理器。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][cubemap-upload-transaction]
 *
 * 六面全部上传成功才缓存并订阅 Resource。失败删除本次半成品。
 * Manager 只拥有 GPU texture；不会 dispose CPU CubeTexture 或 close 借用的 ImageBitmap。
 * context lost 后本实例永久失效；恢复时由 Backend 创建新 Manager。
 */
export class WebGL1CubeTextureManager {
  private readonly entries = new Map<CubeTexture, Entry>()
  private disposed = false
  private lost = false

  /** undefined=尚未查询；null=本 context 不支持。不是进程级缓存。 */
  private srgbExtension: EXT_sRGB | null | undefined

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly capabilities: Pick<WebGL1Capabilities, 'textureFloat' | 'textureFloatLinear'>,
    private readonly hooks: WebGL1TextureManagerHooks
  ) {}

  /** 懒上传或借用缓存。相同 label 的两个 CPU 对象不会合并。 */
  get(texture: CubeTexture): WebGL1CubeTextureResource {
    this.assertReady()
    if (texture.disposed) throw new ResourceDisposedError('CubeTexture')
    const cached = this.entries.get(texture)
    if (cached !== undefined) return cached.resource

    const gl = this.gl
    let handle: WebGLTexture | null = null

    try {
      assertTextureOperation(gl, 'begin cube upload', texture.label)
      const source = texture.copySource()
      const dimensionAt = (index: 0 | 1 | 2 | 3 | 4 | 5) =>
        source.kind === 'images'
          ? imageDimensions(source.faces[index], texture.label)
          : source.faces[index]

      const faces: CubeFaces<{ readonly width: number; readonly height: number }> = [
        dimensionAt(0),
        dimensionAt(1),
        dimensionAt(2),
        dimensionAt(3),
        dimensionAt(4),
        dimensionAt(5)
      ]

      assertValidCubeFaceDimensions(
        faces,
        (reason) => new InvalidTextureSourceError(texture.label, reason)
      )

      const size = faces[0].width
      const format = this.validateStorage(texture, source.kind, size)
      const type = texture.storage.type === 'float32' ? gl.FLOAT : gl.UNSIGNED_BYTE

      withTextureUploadState(gl, gl.TEXTURE_CUBE_MAP, () => {
        handle = requireNonNull(
          gl.createTexture(),
          () => new WebGLResourceCreationError('cube-texture', texture.label)
        )
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, handle)

        for (let index = 0; index < 6; index++) {
          const faceTarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + index
          if (source.kind === 'data') {
            const face = source.faces[index]!
            gl.texImage2D(faceTarget, 0, format, size, size, 0, format, type, face.data)
          } else {
            gl.texImage2D(faceTarget, 0, format, format, type, source.faces[index]!)
          }
          assertTextureOperation(gl, 'upload cube face ' + index, texture.label)
        }

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

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wraps[texture.sampler.wrapS])
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wraps[texture.sampler.wrapT])
        gl.texParameteri(
          gl.TEXTURE_CUBE_MAP,
          gl.TEXTURE_MIN_FILTER,
          filters[texture.sampler.minFilter]
        )
        gl.texParameteri(
          gl.TEXTURE_CUBE_MAP,
          gl.TEXTURE_MAG_FILTER,
          filters[texture.sampler.magFilter]
        )

        if (texture.mipmapPolicy === 'generate') gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
        assertTextureOperation(gl, 'configure cubemap', texture.label)
      })

      assertTextureOperation(gl, 'restore cube upload state', texture.label)
      if (texture.disposed) throw new ResourceDisposedError('CubeTexture')

      const resource = Object.freeze({
        handle: requireNonNull<WebGLTexture>(
          handle,
          () => new WebGLResourceCreationError('cube-texture', texture.label)
        ),
        target: gl.TEXTURE_CUBE_MAP
      })

      const unsubscribe = texture.onDispose(() => this.release(texture))
      this.entries.set(texture, { resource, unsubscribe })
      return resource
    } catch (error: unknown) {
      if (this.lost || gl.isContextLost()) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('create cubemap')
      }
      if (handle !== null) gl.deleteTexture(handle)
      throw error
    } finally {
      this.hooks.invalidateState()
    }
  }

  /**
   * 验证 CPU 描述能否在当前 WebGL1 context 准确实现。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][cubemap-storage-color-contract]
   *
   * r/rg 不冒充 LUMINANCE/LUMINANCE_ALPHA，因为采样通道语义不同。
   * sRGB uint8 使用 EXT_sRGB，让采样结果解码为线性颜色；不能再让 shader 重复解码。
   * linear/data 不做颜色转换。输出到屏幕的颜色编码属于后续 shader/pipeline。
   * float32 只接受像素数组；线性过滤另外检查 OES_texture_float_linear。
   * 本批不实现 float 自动 mipmap，不能把“可上传”当作“可生成 mipmap”。
   */
  private validateStorage(
    texture: CubeTexture,
    sourceKind: 'images' | 'data',
    size: number
  ): number {
    const gl = this.gl
    const unsupported = (reason: string): never => {
      throw new UnsupportedRenderFeatureError('cubemap ' + texture.label, reason)
    }

    if (size > requireTextureLimit(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE, 'MAX_CUBE_MAP_TEXTURE_SIZE')) {
      unsupported('face size exceeds device limit')
    }

    const pot = Number.isInteger(Math.log2(size))
    if (
      !pot &&
      (texture.sampler.wrapS !== 'clamp-to-edge' ||
        texture.sampler.wrapT !== 'clamp-to-edge' ||
        texture.mipmapPolicy !== 'none' ||
        (texture.sampler.minFilter !== 'nearest' && texture.sampler.minFilter !== 'linear'))
    )
      unsupported('WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps')

    const storage = texture.storage
    if (storage.format !== 'rgb' && storage.format !== 'rgba') {
      unsupported('r/rg channel mapping is not implemented')
    }

    if (storage.type === 'float32') {
      if (sourceKind !== 'data') unsupported('float32 requires CPU pixel data')
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

      const extension = this.srgbExtension
      if (extension === null) {
        throw new UnsupportedRenderFeatureError(
          'sRGB cubemap',
          'EXT_sRGB is required; no implicit color-space fallback'
        )
      }
      return storage.format === 'rgb' ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT
    }

    return storage.format === 'rgb' ? gl.RGB : gl.RGBA
  }

  /** 删除当前 GPU 表示；可在 CPU 已经标记 disposed 的 listener 中调用。 */
  release(texture: CubeTexture): void {
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }

    const entry = this.entries.get(texture)
    if (entry === undefined) return

    this.entries.delete(texture)
    entry.unsubscribe()
    this.gl.deleteTexture(entry.resource.handle)
    this.hooks.invalidateState()
  }

  /** 只丢弃旧 handles 和订阅，不向丢失的 context 发 delete 命令。 */
  invalidateForContextLoss(): void {
    this.lost = true
    for (const entry of this.entries.values()) entry.unsubscribe()
    this.entries.clear()
    this.hooks.invalidateState()
  }

  /** 正常退出：先取消全部订阅，再删除本 Manager 拥有的 GPU 对象。 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    const entries = [...this.entries.values()]
    this.entries.clear()
    for (const entry of entries) entry.unsubscribe()

    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }

    for (const entry of entries) this.gl.deleteTexture(entry.resource.handle)
    this.hooks.invalidateState()
  }

  private assertReady(): void {
    if (this.disposed) throw new WebGLBackendDisposedError('get cubemap')
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError('get cubemap')
    }
  }
}
