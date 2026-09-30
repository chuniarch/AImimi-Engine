import type {
  ClearDescriptor,
  RenderSurface,
  RenderSurfaceScopeDescriptor
} from '@/rendering/backend/RenderSurface'
import {
  RenderTargetUnavailableError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLContextLostError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { WebGL1State, type SurfaceStateSnapshot, type WebGL1SurfaceResource } from './WebGL1State'

/**
 * 由 WebGL1Backend 接线的内部协作点，不对应用层开放。
 *
 * @remarks
 * 每个 context generation 创建自己的 Scope 与 State。
 * isCurrent 比较创建时那一代的身份，不能只返回 !gl.isContextLost()。
 * resolveTarget 必须返回当前 context 的完整 GPU 目标；不在这里另建资源缓存。
 */
export interface WebGL1SurfaceScopeHooks {
  readonly assertReady: () => undefined
  readonly isCurrent: () => boolean
  readonly resolveTarget: (target: RenderTarget) => WebGL1SurfaceResource
}

/** 每层记录逻辑目标版本和 drawing buffer 尺寸，不取得资源所有权。 */
interface ActiveScope {
  readonly target: RenderTarget | null
  readonly revision: number
  readonly drawingWidth: number
  readonly drawingHeight: number
}

/** 错误包含操作、字段和原因；不用裸 Error 隐藏设备上下文。 */
function invalid(field: string, reason: string): never {
  throw new WebGLOperationError('enter surface scope', field, reason)
}

/** 先检查外层形状和未知字段；字段值仍保持 unknown。 */
function record(
  value: unknown,
  allowed: readonly string[],
  field: string
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(field, 'must be a non-array object')
  }

  const input = value as Readonly<Record<string, unknown>>

  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) invalid(field + '.' + key, 'unknown field')
  }

  return input
}

/** 不把数值字符串、NaN、Infinity 或 Float32 溢出值交给 WebGL。 */
function finiteFloat(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isFinite(Math.fround(value))
  ) {
    invalid(field, 'must be representable as a finite Float32')
  }

  return value
}

/**
 * 在发出 GL 命令前，验证并复制本次 scope 的调用输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][surface-entry-clear-once]
 * 复制容器和数值，但只借用 RenderTarget。不会冻结调用者的对象。
 * 只把 undefined 视为省略，null 仍是非法输入。
 */
function snapshot(value: unknown): {
  readonly surface: RenderSurface
  readonly clear: ClearDescriptor
} {
  const input = record(value, ['surface', 'clear'], 'scope')
  const source = record(input.surface, ['kind', 'target'], 'surface')
  let surface: RenderSurface

  switch (source.kind) {
    case 'default-framebuffer': {
      if ('target' in source) invalid('surface.target', 'not allowed for default framebuffer')
      surface = { kind: 'default-framebuffer' }
      break
    }

    case 'render-target': {
      if (!(source.target instanceof RenderTarget)) {
        invalid('surface.target', 'must reference a RenderTarget')
      }

      if (source.target.disposed) throw new ResourceDisposedError('RenderTarget')

      surface = { kind: 'render-target', target: source.target }
      break
    }

    default:
      invalid('surface.kind', 'unsupported destination')
  }

  const raw: Readonly<Record<string, unknown>> =
    input.clear === undefined ? {} : record(input.clear, ['color', 'depth', 'stencil'], 'clear')

  let color: ClearDescriptor['color']

  if (raw.color !== undefined) {
    if (!Array.isArray(raw.color) || raw.color.length !== 4) {
      invalid('clear.color', 'must contain exactly four numbers')
    }

    const values: readonly unknown[] = raw.color

    color = Object.freeze([
      finiteFloat(values[0], 'clear.color[0]'),
      finiteFloat(values[1], 'clear.color[1]'),
      finiteFloat(values[2], 'clear.color[2]'),
      finiteFloat(values[3], 'clear.color[3]')
    ])
  }

  let depth: number | undefined

  if (raw.depth !== undefined) {
    depth = finiteFloat(raw.depth, 'clear.depth')
    if (depth < 0 || depth > 1) invalid('clear.depth', 'must be in [0, 1]')
  }

  let stencil: number | undefined

  if (raw.stencil !== undefined) {
    stencil = finiteFloat(raw.stencil, 'clear.stencil')

    if (!Number.isInteger(stencil) || stencil < -2147483648 || stencil > 2147483647) {
      invalid('clear.stencil', 'must be a signed 32-bit integer')
    }
  }

  return Object.freeze({
    surface: Object.freeze(surface),
    clear: Object.freeze({ color, depth, stencil })
  })
}

/**
 * 实现 Backend 内部的同步 surface 范围；不创建资源、不上传 uniform、不 draw。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]
 * 只保存/恢复 framebuffer 和 viewport。入口 clear 临时改变的写掩码、
 * scissor 和 dithering 由 clearAttachments 自己恢复。
 * scope 退出不 dispose RenderTarget，也不回滚已写入的像素。
 */
export class WebGL1SurfaceScope {
  private readonly stack: ActiveScope[] = []

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly state: WebGL1State,
    private readonly hooks: WebGL1SurfaceScopeHooks
  ) {}

  /** Backend 用它禁止活动 scope 中修改 drawing buffer 或执行破坏性设备清理。 */
  get active(): boolean {
    return this.stack.length > 0
  }

  /**
   * 执行一次完整 scope；异常时仍尝试恢复，嵌套时恢复到对应入口。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
   * capture 必须早于 resolveTarget，因为首次创建 FBO 可能改变实际绑定。
   * 每次 run 只执行一次入口 clear，finally 只恢复，不重新进入外层 scope。
   *
   * 若操作与恢复都失败，AggregateError.errors 依次保留操作错误、恢复错误。
   * 单独的操作错误仍原样抛出；独立布尔值避免漏掉 throw undefined。
   * 这是 Scope 的异常策略，不改变 Resource.dispose listener 的待定策略。
   */
  run(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void {
    this.assertAvailable()
    this.assertUnchanged()

    const next = snapshot(descriptor)

    if (typeof callback !== 'function') invalid('callback', 'must be a function')

    const target = next.surface.kind === 'render-target' ? next.surface.target : null

    const frame: ActiveScope = {
      target,
      revision: target === null ? 0 : target.revision,
      drawingWidth: this.gl.drawingBufferWidth,
      drawingHeight: this.gl.drawingBufferHeight
    }

    const previous = this.state.captureSurfaceState()
    let failed = false
    let failure: unknown

    this.stack.push(frame)

    try {
      const resource = target === null ? null : this.hooks.resolveTarget(target)

      this.assertDrawable()
      this.state.bindSurface(resource)
      this.clearAttachments(next.clear)
      this.assertDrawable()

      const result: unknown = callback()

      if (result !== undefined) invalid('callback', 'must return undefined synchronously')

      this.assertDrawable()
    } catch (error: unknown) {
      failed = true
      failure = error
    } finally {
      this.stack.pop()

      try {
        this.restoreEntry(previous)
      } catch (restoreError: unknown) {
        failure = failed
          ? new AggregateError([failure, restoreError], 'Surface operation and restoration failed')
          : restoreError
        failed = true
      }
    }

    if (failed) throw failure
  }

  /**
   * Backend 每次 draw 前调用；不是 draw 本身。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][surface-active-resource-boundary]
   * 检查全部活动祖先，而不只检查当前目标。
   * 能检测违规修改，但不能拦截或撤销外部直接执行的 resize/dispose。
   */
  assertDrawable(): void {
    this.assertAvailable()

    if (!this.active) invalid('draw', 'requires an active surface scope')

    this.assertUnchanged()
  }

  /**
   * 恢复入口状态；独立方法让恢复失败在 run 的 finally 内被显式收集。
   * 已删除的 framebuffer 不能重绑，也不能静默替换成默认输出。
   */
  private restoreEntry(previous: SurfaceStateSnapshot): void {
    if (!this.hooks.isCurrent() || this.gl.isContextLost()) {
      this.state.invalidate()
      return
    }

    this.assertUnchanged()

    if (previous.framebuffer !== null && !this.gl.isFramebuffer(previous.framebuffer)) {
      throw new RenderTargetUnavailableError('scope entry', 'framebuffer was deleted')
    }

    this.state.restoreSurfaceState(previous)
  }

  /** Backend 生命周期检查与浏览器物理 lost 检查缺一不可。 */
  private assertAvailable(): void {
    this.hooks.assertReady()

    if (!this.hooks.isCurrent() || this.gl.isContextLost()) {
      throw new WebGLContextLostError('use surface scope')
    }
  }

  /** 跨 await、目标销毁/改尺寸、canvas 改尺寸都不属于合法 scope 行为。 */
  private assertUnchanged(): void {
    for (const frame of this.stack) {
      if (
        this.gl.drawingBufferWidth !== frame.drawingWidth ||
        this.gl.drawingBufferHeight !== frame.drawingHeight
      ) {
        throw new RenderTargetUnavailableError('drawing buffer', 'resized inside an active scope')
      }

      if (
        frame.target !== null &&
        (frame.target.disposed || frame.target.revision !== frame.revision)
      ) {
        throw new RenderTargetUnavailableError('active scope', 'target was disposed or resized')
      }
    }
  }

  /**
   * 对指定附件执行完整清除，不继承上一次 draw 的局部写入限制。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][surface-clear-write-masks]
   * WebGL clear 受 color/depth/stencil write mask 与 scissor 影响。
   * 临时启用所需写入并关闭 scissor/dithering，随后恢复真实入口状态，
   * 所以不会让 WebGL1State 的 depthWrite 缓存与实际状态分离。
   * 本方法不恢复 clearColor/clearDepth/clearStencil 设置，也不承诺恢复全部 GL 状态。
   * getParameter 的断言依照固定 pname 的 WebGL 返回协议，不用于信任外部输入。
   */
  private clearAttachments(clear: ClearDescriptor): void {
    const gl = this.gl
    const { color, depth, stencil } = clear

    let bits = 0

    if (color !== undefined) bits |= gl.COLOR_BUFFER_BIT
    if (depth !== undefined) bits |= gl.DEPTH_BUFFER_BIT
    if (stencil !== undefined) bits |= gl.STENCIL_BUFFER_BIT
    if (bits === 0) return

    if (depth !== undefined && gl.getParameter(gl.DEPTH_BITS) === 0) {
      throw new UnsupportedRenderFeatureError('depth clear', 'surface has no depth attachment')
    }

    if (stencil !== undefined && gl.getParameter(gl.STENCIL_BITS) === 0) {
      throw new UnsupportedRenderFeatureError('stencil clear', 'surface has no stencil attachment')
    }

    const colorMask =
      color === undefined
        ? undefined
        : (gl.getParameter(gl.COLOR_WRITEMASK) as readonly [boolean, boolean, boolean, boolean])

    const depthMask =
      depth === undefined ? undefined : (gl.getParameter(gl.DEPTH_WRITEMASK) as boolean)

    const frontMask =
      stencil === undefined ? undefined : (gl.getParameter(gl.STENCIL_WRITEMASK) as number)

    const backMask =
      stencil === undefined ? undefined : (gl.getParameter(gl.STENCIL_BACK_WRITEMASK) as number)

    const scissor = gl.isEnabled(gl.SCISSOR_TEST)
    const dither = gl.isEnabled(gl.DITHER)

    this.assertAvailable()

    try {
      if (scissor) gl.disable(gl.SCISSOR_TEST)
      if (dither) gl.disable(gl.DITHER)

      if (color !== undefined) {
        gl.colorMask(true, true, true, true)
        gl.clearColor(...color)
      }

      if (depth !== undefined) {
        gl.depthMask(true)
        gl.clearDepth(depth)
      }

      if (stencil !== undefined) {
        gl.stencilMask(0xffffffff)
        gl.clearStencil(stencil)
      }

      gl.clear(bits)
      this.assertAvailable()
    } finally {
      if (this.hooks.isCurrent() && !gl.isContextLost()) {
        if (colorMask !== undefined) gl.colorMask(...colorMask)
        if (depthMask !== undefined) gl.depthMask(depthMask)
        if (frontMask !== undefined) gl.stencilMaskSeparate(gl.FRONT, frontMask)
        if (backMask !== undefined) gl.stencilMaskSeparate(gl.BACK, backMask)
        if (scissor) gl.enable(gl.SCISSOR_TEST)
        if (dither) gl.enable(gl.DITHER)
      } else {
        this.state.invalidate()
      }
    }
  }
}
