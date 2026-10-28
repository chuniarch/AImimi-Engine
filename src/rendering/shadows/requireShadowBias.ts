import type { RenderingErrorDetails } from '@/rendering/core/errors'
import { requireFiniteNumber } from '@/rendering/core/validation'

/** 调用者决定错误属于 Material 还是 DirectionalLightShadow；成功时不创建错误。 */
export type ShadowBiasErrorFactory = (reason: string, details?: RenderingErrorDetails) => Error

/**
 * 验证归一化深度偏移，不进行 clamp 或字符串转换。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][shadow-depth-comparison]
 * 允许 0；拒绝负数、非有限数和 Float32 溢出。
 * 保留原始 CPU number，不预先舍入；GPU 上传时才采用 Float32。
 * 极小正数可能下溢为 0，这等价于不加 bias，不是无穷大。
 */
export function requireShadowBias(value: unknown, createError: ShadowBiasErrorFactory): number {
  const bias = requireFiniteNumber(value, () => createError('must be a finite number'))

  if (bias < 0 || !Number.isFinite(Math.fround(bias)))
    throw createError('must be non-negative and representable as a finite Float32', {
      received: bias
    })

  return bias
}
