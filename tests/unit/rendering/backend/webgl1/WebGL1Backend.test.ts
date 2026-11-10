import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import {
  InvalidMaterialError,
  CleanupFailureError,
  RenderTargetUnavailableError,
  ResourceDisposedError,
  ProgramLinkError,
  ShaderCompilationError,
  WebGLBackendDisposedError,
  WebGLContextCreationError,
  WebGLContextLostError,
  WebGLOperationError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import type { Texture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
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
    item: { geometry, material, worldMatrix: IDENTITY, castShadow: false },
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
   * [DESIGN-WEIGHT:3][draw-dither-state]
   * Given 两个材质共用 program；When false → 默认 true → false 连续 draw；
   * Then 在真正 drawArrays 前提交各自状态，不能只在 clear 或 program 切换时更新。
   * GL 边界替身只记录命令；实际 DITHER 状态另由浏览器测试验证。
   */
  it('每次 draw 显式应用材质 DITHER，且早于绘制命令', () => {
    const f = createFixture()
    const packed = new Material({ shaderModule: f.shader, state: { dither: false } })
    cleanups.push(() => packed.dispose())

    for (const material of [packed, f.material, packed]) {
      f.fake.calls.enable.mockClear()
      f.fake.calls.disable.mockClear()
      f.fake.calls.drawArrays.mockClear()
      f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
        f.backend.draw({ ...f.submission, item: { ...f.submission.item, material } })
      })
      const setter = material === packed ? f.fake.calls.disable : f.fake.calls.enable
      const index = setter.mock.calls.findIndex(([capability]) => capability === f.fake.gl.DITHER)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(setter.mock.invocationCallOrder[index]).toBeLessThan(
        f.fake.calls.drawArrays.mock.invocationCallOrder[0]!
      )
    }
  })

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

/** 为真实 Backend/Managers 准备 CPU 像素；资源仍由测试拥有。 */
function samplingTexture(): DataTexture2D {
  const texture = new DataTexture2D({
    label: 'backend-2d',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    source: { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }
  })
  cleanups.push(() => texture.dispose())
  return texture
}

/** 两个目标可同名；反馈检查和 GPU 缓存不得使用 label 作为身份。 */
function samplingTarget(): RenderTarget {
  const target = legacyTarget(
    {
      width: 4,
      height: 4,
      colors: [{ format: 'rgba8' }],
      depth: { format: 'depth16' }
    },
    { label: 'backend-target' }
  )
  cleanups.push(() => target.dispose())
  return target
}

/** 只安排链接反射结果；实际解析、上传、绑定和 draw 使用正式对象。 */
function useSamplingSource(
  f: ReturnType<typeof createFixture>,
  source: Texture2DSamplingSource
): void {
  f.fake.vertex.uniforms.splice(0, f.fake.vertex.uniforms.length, {
    name: 'uMap',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: { id: 'uMap' }
  })
  f.material.setParameter('uMap', { type: 'texture2D', value: source })
}

/**
 * @remarks
 * [DESIGN-WEIGHT:3][texture2d-source-borrowing]
 * Given 真实 CPU 资源与真实 Managers；When draw 消费二维来源；Then 观察 gl.* 协议。
 * fake 不证明最终像素；四角颜色与过滤差异另由 browser suite 验收。
 */
describe('WebGL1Backend Texture2D integration', () => {
  it('CPU 来源只上传一次，冷上传完成后重新应用 program/state 再 draw', () => {
    const f = createFixture()
    useSamplingSource(f, samplingTexture())
    // 热 program/geometry 路径下换一个尚未上传的纹理，才能检测冷上传后的状态失效。
    f.draw()
    f.fake.vertex.calls.useProgram.mockClear()
    f.fake.calls.depthFunc.mockClear()
    f.fake.texture.api.texImage2D.mockClear()
    useSamplingSource(f, samplingTexture())
    f.draw()
    f.draw()

    expect(f.fake.texture.api.texImage2D).toHaveBeenCalledTimes(1)
    const uploadOrder = f.fake.texture.api.texImage2D.mock.invocationCallOrder[0]!
    expect(f.fake.vertex.calls.useProgram.mock.invocationCallOrder[0]!).toBeGreaterThan(uploadOrder)
    expect(f.fake.calls.depthFunc.mock.invocationCallOrder[0]!).toBeGreaterThan(uploadOrder)
    expect(f.fake.calls.uniform1i).toHaveBeenLastCalledWith({ id: 'uMap' }, 0)
    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(3)
    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })

  /** 附件采样必须借用目标已有存储；另建 CPU texture 会使上传次数/handle 断言失败。 */
  it('消费已创建的颜色附件，不二次上传，不改变 CPU 所有权', () => {
    const f = createFixture()
    const target = samplingTarget()
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, () => {
      f.backend.draw(f.submission)
    })
    const handle = f.fake.texture.api.framebufferTexture2D.mock.calls[0]![3]
    // 生产者 program 已被反射过；消费者必须是新的 ShaderModule/Material。
    const shader = new ShaderModule({
      name: 'attachment-consumer',
      language: 'glsl-es-100',
      vertexSource: 'void main(){gl_Position=vec4(0.0);}',
      fragmentSource:
        'precision mediump float; uniform sampler2D uMap; void main(){gl_FragColor=texture2D(uMap,vec2(0.5));}'
    })
    const material = new Material({
      shaderModule: shader,
      parameters: { uMap: { type: 'texture2D', value: target.getColorAttachment(0) } }
    })
    cleanups.push(() => {
      material.dispose()
      shader.dispose()
    })
    f.fake.vertex.uniforms.splice(0, 0, {
      name: 'uMap',
      type: f.fake.gl.SAMPLER_2D,
      size: 1,
      location: { id: 'uMap' }
    })
    const submission = { ...f.submission, item: { ...f.submission.item, material } }
    const uploadsBefore = f.fake.texture.api.texImage2D.mock.calls.length
    f.fake.texture.api.bindTexture.mockClear()
    for (let draw = 0; draw < 2; draw++) {
      f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
        f.backend.draw(submission)
      })
    }
    expect(f.fake.texture.api.bindTexture).toHaveBeenCalledWith(f.fake.gl.TEXTURE_2D, handle)
    expect(f.fake.texture.api.texImage2D).toHaveBeenCalledTimes(uploadsBefore)
    expect(target.sceneReferenceCount).toBe(0)
    expect(target.disposed).toBe(false)
  })

  /** [DESIGN-WEIGHT:3][surface-texture-feedback] 外层暂停不等于当前仍在写外层。 */
  it('内层 B 可读 A；返回 A 后自采样被拒绝且不追加 draw', () => {
    const f = createFixture()
    const a = samplingTarget()
    const b = samplingTarget()
    useSamplingSource(f, a.getColorAttachment(0))
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
      const outer = f.fake.readSurface()
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: b } }, () => {
        f.backend.draw(f.submission)
      })
      expect(f.fake.readSurface()).toEqual(outer)
      expect(() => f.backend.draw(f.submission)).toThrow(RenderTargetUnavailableError)
      expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
      expect(f.fake.calls.uniform1i).toHaveBeenCalledTimes(1)
    })
    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })

  /** 无法采样的深度 RBO 必须在分配前被拒绝，不能断言为 WebGLTexture。 */
  it('depth16 采样拒绝，不分配目标、不上传 uniform、不 draw', () => {
    const f = createFixture()
    expect(() => useSamplingSource(f, samplingTarget().getDepthAttachment()!)).toThrow(
      InvalidMaterialError
    )
    expect(f.fake.calls.createFramebuffer).not.toHaveBeenCalled()
    expect(f.fake.calls.uniform1i).not.toHaveBeenCalled()
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })

  /** 来源可能在 Material 构造以后失效；不能直接沿用上一次 draw 的纹理。 */
  it.each(['texture', 'attachment'] as const)(
    '%s 已释放则拒绝下一次 draw 并恢复 surface',
    (kind) => {
      const f = createFixture()
      const source = kind === 'texture' ? samplingTexture() : samplingTarget()
      useSamplingSource(f, source instanceof RenderTarget ? source.getColorAttachment(0) : source)
      f.draw()
      source.dispose()
      expect(() => f.draw()).toThrow(ResourceDisposedError)
      expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
      expect(f.fake.calls.uniform1i).toHaveBeenCalledTimes(1)
      expect(f.fake.readSurface()).toEqual({
        framebuffer: f.fake.outerFramebuffer,
        viewport: [3, 4, 8, 9]
      })
    }
  )

  /** [DESIGN-WEIGHT:3][attachment-content-rebuild] 新代重建 GPU 存储，不复活旧 handle。 */
  it.each(['texture', 'attachment'] as const)('%s 在恢复后通过原逻辑来源解析新 handle', (kind) => {
    const f = createFixture()
    const source = kind === 'texture' ? samplingTexture() : samplingTarget()
    useSamplingSource(f, source instanceof RenderTarget ? source.getColorAttachment(0) : source)
    f.draw()
    const oldHandle = f.fake.texture.api.bindTexture.mock.calls.at(-1)![1]
    f.fake.loseContext()
    expect(() => f.draw()).toThrow(WebGLContextLostError)
    expect(f.fake.texture.api.deleteTexture).not.toHaveBeenCalled()
    f.fake.restoreContext()
    f.draw()
    const nextHandle = f.fake.texture.api.bindTexture.mock.calls.at(-1)![1]
    expect(nextHandle).not.toBe(oldHandle)
    expect(f.fake.texture.api.createTexture).toHaveBeenCalledTimes(2)
    expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(2)
    expect(source.disposed).toBe(false)
    // 本单测只证明重新解析/分配；恢复后的附件内容必须由 browser 测试的生产者重画。
  })

  /** 上传异常停在 prepare；即使 program 已创建，也不执行半批 uniform 或 draw。 */
  it('冷上传失败传播领域错误并恢复外部 surface', () => {
    const f = createFixture()
    useSamplingSource(f, samplingTexture())
    f.fake.texture.api.createTexture.mockReturnValueOnce(null)
    expect(() => f.draw()).toThrow(WebGLResourceCreationError)
    expect(f.fake.calls.uniform1i).not.toHaveBeenCalled()
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    expect(f.fake.readSurface()).toEqual({
      framebuffer: f.fake.outerFramebuffer,
      viewport: [3, 4, 8, 9]
    })
  })
})

/**
 * C0 联合验收：使用正式 Backend/Managers/Resources，故障只注入 GL 边界。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
 * ready=false 是关闭绘制，cleanupState=complete 才是 Resource 清理完成。
 * 此处不伪造 Backend 私有 cursor，也不直接调用其私有 generation。
 */
describe('WebGL1Backend resumable cleanup', () => {
  /** 两个 buffer 中第二个失败：前一个不重放，program 等到下一轮再释放。 */
  it('Backend 关闭后重试未完成 buffer，不越过 program 依赖屏障', () => {
    const f = createFixture(true)
    f.draw()
    const remove = f.fake.vertex.calls.deleteBuffer.getMockImplementation()!
    f.fake.vertex.calls.deleteBuffer.mockImplementationOnce(remove).mockImplementationOnce(() => {
      throw new Error('second buffer')
    })
    expect(() => f.backend.dispose()).toThrow(CleanupFailureError)
    expect(f.backend.ready).toBe(false)
    expect(() => f.draw()).toThrow(WebGLBackendDisposedError)
    expect(f.fake.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    const completed = f.fake.vertex.calls.deleteBuffer.mock.calls[0]![0]

    f.backend.dispose()
    expect(
      f.fake.vertex.calls.deleteBuffer.mock.calls.filter(([handle]) => handle === completed)
    ).toHaveLength(1)
    expect(f.fake.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
    expect(f.geometry.disposed).toBe(false)
  })

  /** Backend 先完成 GPU 回收后，Resource 已捕获的任务仍能安全确认并完成 CPU 阶段。 */
  it('Resource 失败后由 Backend 完成 GPU，Resource 重试不重复删除', () => {
    const f = createFixture()
    f.draw()
    const independent = vi.fn()
    f.geometry.onDispose(independent)
    f.fake.vertex.calls.deleteBuffer.mockImplementationOnce(() => {
      throw new Error('buffer')
    })
    expect(() => f.geometry.dispose()).toThrow(CleanupFailureError)
    expect(f.geometry.cleanupState).toBe('failed')
    expect(independent).toHaveBeenCalledTimes(1)

    f.backend.dispose()
    const deletions = f.fake.vertex.calls.deleteBuffer.mock.calls.length
    f.geometry.dispose()
    f.geometry.dispose()
    expect(f.geometry.cleanupState).toBe('complete')
    expect(independent).toHaveBeenCalledTimes(1)
    expect(f.fake.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(deletions)
  })

  /** 嵌套 Backend.dispose 经 coordinator 的 running 错误退出，不能设置 cleanupComplete。 */
  it('GPU 删除内重入 Backend.dispose 不提前完成，下一轮仍执行剩余清理', () => {
    const f = createFixture()
    f.draw()
    f.fake.vertex.calls.deleteBuffer.mockImplementationOnce(() => f.backend.dispose())
    expect(() => f.backend.dispose()).toThrow(CleanupFailureError)
    expect(f.fake.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    expect(f.backend.ready).toBe(false)

    f.backend.dispose()
    expect(f.fake.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
    expect(f.fake.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  /** 失败任务指向旧 Manager；恢复后重试旧 Resource 不得删除新代的 buffer。 */
  it('lost/restored 后旧 Resource 清理任务不触碰新代 GPU 对象', () => {
    const f = createFixture()
    f.draw()
    f.fake.vertex.calls.deleteBuffer.mockImplementationOnce(() => {
      throw new Error('old')
    })
    expect(() => f.geometry.dispose()).toThrow(CleanupFailureError)
    f.fake.loseContext()
    f.fake.restoreContext()

    const geometry = new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]),
          itemSize: 3
        })
      }
    })
    cleanups.push(() => geometry.dispose())
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      f.backend.draw({
        ...f.submission,
        item: { ...f.submission.item, geometry }
      })
    })
    const before = f.fake.vertex.calls.deleteBuffer.mock.calls.length
    f.geometry.dispose()
    expect(f.geometry.cleanupState).toBe('complete')
    expect(f.fake.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(before)
    f.backend.dispose()
    expect(f.fake.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(before + 1)
  })
})

const owners = new WeakMap<RenderTarget, RenderTargetBundle>()
function legacyTarget(
  descriptor: {
    width: number
    height: number
    colors: readonly {
      format: string
      sampler?: { minFilter: 'nearest' | 'linear'; magFilter: 'nearest' | 'linear' }
    }[]
    depth?: unknown
  },
  options: { label: string }
) {
  const owner = new RenderTargetBundle({
    label: options.label,
    width: descriptor.width,
    height: descriptor.height,
    colors: descriptor.colors.map((c) => ({
      storage: { format: 'rgba', type: c.format === 'rgba32f' ? 'float32' : 'uint8' },
      colorSpace: 'data',
      defaultSampler: c.sampler
    })),
    depth: descriptor.depth !== undefined
  })
  owners.set(owner.target, owner)
  return owner.target
}
