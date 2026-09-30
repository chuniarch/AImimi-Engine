import { mat4 } from 'gl-matrix'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { Camera } from '@/rendering/scene/cameras/Camera'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { copyMat4Snapshot } from './copyMat4Snapshot'
import type { RenderItem } from './RenderItem'
import { RenderList } from './RenderList'
import type { RenderView } from './RenderView'
import type { ViewState } from './ViewState'

/** 成功才返回完整结果；不缓存上一次结果或失败半成品。 */
export interface RenderListBuildResult {
  readonly viewState: ViewState
  readonly renderList: RenderList
}

/**
 * 将可变 Scene/Camera 转换成单帧绘制输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][frame-world-update-boundary]
 *
 * 一次 build 只做一轮可见遍历，Pass 不再读取场景。
 * updateWorldMatrix 只更新节点及祖先，不更新后代，因此仍逐个复制 Mesh 世界矩阵。
 * 多次祖先缓存检查不等于重复矩阵计算；没有变更时 worldVersion 不增加。
 *
 * 提取同步进行，期间不得修改树或变换；本版不提供提取过程的用户钩子。
 */
export class RenderListBuilder {
  /**
   * 复制相机 → 更新根节点 → 可见遍历 → 分类 → 冻结。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][frame-camera-value-snapshot]
   *
   * viewMatrix 是 camera world matrix 的逆；不可逆或非有限时拒绝本次提取，
   * 不用单位矩阵掩盖错误。局部临时缓冲不会被返回给调用者。
   */
  build(view: RenderView): RenderListBuildResult {
    if (view === null || typeof view !== 'object')
      throw new InvalidRenderViewError('view', 'must be an object')

    const { scene, camera } = view

    if (!(scene instanceof Scene)) throw new InvalidRenderViewError('scene', 'must be a Scene')

    if (!(camera instanceof Camera)) throw new InvalidRenderViewError('camera', 'must be a Camera')

    if (scene.disposed) throw new ResourceDisposedError('Scene')

    const cameraWorld = new Float32Array(16)
    const viewMatrix = new Float32Array(16)
    const projection = new Float32Array(16)

    camera.copyWorldMatrixTo(cameraWorld)

    const world = copyMat4Snapshot(cameraWorld, 'camera.worldMatrix')

    if (mat4.invert(viewMatrix, world) === null)
      throw new InvalidRenderViewError('camera.worldMatrix', 'must be invertible')

    camera.copyProjectionMatrixTo(projection)

    const position: Vec3Tuple = Object.freeze([world[12], world[13], world[14]])

    const viewState: ViewState = Object.freeze({
      viewMatrix: copyMat4Snapshot(viewMatrix, 'camera.viewMatrix'),
      projectionMatrix: copyMat4Snapshot(projection, 'camera.projectionMatrix'),
      cameraWorldPosition: position
    })

    scene.updateWorldMatrix()

    const background: RenderItem[] = []
    const opaque: RenderItem[] = []
    const scratch = new Float32Array(16)

    scene.traverseVisible((node) => {
      if (!(node instanceof Mesh)) return

      node.copyWorldMatrixTo(scratch)

      const renderItem: RenderItem = {
        geometry: node.geometry,
        material: node.material,
        worldMatrix: copyMat4Snapshot(scratch, 'mesh.worldMatrix')
      }

      if (renderItem.material.queue === 'background') {
        background.push(renderItem)
      } else {
        opaque.push(renderItem)
      }
    })

    return Object.freeze({
      viewState,
      renderList: new RenderList(background, opaque)
    })
  }
}
