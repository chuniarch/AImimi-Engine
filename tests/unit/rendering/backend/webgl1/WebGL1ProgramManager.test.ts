import { describe, expect, it, vi } from 'vitest'
import { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import {
  ProgramLinkError,
  ResourceDisposedError,
  ShaderCompilationError,
  UnsupportedShaderVariantError,
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

  it('GLSL ES 3.00 在任何 GPU 创建前拒绝', () => {
    const f = setup()

    expect(() => f.manager.get(createShader('glsl-es-300'))).toThrow(UnsupportedShaderVariantError)

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

  it('Manager dispose 先取消全部订阅，不释放 CPU 数据', () => {
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

    f.hooks.beforeDelete.mockImplementation(() => {
      expect(cancelled).toContain('a')
      expect(cancelled).toContain('b')

      return undefined
    })

    f.manager.dispose()
    f.manager.dispose()

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

    expect(() => f.manager.dispose()).toThrow(failure)
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
})
