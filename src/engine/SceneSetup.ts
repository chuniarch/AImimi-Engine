import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { Scene } from '@/rendering/scene/Scene'
import type { Camera } from '@/rendering/scene/cameras/Camera'

/**
 * 场景模块交给 Engine 的一次完整安装：CPU 场景、相机和本场景的整条 Pass 顺序。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][engine-scene-setup-ownership]
 *
 * passes 是执行顺序，例如 [shadowPass, forwardPass]；每次 setScene 都要交新实例。
 * 提交前失败：scene 和 passes 都仍归调用者，由调用者释放。
 * 提交成功：scene 归 Engine 的场景槽位，passes 归 Engine 新装的 Pipeline。
 *
 * 只放类型，不 import Engine：场景 Controller 依赖本文件时，
 * 不会经由类型依赖把旧 WebGLRenderer 带进新架构的场景代码。
 */
export interface SceneSetup {
  readonly scene: Scene
  readonly camera: Camera
  readonly passes: readonly RenderPass[]
}
