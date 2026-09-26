import { describe, expect, it, vi } from 'vitest'
import { createWebGL1VertexInputManager } from '@/rendering/backend/webgl1/WebGL1VertexInputManager'
import { WebGL1OESVertexInputManager } from '@/rendering/backend/webgl1/WebGL1OESVertexInputManager'
import { WebGL1ManualVertexInputManager } from '@/rendering/backend/webgl1/WebGL1ManualVertexInputManager'
import { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
import {
  WebGL1ProgramManager,
  type WebGL1ProgramResource
} from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import {
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { Geometry } from '@/rendering/resources/Geometry'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import {
  createFakeWebGL1VertexInputContext,
  type FakeActiveAttribute
} from '../fakes/createFakeWebGL1VertexInputContext'

/** 三个 CPU 属性中，shader 通常只使用 position/uv；color 应被忽略。 */
function createGeometry(indexed = true): Geometry {
  return new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array(9),
        itemSize: 3
      }),
      uv: new VertexAttribute({
        data: new Uint16Array(6),
        itemSize: 2,
        normalized: true
      }),
      color: new VertexAttribute({
        data: new Uint8Array(12),
        itemSize: 4
      })
    },
    indices: indexed ? new Uint16Array([0, 1, 2]) : undefined
  })
}

/** 每个 case 独立 context；上传使用 Task 11 的真实提案，不手写 buffer 布局结果。 */
function setup(withOES: boolean) {
  const fake = createFakeWebGL1VertexInputContext(withOES)
  const hooks = {
    invalidateState: vi.fn(() => undefined)
  }

  const manager = createWebGL1VertexInputManager(fake.gl, fake.capabilities, hooks)

  const geometries = new WebGL1GeometryManager(fake.gl, fake.capabilities, hooks)

  /** 本 helper 安排驱动反射结果；编译/link 的职责已由 Task 11 单独测试。 */
  function program(inputs?: readonly FakeActiveAttribute[]): WebGL1ProgramResource {
    const handle = fake.gl.createProgram()!

    const active = inputs ?? [
      {
        name: 'position',
        location: 0,
        type: fake.gl.FLOAT_VEC3
      },
      {
        name: 'uv',
        location: 5,
        type: fake.gl.FLOAT_VEC2
      }
    ]

    fake.registerProgram(handle, active)

    return {
      program: handle,
      attributes: new Map(active.map((a) => [a.name, a.location])),
      uniforms: new Map()
    }
  }

  return {
    ...fake,
    hooks,
    manager,
    geometries,
    program
  }
}

for (const withOES of [true, false]) {
  describe(withOES ? 'OES contract' : 'manual contract', () => {
    it('工厂仅按当前 context capability 选择策略', () => {
      const f = setup(withOES)

      expect(f.manager).toBeInstanceOf(
        withOES ? WebGL1OESVertexInputManager : WebGL1ManualVertexInputManager
      )

      expect(f.oes.createVertexArrayOES).not.toHaveBeenCalled()
    })

    /**
     * @remarks
     * [DESIGN-WEIGHT:3][vertex-input-active-layout]
     *
     * 检查实际 pointer 捕获的 buffer、分量类型、normalized；不是只统计函数被调用。
     */
    it('仅配置 active 属性，location 0 有效，pointer 捕获各自 buffer', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)
      const program = f.program()

      f.manager.bind(geometry, gpu, program)

      const state = f.readCurrent()

      expect(state.enabled).toEqual([0, 5])

      expect(state.pointers.get(0)).toMatchObject({
        buffer: gpu.attributes.get('position')!.buffer,
        size: 3,
        type: f.gl.FLOAT,
        normalized: false,
        stride: 0,
        offset: 0
      })

      expect(state.pointers.get(5)).toMatchObject({
        buffer: gpu.attributes.get('uv')!.buffer,
        size: 2,
        type: f.gl.UNSIGNED_SHORT,
        normalized: true
      })

      expect(f.calls.vertexAttribPointer).toHaveBeenCalledTimes(2)
      expect(state.indexBuffer).toBe(gpu.indexBuffer)
      expect(f.hooks.invalidateState).toHaveBeenCalled()
    })

    it('同一个 Geometry 换 Program 后使用新的 locations', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)

      f.manager.bind(geometry, gpu, f.program())

      const next = f.program([
        {
          name: 'position',
          location: 3,
          type: f.gl.FLOAT_VEC3
        }
      ])

      f.manager.bind(geometry, gpu, next)

      expect(f.readCurrent().enabled).toEqual([3])

      expect(f.readCurrent().pointers.get(3)!.buffer).toBe(gpu.attributes.get('position')!.buffer)
    })

    it('非索引 Geometry 显式清除上一物体的 EBO', () => {
      const f = setup(withOES)
      const indexed = createGeometry()
      const plain = createGeometry(false)
      const program = f.program()

      f.manager.bind(indexed, f.geometries.get(indexed), program)

      f.manager.bind(plain, f.geometries.get(plain), program)

      expect(f.readCurrent().indexBuffer).toBeNull()
    })

    it('active 属性缺失时不破坏此前有效绑定', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)

      f.manager.bind(geometry, gpu, f.program())

      const previous = f.readCurrent()

      const missing = f.program([
        {
          name: 'normal',
          location: 2,
          type: f.gl.FLOAT_VEC3
        }
      ])

      expect(() => f.manager.bind(geometry, gpu, missing)).toThrow(UnsupportedRenderFeatureError)

      expect(f.readCurrent()).toEqual(previous)
    })

    /** 非活动属性不参与验证；活动的非法布局必须在 vertexAttribPointer 前被拒绝。 */
    it.each(['location-negative', 'location-limit', 'matrix', 'array', 'item-size'] as const)(
      '拒绝非法输入布局 %s',
      (kind) => {
        const f = setup(withOES)
        const geometry = createGeometry()
        const original = f.geometries.get(geometry)
        const attributes = new Map(original.attributes)

        if (kind === 'item-size') {
          attributes.set('position', {
            ...attributes.get('position')!,
            itemSize: 5
          })
        }

        const program = f.program([
          {
            name: 'position',
            location: kind === 'location-negative' ? -1 : kind === 'location-limit' ? 8 : 0,
            type: kind === 'matrix' ? f.gl.FLOAT_MAT4 : f.gl.FLOAT_VEC3,
            size: kind === 'array' ? 2 : 1
          }
        ])

        expect(() => f.manager.bind(geometry, { ...original, attributes }, program)).toThrow(
          UnsupportedRenderFeatureError
        )

        expect(f.calls.vertexAttribPointer).not.toHaveBeenCalled()
      }
    )

    it('释放/解绑不删除借用的 buffers 或 program', () => {
      const f = setup(withOES)
      const geometry = createGeometry()

      f.manager.bind(geometry, f.geometries.get(geometry), f.program())

      f.manager.unbind()

      expect(f.readCurrent().vao).toBeNull()
      expect(f.readCurrent().enabled).toEqual([])

      f.manager.dispose()
      f.manager.dispose()

      expect(f.calls.deleteBuffer).not.toHaveBeenCalled()
      expect(f.calls.deleteProgram).not.toHaveBeenCalled()
      expect(geometry.disposed).toBe(false)

      expect(() => f.manager.bind(geometry, f.geometries.get(geometry), f.program())).toThrow(
        WebGLBackendDisposedError
      )
    })

    it('已释放的 CPU Geometry 不能利用缓存继续绑定', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)
      const program = f.program()

      f.manager.bind(geometry, gpu, program)

      geometry.dispose()

      expect(() => f.manager.bind(geometry, gpu, program)).toThrow(ResourceDisposedError)
    })

    it('lost 后仅丢弃记录，恢复时不复用旧策略', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)
      const program = f.program()

      f.manager.bind(geometry, gpu, program)

      f.calls.bindBuffer.mockClear()
      f.calls.disableVertexAttribArray.mockClear()
      f.oes.bindVertexArrayOES.mockClear()

      f.setLost(true)
      f.manager.invalidateForContextLoss()

      expect(f.oes.deleteVertexArrayOES).not.toHaveBeenCalled()
      expect(f.oes.bindVertexArrayOES).not.toHaveBeenCalled()
      expect(f.calls.bindBuffer).not.toHaveBeenCalled()
      expect(f.calls.disableVertexAttribArray).not.toHaveBeenCalled()

      f.setLost(false)

      expect(() => f.manager.bind(geometry, gpu, program)).toThrow(WebGLContextLostError)

      f.manager.dispose()

      expect(() => f.manager.bind(geometry, gpu, program)).toThrow(WebGLBackendDisposedError)
    })

    it('配置中丢失 context，不把它当普通 GL 错误或尝试 GPU 清理', () => {
      const f = setup(withOES)
      const geometry = createGeometry()
      const gpu = f.geometries.get(geometry)
      const program = f.program()

      f.calls.vertexAttribPointer.mockImplementationOnce(() => {
        f.setLost(true)
      })

      expect(() => f.manager.bind(geometry, gpu, program)).toThrow(WebGLContextLostError)

      expect(f.oes.deleteVertexArrayOES).not.toHaveBeenCalled()
      expect(f.calls.deleteBuffer).not.toHaveBeenCalled()
    })

    /**
     * @remarks
     * [DESIGN-WEIGHT:3][vertex-input-borrowed-resources]
     *
     * 使用真实 Task 11 Manager 回调连接，验证资源删除前的释放协调入口。
     */
    it('Task 11 beforeDelete 可先解除顶点输入，再删除 GPU 资源', () => {
      const f = setup(withOES)

      const geometries = new WebGL1GeometryManager(f.gl, f.capabilities, {
        ...f.hooks,
        beforeDelete: (geometry) => {
          f.manager.releaseGeometry(geometry)
        }
      })

      const programs = new WebGL1ProgramManager(f.gl, {
        ...f.hooks,
        beforeDelete: (program) => {
          f.manager.releaseProgram(program)
        }
      })

      const geometry = createGeometry()

      const shader = new ShaderModule({
        name: 'test',
        language: 'glsl-es-100',
        vertexSource: 'attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}',
        fragmentSource: 'precision mediump float; void main(){gl_FragColor=vec4(1.0);}'
      })

      f.manager.bind(geometry, geometries.get(geometry), programs.get(shader))

      f.events.length = 0

      geometry.dispose()

      expect(f.readCurrent().vao).toBeNull()

      expect(f.events).toEqual(
        withOES
          ? ['delete-vao', 'delete-buffer', 'delete-buffer', 'delete-buffer', 'delete-buffer']
          : ['delete-buffer', 'delete-buffer', 'delete-buffer', 'delete-buffer']
      )

      shader.dispose()

      expect(f.calls.deleteProgram).toHaveBeenCalledTimes(1)
    })
  })
}

describe('OES-specific behavior', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][vao-geometry-program-key]
   *
   * wrapper 相同与否不重要，实际 program handle 才是第二层 key。
   */
  it('同 pair 复用；换 program 或 Geometry 创建独立 VAO', () => {
    const f = setup(true)
    const a = createGeometry()
    const b = createGeometry()
    const gpuA = f.geometries.get(a)
    const p = f.program()

    f.manager.bind(a, gpuA, p)

    const first = f.readCurrent().vao

    f.manager.bind(a, gpuA, { ...p })

    expect(f.readCurrent().vao).toBe(first)
    expect(f.calls.vertexAttribPointer).toHaveBeenCalledTimes(2)

    f.manager.bind(a, gpuA, f.program())
    f.manager.bind(b, f.geometries.get(b), p)

    expect(f.oes.createVertexArrayOES).toHaveBeenCalledTimes(3)
  })

  it('releaseProgram/releaseGeometry 只删除关联的 VAO', () => {
    const f = setup(true)
    const a = createGeometry()
    const b = createGeometry()
    const p = f.program()
    const q = f.program()

    f.manager.bind(a, f.geometries.get(a), p)
    f.manager.bind(a, f.geometries.get(a), q)
    f.manager.bind(b, f.geometries.get(b), q)

    const surviving = f.readCurrent().vao

    f.manager.releaseProgram(p.program)

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(1)
    expect(f.readCurrent().vao).toBe(surviving)

    f.manager.releaseGeometry(a)

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(2)
    expect(f.readCurrent().vao).toBe(surviving)

    f.manager.releaseProgram(q.program)

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(3)
    expect(f.readCurrent().vao).toBeNull()

    f.manager.dispose()

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(3)
  })

  it('GPU Geometry 表示更换后，替换 VAO 而非继续引用旧 buffers', () => {
    const f = setup(true)
    const geometry = createGeometry()
    const program = f.program()

    f.manager.bind(geometry, f.geometries.get(geometry), program)

    const first = f.readCurrent().vao

    // 故意不接 beforeDelete，单独验证 GPU 表示身份变化的防御性检查。
    f.geometries.release(geometry)

    const next = f.geometries.get(geometry)

    f.manager.bind(geometry, next, program)

    expect(f.readCurrent().vao).not.toBe(first)

    expect(f.readCurrent().pointers.get(0)!.buffer).toBe(next.attributes.get('position')!.buffer)

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][vao-creation-rollback]
   *
   * 失败不能留下新 VAO，也不能破坏外层 VAO/EBO 或全局 ARRAY_BUFFER。
   */
  it.each(['null', 'gl-error'] as const)('创建失败 %s 后恢复旧状态且允许重试', (kind) => {
    const f = setup(true)
    const outer = createGeometry()

    f.manager.bind(outer, f.geometries.get(outer), f.program())

    const previous = f.readCurrent()
    const outerArray = f.gl.createBuffer()!

    f.gl.bindBuffer(f.gl.ARRAY_BUFFER, outerArray)

    const geometry = createGeometry()
    const gpu = f.geometries.get(geometry)
    const program = f.program()

    if (kind === 'null') {
      f.oes.createVertexArrayOES.mockReturnValueOnce(null)
    } else {
      f.calls.vertexAttribPointer.mockImplementationOnce(() => {
        f.setError(f.gl.INVALID_OPERATION)
      })
    }

    expect(() => f.manager.bind(geometry, gpu, program)).toThrow(
      kind === 'null' ? WebGLResourceCreationError : WebGLOperationError
    )

    expect(f.readCurrent()).toEqual(previous)

    expect(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING)).toBe(outerArray)

    expect(f.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(kind === 'null' ? 0 : 1)

    f.manager.bind(geometry, gpu, program)

    expect(f.readCurrent().vao).not.toBe(previous.vao)
  })
})

describe('manual-specific behavior', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][manual-stale-location-cleanup]
   *
   * 首次绑定清理未知旧状态；随后每次调用重新配置 pointer，并清理过期 location。
   */
  it('首次接管未知 enabled 状态，重复 bind 也重新设置 pointer', () => {
    const f = setup(false)

    f.gl.enableVertexAttribArray(7)

    const geometry = createGeometry()
    const gpu = f.geometries.get(geometry)
    const program = f.program()

    f.manager.bind(geometry, gpu, program)

    expect(f.readCurrent().enabled).toEqual([0, 5])

    const reflectionCalls = f.calls.getActiveAttrib.mock.calls.length

    f.manager.bind(geometry, gpu, program)

    expect(f.calls.vertexAttribPointer).toHaveBeenCalledTimes(4)
    expect(f.calls.getActiveAttrib).toHaveBeenCalledTimes(reflectionCalls)

    f.manager.bind(
      geometry,
      gpu,
      f.program([
        {
          name: 'position',
          location: 0,
          type: f.gl.FLOAT_VEC3
        }
      ])
    )

    expect(f.readCurrent().enabled).toEqual([0])
    expect(f.calls.disableVertexAttribArray).toHaveBeenCalledWith(5)
    expect(f.oes.createVertexArrayOES).not.toHaveBeenCalled()
  })

  it('配置中失败清空全部位置，包括尚未提交进 enabled 记录的新位置', () => {
    const f = setup(false)
    const geometry = createGeometry()
    const gpu = f.geometries.get(geometry)

    f.manager.bind(
      geometry,
      gpu,
      f.program([
        {
          name: 'position',
          location: 0,
          type: f.gl.FLOAT_VEC3
        }
      ])
    )

    const next = f.program([
      {
        name: 'position',
        location: 2,
        type: f.gl.FLOAT_VEC3
      },
      {
        name: 'uv',
        location: 5,
        type: f.gl.FLOAT_VEC2
      }
    ])

    const originalPointer = f.calls.vertexAttribPointer.getMockImplementation()!

    f.calls.vertexAttribPointer
      .mockImplementationOnce(originalPointer)
      .mockImplementationOnce(() => {
        f.setError(f.gl.INVALID_OPERATION)
      })

    expect(() => f.manager.bind(geometry, gpu, next)).toThrow(WebGLOperationError)

    expect(f.readCurrent().enabled).toEqual([])
    expect(f.readCurrent().indexBuffer).toBeNull()

    f.manager.bind(geometry, gpu, next)

    expect(f.readCurrent().enabled).toEqual([2, 5])
  })

  it('释放非当前资源不影响当前布局，释放当前 program 时解绑', () => {
    const f = setup(false)
    const geometry = createGeometry()
    const program = f.program()

    f.manager.bind(geometry, f.geometries.get(geometry), program)

    f.manager.releaseGeometry(createGeometry())
    f.manager.releaseProgram(f.program().program)

    expect(f.readCurrent().enabled).toEqual([0, 5])

    f.manager.releaseProgram(program.program)

    expect(f.readCurrent().enabled).toEqual([])
    expect(f.readCurrent().indexBuffer).toBeNull()
  })
})
