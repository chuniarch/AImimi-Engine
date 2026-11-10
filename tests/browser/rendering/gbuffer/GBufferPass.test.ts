import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { RenderTargetUnavailableError } from '@/rendering/core/errors'
import { Resource } from '@/rendering/core/Resource'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { RenderList } from '@/rendering/frame/RenderList'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import {
  createGBufferMaterial,
  createGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
 * 真实 WebGL1 Backend 创建四个 float 附件；测试只在另一个 rgba8 目标读回比较结果。
 * 缺扩展明确失败，不能把没有执行像素检查的环境报告为 GPU 通过。
 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const backend = new WebGL1Backend(canvas, 'test/gbuffer', { antialias: false })
  const gl = canvas.getContext('webgl')!
  const owned: Resource[] = []
  const lifecycle: { pass?: GBufferPass } = {}
  onTestFinished(() => {
    try {
      backend.dispose()
      lifecycle.pass?.dispose()
    } finally {
      for (const resource of owned.reverse()) resource.dispose()
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  })
  for (const name of ['WEBGL_draw_buffers', 'OES_texture_float', 'WEBGL_color_buffer_float']) {
    if (gl.getExtension(name) === null) throw new Error('GPU verification requires ' + name)
  }

  function own<T extends Resource>(resource: T): T {
    owned.push(resource)
    return resource
  }
  const shader = own(createGBufferShaderModule())
  const producer = new GBufferPass({ shaderModule: shader, label: 'test/gbuffer/producer' })
  lifecycle.pass = producer
  const geometry = own(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-2, -2, 0, 2, -2, 0, 0, 2, 0]),
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
  const quad = own(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
          itemSize: 3
        })
      }
    })
  )
  const result = own(
    new RenderTargetBundle({
      width: 1,
      height: 1,
      label: 'test/gbuffer/comparison',
      colors: [{ storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }]
    })
  ).target
  const checker = own(
    new Material({
      shaderModule: own(
        new ShaderModule({
          name: 'test/gbuffer/compare-four-slots',
          language: 'glsl-es-100',
          vertexSource: 'attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}',
          fragmentSource: `
        precision highp float;
        uniform sampler2D uColor;
        uniform sampler2D uDepth;
        uniform sampler2D uNormal;
        uniform sampler2D uPosition;
        uniform vec4 uExpectedColor;
        uniform vec4 uExpectedDepth;
        uniform vec4 uExpectedNormal;
        uniform vec4 uExpectedPosition;
        bool nearValue(vec4 a, vec4 b) { return all(lessThan(abs(a-b),vec4(0.0001))); }
        void main(){
          bool ok = nearValue(texture2D(uColor,vec2(0.5)),uExpectedColor)
            && nearValue(texture2D(uDepth,vec2(0.5)),uExpectedDepth)
            && nearValue(texture2D(uNormal,vec2(0.5)),uExpectedNormal)
            && nearValue(texture2D(uPosition,vec2(0.5)),uExpectedPosition);
          gl_FragColor=vec4(vec3(ok ? 1.0 : 0.0),1.0);
        }
      `
        })
      ),
      state: { depthTest: false, depthWrite: false, cullMode: 'none', dither: false }
    })
  )

  /** 一像素常量色只服务 fixture；色彩解码仍由正式纹理 Manager 完成。 */
  function material(data = new Float32Array([0.25, 0.5, 0.75, 1]), srgb?: Uint8Array): Material {
    const texture = own(
      new DataTexture2D({
        label: 'test/gbuffer/color',
        storage: { format: 'rgba', type: srgb === undefined ? 'float32' : 'uint8' },
        colorSpace: srgb === undefined ? 'linear' : 'srgb',
        sampler: { minFilter: 'nearest', magFilter: 'nearest' },
        source: { width: 1, height: 1, data: srgb ?? data }
      })
    )
    return own(createGBufferMaterial(shader, texture))
  }

  /** M 非均匀缩放；V 绕 Z 旋转 90° 再平移；P 抵消 xy 平移使中心像素容易手算。 */
  function item(value: Material, z = -5): RenderItem {
    return {
      geometry,
      material: value,
      castShadow: false,
      worldMatrix: [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 0, z, 1]
    }
  }
  function context(items: RenderItem[], width = 1, height = 1): RenderPassContext {
    return {
      backend,
      frame: {
        frameNumber: 1,
        timeSeconds: 0,
        deltaSeconds: 0,
        drawingBufferWidth: width,
        drawingBufferHeight: height,
        pixelRatio: 1
      },
      view: {
        viewMatrix: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, -2, 1, 0, 1],
        projectionMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.1, 0, 2, -1, 0, 1],
        cameraWorldPosition: [-1, -2, 0]
      },
      renderList: new RenderList([], items),
      lights: Object.freeze([])
    }
  }

  /**
   * 各附件使用独立 sampler/独立期望；全部误绑到槽位0不能通过。
   * 源值由调用者手算提供，不调用生产代码来生成期望。
   */
  function expectOutput(
    context: RenderPassContext,
    values: readonly (readonly [number, number, number, number])[]
  ): void {
    const output = producer.getOutput(context)
    const names = ['Color', 'Depth', 'Normal', 'Position'] as const
    const refs = [output.baseColorLinear, output.viewDepth, output.normalView, output.positionView]
    for (let i = 0; i < names.length; i++) {
      checker.setParameter('u' + names[i], { type: 'texture2D', value: refs[i]! })
      checker.setParameter('uExpected' + names[i], { type: 'vec4', value: values[i]! })
    }
    backend.withRenderSurface({ surface: { kind: 'render-target', target: result } }, () => {
      backend.draw({
        item: { geometry: quad, material: checker, worldMatrix: IDENTITY, castShadow: false },
        view: { viewMatrix: IDENTITY, projectionMatrix: IDENTITY, cameraWorldPosition: [0, 0, 0] }
      })
      const pixel = new Uint8Array(4)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      expect(gl.getError()).toBe(gl.NO_ERROR)
      expect(Array.from(pixel)).toEqual([255, 255, 255, 255])
    })
  }
  return { backend, gl, pass: producer, material, item, context, expectOutput }
}

describe('GBufferPass real GPU', () => {
  /**
   * (1,1,1) 经 inverse-scale 得 (.5,1,1/3)，旋转后 (-1,.5,1/3)，
   * 长度 7/6，单位法线是 (-6/7,3/7,2/7)；用 modelMatrix 直接变换法线会失败。
   */
  it('四个槽位保存线性颜色、正 viewDepth、观察空间逆转置法线和带符号位置', () => {
    const f = fixture()
    const context = f.context([f.item(f.material())])
    f.pass.execute(context)
    f.expectOutput(context, [
      [0.25, 0.5, 0.75, 1],
      [5, 0, 0, 0],
      [-6 / 7, 3 / 7, 2 / 7, 0],
      [-2, 1, -5, 1]
    ])
  })

  /** 输入128/255用精确sRGB规则解码约0.2158605；再次pow会改变这个值。 */
  it('sRGB 纹理只解码一次；alpha 是表面有效位而不是纹理 alpha', () => {
    const f = fixture()
    if (f.gl.getExtension('EXT_sRGB') === null)
      throw new Error('GPU verification requires EXT_sRGB')
    const context = f.context([f.item(f.material(undefined, new Uint8Array([128, 64, 32, 0])))])
    f.pass.execute(context)
    f.expectOutput(context, [
      [0.2158605, 0.05126946, 0.01444384, 1],
      [5, 0, 0, 0],
      [-6 / 7, 3 / 7, 2 / 7, 0],
      [-2, 1, -5, 1]
    ])
  })

  /** depth16 负责遮挡，viewDepth 只负责供 shader 读取；两种职责不能互相替代。 */
  it.each([false, true])('近处黑色表面保留有效位，远近顺序反转=%s', (reverse) => {
    const f = fixture()
    const near = f.item(f.material(new Float32Array([0, 0, 0, 1])), -3)
    const far = f.item(f.material(), -5)
    const context = f.context(reverse ? [near, far] : [far, near])
    f.pass.execute(context)
    f.expectOutput(context, [
      [0, 0, 0, 1],
      [3, 0, 0, 0],
      [-6 / 7, 3 / 7, 2 / 7, 0],
      [-2, 1, -3, 1]
    ])
  })

  /** resize 后不可继续采样旧图；空帧还必须清掉所有附件，不能只把颜色 alpha 清零。 */
  it('resize 重建后重新生产，随后空场景清零四个附件', () => {
    const f = fixture()
    const first = f.context([f.item(f.material())])
    f.pass.execute(first)
    const address = f.pass.getOutput(first).positionView
    const next = f.context([f.item(f.material())], 3, 3)
    f.pass.execute(next)
    expect(f.pass.getOutput(next).positionView.target).toBe(address.target)
    f.expectOutput(next, [
      [0.25, 0.5, 0.75, 1],
      [5, 0, 0, 0],
      [-6 / 7, 3 / 7, 2 / 7, 0],
      [-2, 1, -5, 1]
    ])
    const empty = f.context([], 3, 3)
    f.pass.execute(empty)
    f.expectOutput(empty, [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ])
  })
})

it('rejects the old GBuffer frame after WebGL recovery and reads freshly produced pixels', async () => {
  const f = fixture()
  const extension = f.gl.getExtension('WEBGL_lose_context')
  if (extension === null) throw new Error('GPU verification requires WEBGL_lose_context')
  const first = f.context([f.item(f.material())])
  f.pass.execute(first)
  expect(f.pass.getOutput(first).target).toBe(f.pass.target)
  const canvas = f.gl.canvas
  let lost = false
  canvas.addEventListener(
    'webglcontextlost',
    () => {
      lost = true
    },
    { once: true }
  )
  extension.loseContext()
  await vi.waitFor(() => expect(lost).toBe(true), { timeout: 5000 })
  extension.restoreContext()
  await vi.waitFor(() => expect(f.backend.ready).toBe(true), { timeout: 5000 })
  // No getOutput call during loss. Ready alone would permit the stale frame.
  expect(() => f.pass.getOutput(first)).toThrow(RenderTargetUnavailableError)
  const next = f.context([f.item(f.material())])
  f.pass.execute(next)
  f.expectOutput(next, [
    [0.25, 0.5, 0.75, 1],
    [5, 0, 0, 0],
    [-6 / 7, 3 / 7, 2 / 7, 0],
    [-2, 1, -5, 1]
  ])
})
