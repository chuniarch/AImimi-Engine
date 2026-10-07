import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import type { FrameSnapshot } from '@/rendering/frame/FrameSnapshot'
import type { RenderList } from '@/rendering/frame/RenderList'
import type { ViewState } from '@/rendering/frame/ViewState'

/**
 * 本帧所有 Pass 共用的上下文，不包含可变 Scene/Camera。
 * Renderer 冻结包装；backend 和逻辑 Resource 仍是借用引用。
 */
export interface RenderPassContext {
  readonly frame: FrameSnapshot
  readonly view: ViewState
  readonly renderList: RenderList
  readonly backend: RenderBackend
}
