import type { RenderTarget } from '@/rendering/resources/RenderTarget'

/**
 * 逻辑绘制目的地；不拥有目标，也不保存 GPU handle。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-surface-explicit-destination]
 * 默认输出必须显式声明，不能把 null 或已释放目标解释成屏幕。
 */
export type RenderSurface =
  | { readonly kind: 'default-framebuffer' }
  | { readonly kind: 'render-target'; readonly target: RenderTarget }

/**
 * 本次进入 scope 时要清除的附件。
 *
 * @remarks
 * 省略的分量保留原内容；空对象不清除。颜色必须能表示为有限 Float32，
 * depth 在 [0, 1] 内，stencil 为有符号 32 位整数。
 * 数值有效不代表目标有该附件；Backend 还须检查附件是否存在。
 */
export interface ClearDescriptor {
  readonly color?: readonly [number, number, number, number]
  readonly depth?: number
  readonly stencil?: number
}

/**
 * 一次逻辑绘制范围的入口描述，不是 RenderTarget 的持久属性。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][surface-entry-clear-once]
 * 清除发生在绑定 surface 后、调用 callback 前，而且每次进入只执行一次。
 * 嵌套 scope 退出后恢复外层绑定，不能再次执行外层的 clear。
 * 一个逻辑 scope 不必对应一个原生 GPU render pass。
 */
export interface RenderSurfaceScopeDescriptor {
  readonly surface: RenderSurface
  readonly clear?: ClearDescriptor
}
