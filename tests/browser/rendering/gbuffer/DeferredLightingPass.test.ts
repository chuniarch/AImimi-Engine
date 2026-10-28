import { describe, expect, it, onTestFinished } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { Resource } from '@/rendering/core/Resource'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { createDirectionalLightSnapshot } from '@/rendering/frame/createDirectionalLightSnapshot'
import { RenderList } from '@/rendering/frame/RenderList'
import {
  createGBufferMaterial,
  createGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { DeferredLightingPass } from '@/rendering/passes/DeferredLightingPass'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { Geometry } from '@/rendering/resources/Geometry'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'

/**
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-lambert-display-encoding]
 * 使用正式 GBuffer、Lighting、Backend 和真实 GPU；从最终默认 framebuffer 读 rgba8。
 * 缺扩展必须失败，不能将跳过像素断言报告为 GPU 通过。
 * M 非均匀缩放、V 旋转并平移，正面方向独立手算为 (-6/7,3/7,2/7)。
 */
function fixture(color = [0.25, 0.5, 0.75], srgb = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const backend = new WebGL1Backend(canvas, 'test/deferred', { antialias: false })
  const gl = canvas.getContext('webgl')!
  const resources: Resource[] = []
  const pipeline = new RenderPipeline()
  onTestFinished(() => {
    try {
      pipeline.dispose()
      for (const resource of resources.reverse()) resource.dispose()
    } finally {
      backend.dispose()
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  })
  for (const name of ['WEBGL_draw_buffers', 'OES_texture_float', 'WEBGL_color_buffer_float']) {
    if (gl.getExtension(name) === null) throw new Error('GPU verification requires ' + name)
  }
  if (srgb && gl.getExtension('EXT_sRGB') === null)
    throw new Error('GPU verification requires EXT_sRGB')
  function own<T extends Resource>(resource: T): T {
    resources.push(resource)
    return resource
  }
  const shader = own(createGBufferShaderModule())
  const producer = new GBufferPass({ shaderModule: shader, label: 'test/deferred/gbuffer' })
  pipeline.addPass(producer)
  pipeline.addPass(new DeferredLightingPass(producer))
  const texture = own(
    new DataTexture2D({
      label: 'test/deferred/color',
      storage: { format: 'rgba', type: srgb ? 'uint8' : 'float32' },
      colorSpace: srgb ? 'srgb' : 'linear',
      sampler: { minFilter: 'nearest', magFilter: 'nearest' },
      source: {
        width: 1,
        height: 1,
        data: srgb ? new Uint8Array([...color, 255]) : new Float32Array([...color, 1])
      }
    })
  )
  const material = own(createGBufferMaterial(shader, texture))
  const geometry = own(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-20, -20, 0, 20, -20, 0, 0, 20, 0]),
          itemSize: 3
        }),
        normal: new VertexAttribute({
          data: new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]),
          itemSize: 3
        }),
        uv: new VertexAttribute({ data: new Float32Array([0, 0, 1, 0, 0.5, 1]), itemSize: 2 })
      }
    })
  )
  const worldMatrix: Mat4Tuple = [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 0, -5, 1]
  const view = {
    viewMatrix: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, -2, 1, 0, 1] as Mat4Tuple,
    projectionMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.1, 0, 2, -1, 0, 1] as Mat4Tuple,
    cameraWorldPosition: [-1, -2, 0] as const
  }
  const light = new DirectionalLight({ targetWorld: [0, 0, 0], intensity: Math.PI })
  light.transform.setPosition([3, 6, 2])
  let frameNumber = 0

  /** 每次新建 context；同一同步调用栈内读回，避免默认 framebuffer 被浏览器丢弃。 */
  function render(visible = true, lit = true): Uint8Array {
    const context: RenderPassContext = {
      backend,
      view,
      lights: lit ? [createDirectionalLightSnapshot(light, view)] : [],
      frame: {
        frameNumber: ++frameNumber,
        timeSeconds: 0,
        deltaSeconds: 0,
        drawingBufferWidth: gl.drawingBufferWidth,
        drawingBufferHeight: gl.drawingBufferHeight,
        pixelRatio: 1
      },
      renderList: new RenderList(
        [],
        visible ? [{ geometry, material, worldMatrix, castShadow: false }] : []
      )
    }
    pipeline.execute(context)
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    )
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return pixels
  }
  return { render, backend, producer, light }
}

/** 期望值是独立给出的 8 位显示值；只允许最终量化的 1 档误差。 */
function expectPixels(pixels: Uint8Array, rgb: readonly [number, number, number]): void {
  expect(pixels.length).toBeGreaterThan(0)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    for (let channel = 0; channel < 3; channel++) {
      expect(Math.abs(pixels[offset + channel]! - rgb[channel]!)).toBeLessThanOrEqual(1)
    }
    expect(pixels[offset + 3]).toBe(255)
  }
}

describe('DeferredLightingPass real GPU', () => {
  /** PI 抵消 Lambert 分母；.25/.5/.75 精确 sRGB 编码后约为 137/188/225。 */
  it('旋转相机与非均匀缩放下，正面 Lambert 输出正确显示颜色', () => {
    expectPixels(fixture().render(), [137, 188, 225])
  })

  /** 将 to-light 取反必须变黑。 */
  it('背面光不贡献直接光', () => {
    const f = fixture()
    f.light.transform.setPosition([-3, -6, -2])
    expectPixels(f.render(), [0, 0, 0])
  })

  /** 三个通道分别相乘，不能把彩色灯简化成单个亮度。 */
  it('线性色光逐通道参与 Lambert', () => {
    const f = fixture()
    f.light.setColorLinear([1, 0.5, 0])
    expectPixels(f.render(), [137, 137, 0])
  })

  /**
   * 同一 Pass 连续改方向，不能只在首次 draw 上传 uniform。
   * world 法线为 (3,6,2)/7，world +Z 入射时 cosine=2/7；独立期望为 76/106/128。
   * 中间斜光还验证余弦衰减，而不只检查正面 1 和背面 0。
   */
  it('同一 Pass 的方向每帧更新，斜光按余弦衰减', () => {
    const f = fixture()
    expectPixels(f.render(), [137, 188, 225])
    f.light.transform.setPosition([0, 0, 1])
    expectPixels(f.render(), [76, 106, 128])
    f.light.transform.setPosition([-3, -6, -2])
    expectPixels(f.render(), [0, 0, 0])
  })

  /** 非零 radiance 之间的变化也必须重新上传；不能只特殊处理零灯光。 */
  it('同一 Pass 的色光与非零强度每帧更新', () => {
    const f = fixture()
    expectPixels(f.render(), [137, 188, 225])
    f.light.setColorLinear([1, 0.5, 0])
    expectPixels(f.render(), [137, 137, 0])
    f.light.setIntensity(Math.PI / 2)
    expectPixels(f.render(), [99, 99, 0])
  })

  /** 暗部必须使用分段 sRGB 的线性段；pow(x,1/2.2) 将明显偏亮。 */
  it('暗部使用精确分段显示编码', () => {
    expectPixels(fixture([0.001, 0.003, 0.004]).render(), [3, 10, 13])
  })

  /** 上传时解码一次，显示时编码一次；重复解码会破坏原始字节。 */
  it('sRGB 基础纹理不重复解码', () => {
    expectPixels(fixture([128, 64, 32], true).render(), [128, 64, 32])
  })

  /** 显式截断不是 tone mapping；负值也不能进入 pow。 */
  it('显示前明确 clamp 到零与一', () => {
    expectPixels(fixture([2, -1, 0.25]).render(), [255, 0, 137])
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-validity-before-lighting]
   * 先画亮表面再清空队列；alpha=0 的新像素必须输出黑色而不是旧画面。
   */
  it('空场景清除旧画面并输出黑背景', () => {
    const f = fixture()
    expectPixels(f.render(), [137, 188, 225])
    expectPixels(f.render(false), [0, 0, 0])
  })

  /** 光源删除和强度归零是不同输入，两者都不能残留上一帧亮度。 */
  it.each(['removed', 'zero-intensity'] as const)('%s 后没有旧光照残留', (mode) => {
    const f = fixture()
    expectPixels(f.render(), [137, 188, 225])
    if (mode === 'zero-intensity') f.light.setIntensity(0)
    expectPixels(f.render(true, mode !== 'removed'), [0, 0, 0])
  })

  /** resize 后采样当前附件，且全屏三角形覆盖新的非正方形输出。 */
  it('resize 后重画并采样新存储', () => {
    const f = fixture()
    expectPixels(f.render(), [137, 188, 225])
    const revision = f.producer.target.revision
    f.backend.resizeDrawingBuffer(3, 2, 1)
    const pixels = f.render()
    expect(pixels).toHaveLength(3 * 2 * 4)
    expect(f.producer.target.revision).toBe(revision + 1)
    expectPixels(pixels, [137, 188, 225])
  })
})
