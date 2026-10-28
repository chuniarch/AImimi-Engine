import { describe, expect, it, onTestFinished } from 'vitest'

import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { Resource } from '@/rendering/core/Resource'
import { RenderTargetUnavailableError, ResourceDisposedError } from '@/rendering/core/errors'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { RenderTarget, type ColorAttachmentFilter } from '@/rendering/resources/RenderTarget'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { DataTexture2D, ImageTexture2D } from '@/rendering/resources/Texture2D'
import type { Texture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** 顺序固定为左下、右下、左上、右上；期望值手工给定，不从 shader 计算。 */
const FOUR_COLORS = [
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255],
  [255, 255, 255, 255]
] as const

/** 第二次生产时交换 R/B，以发现错误沿用旧纹理或旧内容的问题。 */
const SWAPPED_COLORS = [
  [0, 0, 255, 255],
  [0, 255, 0, 255],
  [255, 0, 0, 255],
  [255, 255, 255, 255]
] as const

/** 全屏大三角形；UV 在可见区域为 [0, 1]，没有四边形中间的接缝。 */
const VERTEX_SOURCE = `
  attribute vec3 position;
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position, 1.0);
  }
`

/** 使用真实 fragment draw 写入四格，不用 clear 或 CPU 上传替代附件生产者。 */
const PRODUCER_SOURCE = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uSwap;
  void main() {
    vec2 side = step(vec2(0.5), vUv);
    vec3 bottom = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), side.x);
    vec3 top = mix(vec3(0.0, 0.0, 1.0), vec3(1.0), side.x);
    vec3 color = mix(bottom, top, side.y);
    gl_FragColor = vec4(mix(color, color.bgr, uSwap), 1.0);
  }
`

/** sampler2D 必须参与输出，防止被编译器优化掉后绕过采样路径。 */
const CONSUMER_SOURCE = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  void main() {
    gl_FragColor = texture2D(uMap, vUv);
  }
`

/** 固定 UV 让 nearest/linear 的差异可用手算数值验证，不依赖肉眼。 */
const FILTER_SOURCE = `
  precision mediump float;
  uniform sampler2D uMap;
  void main() {
    gl_FragColor = texture2D(uMap, vec2(0.375, 0.375));
  }
`

/** 在同步 scope 内读取，避免默认 framebuffer 的内容跨帧被浏览器丢弃。 */
function readPixel(gl: WebGLRenderingContext, x: number, y: number): number[] {
  const pixel = new Uint8Array(4)
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return Array.from(pixel)
}

/** 验证 32×32 消费结果的四个内点；角落颜色、方向、alpha 都不可省略。 */
function expectScreenPattern(
  gl: WebGLRenderingContext,
  colors: readonly (readonly number[])[] = FOUR_COLORS
): void {
  expect(readPixel(gl, 4, 4)).toEqual(colors[0])
  expect(readPixel(gl, 28, 4)).toEqual(colors[1])
  expect(readPixel(gl, 4, 28)).toEqual(colors[2])
  expect(readPixel(gl, 28, 28)).toEqual(colors[3])
  expect(gl.getError()).toBe(gl.NO_ERROR)
}

/**
 * 建立真实 Backend/CPU 资源，不替换 GL 方法，不直接调用 Manager 绕过接线。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-texture-sampling-real-pixels]
 * helper 只负责 Arrange；所有纹理消费都必须经过 backend.draw()。
 * 本测试在组 C 之前应因 sampler2D 尚未接通而 RED，而不是把拒绝采样当成成功。
 * 清理属于测试自身：先结束 Backend，再释放借用的 CPU 资源，最后释放测试 context。
 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const backend = new WebGL1Backend(canvas, 'test/texture-sampling', { antialias: false })
  const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL1 is required'))
  const resources: Resource[] = []

  onTestFinished(() => {
    try {
      backend.dispose()
    } finally {
      for (const resource of resources) resource.dispose()
      // 无须再次恢复这个已结束的测试 context，避免多用例累积触及浏览器上限。
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  })

  /** 记录测试的显式 CPU 所有权；不是 Scene 引用计数，也不由 Material 接管。 */
  function own<T extends Resource>(resource: T): T {
    resources.push(resource)
    return resource
  }

  const geometry = own(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
          itemSize: 3
        })
      }
    })
  )

  /** 每个材质借用一个真实 GLSL ES 1.00 shader；深度和剔除不干扰全屏像素。 */
  function material(fragmentSource: string): Material {
    const shader = own(
      new ShaderModule({
        name: 'test/texture-sampling/shader',
        language: 'glsl-es-100',
        vertexSource: VERTEX_SOURCE,
        fragmentSource
      })
    )
    return own(
      new Material({
        shaderModule: shader,
        state: { depthTest: false, depthWrite: false, cullMode: 'none' }
      })
    )
  }

  const producer = material(PRODUCER_SOURCE)
  producer.setParameter('uSwap', { type: 'float', value: 0 })

  /** 只准备 CPU DrawSubmission；GPU program、纹理和 buffer 由 Backend 获取。 */
  function submission(drawMaterial: Material): DrawSubmission {
    return {
      item: { geometry, material: drawMaterial, worldMatrix: IDENTITY, castShadow: false },
      view: {
        viewMatrix: IDENTITY,
        projectionMatrix: IDENTITY,
        cameraWorldPosition: [0, 0, 0]
      }
    }
  }

  /** 输出初始 2×2 颜色存储；后续 resize 不替换这个逻辑目标的身份。 */
  function target(filter: ColorAttachmentFilter = 'nearest'): RenderTarget {
    return own(
      new RenderTarget(
        {
          width: 2,
          height: 2,
          colors: [{ format: 'rgba8', sampler: { minFilter: filter, magFilter: filter } }]
        },
        { label: 'test/texture-sampling/target' }
      )
    )
  }

  /** 写入目标；不在函数内采样，便于单独证明生产端已经正常。 */
  function produce(output: RenderTarget, swap = false): void {
    producer.setParameter('uSwap', { type: 'float', value: swap ? 1 : 0 })
    backend.withRenderSurface(
      { surface: { kind: 'render-target', target: output }, clear: { color: [0, 0, 0, 1] } },
      () => {
        backend.draw(submission(producer))
      }
    )
  }

  /** Material 只借用 source；尤其不把附件读回为一份 DataTexture2D。 */
  function consumer(source: Texture2DSamplingSource, fixedUv = false): Material {
    const result = material(fixedUv ? FILTER_SOURCE : CONSUMER_SOURCE)
    result.setParameter('uMap', { type: 'texture2D', value: source })
    return result
  }

  /** 读回必须在 callback 内完成；scope 退出后只验证绑定恢复，不依赖屏幕旧像素。 */
  function consume(drawMaterial: Material, check: () => void): void {
    backend.withRenderSurface(
      { surface: { kind: 'default-framebuffer' }, clear: { color: [0, 0, 0, 1] } },
      () => {
        backend.draw(submission(drawMaterial))
        check()
      }
    )
  }

  return { canvas, gl, backend, own, target, producer, submission, produce, consumer, consume }
}

/**
 * 在 Backend scope 外建立独立的完整 FBO 和非整屏 viewport。
 *
 * @remarks
 * 这是外部状态夹具，不是生产者或消费者。被测代码必须恢复它，而非硬编码恢复 null。
 * 清理也在 scope 外完成，不删除退出 scope 时仍需恢复的 framebuffer。
 */
function externalSurface(gl: WebGLRenderingContext) {
  const texture = requireNonNull(gl.createTexture(), () => new Error('External texture failed'))
  const framebuffer = requireNonNull(gl.createFramebuffer(), () => new Error('External FBO failed'))
  onTestFinished(() => {
    if (!gl.isContextLost()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
    }
  })
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  expect(gl.checkFramebufferStatus(gl.FRAMEBUFFER)).toBe(gl.FRAMEBUFFER_COMPLETE)
  gl.viewport(2, 3, 11, 13)

  return {
    /** 正常和异常路径使用相同断言，错误不能把恢复义务悄悄取消。 */
    expectRestored(): void {
      expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(framebuffer)
      expect(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)).toEqual([2, 3, 11, 13])
      expect(gl.getError()).toBe(gl.NO_ERROR)
    }
  }
}

/**
 * 每行两个 RGBA 像素，第一行是红/绿，第二行是蓝/白。
 * TypedArray 无上下方向元数据；上传的第一行对应 texture v=0 一侧。
 */
function pixelBytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255])
}

/** 测试内构造 PNG，不依赖网络；图片左上为红色，禁用 flip 后显示在屏幕左下。 */
async function decodedImage(): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = requireNonNull(canvas.getContext('2d'), () => new Error('Canvas2D is required'))
  context.putImageData(new ImageData(new Uint8ClampedArray(pixelBytes()), 2, 2), 0, 0)
  const image = new Image()
  image.src = canvas.toDataURL('image/png')
  await image.decode()
  return image
}

/** 先注册 listener 再触发事件；超时明确失败，并移除 listener，不静默 skip。 */
function triggerAndWait(target: EventTarget, type: string, trigger: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      target.removeEventListener(type, listener)
    }
    const listener = () => {
      cleanup()
      resolve()
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for ' + type))
    }, 5000)
    target.addEventListener(type, listener, { once: true })
    try {
      trigger()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

describe('WebGL1 texture sampling real GPU', () => {
  /** Given 真实目标；When producer draw；Then 四个 texel 正确，隔离生产端与采样端故障。 */
  it('生产者实际写入 2×2 四色附件', () => {
    const f = fixture()
    const output = f.target()
    f.produce(output)
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: output } }, () => {
      expect(readPixel(f.gl, 0, 0)).toEqual(FOUR_COLORS[0])
      expect(readPixel(f.gl, 1, 0)).toEqual(FOUR_COLORS[1])
      expect(readPixel(f.gl, 0, 1)).toEqual(FOUR_COLORS[2])
      expect(readPixel(f.gl, 1, 1)).toEqual(FOUR_COLORS[3])
      expect(f.gl.getError()).toBe(f.gl.NO_ERROR)
    })
  })

  /**
   * Given 外部 FBO/viewport 与新目标；When 生产后采样；Then 颜色、朝向与外部状态正确。
   * 漏接 resolver、绑定错误附件、错误翻转或硬编码恢复屏幕，都不能通过这个测试。
   */
  it('附件采样到 32×32 屏幕，正常结束恢复外部 FBO 和 viewport', () => {
    const f = fixture()
    const external = externalSurface(f.gl)
    const output = f.target()
    f.produce(output)
    external.expectRestored()
    f.consume(f.consumer(output.getColorAttachment(0)), () => expectScreenPattern(f.gl))
    external.expectRestored()
  })

  /**
   * Given 2×2 四色图；When 在 (0.375,0.375) 采样；Then 验证独立手算的值。
   * linear 的四个权重为 9/16、3/16、3/16、1/16，RGB≈(159,64,64)。
   * 允许 ±2 的设备舍入差，不允许把 LINEAR 与 NEAREST 都映射为同一种过滤。
   */
  it.each([
    { filter: 'nearest' as const, expected: [255, 0, 0, 255], tolerance: 0 },
    { filter: 'linear' as const, expected: [159, 64, 64, 255], tolerance: 2 }
  ])('附件 $filter 过滤得到约定像素', ({ filter, expected, tolerance }) => {
    const f = fixture()
    const output = f.target(filter)
    f.produce(output)
    f.consume(f.consumer(output.getColorAttachment(0), true), () => {
      const actual = readPixel(f.gl, 16, 16)
      for (let channel = 0; channel < 3; channel++) {
        expect(Math.abs(actual[channel]! - expected[channel]!)).toBeLessThanOrEqual(tolerance)
      }
      expect(actual[3]).toBe(255)
      expect(f.gl.getError()).toBe(f.gl.NO_ERROR)
    })
  })

  /** Given CPU 像素数组；When 同一来源重复 draw；Then 两次真实采样都保留四格颜色。 */
  it('DataTexture2D 经 Backend 上传并重复采样', () => {
    const f = fixture()
    const texture = f.own(
      new DataTexture2D({
        label: 'test/data-2d',
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data',
        sampler: { minFilter: 'nearest', magFilter: 'nearest' },
        source: { width: 2, height: 2, data: pixelBytes() }
      })
    )
    const consumer = f.consumer(texture)
    f.consume(consumer, () => expectScreenPattern(f.gl))
    f.consume(consumer, () => expectScreenPattern(f.gl))
  })

  /** Given 已解码 PNG；When 上传不翻转；Then 图片首行红/绿对应 texture 的 v=0 一侧。 */
  it('HTMLImageElement 的真实颜色与无翻转方向正确', async () => {
    const f = fixture()
    const texture = f.own(
      new ImageTexture2D({
        label: 'test/image-2d',
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'linear',
        sampler: { minFilter: 'nearest', magFilter: 'nearest' },
        source: await decodedImage()
      })
    )
    f.consume(f.consumer(texture), () => expectScreenPattern(f.gl))
  })

  /**
   * Given 明确无翻转/无预乘/无颜色转换的 Bitmap；When 采样并结束 Backend；
   * Then 像素正确，Bitmap 仍可实际复制使用，最终只由测试这个所有者 close。
   */
  it('ImageBitmap 方向正确，Backend 释放不关闭借用来源', async () => {
    const f = fixture()
    const bitmap = await createImageBitmap(
      new ImageData(new Uint8ClampedArray(pixelBytes()), 2, 2),
      {
        imageOrientation: 'none',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
      }
    )
    try {
      const texture = f.own(
        new ImageTexture2D({
          label: 'test/bitmap-2d',
          storage: { format: 'rgba', type: 'uint8' },
          colorSpace: 'linear',
          sampler: { minFilter: 'nearest', magFilter: 'nearest' },
          source: bitmap
        })
      )
      f.consume(f.consumer(texture), () => expectScreenPattern(f.gl))
      f.backend.dispose()
      expect(texture.disposed).toBe(false)
      const copy = await createImageBitmap(bitmap)
      try {
        expect([copy.width, copy.height]).toEqual([2, 2])
      } finally {
        copy.close()
      }
    } finally {
      bitmap.close()
    }
  })

  /**
   * [DESIGN-WEIGHT:3][attachment-content-rebuild]
   * Given 同一逻辑附件与材质；When resize 后重新画交换 R/B 的图；Then 读取新内容。
   * 不调用 consumer.setParameter，不重新获取 ref，防止“调用者重绑”掩盖旧 handle 缓存。
   */
  it('同一逻辑引用跨 resize 后采样重新生产的新内容', () => {
    const f = fixture()
    const output = f.target()
    const consumer = f.consumer(output.getColorAttachment(0))
    f.produce(output)
    f.consume(consumer, () => expectScreenPattern(f.gl))
    output.resize(4, 4)
    f.produce(output, true)
    f.consume(consumer, () => expectScreenPattern(f.gl, SWAPPED_COLORS))
  })

  /**
   * [DESIGN-WEIGHT:3][test-context-restore-event-boundary]
   * Given 已写入的旧代目标；When 真正 lost/restore，再由生产者重画；Then 旧 ref 读新图。
   * await lost 只代表 listener 已执行；下一任务才请求 restore，避免事件派发中恢复。
   * 缺扩展或超过 5 秒未恢复必须失败；不能 skip 后宣称已验收。
   */
  it('真实 context 恢复后重画附件，旧逻辑引用读取新代内容', async () => {
    const f = fixture()
    const extension = requireNonNull(
      f.gl.getExtension('WEBGL_lose_context'),
      () => new Error('This acceptance test requires WEBGL_lose_context')
    )
    const output = f.target()
    const consumer = f.consumer(output.getColorAttachment(0))
    f.produce(output)
    await triggerAndWait(f.canvas, 'webglcontextlost', () => extension.loseContext())
    expect(f.backend.ready).toBe(false)
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    await triggerAndWait(f.canvas, 'webglcontextrestored', () => extension.restoreContext())
    expect(f.backend.ready).toBe(true)
    expect(f.backend.lastFailure).toBeNull()
    f.produce(output, true)
    f.consume(consumer, () => expectScreenPattern(f.gl, SWAPPED_COLORS))
  }, 15000)

  /**
   * [DESIGN-WEIGHT:3][surface-texture-feedback]
   * Given 外层 A 已有图；When 内层 B 读 A；Then 合法，且内层结束后 A 内容未被重清。
   * 把所有祖先都当成“当前输出”的错误实现会误拒绝这个例子。
   */
  it('外层 A 暂停时内层 B 可以采样 A，并恢复外层及外部状态', () => {
    const f = fixture()
    const external = externalSurface(f.gl)
    const a = f.target()
    const b = f.target()
    const readA = f.consumer(a.getColorAttachment(0))
    f.produce(a)
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
      const outerFramebuffer: unknown = f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: b } }, () => {
        f.backend.draw(f.submission(readA))
        expect(readPixel(f.gl, 0, 0)).toEqual(FOUR_COLORS[0])
        expect(readPixel(f.gl, 1, 1)).toEqual(FOUR_COLORS[3])
      })
      expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(outerFramebuffer)
      expect(Array.from(f.gl.getParameter(f.gl.VIEWPORT) as Int32Array)).toEqual([0, 0, 2, 2])
      expect(readPixel(f.gl, 0, 0)).toEqual(FOUR_COLORS[0])
      // 回到外层后，读 A 再次变成读写冲突，不可继续沿用内层的许可。
      expect(() => f.backend.draw(f.submission(readA))).toThrow(RenderTargetUnavailableError)
      expect(f.gl.getError()).toBe(f.gl.NO_ERROR)
    })
    external.expectRestored()
    f.consume(f.consumer(b.getColorAttachment(0)), () => expectScreenPattern(f.gl))
    external.expectRestored()
  })

  /** Given 正在写 A；When 材质同时读 A；Then 抛领域错误、无 GL error、外部状态恢复。 */
  it('反馈环在 draw 前拒绝，异常退出仍恢复外部 FBO 和 viewport', () => {
    const f = fixture()
    const external = externalSurface(f.gl)
    const a = f.target()
    f.produce(a)
    const consumer = f.consumer(a.getColorAttachment(0))
    expect(() =>
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
        f.backend.draw(f.submission(consumer))
      })
    ).toThrow(RenderTargetUnavailableError)
    external.expectRestored()
  })

  /** Given 已保存合法来源的 Material；When 目标随后释放；Then 不采样旧 handle 或静默黑图。 */
  it('来源目标释放后 draw 明确失败，并恢复外部 FBO 和 viewport', () => {
    const f = fixture()
    const external = externalSurface(f.gl)
    const output = f.target()
    const consumer = f.consumer(output.getColorAttachment(0))
    f.produce(output)
    output.dispose()
    expect(() => f.consume(consumer, () => expectScreenPattern(f.gl))).toThrow(
      ResourceDisposedError
    )
    external.expectRestored()
  })
})
