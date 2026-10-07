import { describe, expect, it, vi } from 'vitest'
import { RenderTarget, type RenderTargetAttachmentRef } from '@/rendering/resources/RenderTarget'
import {
  IncompleteFramebufferError,
  RenderTargetUnavailableError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
import { createFakeWebGL1TextureContext } from '../fakes/createFakeWebGL1TextureContext'

/** CPU 允许多个槽位；设备是否支持由 Manager 单独决定。 */
function target(colors = 1, depth = true, label = 'test/render-target'): RenderTarget {
  return new RenderTarget(
    {
      width: 8,
      height: 4,
      colors: Array.from({ length: colors }, () => ({ format: 'rgba8' as const })),
      ...(depth ? { depth: { format: 'depth16' as const } } : {})
    },
    { label }
  )
}

function setup(mrt = false) {
  const fake = createFakeWebGL1TextureContext()
  const invalidateState = vi.fn(() => undefined)

  return {
    ...fake,
    invalidateState,
    manager: new WebGL1RenderTargetManager(
      fake.gl,
      {
        drawBuffers: mrt ? fake.mrt : null
      },
      { invalidateState }
    )
  }
}

describe('WebGL1RenderTargetManager', () => {
  /**
   * FBO 检查失败必须指出具体逻辑目标与本次配置版本。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
   * 如果 Manager 仍只拼接类名，多个 revision 相同的目标将无法区分。
   * 分别覆盖首次创建和 resize 后创建；只触发一次创建以保留真正的首个错误。
   */
  it.each([0, 1])('FBO 不完整时保留目标 label 与 revision %i', (revision) => {
    const f = setup()
    const cpu = target(1, true, 'fft/ping')
    if (revision === 1) cpu.resize(16, 8)
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)

    let failure: unknown
    try {
      f.manager.get(cpu)
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(IncompleteFramebufferError)
    const error = failure as IncompleteFramebufferError
    expect(error.message).toContain('fft/ping')
    expect(error.details.targetLabel).toContain('fft/ping')
    expect(error.details.targetLabel).toContain('revision ' + revision)
    expect(error.details.status).toBe(0x8cd6)
  })

  /**
   * label 是诊断文本而非机器身份；重名不能合并两个 owner 的资源。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-cache-identity]
   * 如果缓存错误地改成按 label 索引，第二个目标会借到第一个目标的 handle，
   * 或释放第一个目标时连带破坏第二个目标；本测试同时观察这两种故障。
   */
  it('同名目标仍独立缓存，释放一个不会删除另一个的 GPU 对象', () => {
    const f = setup()
    const first = target(1, true, 'fft/shared')
    const second = target(1, true, 'fft/shared')
    const firstGPU = f.manager.get(first)
    const secondGPU = f.manager.get(second)

    expect(firstGPU.framebuffer).not.toBe(secondGPU.framebuffer)
    expect(firstGPU.colorTextures[0]).not.toBe(secondGPU.colorTextures[0])
    expect(f.manager.get(first)).toBe(firstGPU)
    expect(f.manager.get(second)).toBe(secondGPU)

    first.dispose()
    expect(f.deleted).toContain(firstGPU.framebuffer)
    expect(f.deleted).not.toContain(secondGPU.framebuffer)
    expect(f.deleted).not.toContain(secondGPU.colorTextures[0])
    expect(f.manager.get(second)).toBe(secondGPU)
    f.manager.dispose()
  })

  it('创建 rgba8 + depth16，缓存并解析附件，不取得 CPU 所有权', () => {
    const f = setup()
    const cpu = target()
    const gpu = f.manager.get(cpu)

    expect(f.manager.get(cpu)).toBe(gpu)
    expect(f.api.texImage2D.mock.calls[0]).toEqual([
      f.gl.TEXTURE_2D,
      0,
      f.gl.RGBA,
      8,
      4,
      0,
      f.gl.RGBA,
      f.gl.UNSIGNED_BYTE,
      null
    ])

    expect(f.api.renderbufferStorage).toHaveBeenCalledWith(
      f.gl.RENDERBUFFER,
      f.gl.DEPTH_COMPONENT16,
      8,
      4
    )

    expect(f.manager.resolveAttachment(cpu.getColorAttachment(0))).toBe(gpu.colorTextures[0])
    expect(f.manager.resolveAttachment(cpu.getDepthAttachment()!)).toBe(gpu.depthAttachment)

    f.manager.dispose()
    expect(cpu.disposed).toBe(false)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
   * 删除旧 FBO 再创建新 FBO 会让本测试在失败路径中发现旧 handles 已被删除。
   */
  it('replacement 失败保留旧资源，成功后才删除旧资源并解析新槽位', () => {
    const f = setup()
    const cpu = target()
    const ref = cpu.getColorAttachment(0)
    const old = f.manager.get(cpu)

    cpu.resize(16, 8)
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)

    expect(() => f.manager.get(cpu)).toThrow(IncompleteFramebufferError)
    expect(f.deleted).not.toContain(old.framebuffer)
    expect(f.deleted).not.toContain(old.colorTextures[0])
    expect(f.deleted).not.toContain(old.depthAttachment)

    const next = f.manager.get(cpu)

    expect(next.revision).toBe(1)
    expect([next.width, next.height]).toEqual([16, 8])
    expect(f.deleted).toContain(old.framebuffer)
    expect(f.manager.resolveAttachment(ref)).toBe(next.colorTextures[0])
  })

  it('恢复外部 framebuffer、renderbuffer、texture binding 以及该 FBO 的 MRT 状态', () => {
    const f = setup(true)
    const oldFbo = f.api.createFramebuffer()
    const oldRbo = f.api.createRenderbuffer()
    const oldTex = f.api.createTexture()

    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, oldFbo)
    f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, oldRbo)
    f.gl.activeTexture(f.gl.TEXTURE0 + 2)
    f.gl.bindTexture(f.gl.TEXTURE_2D, oldTex)
    f.mrt.drawBuffersWEBGL([f.gl.COLOR_ATTACHMENT0])

    const gpu = f.manager.get(target(2))

    expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(oldFbo)
    expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(oldRbo)
    expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_2D)).toBe(oldTex)
    expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 2)
    expect(f.drawBuffers.get(oldFbo)).toEqual([0x8ce0])
    expect(f.drawBuffers.get(gpu.framebuffer)).toEqual([0x8ce0, 0x8ce1])
  })

  it('MRT 扩展缺失或超过槽位上限时，不创建部分目标', () => {
    const absent = setup()

    expect(() => absent.manager.get(target(2))).toThrow(UnsupportedRenderFeatureError)
    expect(absent.api.createFramebuffer).not.toHaveBeenCalled()

    const limited = setup(true)
    limited.parameters.set(0x8824, 1)

    expect(() => limited.manager.get(target(2))).toThrow(UnsupportedRenderFeatureError)
    expect(limited.api.createFramebuffer).not.toHaveBeenCalled()
  })

  it('超出设备尺寸时拒绝，不 clamp 逻辑尺寸', () => {
    const f = setup()
    f.parameters.set(f.gl.MAX_RENDERBUFFER_SIZE, 4)

    expect(() => f.manager.get(target())).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })

  it.each(['framebuffer', 'texture', 'renderbuffer'] as const)(
    'create %s 返回 null 时抛创建错误并清理本次对象',
    (kind) => {
      const f = setup()

      if (kind === 'framebuffer') f.api.createFramebuffer.mockReturnValueOnce(null)
      if (kind === 'texture') f.api.createTexture.mockReturnValueOnce(null)
      if (kind === 'renderbuffer') f.api.createRenderbuffer.mockReturnValueOnce(null)

      expect(() => f.manager.get(target())).toThrow(WebGLResourceCreationError)
      expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(kind === 'framebuffer' ? 0 : 1)
      expect(f.api.deleteTexture).toHaveBeenCalledTimes(kind === 'renderbuffer' ? 1 : 0)
    }
  )

  it('第二个 color texture 创建失败时清理此前成功创建的第一个', () => {
    const f = setup(true)
    const oldFbo = f.api.createFramebuffer()
    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, oldFbo)

    const firstColor: WebGLTexture = {}
    f.api.createTexture.mockReturnValueOnce(firstColor).mockReturnValueOnce(null)

    expect(() => f.manager.get(target(2))).toThrow(WebGLResourceCreationError)
    expect(f.api.deleteTexture).toHaveBeenCalledWith(firstColor)
    expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(oldFbo)
    expect(f.deleted).not.toContain(oldFbo)
  })

  it('构建中 lost 不清理旧代对象，也不发布半成品', () => {
    const f = setup()
    f.api.renderbufferStorage.mockImplementationOnce(() => f.setLost(true))

    expect(() => f.manager.get(target())).toThrow(WebGLContextLostError)
    expect(f.deleted).toHaveLength(0)

    f.setLost(false)
    expect(() => f.manager.get(target())).toThrow(WebGLContextLostError)
  })

  it('无 depth 的 NPOT 目标只创建颜色纹理，不分配 renderbuffer', () => {
    const f = setup()
    const cpu = target(1, false)

    cpu.resize(3, 5)
    const gpu = f.manager.get(cpu)

    expect(gpu.depthAttachment).toBe(null)
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_WRAP_S,
      f.gl.CLAMP_TO_EDGE
    )
  })

  it('上传的 GL 错误不是 framebuffer incomplete，并且可以重新创建', () => {
    const f = setup()
    const cpu = target()

    f.api.texImage2D.mockImplementationOnce(() => f.setError(f.gl.OUT_OF_MEMORY))

    expect(() => f.manager.get(cpu)).toThrow(WebGLOperationError)
    expect(() => f.manager.get(cpu)).not.toThrow()
  })

  it.each([
    { kind: 'color', index: -1 },
    { kind: 'color', index: 1 },
    { kind: 'color', index: 0.5 },
    { kind: 'depth', index: 1 },
    { kind: 'stencil', index: 0 }
  ])('拒绝伪造 attachment 地址 %j', (fields) => {
    const f = setup()
    const ref = { target: target(), ...fields } as RenderTargetAttachmentRef

    expect(() => f.manager.resolveAttachment(ref)).toThrow(RenderTargetUnavailableError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })

  it('拒绝不存在的 depth 及无效 target，不把它们解析为默认 framebuffer', () => {
    const f = setup()

    expect(() =>
      f.manager.resolveAttachment({
        target: target(1, false),
        kind: 'depth',
        index: 0
      })
    ).toThrow(RenderTargetUnavailableError)

    expect(() =>
      f.manager.resolveAttachment({
        target: null,
        kind: 'color',
        index: 0
      } as unknown as RenderTargetAttachmentRef)
    ).toThrow(RenderTargetUnavailableError)
  })

  it('当前绑定的旧 FBO 不允许重建，避免删除活动输出', () => {
    const f = setup()
    const cpu = target()
    const old = f.manager.get(cpu)

    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, old.framebuffer)
    cpu.resize(16, 8)

    expect(() => f.manager.get(cpu)).toThrow(RenderTargetUnavailableError)
    expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(old.framebuffer)
    expect(f.deleted).toHaveLength(0)
  })

  it('CPU release 和 Manager dispose 都幂等，dispose 之后退订', () => {
    const f = setup()
    const a = target()
    const b = target()

    f.manager.get(a)
    f.manager.get(b)

    a.dispose()
    expect(() => f.manager.get(a)).toThrow(ResourceDisposedError)

    f.manager.dispose()
    f.manager.dispose()
    b.dispose()

    expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(2)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(2)
    expect(() => f.manager.get(target())).toThrow(WebGLBackendDisposedError)
  })

  it('context loss 不删除旧 handle，恢复后的旧 Manager 仍拒绝 get', () => {
    const f = setup()
    const cpu = target()

    f.manager.get(cpu)
    f.setLost(true)
    f.manager.invalidateForContextLoss()
    f.setLost(false)

    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)

    f.manager.dispose()
    cpu.dispose()

    expect(f.deleted).toHaveLength(0)
  })
})
