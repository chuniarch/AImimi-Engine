import { UnsupportedRenderFeatureError, WebGLContextLostError } from '@/rendering/core/errors'

/**
 * 当前 context 的能力快照；扩展对象必须与创建它的 context 一起使用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl1-capabilities-per-context]
 *
 * null 表示本次探测没有取得该扩展，不表示整个 Backend 不可用。
 * 只冻结外层快照，不尝试冻结浏览器提供的扩展对象。
 * context 恢复后必须重新探测，不能复用旧快照。
 */
export interface WebGL1Capabilities {
  readonly vertexArrayObject: OES_vertex_array_object | null
  readonly elementIndexUint: OES_element_index_uint | null
  readonly drawBuffers: WEBGL_draw_buffers | null
  readonly depthTexture: WEBGL_depth_texture | null
  readonly textureFloat: OES_texture_float | null
  readonly textureFloatLinear: OES_texture_float_linear | null
  /**
   * 浮点颜色附件的可渲染能力，不等同于浮点纹理上传或线性过滤能力。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
   * null 只阻止需要 rgba32f 的目标，不应禁用普通 rgba8 或 HW2 绘制。
   */
  readonly colorBufferFloat: WEBGL_color_buffer_float | null
  /**
   * 非零 mip 的 FBO 挂接能力，独立于 mip 存储分配和 shader LOD。
   * @remarks
   * [DESIGN-WEIGHT:3][texture-write-view-subresource]
   * null 不禁止 base-level 目标；实际组合仍须通过 framebuffer completeness。
   */
  readonly fboRenderMipmap: OES_fbo_render_mipmap | null
  readonly shaderTextureLod: EXT_shader_texture_lod | null
  readonly maxVertexTextureUnits: number
  readonly maxCombinedTextureUnits: number
  readonly maxVertexAttributes: number
  /** 片元阶段的纹理单元上限，来自 MAX_TEXTURE_IMAGE_UNITS。 */
  readonly maxTextureUnits: number
}

/** 不把 null、字符串或无效设备查询结果伪装成可用上限。 */
function reqiurePositiveLimit(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new UnsupportedRenderFeatureError(name, 'must report a positive safe integer')

  return value
}

/**
 * 探测已创建且尚未丢失的 WebGL1 context；不创建资源、不选择 Manager。
 *
 * @remarks
 * 查询前后检查 lost，避免把失去 context 时的 null 误判成普通扩展缺失。
 * 本函数不缓存结果；同一 context 的新探测也会返回新的快照。
 */
export function detectWebGL1Capabilities(gl: WebGLRenderingContext): WebGL1Capabilities {
  if (gl.isContextLost()) throw new WebGLContextLostError('detect capabilities')

  const vertexArrayObject = gl.getExtension('OES_vertex_array_object')
  const elementIndexUint = gl.getExtension('OES_element_index_uint')
  const drawBuffers = gl.getExtension('WEBGL_draw_buffers')
  const depthTexture = gl.getExtension('WEBGL_depth_texture')
  const textureFloat = gl.getExtension('OES_texture_float')
  const textureFloatLinear = gl.getExtension('OES_texture_float_linear')
  // 在浮点纹理扩展之后取得可渲染能力；不能用 textureFloat 非空替代此查询。
  const colorBufferFloat = gl.getExtension('WEBGL_color_buffer_float')

  const fboRenderMipmap = gl.getExtension('OES_fbo_render_mipmap')

  const shaderTextureLod = gl.getExtension('EXT_shader_texture_lod')
  const maxVertexAttributes: unknown = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
  const maxTextureUnits: unknown = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)

  const maxVertexTextureUnits: unknown = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)
  const maxCombinedTextureUnits: unknown = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
  if (gl.isContextLost()) throw new WebGLContextLostError('detect capabilities')
  if (
    typeof maxVertexTextureUnits !== 'number' ||
    !Number.isSafeInteger(maxVertexTextureUnits) ||
    maxVertexTextureUnits < 0
  )
    throw new UnsupportedRenderFeatureError(
      'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
      'must report a non-negative safe integer'
    )

  return Object.freeze({
    shaderTextureLod,
    maxVertexTextureUnits,
    maxCombinedTextureUnits: reqiurePositiveLimit(
      maxCombinedTextureUnits,
      'MAX_COMBINED_TEXTURE_IMAGE_UNITS'
    ),
    vertexArrayObject,
    elementIndexUint,
    drawBuffers,
    depthTexture,
    textureFloat,
    textureFloatLinear,
    colorBufferFloat,
    fboRenderMipmap,
    maxVertexAttributes: reqiurePositiveLimit(maxVertexAttributes, 'MAX_VERTEX_ATTRIBS'),
    maxTextureUnits: reqiurePositiveLimit(maxTextureUnits, 'MAX_TEXTURE_IMAGE_UNITS')
  })
}
