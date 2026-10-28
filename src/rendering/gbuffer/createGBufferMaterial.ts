import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import type { Texture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
import vertexSource from '@/shaders/deferred/gbufferViewSpace/vertex.vert?raw'
import fragmentSource from '@/shaders/deferred/gbufferViewSpace/fragment.frag?raw'
import { InvalidGBufferError } from '@/rendering/core/errors'

/**
 * 记录本模块创建的 GBuffer shader 对象，而不是它们的名称。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * 同名 ShaderModule 仍可能使用完全不同的源码，不能仅凭 name 接受它。
 * WeakSet 只用于 has 查询，不枚举、不取得所有权，也不阻止对象被垃圾回收。
 * 它不负责检查 disposed；资源是否仍可用需要另行调用 assertUsable。
 */
const producerShaders = new WeakSet<ShaderModule>()

/**
 * 创建写入四项观察空间表面数据的 GLSL ES 1.00 ShaderModule。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * 此处只创建 CPU 描述，不编译 shader、不创建 GPU Program。
 * 内建映射左侧是引擎语义，右侧是 GLSL 中实际声明的 uniform 名称。
 * Backend 从当前 DrawSubmission 提供矩阵，不能把矩阵写入共享 Material。
 *
 * 每次调用返回新的对象。同一个 GBufferPass 及其所有输入材质应借用
 * 同一次调用的结果，而不是为每个物体重新创建同名 ShaderModule。
 *
 * @returns 由调用者管理生命周期的新 ShaderModule。
 */
export function createGBufferShaderModule(): ShaderModule {
  const shader = new ShaderModule({
    name: 'GBuffer/view-space',
    language: 'glsl-es-100',
    vertexSource,
    fragmentSource,
    builtInUniforms: {
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix',
      normalMatrix: 'uNormalMatrix'
    }
  })
  producerShaders.add(shader)
  return shader
}

/**
 * 检查 shader 是否由本模块创建，并且尚未释放。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * TypeScript 的参数类型不能替代运行时检查。先确认实际类型和工厂登记，
 * 再调用资源方法；不向通用 ShaderModule 增加 GBuffer 专属属性。
 * 此检查不是 GLSL 编译验证，编译与设备能力仍由 Backend 负责。
 *
 * @param shader - 待借用的专用 shader 对象。
 * @throws InvalidGBufferError 对象类型不正确或未由专用工厂创建。
 * @throws ResourceDisposedError 已登记的 shader 已释放。
 */
export function assertGBufferShaderModule(shader: ShaderModule): void {
  if (!(shader instanceof ShaderModule) || !producerShaders.has(shader)) {
    throw new InvalidGBufferError('shaderModule', 'must come from createGBufferShaderModule')
  }
  shader.assertUsable()
}

/**
 * 创建专用不透明材质，只借用 shader 和颜色采样源。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][gbuffer-borrowed-scene-resources]
 * 场景/创建者分别管理 Material、shader、Texture 或附件所属 RenderTarget。
 * 构造与释放本 Material 都不会 retain/release/dispose 这些借用资源。
 * 颜色源可以是 Texture2D 或颜色附件；常量颜色由调用者提供显式 1×1 纹理。
 *
 * 深度测试和写入决定保留哪个表面；less 固定本批深度比较规则。
 * dither=false 表达数据输出不使用颜色量化抖动，不依赖上一笔 draw 的状态。
 * sRGB 输入的解码由纹理采样路径承担，此 shader 不再重复执行 pow。
 * 本批不处理透明度、法线贴图或光照，也不往材质中放入灯光参数。
 *
 * @param shader - 与目标 GBufferPass 共享的、仍存活的工厂结果。
 * @param baseColorMap - 基础颜色的逻辑采样来源，不是原生 GPU handle。
 * @returns 新 Material；只借用参数中的资源。
 * @throws InvalidGBufferError shader 不符合专用工厂约定。
 * @throws InvalidMaterialError 颜色参数不是合法的二维采样来源。
 * @throws ResourceDisposedError shader 或采样来源对应的资源已释放。
 */
export function createGBufferMaterial(
  shader: ShaderModule,
  baseColorMap: Texture2DSamplingSource
): Material {
  assertGBufferShaderModule(shader)
  return new Material({
    shaderModule: shader,
    queue: 'opaque',
    state: {
      depthTest: true,
      depthWrite: true,
      depthFunction: 'less',
      cullMode: 'back',
      dither: false
    },
    parameters: { uBaseColorMap: { type: 'texture2D', value: baseColorMap } }
  })
}

/**
 * 预检材质并返回存活的采样源，不修改调用者的 Material。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-preflight-before-draw]
 * 调用方先通过 assertGBufferShaderModule 验证 Pass 使用的 shader。
 * 本函数检查材质引用的是同一个对象，而不是相同名称或相同源码。
 *
 * 可以手工构造 Material，但必须保持 opaque、depthTest/write、less 和
 * dither=false。cullMode 允许调用者选择，工厂默认值 back 不是强制限制。
 *
 * getParameter 只读取本地参数，不搜索 ParameterBlock。本批约定
 * uBaseColorMap 是每个表面材质自己的参数，不从共享灯光/阴影块中取得。
 * 读取时会检查采样资源存活并复制参数包装，但不复制纹理像素或取得所有权。
 *
 * 返回来源供 GBufferPass 检查是否采样自己的输出目标；本函数没有目标信息，
 * 因而不承担反馈回路检查，也不证明某个附件的内容已由生产者绘制完成。
 *
 * @param material - 本次 RenderItem 借用的材质。
 * @param shader - 已通过专用工厂校验、属于当前 Pass 的 shader。
 * @returns 存活的逻辑二维采样来源。
 * @throws InvalidGBufferError 类型、shader 身份、队列、状态或颜色参数类型不匹配。
 * @throws ResourceDisposedError 材质、shader 或采样资源已释放。
 */
export function requireGBufferBaseColorSource(
  material: Material,
  shader: ShaderModule
): Texture2DSamplingSource {
  if (!(material instanceof Material)) {
    throw new InvalidGBufferError('material', 'must reference a Material')
  }
  material.assertUsable()
  if (material.shaderModule !== shader) {
    throw new InvalidGBufferError('material.shaderModule', 'must match this Pass shader identity')
  }
  const state = material.state
  if (
    material.queue !== 'opaque' ||
    !state.depthTest ||
    !state.depthWrite ||
    state.depthFunction !== 'less' ||
    state.dither
  ) {
    throw new InvalidGBufferError(
      'material.state',
      'requires opaque, depthTest/write, less and dither=false'
    )
  }
  const parameter = material.getParameter('uBaseColorMap')
  if (parameter?.type !== 'texture2D') {
    throw new InvalidGBufferError('material.uBaseColorMap', 'must be a texture2D parameter')
  }
  return parameter.value
}
