import { RenderingError, type RenderingErrorDetails } from './RenderingError'

/**
 * Material 的构造描述或参数违反 CPU 侧契约。
 *
 * @remarks
 * 数据无效使用本错误；访问已释放的资源继续使用 ResourceDisposedError。
 * shader 编译、uniform 反射和 GPU 能力错误由后续 Backend 负责。
 */
export class InvalidMaterialError extends RenderingError {
  /**
   * @param fieldName - 错误字段，例如 state.depthWrite 或 parameters.uRoughness。
   * @param reason - 具体违反了什么约束。
   * @param details - 附加诊断；不能覆盖 fieldName 和 reason。
   */
  constructor(fieldName: string, reason: string, details: RenderingErrorDetails = {}) {
    super('Material field ' + fieldName + ' is invalid: ' + reason, 'INVALID_MATERIAL', {
      ...details,
      fieldName,
      reason
    })

    this.name = 'InvalidMaterialError'
  }
}
