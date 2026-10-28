import { RenderingError } from './RenderingError'

/** GBuffer 输入违反生产契约；不冒充 GPU 分配或 shader 编译错误。 */
export class InvalidGBufferError extends RenderingError {
  /**
   * @param fieldName - 出错字段路径，例如 material.shaderModule。
   * @param reason - 具体违反的契约，随字段路径一起保存在错误上下文中。
   */
  constructor(fieldName: string, reason: string) {
    super(`GBuffer ${fieldName} is invalid: ${reason}`, 'INVALID_GBUFFER', { fieldName, reason })
  }
}
