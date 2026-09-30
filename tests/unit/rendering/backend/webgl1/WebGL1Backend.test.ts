import { afterEach, describe, expect, it } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import {
  ProgramLinkError,
  ShaderCompilationError,
  WebGLBackendDisposedError,
  WebGLContextCreationError,
  WebGLContextLostError,
  WebGLOperationError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { createFakeWebGL1BackendContext } from '../fakes/createFakeWebGL1BackendContext'
import { Mat4Tuple } from '@/rendering/core/math/tuples'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * 只把浏览器 GL 边界替换为协议假对象；ShaderModule、Material、Geometry
 * 以及 Backend 内的所有 Manager 均使用正式实现。
 */
function createFixture(indexed = false) {
  const fake = createFakeWebGL1BackendContext()

  // 此 shader 没有 active uniform；三角形只验证 Backend 的故障路径。
  fake.vertex.uniforms.splice(0)

  const backend = new WebGL1Backend(fake.canvas, 'backend-fault-test')
  const shader = new ShaderModule({
    name: 'fault-triangle',
    language: 'glsl-es-100',
    vertexSource: [
      'attribute vec3 position;',
      'void main() { gl_Position = vec4(position, 1.0); }'
    ].join('\n'),
    fragmentSource: [
      'precision mediump float;',
      'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
    ].join('\n')
  })
  const geometry = new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array([-0.8, -0.8, 0, 0.8, -0.8, 0, 0, 0.8, 0]),
        itemSize: 3
      })
    },
    ...(indexed ? { indices: new Uint16Array([0, 1, 2]) } : {})
  })
  const material = new Material({ shaderModule: shader })
  const submission: DrawSubmission = {
    item: { geometry, material, worldMatrix: IDENTITY },
    view: {
      viewMatrix: IDENTITY,
      projectionMatrix: IDENTITY,
      cameraWorldPosition: [0, 0, 0]
    }
  }

  const fixture = {
    fake,
    backend,
    shader,
    geometry,
    material,
    submission,

    /** Scope 是同步的；callback 结束之后才能检查入口状态是否恢复。 */
    draw(): void {
      backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
        backend.draw(submission)
      })
    }
  }

  cleanups.push(() => {
    backend.dispose()
    material.dispose()
    geometry.dispose()
    shader.dispose()
  })

  return fixture
}

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups.length = 0
})

describe('WebGL1Backend failure boundaries', () => {
  /**
   * 改错触发点：把 null context 传给 Capabilities，或错误地报告为 createBuffer
   * 失败。只有真正没有取得 context 时才抛 ContextCreationError。
   */
  it('获取不到 WebGL1 context 时报告创建错误', () => {
    const canvas = {
      getContext: () => null
    } as unknown as HTMLCanvasElement

    expect(() => new WebGL1Backend(canvas, 'no-webgl')).toThrow(WebGLContextCreationError)
  })

  /** 改错触发点：允许没有活动输出目的地就发出 draw。 */
  it('scope 外禁止绘制，且不提前创建 GPU program', () => {
    const f = createFixture()

    expect(() => f.backend.draw(f.submission)).toThrow(WebGLOperationError)
    expect(f.fake.vertex.calls.createProgram).not.toHaveBeenCalled()
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
  })

  /** 对真实 Managers 的两种 draw 路径进行基本接线验证，避免故障测试全是 no-op。 */
  it.each([false, true])('正常提交三角形，indexed=%s', (indexed) => {
    const f = createFixture(indexed)
    f.draw()

    if (indexed) {
      expect(f.fake.calls.drawElements).toHaveBeenCalledExactlyOnceWith(
        f.fake.gl.TRIANGLES,
        3,
        f.fake.gl.UNSIGNED_SHORT,
        0
      )
      expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    } else {
      expect(f.fake.calls.drawArrays).toHaveBeenCalledExactlyOnceWith(f.fake.gl.TRIANGLES, 0, 3)
      expect(f.fake.calls.drawElements).not.toHaveBeenCalled()
    }

    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })

  /**
   * 改错触发点：下层领域错误被 Backend 包成裸 Error、仍继续 draw，或异常
   * 退出时留下默认 framebuffer/viewport。依次在五个独立的真实 Manager
   * 操作处注入失败，断言外层调用者仍收到原来的领域错误。
   */
  it.each([
    ['shader-null', WebGLResourceCreationError],
    ['compile', ShaderCompilationError],
    ['program-null', WebGLResourceCreationError],
    ['link', ProgramLinkError],
    ['buffer-null', WebGLResourceCreationError]
  ] as const)('%s 保留原始错误并恢复入口 surface', (kind, expectedError) => {
    const f = createFixture()

    switch (kind) {
      case 'shader-null':
        f.fake.vertex.calls.createShader.mockReturnValueOnce(null)
        break
      case 'compile':
        f.fake.vertex.calls.getShaderParameter.mockReturnValueOnce(false)
        break
      case 'program-null':
        f.fake.vertex.calls.createProgram.mockReturnValueOnce(null)
        break
      case 'link':
        f.fake.vertex.calls.getProgramParameter.mockReturnValueOnce(false)
        break
      case 'buffer-null':
        f.fake.vertex.calls.createBuffer.mockReturnValueOnce(null)
        break
    }

    expect(() => f.draw()).toThrow(expectedError)
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    expect(f.fake.calls.drawElements).not.toHaveBeenCalled()
    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })

  /**
   * 改错触发点：第一次 Manager 创建失败后仍缓存了半成品，第二次 draw
   * 重用坏 handle。失败已经结束当前 scope，随后重新进入 scope 才能重试。
   */
  it('createBuffer 失败之后，下一次 draw 可以重新创建完整资源', () => {
    const f = createFixture()
    f.fake.vertex.calls.createBuffer.mockReturnValueOnce(null)

    expect(() => f.draw()).toThrow(WebGLResourceCreationError)
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()

    f.draw()
    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
  })

  /**
   * 改错触发点：仅依赖 DOM lost 事件，不轮询物理状态；事件尚未送达时误画。
   * 旧 GPU handles 在 lost 期间只能被遗弃，不能调用 gl.delete*。
   */
  it('物理 context 先 lost 时立即禁止 draw，恢复后懒创建新 program', () => {
    const f = createFixture()
    f.draw()
    expect(f.fake.vertex.calls.createProgram).toHaveBeenCalledTimes(1)

    f.fake.vertex.setLost(true)
    expect(f.backend.ready).toBe(false)
    expect(() => f.draw()).toThrow(WebGLContextLostError)
    expect(f.fake.vertex.events).not.toContain('delete-program')
    expect(f.fake.vertex.events).not.toContain('delete-buffer')

    expect(f.fake.loseContext().defaultPrevented).toBe(true)
    f.fake.restoreContext()
    expect(f.backend.ready).toBe(true)
    expect(f.fake.vertex.calls.createProgram).toHaveBeenCalledTimes(1)

    f.draw()
    expect(f.fake.vertex.calls.createProgram).toHaveBeenCalledTimes(2)
    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(2)
  })

  /**
   * 改错触发点：Capability 重探测失败仍发布 ready，或无限自动重试。
   * Lifecycle 保存原始异常；只有后来收到新 restored 事件才重新尝试。
   */
  it('恢复探测失败保持不可绘制，下一次恢复通知可重试', () => {
    const f = createFixture()
    const failure = new Error('capabilities unavailable')

    f.fake.loseContext()
    f.fake.calls.getExtension.mockImplementationOnce(() => {
      throw failure
    })
    f.fake.restoreContext()

    expect(f.backend.ready).toBe(false)
    expect(f.backend.lastFailure).toMatchObject({
      phase: 'restore',
      error: failure
    })
    expect(() => f.draw()).toThrow(WebGLOperationError)
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()

    f.fake.restoreContext()
    expect(f.backend.ready).toBe(true)
    expect(f.backend.lastFailure).toBeNull()
    f.draw()
    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
  })

  /**
   * 改错触发点：尺寸不合法仍先改 canvas.width，或活动 scope 中重置缓冲。
   * 没有开始 GL draw，因此不能靠 drawArrays 调用数替代对尺寸的断言。
   */
  it('resize 在输入失败时不部分修改尺寸，并禁止在活动 scope 内执行', () => {
    const f = createFixture()

    expect(() => f.backend.resizeDrawingBuffer(Number.NaN, 10, 1)).toThrow(WebGLOperationError)
    expect(() => f.backend.resizeDrawingBuffer(5000, 10, 1)).toThrow()
    expect([f.fake.canvas.width, f.fake.canvas.height]).toEqual([32, 32])

    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      expect(() => f.backend.resizeDrawingBuffer(10, 10, 2)).toThrow(WebGLOperationError)
      expect([f.fake.canvas.width, f.fake.canvas.height]).toEqual([32, 32])
    })

    f.backend.resizeDrawingBuffer(20, 10, 2)
    expect([f.fake.canvas.width, f.fake.canvas.height]).toEqual([40, 20])
  })

  /**
   * 改错触发点：Backend 级联释放借用的 CPU Resource，或比 buffer 更早删除
   * program。第二次 dispose 不允许重复调用 gl.delete*。
   */
  it('dispose 按 GPU 依赖关闭，保持 CPU 资源存活，并且幂等', () => {
    const f = createFixture()
    f.draw()

    f.backend.dispose()
    const eventsAfterFirstDispose = [...f.fake.vertex.events]
    f.backend.dispose()

    expect(f.fake.vertex.events).toEqual(eventsAfterFirstDispose)
    expect(eventsAfterFirstDispose.indexOf('delete-buffer')).toBeGreaterThanOrEqual(0)
    expect(eventsAfterFirstDispose.indexOf('delete-program')).toBeGreaterThan(
      eventsAfterFirstDispose.indexOf('delete-buffer')
    )
    expect(f.material.disposed).toBe(false)
    expect(f.geometry.disposed).toBe(false)
    expect(f.shader.disposed).toBe(false)
    expect(f.backend.ready).toBe(false)
    expect(() => f.draw()).toThrow(WebGLBackendDisposedError)
  })

  /** 改错触发点：在回调仍要恢复 framebuffer 时提前删除 Backend GPU 资源。 */
  it('活动 scope 内不能 dispose，回调结束后仍可绘制', () => {
    const f = createFixture()

    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      expect(() => f.backend.dispose()).toThrow(WebGLOperationError)
      f.backend.draw(f.submission)
    })

    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
    expect(f.backend.ready).toBe(true)
  })
})
