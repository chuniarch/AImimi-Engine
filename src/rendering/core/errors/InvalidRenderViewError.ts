import { RenderingError } from './RenderingError'

/** CPU 帧提取失败，不属于 WebGL 设备错误。 */
export class InvalidRenderViewError extends RenderingError {
  constructor(fieldName: string, reason: string) {
    super(fieldName + ': ' + reason, 'INVALID_RENDER_VIEW', {
      fieldName,
      reason
    })
    this.name = 'InvalidRenderViewError'
  }
}
