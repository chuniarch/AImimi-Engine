import type { PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { Engine } from '@/engine'
import type { WebGLRenderer } from '@/renderers/WebGLRenderer'

/**
 * 渐进迁移期间提供给场景入口的上下文，不是新 Renderer 的输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][scene-context-legacy-boundary]
 * renderer/camera/controls 保持旧类型，供尚未迁移的作业使用。
 * HW2 通过 engine.setScene() 交接新的 CPU Scene/Camera，不使用这些旧绘制对象。
 * Task 22 的入口负责取消过期加载和释放 GUI/Controller；Engine 不猜测 loader 返回值。
 */
export interface SceneContext {
  gl: WebGLRenderingContext
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  controls: OrbitControls
  engine: Engine
}
