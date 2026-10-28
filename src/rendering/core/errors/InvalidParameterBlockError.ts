import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/** 参数块的描述、固定布局或写入值无效；资源已经释放仍使用 ResourceDisposedError。 */
export class InvalidParameterBlockError extends RenderingError {
  /** label 用于定位生产者；details 不得覆盖这三个已确定的诊断字段。 */
  constructor(
    label: string,
    fieldName: string,
    reason: string,
    details: RenderingErrorDetails = {}
  ) {
    super(
      'ParameterBlock ' + label + ' field ' + fieldName + ' is invalid: ' + reason,
      'INVALID_PARAMETER_BLOCK',
      { ...details, label, fieldName, reason }
    )
    this.name = 'InvalidParameterBlockError'
  }
}
