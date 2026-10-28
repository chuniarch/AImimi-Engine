import { describe, expect, it } from 'vitest'

import { detectWebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
import { UnsupportedRenderFeatureError, WebGLContextLostError } from '@/rendering/core/errors'

import { createFakeWebGL1Context } from '../fakes/createFakeWebGL1Context'

/**
 * 检查探测结果的来源、隔离和失败边界，不把“有扩展”当成已通过绘制验收。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-capabilities-context-isolation]
 */
describe('WebGL1Capabilities', () => {
  /** 扩展缺失是合法结果；字符串拼错或查询错 limit 都会使本测试失败。 */
  it('查询七个扩展和两个上限，冻结快照但不冻结扩展对象', () => {
    const fake = createFakeWebGL1Context()
    const vaoExtension = { label: 'context-A-vao' }
    fake.extensions.set('OES_vertex_array_object', vaoExtension)
    fake.limits.set(fake.gl.MAX_VERTEX_ATTRIBS, 16)
    const result = detectWebGL1Capabilities(fake.gl)

    expect(fake.calls.getExtension.mock.calls.map(([name]) => name)).toEqual([
      'OES_vertex_array_object',
      'OES_element_index_uint',
      'WEBGL_draw_buffers',
      'WEBGL_depth_texture',
      'OES_texture_float',
      'OES_texture_float_linear',
      'WEBGL_color_buffer_float'
    ])
    expect(fake.calls.getParameter.mock.calls).toEqual([
      [fake.gl.MAX_VERTEX_ATTRIBS],
      [fake.gl.MAX_TEXTURE_IMAGE_UNITS]
    ])
    expect(result).toEqual({
      vertexArrayObject: vaoExtension,
      elementIndexUint: null,
      drawBuffers: null,
      depthTexture: null,
      textureFloat: null,
      textureFloatLinear: null,
      colorBufferFloat: null,
      maxVertexAttributes: 16,
      maxTextureUnits: 8
    })
    expect(result.vertexArrayObject).toBe(vaoExtension)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(vaoExtension)).toBe(false)
  })

  /** 新 context 和同一 context 的新探测都不得复用旧能力快照。 */
  it('隔离两个 context，并在重新探测时读取新的扩展对象和上限', () => {
    const a = createFakeWebGL1Context()
    const b = createFakeWebGL1Context()
    const oldExtension = {}
    const newExtension = {}
    a.extensions.set('OES_element_index_uint', oldExtension)
    const old = detectWebGL1Capabilities(a.gl)
    expect(detectWebGL1Capabilities(b.gl).elementIndexUint).toBeNull()

    a.extensions.set('OES_element_index_uint', newExtension)
    a.limits.set(a.gl.MAX_TEXTURE_IMAGE_UNITS, 16)
    const fresh = detectWebGL1Capabilities(a.gl)
    expect(fresh).not.toBe(old)
    expect(fresh.elementIndexUint).toBe(newExtension)
    expect(fresh.maxTextureUnits).toBe(16)
    expect(old.elementIndexUint).toBe(oldExtension)
    expect(old.maxTextureUnits).toBe(8)
  })

  it('lost 时不把设备查询失败误判为普通扩展缺失', () => {
    const fake = createFakeWebGL1Context()
    fake.setLost(true)
    expect(() => detectWebGL1Capabilities(fake.gl)).toThrow(WebGLContextLostError)
    expect(fake.calls.getExtension).not.toHaveBeenCalled()
    fake.setLost(false)
    fake.calls.getParameter.mockImplementation(() => {
      fake.setLost(true)
      return null
    })
    expect(() => detectWebGL1Capabilities(fake.gl)).toThrow(WebGLContextLostError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
   * Given 两个 context；When 重新探测 A；Then 不借用 B 或旧代的扩展对象。
   * 不能拿 OES_texture_float 对象冒充可渲染能力，也不能冻结浏览器对象本身。
   */
  it('独立记录颜色浮点扩展，重新探测不修改旧快照', () => {
    const a = createFakeWebGL1Context()
    const b = createFakeWebGL1Context()
    const uploadExtension = {}
    const oldExtension = { RGBA32F_EXT: 0x8814 }
    const restoredExtension = { RGBA32F_EXT: 0x8814 }
    a.extensions.set('OES_texture_float', uploadExtension)
    a.extensions.set('WEBGL_color_buffer_float', oldExtension)
    const old = detectWebGL1Capabilities(a.gl)

    expect(old.colorBufferFloat).toBe(oldExtension)
    expect(old.colorBufferFloat).not.toBe(uploadExtension)
    expect(detectWebGL1Capabilities(b.gl).colorBufferFloat).toBeNull()
    expect(Object.isFrozen(oldExtension)).toBe(false)
    expect(Object.isFrozen(old)).toBe(true)

    a.extensions.set('WEBGL_color_buffer_float', restoredExtension)
    const fresh = detectWebGL1Capabilities(a.gl)
    expect(fresh.colorBufferFloat).toBe(restoredExtension)
    expect(old.colorBufferFloat).toBe(oldExtension)
  })

  /** 扩展查询期间丢失 context：不能把该次 null 发布成一个正常能力快照。 */
  it('颜色浮点扩展探测中 lost 仍抛 context 专用错误', () => {
    const fake = createFakeWebGL1Context()
    fake.calls.getExtension.mockImplementation((name) => {
      if (name === 'WEBGL_color_buffer_float') fake.setLost(true)
      return null
    })
    expect(() => detectWebGL1Capabilities(fake.gl)).toThrow(WebGLContextLostError)
  })

  /** 两个设备上限分别验证；不能靠强制类型转换吞掉不合法查询结果。 */
  it.each(['MAX_VERTEX_ATTRIBS', 'MAX_TEXTURE_IMAGE_UNITS'] as const)(
    '拒绝 %s 的非法值',
    (name) => {
      const fake = createFakeWebGL1Context()
      for (const value of [null, '8', 0, -1, 1.5, NaN, Infinity]) {
        fake.limits.set(fake.gl[name], value)
        expect(() => detectWebGL1Capabilities(fake.gl)).toThrow(UnsupportedRenderFeatureError)
      }
    }
  )
})
