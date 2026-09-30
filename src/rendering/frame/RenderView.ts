import type { Scene } from '@/rendering/scene/Scene'
import type { Camera } from '@/rendering/scene/cameras/Camera'
import type { FrameSnapshot } from './FrameSnapshot'

/** 单次 render 的入口引用；不是已经完成提取的场景快照。 */
export interface RenderView {
  readonly scene: Scene
  readonly camera: Camera
  readonly frame: FrameSnapshot
}
