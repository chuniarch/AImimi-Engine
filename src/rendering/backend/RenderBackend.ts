import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { ViewState } from '@/rendering/frame/ViewState'
import type { RenderSurfaceScopeDescriptor } from './RenderSurface'

/** 单次绘制的 CPU 输入；输出由外层 scope 决定。 */
export interface DrawSubmission {
  readonly item: RenderItem
  readonly view: ViewState
}

/**
 * 面向上层 Pipeline 的设备契约，不暴露 WebGL context 或 GPU handle。
 *
 * @remarks
 * 清除属于 scope 的入口描述，不再提供独立的公共 clear()。
 * 这份接口本身不能证明真实 GPU 绘制或 context 恢复已经实现。
 */
export interface RenderBackend {
  /** 设备已就绪、未 lost 且未 disposed 时才为 true。 */
  readonly ready: boolean

  /** 调整默认 drawing buffer，不修改离屏目标；不能在活动 scope 中调用。 */
  resizeDrawingBuffer(cssWidth: number, cssHeight: number, pixelRatio: number): void

  /**
   * 绑定目标、执行入口清除，然后同步执行 callback。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]
   * WebGL1 必须在解析 GPU 目标前捕获真实 framebuffer/viewport。
   * 正常、异常和嵌套退出均恢复入口状态，但不回滚像素、不释放逻辑目标。
   * context generation 已失效时，禁止用旧快照恢复 GPU 绑定。
   *
   * callback 只返回 undefined；禁止跨 await 或启动稍后再次 draw 的任务。
   * scope 内不得 resize/dispose 当前或外层目标，也不得修改 drawing buffer。
   */
  withRenderSurface(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void

  /** 仅在活动 scope 内提交绘制；返回不代表 GPU 已完成执行。 */
  draw(submission: DrawSubmission): void

  /** 幂等释放 Backend 的 GPU 表示与监听，不释放借用的 CPU Resource。 */
  dispose(): void
}
