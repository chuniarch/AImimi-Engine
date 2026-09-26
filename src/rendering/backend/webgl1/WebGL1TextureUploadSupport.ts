import { UnsupportedRenderFeatureError, WebGLContextLostError } from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'

/** Manager 直接操作 GL 后，通知 Backend 丢弃状态缓存；不取得 State 所有权。 */
export interface WebGL1TextureManagerHooks {
  /**
   * 必须同步、不抛错、只清 CPU 缓存，不得调用 GL 或重新进入 Manager。
   * 接线方式：() => { state.invalidate() }。
   */
  readonly invalidateState: () => undefined
}

/**
 * 创建/上传的冷路径检查，不放进每次纹理采样。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-resource-error-boundaries]
 * create-null、FBO completeness 仍由各自检查负责。本函数只检查 GL error 和 lost。
 * 入口也调用一次，避免把前序遗留的 GL error 误认为本次上传产生。
 */
export function assertTextureOperation(
  gl: WebGLRenderingContext,
  operation: string,
  label: string
): void {
  if (gl.isContextLost()) throw new WebGLContextLostError(operation)
  const error = gl.getError()
  if (gl.isContextLost()) throw new WebGLContextLostError(operation)
  if (error !== gl.NO_ERROR) {
    throw new WebGLOperationError(operation, label, 'GL error 0x' + error.toString(16))
  }
}

/** 查询冷路径所需尺寸/槽位上限，不把异常驱动返回值转换为合法数字。 */
export function requireTextureLimit(
  gl: WebGLRenderingContext,
  parameter: number,
  name: string
): number {
  const value: unknown = gl.getParameter(parameter)
  if (gl.isContextLost()) throw new WebGLContextLostError('query ' + name)
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new UnsupportedRenderFeatureError(name, 'invalid device limit')

  return value
}

/**
 * 在当前 texture unit 上建立同步上传作用域，结束后恢复真实旧状态。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][texture-upload-state-scope]
 *
 * 不切换到硬编码的 TEXTURE0；只改当前 unit 的指定 target 绑定。
 * alignment=1 支持宽度为 3 的紧密 RGB 数据；不能继承外部 alignment=4/8。
 * 固定不翻转、不预乘、不执行隐式浏览器颜色转换。
 * ImageBitmap 的方向和预乘还要求创建者提供正确的解码选项，不能靠 pixelStore 补救。
 * lost 后旧绑定全部无效，不尝试恢复。
 *
 * @internal callback 必须同步，不得切换 active unit 或修改其他 target 的绑定。
 */
export function withTextureUploadState<T>(
  gl: WebGLRenderingContext,
  target: number,
  callback: () => T
): T {
  const activeUnit = gl.getParameter(gl.ACTIVE_TEXTURE) as number
  const bindingParameter =
    target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP : gl.TEXTURE_BINDING_2D
  const texture = gl.getParameter(bindingParameter) as WebGLTexture | null
  const alignment = gl.getParameter(gl.UNPACK_ALIGNMENT) as number
  const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL) as boolean
  const premultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL) as boolean
  const conversion = gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL) as number

  if (gl.isContextLost()) throw new WebGLContextLostError('capture texture upload state')

  try {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    return callback()
  } finally {
    if (!gl.isContextLost()) {
      gl.activeTexture(activeUnit)
      gl.bindTexture(target, texture)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply)
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, conversion)
    }
  }
}
