import { InvalidMeshError, ResourceDisposedError } from '@/rendering/core/errors'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { SceneNode } from '@/rendering/scene/SceneNode'

/**
 * 把几何数据、材质与一个场景节点的变换组合起来。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][mesh-borrowed-resources]
 *
 * Mesh 只借用 Geometry/Material，不复制资源，不增加 Scene 引用数，不级联释放。
 * Scene.add(mesh) 只登记父子关系；资源存活由 Scene.retain(resource) 单独登记。
 * removeFromParent() 只移除节点，节点仍可重新加入场景。Mesh 不提供 dispose()。
 *
 * [DESIGN-WEIGHT:2][mesh-model-matrix-source]
 *
 * 继承的 world matrix 就是本 Mesh 的 model matrix；不在 Material 中保存它，
 * 也不另建一份 Mesh 专属矩阵缓存。绘制提取阶段通过 copyWorldMatrixTo() 取得副本。
 * 本类不包含 draw、WebGL handle、shadow、renderOrder 或透明队列特例。
 */
export class Mesh extends SceneNode {
  /** 借用原 Geometry 的身份，不持有独立副本。 */
  private readonly geometryValue: Geometry

  /** 借用原 Material 的身份，多个 Mesh 可以共享同一材质。 */
  private readonly materialValue: Material

  /**
   * @param geometry - 未释放的逻辑几何资源。
   * @param material - 未释放的逻辑材质资源。
   * @throws {@link InvalidMeshError} 输入不是对应的逻辑资源实例。
   * @throws {@link ResourceDisposedError} 对应资源已释放。
   */
  constructor(geometry: Geometry, material: Material) {
    super()

    if (!(geometry instanceof Geometry)) throw new InvalidMeshError('geometry')
    if (!(material instanceof Material)) throw new InvalidMeshError('material')
    if (geometry.disposed) throw new ResourceDisposedError('Geometry')
    if (material.disposed) throw new ResourceDisposedError('Material')

    this.geometryValue = geometry
    this.materialValue = material
  }

  /** 稳定诊断类型，不依赖打包后的 constructor.name。 */
  protected override get debugType(): string {
    return 'Mesh'
  }

  /**
   * 返回借用的原 Geometry；不允许通过赋值替换引用。
   * @throws {@link ResourceDisposedError} Geometry 已被其所有者释放。
   */
  get geometry(): Geometry {
    if (this.geometryValue.disposed) throw new ResourceDisposedError('Geometry')
    return this.geometryValue
  }

  /**
   * 返回借用的原 Material；这里只验证 Material 自身的生命周期。
   * shader/texture 依赖在 Material 及后续实际消费路径中分别验证。
   * @throws {@link ResourceDisposedError} Material 已被其所有者释放。
   */
  get material(): Material {
    if (this.materialValue.disposed) throw new ResourceDisposedError('Material')
    return this.materialValue
  }
}
