import type { RenderTarget } from '@/rendering/resources/RenderTarget'
import type { TextureWriteView } from '@/rendering/resources/TextureWriteView'
import {
  CleanupFailureError,
  IncompleteFramebufferError,
  RenderTargetUnavailableError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import type { WebGL1TextureManager, WebGL1TextureResource } from './WebGL1TextureManager'
import type {
  WebGL1DepthBufferManager,
  WebGL1DepthBufferResource
} from './WebGL1DepthBufferManager'
import {
  WebGL1ResourceGeneration,
  guardWebGL1ResourceContext,
  preserveWebGLContextLoss,
  type WebGL1StorageManagerHooks
} from './WebGL1ResourceGeneration'
import { assertTextureOperation, requireTextureLimit } from './WebGL1TextureUploadSupport'
import { validateWebGL1TextureStorage } from './WebGL1TextureStorageSupport'

export interface WebGL1FramebufferColor {
  readonly view: TextureWriteView
  readonly storage: WebGL1TextureResource
}
/** 当前同步操作借用的固定附件 FBO；没有采样、viewport 或生产完成语义。 */
export interface WebGL1RenderTargetResource {
  readonly target: RenderTarget
  readonly generation: symbol
  readonly framebuffer: WebGLFramebuffer
  readonly colors: readonly WebGL1FramebufferColor[]
  readonly depth: WebGL1DepthBufferResource | null
  readonly width: number
  readonly height: number
  readonly revision: number
}
interface Entry {
  readonly target: RenderTarget
  readonly label: string
  unsubscribe: () => void
  closing: boolean
  busy: boolean
  current: Group | null
  building: Group | null
  readonly retired: Set<Group>
}
interface Group {
  readonly entry: Entry
  readonly revision: number
  readonly width: number
  readonly height: number
  readonly colors: WebGL1FramebufferColor[]
  depth: WebGL1DepthBufferResource | null
  framebuffer: WebGLFramebuffer | null
  record: WebGL1RenderTargetResource | null
  phase: 'building' | 'current' | 'retiring'
  busy: boolean
}

/**
 * 仅拥有 FBO；附件存储由两个独立 owner 唯一分配和删除。
 * @remarks
 * [DESIGN-WEIGHT:3][framebuffer-reverse-dependency-barrier]
 * 反向索引以具体 GPU record 为键。building、current、retired 和失败回滚都保留边，
 * 只有 FBO 删除成功或整个 generation 失效才拆边；不 retain/dispose CPU 附件。
 */
export class WebGL1RenderTargetManager {
  private readonly entries = new Map<RenderTarget, Entry>()
  private readonly textureUsers = new Map<WebGL1TextureResource, Set<Group>>()
  private readonly depthUsers = new Map<WebGL1DepthBufferResource, Set<Group>>()
  private closing = false
  private disposing = false

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly capabilities: WebGL1Capabilities,
    private readonly generation: WebGL1ResourceGeneration,
    private readonly textures: WebGL1TextureManager,
    private readonly depths: WebGL1DepthBufferManager,
    private readonly hooks: WebGL1StorageManagerHooks
  ) {
    this.gl = guardWebGL1ResourceContext(gl, generation)
  }

  get(target: RenderTarget): WebGL1RenderTargetResource {
    this.assertAvailable()
    target.assertUsable()
    let entry = this.entries.get(target)
    if (entry?.busy) throw this.unavailable(entry, 'target operation is already running')
    if (entry?.closing) {
      this.release(target)
      this.assertAvailable()
      target.assertUsable()
      entry = undefined
    }
    if (!entry) {
      entry = {
        target,
        label: target.label,
        unsubscribe: () => {},
        closing: false,
        busy: false,
        current: null,
        building: null,
        retired: new Set()
      }
      this.entries.set(target, entry)
      entry.unsubscribe = target.onDispose(() => this.release(target))
    }
    entry.busy = true
    try {
      this.drain(entry)
      if (entry.current?.revision === target.revision) {
        this.assertGroup(entry.current)
        return entry.current.record!
      }
      const old = entry.current
      if (old && this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) === old.framebuffer)
        throw this.unavailable(entry, 'cannot rebuild a bound framebuffer')
      const revision = target.revision,
        attachments = target.attachments
      const width = target.width,
        height = target.height
      this.preflight(attachments.colors, attachments.depth, entry.label)
      this.assertEntry(entry, revision)
      const group: Group = {
        entry,
        revision,
        width,
        height,
        colors: [],
        depth: null,
        framebuffer: null,
        record: null,
        phase: 'building',
        busy: true
      }
      entry.building = group
      try {
        this.withBindings(entry.label, () => {
          for (const view of attachments.colors) {
            this.assertBuilding(group)
            const storage = this.textures.get(view.texture)
            // 此处与下一次可重入调用之间必须先登记边，包含尚无 FBO handle 的组。
            group.colors.push(Object.freeze({ view, storage }))
            this.addUser(this.textureUsers, storage, group)
            this.assertBuilding(group)
          }
          if (attachments.depth) {
            group.depth = this.depths.get(attachments.depth)
            this.addUser(this.depthUsers, group.depth, group)
            this.assertBuilding(group)
          }
          group.framebuffer = this.gl.createFramebuffer()
          this.generation.assertCurrent('create framebuffer')
          assertTextureOperation(this.gl, 'create framebuffer', entry.label)
          if (group.framebuffer === null)
            throw new WebGLResourceCreationError('framebuffer', entry.label)
          this.assertBuilding(group)
          this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, group.framebuffer)
          assertTextureOperation(this.gl, 'bind framebuffer', entry.label)
          this.assertBuilding(group)
          const faces = [
            'positive-x',
            'negative-x',
            'positive-y',
            'negative-y',
            'positive-z',
            'negative-z'
          ]
          for (let i = 0; i < group.colors.length; i++) {
            const { view, storage } = group.colors[i]!
            this.gl.framebufferTexture2D(
              this.gl.FRAMEBUFFER,
              this.gl.COLOR_ATTACHMENT0 + i,
              view.kind === '2d'
                ? this.gl.TEXTURE_2D
                : this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + faces.indexOf(view.face),
              storage.handle,
              view.mipLevel
            )
            assertTextureOperation(this.gl, 'attach color', entry.label)
            this.assertBuilding(group)
          }
          if (group.depth) {
            this.gl.framebufferRenderbuffer(
              this.gl.FRAMEBUFFER,
              this.gl.DEPTH_ATTACHMENT,
              this.gl.RENDERBUFFER,
              group.depth.handle
            )
            assertTextureOperation(this.gl, 'attach depth', entry.label)
            this.assertBuilding(group)
          }
          if (group.colors.length > 1) {
            this.generation.assertCurrent('draw buffers')
            this.capabilities.drawBuffers!.drawBuffersWEBGL(
              group.colors.map((_, i) => this.gl.COLOR_ATTACHMENT0 + i)
            )
            this.generation.assertCurrent('draw buffers')
            assertTextureOperation(this.gl, 'configure draw buffers', entry.label)
            this.assertBuilding(group)
          }
          const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER)
          assertTextureOperation(this.gl, 'check framebuffer', entry.label)
          this.assertBuilding(group)
          if (status !== this.gl.FRAMEBUFFER_COMPLETE)
            throw new IncompleteFramebufferError(
              status,
              `${entry.label} (RenderTarget revision ${group.revision})`
            )
        })
        this.assertBuilding(group)
        group.record = Object.freeze({
          target,
          generation: this.generation.token,
          framebuffer: group.framebuffer!,
          colors: Object.freeze([...group.colors]),
          depth: group.depth,
          width,
          height,
          revision
        })
        group.phase = 'current'
        group.busy = false
        entry.building = null
        entry.current = group
        if (old) this.retire(old)
      } catch (cause) {
        group.busy = false
        this.retire(group)
        entry.building = null
        if (this.abandonIfLost()) throw preserveWebGLContextLoss(cause, 'build framebuffer')
        try {
          this.cleanup(group)
        } catch (cleanup) {
          throw new AggregateError([cause, cleanup], 'Framebuffer creation and rollback failed')
        }
        if (this.generation.lost) throw preserveWebGLContextLoss(cause, 'rollback framebuffer')
        throw cause
      }
      // 已发布的新组不能因旧组清理失败而进入候选回滚。
      this.drain(entry)
      this.assertGroup(group)
      return group.record
    } finally {
      entry.busy = false
      this.dropEmpty(entry)
      this.hooks.invalidateState()
    }
  }

  assertRecordUsable(record: WebGL1RenderTargetResource): void {
    this.assertAvailable()
    const entry = this.entries.get(record.target),
      group = entry?.current
    if (!entry || entry.busy || group?.record !== record)
      throw new RenderTargetUnavailableError(
        record.target.label,
        'foreign or unavailable framebuffer record'
      )
    this.assertGroup(group)
  }

  /** target 的 GPU release 不释放其借用的 CPU/GPU 存储。 */
  release(target: RenderTarget): void {
    if (this.abandonIfLost()) return
    const entry = this.entries.get(target)
    if (!entry) return
    entry.closing = true
    if (entry.current) this.retire(entry.current)
    if (entry.building) this.retire(entry.building)
    if (entry.busy) throw this.busyFailure(entry.label)
    entry.busy = true
    try {
      this.drain(entry)
    } finally {
      entry.busy = false
      this.dropEmpty(entry)
      this.hooks.invalidateState()
    }
  }

  /** 允许 retiring/历史 own record；正常返回才允许其 owner 删除 storage。 */
  releaseTexture(record: WebGL1TextureResource): void {
    if (this.abandonIfLost()) return
    this.textures.assertRecordOwned(record)
    this.releaseUsers(this.textureUsers.get(record))
  }
  releaseDepthBuffer(record: WebGL1DepthBufferResource): void {
    if (this.abandonIfLost()) return
    this.depths.assertRecordOwned(record)
    this.releaseUsers(this.depthUsers.get(record))
  }

  invalidateForContextLoss(): void {
    this.generation.invalidate()
    for (const entry of this.entries.values()) {
      entry.unsubscribe()
      const groups = [...entry.retired, entry.current, entry.building]
      for (const group of groups)
        if (group) {
          group.framebuffer = null
          group.phase = 'retiring'
        }
    }
    this.entries.clear()
    this.textureUsers.clear()
    this.depthUsers.clear()
    this.hooks.invalidateState()
  }
  dispose(): void {
    this.closing = true
    if (this.abandonIfLost()) return
    if (this.disposing) throw this.busyFailure('dispose')
    this.disposing = true
    try {
      for (const target of [...this.entries.keys()]) this.release(target)
    } finally {
      this.disposing = false
    }
  }

  private preflight(
    views: readonly TextureWriteView[],
    depth: RenderTarget['attachments']['depth'],
    label: string
  ): void {
    const gl = this.gl,
      caps = this.capabilities
    assertTextureOperation(gl, 'begin framebuffer allocation', label)
    if (views.length > 1) {
      if (!caps.drawBuffers)
        throw new UnsupportedRenderFeatureError('MRT', 'WEBGL_draw_buffers is required')
      const max = Math.min(
        requireTextureLimit(
          gl,
          caps.drawBuffers.MAX_COLOR_ATTACHMENTS_WEBGL,
          'MAX_COLOR_ATTACHMENTS_WEBGL'
        ),
        requireTextureLimit(gl, caps.drawBuffers.MAX_DRAW_BUFFERS_WEBGL, 'MAX_DRAW_BUFFERS_WEBGL')
      )
      if (views.length > max)
        throw new UnsupportedRenderFeatureError('MRT', 'attachment count exceeds device limit')
    }
    for (const view of views) {
      if (view.mipLevel !== 0 && !caps.fboRenderMipmap)
        throw new UnsupportedRenderFeatureError(
          'framebuffer mip',
          'OES_fbo_render_mipmap is required'
        )
      const descriptor = view.texture.descriptor
      if (descriptor.storage.type === 'float32' && !caps.colorBufferFloat)
        throw new UnsupportedRenderFeatureError(
          'float framebuffer',
          'WEBGL_color_buffer_float is required'
        )
      validateWebGL1TextureStorage(
        gl,
        caps,
        descriptor,
        view.texture.defaultSampler,
        null,
        label,
        () => null
      )
    }
    if (depth) {
      const maximum = requireTextureLimit(gl, gl.MAX_RENDERBUFFER_SIZE, 'MAX_RENDERBUFFER_SIZE')
      if (depth.width > maximum || depth.height > maximum)
        throw new UnsupportedRenderFeatureError(
          'depth framebuffer',
          'dimensions exceed MAX_RENDERBUFFER_SIZE'
        )
    }
    assertTextureOperation(gl, 'validate framebuffer', label)
  }

  private withBindings(label: string, action: () => void): void {
    const gl = this.gl
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
    assertTextureOperation(gl, 'capture framebuffer binding', label)
    const renderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null
    assertTextureOperation(gl, 'capture renderbuffer binding', label)
    const failures: unknown[] = []
    try {
      action()
    } catch (cause) {
      failures.push(cause)
    }
    const restorations = [
      () => gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer),
      () => gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
    ]
    for (const restore of restorations)
      if (!this.generation.lost) {
        try {
          restore()
          assertTextureOperation(gl, 'restore framebuffer bindings', label)
        } catch (cause) {
          failures.push(cause)
        }
      }
    if (this.generation.lost && !failures.some((c) => c instanceof WebGLContextLostError))
      failures.push(new WebGLContextLostError('restore framebuffer bindings'))
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1)
      throw new AggregateError(failures, 'Framebuffer allocation or binding restoration failed')
  }

  private assertAvailable(): void {
    if (this.closing) throw new WebGLBackendDisposedError('get framebuffer')
    if (this.abandonIfLost()) throw new WebGLContextLostError('get framebuffer')
    this.hooks.assertAvailable()
  }
  private assertEntry(entry: Entry, revision: number): void {
    this.assertAvailable()
    entry.target.assertUsable()
    if (
      entry.closing ||
      this.entries.get(entry.target) !== entry ||
      entry.target.revision !== revision
    )
      throw this.unavailable(entry, 'target released or attachments changed')
  }
  private assertStorage(group: Group): void {
    for (const color of group.colors) this.textures.assertRecordUsable(color.storage)
    if (group.depth) this.depths.assertRecordUsable(group.depth)
  }
  private assertBuilding(group: Group): void {
    this.assertEntry(group.entry, group.revision)
    this.assertStorage(group)
    this.assertEntry(group.entry, group.revision)
    if (group.phase !== 'building' || group.entry.building !== group)
      throw this.unavailable(group.entry, 'framebuffer candidate was retired')
  }
  private assertGroup(group: Group): void {
    this.assertEntry(group.entry, group.revision)
    this.assertStorage(group)
    this.assertEntry(group.entry, group.revision)
    if (group.phase !== 'current' || group.entry.current !== group || group.busy)
      throw this.unavailable(group.entry, 'framebuffer was retired')
  }
  private addUser<T>(index: Map<T, Set<Group>>, record: T, group: Group): void {
    let users = index.get(record)
    if (!users) {
      users = new Set()
      index.set(record, users)
    }
    users.add(group)
  }
  private removeUser<T>(index: Map<T, Set<Group>>, record: T, group: Group): void {
    const users = index.get(record)
    users?.delete(group)
    if (users?.size === 0) index.delete(record)
  }
  private retire(group: Group): void {
    group.phase = 'retiring'
    if (group.entry.current === group) group.entry.current = null
    group.entry.retired.add(group)
  }
  private releaseUsers(users: Set<Group> | undefined): void {
    const groups = [...(users ?? [])]
    for (const group of groups) this.retire(group)
    try {
      for (const group of groups) this.cleanup(group)
    } finally {
      this.hooks.invalidateState()
    }
  }
  private drain(entry: Entry): void {
    for (const group of [...entry.retired]) this.cleanup(group)
  }
  private cleanup(group: Group): void {
    if (this.abandonIfLost()) return
    if (group.busy) throw this.busyFailure(group.entry.label)
    group.busy = true
    try {
      if (group.framebuffer !== null) {
        try {
          assertTextureOperation(this.gl, 'begin delete framebuffer', group.entry.label)
          this.gl.deleteFramebuffer(group.framebuffer)
          assertTextureOperation(this.gl, 'delete framebuffer', group.entry.label)
        } catch (cause) {
          const lost = this.abandonIfLost()
          if (lost && cause instanceof WebGLContextLostError) return
          throw new CleanupFailureError(group.entry.label, [
            {
              phase: 'gpu-delete',
              label: 'framebuffer cleanup',
              cause: lost ? preserveWebGLContextLoss(cause, 'delete framebuffer') : cause
            }
          ])
        }
        group.framebuffer = null
      }
      for (const color of group.colors) this.removeUser(this.textureUsers, color.storage, group)
      if (group.depth) this.removeUser(this.depthUsers, group.depth, group)
      const entry = group.entry
      entry.retired.delete(group)
      if (entry.current === group) entry.current = null
      if (entry.building === group) entry.building = null
      this.dropEmpty(entry)
    } finally {
      group.busy = false
    }
  }
  private dropEmpty(entry: Entry): void {
    if (!entry.busy && !entry.current && !entry.building && entry.retired.size === 0) {
      entry.unsubscribe()
      if (this.entries.get(entry.target) === entry) this.entries.delete(entry.target)
    }
  }
  private abandonIfLost(): boolean {
    if (!this.generation.lost) return false
    this.invalidateForContextLoss()
    return true
  }
  private busyFailure(label: string): CleanupFailureError {
    return new CleanupFailureError(label, [
      {
        phase: 'gpu-dependency',
        label: 'framebuffer cleanup completion',
        cause: new Error('Framebuffer operation is still running')
      }
    ])
  }
  private unavailable(entry: Entry, reason: string): RenderTargetUnavailableError {
    return new RenderTargetUnavailableError(entry.label, reason)
  }
}
