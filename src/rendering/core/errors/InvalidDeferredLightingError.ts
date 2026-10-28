import { RenderingError } from '@/rendering/core/errors/RenderingError'

/** Lighting 编排输入或调用时机不合法；GPU 错误仍保留各自的领域类型。 */
export class InvalidDeferredLightingError extends RenderingError {
  /** @param fieldName - 失败位置，例如 producer、execute 或 dispose。 */
  constructor(fieldName: string, reason: string) {
    super(`DeferredLighting ${fieldName} is invalid: ${reason}`, 'INVALID_DEFERRED_LIGHTING', {
      fieldName,
      reason
    })
  }
}
