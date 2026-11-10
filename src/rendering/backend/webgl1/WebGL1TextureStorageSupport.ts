import { UnsupportedRenderFeatureError } from '@/rendering/core/errors'
import type {
  TextureResourceDescriptor,
  TextureSamplerDescriptor,
  TextureMinFilter,
  TextureWrapMode
} from '@/rendering/resources/textureTypes'
import type { WebGL1Capabilities } from './WebGL1Capabilities'
import type { WebGL1TextureSourceSnapshot } from './WebGL1TextureSourceUpload'
import { assertTextureOperation, requireTextureLimit } from './WebGL1TextureUploadSupport'

export type WebGL1TextureCapabilities = Pick<
  WebGL1Capabilities,
  'textureFloat' | 'textureFloatLinear'
>

/**
 * 存储可分配不等于 FBO 可渲染；本层不以 colorBufferFloat 或 mip 挂接扩展拒绝上传。
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
 * 保留 source 的 r/rg、float 图片/自动 mip 和 sRGB 限制；render 显式分配 mip 不生成内容。
 */
export function validateWebGL1TextureStorage(
  gl: WebGLRenderingContext,
  capabilities: WebGL1TextureCapabilities,
  descriptor: TextureResourceDescriptor,
  sampler: TextureSamplerDescriptor,
  source: WebGL1TextureSourceSnapshot | null,
  label: string,
  getSRGB: () => EXT_sRGB | null
): { readonly target: number; readonly format: number; readonly type: number } {
  const unsupported = (reason: string): never => {
    throw new UnsupportedRenderFeatureError('texture ' + label, reason)
  }
  const { width, height, storage, colorSpace, dimension, mipLevelCount } = descriptor
  const cube = dimension === 'cube'
  const maximum = cube
    ? requireTextureLimit(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE, 'MAX_CUBE_MAP_TEXTURE_SIZE')
    : requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, 'MAX_TEXTURE_SIZE')
  if (width > maximum || height > maximum) unsupported('pixel dimensions exceed device limit')
  const pot = Number.isInteger(Math.log2(width)) && Number.isInteger(Math.log2(height))
  if (
    !pot &&
    (sampler.wrapS !== 'clamp-to-edge' ||
      sampler.wrapT !== 'clamp-to-edge' ||
      mipLevelCount !== 1 ||
      source?.generateMipmap ||
      (sampler.minFilter !== 'nearest' && sampler.minFilter !== 'linear'))
  ) {
    unsupported('WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps')
  }
  if (storage.format !== 'rgb' && storage.format !== 'rgba')
    unsupported('r/rg channel mapping is not implemented')
  if (storage.type === 'float32') {
    if (source?.faces.some((face) => face.kind === 'image'))
      unsupported('float32 requires CPU pixel data')
    if (capabilities.textureFloat === null) unsupported('OES_texture_float is required')
    if (
      (sampler.magFilter === 'linear' || sampler.minFilter.includes('linear')) &&
      capabilities.textureFloatLinear === null
    )
      unsupported('OES_texture_float_linear is required')
    if (source?.generateMipmap) unsupported('float32 mipmap generation is not implemented')
    if (colorSpace === 'srgb') unsupported('sRGB storage requires uint8')
  }
  let format: number = storage.format === 'rgb' ? gl.RGB : gl.RGBA
  if (colorSpace === 'srgb') {
    const extension = getSRGB()
    if (extension === null)
      return unsupported('EXT_sRGB is required; no implicit color-space fallback')
    format = storage.format === 'rgb' ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT
  }
  return {
    target: cube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D,
    format,
    type: storage.type === 'float32' ? gl.FLOAT : gl.UNSIGNED_BYTE
  }
}

/** 在已绑定纹理上按 face/mip 分配 null 存储；不生成 mip，也不声明像素已生产。 */
export function allocateWebGL1RenderTexture(
  gl: WebGLRenderingContext,
  descriptor: TextureResourceDescriptor,
  format: number,
  type: number,
  label: string,
  assertBuilding: () => void
): void {
  const cube = descriptor.dimension === 'cube'
  for (let face = 0; face < (cube ? 6 : 1); face++) {
    const target = cube ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + face : gl.TEXTURE_2D
    for (let mip = 0; mip < descriptor.mipLevelCount; mip++) {
      assertBuilding()
      gl.texImage2D(
        target,
        mip,
        format,
        Math.max(1, Math.floor(descriptor.width / 2 ** mip)),
        Math.max(1, Math.floor(descriptor.height / 2 ** mip)),
        0,
        format,
        type,
        null
      )
      assertTextureOperation(gl, 'allocate texture face/mip ' + face + '/' + mip, label)
      assertBuilding()
    }
  }
}

/** 应用默认 sampler；每条命令后检查同步关闭，不拥有第二份 sampler/texture 缓存。 */
export function applyWebGL1TextureSampler(
  gl: WebGLRenderingContext,
  target: number,
  sampler: TextureSamplerDescriptor,
  assertBuilding: () => void
): void {
  const wraps: Record<TextureWrapMode, number> = {
    'clamp-to-edge': gl.CLAMP_TO_EDGE,
    repeat: gl.REPEAT,
    'mirrored-repeat': gl.MIRRORED_REPEAT
  }
  const filters: Record<TextureMinFilter, number> = {
    nearest: gl.NEAREST,
    linear: gl.LINEAR,
    'nearest-mipmap-nearest': gl.NEAREST_MIPMAP_NEAREST,
    'linear-mipmap-nearest': gl.LINEAR_MIPMAP_NEAREST,
    'nearest-mipmap-linear': gl.NEAREST_MIPMAP_LINEAR,
    'linear-mipmap-linear': gl.LINEAR_MIPMAP_LINEAR
  }
  for (const [name, value] of [
    [gl.TEXTURE_WRAP_S, wraps[sampler.wrapS]],
    [gl.TEXTURE_WRAP_T, wraps[sampler.wrapT]],
    [gl.TEXTURE_MIN_FILTER, filters[sampler.minFilter]],
    [gl.TEXTURE_MAG_FILTER, filters[sampler.magFilter]]
  ] as const) {
    assertBuilding()
    gl.texParameteri(target, name, value)
    assertBuilding()
  }
}
