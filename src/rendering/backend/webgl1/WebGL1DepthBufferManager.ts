import type { DepthBufferResource } from '@/rendering/resources/DepthBufferResource'
import {
  CleanupFailureError,
  UnsupportedRenderFeatureError,
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
import { assertTextureOperation, requireTextureLimit } from './WebGL1TextureUploadSupport'

/** 本次同步 Backend 操作借用的 depth16 存储；不能跨 release/lost 使用旧 record。 */
export interface WebGL1DepthBufferResource {
  readonly depth: DepthBufferResource
  readonly generation: symbol
  readonly handle: WebGLRenderbuffer
  readonly width: number
  readonly height: number
}

export interface WebGL1DepthBufferOwnerHooks extends WebGL1StorageManagerHooks {
  /**
   * 正常返回表示这个具体 record 的全部 FBO 借用已经结束；忙碌或失败必须抛错。
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   * 后续由 coordinator 连接 Target Manager 的 releaseDepthBuffer(record)。
   */
  readonly beforeDelete: (record: WebGL1DepthBufferResource) => undefined
}

interface Entry {
  readonly depth: DepthBufferResource
  readonly label: string
  phase: 'building' | 'ready' | 'retiring'
  busy: boolean
  record: WebGL1DepthBufferResource | null
  unsubscribe: () => void
  dependencyReleased: boolean
}

/**
 * 一个 generation 内 DepthBufferResource 的唯一 depth16 renderbuffer owner。
 * @remarks
 * [DESIGN-WEIGHT:3][depth-buffer-owned-storage]
 * 同一对象只分配一次，不以 label 合并，不操作 texture，不隐式 resize。
 * 分配前登记候选和 C0 listener；失败后保留 handle、订阅及已完成的依赖步骤。
 * Manager 只释放 GPU 表示，不 dispose CPU、不增加 Scene 引用数。
 */
export class WebGL1DepthBufferManager {
  private readonly entries = new Map<DepthBufferResource, Entry>()
  private readonly ownedRecords = new WeakSet<WebGL1DepthBufferResource>()
  private closing = false
  private disposing = false

  /** 构造不发 GL；调用方必须显式提供 generation 与依赖删除屏障。 */
  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly generation: WebGL1ResourceGeneration,
    private readonly hooks: WebGL1DepthBufferOwnerHooks
  ) {
    this.gl = guardWebGL1ResourceContext(gl, generation)
  }

  /** ready 命中不重新分配；回滚遗留项清完前不允许创建第二候选。 */
  get(depth: DepthBufferResource): WebGL1DepthBufferResource {
    this.assertAvailable()
    depth.assertUsable()
    const cached = this.entries.get(depth)
    if (cached?.busy)
      throw new WebGLOperationError(
        'get depth buffer',
        depth.label,
        'depth operation is already running'
      )
    if (cached?.phase === 'ready' && cached.record !== null) return cached.record
    if (cached) {
      this.release(depth)
      this.assertAvailable()
      depth.assertUsable()
    }
    const entry: Entry = {
      depth,
      label: depth.label,
      phase: 'building',
      busy: true,
      record: null,
      unsubscribe: () => {},
      dependencyReleased: false
    }
    this.entries.set(depth, entry)
    const gl = this.gl
    try {
      entry.unsubscribe = depth.onDispose(() => this.release(depth))
      const width = depth.width,
        height = depth.height
      assertTextureOperation(gl, 'begin depth allocation', entry.label)
      const maximum = requireTextureLimit(gl, gl.MAX_RENDERBUFFER_SIZE, 'MAX_RENDERBUFFER_SIZE')
      if (width > maximum || height > maximum)
        throw new UnsupportedRenderFeatureError(
          'depth buffer ' + entry.label,
          'dimensions exceed MAX_RENDERBUFFER_SIZE'
        )
      assertTextureOperation(gl, 'validate depth allocation', entry.label)
      this.assertBuilding(entry)
      this.withRenderbufferBinding(entry.label, () => {
        this.assertBuilding(entry)
        const handle = gl.createRenderbuffer()
        // 先纳入责任，再检查 create 返回期间的同步失效/关闭。
        if (handle !== null)
          entry.record = Object.freeze({
            depth,
            generation: this.generation.token,
            handle,
            width,
            height
          })
        if (entry.record !== null) this.ownedRecords.add(entry.record)
        this.generation.assertCurrent('create depth renderbuffer')
        if (handle === null) throw new WebGLResourceCreationError('depth renderbuffer', entry.label)
        assertTextureOperation(gl, 'create depth renderbuffer', entry.label)
        this.assertBuilding(entry)
        gl.bindRenderbuffer(gl.RENDERBUFFER, handle)
        // 绑定若失败，不能让 storage 命令覆盖调用者原来绑定的 RBO。
        assertTextureOperation(gl, 'bind depth renderbuffer', entry.label)
        this.assertBuilding(entry)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
        assertTextureOperation(gl, 'allocate depth storage', entry.label)
        this.assertBuilding(entry)
      })
      this.assertBuilding(entry)
      if (entry.record === null)
        throw new WebGLResourceCreationError('depth renderbuffer', entry.label)
      entry.phase = 'ready'
      return entry.record
    } catch (cause) {
      entry.phase = 'retiring'
      entry.busy = false
      if (this.generation.lost) {
        this.invalidateForContextLoss()
        throw preserveWebGLContextLoss(cause, 'create depth buffer')
      }
      try {
        this.release(depth)
      } catch (cleanup) {
        throw new AggregateError([cause, cleanup], 'Depth creation and rollback failed')
      }
      if (this.generation.lost) throw preserveWebGLContextLoss(cause, 'rollback depth buffer')
      throw cause
    } finally {
      entry.busy = false
      this.hooks.invalidateState()
    }
  }

  /** 只验证来源身份；允许 retiring/已释放记录，不证明记录仍可使用。 */
  assertRecordOwned(record: WebGL1DepthBufferResource): void {
    if (!this.ownedRecords.has(record))
      throw new WebGLOperationError('release dependent FBOs', 'depth', 'foreign storage record')
  }

  /** 无分配地检查 CPU、generation、Manager 与具体 ready record 的身份。 */
  assertRecordUsable(record: WebGL1DepthBufferResource): void {
    this.assertAvailable()
    record.depth.assertUsable()
    const entry = this.entries.get(record.depth)
    if (
      record.generation !== this.generation.token ||
      entry?.phase !== 'ready' ||
      entry.busy ||
      entry.record !== record
    ) {
      throw new WebGLOperationError(
        'borrow depth buffer',
        record.depth.label,
        'foreign or unavailable depth record'
      )
    }
  }

  /**
   * 先清依赖再删除 RBO；成功步骤不重放，失败保留责任等待显式重试。
   * @remarks
   * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
   * 忙碌时先标 retiring 再抛未完成，不能让创建继续发布或 C0 提前 complete。
   * 清理不检查 coordinator 的正常入口，整体关闭后仍能推进剩余工作。
   */
  release(depth: DepthBufferResource): void {
    if (this.abandonIfLost()) return
    const entry = this.entries.get(depth)
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
        if (!this.cleanupStep(entry, 'gpu-delete', () => this.gl.deleteRenderbuffer(record.handle)))
          return
        entry.record = null
      }
      entry.unsubscribe()
      this.entries.delete(depth)
    } finally {
      entry.busy = false
      this.hooks.invalidateState()
    }
  }

  /** 永久封闭共享 generation，只退订并丢弃旧代账本，不发删除或恢复绑定。 */
  invalidateForContextLoss(): void {
    this.generation.invalidate()
    for (const entry of this.entries.values()) {
      entry.unsubscribe()
      entry.record = null
    }
    this.entries.clear()
    this.hooks.invalidateState()
  }

  /** 开始关闭后拒绝 get；失败保存未完成条目，下一次 dispose 继续。 */
  dispose(): void {
    this.closing = true
    if (this.abandonIfLost()) return
    if (this.disposing) throw this.busyFailure('dispose')
    this.disposing = true
    try {
      for (const depth of [...this.entries.keys()]) this.release(depth)
    } finally {
      this.disposing = false
    }
  }

  /**
   * 只改变 RBO 绑定的分配作用域；独立保存业务与恢复异常，包括 throw undefined。
   * @remarks
   * [DESIGN-WEIGHT:3][depth-buffer-binding-recovery]
   * sticky lost 后不重绑旧 handle。恢复失败绝不发布候选；invalidateState 只清 CPU
   * 缓存，不等于真实 GL 状态已经恢复。这里没有 FBO 操作或 FBO 恢复责任。
   */
  private withRenderbufferBinding(label: string, callback: () => void): void {
    const gl = this.gl
    const previous = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null
    assertTextureOperation(gl, 'capture renderbuffer binding', label)
    const failures: unknown[] = []
    try {
      callback()
    } catch (cause) {
      failures.push(cause)
    }
    if (!this.generation.lost) {
      try {
        gl.bindRenderbuffer(gl.RENDERBUFFER, previous)
        assertTextureOperation(gl, 'restore renderbuffer binding', label)
      } catch (cause) {
        failures.push(cause)
      }
    }
    if (this.generation.lost && !failures.some((cause) => cause instanceof WebGLContextLostError)) {
      failures.push(new WebGLContextLostError('restore renderbuffer binding'))
    }
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1)
      throw new AggregateError(failures, 'Depth allocation or binding restoration failed')
  }

  private assertAvailable(): void {
    if (this.closing) throw new WebGLBackendDisposedError('get depth buffer')
    if (this.abandonIfLost()) throw new WebGLContextLostError('get depth buffer')
    this.hooks.assertAvailable()
  }
  private assertBuilding(entry: Entry): void {
    this.assertAvailable()
    entry.depth.assertUsable()
    if (entry.phase !== 'building' || this.entries.get(entry.depth) !== entry)
      throw new WebGLBackendDisposedError('create depth buffer after release')
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
      assertTextureOperation(this.gl, 'begin cleanup depth', entry.label)
      action()
      if (this.abandonIfLost()) return false
      assertTextureOperation(this.gl, 'cleanup depth', entry.label)
    } catch (cause) {
      const lost = this.abandonIfLost()
      if (lost && cause instanceof WebGLContextLostError) return false
      throw new CleanupFailureError(entry.label, [
        {
          phase,
          label: 'depth cleanup',
          cause: lost ? preserveWebGLContextLoss(cause, 'cleanup depth') : cause
        }
      ])
    }
    return true
  }
  private busyFailure(label: string): CleanupFailureError {
    return new CleanupFailureError(label, [
      {
        phase: 'gpu-dependency',
        label: 'depth cleanup completion',
        cause: new Error('Depth operation is still running')
      }
    ])
  }
}
