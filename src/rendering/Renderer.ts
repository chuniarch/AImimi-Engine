import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { RenderExecutionError } from '@/rendering/core/errors/RenderExecutionError'
import type { FrameSnapshot } from '@/rendering/frame/FrameSnapshot'
import type { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderView } from '@/rendering/frame/RenderView'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import type { RenderPipeline } from '@/rendering/passes/RenderPipeline'

/**
 * 连接每帧提取与 Pass 编排。
 *
 * 不长期保存 Scene/Camera，也不区分 Backend 种类。
 * 拥有注入的 Pipeline/Backend，Builder 是无资源的提取服务。
 */
export class Renderer {
  private readonly backend: RenderBackend
  private readonly pipeline: RenderPipeline
  private readonly renderListBuilder: RenderListBuilder

  private state: 'active' | 'closing' | 'disposed' = 'active'
  private busy = false

  constructor(
    backend: RenderBackend,
    pipeline: RenderPipeline,
    renderListBuilder: RenderListBuilder
  ) {
    this.backend = backend
    this.pipeline = pipeline
    this.renderListBuilder = renderListBuilder
  }

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]
   *
   * ready=false 时不读取场景；否则提取一次，
   * 并向全部 Pass 传入同一个 context。
   *
   * FrameSnapshot 显式复制六个标量，
   * 防止外部修改原对象影响后续 Pass。
   */
  render(view: RenderView): void {
    if (this.state !== 'active') {
      throw new ResourceDisposedError('Renderer')
    }

    this.assertNotBusy('render')

    if (!this.backend.ready) return

    this.busy = true

    try {
      const source = view.frame

      const frame: FrameSnapshot = Object.freeze({
        frameNumber: source.frameNumber,
        timeSeconds: source.timeSeconds,
        deltaSeconds: source.deltaSeconds,
        drawingBufferWidth: source.drawingBufferWidth,
        drawingBufferHeight: source.drawingBufferHeight,
        pixelRatio: source.pixelRatio
      })

      const { renderList, viewState } = this.renderListBuilder.build(view)

      const context: RenderPassContext = Object.freeze({
        frame,
        view: viewState,
        renderList,
        backend: this.backend
      })

      this.pipeline.execute(context)
    } finally {
      this.busy = false
    }
  }

  /**
   * 先完成 Pipeline 清理，才允许释放 Backend。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-dispose-retry-order]
   *
   * 任一步失败都会停在 closing，
   * 保留依赖并允许显式再次 dispose。
   *
   * Pipeline 已成功释放时其 dispose 幂等，
   * 因此 Backend 失败后的重试不会重复释放 Pass。
   */
  dispose(): void {
    if (this.state === 'disposed') return

    this.assertNotBusy('dispose')

    this.state = 'closing'
    this.busy = true

    try {
      /**
       * 先释放 Pipeline 拥有的 Pass，保留它们清理所依赖的 Backend。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][render-dispose-retry-order]
       *
       * 例如某个 Pass 拥有逻辑 RenderTarget，其 dispose 会触发资源的
       * disposal listener，由仍存活的 Backend Manager 清理对应 GPU 资源。
       * Pipeline 清理抛错时，本次调用立即退出，不执行下面的 backend.dispose；
       * Renderer 保持 closing，供调用者后续显式重试完整清理流程。
       */
      this.pipeline.dispose()

      /**
       * Pipeline 完成清理后，才释放 Backend 的 Manager、缓存和事件订阅。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][render-dispose-retry-order]
       *
       * 不能放入 finally 强制执行，否则 Pipeline 失败时也会拆除清理依赖。
       * 若本步骤抛错，下次重试时已完成的 pipeline.dispose 幂等返回，
       * 然后再次尝试 backend.dispose；不会再次释放已经清理成功的 Pass。
       */
      this.backend.dispose()
      this.state = 'disposed'
    } finally {
      this.busy = false
    }
  }

  /** 防止 Pass 在 render 内再次 render，或提前拆除当前正在使用的依赖。 */
  private assertNotBusy(operation: string): void {
    if (this.busy) throw new RenderExecutionError('Renderer', operation, 'operation in progress')
  }
}
