import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** 灯光配置或派生光照数值无效；资源已释放仍使用独立的生命周期错误。 */
export class InvalidLightError extends RenderingError {
  constructor(fieldName: string, reason: string, details: RenderingErrorDetails = {}) {
    super(`Invalid light ${fieldName}: ${reason}`, 'INVALID_LIGHT', {
      ...details,
      fieldName,
      reason
    })
    this.name = 'InvalidLightError'
  }
}
