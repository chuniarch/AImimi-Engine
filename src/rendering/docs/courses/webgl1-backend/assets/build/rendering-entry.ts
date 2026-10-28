// 课程页用的真实项目代码打包入口：esbuild 把它打成经典脚本（IIFE），挂到 window.RTeachRendering。
// 源码来自 dual-webgl-backend worktree 的 src/rendering（只读，不修改）。构建命令见 ../../MAINTENANCE.md「真实代码打包」。
// 第 7 课起：core 的 Resource、requireNonNull 和全部错误类。
export { Resource } from '@/rendering/core/Resource'
export { requireNonNull } from '@/rendering/core/requireNonNull'
export * from '@/rendering/core/errors'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
export { ShaderModule } from '@/rendering/resources/ShaderModule'
export { Material } from '@/rendering/resources/Material'
// 第 11、12 课（2026-09-29）：纹理家族。
export { DataTexture2D, ImageTexture2D } from '@/rendering/resources/Texture2D'
export { CubeTexture } from '@/rendering/resources/CubeTexture'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export { Transform } from '@/rendering/scene/Transform'
export { SceneNode } from '@/rendering/scene/SceneNode'
export { Scene } from '@/rendering/scene/Scene'
export { Group } from '@/rendering/scene/Group'
export { Mesh } from '@/rendering/scene/Mesh'
// 第 9 课（2026-09-28）：相机。
export { Camera } from '@/rendering/scene/cameras/Camera'
export { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
export { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
export { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
export { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
export { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
// 第 19 课（Task 15，2026-09-26 提前）：编排层。WebGL1Backend 内部会连带打包用户重写完的 WebGL1ResourceManager。
export { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
export { WebGL1SurfaceScope } from '@/rendering/backend/webgl1/WebGL1SurfaceScope'
export { WebGL1Uniforms } from '@/rendering/backend/webgl1/WebGL1Uniforms'
