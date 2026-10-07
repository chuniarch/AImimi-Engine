import {
  IncompleteFramebufferError,
  RenderTargetUnavailableError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import {
  RenderTarget,
  type RenderTargetAttachmentRef,
  type RenderTargetDescriptor
} from '@/rendering/resources/RenderTarget'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import {
  assertTextureOperation,
  requireTextureLimit,
  withTextureUploadState,
  type WebGL1TextureManagerHooks
} from './WebGL1TextureUploadSupport'

/** 当前 context 的完整 FBO；深度明确是 renderbuffer，不能交给 sampler2D。 */
export interface WebGL1RenderTargetResource {
  readonly framebuffer: WebGLFramebuffer
  readonly colorTextures: readonly WebGLTexture[]
  readonly depthAttachment: WebGLRenderbuffer | null
  readonly width: number
  readonly height: number
  readonly revision: number
}

interface Entry {
  readonly resource: WebGL1RenderTargetResource
  readonly unsubscribe: () => void
}

/**
 * 管理逻辑 RenderTarget 在单个 context 中的 GPU 表示，不执行 Pass。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
 *
 * revision 不同：建立完整 replacement → 发布新 entry → 删除旧对象。
 * 失败仍向调用者抛错，不把旧尺寸对象作为新版本返回，也不修改 CPU revision。
 * 本类不会 resize canvas、设置 viewport 或自动重新生成目标中的画面。
 *
 * Owner 不得在 surface 作用域中 resize/release/dispose 该作用域仍借用的目标。
 * get() 的绑定检查只识别当前 FBO，不能识别嵌套作用域保存的其他 FBO。
 * 完整的活动 scope 生命周期约束由 Task 15 的 Backend 接线与测试落实。
 */
export class WebGL1RenderTargetManager {
  private readonly gl: WebGLRenderingContext
  private readonly capabilities: Pick<WebGL1Capabilities, 'drawBuffers'>
  private readonly hooks: WebGL1TextureManagerHooks

  private readonly entries = new Map<RenderTarget, Entry>()
  private disposed = false
  private lost = false

  constructor(
    gl: WebGLRenderingContext,
    capabilities: Pick<WebGL1Capabilities, 'drawBuffers'>,
    hooks: WebGL1TextureManagerHooks
  ) {
    this.gl = gl
    this.capabilities = capabilities
    this.hooks = hooks
  }

  /** 返回与当前 CPU revision 一致的完整资源，不能返回半成品或旧尺寸兜底。 */
  get(target: RenderTarget): WebGL1RenderTargetResource {
    this.assertReady()
    if (target.disposed) throw new ResourceDisposedError('RenderTarget')

    const old = this.entries.get(target)
    const revision = target.revision
    if (old?.resource.revision === revision) return old.resource

    /**
     * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
     * 名称定位逻辑用途，revision 定位本次存储配置；二者仅用于诊断。
     * entries 仍按 target 对象身份缓存，不能因同名而合并不同目标。
     */
    const label = target.label + ' (RenderTarget revision ' + revision + ')'
    let next: WebGL1RenderTargetResource | undefined

    try {
      assertTextureOperation(this.gl, 'begin render target creation', label)

      if (
        old !== undefined &&
        this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) === old.resource.framebuffer
      ) {
        throw new RenderTargetUnavailableError(
          label,
          'cannot rebuild the currently bound framebuffer; leave its surface scope first'
        )
      }

      this.validate(target.descriptor)
      next = this.create(target.descriptor, revision, label)
      assertTextureOperation(this.gl, 'finish render target creation', label)

      if (target.disposed) throw new ResourceDisposedError('RenderTarget')

      const unsubscribe = old?.unsubscribe ?? target.onDispose(() => this.release(target))
      this.entries.set(target, { resource: next, unsubscribe })
    } catch (error: unknown) {
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('create render target')
      }
      if (next !== undefined) this.deleteResource(next)
      throw error
    } finally {
      this.hooks.invalidateState()
    }

    if (old !== undefined) this.deleteResource(old.resource)
    this.hooks.invalidateState()
    return next
  }

  /**
   * 解析逻辑地址到当前 revision 的 GPU 附件；仅限 Backend 内部使用。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
   * 先验证 ref，后调用 get，非法地址不能顺便分配 GPU 存储。
   * color 返回 texture；depth 返回 renderbuffer，并不意味着它能被纹理采样。
   */
  resolveAttachment(ref: RenderTargetAttachmentRef): WebGLTexture | WebGLRenderbuffer {
    this.assertReady()

    if (ref === null || typeof ref !== 'object' || !(ref.target instanceof RenderTarget)) {
      throw new RenderTargetUnavailableError('attachment', 'invalid target reference')
    }

    const target = ref.target
    if (target.disposed) throw new ResourceDisposedError('RenderTarget')

    const descriptor = target.descriptor
    const validIndex = Number.isSafeInteger(ref.index) && ref.index >= 0

    if (
      !validIndex ||
      (ref.kind === 'color' && ref.index >= descriptor.colors.length) ||
      (ref.kind === 'depth' && (ref.index !== 0 || descriptor.depth === undefined)) ||
      (ref.kind !== 'color' && ref.kind !== 'depth')
    ) {
      throw new RenderTargetUnavailableError('attachment', 'invalid kind or attachment index')
    }

    const resource = this.get(target)
    return ref.kind === 'color' ? resource.colorTextures[ref.index]! : resource.depthAttachment!
  }

  /** 能力检查必须先于任何 create*，避免已知不支持的请求产生半成品。 */
  private validate(descriptor: RenderTargetDescriptor): void {
    const gl = this.gl
    const maximum = requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, 'MAX_TEXTURE_SIZE')
    const maximumDepth =
      descriptor.depth === undefined
        ? maximum
        : requireTextureLimit(gl, gl.MAX_RENDERBUFFER_SIZE, 'MAX_RENDERBUFFER_SIZE')

    if (
      descriptor.width > Math.min(maximum, maximumDepth) ||
      descriptor.height > Math.min(maximum, maximumDepth)
    ) {
      throw new UnsupportedRenderFeatureError('render target size', 'exceeds device limits')
    }

    if (descriptor.colors.length > 1) {
      const extension = this.capabilities.drawBuffers
      if (extension === null) {
        throw new UnsupportedRenderFeatureError('MRT', 'WEBGL_draw_buffers is required')
      }

      const colors = requireTextureLimit(
        gl,
        extension.MAX_COLOR_ATTACHMENTS_WEBGL,
        'MAX_COLOR_ATTACHMENTS_WEBGL'
      )
      const draws = requireTextureLimit(
        gl,
        extension.MAX_DRAW_BUFFERS_WEBGL,
        'MAX_DRAW_BUFFERS_WEBGL'
      )

      if (descriptor.colors.length > Math.min(colors, draws)) {
        throw new UnsupportedRenderFeatureError(
          'MRT',
          'color attachment count exceeds device limits'
        )
      }
    }
  }

  /**
   * 私有构建事务：失败只清理本次新建对象，旧 cache entry 不在此函数可修改范围内。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
   * drawBuffers 状态属于具体 FBO；只在新 FBO 上设置，不改外层 FBO 的配置。
   * 临时绑定结束恢复真实 framebuffer/renderbuffer；viewport 从始至终不修改。
   */
  private create(
    descriptor: RenderTargetDescriptor,
    revision: number,
    label: string
  ): WebGL1RenderTargetResource {
    const gl = this.gl
    const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
    const previousRenderbuffer = gl.getParameter(
      gl.RENDERBUFFER_BINDING
    ) as WebGLRenderbuffer | null

    let framebuffer: WebGLFramebuffer | null = null
    let depth: WebGLRenderbuffer | null = null
    const colors: WebGLTexture[] = []
    const { width, height } = descriptor

    try {
      return withTextureUploadState(gl, gl.TEXTURE_2D, () => {
        framebuffer = requireNonNull(
          gl.createFramebuffer(),
          () => new WebGLResourceCreationError('framebuffer', label)
        )
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

        for (let index = 0; index < descriptor.colors.length; index++) {
          const texture = requireNonNull(
            gl.createTexture(),
            () => new WebGLResourceCreationError('color-texture', label + ' color ' + index)
          )
          colors.push(texture)
          gl.bindTexture(gl.TEXTURE_2D, texture)

          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
          )

          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + index,
            gl.TEXTURE_2D,
            texture,
            0
          )

          assertTextureOperation(gl, 'allocate color attachment ' + index, label)
        }

        if (descriptor.depth !== undefined) {
          depth = requireNonNull(
            gl.createRenderbuffer(),
            () => new WebGLResourceCreationError('depth-renderbuffer', label)
          )
          gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
          gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth)
        }

        if (this.capabilities.drawBuffers !== null) {
          this.capabilities.drawBuffers.drawBuffersWEBGL(
            colors.map((_texture, index) => gl.COLOR_ATTACHMENT0 + index)
          )
        }

        assertTextureOperation(gl, 'configure framebuffer attachments', label)
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        assertTextureOperation(gl, 'check framebuffer completeness', label)

        if (status !== gl.FRAMEBUFFER_COMPLETE) throw new IncompleteFramebufferError(status, label)

        return Object.freeze({
          framebuffer,
          colorTextures: Object.freeze(colors),
          depthAttachment: depth,
          width,
          height,
          revision
        })
      })
    } catch (error: unknown) {
      if (!gl.isContextLost()) {
        if (framebuffer !== null) gl.deleteFramebuffer(framebuffer)
        for (const texture of colors) gl.deleteTexture(texture)
        if (depth !== null) gl.deleteRenderbuffer(depth)
      }
      throw error
    } finally {
      if (!gl.isContextLost()) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer)
        gl.bindRenderbuffer(gl.RENDERBUFFER, previousRenderbuffer)
      }
    }
  }

  /** 只删除 owned GPU 对象。调用前已将对应 entry 从 Map 移除或替换。 */
  private deleteResource(resource: WebGL1RenderTargetResource): void {
    this.gl.deleteFramebuffer(resource.framebuffer)
    for (const texture of resource.colorTextures) this.gl.deleteTexture(texture)
    if (resource.depthAttachment !== null) this.gl.deleteRenderbuffer(resource.depthAttachment)
  }

  /** CPU 已 disposed 时仍可 release；不通过 descriptor getter 读取被清空的数据。 */
  release(target: RenderTarget): void {
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }

    const entry = this.entries.get(target)
    if (entry === undefined) return

    this.entries.delete(target)
    entry.unsubscribe()
    this.deleteResource(entry.resource)
    this.hooks.invalidateState()
  }

  /** Lost 清 cache、退订，但不 delete；旧 Manager 不会随 context 恢复自动复活。 */
  invalidateForContextLoss(): void {
    this.lost = true
    for (const entry of this.entries.values()) entry.unsubscribe()
    this.entries.clear()
    this.hooks.invalidateState()
  }

  /** 先退订全部 CPU 通知，再清理 owned GPU 对象；不释放逻辑 RenderTarget。 */
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

    for (const entry of entries) this.deleteResource(entry.resource)
    this.hooks.invalidateState()
  }

  private assertReady(): void {
    if (this.disposed) throw new WebGLBackendDisposedError('get render target')
    if (this.lost || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError('get render target')
    }
  }
}
