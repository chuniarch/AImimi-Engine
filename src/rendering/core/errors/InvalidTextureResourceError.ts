import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** Texture CPU契约错误；沿用冻结details与EngineError领域分类。 */
export class InvalidTextureResourceError extends RenderingError {
  constructor(
    textureLabel: string,
    fieldName: string,
    reason: string,
    details: RenderingErrorDetails = {}
  ) {
    super('Texture invalid at ' + fieldName + ': ' + reason, 'INVALID_TEXTURE_RESOURCE', {
      ...details,
      textureLabel,
      fieldName,
      reason
    })
  }
}
