import { describe, expect, it } from 'vitest'

import { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
import { WebGLContextLostError } from '@/rendering/core/errors'
import type { RenderState } from '@/rendering/resources/Material'

import { createFakeWebGL1Context } from '../fakes/createFakeWebGL1Context'

/** 已通过 Material 验证的状态；本测试不重复测试 Material 的输入校验。 */
const DEPTH_STATE: RenderState = {
  depthTest: true,
  depthWrite: true,
  depthFunction: 'less-equal',
  cullMode: 'back'
}

/**
 * 检查调用者能观察的 GL 调用和 framebuffer/viewport，不断言 private 缓存字段。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-webgl-state-invalidation]
 * 这里的空对象只是 fake handle 的身份标记，不是可提交给真实 WebGL 的资源。
 */
describe('WebGL1State', () => {
  it('构造和 invalidate 不发送命令；未知不等于已知未绑定', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    state.invalidate()
    for (const call of Object.values(fake.calls)) expect(call).not.toHaveBeenCalled()
    state.useProgram(null)
    state.useProgram(null)
    state.bindArrayBuffer(null)
    state.bindArrayBuffer(null)
    state.bindElementArrayBuffer(null)
    state.bindElementArrayBuffer(null)
    expect(fake.calls.useProgram).toHaveBeenCalledExactlyOnceWith(null)
    expect(fake.calls.bindBuffer.mock.calls).toEqual([
      [fake.gl.ARRAY_BUFFER, null],
      [fake.gl.ELEMENT_ARRAY_BUFFER, null]
    ])
  })

  it('按对象身份去重 program 和 buffer，invalidate 后重新提交相同对象', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    const program: WebGLProgram = {}
    const vertex: WebGLBuffer = {}
    const index: WebGLBuffer = {}
    const apply = (): void => {
      state.useProgram(program)
      state.bindArrayBuffer(vertex)
      state.bindElementArrayBuffer(index)
    }
    apply()
    apply()
    expect(fake.calls.useProgram).toHaveBeenCalledTimes(1)
    expect(fake.calls.bindBuffer).toHaveBeenCalledTimes(2)
    state.invalidate()
    apply()
    expect(fake.calls.useProgram).toHaveBeenCalledTimes(2)
    expect(fake.calls.bindBuffer).toHaveBeenCalledTimes(4)
  })

  /** 模拟 VAO 切换后的外部绑定变化；不是完整的 VAO 行为测试。 */
  it('vertex-input 失效后不能沿用上一 VAO 的 index buffer 缓存', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    const index: WebGLBuffer = {}
    state.bindElementArrayBuffer(index)
    fake.gl.bindBuffer(fake.gl.ELEMENT_ARRAY_BUFFER, null)
    state.invalidateVertexInputState()
    state.bindElementArrayBuffer(index)
    expect(fake.calls.bindBuffer.mock.calls).toEqual([
      [fake.gl.ELEMENT_ARRAY_BUFFER, index],
      [fake.gl.ELEMENT_ARRAY_BUFFER, null],
      [fake.gl.ELEMENT_ARRAY_BUFFER, index]
    ])
  })

  it.each([
    ['less', 0x0201],
    ['less-equal', 0x0203],
    ['always', 0x0207]
  ] as const)('把 %s 映射为对应的深度函数', (depthFunction, expected) => {
    const fake = createFakeWebGL1Context()
    new WebGL1State(fake.gl).setDepthState({ ...DEPTH_STATE, depthFunction })
    expect(fake.calls.depthFunc).toHaveBeenCalledExactlyOnceWith(expected)
  })

  it('逐字段更新 depth，保留 false；invalidate 后重发所有字段', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    state.setDepthState(DEPTH_STATE)
    state.setDepthState({ ...DEPTH_STATE })
    expect(fake.calls.enable).toHaveBeenCalledExactlyOnceWith(fake.gl.DEPTH_TEST)
    expect(fake.calls.depthMask).toHaveBeenCalledExactlyOnceWith(true)
    expect(fake.calls.depthFunc).toHaveBeenCalledTimes(1)
    state.setDepthState({ ...DEPTH_STATE, depthTest: false, depthWrite: false })
    expect(fake.calls.disable).toHaveBeenCalledExactlyOnceWith(fake.gl.DEPTH_TEST)
    expect(fake.calls.depthMask).toHaveBeenLastCalledWith(false)
    expect(fake.calls.depthFunc).toHaveBeenCalledTimes(1)
    state.invalidate()
    state.setDepthState(DEPTH_STATE)
    expect(fake.calls.enable).toHaveBeenCalledTimes(2)
    expect(fake.calls.depthMask).toHaveBeenCalledTimes(3)
    expect(fake.calls.depthFunc).toHaveBeenCalledTimes(2)
  })

  it('正确切换剔除状态，相同值去重，失效后重发', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    state.setCullMode('none')
    state.setCullMode('none')
    state.setCullMode('back')
    state.setCullMode('back')
    state.setCullMode('front')
    state.invalidate()
    state.setCullMode('front')
    expect(fake.calls.disable).toHaveBeenCalledExactlyOnceWith(fake.gl.CULL_FACE)
    expect(fake.calls.enable.mock.calls).toEqual([
      [fake.gl.CULL_FACE],
      [fake.gl.CULL_FACE],
      [fake.gl.CULL_FACE]
    ])
    expect(fake.calls.cullFace.mock.calls).toEqual([
      [fake.gl.BACK],
      [fake.gl.FRONT],
      [fake.gl.FRONT]
    ])
  })

  /** 捕获非默认 viewport，专门防止“恢复时总是绑定屏幕”的错误。 */
  it('捕获真实表面、复制快照，并在绘制抛错后恢复外层状态', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    const outer: WebGLFramebuffer = {}
    const inner: WebGLFramebuffer = {}
    fake.gl.bindFramebuffer(fake.gl.FRAMEBUFFER, outer)
    fake.gl.viewport(3, 4, 320, 200)
    const snapshot = state.captureSurfaceState()
    expect(snapshot).toEqual({ framebuffer: outer, viewport: [3, 4, 320, 200] })
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.viewport)).toBe(true)
    const error = new Error('draw failed')
    // 这是调用方式示例；真正的 Backend surface scope 留给 Task 15。
    expect(() => {
      try {
        state.bindSurface({ framebuffer: inner, width: 64, height: 32 })
        expect(fake.gl.getParameter(fake.gl.VIEWPORT)).toEqual(new Int32Array([0, 0, 64, 32]))
        throw error
      } finally {
        state.restoreSurfaceState(snapshot)
      }
    }).toThrow(error)
    expect(fake.gl.getParameter(fake.gl.FRAMEBUFFER_BINDING)).toBe(outer)
    expect(fake.gl.getParameter(fake.gl.VIEWPORT)).toEqual(new Int32Array([3, 4, 320, 200]))
    expect(snapshot.viewport).toEqual([3, 4, 320, 200])
  })

  it('默认目标使用最新 drawing buffer 尺寸，每次绑定都设置 viewport', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    state.bindSurface(null)
    fake.setDrawingBufferSize(1280, 960)
    state.bindSurface(null)
    expect(fake.calls.bindFramebuffer.mock.calls).toEqual([
      [fake.gl.FRAMEBUFFER, null],
      [fake.gl.FRAMEBUFFER, null]
    ])
    expect(fake.calls.viewport.mock.calls).toEqual([
      [0, 0, 640, 480],
      [0, 0, 1280, 960]
    ])
  })

  it('lost 时禁止提交，且旧缓存不能导致后续设置被跳过', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    const program: WebGLProgram = {}
    state.useProgram(program)
    fake.setLost(true)
    expect(() => state.useProgram(program)).toThrow(WebGLContextLostError)
    expect(() => state.setDepthState(DEPTH_STATE)).toThrow(WebGLContextLostError)
    expect(() => state.bindSurface(null)).toThrow(WebGLContextLostError)
    expect(fake.calls.useProgram).toHaveBeenCalledTimes(1)
    expect(fake.calls.depthFunc).not.toHaveBeenCalled()
    expect(fake.calls.bindFramebuffer).not.toHaveBeenCalled()
    // 只验证缓存失效；真实恢复必须创建新 State 和新 GPU handles。
    fake.setLost(false)
    state.useProgram(program)
    expect(fake.calls.useProgram).toHaveBeenCalledTimes(2)
  })

  it('lost 期间不尝试恢复失效 framebuffer，也不遮蔽原始错误', () => {
    const fake = createFakeWebGL1Context()
    const state = new WebGL1State(fake.gl)
    const snapshot = state.captureSurfaceState()
    fake.setLost(true)
    expect(() => state.restoreSurfaceState(snapshot)).not.toThrow()
    expect(fake.calls.bindFramebuffer).not.toHaveBeenCalled()
    expect(fake.calls.viewport).not.toHaveBeenCalled()
  })
})
