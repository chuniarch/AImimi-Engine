import { assertNever } from '@/errors/helper/helpers'
import { WebGLContextLostError } from '@/rendering/core/errors'
import type { CullMode, DepthFunction, RenderState } from '@/rendering/resources/Material'

/** State 只借用 Manager 已验证的 GPU framebuffer 和实际附件尺寸。 */
export interface WebGL1SurfaceResource {
  readonly framebuffer: WebGLFramebuffer
  readonly width: number
  readonly height: number
}

/** 从本 State 所属 context 捕获的同步作用域快照，不拥有 framebuffer。 */
export interface SurfaceStateSnapshot {
  readonly framebuffer: WebGLFramebuffer | null
  readonly viewport: readonly [number, number, number, number]
}

/**
 * 当前 context 的局部状态缓存；不属于 CPU Resource，也不创建或删除 GPU 资源。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-state-unknown-versus-unbound]
 *
 * undefined 表示缓存未知，null 表示已知没有绑定对象。不能混用，否则首次
 * useProgram(null) 可能错误地跳过实际解绑。
 * 调用者须提供本 context 中合法、存活的 GPU 对象和已验证的 RenderState。
 * WebGL API 错误通常通过 gl.getError 暴露；本类不是 GPU 对象合法性验证器。
 * 若其他内部 Manager 绕过缓存改状态或删除缓存引用的对象，必须使相应缓存失效。
 */
export class WebGL1State {
  private readonly gl: WebGLRenderingContext

  private programValue: WebGLProgram | null | undefined
  private arrayBufferValue: WebGLBuffer | null | undefined
  private elementArrayBufferValue: WebGLBuffer | null | undefined
  private depthTestValue: boolean | undefined
  private depthWriteValue: boolean | undefined
  private depthFunctionValue: DepthFunction | undefined
  private cullModeValue: CullMode | undefined

  /** 构造不猜测现有 GL 状态，也不发 GL 命令。 */
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
  }

  /** 只有缓存明确等于目标 program 时才省略 useProgram。 */
  useProgram(program: WebGLProgram | null): void {
    this.assertContextAvailable('use program')

    if (this.programValue === program) return

    this.gl.useProgram(program)
    this.programValue = program
  }

  /** ARRAY_BUFFER 是 context 状态；相同对象绑定可去重。 */
  bindArrayBuffer(buffer: WebGLBuffer | null): void {
    this.assertContextAvailable('bind array buffer')

    if (this.arrayBufferValue === buffer) return

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
    this.arrayBufferValue = buffer
  }

  /** 只在当前 vertex-input 状态未切换的前提下去重。 */
  bindElementArrayBuffer(buffer: WebGLBuffer | null): void {
    this.assertContextAvailable('bind element array buffer')

    if (this.elementArrayBufferValue === buffer) return

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer)
    this.elementArrayBufferValue = buffer
  }

  /**
   * VAO bind/unbind 后由 VertexInputManager 调用，不能忘记。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-element-buffer-vao-invalidation]
   * ELEMENT_ARRAY_BUFFER 绑定属于 VAO。切到另一个 VAO 后，即使 buffer 参数相同，
   * 也不能沿用上一个 VAO 的缓存判断。本方法不创建或切换 VAO。
   */
  invalidateVertexInputState(): void {
    this.elementArrayBufferValue = undefined
  }

  /**
   * 分别比较深度测试、写入与比较函数，只提交与可信缓存不同的配置。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-state-unknown-versus-unbound]
   *
   * 当前采用「读 JavaScript 缓存 → 与期望值比较 → 仅设置变化项」，
   * 不采用「每次查询真实 GL 状态 → 同步缓存 → 比较期望值 → 设置变化项」。
   * 后一种方案确实能发现所查询字段被外部修改，不是逻辑上不可行；
   * 但每次调用都查询 DEPTH_TEST、DEPTH_WRITEMASK、DEPTH_FUNC，会把缓存命中
   * 也变成 GL 查询。例如一帧调用本方法 1000 次，就额外产生 3000 次查询。
   * 查询具有 API 调用成本，且可能涉及实现层的同步等待；具体成本取决于参数
   * 和浏览器，不能笼统声称每次布尔查询都必须等待整个 GPU 完成。
   *
   * 省略查询的正确性前提是：受管理的状态通过本 State 修改；若内部模块必须
   * 绕过它调用原生 GL，则该模块必须在后续使用缓存前使相关缓存失效。
   * 例如缓存记为 depthTest=true，而外部执行 gl.disable(DEPTH_TEST)，
   * 若没有 invalidate，本方法再次收到 true 就会错误地省略 enable。
   * 因此缓存不能自动容忍任意外部修改；不能仅以性能为由忽略这项前提。
   *
   * assertContextAvailable 必须保留：它发现 lost 时才失效缓存并抛错，
   * 健康 context 下不会清空缓存，也不能检测外部绕过 State 的状态修改。
   * 不应在每次调用开头无条件 invalidate，否则三项配置都会重新提交，失去去重意义。
   *
   * 查询真实 framebuffer/viewport 的 captureSurfaceState 用于记录作用域入口，
   * 与逐 draw 查询深度配置不是同一种使用频率和职责。可在受控边界或开发诊断中
   * 核对真实状态，但本方法目前没有实现这样的诊断模式。
   * 若未来加入深度核对，DEPTH_FUNC 返回 GL 数值枚举，须经映射后比较，
   * 不能直接与缓存中的 'less-equal' 等逻辑字符串比较。
   *
   * @param state 已由 Material 验证的完整状态；这里只应用三个深度字段，
   * cullMode 由 setCullMode 单独处理。
   */
  setDepthState(state: RenderState): void {
    this.assertContextAvailable('set depth state')

    const depthFunction = this.toDepthFunction(state.depthFunction)

    if (this.depthTestValue !== state.depthTest) {
      if (state.depthTest) this.gl.enable(this.gl.DEPTH_TEST)
      else this.gl.disable(this.gl.DEPTH_TEST)
      this.depthTestValue = state.depthTest
    }

    if (this.depthWriteValue !== state.depthWrite) {
      this.gl.depthMask(state.depthWrite)
      this.depthWriteValue = state.depthWrite
    }

    if (this.depthFunctionValue !== state.depthFunction) {
      this.gl.depthFunc(depthFunction)
      this.depthFunctionValue = state.depthFunction
    }
  }

  /** none 禁用剔除；back/front 必须启用剔除并指定相应面。 */
  setCullMode(mode: CullMode): void {
    this.assertContextAvailable('set cull mode')

    if (this.cullModeValue === mode) return

    switch (mode) {
      case 'none': {
        this.gl.disable(this.gl.CULL_FACE)
        break
      }
      case 'front': {
        this.gl.enable(this.gl.CULL_FACE)
        this.gl.cullFace(this.gl.FRONT)
        break
      }
      case 'back': {
        this.gl.enable(this.gl.CULL_FACE)
        this.gl.cullFace(this.gl.BACK)
        break
      }
      default:
        assertNever(mode, 'Unsupported WebGL1 cull mode')
    }

    this.cullModeValue = mode
  }

  /**
   * 查询真实 framebuffer/viewport，而不是猜测它们等于 canvas 默认值。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
   * 两处断言依据固定 pname 的 WebGL 返回协议；不是对调用者输入的断言。
   * 查询后再次检查 lost，避免消费丢失期间返回的无效结果。
   * viewport 被复制成冻结 tuple；不冻结 framebuffer 这个浏览器对象。
   */
  captureSurfaceState(): SurfaceStateSnapshot {
    this.assertContextAvailable('capture surface')

    const framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null

    const viewport = this.gl.getParameter(this.gl.VIEWPORT) as Int32Array

    this.assertContextAvailable('capture surface')

    const copiedViewport: readonly [number, number, number, number] = Object.freeze([
      viewport[0]!,
      viewport[1]!,
      viewport[2]!,
      viewport[3]!
    ])

    return Object.freeze({ framebuffer, viewport: copiedViewport })
  }

  /**
   * 绑定已解析的 GPU 目标；null 在这个内部 API 中明确表示默认 framebuffer。
   *
   * @remarks
   * 这不是公开 RenderSurface 的 null 占位：逻辑资源必须先由 Manager 验证并解析。
   * 总是发出 framebuffer 与 viewport 调用，避免资源创建过程改变绑定后缓存失真。
   * 默认目标使用 gl.drawingBufferWidth/Height，而不是 CSS 尺寸。
   */
  bindSurface(resource: WebGL1SurfaceResource | null): void {
    this.assertContextAvailable('bind surface')

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, resource === null ? null : resource.framebuffer)
    this.gl.viewport(
      0,
      0,
      resource === null ? this.gl.drawingBufferWidth : resource.width,
      resource === null ? this.gl.drawingBufferHeight : resource.height
    )
  }

  /**
   * 临时切换输出目标结束后，恢复进入前的 framebuffer 绑定与 viewport。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
   *
   * 这里的 restore 是「恢复临时改变的输出绑定」，不是「恢复丢失的 context」。
   * 正常绘制也需要它：例如进入前绑定默认 framebuffer，viewport 为 800 × 600；
   * 临时绑定 256 × 256 的离屏目标并绘制；最后恢复进入前捕获的绑定与 viewport。
   * 进入前也可能绑定另一个离屏 framebuffer，因此不能一律绑定 null 回到屏幕。
   * 本方法只恢复这两个状态，不恢复 program、深度状态等全部 GL 状态，
   * 也不回滚已经写入附件的像素。
   *
   * 调用者应在切换前捕获快照，把目标解析、绑定和绘制放进 try，
   * 再在 finally 中调用本方法。这样普通绘制异常也会经过绑定恢复。
   * 本方法自身不捕获快照、不执行绘制，也不会自动建立这个 try/finally 作用域。
   * 当前单元测试演示了这种调用；正式 Backend 编排属于 Task 15 的
   * RenderBackend.withRenderSurface 实现，不是本 State 已接入的生产调用链。
   *
   * 如果进入 finally 时 context 已经 lost，旧 GPU handles 已失效，
   * 无法靠重新 bindFramebuffer 完成恢复。此时仅调用 invalidate 遗忘本地缓存，
   * 不发送绑定或 viewport 命令，也不额外抛错遮蔽外层 draw 的原始异常。
   * 这里的 return 只退出本方法，不会吞掉外层 try 已经抛出的异常；
   * 也不表示输出绑定已恢复，或 context 已恢复。
   *
   * 浏览器之后的 webglcontextrestored 事件走独立的生命周期流程；
   * 引擎的能力重探测、State/Manager 重建和 GPU 资源恢复由 Backend 协调，
   * 不由本方法执行。即使浏览器后来恢复了 context，也不能再拿旧快照来恢复。
   *
   * 快照只允许用于同一 context、同一次有效 context 生命周期内的同步作用域。
   * 调用者须保证期间没有跨 await，也没有释放或 resize 快照借用的外层目标。
   * 本方法的 isContextLost 检查不验证跨恢复周期的快照，因此不能代替这些前提。
   *
   * @param snapshot 本次同步作用域进入前捕获的 framebuffer 引用和 viewport 数值。
   * 它不是 GPU 资源备份，不拥有 framebuffer，也不能用于重建失效的附件。
   */
  restoreSurfaceState(snapshot: SurfaceStateSnapshot): void {
    if (this.gl.isContextLost()) {
      this.invalidate()
      return
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, snapshot.framebuffer)
    this.gl.viewport(...snapshot.viewport)
  }

  /**
   * 遗忘全部已缓存状态，但不把 GPU 重置成任何默认值，也不调用 delete*。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-state-invalidation-not-reset]
   * 下次设置即使传相同值也重新发 GL 命令。context lost 或外部受控状态修改时使用。
   */
  invalidate(): void {
    this.programValue = undefined
    this.arrayBufferValue = undefined
    this.elementArrayBufferValue = undefined
    this.depthTestValue = undefined
    this.depthWriteValue = undefined
    this.depthFunctionValue = undefined
    this.cullModeValue = undefined
  }

  /** Backend 仍须检查生命周期 ready；这里仅补充浏览器已丢失 context 的防线。 */
  private assertContextAvailable(operation: string): void {
    if (this.gl.isContextLost()) {
      this.invalidate()
      throw new WebGLContextLostError(operation)
    }
  }

  /** 使用 default + assertNever，增加枚举成员时编译器会要求补齐映射。 */
  private toDepthFunction(value: DepthFunction): number {
    switch (value) {
      case 'less': {
        return this.gl.LESS
      }
      case 'less-equal': {
        return this.gl.LEQUAL
      }
      case 'always': {
        return this.gl.ALWAYS
      }

      default:
        assertNever(value, 'Unsupported WebGL1 depth function')
    }
  }
}
