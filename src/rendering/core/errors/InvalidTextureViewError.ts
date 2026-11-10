import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** Texture write view CPU契约错误；沿用冻结details与EngineError领域分类。 */
export class InvalidTextureViewError extends RenderingError {
  constructor(fieldName: string, reason: string, details: RenderingErrorDetails = {}) {
    super('Texture write view invalid at ' + fieldName + ': ' + reason, 'INVALID_TEXTURE_VIEW', {
      ...details,
      fieldName,
      reason
    })
  }
}
