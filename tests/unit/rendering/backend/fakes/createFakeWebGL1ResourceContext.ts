import { vi } from 'vitest'

/**
 * Task 11 的协议 fake，不替代浏览器 GPU 测试。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 *
 * 真实记录 program、ARRAY_BUFFER、每个 VAO 的 ELEMENT_ARRAY_BUFFER 绑定。
 * 不解析 GLSL；active 信息由测试指定，compile/link 默认成功。
 * 不复用尚未验收的 Task 10 fake，避免两个阶段互相修改文件。
 */
export function createFakeWebGL1ResourceContext() {
  const constants = {
    NO_ERROR: 0,
    INVALID_OPERATION: 0x0502,
    OUT_OF_MEMORY: 0x0505,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ACTIVE_ATTRIBUTES: 0x8b89,
    ACTIVE_UNIFORMS: 0x8b86,
    CURRENT_PROGRAM: 0x8b8d,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    ARRAY_BUFFER_BINDING: 0x8894,
    ELEMENT_ARRAY_BUFFER_BINDING: 0x8895,
    STATIC_DRAW: 0x88e4,
    BYTE: 0x1400,
    UNSIGNED_BYTE: 0x1401,
    SHORT: 0x1402,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    FLOAT_VEC3: 0x8b51,
    FLOAT_VEC4: 0x8b52,
    TRIANGLES: 4,
    LINES: 1,
    LINE_STRIP: 3,
    TRIANGLE_STRIP: 5
  } as const

  let nextId = 0
  let lost = false
  let errorCode: number = constants.NO_ERROR
  let programValue: WebGLProgram | null = null
  let arrayBuffer: WebGLBuffer | null = null
  let vertexArray: object | null = null

  const elements = new Map<object | null, WebGLBuffer | null>()
  const bufferTargets = new Map<WebGLBuffer, number>()
  const events: string[] = []

  const attributes = [
    {
      name: 'position',
      type: constants.FLOAT_VEC3,
      size: 1,
      location: 0
    }
  ]

  const uniforms: {
    name: string
    type: number
    size: number
    location: WebGLUniformLocation | null
  }[] = [
    {
      name: 'uTint',
      type: constants.FLOAT_VEC4,
      size: 1,
      location: { id: 'uTint' }
    }
  ]

  const handle = () => Object.freeze({ id: ++nextId })

  const calls = {
    isContextLost: vi.fn(() => lost),

    getError: vi.fn(() => {
      const result = errorCode
      errorCode = constants.NO_ERROR
      return result
    }),

    createShader: vi.fn((_type: number): WebGLShader | null => handle()),

    shaderSource: vi.fn((_shader: WebGLShader, _source: string): void => {}),

    compileShader: vi.fn((_shader: WebGLShader): void => {}),

    getShaderParameter: vi.fn((_shader: WebGLShader, _pname: number): unknown => true),

    getShaderInfoLog: vi.fn((_shader: WebGLShader): string | null => 'compile log'),

    deleteShader: vi.fn((_shader: WebGLShader): void => {
      events.push('delete-shader')
    }),

    createProgram: vi.fn((): WebGLProgram | null => handle()),

    attachShader: vi.fn((_program: WebGLProgram, _shader: WebGLShader): void => {}),

    detachShader: vi.fn((_program: WebGLProgram, _shader: WebGLShader): void => {}),

    linkProgram: vi.fn((_program: WebGLProgram): void => {}),

    getProgramParameter: vi.fn((_program: WebGLProgram, pname: number): unknown => {
      if (pname === constants.LINK_STATUS) return true
      if (pname === constants.ACTIVE_ATTRIBUTES) return attributes.length
      if (pname === constants.ACTIVE_UNIFORMS) return uniforms.length

      return null
    }),

    getProgramInfoLog: vi.fn((_program: WebGLProgram): string | null => 'link log'),

    getActiveAttrib: vi.fn(
      (_program: WebGLProgram, index: number): WebGLActiveInfo | null => attributes[index] ?? null
    ),

    getAttribLocation: vi.fn(
      (_program: WebGLProgram, name: string) =>
        attributes.find((entry) => entry.name === name)?.location ?? -1
    ),

    getActiveUniform: vi.fn(
      (_program: WebGLProgram, index: number): WebGLActiveInfo | null => uniforms[index] ?? null
    ),

    getUniformLocation: vi.fn(
      (_program: WebGLProgram, name: string): WebGLUniformLocation | null =>
        uniforms.find((entry) => entry.name === name)?.location ?? null
    ),

    deleteProgram: vi.fn((_program: WebGLProgram): void => {
      events.push('delete-program')
    }),

    useProgram: vi.fn((program: WebGLProgram | null): void => {
      programValue = program
    }),

    createBuffer: vi.fn((): WebGLBuffer | null => handle()),

    bindBuffer: vi.fn((target: number, buffer: WebGLBuffer | null): void => {
      if (buffer !== null) {
        const previousTarget = bufferTargets.get(buffer)

        if (previousTarget !== undefined && previousTarget !== target) {
          errorCode = constants.INVALID_OPERATION
          return
        }

        bufferTargets.set(buffer, target)
      }

      if (target === constants.ARRAY_BUFFER) arrayBuffer = buffer
      else elements.set(vertexArray, buffer)
    }),

    bufferData: vi.fn((_target: number, _data: ArrayBufferView, _usage: number): void => {}),

    deleteBuffer: vi.fn((buffer: WebGLBuffer): void => {
      events.push('delete-buffer')

      if (arrayBuffer === buffer) arrayBuffer = null

      if (elements.get(vertexArray) === buffer) {
        elements.set(vertexArray, null)
      }
    }),

    getParameter: vi.fn((pname: number): unknown => {
      if (pname === constants.CURRENT_PROGRAM) return programValue
      if (pname === constants.ARRAY_BUFFER_BINDING) return arrayBuffer

      if (pname === constants.ELEMENT_ARRAY_BUFFER_BINDING) {
        return elements.get(vertexArray) ?? null
      }

      return null
    })
  }

  return {
    /** 只在测试边界把受控子集适配成完整 WebGL 接口。 */
    gl: { ...constants, ...calls } as unknown as WebGLRenderingContext,
    calls,
    events,
    attributes,
    uniforms,

    setLost(value: boolean): void {
      lost = value
    },

    setError(value: number): void {
      errorCode = value
    },

    /** 切换 fake VAO，以验证 EBO 归属于 VAO，而不是全局变量。 */
    selectVertexArray(value: object | null): void {
      vertexArray = value
    }
  }
}
