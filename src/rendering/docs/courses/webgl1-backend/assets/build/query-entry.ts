// 第 39 课用：帧编排（Renderer、Pipeline、ForwardPass）、WebGL1Backend 和课程写的计数器、FFT 形状的 Pass。
// src/rendering 是 2026-10-15 工作区版本（含未提交改动）。
// course 下面是课程写的代码（query-course.ts），项目源码里没有。
export { Renderer } from '@/rendering/Renderer'
export { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
export { RenderPipeline } from '@/rendering/passes/RenderPipeline'
export { ForwardPass } from '@/rendering/passes/ForwardPass'
export { Scene } from '@/rendering/scene/Scene'
export { Mesh } from '@/rendering/scene/Mesh'
export { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
export { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
export { ShaderModule } from '@/rendering/resources/ShaderModule'
export { Material } from '@/rendering/resources/Material'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
export * from '@/rendering/core/errors'
export * as course from './query-course'
