import type { RenderPassContext } from './RenderPassContext'

/** Pipeline 持有的一个同步渲染步骤，不代表 WebGL draw call。 */
export interface RenderPass {
  readonly name: string

  /** 必须同步完成；不得返回 Promise 或启动跨出本调用的异步 draw。 */
  execute(context: RenderPassContext): undefined

  /**
   * 释放本 Pass 自己持有的资源，不释放 context 借用的 Backend/Scene 资源。
   *
   * 必须幂等；失败后允许调用者显式重试，
   * 已经释放的部分不能再次重复删除。
   */
  dispose(): void
}
