// 第 22 课用：真实的 Renderer、WebGL1Backend 和资源类，加上 course 下面课程写的代码
// （review-course.ts：需求场景、记账、回读、模拟别的设备）。
// src/rendering 是 2026-10-20 工作区版本（含未提交改动）。
export { Renderer } from '@/rendering/Renderer'
export { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
export { Geometry } from '@/rendering/resources/Geometry'
export { VertexAttribute } from '@/rendering/resources/VertexAttribute'
export { DataTexture2D } from '@/rendering/resources/Texture2D'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export * from '@/rendering/core/errors'
export * as course from './review-course'
