import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** 逻辑渲染目标的描述、尺寸或附件索引不合法；不表示 GPU 创建失败。 */
export class InvalidRenderTargetError extends RenderingError {
  /**
   * @param fieldName - 出错字段，例如 width 或 colors[0].format。
   * @param reason - 违反的具体 CPU 契约。
   * @param details - 诊断现场；不能覆盖 fieldName/reason。
   */
  constructor(fieldName: string, reason: string, details: RenderingErrorDetails = {}) {
    super('RenderTarget ' + fieldName + ' is invalid: ' + reason, 'INVALID_RENDER_TARGET', {
      ...details,
      fieldName,
      reason
    })
    this.name = 'InvalidRenderTargetError'
  }
}
