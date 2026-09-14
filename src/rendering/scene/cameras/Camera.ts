import { mat4 } from 'gl-matrix'

import { SceneNode } from '@/rendering/scene/SceneNode'

/**
 * 具有场景变换和投影能力的抽象节点。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][camera-world-projection-separation]
 *
 * 相机 world matrix 由 SceneNode 管理；其逆矩阵才是 world → view 的变换。
 * 本批不额外缓存 view matrix，后续 ViewState 提取阶段负责求逆并处理不可逆输入。
 * projection matrix 描述 view → clip，与相机在世界中的位置相互独立。
 *
 * Camera 不是 Resource，没有 Scene 引用计数或 GPU 生命周期。
 * 子类提供具体投影规则；本类不假定所有相机都有 fovY/near/far。
 */
export abstract class Camera extends SceneNode {
  /** 固定使用 Float32 缓冲；子类在构造结束前写入自己的有效投影。 */
  protected readonly projectionMatrixValue: mat4 = mat4.identity(new Float32Array(16))

  /** 构造完成为 0，每次成功的投影配置修改增加一次。 */
  protected projectionVersionValue = 0

  /** 仅允许具体相机子类选择公开的构造参数。 */
  protected constructor() {
    super()
  }

  /** 提供稳定的基类诊断类型；具体相机可以覆盖。 */
  protected override get debugType(): string {
    return 'Camera'
  }

  /**
   * 投影配置的版本，而不是读取次数。
   * 移动相机、更新 world matrix、复制 projection matrix 都不增加它。
   */
  get projectionVersion(): number {
    return this.projectionVersionValue
  }

  /**
   * 把当前投影复制到调用者的矩阵中，不能暴露内部可变缓冲。
   * @param out - 调用者提供的 16 分量矩阵。
   */
  abstract copyProjectionMatrixTo(out: mat4): void
}
