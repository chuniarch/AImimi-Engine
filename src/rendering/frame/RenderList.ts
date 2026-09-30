import { copyMat4Snapshot } from './copyMat4Snapshot'
import type { RenderItem } from './RenderItem'

/** 复制包装与矩阵，保留原 Geometry/Material 身份。 */
function snapshotItem(item: RenderItem): RenderItem {
  return Object.freeze({
    geometry: item.geometry,
    material: item.material,
    worldMatrix: copyMat4Snapshot(item.worldMatrix, 'item.worldMatrix')
  })
}

/**
 * 单帧稳定队列；不会跨帧复用内部数组。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][frame-item-value-reference-boundary]
 *
 * 冻结 list、队列、item 和矩阵，但不冻结或 retain 借用的 Resource。
 * Material.setParameter 仍然有效；这里不是整个 Material 的深快照。
 */
export class RenderList {
  public readonly background: readonly RenderItem[]
  public readonly opaque: readonly RenderItem[]

  /** 复制输入队列、item 和矩阵，隔离构造调用者后续的修改。 */
  constructor(backgroundList: RenderItem[], opaque: RenderItem[]) {
    this.background = Object.freeze(backgroundList.map(snapshotItem))
    this.opaque = Object.freeze(opaque.map(snapshotItem))

    Object.freeze(this)
  }
}
