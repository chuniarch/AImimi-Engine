// 第 13 课用的小包：只放 Capabilities、ContextLifecycle 和错误类，免得为它重建 rendering-bundle.js、牵连前面各课的卡片。
// 源码来自 dual-webgl-backend worktree 的 src/rendering（只读，不修改）。构建命令见 ../../MAINTENANCE.md「真实代码打包」。
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
export { WebGLContextLifecycle } from '@/rendering/backend/webgl1/WebGLContextLifecycle'
export * from '@/rendering/core/errors'
