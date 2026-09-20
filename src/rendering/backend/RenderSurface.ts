import type { RenderTarget } from '@/rendering/resources/RenderTarget'

/**
 * 本次 scope 的输出目的地。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-surface-explicit-destination]
 *
 * 默认输出必须显式使用 default-framebuffer；null、未创建的目标和 disposed 目标
 * 都不能被解释为默认输出。kind 只选择目的地，不转移目标的释放责任。
 */
export type RenderSurface =
  | {
      readonly kind: 'default-framebuffer'
    }
  | {
      readonly kind: 'render-target'
      readonly target: RenderTarget
    }

/**
 * 本次要清除哪些缓冲。
 *
 * @remarks
 * 省略字段表示“不清除该缓冲”，不是将它清成 0。空对象表示没有清除操作。
 * 这是描述类型，不执行 clear，也不在类型层证明数值范围和目标附件是否存在。
 * Backend 负责有限数、深度范围、stencil 整数等运行时验证。
 */
export interface ClearDescriptor {
  readonly color?: readonly [number, number, number, number]
  readonly depth?: number
  readonly stencil?: number
}
