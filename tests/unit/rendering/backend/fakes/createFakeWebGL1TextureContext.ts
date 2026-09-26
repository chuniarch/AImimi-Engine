import { vi } from 'vitest'

/**
 * Task 13 的 GL 协议替身，不是 GPU 模拟器。
 *
 * @remarks
 * 保存每个 texture unit 的绑定以及 FBO 的 draw-buffers 状态。
 * 用例验证 Manager 发出的命令、事务和生命周期；不能证明真实像素或驱动兼容性。
 */
export function createFakeWebGL1TextureContext() {
  let serial = 0
  let lost = false
  let error = 0
  let activeUnit = 0x84c0
  let framebuffer: WebGLFramebuffer | null = null
  let renderbuffer: WebGLRenderbuffer | null = null

  const textures = new Map<string, WebGLTexture | null>()
  const drawBuffers = new Map<WebGLFramebuffer | null, readonly number[]>()
  const parameters = new Map<number, unknown>([
    [0x0cf5, 4],
    [0x9240, false],
    [0x9241, false],
    [0x9243, 0x9244],
    [0x851c, 4096],
    [0x0d33, 4096],
    [0x84e8, 4096],
    [0x8cdf, 4],
    [0x8824, 4]
  ])

  const deleted: object[] = []
  const uploads: { readonly args: readonly unknown[]; readonly alignment: unknown }[] = []
  const handle = () => ({ id: ++serial })
  const key = (target: number) => activeUnit + ':' + target

  const api = {
    NO_ERROR: 0,
    OUT_OF_MEMORY: 0x0505,
    TEXTURE0: 0x84c0,
    ACTIVE_TEXTURE: 0x84e0,
    TEXTURE_2D: 0x0de1,
    TEXTURE_CUBE_MAP: 0x8513,
    TEXTURE_BINDING_2D: 0x8069,
    TEXTURE_BINDING_CUBE_MAP: 0x8514,
    TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812f,
    MIRRORED_REPEAT: 0x8370,
    RGB: 0x1907,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    FLOAT: 0x1406,
    UNPACK_ALIGNMENT: 0x0cf5,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243,
    BROWSER_DEFAULT_WEBGL: 0x9244,
    NONE: 0,
    MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_RENDERBUFFER_SIZE: 0x84e8,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_BINDING: 0x8ca6,
    RENDERBUFFER: 0x8d41,
    RENDERBUFFER_BINDING: 0x8ca7,
    COLOR_ATTACHMENT0: 0x8ce0,
    DEPTH_ATTACHMENT: 0x8d00,
    DEPTH_COMPONENT16: 0x81a5,
    FRAMEBUFFER_COMPLETE: 0x8cd5,

    isContextLost: vi.fn(() => lost),

    getError: vi.fn(() => {
      const result = error
      error = 0
      return result
    }),

    getExtension: vi.fn((_name: string): unknown => null),

    getParameter: vi.fn((name: number): unknown => {
      switch (name) {
        case 0x84e0:
          return activeUnit
        case 0x8069:
          return textures.get(key(0x0de1)) ?? null
        case 0x8514:
          return textures.get(key(0x8513)) ?? null
        case 0x8ca6:
          return framebuffer
        case 0x8ca7:
          return renderbuffer
        default:
          return parameters.get(name)
      }
    }),

    activeTexture: vi.fn((unit: number) => {
      activeUnit = unit
    }),

    bindTexture: vi.fn((target: number, texture: WebGLTexture | null) => {
      textures.set(key(target), texture)
    }),

    pixelStorei: vi.fn((name: number, value: number | boolean) => {
      parameters.set(name, value)
    }),

    createTexture: vi.fn((): WebGLTexture | null => handle()),
    createFramebuffer: vi.fn((): WebGLFramebuffer | null => handle()),
    createRenderbuffer: vi.fn((): WebGLRenderbuffer | null => handle()),

    deleteTexture: vi.fn((texture: WebGLTexture) => {
      deleted.push(texture)
      for (const [binding, current] of textures) {
        if (current === texture) textures.set(binding, null)
      }
    }),

    deleteFramebuffer: vi.fn((value: WebGLFramebuffer) => {
      deleted.push(value)
      if (framebuffer === value) framebuffer = null
    }),

    deleteRenderbuffer: vi.fn((value: WebGLRenderbuffer) => {
      deleted.push(value)
      if (renderbuffer === value) renderbuffer = null
    }),

    bindFramebuffer: vi.fn((_target: number, value: WebGLFramebuffer | null) => {
      framebuffer = value
    }),

    bindRenderbuffer: vi.fn((_target: number, value: WebGLRenderbuffer | null) => {
      renderbuffer = value
    }),

    texImage2D: vi.fn((...args: unknown[]) => {
      uploads.push({ args, alignment: parameters.get(0x0cf5) })
    }),

    texParameteri: vi.fn((_target: number, _name: number, _value: number) => {}),
    generateMipmap: vi.fn((_target: number) => {}),
    framebufferTexture2D: vi.fn((..._args: unknown[]) => {}),
    renderbufferStorage: vi.fn((..._args: unknown[]) => {}),
    framebufferRenderbuffer: vi.fn((..._args: unknown[]) => {}),
    checkFramebufferStatus: vi.fn((_target: number): number => 0x8cd5)
  }

  const mrt = {
    MAX_COLOR_ATTACHMENTS_WEBGL: 0x8cdf,
    MAX_DRAW_BUFFERS_WEBGL: 0x8824,
    drawBuffersWEBGL: vi.fn((values: number[]) => {
      drawBuffers.set(framebuffer, [...values])
    })
  }

  return {
    gl: api as unknown as WebGLRenderingContext,
    api,
    deleted,
    uploads,
    parameters,
    drawBuffers,
    mrt: mrt as unknown as WEBGL_draw_buffers,
    setLost(value: boolean) {
      lost = value
    },
    setError(value: number) {
      error = value
    }
  }
}
