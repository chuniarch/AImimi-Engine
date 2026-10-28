// 第 15 课用：WebGL1ProgramManager，以及它要用的 ShaderModule 和错误类。
export { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
export { ShaderModule } from '@/rendering/resources/ShaderModule'
export * from '@/rendering/core/errors'
export { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
// 2026-10-08（第 15 课 2.6 节 beforeDelete）：顶点输入要的几样，好在卡片里数真实的 VAO。
export { createWebGL1VertexInputManager } from '@/rendering/backend/webgl1/WebGL1VertexInputManager'
export { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
