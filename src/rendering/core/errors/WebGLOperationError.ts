import { RenderingError } from './RenderingError'

/**
 * 已越过 create-null / compile / link 专用检查后，GL 操作仍然失败。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-resource-error-boundaries]
 *
 * 例如 bufferData 报 OUT_OF_MEMORY，或 active attribute 反射返回无效结果。
 * 不使用本错误替代 WebGLResourceCreationError、ShaderCompilationError、
 * ProgramLinkError 或 WebGLContextLostError。
 */
export class WebGLOperationError extends RenderingError {
  constructor(operation: string, label: string, reason: string) {
    super(`WebGL ${operation} failed for ${label}: ${reason}`, 'WEBGL_OPERATION_FAILED', {
      operation,
      label,
      reason
    })
  }
}
