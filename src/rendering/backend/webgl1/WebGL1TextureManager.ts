import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { UnsupportedRenderFeatureError } from '@/rendering/core/errors'
import type { TextureSamplingBinding } from '@/rendering/resources/TextureSamplingBinding'
import type { TextureResource } from '@/rendering/resources/TextureResource'
import {
  CleanupFailureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import {
  WebGL1ResourceGeneration,
  guardWebGL1ResourceContext,
  preserveWebGLContextLoss,
  type WebGL1StorageManagerHooks
} from './WebGL1ResourceGeneration'
import { assertTextureOperation, withTextureUploadState } from './WebGL1TextureUploadSupport'
import { readWebGL1TextureSource, uploadWebGL1TextureSource } from './WebGL1TextureSourceUpload'
import {
  allocateWebGL1RenderTexture,
  applyWebGL1TextureSampler,
  validateWebGL1TextureStorage,
  type WebGL1TextureCapabilities
} from './WebGL1TextureStorageSupport'

/** 只在当前同步 Backend 操作内借用；release/lost 后必须重新获取。 */
export interface WebGL1TextureResource {
  readonly texture: TextureResource
  readonly generation: symbol
  readonly handle: WebGLTexture
  readonly target: number
}
export interface WebGL1TextureOwnerHooks extends WebGL1StorageManagerHooks {
  /** 正常返回表示这个具体 record 的所有 FBO 依赖已清完；busy/失败必须抛错。 */
  readonly beforeDelete: (record: WebGL1TextureResource) => undefined
}
interface Entry {
  readonly texture: TextureResource
  readonly label: string
  phase: 'building' | 'ready' | 'retiring'
  busy: boolean
  record: WebGL1TextureResource | null
  unsubscribe: () => void
  dependencyReleased: boolean
}

/**
 * 每个 generation 中 TextureResource 的唯一 GPU 所有者。
 * @remarks
 * [DESIGN-WEIGHT:3][texture-storage-single-identity]
 * source2D、source cube、render 只改变上传/分配策略，身份缓存始终只有这一份。
 * 在任何来源读取和 GL 调用前登记候选及订阅；回滚失败仍保存 handle 和删除游标。
 * ready 命中不重传，不 dispose CPU、不 close 图片，不证明 render 内容已生产。
 */
export class WebGL1TextureManager {
  private readonly entries = new Map<TextureResource, Entry>()
  private readonly ownedRecords = new WeakSet<WebGL1TextureResource>()
  private closing = false
  private disposing = false
  private srgbExtension: EXT_sRGB | null | undefined

  /** 仅组装依赖，构造不发 GL；beforeDelete 必须由 coordinator 显式连接。 */
  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly capabilities: WebGL1TextureCapabilities,
    private readonly generation: WebGL1ResourceGeneration,
    private readonly hooks: WebGL1TextureOwnerHooks
  ) {
    this.gl = guardWebGL1ResourceContext(gl, generation)
  }

  /** ready 直接借用；遗留候选必须清完，才能分配下一份表示。 */
  /** Validate the requested sampler before the draw allocates any sampled storage. */
  validateSampling(binding: TextureSamplingBinding): void {
    this.assertAvailable()
    binding.texture.assertUsable()
    const gl = this.gl
    const texture = binding.texture
    // Cached storage no longer depends on a live CPU image. Cold storage must
    // preflight the same default/source contract that get() will enforce.
    const source =
      this.entries.get(texture)?.phase === 'ready'
        ? null
        : readWebGL1TextureSource(texture, texture.descriptor)
    for (const sampler of [texture.defaultSampler, binding.sampler]) {
      validateWebGL1TextureStorage(
        gl,
        this.capabilities,
        texture.descriptor,
        sampler,
        source,
        texture.label,
        () => gl.getExtension('EXT_sRGB')
      )
    }
  }

  /** Borrow the unique storage and apply this draw's sampler without uploading again. */
  sample(binding: TextureSamplingBinding): WebGL1TextureResource {
    this.validateSampling(binding)
    const record = this.get(binding.texture)
    const gl = this.gl
    try {
      withTextureUploadState(gl, record.target, this.generation, () => {
        this.assertRecordUsable(record)
        gl.bindTexture(record.target, record.handle)
        applyWebGL1TextureSampler(gl, record.target, binding.sampler, () =>
          this.assertRecordUsable(record)
        )
        const error = gl.getError()
        if (error !== gl.NO_ERROR)
          throw new WebGLOperationError(
            'sample',
            binding.texture.label,
            'sampler application failed'
          )
      })
      this.assertRecordUsable(record)
      return record
    } finally {
      this.hooks.invalidateState()
    }
  }

  /** Explicit generation never establishes a producer-completion flag. */
  generateMipmaps(texture: RenderTexture): void {
    this.assertAvailable()
    texture.assertUsable()
    const { width, height, mipLevelCount } = texture.descriptor
    if (
      texture.production !== 'generated-from-base' ||
      !Number.isInteger(Math.log2(width)) ||
      !Number.isInteger(Math.log2(height)) ||
      mipLevelCount !== Math.floor(Math.log2(Math.max(width, height))) + 1
    ) {
      throw new UnsupportedRenderFeatureError(
        'generate mipmaps',
        'requires generated-from-base and a complete POT mip chain'
      )
    }
    const record = this.get(texture)
    const gl = this.gl
    try {
      withTextureUploadState(gl, record.target, this.generation, () => {
        this.assertRecordUsable(record)
        gl.bindTexture(record.target, record.handle)
        this.assertRecordUsable(record)
        gl.generateMipmap(record.target)
        this.assertRecordUsable(record)
        if (gl.getError() !== gl.NO_ERROR)
          throw new WebGLOperationError(
            'generate mipmaps',
            texture.label,
            'mipmap generation failed'
          )
      })
      this.assertRecordUsable(record)
    } finally {
      this.hooks.invalidateState()
    }
  }

  get(texture: TextureResource): WebGL1TextureResource {
    this.assertAvailable()
    texture.assertUsable()
    const cached = this.entries.get(texture)
    if (cached?.busy)
      throw new WebGLOperationError(
        'get texture',
        texture.label,
        'texture operation is already running'
      )
    if (cached?.phase === 'ready' && cached.record !== null) return cached.record
    if (cached) {
      this.release(texture)
      this.assertAvailable()
      texture.assertUsable()
    }
    const entry: Entry = {
      texture,
      label: texture.label,
      phase: 'building',
      busy: true,
      record: null,
      unsubscribe: () => {},
      dependencyReleased: false
    }
    this.entries.set(texture, entry)
    const gl = this.gl
    const check = () => this.assertBuilding(entry)
    try {
      entry.unsubscribe = texture.onDispose(() => this.release(texture))
      const descriptor = texture.descriptor
      const sampler = texture.defaultSampler
      const source = readWebGL1TextureSource(texture, descriptor)
      check()
      assertTextureOperation(gl, 'begin texture allocation', entry.label)
      const storage = validateWebGL1TextureStorage(
        gl,
        this.capabilities,
        descriptor,
        sampler,
        source,
        entry.label,
        () => {
          if (this.srgbExtension === undefined) this.srgbExtension = gl.getExtension('EXT_sRGB')
          return this.srgbExtension
        }
      )
      check()
      withTextureUploadState(gl, storage.target, this.generation, () => {
        check()
        const handle = gl.createTexture()
        // 先接住 create 返回值；同步失效/关闭也不能漏记已经创建的 handle。
        if (handle !== null)
          entry.record = Object.freeze({
            texture,
            generation: this.generation.token,
            handle,
            target: storage.target
          })
        if (entry.record !== null) this.ownedRecords.add(entry.record)
        this.generation.assertCurrent('create texture')
        if (handle === null) throw new WebGLResourceCreationError('texture', entry.label)
        check()
        gl.bindTexture(storage.target, handle)
        check()
        if (source)
          uploadWebGL1TextureSource(
            gl,
            storage.target,
            storage.format,
            storage.type,
            source,
            entry.label,
            check
          )
        else
          allocateWebGL1RenderTexture(
            gl,
            descriptor,
            storage.format,
            storage.type,
            entry.label,
            check
          )
        applyWebGL1TextureSampler(gl, storage.target, sampler, check)
        if (source?.generateMipmap) {
          check()
          gl.generateMipmap(storage.target)
          check()
        }
        assertTextureOperation(gl, 'configure texture', entry.label)
      })
      assertTextureOperation(gl, 'restore texture upload state', entry.label)
      check()
      if (entry.record === null) throw new WebGLResourceCreationError('texture', entry.label)
      entry.phase = 'ready'
      return entry.record
    } catch (cause) {
      entry.phase = 'retiring'
      entry.busy = false
      if (this.generation.lost) {
        this.invalidateForContextLoss()
        throw preserveWebGLContextLoss(cause, 'create texture')
      }
      try {
        this.release(texture)
      } catch (cleanup) {
        throw new AggregateError([cause, cleanup], 'Texture creation and rollback failed')
      }
      if (this.generation.lost) throw preserveWebGLContextLoss(cause, 'rollback texture')
      throw cause
    } finally {
      entry.busy = false
      this.hooks.invalidateState()
    }
  }

  /** 只验证来源身份；允许 retiring/已释放记录，不证明记录仍可使用。 */
  assertRecordOwned(record: WebGL1TextureResource): void {
    if (!this.ownedRecords.has(record))
      throw new WebGLOperationError('release dependent FBOs', 'texture', 'foreign storage record')
  }

  /** 验证具体 record 身份，不通过 get 分配替代品，也不复活已驱逐的 record。 */
  assertRecordUsable(record: WebGL1TextureResource): void {
    this.assertAvailable()
    record.texture.assertUsable()
    const entry = this.entries.get(record.texture)
    if (
      record.generation !== this.generation.token ||
      entry?.phase !== 'ready' ||
      entry.busy ||
      entry.record !== record
    ) {
      throw new WebGLOperationError(
        'borrow texture',
        record.texture.label,
        'foreign or unavailable texture record'
      )
    }
  }

  /**
   * 先完成依赖屏障再删除存储；成功步骤不在重试时重放。
   * @remarks
   * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
   * building/删除中的重入必须抛未完成，Resource 才能保留 pending listener。
   * 此入口不调用 assertAvailable，coordinator 关闭后仍须能清理。
   */
  release(texture: TextureResource): void {
    if (this.abandonIfLost()) return
    const entry = this.entries.get(texture)
    if (!entry) return
    entry.phase = 'retiring'
    if (entry.busy) throw this.busyFailure(entry.label)
    entry.busy = true
    try {
      if (entry.record !== null) {
        const record = entry.record
        if (!entry.dependencyReleased) {
          if (!this.cleanupStep(entry, 'gpu-dependency', () => this.hooks.beforeDelete(record)))
            return
          entry.dependencyReleased = true
        }
        if (!this.cleanupStep(entry, 'gpu-delete', () => this.gl.deleteTexture(record.handle)))
          return
        entry.record = null
      }
      entry.unsubscribe()
      this.entries.delete(texture)
    } finally {
      entry.busy = false
      this.hooks.invalidateState()
    }
  }

  /** 封闭共享 guard；只放弃旧代账本，不向失效或恢复后的 context 发删除。 */
  invalidateForContextLoss(): void {
    this.generation.invalidate()
    for (const entry of this.entries.values()) {
      entry.unsubscribe()
      entry.record = null
    }
    this.entries.clear()
    this.hooks.invalidateState()
  }

  /** 关闭正常入口，再逐项清理；失败保持关闭，显式重试继续剩余条目。 */
  dispose(): void {
    this.closing = true
    if (this.abandonIfLost()) return
    if (this.disposing) throw this.busyFailure('dispose')
    this.disposing = true
    try {
      for (const texture of [...this.entries.keys()]) this.release(texture)
    } finally {
      this.disposing = false
    }
  }

  private assertAvailable(): void {
    if (this.closing) throw new WebGLBackendDisposedError('get texture')
    if (this.abandonIfLost()) throw new WebGLContextLostError('get texture')
    this.hooks.assertAvailable()
  }
  private assertBuilding(entry: Entry): void {
    this.assertAvailable()
    entry.texture.assertUsable()
    if (entry.phase !== 'building' || this.entries.get(entry.texture) !== entry)
      throw new WebGLBackendDisposedError('create texture after release')
  }
  private abandonIfLost(): boolean {
    if (!this.generation.lost) return false
    this.invalidateForContextLoss()
    return true
  }
  private cleanupStep(
    entry: Entry,
    phase: 'gpu-dependency' | 'gpu-delete',
    action: () => void
  ): boolean {
    if (this.abandonIfLost()) return false
    try {
      assertTextureOperation(this.gl, 'begin cleanup texture', entry.label)
      action()
      if (this.abandonIfLost()) return false
      assertTextureOperation(this.gl, 'cleanup texture', entry.label)
    } catch (cause) {
      const lost = this.abandonIfLost()
      // 纯 lost 可放弃责任；同时捕获的其他异常（包括 undefined）仍须报告。
      if (lost && cause instanceof WebGLContextLostError) return false
      throw new CleanupFailureError(entry.label, [
        {
          phase,
          label: 'texture cleanup',
          cause: lost ? preserveWebGLContextLoss(cause, 'cleanup texture') : cause
        }
      ])
    }
    return true
  }
  private busyFailure(label: string): CleanupFailureError {
    return new CleanupFailureError(label, [
      {
        phase: 'gpu-dependency',
        label: 'texture cleanup completion',
        cause: new Error('Texture operation is still running')
      }
    ])
  }
}
