import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** 方向光阴影的配置或结果无效；已释放资源仍使用 ResourceDisposedError。 */
export class InvalidDirectionalShadowError extends RenderingError {
  /** label 仅诊断；details 不能覆盖已确定的 label、fieldName、reason。 */
  constructor(
    label: string,
    fieldName: string,
    reason: string,
    details: RenderingErrorDetails = {}
  ) {
    super(
      'Directional shadow ' + label + ' field ' + fieldName + ' is invalid: ' + reason,
      'INVALID_DIRECTIONAL_SHADOW',
      { ...details, label, fieldName, reason }
    )
    this.name = 'InvalidDirectionalShadowError'
  }
}
