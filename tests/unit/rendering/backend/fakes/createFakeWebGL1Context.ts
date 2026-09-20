import { vi } from 'vitest'

/**
 * 只模拟 Task 10 使用的 WebGL 协议，不模拟 GPU 执行或驱动错误。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 * fake 的实际 framebuffer/viewport 与 WebGL1State 的缓存相互独立，
 * 因此能够发现“缓存以为已绑定，但实际绑定已经变化”的错误。
 * 最后一次整体断言只用于这个测试边界；不得复制到正式 Backend。
 */
export function createFakeWebGL1Context() {
  const constants = {
    MAX_VERTEX_ATTRIBS: 0x8869,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    FRAMEBUFFER_BINDING: 0x8ca6,
    VIEWPORT: 0x0ba2,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    FRAMEBUFFER: 0x8d40,
    DEPTH_TEST: 0x0b71,
    CULL_FACE: 0x0b44,
    LESS: 0x0201,
    LEQUAL: 0x0203,
    ALWAYS: 0x0207,
    BACK: 0x0405,
    FRONT: 0x0404
  } as const
  const extensions = new Map<string, unknown>()
  const limits = new Map<number, unknown>([
    [constants.MAX_VERTEX_ATTRIBS, 8],
    [constants.MAX_TEXTURE_IMAGE_UNITS, 8]
  ])
  let lost = false
  let framebuffer: WebGLFramebuffer | null = null
  let viewportValue = new Int32Array([0, 0, 640, 480])

  const calls = {
    isContextLost: vi.fn(() => lost),
    getExtension: vi.fn((name: string): unknown => extensions.get(name) ?? null),
    getParameter: vi.fn((name: number): unknown => {
      if (name === constants.FRAMEBUFFER_BINDING) return framebuffer
      if (name === constants.VIEWPORT) return new Int32Array(viewportValue)
      return limits.get(name) ?? null
    }),
    useProgram: vi.fn((_program: WebGLProgram | null): void => {}),
    bindBuffer: vi.fn((_target: number, _buffer: WebGLBuffer | null): void => {}),
    enable: vi.fn((_capability: number): void => {}),
    disable: vi.fn((_capability: number): void => {}),
    depthMask: vi.fn((_enabled: boolean): void => {}),
    depthFunc: vi.fn((_value: number): void => {}),
    cullFace: vi.fn((_value: number): void => {}),
    bindFramebuffer: vi.fn((_target: number, next: WebGLFramebuffer | null): void => {
      framebuffer = next
    }),
    viewport: vi.fn((x: number, y: number, width: number, height: number): void => {
      viewportValue = new Int32Array([x, y, width, height])
    })
  }
  const context = {
    ...constants,
    ...calls,
    drawingBufferWidth: 640,
    drawingBufferHeight: 480
  }

  return {
    gl: context as unknown as WebGLRenderingContext,
    calls,
    extensions,
    limits,
    /** 模拟物理 lost 标志；不自动派发 canvas 事件。 */
    setLost(value: boolean): void {
      lost = value
    },
    /** 只改变 drawing buffer 尺寸，不自动改变 viewport。 */
    setDrawingBufferSize(width: number, height: number): void {
      context.drawingBufferWidth = width
      context.drawingBufferHeight = height
    }
  }
}
