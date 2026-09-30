import type { DrawSubmission, RenderBackend } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import {
  InvalidMaterialError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextCreationError,
  WebGLContextLostError,
  WebGLOperationError
} from '@/rendering/core/errors'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { detectWebGL1Capabilities } from './WebGL1Capabilities'
import {
  WebGLContextLifecycle,
  type WebGLContextFailure,
  type WebGLContextSuppressedError
} from './WebGLContextLifecycle'
import { WebGL1ResourceManager } from './WebGL1ResourceManager'
import { WebGL1State } from './WebGL1State'
import { WebGL1Uniforms } from './WebGL1Uniforms'
import { WebGL1SurfaceScope } from './WebGL1SurfaceScope'

interface Generation {
  readonly token: object
  readonly state: WebGL1State
  readonly resources: WebGL1ResourceManager
  readonly uniforms: WebGL1Uniforms
  readonly scope: WebGL1SurfaceScope
  valid: boolean
}

/**
 * 将 DrawSubmission 转换成当前 WebGL1 context 的真实绘制命令。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-backend-command-ownership]
 * 上层决定画什么、画到哪里、先后顺序；本类负责如何执行 gl.*。
 * 不遍历 Scene，不给 Material 写 modelMatrix，不拥有 CPU Resource。
 * canvas/context 应由本 Backend 独占管理，应用不能在 draw 中途插入原生 GL 调用。
 */
export class WebGL1Backend implements RenderBackend {
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGLRenderingContext
  private readonly lifecycle: WebGLContextLifecycle

  private generation: Generation
  private disposedValue = false
  private cleanupComplete = false

  /** 对象身份令牌，不是会不断增长的计数器。 */
  private epoch: object = {}

  private suppressedValue: WebGLContextSuppressedError | null = null

  /**
   * 创建 context 和当前代的 CPU 管理对象；GPU 资源仍在首次使用时创建。
   * label 仅用于诊断，不以 canvas.id 或 constructor.name 充当稳定身份。
   */
  constructor(
    canvas: HTMLCanvasElement,
    label = 'WebGL1Backend',
    attributes: WebGLContextAttributes = {}
  ) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl', {
      alpha: false,
      depth: true,
      ...attributes
    })

    if (gl === null) throw new WebGLContextCreationError(label)

    this.gl = gl
    this.generation = this.createGeneration()

    this.lifecycle = new WebGLContextLifecycle(canvas, {
      onLost: () => {
        this.invalidateGeneration()
      },

      restore: () => {
        const epoch = this.epoch
        const candidate = this.createGeneration()

        if (this.disposedValue || epoch !== this.epoch || this.gl.isContextLost()) {
          candidate.resources.invalidateForContextLoss()
          candidate.resources.dispose()

          throw new WebGLContextLostError('publish restored backend')
        }

        this.generation = candidate
      },

      onReady: () => {
        if (this.gl.isContextLost()) {
          throw new WebGLContextLostError('finish restoration')
        }
      },

      onRestoreFailed: () => {
        // 原始错误由 lifecycle.lastFailure 保存，不在 DOM listener 中继续抛出。
      },

      onSuppressedError: (error) => {
        this.suppressedValue = error
      }
    })
  }

  /** 物理 lost 可能早于事件；一旦观察到，旧代即永久失效。 */
  get ready(): boolean {
    if (this.disposedValue) return false

    if (this.gl.isContextLost()) this.invalidateGeneration()

    return this.lifecycle.isReady && this.generation.valid
  }

  /** 恢复失败是可观察状态，不会被转换成静默的 draw no-op。 */
  get lastFailure(): WebGLContextFailure | null {
    return this.lifecycle.lastFailure
  }

  /** 旧调用栈的错误供诊断使用，不覆盖当前生命周期失败。 */
  get lastSuppressedError(): WebGLContextSuppressedError | null {
    return this.suppressedValue
  }

  /**
   * 把 CSS 尺寸和像素比转换成 drawing-buffer 尺寸；不修改 canvas.style。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][drawing-buffer-resize-boundary]
   * 隐藏元素允许传 0，实际缓冲至少 1×1。先验证两个维度再赋值，避免参数
   * 无效时只修改一半；这不承诺浏览器 GPU 分配失败时能够回滚。
   */
  resizeDrawingBuffer(cssWidth: number, cssHeight: number, pixelRatio: number): void {
    const generation = this.requireGeneration('resize drawing buffer')
    this.assertOutsideScope(generation, 'resize drawing buffer')

    if (
      !Number.isFinite(cssWidth) ||
      cssWidth < 0 ||
      !Number.isFinite(cssHeight) ||
      cssHeight < 0 ||
      !Number.isFinite(pixelRatio) ||
      pixelRatio <= 0
    ) {
      throw new WebGLOperationError('resize', 'drawing buffer', 'invalid dimensions or pixel ratio')
    }

    const width = Math.max(1, Math.floor(cssWidth * pixelRatio))
    const height = Math.max(1, Math.floor(cssHeight * pixelRatio))
    const limits: unknown = this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS)

    this.requireGeneration('validate drawing-buffer size')

    if (
      !(limits instanceof Int32Array) ||
      limits.length !== 2 ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width > limits[0]! ||
      height > limits[1]!
    ) {
      throw new UnsupportedRenderFeatureError('drawing-buffer size', 'exceeds viewport limits')
    }

    if (this.canvas.width !== width) this.canvas.width = width
    if (this.canvas.height !== height) this.canvas.height = height

    generation.state.invalidate()
    this.requireGeneration('finish drawing-buffer resize')
  }

  /** Scope 负责目标绑定、入口清除，以及正常/异常/嵌套退出时的 surface 恢复。 */
  withRenderSurface(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void {
    this.requireGeneration('enter render surface').scope.run(descriptor, callback)
  }

  /**
   * 执行一次完整 draw；不把成功提交解释成 GPU 已经执行完成。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-draw-order]
   * 资源解析 → uniform 预检 → program/state → uniforms/textures → vertex input → draw。
   * 资源冷路径可能使 State 缓存失效，所以必须先解析，再应用本次 draw 的状态。
   * VertexInputManager 最后绑定 VAO/EBO，避免先前的 buffer 上传扰乱索引来源。
   */
  draw(submission: DrawSubmission): void {
    const generation = this.requireGeneration('draw')
    generation.scope.assertDrawable()

    if (
      !(submission?.item?.geometry instanceof Geometry) ||
      !(submission?.item?.material instanceof Material) ||
      submission.view === null ||
      typeof submission.view !== 'object'
    ) {
      throw new InvalidMaterialError('submission', 'invalid draw submission')
    }

    const { geometry, material } = submission.item

    const program = generation.resources.programs.get(material.shaderModule)
    const buffers = generation.resources.geometries.get(geometry)
    const commands = generation.uniforms.prepare(program, submission)

    this.assertCurrentDraw(generation)

    generation.state.useProgram(program.program)
    this.applyDrawState(material, generation.state)
    generation.uniforms.upload(commands)
    generation.resources.vertexInputs.bind(geometry, buffers, program)

    this.assertCurrentDraw(generation)

    if (buffers.indexBuffer === null) {
      this.gl.drawArrays(buffers.primitiveMode, 0, buffers.drawCount)
    } else {
      if (buffers.indexType === null) {
        throw new WebGLOperationError('draw', 'Geometry', 'index buffer has no index type')
      }

      this.gl.drawElements(buffers.primitiveMode, buffers.drawCount, buffers.indexType, 0)
    }

    this.assertCurrentDraw(generation)
  }

  /**
   * 结束 Backend 的 GPU 生命周期，不释放 Geometry/Material/Texture 等 CPU 对象。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-backend-disposal]
   * 活动 scope 中拒绝 dispose，避免删除退出时仍需恢复的 FBO。
   * 清理失败后仍禁止新 draw；再次显式 dispose 交给 ResourceManager 继续清理。
   */
  dispose(): void {
    if (this.cleanupComplete) return

    this.assertOutsideScope(this.generation, 'dispose backend')

    this.disposedValue = true
    this.epoch = {}
    this.lifecycle.dispose()

    this.generation.valid = false
    this.generation.state.invalidate()
    this.generation.resources.dispose()

    this.cleanupComplete = true
  }

  /** 创建一代独立 Manager；恢复不复活旧 handles，也不立即上传全部 CPU 资源。 */
  private createGeneration(): Generation {
    const capabilities = detectWebGL1Capabilities(this.gl)
    const state = new WebGL1State(this.gl)

    const resources = new WebGL1ResourceManager(this.gl, capabilities, {
      invalidateState: () => {
        state.invalidate()
      }
    })

    const token = {}

    const uniforms = new WebGL1Uniforms(this.gl, capabilities.maxTextureUnits, (texture) =>
      resources.cubeTextures.get(texture)
    )

    const scope = new WebGL1SurfaceScope(this.gl, state, {
      assertReady: () => {
        this.requireGeneration('use render surface')
      },

      isCurrent: () =>
        !this.disposedValue && this.generation?.token === token && this.generation.valid,

      resolveTarget: (target) => resources.renderTargets.get(target)
    })

    return { token, state, resources, uniforms, scope, valid: true }
  }

  /** 未支持的 blend/stencil/scissor 等固定关闭，不继承上一位 GL 使用者的残留值。 */
  private applyDrawState(material: Material, state: WebGL1State): void {
    const gl = this.gl

    for (const capability of [
      gl.BLEND,
      gl.STENCIL_TEST,
      gl.SCISSOR_TEST,
      gl.POLYGON_OFFSET_FILL,
      gl.SAMPLE_ALPHA_TO_COVERAGE,
      gl.SAMPLE_COVERAGE
    ]) {
      gl.disable(capability)
    }

    gl.colorMask(true, true, true, true)
    gl.depthRange(0, 1)
    gl.frontFace(gl.CCW)
    gl.lineWidth(1)

    state.setDepthState(material.state)
    state.setCullMode(material.state.cullMode)
  }

  private invalidateGeneration(): void {
    this.epoch = {}
    this.generation.valid = false
    this.generation.state.invalidate()
    this.generation.resources.invalidateForContextLoss()
  }

  private requireGeneration(operation: string): Generation {
    if (this.disposedValue) throw new WebGLBackendDisposedError(operation)

    if (this.gl.isContextLost()) {
      this.invalidateGeneration()
      throw new WebGLContextLostError(operation)
    }

    if (this.lifecycle.state === 'restoring' || this.lifecycle.state === 'restore-failed') {
      throw new WebGLOperationError(operation, 'WebGL1Backend', this.lifecycle.state)
    }

    if (!this.generation.valid || !this.lifecycle.isReady) {
      throw new WebGLContextLostError(operation)
    }

    return this.generation
  }

  private assertCurrentDraw(generation: Generation): void {
    if (this.requireGeneration('continue draw') !== generation) {
      throw new WebGLContextLostError('continue draw from an old generation')
    }

    generation.scope.assertDrawable()
  }

  private assertOutsideScope(generation: Generation, operation: string): void {
    if (generation.scope.active) {
      throw new WebGLOperationError(operation, 'WebGL1Backend', 'render surface is active')
    }
  }
}
