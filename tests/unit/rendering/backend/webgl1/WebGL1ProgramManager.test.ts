import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'
import { describe, expect, it, vi } from 'vitest'
import { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import {
  ProgramLinkError,
  ResourceDisposedError,
  ShaderCompilationError,
  UnsupportedShaderLanguageError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { createFakeWebGL1ResourceContext } from '../fakes/createFakeWebGL1ResourceContext'

/** 完整 GLSL 字符串供 Manager 转交；fake 不解析它，浏览器验收才验证真实编译。 */
function createShader(language: 'glsl-es-100' | 'glsl-es-300' = 'glsl-es-100'): ShaderModule {
  return new ShaderModule({
    name: 'triangle',
    language,
    vertexSource: 'attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}',
    fragmentSource: 'precision mediump float; uniform vec4 uTint; void main(){gl_FragColor=uTint;}'
  })
}

/** 每个测试拥有独立 context，防止跨测试缓存掩盖错误。 */
function setup() {
  const fake = createFakeWebGL1ResourceContext()

  const hooks = {
    invalidateState: vi.fn(() => undefined),
    beforeDelete: vi.fn((_program: WebGLProgram) => undefined)
  }

  return {
    ...fake,
    hooks,
    manager: new WebGL1ProgramManager(fake.gl, hooks)
  }
}

describe('WebGL1ProgramManager', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
   *
   * 相同 CPU 身份应复用；相同名称不应合并；不同 context 也不应共享 handle。
   */
  it('按对象与 context 缓存，反射保留 location 0', () => {
    const a = setup()
    const b = setup()
    const shader = createShader()

    const first = a.manager.get(shader)

    expect(a.manager.get(shader)).toBe(first)
    expect(a.calls.createProgram).toHaveBeenCalledTimes(1)

    expect(a.calls.shaderSource.mock.calls.map((call) => call[1])).toEqual([
      shader.vertexSource,
      shader.fragmentSource
    ])

    expect(first.attributes.get('position')).toBe(0)
    expect(first.uniforms.get('uTint')).toBe(a.uniforms[0]!.location)
    expect(a.calls.detachShader).toHaveBeenCalledTimes(2)
    expect(a.calls.deleteShader).toHaveBeenCalledTimes(2)

    expect(a.manager.get(createShader()).program).not.toBe(first.program)
    expect(b.manager.get(shader).program).not.toBe(first.program)
  })

  /** 在 compile 前拒绝，并在错误里记下被拒绝的 language；参数传反也会被发现。 */
  it('GLSL ES 3.00 在任何 GPU 创建前拒绝，并记录被拒绝的 language', () => {
    const f = setup()
    let caughtError: unknown

    try {
      f.manager.get(createShader('glsl-es-300'))
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(UnsupportedShaderLanguageError)

    if (!(caughtError instanceof UnsupportedShaderLanguageError)) {
      throw new Error('Expected UnsupportedShaderLanguageError')
    }

    expect(caughtError.details).toEqual({
      shaderName: 'triangle',
      language: 'glsl-es-300',
      backendKind: 'webgl1'
    })
    expect(f.calls.createShader).not.toHaveBeenCalled()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-transaction]
   *
   * 在三个分配点分别失败；重试能成功，说明没有发布半成品缓存。
   */
  it.each(['vertex', 'fragment', 'program'] as const)('回收 %s create-null 的部分对象', (stage) => {
    const f = setup()
    const shader = createShader()

    if (stage === 'vertex') f.calls.createShader.mockReturnValueOnce(null)

    if (stage === 'fragment') {
      f.calls.createShader.mockReturnValueOnce({}).mockReturnValueOnce(null)
    }

    if (stage === 'program') f.calls.createProgram.mockReturnValueOnce(null)

    expect(() => f.manager.get(shader)).toThrow(WebGLResourceCreationError)

    expect(f.calls.deleteShader).toHaveBeenCalledTimes(
      stage === 'vertex' ? 0 : stage === 'fragment' ? 1 : 2
    )

    expect(f.manager.get(shader).program).toBeDefined()
  })

  /** compile/link 错误必须保留阶段/日志，而不是混成 create-null。 */
  it.each(['vertex', 'fragment'] as const)('%s 编译失败使用专用错误并可重试', (stage) => {
    const f = setup()
    const shader = createShader()

    if (stage === 'fragment') f.calls.getShaderParameter.mockReturnValueOnce(true)

    f.calls.getShaderParameter.mockReturnValueOnce(false)

    expect(() => f.manager.get(shader)).toThrow(ShaderCompilationError)

    expect(f.calls.deleteShader).toHaveBeenCalledTimes(stage === 'vertex' ? 1 : 2)
    expect(f.calls.createProgram).not.toHaveBeenCalled()

    expect(f.manager.get(shader).program).toBeDefined()
  })

  it('link 失败删除 program 和两份 shader', () => {
    const f = setup()
    const shader = createShader()

    f.calls.getProgramParameter.mockReturnValueOnce(false)

    expect(() => f.manager.get(shader)).toThrow(ProgramLinkError)
    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(1)
    expect(f.calls.deleteShader).toHaveBeenCalledTimes(2)

    expect(f.manager.get(shader).program).toBeDefined()
  })

  it('反射失败同样回滚；null uniform location 安全跳过', () => {
    const f = setup()
    const shader = createShader()

    f.calls.getActiveAttrib.mockReturnValueOnce(null)

    expect(() => f.manager.get(shader)).toThrow(WebGLOperationError)
    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(1)

    f.uniforms[0]!.location = null

    expect(f.manager.get(shader).uniforms.size).toBe(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   *
   * CPU dispose 必须通知 Manager；关联 VAO 屏障先于 program 删除。
   */
  it('CPU dispose 先触发依赖清理，再解绑当前 program 并删除', () => {
    const f = setup()
    const shader = createShader()
    const gpu = f.manager.get(shader)

    f.gl.useProgram(gpu.program)
    f.events.length = 0

    f.hooks.beforeDelete.mockImplementation((program) => {
      expect(program).toBe(gpu.program)

      f.events.push('release-vao')
      f.manager.release(shader)

      expect(() => f.manager.get(shader)).toThrow(ResourceDisposedError)

      return undefined
    })

    shader.dispose()
    f.manager.release(shader)

    expect(f.events).toEqual(['release-vao', 'delete-program'])
    expect(f.gl.getParameter(f.gl.CURRENT_PROGRAM)).toBeNull()
    expect(f.hooks.invalidateState).toHaveBeenCalled()
  })

  it('Manager dispose 逐项成功后取消订阅，不释放 CPU 数据', () => {
    const f = setup()
    const a = createShader()
    const b = createShader()
    const cancelled: string[] = []

    vi.spyOn(a, 'onDispose').mockReturnValue(() => {
      cancelled.push('a')
    })

    vi.spyOn(b, 'onDispose').mockReturnValue(() => {
      cancelled.push('b')
    })

    f.manager.get(a)
    f.manager.get(b)

    let dependencyCalls = 0
    f.hooks.beforeDelete.mockImplementation(() => {
      expect(cancelled).toEqual(dependencyCalls++ === 0 ? [] : ['a'])

      return undefined
    })

    f.manager.dispose()
    f.manager.dispose()

    expect(cancelled).toEqual(['a', 'b'])
    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(2)
    expect(a.disposed).toBe(false)
    expect(b.vertexSource).toContain('position')
    expect(() => f.manager.get(a)).toThrow(WebGLBackendDisposedError)
  })

  it('依赖清理失败不删除 program；dispose 可以重试剩余记录', () => {
    const f = setup()

    f.manager.get(createShader())

    const failure = new Error('VAO cleanup failed')

    f.hooks.beforeDelete.mockImplementationOnce(() => {
      throw failure
    })

    expectCleanupCause(() => f.manager.dispose(), failure)
    expect(f.calls.deleteProgram).not.toHaveBeenCalled()

    f.manager.dispose()

    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(1)
  })

  /** lost 不是普通 delete；恢复后也必须换新 Manager。 */
  it('lost 丢弃记录并取消订阅，新 Manager 可重建', () => {
    const f = setup()
    const shader = createShader()
    const first = f.manager.get(shader)

    f.setLost(true)

    expect(() => f.manager.get(shader)).toThrow(WebGLContextLostError)
    expect(f.calls.deleteProgram).not.toHaveBeenCalled()

    f.setLost(false)

    expect(() => f.manager.get(shader)).toThrow(WebGLContextLostError)

    const replacement = new WebGL1ProgramManager(f.gl, f.hooks)

    expect(replacement.get(shader).program).not.toBe(first.program)

    f.calls.deleteProgram.mockClear()
    f.manager.dispose()

    expect(f.calls.deleteProgram).not.toHaveBeenCalled()

    replacement.dispose()
  })

  it('创建中物理 lost 优先于 null/compile 错误，且不执行 delete', () => {
    const f = setup()

    f.calls.createProgram.mockImplementationOnce(() => {
      f.setLost(true)
      return null
    })

    expect(() => f.manager.get(createShader())).toThrow(WebGLContextLostError)
    expect(f.calls.deleteShader).not.toHaveBeenCalled()
    expect(f.calls.deleteProgram).not.toHaveBeenCalled()
  })

  it('已有 GL 错误不被静默吞掉，disposed CPU 不允许重新编译', () => {
    const f = setup()

    f.setError(f.gl.INVALID_OPERATION)

    expect(() => f.manager.get(createShader())).toThrow(WebGLOperationError)
    expect(f.calls.createShader).not.toHaveBeenCalled()

    const shader = createShader()
    shader.dispose()

    expect(() => f.manager.get(shader)).toThrow(ResourceDisposedError)
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
   *
   * Given 两种尚未读取的错误，以两种顺序模拟驱动返回；When 进入创建入口；
   * Then 一次报告两个码、停止创建，并允许错误读完后的下一次调用正常创建。
   * 捕获“只读一个就抛出”和“读完却继续编译”两种错误实现，不规定驱动顺序。
   */
  it.each([
    [0x0500, 0x0501],
    [0x0501, 0x0500]
  ])('preflight 一次报告全部遗留错误：%i、%i', (first, second) => {
    const f = setup()
    const shader = createShader()
    let failure: unknown

    f.calls.getError
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(f.gl.NO_ERROR)

    try {
      f.manager.get(shader)
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.operation).toBe('preflight')
    expect(failure.details.reason).toMatch(/\b1280\b/)
    expect(failure.details.reason).toMatch(/\b1281\b/)
    expect(f.calls.getError).toHaveBeenCalledTimes(3)
    expect(f.calls.createShader).not.toHaveBeenCalled()
    expect(f.calls.createProgram).not.toHaveBeenCalled()

    expect(f.manager.get(shader).program).toBeDefined()
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
   *
   * 用持续返回普通错误的异常驱动响应验证终止预算，而不是模拟正常 error flags。
   * 捕获“未观察到 NO_ERROR 却宣称读完”及无界循环。
   * fake 在第 65 次读取主动抛错，避免同步无限循环卡住整个测试进程。
   */
  it('达到读取上限仍无 NO_ERROR 时报告收集未完成，不编译', () => {
    const f = setup()
    let failure: unknown
    let readCount = 0

    f.calls.getError.mockImplementation(() => {
      readCount += 1
      if (readCount > 64) throw new Error('Test safety guard: unbounded getError loop')
      return f.gl.INVALID_OPERATION
    })

    try {
      f.manager.get(createShader())
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.reason).toContain('NO_ERROR')
    expect(f.calls.getError.mock.calls.length).toBeGreaterThan(1)
    expect(f.calls.getError.mock.calls.length).toBeLessThanOrEqual(32)
    expect(f.calls.createShader).not.toHaveBeenCalled()
  })

  /**
   * Given 编译调用留下两个普通错误；Then 不发布 program，并回收已创建的 shader。
   * 捕获“只在 preflight 批量读取，编译后的检查仍漏读”的实现。
   */
  it('编译后批量报告 GL 错误并回滚临时 shader', () => {
    const f = setup()
    let failure: unknown

    f.calls.compileShader.mockImplementationOnce(() => {
      f.calls.getError
        .mockReturnValueOnce(0x0500)
        .mockReturnValueOnce(0x0501)
        .mockReturnValueOnce(f.gl.NO_ERROR)
    })

    try {
      f.manager.get(createShader())
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(WebGLOperationError)
    if (!(failure instanceof WebGLOperationError)) throw new Error('Expected WebGLOperationError')

    expect(failure.details.operation).toBe('compile shader')
    expect(failure.details.reason).toMatch(/\b1280\b/)
    expect(failure.details.reason).toMatch(/\b1281\b/)
    expect(f.calls.createProgram).not.toHaveBeenCalled()
    expect(f.calls.deleteShader).toHaveBeenCalledTimes(1)
  })

  /**
   * [DESIGN-WEIGHT:3][webgl-resource-error-boundaries]
   *
   * Given 已缓存 program；When 新入口先读到普通错误，再在第二次读取期间 lost；
   * Then lost 优先，旧缓存失效，即便物理 context 恢复也不能复用此 Manager。
   * 捕获删掉读取后 assertAvailable() 的实现，不把 NO_ERROR 当作健康证明。
   */
  it('读取期间 lost 优先于 NO_ERROR，并使已有 program 缓存失效', () => {
    const f = setup()
    const cachedShader = createShader()
    f.manager.get(cachedShader)
    f.hooks.invalidateState.mockClear()
    f.calls.getError.mockClear()

    f.calls.getError.mockReturnValueOnce(0x0500).mockImplementationOnce(() => {
      f.setLost(true)
      return f.gl.NO_ERROR
    })

    expect(() => f.manager.get(createShader())).toThrow(WebGLContextLostError)
    expect(f.hooks.invalidateState).toHaveBeenCalled()
    expect(f.calls.getError).toHaveBeenCalledTimes(2)
    expect(f.calls.deleteProgram).not.toHaveBeenCalled()

    f.setLost(false)
    expect(() => f.manager.get(cachedShader)).toThrow(WebGLContextLostError)
    expect(f.calls.getError).toHaveBeenCalledTimes(2)
  })

  /** 捕获读取期间 Manager 已关闭却仍允许进入 GPU 创建的实现。 */
  it('读取期间 Manager dispose 后停止，不创建 shader', () => {
    const f = setup()

    f.calls.getError.mockImplementationOnce(() => {
      f.manager.dispose()
      return f.gl.NO_ERROR
    })

    expect(() => f.manager.get(createShader())).toThrow(WebGLBackendDisposedError)
    expect(f.calls.getError).toHaveBeenCalledTimes(1)
    expect(f.calls.createShader).not.toHaveBeenCalled()
  })

  /** 捕获把批量读取搬到 cache hit、导致每次 draw 借用 program 都读取错误的实现。 */
  it('program 缓存命中不读取或消费待处理的 GL 错误', () => {
    const f = setup()
    const shader = createShader()
    const cached = f.manager.get(shader)
    f.calls.getError.mockClear()
    f.setError(f.gl.INVALID_OPERATION)

    expect(f.manager.get(shader)).toBe(cached)
    expect(f.calls.getError).not.toHaveBeenCalled()
    expect(f.calls.createProgram).toHaveBeenCalledTimes(1)
  })
})

describe('Program cleanup progress', () => {
  /** useProgram(null) 失败时 program 必须保留，下一次不能跳过解绑。 */
  it('解绑失败保留 program，解绑成功后删除失败不重放依赖屏障', () => {
    const f = setup()
    const cpu = createShader()
    const gpu = f.manager.get(cpu)
    f.gl.useProgram(gpu.program)
    f.calls.useProgram.mockImplementationOnce(() => {
      throw new Error('unbind')
    })
    expect(() => f.manager.release(cpu)).toThrow(CleanupFailureError)
    expect(f.calls.deleteProgram).not.toHaveBeenCalled()
    f.calls.deleteProgram.mockImplementationOnce(() => {
      throw new Error('delete')
    })
    expect(() => f.manager.release(cpu)).toThrow(CleanupFailureError)
    f.manager.release(cpu)
    expect(f.hooks.beforeDelete).toHaveBeenCalledTimes(1)
    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(2)
    expect(f.gl.getParameter(f.gl.CURRENT_PROGRAM)).toBeNull()
  })

  /** 取消订阅前必须完成 GPU；否则外部 release 中的 Resource.dispose 会提前成功。 */
  it('Resource 重入不能因 Manager 防重入返回而完成', () => {
    const f = setup()
    const cpu = createShader()
    f.manager.get(cpu)
    f.hooks.beforeDelete.mockImplementationOnce(() => {
      expect(() => cpu.dispose()).toThrow(CleanupFailureError)
      return undefined
    })
    f.manager.release(cpu)
    expect(cpu.cleanupState).toBe('failed')
    cpu.dispose()
    expect(cpu.cleanupState).toBe('complete')
    expect(f.calls.deleteProgram).toHaveBeenCalledTimes(1)
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
