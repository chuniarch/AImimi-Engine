/**
 * 一帧的标量输入，由 Engine 提供合法值；不携带 Scene、Camera 或 GPU handle。
 * readonly 只约束静态类型，Renderer 在 Pass 执行前复制并冻结本对象。
 */
export interface FrameSnapshot {
  /** 单调帧序号。 */
  readonly frameNumber: number

  /** 累计时间，单位秒。 */
  readonly timeSeconds: number

  /** 当前帧步长，单位秒。 */
  readonly deltaSeconds: number

  /** 实际像素尺寸，不是 CSS 尺寸。 */
  readonly drawingBufferWidth: number
  readonly drawingBufferHeight: number

  /** CSS 尺寸与 drawing buffer 尺寸之间的像素倍率。 */
  readonly pixelRatio: number
}
