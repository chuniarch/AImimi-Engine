import type { WebGL1ResourceGeneration } from './WebGL1ResourceGeneration'
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
 * 在当前 texture unit 上传，结束后尽力恢复真实状态。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][texture-upload-state-scope]
 * 不切换到硬编码 TEXTURE0；alignment=1 支持紧密 RGB，禁止隐式翻转、预乘和转换。
 * callback 必须同步且不得切换 active unit 或修改另一种 texture target 的绑定。
 * ImageBitmap 的解码方向/预乘仍由创建者负责。
 *
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 * 每条命令前后检查共享 generation；即使物理 context 已恢复也不恢复旧代绑定。
 * 只 invalidate CPU State 缓存不能恢复 GL，调用方仍须在 finally invalidateState。
 *
 * [DESIGN-WEIGHT:3][texture-upload-state-recovery]
 * active unit 确认恢复后才绑定该 unit 的旧 texture；四项 unpack 独立恢复。
 * 恢复失败不会吞掉业务异常；throw undefined 也计入失败。
 * 失败必须中止本次生产，不能把未完整恢复描述为成功。
 */
export function withTextureUploadState<T>(
  gl: WebGLRenderingContext,
  target: number,
  generation: WebGL1ResourceGeneration,
  callback: () => T
): T {
  /** 检查 GL error 与永久代次状态，不能由物理 ready 替代 generation。 */
  function operation<V>(name: string, action: () => V): V {
    generation.assertCurrent(name)
    try {
      const result = action()
      generation.assertCurrent(name)
      assertTextureOperation(gl, name, 'texture upload state')
      generation.assertCurrent(name)
      return result
    } catch (cause) {
      // JS 异常可能使正常返回后的检查不可达，仍要锁存观察到的物理 lost。
      if (generation.lost) generation.invalidate()
      throw cause
    }
  }
  function read<V>(parameter: number): V {
    return operation('capture texture upload state', () => gl.getParameter(parameter) as V)
  }
  const activeUnit = read<number>(gl.ACTIVE_TEXTURE)
  const bindingParameter =
    target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP : gl.TEXTURE_BINDING_2D
  const texture = read<WebGLTexture | null>(bindingParameter)
  const alignment = read<number>(gl.UNPACK_ALIGNMENT)
  const flip = read<boolean>(gl.UNPACK_FLIP_Y_WEBGL)
  const premultiply = read<boolean>(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)
  const conversion = read<number>(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)
  const failures: unknown[] = []
  let result!: T
  try {
    operation('set upload alignment', () => gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1))
    operation('set upload flip', () => gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false))
    operation('set upload premultiply', () =>
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    )
    operation('set upload color conversion', () =>
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    )
    result = operation('run texture upload', callback)
  } catch (cause) {
    failures.push(cause)
  }

  /** lost 后不继续发 GL；此前存在业务错误时将 lost 原因一同保存。 */
  function restore(name: string, action: () => void): boolean {
    if (generation.lost) {
      if (!failures.some((cause) => cause instanceof WebGLContextLostError))
        failures.push(new WebGLContextLostError(name))
      return false
    }
    try {
      operation(name, action)
      return true
    } catch (cause) {
      failures.push(cause)
      return false
    }
  }
  if (restore('restore active texture unit', () => gl.activeTexture(activeUnit)))
    restore('restore texture binding', () => gl.bindTexture(target, texture))
  restore('restore upload alignment', () => gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment))
  restore('restore upload flip', () => gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip))
  restore('restore upload premultiply', () =>
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply)
  )
  restore('restore upload color conversion', () =>
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, conversion)
  )

  if (failures.length === 1) throw failures[0]
  if (failures.length > 1)
    throw new AggregateError(failures, 'Texture upload or state restoration failed')
  return result
}
