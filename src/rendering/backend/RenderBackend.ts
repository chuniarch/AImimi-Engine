import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { ViewState } from '@/rendering/frame/ViewState'
import type { ClearDescriptor, RenderSurface } from './RenderSurface'

/**
 * 单次绘制的 CPU 输入。输出目标由外层 surface scope 决定。
 * item 的模型矩阵和 view 的相机快照不会塞入共享 Material。
 */
export interface DrawSubmission {
  readonly item: RenderItem
  readonly view: ViewState
}

/**
 * 上层渲染编排可以调用的设备契约，不暴露 context 或 GPU handle。
 *
 * @remarks
 * 本文件没有 WebGL 实现。类型契约不能证明 framebuffer 已恢复或像素已正确绘制；
 * 这些须由后续 WebGL1Backend 的正常/异常/嵌套及真实浏览器测试验证。
 */
export interface RenderBackend {
  /** 只有当前设备已就绪、未 lost 且未 disposed 时为 true。 */
  readonly ready: boolean

  /**
   * 改变默认 drawing buffer 的分辨率策略，不 resize 任意离屏 RenderTarget。
   * cssWidth/cssHeight 是 CSS 尺寸，pixelRatio 是像素倍率；具体实现负责验证和取整。
   */
  resizeDrawingBuffer(cssWidth: number, cssHeight: number, pixelRatio: number): void

  /**
   * 在指定输出目标上同步执行 callback。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]
   *
   * WebGL1 实现须先捕获真实 FRAMEBUFFER_BINDING/VIEWPORT，再在 try/finally
   * 内解析和绑定目标、执行 callback，最后恢复进入前的 framebuffer 和 viewport。
   * 创建、绑定或 callback 抛错都必须经过恢复；嵌套 scope 恢复到各自的入口状态。
   *
   * callback 的返回值限定为 undefined，不接受 Promise。但这不是异步任务沙箱：
   * callback 内启动未等待的异步任务仍须由 lint/审查禁止，不能跨 scope 再 draw。
   * 恢复绑定不是回滚已经写入的像素，也不恢复所有 program/texture/render state。
   * scope 内不能 dispose/resize 正在使用的目标或其外层目标。
   */
  withRenderSurface(surface: RenderSurface, callback: () => undefined): void

  /** 根据描述清除当前 surface；不能擅自绑定默认 framebuffer。 */
  clear(descriptor: ClearDescriptor): void

  /**
   * 同步消费这次提交，验证生命周期并完成 GPU 指令提交。
   * 返回不表示 GPU 已执行完毕；Program/Geometry/Texture 解析都属于 Backend。
   */
  draw(submission: DrawSubmission): void

  /**
   * 幂等释放 Backend 自己的 GPU 表示和监听，不级联释放借用的逻辑资源。
   * 已释放实例不能恢复为 ready；context restore 是未 dispose 实例的另一条路径。
   */
  dispose(): void
}
