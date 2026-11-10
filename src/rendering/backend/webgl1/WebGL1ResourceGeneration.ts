import { WebGLContextLostError } from '@/rendering/core/errors'

/**
 * 同一个 ResourceManager 内存储与 FBO Managers 共用的代次守卫。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 * 任一使用者观察到物理 lost，或生命周期显式 invalidate 后，本实例永久失效。
 * 物理 context 恢复不会使旧记录复活；恢复必须创建新的 guard 和 Managers。
 * token 只表达分配代次身份，不保存 GPU handle，也不证明像素已生产。
 */
export class WebGL1ResourceGeneration {
  private readonly gl: WebGLRenderingContext
  public readonly token = Symbol('WebGL1ResourceGeneration')
  private lostValue = false

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
  }

  /** 观察物理 lost 会锁存；已失效时无需再查询可恢复的物理标记。 */
  get lost(): boolean {
    if (!this.lostValue && this.gl.isContextLost()) this.lostValue = true
    return this.lostValue
  }

  /** 只关闭本代使用入口；无 GL 命令、外部回调或自动恢复。 */
  invalidate(): void {
    this.lostValue = true
  }

  /** 每条资源 GL 命令前和候选发布前调用；失效后不允许继续使用旧记录。 */
  assertCurrent(operation: string): void {
    if (this.lost) throw new WebGLContextLostError(operation)
  }
}

/**
 * C3 内部同步协作点，不是应用事件。
 *
 * @remarks
 * invalidateState 只清 CPU 状态缓存，不发 GL、不抛错、不重入。
 * assertAvailable 检查 coordinator 的 closing/lost，允许抛出领域错误。
 * 清理路径不调用 assertAvailable，以便整体关闭后继续完成剩余责任。
 */
export interface WebGL1StorageManagerHooks {
  readonly invalidateState: () => undefined
  readonly assertAvailable: () => void
}

/**
 * 为既有资源 Manager 的冷路径逐条检查 GL 调用，不替换 Backend 的 draw context。
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 * native 方法仍以原 context 为 this。create* 的返回 handle 必须先由调用者记账，
 * 再立即 assertCurrent；其他操作在返回后也检查，阻断同步重入失效后的后续命令。
 * isContextLost 始终允许查询，以便物理失效与永久代次守卫保持不同含义。
 * 此包装不拥有 handle，不缓存资源，也不拦截扩展对象的方法。
 */
export function guardWebGL1ResourceContext(
  gl: WebGLRenderingContext,
  generation: WebGL1ResourceGeneration
): WebGLRenderingContext {
  return new Proxy(gl, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      return (...args: unknown[]): unknown => {
        if (key !== 'isContextLost') generation.assertCurrent(String(key))
        const result: unknown = Reflect.apply(value, target, args)
        if (
          key !== 'isContextLost' &&
          key !== 'createTexture' &&
          key !== 'createFramebuffer' &&
          key !== 'createRenderbuffer'
        )
          generation.assertCurrent(String(key))
        return result
      }
    }
  })
}

/**
 * 清空旧代账本后仍保留上传/恢复的原始失败；单独 lost 保持专用错误类型。
 * @remarks
 * [DESIGN-WEIGHT:3][texture-upload-state-recovery]
 * helper 产生的 AggregateError 已包含 lost 时原样传播，避免重包装丢失 cause。
 */
export function preserveWebGLContextLoss(cause: unknown, operation: string): unknown {
  if (cause instanceof WebGLContextLostError) return cause
  if (
    cause instanceof AggregateError &&
    cause.errors.some((entry: unknown) => entry instanceof WebGLContextLostError)
  )
    return cause
  return new AggregateError(
    [cause, new WebGLContextLostError(operation)],
    operation + ' failed during context loss'
  )
}
