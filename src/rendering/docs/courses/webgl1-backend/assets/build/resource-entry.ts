// 第 18 课用：WebGL1ResourceManager 和它组装的六个 Manager，以及卡片要用的 CPU 资源。
// 2026-10-14 打包时 ResourceManager、Geometry/ProgramManager 有未提交改动，Texture2DManager 未跟踪（工作区版本）。
// course 下面是课程写的第 1 版（resource-course.ts），项目源码里没有。
export { WebGL1ResourceManager } from '@/rendering/backend/webgl1/WebGL1ResourceManager'
export { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
export { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
export { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
export { createWebGL1VertexInputManager } from '@/rendering/backend/webgl1/WebGL1VertexInputManager'
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
export { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
export { ShaderModule } from '@/rendering/resources/ShaderModule'
export { DataTexture2D } from '@/rendering/resources/Texture2D'
export { CubeTexture } from '@/rendering/resources/CubeTexture'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export * from '@/rendering/core/errors'
export * as course from './resource-course'
