// 第 18 课的课程版代码（项目源码里没有）：没有 ResourceManager 时，Backend 自己管六个 Manager 的写法。
// 课程页上展示的就是这里的代码；resource-entry.ts 把它和真实的 src/rendering 打进同一个包。
import type { WebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
import { WebGL1CubeTextureManager } from '@/rendering/backend/webgl1/WebGL1CubeTextureManager'
import { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
import { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
import { WebGL1Texture2DManager } from '@/rendering/backend/webgl1/WebGL1Texture2DManager'
import {
  createWebGL1VertexInputManager,
  type WebGL1VertexInputManager
} from '@/rendering/backend/webgl1/WebGL1VertexInputManager'

/** 和 ResourceManager 一样，只接一个「让 State 忘掉缓存」的回调。 */
export interface ManagersV1Hooks {
  readonly invalidateState: () => undefined
}

/**
 * 第 1 版：六个 Manager 是公开字段，各建各的，彼此不接线。
 * 关闭时按声明顺序逐个 dispose；某个抛错就记下来、接着清理下一个（「尽力而为」）。
 */
export class ManagersV1 {
  readonly programs: WebGL1ProgramManager
  readonly geometries: WebGL1GeometryManager
  readonly textures2D: WebGL1Texture2DManager
  readonly cubeTextures: WebGL1CubeTextureManager
  readonly renderTargets: WebGL1RenderTargetManager
  readonly vertexInputs: WebGL1VertexInputManager

  constructor(
    gl: WebGLRenderingContext,
    capabilities: WebGL1Capabilities,
    hooks: ManagersV1Hooks
  ) {
    // 没有 beforeDelete：删 program、删 buffer 之前，没人通知顶点输入
    this.programs = new WebGL1ProgramManager(gl, { invalidateState: hooks.invalidateState })
    this.geometries = new WebGL1GeometryManager(gl, capabilities, {
      invalidateState: hooks.invalidateState
    })
    this.textures2D = new WebGL1Texture2DManager(gl, capabilities, hooks)
    this.cubeTextures = new WebGL1CubeTextureManager(gl, capabilities, hooks)
    this.renderTargets = new WebGL1RenderTargetManager(gl, capabilities, hooks)
    this.vertexInputs = createWebGL1VertexInputManager(gl, capabilities, hooks)
  }

  /** context 丢了：逐个通知。前提是调用者记得调用它。 */
  invalidateForContextLoss(): void {
    for (const manager of this.all()) manager.invalidateForContextLoss()
  }

  /** 尽力而为：一个失败了，接着清理下一个，最后把第一个错误抛出去。 */
  dispose(): void {
    let firstError: unknown = null
    for (const manager of this.all()) {
      try {
        manager.dispose()
      } catch (error) {
        firstError ??= error
      }
    }
    if (firstError !== null) throw firstError
  }

  /** 声明顺序：借用 buffer 和 program 的顶点输入排在最后。 */
  private all() {
    return [
      this.programs,
      this.geometries,
      this.textures2D,
      this.cubeTextures,
      this.renderTargets,
      this.vertexInputs
    ]
  }
}
