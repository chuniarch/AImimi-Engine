import { describe, expect, it, vi } from 'vitest'
import {
  RenderTarget,
  type RenderTargetAttachmentRef,
  type ColorAttachmentSamplerInput
} from '@/rendering/resources/RenderTarget'
import type { WebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
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

/** 明确列出 Manager 消费的能力，缺失扩展使用 null，不用 undefined 蒙混过关。 */
type TargetCapabilities = Pick<
  WebGL1Capabilities,
  'drawBuffers' | 'textureFloat' | 'textureFloatLinear' | 'colorBufferFloat'
>

function setup(mrt = false, overrides: Partial<TargetCapabilities> = {}) {
  const fake = createFakeWebGL1TextureContext()
  const invalidateState = vi.fn(() => undefined)
  const capabilities: TargetCapabilities = {
    drawBuffers: mrt ? fake.mrt : null,
    textureFloat: null,
    textureFloatLinear: null,
    colorBufferFloat: null,
    ...overrides
  }

  return {
    ...fake,
    invalidateState,
    capabilities,
    manager: new WebGL1RenderTargetManager(fake.gl, capabilities, { invalidateState })
  }
}

/** 只提供扩展协议；不让 fake 假装真正实现浮点光栅化或纹理过滤。 */
function setupFloat(overrides: Partial<TargetCapabilities> = {}) {
  return setup(true, {
    textureFloat: {},
    colorBufferFloat: {
      RGBA32F_EXT: 0x8814,
      FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT: 0x8211,
      UNSIGNED_NORMALIZED_EXT: 0x8c17
    },
    ...overrides
  })
}

/** GBuffer 基线输入；每个颜色槽显式 nearest，不借默认 linear 隐藏扩展需求。 */
function floatTarget(
  colors = 4,
  sampler: ColorAttachmentSamplerInput | undefined = {
    minFilter: 'nearest',
    magFilter: 'nearest'
  },
  depth = true
): RenderTarget {
  return new RenderTarget(
    {
      width: 8,
      height: 4,
      colors: Array.from({ length: colors }, () => ({ format: 'rgba32f' as const, sampler })),
      ...(depth ? { depth: { format: 'depth16' as const } } : {})
    },
    { label: 'gbuffer/main' }
  )
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

/**
 * HW1 附件采样入口：地址指向 owner 的槽位，而不是某次分配的 handle。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
 * Given 已写入目标；When 请求采样地址；Then 借到同一颜色纹理。
 * resize 后必须解析当前 revision；旧存储只能保留作清理，不能作为成功结果返回。
 */
describe('WebGL1RenderTargetManager sampled colors', () => {
  /** 同时检查默认和显式配置；避免 Manager 忽略 CPU sampler。 */
  it.each([
    { minFilter: 'linear', magFilter: 'linear', min: 0x2601, mag: 0x2601 },
    { minFilter: 'nearest', magFilter: 'nearest', min: 0x2600, mag: 0x2600 },
    { minFilter: 'nearest', magFilter: 'linear', min: 0x2600, mag: 0x2601 },
    { minFilter: 'linear', magFilter: 'nearest', min: 0x2601, mag: 0x2600 }
  ] as const)('实际应用附件过滤 %j', ({ minFilter, magFilter, min, mag }) => {
    const f = setup()
    const cpu = new RenderTarget(
      {
        width: 3,
        height: 2,
        colors: [{ format: 'rgba8', sampler: { minFilter, magFilter } }]
      },
      { label: 'shadow/packed-depth' }
    )
    const ref = cpu.getColorAttachment(0)
    const handle = f.manager.resolveSampledColor(ref)
    expect(handle).toBe(f.manager.get(cpu).colorTextures[0])
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(f.api.texParameteri).toHaveBeenCalledWith(f.gl.TEXTURE_2D, f.gl.TEXTURE_MIN_FILTER, min)
    expect(f.api.texParameteri).toHaveBeenCalledWith(f.gl.TEXTURE_2D, f.gl.TEXTURE_MAG_FILTER, mag)
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_WRAP_S,
      f.gl.CLAMP_TO_EDGE
    )
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_WRAP_T,
      f.gl.CLAMP_TO_EDGE
    )
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
  })

  /** 未传 sampler 的旧调用者保持 linear；保留既有 MRT 各槽位身份。 */
  it('默认 linear，MRT 采样解析与旧解析 API 借用同一槽位', () => {
    const f = setup(true)
    const cpu = target(2)
    const ref = cpu.getColorAttachment(1)
    const gpu = f.manager.get(cpu)
    expect(f.manager.resolveSampledColor(ref)).toBe(gpu.colorTextures[1])
    expect(f.manager.resolveAttachment(ref)).toBe(gpu.colorTextures[1])
    expect(f.manager.resolveAttachment(cpu.getDepthAttachment()!)).toBe(gpu.depthAttachment)
    expect(f.api.texImage2D).toHaveBeenCalledTimes(2)
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_MIN_FILTER,
      f.gl.LINEAR
    )
    expect(f.api.texParameteri).toHaveBeenCalledWith(
      f.gl.TEXTURE_2D,
      f.gl.TEXTURE_MAG_FILTER,
      f.gl.LINEAR
    )
  })

  /** 合法 depth 地址也不是纹理；在 get 之前拒绝，避免分配根本无法采样的存储。 */
  it('depth16 采样拒绝且零分配，旧 attachment 解析仍支持 renderbuffer', () => {
    const f = setup()
    const cpu = target()
    const ref = cpu.getDepthAttachment()!
    expect(() => f.manager.resolveSampledColor(ref)).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.manager.resolveAttachment(ref)).toBe(f.manager.get(cpu).depthAttachment)
  })

  /**
   * 非法地址不能落到默认 framebuffer 或数组越界。
   * 用对象包装每行输入，避免 it.each 把空数组展开成零个参数。
   */
  it.each(
    [
      null,
      undefined,
      [],
      {},
      { target: null, kind: 'color', index: 0 },
      { kind: 'color', index: -1 },
      { kind: 'color', index: 0.5 },
      { kind: 'color', index: 1 },
      { kind: 'color', index: NaN },
      { kind: 'stencil', index: 0 },
      { kind: 'depth', index: 1 }
    ].map((input) => ({ input }))
  )('拒绝无效采样地址 $input', ({ input }) => {
    const f = setup()
    const cpu = target()
    const ref = input && !Array.isArray(input) ? { target: cpu, ...input } : input
    expect(() =>
      f.manager.resolveSampledColor(ref as unknown as RenderTargetAttachmentRef)
    ).toThrow(RenderTargetUnavailableError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })

  /** 区分已释放 owner、缺少 depth 和不支持深度采样三类原因。 */
  it('拒绝已经释放目标和不存在的深度槽位', () => {
    const f = setup()
    const cpu = target()
    const ref = cpu.getColorAttachment(0)
    cpu.dispose()
    expect(() => f.manager.resolveSampledColor(ref)).toThrow(ResourceDisposedError)
    expect(() =>
      f.manager.resolveSampledColor({
        target: target(1, false),
        kind: 'depth',
        index: 0
      })
    ).toThrow(RenderTargetUnavailableError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })

  /** Given 稳定地址；When resize 的首次分配失败；Then 抛错，重试成功才换 handle。 */
  it('同一地址跨 resize 解析新存储，失败不回退旧尺寸纹理', () => {
    const f = setup()
    const cpu = target()
    const ref = cpu.getColorAttachment(0)
    const old = f.manager.resolveSampledColor(ref)
    cpu.resize(16, 8)
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
    expect(() => f.manager.resolveSampledColor(ref)).toThrow(IncompleteFramebufferError)
    expect(f.deleted).not.toContain(old)
    const next = f.manager.resolveSampledColor(ref)
    expect(next).not.toBe(old)
    expect(next).toBe(f.manager.get(cpu).colorTextures[0])
    expect(f.manager.get(cpu).width).toBe(16)
    expect(f.deleted).toContain(old)
  })
})

/**
 * 浮点目标的可观察 GL 协议与事务边界；不是 GPU 像素正确性测试。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
 * Given 合法 CPU 描述；When Manager 消费；Then 按当前设备能力分配或零分配拒绝。
 * 预期枚举、尺寸和槽位独立写出，防止实现与测试复用同一个错误映射。
 */
describe('WebGL1RenderTargetManager float colors', () => {
  /** 保护 FLOAT 类型、四个独立附件和缓存命中路径，遗漏逐槽分配就会失败。 */
  it('创建四个 RGBA/FLOAT 颜色附件及 depth16，复用同一槽位进行采样', () => {
    const f = setupFloat()
    const cpu = floatTarget()
    const gpu = f.manager.get(cpu)
    expect(f.api.texImage2D.mock.calls).toEqual(
      Array.from({ length: 4 }, () => [0x0de1, 0, 0x1908, 8, 4, 0, 0x1908, 0x1406, null])
    )
    expect(new Set(gpu.colorTextures).size).toBe(4)
    expect(f.drawBuffers.get(gpu.framebuffer)).toEqual([0x8ce0, 0x8ce1, 0x8ce2, 0x8ce3])
    gpu.colorTextures.forEach((texture, index) => {
      expect(f.api.framebufferTexture2D).toHaveBeenCalledWith(
        0x8d40,
        0x8ce0 + index,
        0x0de1,
        texture,
        0
      )
      expect(f.manager.resolveSampledColor(cpu.getColorAttachment(index))).toBe(texture)
      expect(f.manager.resolveAttachment(cpu.getColorAttachment(index))).toBe(texture)
    })
    expect(f.api.renderbufferStorage).toHaveBeenCalledWith(0x8d41, 0x81a5, 8, 4)
    expect(f.api.checkFramebufferStatus).toHaveBeenCalledTimes(1)
    expect(f.manager.get(cpu)).toBe(gpu)
    expect(f.api.createFramebuffer).toHaveBeenCalledTimes(1)
    expect(f.api.createTexture).toHaveBeenCalledTimes(4)
    expect(cpu.sceneReferenceCount).toBe(0)
    f.manager.dispose()
    expect(cpu.disposed).toBe(false)
    cpu.dispose()
  })

  /** 缺上传、可渲染、MRT 或任一上限不足，都不得先分配再补报能力错误。 */
  it.each([
    'textureFloat',
    'colorBufferFloat',
    'drawBuffers',
    'MAX_COLOR_ATTACHMENTS_WEBGL',
    'MAX_DRAW_BUFFERS_WEBGL',
    'MAX_TEXTURE_SIZE',
    'MAX_RENDERBUFFER_SIZE'
  ] as const)('缺少能力或超过 %s 时零分配拒绝', (reason) => {
    const overrides: Partial<TargetCapabilities> =
      reason === 'textureFloat' || reason === 'colorBufferFloat' || reason === 'drawBuffers'
        ? { [reason]: null }
        : {}
    const f = setupFloat(overrides)
    if (reason === 'MAX_COLOR_ATTACHMENTS_WEBGL') f.parameters.set(0x8cdf, 3)
    if (reason === 'MAX_DRAW_BUFFERS_WEBGL') f.parameters.set(0x8824, 3)
    if (reason === 'MAX_TEXTURE_SIZE') f.parameters.set(0x0d33, 4)
    if (reason === 'MAX_RENDERBUFFER_SIZE') f.parameters.set(0x84e8, 4)
    const cpu = floatTarget()
    expect(() => f.manager.get(cpu)).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    expect(cpu.descriptor.width).toBe(8)
    expect(cpu.revision).toBe(0)
    f.manager.dispose()
    cpu.dispose()
  })

  /** 前置检查期间 lost 的优先级高于无效 limit 或缺扩展，不允许分配半成品。 */
  it('查询尺寸时丢失 context，仍报告 lost 而不是能力缺失', () => {
    const f = setupFloat()
    const cpu = floatTarget()
    const getParameter = f.api.getParameter.getMockImplementation()!
    f.api.getParameter.mockImplementation((name) => {
      if (name === f.gl.MAX_TEXTURE_SIZE) {
        f.setLost(true)
        return null
      }
      return getParameter(name)
    })
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    cpu.dispose()
  })

  /** 三种包含 linear 的设置均需要扩展，不能只检查 min 或只检查 mag。 */
  it.each([
    { minFilter: 'nearest', magFilter: 'linear' },
    { minFilter: 'linear', magFilter: 'nearest' },
    { minFilter: 'linear', magFilter: 'linear' },
    {}
  ] as const)('没有 float-linear 时拒绝显式或默认 linear %j', (sampler) => {
    const f = setupFloat()
    const cpu = floatTarget(1, sampler)
    expect(() => f.manager.get(cpu)).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    cpu.dispose()
  })

  /** 有扩展时也必须尊重描述，而不是统一替换为 nearest 或 linear。 */
  it.each([
    { minFilter: 'nearest', magFilter: 'nearest', min: 0x2600, mag: 0x2600 },
    { minFilter: 'nearest', magFilter: 'linear', min: 0x2600, mag: 0x2601 },
    { minFilter: 'linear', magFilter: 'nearest', min: 0x2601, mag: 0x2600 },
    { minFilter: 'linear', magFilter: 'linear', min: 0x2601, mag: 0x2601 }
  ] as const)('支持 float-linear 时保留两种过滤 %j', ({ minFilter, magFilter, min, mag }) => {
    const f = setupFloat({ textureFloatLinear: {} })
    const cpu = floatTarget(1, { minFilter, magFilter })
    f.manager.get(cpu)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2801, min)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2800, mag)
    expect(f.api.texImage2D).toHaveBeenCalledWith(0x0de1, 0, 0x1908, 8, 4, 0, 0x1908, 0x1406, null)
    cpu.dispose()
  })

  /** rgba8 的 linear 不能污染其他 nearest 浮点槽位的能力判断。 */
  it('混合格式分别映射，不把 rgba8 linear 算成 float-linear 需求', () => {
    const f = setupFloat()
    const cpu = new RenderTarget(
      {
        width: 8,
        height: 4,
        colors: [
          { format: 'rgba8' },
          { format: 'rgba32f', sampler: { minFilter: 'nearest', magFilter: 'nearest' } }
        ]
      },
      { label: 'mixed/target' }
    )
    f.manager.get(cpu)
    expect(f.api.texImage2D.mock.calls.map((args) => args[7])).toEqual([0x1401, 0x1406])
    expect(f.api.checkFramebufferStatus).toHaveBeenCalledTimes(1)
    cpu.dispose()
  })

  /** nearest 浮点 NPOT 不要求线性扩展、MRT 或 renderbuffer，且必须保持完整采样条件。 */
  it('单附件 NPOT nearest 可在没有 MRT/float-linear 的设备创建且不生成 mip', () => {
    const f = setupFloat({ drawBuffers: null })
    const cpu = floatTarget(1, { minFilter: 'nearest', magFilter: 'nearest' }, false)
    cpu.resize(3, 5)
    const gpu = f.manager.get(cpu)
    expect([gpu.width, gpu.height, gpu.depthAttachment]).toEqual([3, 5, null])
    expect(f.api.texImage2D).toHaveBeenCalledWith(0x0de1, 0, 0x1908, 3, 5, 0, 0x1908, 0x1406, null)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2801, 0x2600)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2800, 0x2600)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2802, 0x812f)
    expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2803, 0x812f)
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
    cpu.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
   * Given 外部 FBO/RBO/纹理绑定；When 创建成功或某阶段失败；
   * Then 恢复外部状态，失败只清理本事务已经取得的 handle。
   */
  it.each(['success', 'third-null', 'upload-error', 'incomplete'] as const)(
    '%s 路径保持外部绑定且只清理本次半成品',
    (failure) => {
      const f = setupFloat()
      const cpu = floatTarget()
      const externalFbo = f.api.createFramebuffer()
      const externalRbo = f.api.createRenderbuffer()
      const externalTex = f.api.createTexture()
      f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, externalFbo)
      f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, externalRbo)
      f.gl.activeTexture(f.gl.TEXTURE0 + 2)
      f.gl.bindTexture(f.gl.TEXTURE_2D, externalTex)
      f.mrt.drawBuffersWEBGL([0x8ce0])
      const first: WebGLTexture = {}
      const second: WebGLTexture = {}
      if (failure === 'third-null') {
        f.api.createTexture
          .mockReturnValueOnce(first)
          .mockReturnValueOnce(second)
          .mockReturnValueOnce(null)
        expect(() => f.manager.get(cpu)).toThrow(WebGLResourceCreationError)
        expect(f.api.deleteTexture.mock.calls).toEqual([[first], [second]])
      } else if (failure === 'upload-error') {
        f.api.texImage2D.mockImplementationOnce(() => f.setError(f.gl.OUT_OF_MEMORY))
        expect(() => f.manager.get(cpu)).toThrow(WebGLOperationError)
        expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
        expect(f.api.checkFramebufferStatus).not.toHaveBeenCalled()
      } else if (failure === 'incomplete') {
        f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
        let failureValue: unknown
        try {
          f.manager.get(cpu)
        } catch (error) {
          failureValue = error
        }
        expect(failureValue).toBeInstanceOf(IncompleteFramebufferError)
        expect((failureValue as IncompleteFramebufferError).details).toMatchObject({
          status: 0x8cd6,
          targetLabel: 'gbuffer/main (RenderTarget revision 0)'
        })
        expect(f.api.deleteTexture).toHaveBeenCalledTimes(4)
        expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
      } else {
        f.manager.get(cpu)
        expect(f.deleted).toHaveLength(0)
      }
      expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(externalFbo)
      expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(externalRbo)
      expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 2)
      expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_2D)).toBe(externalTex)
      expect(f.drawBuffers.get(externalFbo)).toEqual([0x8ce0])
      for (const handle of [externalFbo, externalRbo, externalTex]) {
        expect(f.deleted).not.toContain(handle)
      }
      expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(failure === 'success' ? 0 : 1)
      // 失败不能缓存半成品；重试必须建立完整目标，而成功路径应命中原缓存。
      const gpu = f.manager.get(cpu)
      expect(f.manager.get(cpu)).toBe(gpu)
      cpu.dispose()
    }
  )

  /** 失败不回退旧尺寸；成功只删除一次旧存储，稳定地址必须解析新 revision。 */
  it('浮点 replacement 失败保留旧对象但不返回旧纹理，成功后才替换并删除', () => {
    const f = setupFloat()
    const cpu = floatTarget()
    const ref = cpu.getColorAttachment(2)
    const old = f.manager.get(cpu)
    cpu.resize(16, 8)
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
    expect(() => f.manager.resolveSampledColor(ref)).toThrow(IncompleteFramebufferError)
    for (const handle of [old.framebuffer, ...old.colorTextures, old.depthAttachment]) {
      expect(f.deleted).not.toContain(handle)
    }
    const nextHandle = f.manager.resolveSampledColor(ref)
    const next = f.manager.get(cpu)
    expect([next.width, next.height, next.revision]).toEqual([16, 8, 1])
    expect(nextHandle).toBe(next.colorTextures[2])
    expect(nextHandle).not.toBe(old.colorTextures[2])
    for (const handle of [old.framebuffer, ...old.colorTextures, old.depthAttachment]) {
      expect(f.deleted.filter((deleted) => deleted === handle)).toHaveLength(1)
    }
    cpu.dispose()
  })

  /** label 不参与缓存；不同 context 的 Manager 也不能共享 GPU handle 或清理责任。 */
  it('同名浮点目标与同一目标的跨 context 表示分别独立', () => {
    const a = setupFloat()
    const b = setupFloat()
    const first = floatTarget()
    const second = floatTarget()
    const firstA = a.manager.get(first)
    const secondA = a.manager.get(second)
    const firstB = b.manager.get(first)
    expect(firstA.framebuffer).not.toBe(secondA.framebuffer)
    expect(firstA.colorTextures[0]).not.toBe(firstB.colorTextures[0])
    a.manager.release(first)
    expect(a.deleted).toContain(firstA.framebuffer)
    expect(a.deleted).not.toContain(secondA.framebuffer)
    expect(b.deleted).toHaveLength(0)
    expect(b.manager.get(first)).toBe(firstB)
    first.dispose()
    first.dispose()
    expect(b.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    a.manager.dispose()
    a.manager.dispose()
    expect(second.disposed).toBe(false)
    second.dispose()
    expect(a.api.deleteFramebuffer).toHaveBeenCalledTimes(2)
  })

  /** Lost 不正常删除旧代对象；实际能力重新探测由 Capabilities 测试单独保护。 */
  it('浮点重建中 lost 后旧 Manager 不复活，新 Manager 可按新能力重新创建', () => {
    const f = setupFloat()
    const cpu = floatTarget()
    const old = f.manager.get(cpu)
    cpu.resize(16, 8)
    f.api.texImage2D.mockImplementationOnce(() => f.setLost(true))
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    expect(f.deleted).toHaveLength(0)
    f.setLost(false)
    expect(() => f.manager.get(cpu)).toThrow(WebGLContextLostError)
    const restored = new WebGL1RenderTargetManager(
      f.gl,
      {
        ...f.capabilities,
        colorBufferFloat: {
          RGBA32F_EXT: 0x8814,
          FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT: 0x8211,
          UNSIGNED_NORMALIZED_EXT: 0x8c17
        }
      },
      { invalidateState: f.invalidateState }
    )
    const fresh = restored.get(cpu)
    expect(fresh.framebuffer).not.toBe(old.framebuffer)
    expect([fresh.width, fresh.height, fresh.revision]).toEqual([16, 8, 1])
    expect(f.deleted).toHaveLength(0)
    f.manager.dispose()
    restored.dispose()
    cpu.dispose()
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[fresh.framebuffer]])
    for (const texture of old.colorTextures) expect(f.deleted).not.toContain(texture)
  })
})
