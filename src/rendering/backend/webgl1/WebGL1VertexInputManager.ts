import type { Geometry } from '@/rendering/resources/Geometry'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import type { WebGL1GeometryResource } from './WebGL1GeometryManager'
import type { WebGL1ProgramResource } from './WebGL1ProgramManager'
import { WebGL1ManualVertexInputManager } from './WebGL1ManualVertexInputManager'
import { WebGL1OESVertexInputManager } from './WebGL1OESVertexInputManager'

/**
 * 为一次 draw 准备顶点输入；不选择 program，不上传 uniform，也不执行 draw。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][vertex-input-borrowed-resources]
 *
 * GPU 参数必须是同一 Backend、同一 context 当前代 Manager 返回的存活对象。
 * bind 失败时调用者不得继续 draw。
 * Geometry/Program 删除前，由资源协调层调用对应 release 方法。
 * VertexInputManager 只拥有 VAO 或绑定记录，不拥有传入的 buffers/program。
 */
export interface WebGL1VertexInputManager {
  /** 根据当前 GPU buffers 和 program 布局准备顶点输入。 */
  bind(
    geometry: Geometry,
    gpuGeometry: WebGL1GeometryResource,
    program: WebGL1ProgramResource
  ): void

  /** 结束当前绑定；不删除 GeometryManager/ProgramManager 拥有的资源。 */
  unbind(): void

  /** 放弃关联此 CPU Geometry 的顶点输入缓存或当前绑定。 */
  releaseGeometry(geometry: Geometry): void

  /** 放弃关联此真实 GPU program 的顶点输入缓存或当前绑定。 */
  releaseProgram(program: WebGLProgram): void

  /** 丢弃失效 context 的记录，不再操作旧代 GPU 对象。 */
  invalidateForContextLoss(): void

  /** 结束本策略生命周期，只清理自己拥有的资源与记录。 */
  dispose(): void
}

/**
 * 只允许同步使 State 缓存失效，不得发 GL 命令或抛错。
 *
 * @remarks
 * 本批会直接绑定 ARRAY_BUFFER 和 VAO/EBO，所以应接完整 state.invalidate()，
 * 不能只接 invalidateVertexInputState()。
 * 回调只注入缓存失效能力，不依赖完整 State 类。
 */
export interface WebGL1VertexInputHooks {
  readonly invalidateState: () => undefined
}

/**
 * 在 Backend 组装时选择一次策略。
 *
 * @remarks
 * 上层 Mesh、Material、Pass 不参与扩展判断。
 * capabilities 必须属于传入 gl 的当前 context 代。
 */
export function createWebGL1VertexInputManager(
  gl: WebGLRenderingContext,
  capabilities: Pick<WebGL1Capabilities, 'vertexArrayObject' | 'maxVertexAttributes'>,
  hooks: WebGL1VertexInputHooks
): WebGL1VertexInputManager {
  const extension = capabilities.vertexArrayObject

  if (extension !== null) {
    return new WebGL1OESVertexInputManager(gl, extension, capabilities.maxVertexAttributes, hooks)
  }

  return new WebGL1ManualVertexInputManager(gl, capabilities.maxVertexAttributes, hooks)
}
