// 第 47 课用：真实的 Renderer、RenderPipeline、ForwardPass、WebGL1Backend 和资源类，
// 加上 course 下面课程写的代码（draw-course.ts：记账、步骤标签、ShadowMapPassV1、卡片用的变体）。
// src/rendering 是 2026-10-20 工作区版本（含未提交改动）。
export { Renderer } from '@/rendering/Renderer'
export { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
export { RenderPipeline } from '@/rendering/passes/RenderPipeline'
export { ForwardPass } from '@/rendering/passes/ForwardPass'
export { Scene } from '@/rendering/scene/Scene'
export { Mesh } from '@/rendering/scene/Mesh'
export { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
export { ShaderModule } from '@/rendering/resources/ShaderModule'
export { Material } from '@/rendering/resources/Material'
export { ParameterBlock } from '@/rendering/resources/ParameterBlock'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
export * from '@/rendering/core/errors'
export * as course from './draw-course'
