import { vi } from 'vitest'
import { createFakeWebGL1ResourceContext } from './createFakeWebGL1ResourceContext'

export interface FakeActiveAttribute {
  readonly name: string
  readonly location: number
  readonly type: number
  readonly size?: number
}

interface PointerSnapshot {
  readonly buffer: WebGLBuffer
  readonly size: number
  readonly type: number
  readonly normalized: boolean
  readonly stride: number
  readonly offset: number
}

/**
 * 在 Task 11 fake 上增加 VAO 状态，不修改上一批 fake。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 *
 * 每个 VAO 独立保存 enabled/pointers，EBO 仍由基础 fake 按 VAO 保存。
 * vertexAttribPointer 捕获调用时的 ARRAY_BUFFER，之后切换全局绑定不会改写它。
 * 不执行 shader、光栅化或 draw，不能代替真实浏览器验收。
 */
export function createFakeWebGL1VertexInputContext(withOES: boolean) {
  const base = createFakeWebGL1ResourceContext()

  const states = new Map<
    WebGLVertexArrayObjectOES | null,
    {
      enabled: Set<number>
      pointers: Map<number, PointerSnapshot>
    }
  >()

  states.set(null, {
    enabled: new Set(),
    pointers: new Map()
  })

  let current: WebGLVertexArrayObjectOES | null = null
  let nextId = 0

  const programs = new Map<WebGLProgram, readonly FakeActiveAttribute[]>()

  const attributesOf = (program: WebGLProgram) => programs.get(program) ?? base.attributes

  const currentState = () => states.get(current)!

  const oes = {
    VERTEX_ARRAY_BINDING_OES: 0x85b5 as const,

    createVertexArrayOES: vi.fn((): WebGLVertexArrayObjectOES | null => {
      const vao = { id: ++nextId }

      states.set(vao, {
        enabled: new Set(),
        pointers: new Map()
      })

      return vao
    }),

    bindVertexArrayOES: vi.fn((vao: WebGLVertexArrayObjectOES | null): void => {
      if (!states.has(vao)) {
        base.setError(base.gl.INVALID_OPERATION)
        return
      }

      current = vao
      base.selectVertexArray(vao)
    }),

    deleteVertexArrayOES: vi.fn((vao: WebGLVertexArrayObjectOES | null): void => {
      if (vao === null) return

      base.events.push('delete-vao')

      if (current === vao) {
        current = null
        base.selectVertexArray(null)
      }

      states.delete(vao)
    }),

    isVertexArrayOES: vi.fn(
      (vao: WebGLVertexArrayObjectOES | null): boolean => vao !== null && states.has(vao)
    )
  }

  const calls = {
    ...base.calls,

    getParameter: vi.fn((pname: number): unknown => {
      if (pname === oes.VERTEX_ARRAY_BINDING_OES) return current

      return base.calls.getParameter(pname)
    }),

    getProgramParameter: vi.fn((program: WebGLProgram, pname: number): unknown => {
      if (pname === base.gl.ACTIVE_ATTRIBUTES) {
        return attributesOf(program).length
      }

      return base.calls.getProgramParameter(program, pname)
    }),

    getActiveAttrib: vi.fn((program: WebGLProgram, index: number): WebGLActiveInfo | null => {
      const input = attributesOf(program)[index]

      return input === undefined
        ? null
        : {
            name: input.name,
            type: input.type,
            size: input.size ?? 1
          }
    }),

    getAttribLocation: vi.fn(
      (program: WebGLProgram, name: string): number =>
        attributesOf(program).find((input) => input.name === name)?.location ?? -1
    ),

    enableVertexAttribArray: vi.fn((location: number): void => {
      currentState().enabled.add(location)
    }),

    disableVertexAttribArray: vi.fn((location: number): void => {
      currentState().enabled.delete(location)
    }),

    vertexAttribPointer: vi.fn(
      (
        location: number,
        size: number,
        type: number,
        normalized: boolean,
        stride: number,
        offset: number
      ): void => {
        const buffer = base.gl.getParameter(base.gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null

        if (buffer === null) {
          base.setError(base.gl.INVALID_OPERATION)
          return
        }

        currentState().pointers.set(location, {
          buffer,
          size,
          type,
          normalized,
          stride,
          offset
        })
      }
    )
  }

  const gl = {
    ...base.gl,
    ...calls,
    FLOAT_VEC2: 0x8b50,
    FLOAT_MAT4: 0x8b5c
  } as unknown as WebGLRenderingContext

  return {
    ...base,
    gl,
    calls,
    oes,

    capabilities: {
      // 当前 DOM 类型不允许 createVertexArrayOES 返回 null；测试故意越过该边界，
      // 验证已批准的防御性 create-null 分支，而不是声称正常驱动必须返回 null。
      vertexArrayObject: withOES ? (oes as unknown as OES_vertex_array_object) : null,
      maxVertexAttributes: 8,
      elementIndexUint: null
    },

    /** 只安排反射结果；不假装执行了编译器。 */
    registerProgram(program: WebGLProgram, attributes: readonly FakeActiveAttribute[]): void {
      programs.set(
        program,
        attributes.map((attribute) => ({ ...attribute }))
      )
    },

    /** 返回独立容器，避免断言代码意外修改 fake 的内部状态。 */
    readCurrent() {
      return {
        vao: current,
        enabled: [...currentState().enabled].sort((a, b) => a - b),
        pointers: new Map(currentState().pointers),
        indexBuffer: base.gl.getParameter(
          base.gl.ELEMENT_ARRAY_BUFFER_BINDING
        ) as WebGLBuffer | null
      }
    }
  }
}
