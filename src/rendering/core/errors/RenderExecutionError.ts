import { RenderingError } from './RenderingError'

/** 编排对象的调用时机或 Pass 所有权不合法。 */
export class RenderExecutionError extends RenderingError {
  constructor(owner: 'Renderer' | 'RenderPipeline', operation: string, reason: string) {
    super(owner + '.' + operation + ': ' + reason, 'INVALID_RENDER_EXECUTION', {
      owner,
      operation,
      reason
    })
    this.name = 'RenderExecutionError'
  }
}
