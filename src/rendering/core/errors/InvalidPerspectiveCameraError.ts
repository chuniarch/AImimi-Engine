import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** 透视参数或由其生成的投影矩阵不满足相机契约。 */
export class InvalidPerspectiveCameraError extends RenderingError {
  /**
   * @param fieldName - 无效字段，或表示计算结果的 projectionMatrix。
   * @param reason - 具体违反的约束。
   * @param details - 原始参数等诊断现场；不能覆盖 fieldName 和 reason。
   */
  constructor(fieldName: string, reason: string, details: RenderingErrorDetails = {}) {
    super(
      'PerspectiveCamera ' + fieldName + ' is invalid: ' + reason,
      'INVALID_PERSPECTIVE_CAMERA',
      {
        ...details,
        fieldName,
        reason
      }
    )
    this.name = 'InvalidPerspectiveCameraError'
  }
}
