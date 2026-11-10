import {
  CleanupFailureError,
  InvalidGBufferError,
  ResourceDisposedError,
  RenderTargetUnavailableError
} from '@/rendering/core/errors'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import {
  GBufferSlot,
  createGBufferTarget,
  type GBufferOutput
} from '@/rendering/gbuffer/GBufferLayout'
import {
  requireGBufferBaseColorSource,
  assertGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { Geometry } from '@/rendering/resources/Geometry'
import type { RenderTarget } from '@/rendering/resources/RenderTarget'
import type { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import type { ShaderModule } from '@/rendering/resources/ShaderModule'
import { resolveTextureSamplingSource } from '@/rendering/resources/textureSamplingSource'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import type { RenderPass } from './RenderPass'
import type { RenderPassContext } from './RenderPassContext'

/** Pass 借用 shader，独占自己创建的 target；label 仅用于诊断。 */
export interface GBufferPassOptions {
  readonly shaderModule: ShaderModule
  readonly label: string
}

/**
 * 生产四项表面数据，不计算光照、不遍历 Scene，也不创建另一套 Renderer。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
 * 顺序：撤销旧输出 → 整队列预检 → scope 外 resize → clear/draw → 成功退出后发布。
 * 失败可能留下部分像素，但不能留下可供 Lighting 使用的完成记录。
 * Renderer 必须每帧创建新 context，禁止跨帧或恢复后重放旧 context。
 */
export class GBufferPass implements RenderPass {
  public readonly name: string = 'GBufferPass'
  private readonly owner: RenderTargetBundle
  private readonly shaderModule: ShaderModule
  private executing = false
  private closing = false
  private disposed = false
  /** 同步清理重入不能被解释成已完成。 */
  private cleaning = false
  private completed: {
    readonly context: RenderPassContext
    readonly epoch: object
    readonly output: GBufferOutput
  } | null = null

  /** 验证 shader 后创建 1×1 CPU 目标；第一次 execute 改成真实像素尺寸。 */
  constructor(options: GBufferPassOptions) {
    assertGBufferShaderModule(options.shaderModule)
    this.shaderModule = options.shaderModule
    this.owner = createGBufferTarget(1, 1, options.label)
  }

  /**
   * 借用目标供诊断，不转交 ownership；正常 resize 由 execute 负责。
   * 外部不得 retain、在活动 scope 内 resize/dispose，或向该目标插入其他生产者。
   */
  get target(): RenderTarget {
    this.assertUsable()
    return this.targetValue
  }

  private get targetValue(): RenderTarget {
    return this.owner.target
  }

  /** Pass 生命周期检查；目标和 shader 另有各自 Resource 检查。 */
  private assertUsable(): void {
    if (this.closing) throw new ResourceDisposedError('GBufferPass')
  }

  /**
   * 只验证本生产者需要的输入，不复制整个 Backend 的 GPU 验证逻辑。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-preflight-before-draw]
   * 固定 position/normal/uv 布局，并提前拒绝采样自己的输出目标。
   * 矩阵可逆性、设备能力、shader 编译和 GPU 状态验证仍由 Backend 负责。
   */
  private assertItem(item: RenderItem): void {
    const source = requireGBufferBaseColorSource(item.material, this.shaderModule)
    const binding = resolveTextureSamplingSource(source, '2d', 'material.uBaseColorMap')
    if (this.targetValue.attachments.colors.some((view) => view.texture === binding.texture)) {
      throw new InvalidGBufferError('material.uBaseColorMap', 'cannot sample this Pass output')
    }
    if (!(item.geometry instanceof Geometry)) {
      throw new InvalidGBufferError('geometry', 'must reference a Geometry')
    }
    const required = [
      [VertexAttributeSemantic.Position, 3],
      [VertexAttributeSemantic.Normal, 3],
      [VertexAttributeSemantic.UV, 2]
    ] as const
    for (const [name, itemSize] of required) {
      if (item.geometry.getAttribute(name)?.itemSize !== itemSize) {
        throw new InvalidGBufferError('geometry.' + name, 'requires itemSize=' + itemSize)
      }
    }
  }

  /**
   * 同步生产，只提交 opaque；所有 draw 使用同一 context.view。
   * 不向共享 Material 写入矩阵；失败原样传播，finally 不发布成功记录。
   */
  execute(context: RenderPassContext): undefined {
    this.assertUsable()
    if (this.executing) throw new InvalidGBufferError('execute', 'must not re-enter')
    this.completed = null
    this.executing = true
    try {
      assertGBufferShaderModule(this.shaderModule)
      const epoch = context.backend.resourceEpoch
      if (!context.backend.ready || epoch === null) {
        throw new RenderTargetUnavailableError(this.targetValue.label, 'backend is not ready')
      }
      for (const item of context.renderList.opaque) this.assertItem(item)
      this.owner.resize(context.frame.drawingBufferWidth, context.frame.drawingBufferHeight)
      const target = this.targetValue
      const revision = target.revision
      if (context.backend.resourceEpoch !== epoch) {
        throw new RenderTargetUnavailableError(target.label, 'device changed before production')
      }
      context.backend.withRenderSurface(
        {
          surface: { kind: 'render-target', target },
          clear: { color: [0, 0, 0, 0], depth: 1 }
        },
        () => {
          for (const item of context.renderList.opaque) {
            context.backend.draw({ item, view: context.view })
          }
          return undefined
        }
      )
      // 这是同步命令提交完成，不是等待 GPU 实际执行完毕。
      this.targetValue.assertUsable()
      if (
        !context.backend.ready ||
        context.backend.resourceEpoch !== epoch ||
        target.revision !== revision
      ) {
        throw new RenderTargetUnavailableError(
          this.targetValue.label,
          'output changed during production'
        )
      }
      const output: GBufferOutput = Object.freeze({
        target: this.targetValue,
        revision,
        baseColorLinear: this.targetValue.getColorAttachment(GBufferSlot.baseColorLinear),
        viewDepth: this.targetValue.getColorAttachment(GBufferSlot.viewDepth),
        normalView: this.targetValue.getColorAttachment(GBufferSlot.normalView),
        positionView: this.targetValue.getColorAttachment(GBufferSlot.positionView)
      })
      this.completed = { context, epoch, output }
    } finally {
      this.executing = false
    }
  }

  /**
   * 消费前取得当前 context 的完成输出，不把“有 FBO”当成“内容已生产”。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
   * 同 frameNumber 的另一 context 也不能消费，resize 后必须重画。
   * epoch 变化后仍须新 context + execute，
   * 不允许保存旧 context 在恢复后单独重放 Lighting。
   *
   * @throws RenderTargetUnavailableError 未生产、正在生产、设备失效或结果过期。
   * @throws ResourceDisposedError Pass 或目标已释放。
   */
  getOutput(context: RenderPassContext): GBufferOutput {
    this.assertUsable()
    void this.targetValue.attachments
    const epoch = context.backend.resourceEpoch
    if (
      this.completed?.context === context &&
      (!context.backend.ready || epoch === null || this.completed.epoch !== epoch)
    )
      this.completed = null
    const completed = this.completed
    if (
      this.executing ||
      completed?.context !== context ||
      completed.output.revision !== this.targetValue.revision
    ) {
      throw new RenderTargetUnavailableError(
        this.targetValue.label,
        'no completed output for this context and revision'
      )
    }
    return completed.output
  }

  /**
   * 只释放自有目标；借用的 Geometry、Material、shader 和纹理不受影响。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][gbuffer-borrowed-scene-resources]
   * 首次清理即停止接收新帧。target.dispose 失败时允许显式重试，
   * 不吞错，不在 scope 活动时清理。只有 bundle.cleanupState=complete 才结束 Pass。
   * [DESIGN-WEIGHT:3][cleanup-reentry]
   */
  dispose(): void {
    if (this.disposed) return
    if (this.executing || this.cleaning) {
      throw new InvalidGBufferError('dispose', 'operation in progress')
    }
    this.closing = true
    this.completed = null
    this.cleaning = true
    try {
      this.owner.dispose()
      if (this.owner.cleanupState !== 'complete') {
        throw new CleanupFailureError(this.name, [
          {
            phase: 'owner-child',
            label: 'target bundle',
            cause: new Error('Target cleanup is still ' + this.owner.cleanupState)
          }
        ])
      }
      this.disposed = true
    } finally {
      this.cleaning = false
    }
  }
}
