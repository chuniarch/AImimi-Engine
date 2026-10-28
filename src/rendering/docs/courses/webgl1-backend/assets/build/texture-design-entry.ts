// 第 29 课用：纹理一族的 CPU 资源（Texture2D、CubeTexture、RenderTarget、采样来源）和三个 GPU Manager。
// 2026-10-11 打包时 WebGL1Texture2DManager.ts、Texture2DSamplingSource.ts 还没有提交（工作区版本）。
export {
  Texture2D,
  ImageTexture2D,
  DataTexture2D
} from '@/rendering/resources/Texture2D'
export { CubeTexture } from '@/rendering/resources/CubeTexture'
export { RenderTarget } from '@/rendering/resources/RenderTarget'
export { copyTexture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
export { WebGL1Texture2DManager } from '@/rendering/backend/webgl1/WebGL1Texture2DManager'
export { WebGL1CubeTextureManager } from '@/rendering/backend/webgl1/WebGL1CubeTextureManager'
export { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
export {
  withTextureUploadState,
  assertTextureOperation,
  requireTextureLimit
} from '@/rendering/backend/webgl1/WebGL1TextureUploadSupport'
export { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
export * from '@/rendering/core/errors'
export { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
