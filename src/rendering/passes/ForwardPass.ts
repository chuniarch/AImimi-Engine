import type { RenderPass } from './RenderPass'
import type { RenderPassContext } from './RenderPassContext'

/**
 * 声明默认输出、清屏和队列顺序；具体 GPU 操作属于 Backend。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][forward-scope-and-queue-order]
 *
 * clear 放在 scope 入口描述中；先 background 后 opaque，
 * 全部使用同一个 ViewState。
 *
 * 不遍历 Scene、不计算矩阵、不创建资源、不捕获并吞掉 draw 错误。
 */
export class ForwardPass implements RenderPass {
  public readonly name: string = 'ForwardPass'

  execute(context: RenderPassContext): undefined {
    context.backend.withRenderSurface(
      {
        surface: { kind: 'default-framebuffer' },
        clear: {
          color: [0, 0, 0, 1],
          depth: 1
        }
      },
      () => {
        for (const item of context.renderList.background) {
          context.backend.draw({
            item,
            view: context.view
          })
        }

        for (const item of context.renderList.opaque) {
          context.backend.draw({
            item,
            view: context.view
          })
        }

        return undefined
      }
    )
  }

  /** 当前 Pass 不持有独立资源；空实现不代表可以释放借用的 Material。 */
  dispose(): void {}
}
