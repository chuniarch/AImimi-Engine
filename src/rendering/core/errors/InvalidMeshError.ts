import { RenderingError } from './RenderingError'

/**
 * Mesh 构造输入不是所要求的逻辑资源类型。
 *
 * @remarks
 * 类型错误与生命周期错误分开：类型正确但已释放时使用 ResourceDisposedError。
 */
export class InvalidMeshError extends RenderingError {
  /** @param fieldName - 不合法的资源字段。 */
  constructor(fieldName: 'geometry' | 'material') {
    super('Mesh ' + fieldName + ' must reference the corresponding resource type', 'INVALID_MESH', {
      fieldName
    })
    this.name = 'InvalidMeshError'
  }
}
