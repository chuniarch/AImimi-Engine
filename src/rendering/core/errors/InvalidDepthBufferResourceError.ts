import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** Depth buffer CPU契约错误；沿用冻结details与EngineError领域分类。 */
export class InvalidDepthBufferResourceError extends RenderingError {
  constructor(
    resourceLabel: string,
    fieldName: string,
    reason: string,
    details: RenderingErrorDetails = {}
  ) {
    super('Depth buffer invalid at ' + fieldName + ': ' + reason, 'INVALID_DEPTH_BUFFER_RESOURCE', {
      ...details,
      resourceLabel,
      fieldName,
      reason
    })
  }
}
