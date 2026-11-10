import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'
import { describe, expect, it, vi } from 'vitest'
import { WebGL1GeometryManager } from '@/rendering/backend/webgl1/WebGL1GeometryManager'
import {
  ResourceDisposedError,
  UnsupportedIndexTypeError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { Geometry, type IndexData, type PrimitiveTopology } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { createFakeWebGL1ResourceContext } from '../fakes/createFakeWebGL1ResourceContext'

/** 两个独立属性；indexed 时第三个 buffer 存储索引。 */
function createGeometry(
  indices?: IndexData,
  vertexCount = 3,
  topology: PrimitiveTopology = 'triangles'
): Geometry {
  return new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array(vertexCount * 3),
        itemSize: 3
      }),
      uv: new VertexAttribute({
        data: new Uint16Array(vertexCount * 2),
        itemSize: 2,
        normalized: true
      })
    },
    indices,
    topology
  })
}

function setup(withUint32 = false) {
  const fake = createFakeWebGL1ResourceContext()

  const hooks = {
    invalidateState: vi.fn(() => undefined),
    beforeDelete: vi.fn((_geometry: Geometry) => undefined)
  }

  const capabilities = {
    elementIndexUint: withUint32 ? {} : null
  }

  return {
    ...fake,
    hooks,
    capabilities,
    manager: new WebGL1GeometryManager(fake.gl, capabilities, hooks)
  }
}

describe('WebGL1GeometryManager', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
   *
   * 同一 Geometry 只上传一次，但两个 context 必须拥有两组 buffer。
   */
  it('缓存静态上传，保留 count/layout，且无索引时不伪造 EBO', () => {
    const a = setup()
    const b = setup()
    const geometry = createGeometry()
    const gpu = a.manager.get(geometry)

    expect(a.manager.get(geometry)).toBe(gpu)
    expect(a.calls.bufferData).toHaveBeenCalledTimes(2)

    expect(a.calls.bufferData.mock.calls.every((call) => call[2] === a.gl.STATIC_DRAW)).toBe(true)

    expect(gpu.drawCount).toBe(3)
    expect(gpu.primitiveMode).toBe(a.gl.TRIANGLES)
    expect(gpu.indexBuffer).toBeNull()
    expect(gpu.indexType).toBeNull()

    expect(gpu.attributes.get('uv')).toMatchObject({
      type: a.gl.UNSIGNED_SHORT,
      itemSize: 2,
      normalized: true
    })

    expect(b.manager.get(geometry).attributes.get('position')!.buffer).not.toBe(
      gpu.attributes.get('position')!.buffer
    )
  })

  /** 每个 CPU TypedArray 都必须映射为正确的 GL 分量类型，而不是全部当成 FLOAT。 */
  it.each([
    [Float32Array, 'FLOAT'],
    [Int8Array, 'BYTE'],
    [Uint8Array, 'UNSIGNED_BYTE'],
    [Int16Array, 'SHORT'],
    [Uint16Array, 'UNSIGNED_SHORT']
  ] as const)('映射 %s attribute', (ArrayType, enumName) => {
    const f = setup()
    const data = new ArrayType([0, 1, 2, 3, 4, 5])

    const geometry = new Geometry({
      attributes: {
        position: new VertexAttribute({ data, itemSize: 2 })
      }
    })

    expect(f.manager.get(geometry).attributes.get('position')!.type).toBe(f.gl[enumName])

    expect(f.calls.bufferData.mock.calls[0]![1]).toEqual(data)
  })

  it.each([
    ['triangles', 3, 'TRIANGLES'],
    ['lines', 4, 'LINES'],
    ['line-strip', 3, 'LINE_STRIP'],
    ['triangle-strip', 4, 'TRIANGLE_STRIP']
  ] as const)('映射 %s topology', (topology, count, enumName) => {
    const f = setup()

    expect(f.manager.get(createGeometry(undefined, count, topology)).primitiveMode).toBe(
      f.gl[enumName]
    )
  })

  it.each([
    [Uint8Array, 'UNSIGNED_BYTE'],
    [Uint16Array, 'UNSIGNED_SHORT']
  ] as const)('保留 %s index 类型', (ArrayType, enumName) => {
    const f = setup()
    const indices = new ArrayType([0, 1, 2])
    const gpu = f.manager.get(createGeometry(indices))

    expect(gpu.indexType).toBe(f.gl[enumName])
    expect(gpu.indexBuffer).not.toBeNull()

    expect(f.calls.bufferData.mock.calls[2]).toEqual([
      f.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      f.gl.STATIC_DRAW
    ])
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl1-uint32-index-fallback]
   *
   * 恰好 65535 仍可降级；65536 不能被截断成 0。
   */
  it('无扩展时无损降级 Uint32，CPU 仍然保留 Uint32', () => {
    const f = setup()
    const indices = new Uint32Array([0, 65535, 1])
    const geometry = createGeometry(indices, 65536)

    expect(f.manager.get(geometry).indexType).toBe(f.gl.UNSIGNED_SHORT)

    expect(f.calls.bufferData.mock.calls[2]![1]).toEqual(new Uint16Array(indices))

    expect(geometry.copyIndices()).toBeInstanceOf(Uint32Array)
    expect(geometry.copyIndices()).toEqual(indices)
  })

  it('无扩展且最大索引越界时，在任何 buffer 创建前拒绝', () => {
    const f = setup()

    expect(() => f.manager.get(createGeometry(new Uint32Array([0, 65536, 1]), 65537))).toThrow(
      UnsupportedIndexTypeError
    )

    expect(f.calls.createBuffer).not.toHaveBeenCalled()
  })

  it('有扩展时保留大 Uint32 index', () => {
    const f = setup(true)
    const data = new Uint32Array([0, 65536, 1])
    const gpu = f.manager.get(createGeometry(data, 65537))

    expect(gpu.indexType).toBe(f.gl.UNSIGNED_INT)
    expect(f.calls.bufferData.mock.calls[2]![1]).toEqual(data)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-upload-binding-restoration]
   *
   * 上传新 Geometry 时旧 VAO 仍被绑定；必须原样恢复它的 EBO，不只是恢复缓存。
   */
  it('恢复真实 ARRAY_BUFFER 与当前 VAO 的 EBO，并通知缓存失效', () => {
    const f = setup()
    const oldArray = f.gl.createBuffer()!
    const oldElements = f.gl.createBuffer()!
    const vao = {}

    f.selectVertexArray(vao)
    f.gl.bindBuffer(f.gl.ARRAY_BUFFER, oldArray)
    f.gl.bindBuffer(f.gl.ELEMENT_ARRAY_BUFFER, oldElements)

    f.manager.get(createGeometry(new Uint16Array([0, 1, 2])))

    expect(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING)).toBe(oldArray)
    expect(f.gl.getParameter(f.gl.ELEMENT_ARRAY_BUFFER_BINDING)).toBe(oldElements)
    expect(f.hooks.invalidateState).toHaveBeenCalled()

    f.selectVertexArray(null)

    expect(f.gl.getParameter(f.gl.ELEMENT_ARRAY_BUFFER_BINDING)).toBeNull()

    f.selectVertexArray(vao)

    expect(f.gl.getParameter(f.gl.ELEMENT_ARRAY_BUFFER_BINDING)).toBe(oldElements)
  })

  /** 逐个分配点注入 null，检查之前成功创建的所有 buffer 都被回收。 */
  it.each([1, 2, 3])('第 %i 次 createBuffer 失败时完整回滚', (failureIndex) => {
    const f = setup()
    const geometry = createGeometry(new Uint16Array([0, 1, 2]))

    for (let index = 1; index < failureIndex; index += 1) {
      f.calls.createBuffer.mockReturnValueOnce({})
    }

    f.calls.createBuffer.mockReturnValueOnce(null)

    expect(() => f.manager.get(geometry)).toThrow(WebGLResourceCreationError)

    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(failureIndex - 1)
    expect(f.manager.get(geometry).indexBuffer).not.toBeNull()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-error-boundaries]
   *
   * fake 不 throw，而是设置 GL error flag；仅包 try/catch 的实现会在此失败。
   */
  it('bufferData 的 GL 错误也回滚，且恢复先前绑定', () => {
    const f = setup()
    const outer = f.gl.createBuffer()!

    f.gl.bindBuffer(f.gl.ARRAY_BUFFER, outer)

    f.calls.bufferData
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        f.setError(f.gl.OUT_OF_MEMORY)
      })

    const geometry = createGeometry()

    expect(() => f.manager.get(geometry)).toThrow(WebGLOperationError)
    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING)).toBe(outer)

    expect(f.manager.get(geometry).drawCount).toBe(3)
  })

  /** Resource 已标记 disposed 后，回调不能再通过公开 getter 读取 CPU 数据。 */
  it('CPU dispose 触发依赖清理，重入 release 仍只删除一组 buffers', () => {
    const f = setup()
    const geometry = createGeometry(new Uint16Array([0, 1, 2]))

    f.manager.get(geometry)

    f.hooks.beforeDelete.mockImplementation((key) => {
      expect(key).toBe(geometry)

      f.events.push('release-vao')
      f.manager.release(key)

      return undefined
    })

    geometry.dispose()
    f.manager.release(geometry)

    expect(f.events).toEqual(['release-vao', 'delete-buffer', 'delete-buffer', 'delete-buffer'])

    expect(() => f.manager.get(geometry)).toThrow(ResourceDisposedError)
  })

  it('Manager dispose 取消订阅但保留 CPU Geometry；重复调用幂等', () => {
    const f = setup()
    const geometry = createGeometry()
    const cancel = vi.fn()

    vi.spyOn(geometry, 'onDispose').mockReturnValue(cancel)

    f.manager.get(geometry)

    f.hooks.beforeDelete.mockImplementation(() => {
      expect(cancel).not.toHaveBeenCalled()
      return undefined
    })

    f.manager.dispose()
    f.manager.dispose()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(geometry.disposed).toBe(false)
    expect(geometry.vertexCount).toBe(3)
    expect(() => f.manager.get(geometry)).toThrow(WebGLBackendDisposedError)
  })

  it('依赖清理失败保留 buffers，下一次 dispose 可重试', () => {
    const f = setup()

    f.manager.get(createGeometry())

    const failure = new Error('VAO cleanup failed')

    f.hooks.beforeDelete.mockImplementationOnce(() => {
      throw failure
    })

    expectCleanupCause(() => f.manager.dispose(), failure)
    expect(f.calls.deleteBuffer).not.toHaveBeenCalled()

    f.manager.dispose()

    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  it('lost 只取消订阅和丢缓存，恢复后必须创建新 Manager', () => {
    const f = setup()
    const geometry = createGeometry()
    const old = f.manager.get(geometry)

    f.setLost(true)

    expect(() => f.manager.get(geometry)).toThrow(WebGLContextLostError)
    expect(f.calls.deleteBuffer).not.toHaveBeenCalled()

    f.setLost(false)

    expect(() => f.manager.get(geometry)).toThrow(WebGLContextLostError)

    const replacement = new WebGL1GeometryManager(f.gl, f.capabilities, f.hooks)

    expect(replacement.get(geometry).attributes.get('position')!.buffer).not.toBe(
      old.attributes.get('position')!.buffer
    )

    f.manager.dispose()

    expect(f.calls.deleteBuffer).not.toHaveBeenCalled()

    replacement.dispose()
  })

  it('上传中 lost 不执行恢复绑定或 GPU 删除', () => {
    const f = setup()

    f.calls.bufferData.mockImplementationOnce(() => {
      f.setLost(true)
    })

    expect(() => f.manager.get(createGeometry())).toThrow(WebGLContextLostError)
    expect(f.calls.bindBuffer).toHaveBeenCalledTimes(1)
    expect(f.calls.deleteBuffer).not.toHaveBeenCalled()
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
   *
   * Given 两种未读取的普通错误；When 进入静态 buffer 创建入口；
   * Then 一次报告全部错误，不分配或上传 buffer，下一次干净调用才创建资源。
   * 捕获单次读取及静默清空错误两种实现，两组顺序不规定真实驱动的返回顺序。
   */
  it.each([
    [0x0500, 0x0501],
    [0x0501, 0x0500]
  ])('preflight 一次报告全部遗留错误：%i、%i', (first, second) => {
    const f = setup()
    const geometry = createGeometry()
    let failure: unknown

    f.calls.getError
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(f.gl.NO_ERROR)

    try {
      f.manager.get(geometry)
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.operation).toBe('preflight')
    expect(failure.details.reason).toMatch(/\b1280\b/)
    expect(failure.details.reason).toMatch(/\b1281\b/)
    expect(f.calls.getError).toHaveBeenCalledTimes(3)
    expect(f.calls.createBuffer).not.toHaveBeenCalled()
    expect(f.calls.bufferData).not.toHaveBeenCalled()

    expect(f.manager.get(geometry).drawCount).toBe(3)
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
   *
   * 异常响应持续返回错误，验证预算耗尽不是成功，也不能开始 buffer 上传。
   * 捕获无界循环或达到上限后静默继续的实现；不宣称正常 GL 会不断返回该码。
   * fake 在第 65 次读取主动抛错，避免同步无限循环卡住整个测试进程。
   */
  it('达到读取上限仍无 NO_ERROR 时报告收集未完成，不上传', () => {
    const f = setup()
    let failure: unknown
    let readCount = 0

    f.calls.getError.mockImplementation(() => {
      readCount += 1
      if (readCount > 64) throw new Error('Test safety guard: unbounded getError loop')
      return f.gl.INVALID_OPERATION
    })

    try {
      f.manager.get(createGeometry())
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.reason).toContain('NO_ERROR')
    expect(f.calls.getError.mock.calls.length).toBeGreaterThan(1)
    expect(f.calls.getError.mock.calls.length).toBeLessThanOrEqual(32)
    expect(f.calls.createBuffer).not.toHaveBeenCalled()
  })

  /**
   * Given bufferData 留下两个普通错误；Then 全部报告且回收本次创建的 buffer。
   * 捕获“只修改入口检查，上传后的检查仍只读一个”的实现。
   */
  it('上传后批量报告 GL 错误并回滚本次 buffer', () => {
    const f = setup()
    let failure: unknown

    f.calls.bufferData.mockImplementationOnce(() => {
      f.calls.getError
        .mockReturnValueOnce(0x0500)
        .mockReturnValueOnce(0x0501)
        .mockReturnValueOnce(f.gl.NO_ERROR)
    })

    try {
      f.manager.get(createGeometry())
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.operation).toBe('upload buffer')
    expect(failure.details.reason).toMatch(/\b1280\b/)
    expect(failure.details.reason).toMatch(/\b1281\b/)
    expect(f.calls.createBuffer).toHaveBeenCalledTimes(1)
    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING)).toBeNull()
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-resource-error-boundaries]
   *
   * Given 已有缓存 buffers；When 新入口先读到普通错误，再在第二次读取期间 lost；
   * Then 丢弃旧代缓存且不删除旧代 handles，物理恢复也不能复用此 Manager。
   * 捕获缺少读取后生命周期检查、把 NO_ERROR 当作恢复证明的实现。
   */
  it('读取期间 lost 优先于 NO_ERROR，并使已有 buffer 缓存失效', () => {
    const f = setup()
    const cachedGeometry = createGeometry()
    f.manager.get(cachedGeometry)
    f.hooks.invalidateState.mockClear()
    f.calls.getError.mockClear()

    f.calls.getError.mockReturnValueOnce(0x0500).mockImplementationOnce(() => {
      f.setLost(true)
      return f.gl.NO_ERROR
    })

    expect(() => f.manager.get(createGeometry())).toThrow(WebGLContextLostError)
    expect(f.hooks.invalidateState).toHaveBeenCalled()
    expect(f.calls.getError).toHaveBeenCalledTimes(2)
    expect(f.calls.deleteBuffer).not.toHaveBeenCalled()

    f.setLost(false)
    expect(() => f.manager.get(cachedGeometry)).toThrow(WebGLContextLostError)
    expect(f.calls.getError).toHaveBeenCalledTimes(2)
  })

  /** 捕获读取期间 Manager 关闭后，错误收集仍允许进入 buffer 创建的实现。 */
  it('读取期间 Manager dispose 后停止，不创建 buffer', () => {
    const f = setup()

    f.calls.getError.mockImplementationOnce(() => {
      f.manager.dispose()
      return f.gl.NO_ERROR
    })

    expect(() => f.manager.get(createGeometry())).toThrow(WebGLBackendDisposedError)
    expect(f.calls.getError).toHaveBeenCalledTimes(1)
    expect(f.calls.createBuffer).not.toHaveBeenCalled()
  })

  /** 捕获把批量读取放到热路径、重复借用静态 buffers 时也消费错误的实现。 */
  it('geometry 缓存命中不读取或消费待处理的 GL 错误', () => {
    const f = setup()
    const geometry = createGeometry()
    const cached = f.manager.get(geometry)
    f.calls.getError.mockClear()
    f.setError(f.gl.INVALID_OPERATION)

    expect(f.manager.get(geometry)).toBe(cached)
    expect(f.calls.getError).not.toHaveBeenCalled()
    expect(f.calls.bufferData).toHaveBeenCalledTimes(2)
  })
})

describe('Geometry cleanup progress', () => {
  /** 第二个 VBO 失败不能丢掉 EBO，也不能再次删除第一个成功 VBO。 */
  it('逐 buffer 保存进度，失败后拒绝借用，重试只删除剩余对象', () => {
    const f = setup()
    const cpu = createGeometry(new Uint16Array([0, 1, 2]))
    const gpu = f.manager.get(cpu)
    const done: WebGLBuffer[] = []
    const remove = f.calls.deleteBuffer.getMockImplementation()!
    f.calls.deleteBuffer
      .mockImplementationOnce((value) => {
        done.push(value)
        remove(value)
      })
      .mockImplementationOnce(() => {
        throw new Error('second buffer')
      })
    expect(() => f.manager.release(cpu)).toThrow(CleanupFailureError)
    expect(done).toEqual([gpu.attributes.get('position')!.buffer])
    expect(() => f.manager.get(cpu)).toThrow()
    f.manager.release(cpu)
    expect(f.calls.deleteBuffer.mock.calls.map(([value]) => value)).toEqual([
      gpu.attributes.get('position')!.buffer,
      gpu.attributes.get('uv')!.buffer,
      gpu.attributes.get('uv')!.buffer,
      gpu.indexBuffer
    ])
    expect(f.hooks.beforeDelete).toHaveBeenCalledTimes(1)
  })

  /** 外部 release 进行中反调 Resource.dispose，内部 no-op 不能虚报完成。 */
  it('跨层重入保留 Resource 的捕获任务，GPU 完成后才允许 CPU 完成', () => {
    const f = setup()
    const cpu = createGeometry()
    f.manager.get(cpu)
    f.hooks.beforeDelete.mockImplementationOnce(() => {
      expect(() => cpu.dispose()).toThrow(CleanupFailureError)
      expect(cpu.cleanupState).toBe('failed')
      return undefined
    })
    f.manager.release(cpu)
    cpu.dispose()
    expect(cpu.cleanupState).toBe('complete')
    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  /** 整体关闭失败后 get 不能复活已部分删除的 Manager。 */
  it('dispose 失败仍关闭，后续显式 dispose 可以继续', () => {
    const f = setup()
    const cpu = createGeometry()
    f.manager.get(cpu)
    f.calls.deleteBuffer.mockImplementationOnce(() => {
      throw new Error('buffer')
    })
    expect(() => f.manager.dispose()).toThrow(CleanupFailureError)
    expect(() => f.manager.get(cpu)).toThrow(WebGLBackendDisposedError)
    f.manager.dispose()
    expect(f.calls.deleteBuffer).toHaveBeenCalledTimes(3)
  })
})

/** 清理错误统一包装，但最底层原始异常的身份必须完整保留。 */
function expectCleanupCause(action: () => void, expected: unknown): void {
  let failure: unknown
  try {
    action()
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(CleanupFailureError)
  const causes: unknown[] = []
  const visit = (error: unknown): void => {
    causes.push(error)
    if (error instanceof CleanupFailureError) {
      for (const entry of error.failures) visit(entry.cause)
    }
  }
  visit(failure)
  expect(causes).toContain(expected)
}
