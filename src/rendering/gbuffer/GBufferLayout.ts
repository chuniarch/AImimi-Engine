import type { RenderTarget, RenderTargetAttachmentRef } from '@/rendering/resources/RenderTarget'

import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'

/**
 * 四项表面数据的逻辑槽位；不是 WebGL COLOR_ATTACHMENT 枚举。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * 槽位 0 的 alpha 是唯一有效标记；黑色、零深度都不能替代它。
 * 位置/法线在 view space，颜色是线性 RGB；不保存阴影可见度。
 */
export const GBufferSlot = Object.freeze({
  baseColorLinear: 0,
  viewDepth: 1,
  normalView: 2,
  positionView: 3
} as const)

/**
 * 一次成功生产后的借用地址集合，不是像素快照或 GPU handle。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
 * 每帧消费前调用 Pass.getOutput(context)，不能跨帧复用。
 * revision 记录本次存储版本；地址本身仍随 target resize 解析，不取得目标所有权。
 */
export interface GBufferOutput {
  readonly target: RenderTarget
  readonly revision: number
  readonly baseColorLinear: RenderTargetAttachmentRef
  readonly viewDepth: RenderTargetAttachmentRef
  readonly normalView: RenderTargetAttachmentRef
  readonly positionView: RenderTargetAttachmentRef
}

/**
 * 创建独立 CPU 目标；Backend 使用时才检查能力并分配 GPU 存储。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * rgba32f 保存带符号和大于 1 的数；nearest 避免跨表面插值。
 * 当前 RenderTarget 固定 clamp-to-edge、无 mipmap，depth16 仅供深度测试。
 *
 * @param width - 实际像素宽度，不是 CSS 宽度。
 * @param height - 实际像素高度。
 * @param label - 稳定诊断标签，不是共享缓存 key。
 * @throws InvalidRenderTargetError 尺寸或标签无效。
 */
export function createGBufferTarget(
  width: number,
  height: number,
  label: string
): RenderTargetBundle {
  return new RenderTargetBundle({
    label,
    width,
    height,
    colors: Array.from({ length: 4 }, () => ({
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'data',
      defaultSampler: { minFilter: 'nearest', magFilter: 'nearest' }
    })),
    depth: true
  })
}
