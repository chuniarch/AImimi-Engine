// 第 27 课用：RenderTarget、RenderTargetManager，以及使用它的 SurfaceScope、State。
// 2026-10-12 打包时 RenderTarget.ts、WebGL1RenderTargetManager.ts、WebGL1SurfaceScope.ts 有未提交改动（工作区版本）。
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export { copyTexture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
export { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
export { WebGL1SurfaceScope } from '@/rendering/backend/webgl1/WebGL1SurfaceScope'
export { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
export {
  withTextureUploadState,
  assertTextureOperation,
  requireTextureLimit
} from '@/rendering/backend/webgl1/WebGL1TextureUploadSupport'
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
export * from '@/rendering/core/errors'
export { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
