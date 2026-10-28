import { EngineError } from '@/errors/EngineError/BaseError'

/**
 * Engine 的模式或生命周期不允许当前操作；不把底层设备错误改写为本错误。
 *
 * @remarks
 * 例如：draw 内清理设备、释放未完成时重新进入 HW2、复用 context lost 后的旧资源。
 * recoverable 表示调用者可以改变条件或重建 Engine，不表示原操作已经成功。
 */
export class EngineOperationError extends EngineError {
  constructor(operation: string, reason: string) {
    super('Engine cannot ' + operation + ': ' + reason, 'INVALID_ENGINE_OPERATION', {
      context: Object.freeze({ operation, reason }),
      recoverable: true
    })
    this.name = 'EngineOperationError'
  }
}
