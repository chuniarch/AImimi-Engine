import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { Geometry } from '@/rendering/resources/Geometry'
import type { Material } from '@/rendering/resources/Material'

/**
 * 一个 Mesh 在本帧抽取出的绘制数据，而不是整个 Mesh。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][draw-submission-value-boundary]
 *
 * worldMatrix 由后续 Builder 复制并冻结；Geometry/Material 仍借用原资源身份。
 * readonly material 不会使 Material.setParameter 失效，也不会复制其全部参数。
 * 消费方仍须验证资源存活；该对象不取得生命周期所有权。
 */
export interface RenderItem {
  readonly geometry: Geometry
  readonly material: Material
  /** local → world；同一 Material 被两个 Mesh 共享时，每个 item 仍有自己的矩阵。 */
  readonly worldMatrix: Mat4Tuple
}
