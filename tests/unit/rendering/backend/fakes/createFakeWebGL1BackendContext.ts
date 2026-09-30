import { vi } from 'vitest'
import { createFakeWebGL1VertexInputContext } from './createFakeWebGL1VertexInputContext'

/**
 * Task 15 的受控 WebGL1 协议替身。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 * 真实 Program/Geometry/VertexInput Manager 仍在测试中执行；这里只替代
 * 浏览器 context、canvas 事件和少量 GL 状态。它不能证明 shader 编译或像素正确。
 */
export function createFakeWebGL1BackendContext() {
  const vertex = createFakeWebGL1VertexInputContext(false)
  const gl = vertex.gl
  const outerFramebuffer = { id: 'outer-framebuffer' } as unknown as WebGLFramebuffer
  let framebuffer: WebGLFramebuffer | null = outerFramebuffer
  let viewport: readonly [number, number, number, number] = [3, 4, 8, 9]
  const previousGetParameter = gl.getParameter.bind(gl)

  const calls = {
    getExtension: vi.fn((_name: string): unknown => null),
    getParameter: vi.fn((pname: number): unknown => {
      if (pname === gl.MAX_VERTEX_ATTRIBS) return 8
      if (pname === gl.MAX_TEXTURE_IMAGE_UNITS) return 8
      if (pname === gl.MAX_VIEWPORT_DIMS) return new Int32Array([4096, 4096])
      if (pname === gl.FRAMEBUFFER_BINDING) return framebuffer
      if (pname === gl.VIEWPORT) return new Int32Array(viewport)
      return previousGetParameter(pname)
    }),
    bindFramebuffer: vi.fn((_target: number, next: WebGLFramebuffer | null): void => {
      framebuffer = next
    }),
    isFramebuffer: vi.fn((value: WebGLFramebuffer | null): boolean => {
      return value === outerFramebuffer
    }),
    viewport: vi.fn((x: number, y: number, width: number, height: number): void => {
      viewport = [x, y, width, height]
    }),
    enable: vi.fn((_capability: number): void => {}),
    disable: vi.fn((_capability: number): void => {}),
    depthMask: vi.fn((_value: boolean): void => {}),
    depthFunc: vi.fn((_value: number): void => {}),
    cullFace: vi.fn((_value: number): void => {}),
    colorMask: vi.fn((_r: boolean, _g: boolean, _b: boolean, _a: boolean): void => {}),
    depthRange: vi.fn((_near: number, _far: number): void => {}),
    frontFace: vi.fn((_winding: number): void => {}),
    lineWidth: vi.fn((_width: number): void => {}),
    drawArrays: vi.fn((_mode: number, _first: number, _count: number): void => {}),
    drawElements: vi.fn((_mode: number, _count: number, _type: number, _offset: number): void => {})
  }

  Object.assign(gl, {
    MAX_VERTEX_ATTRIBS: 0x8869,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    MAX_VIEWPORT_DIMS: 0x0d3a,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_BINDING: 0x8ca6,
    VIEWPORT: 0x0ba2,
    DEPTH_TEST: 0x0b71,
    LESS: 0x0201,
    LEQUAL: 0x0203,
    ALWAYS: 0x0207,
    CULL_FACE: 0x0b44,
    FRONT: 0x0404,
    BACK: 0x0405,
    BLEND: 0x0be2,
    STENCIL_TEST: 0x0b90,
    SCISSOR_TEST: 0x0c11,
    POLYGON_OFFSET_FILL: 0x8037,
    SAMPLE_ALPHA_TO_COVERAGE: 0x809e,
    SAMPLE_COVERAGE: 0x80a0,
    CCW: 0x0901,
    ...calls
  })

  const rawCanvas = Object.assign(new EventTarget(), {
    width: 32,
    height: 32,
    getContext: vi.fn((contextId: string) => (contextId === 'webgl' ? gl : null))
  })
  const canvas = rawCanvas as unknown as HTMLCanvasElement

  Object.defineProperties(gl, {
    drawingBufferWidth: { get: () => canvas.width },
    drawingBufferHeight: { get: () => canvas.height }
  })

  return {
    canvas,
    gl,
    calls,
    vertex,
    outerFramebuffer,

    /** 返回独立值，测试不读取替身的可变内部数组。 */
    readSurface(): {
      readonly framebuffer: WebGLFramebuffer | null
      readonly viewport: readonly [number, number, number, number]
    } {
      return { framebuffer, viewport: [...viewport] as [number, number, number, number] }
    },

    /** 先改变物理状态，再发出可取消的浏览器 lost 事件。 */
    loseContext(): Event {
      vertex.setLost(true)
      const event = new Event('webglcontextlost', { cancelable: true })
      canvas.dispatchEvent(event)
      return event
    },

    /** 测试恢复后的新 generation；不模拟真实驱动自动重建 GPU handles。 */
    restoreContext(): void {
      vertex.setLost(false)
      canvas.dispatchEvent(new Event('webglcontextrestored'))
    }
  }
}
