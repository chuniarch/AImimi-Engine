import { describe, expect, it, onTestFinished } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { Resource } from '@/rendering/core/Resource'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material, type RenderStateInput } from '@/rendering/resources/Material'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { setShadowBias } from '@/rendering/shadows/setShadowBias'
import packedVertex from '@/shaders/lighting/shadow/packedDepth/vertex.vert?raw'
import packedFragment from '@/shaders/lighting/shadow/packedDepth/fragment.frag?raw'
import receiverVertex from '@/shaders/lighting/shadow/hardShadowVisibility/vertex.vert?raw'
import receiverFragment from '@/shaders/lighting/shadow/hardShadowVisibility/fragment.frag?raw'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** 简单模型平移；z=2d-1 让 identity 投影下的窗口深度等于 d。 */
function translation(x: number, y: number, z: number): Mat4Tuple {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

/**
 * 复用正式 GLSL 函数，只在测试 shader 中替换 main。
 * 不复制编码算法；如果正式函数写错，probe 也必须暴露错误。
 * 原 main 重命名后不再可达，其中未使用的 uniforms 会被编译器优化掉。
 */
function probe(source: string, main: string): string {
  return '#define main productionMain\n' + source + '\n#undef main\n' + main
}

/** 真实 Backend/Managers 完成所有生产与采样；原生 GL 只用于观察状态和 readPixels。 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const backend = new WebGL1Backend(canvas, 'test/packed-depth', { antialias: false })
  const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL1 required'))
  const owned: Resource[] = []
  onTestFinished(() => {
    try {
      backend.dispose()
    } finally {
      for (const resource of owned) resource.dispose()
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  })

  /** 测试拥有 CPU 资源；Material/Backend 仍保持借用语义。 */
  function own<T extends Resource>(resource: T): T {
    owned.push(resource)
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
  const target = own(
    new RenderTargetBundle({
      width: 1,
      height: 1,
      label: 'test/packed-depth/shadow-map',
      colors: [
        {
          storage: { format: 'rgba', type: 'uint8' },
          colorSpace: 'data',
          defaultSampler: { minFilter: 'nearest', magFilter: 'nearest' }
        }
      ],
      depth: true
    })
  ).target

  /** 每个 shader 使用相同 built-in 语义；不把 modelMatrix 写进共享 Material 参数。 */
  function material(
    vertexSource: string,
    fragmentSource: string,
    state: RenderStateInput
  ): Material {
    return own(
      new Material({
        shaderModule: own(
          new ShaderModule({
            name: 'test/packed-depth/shader',
            language: 'glsl-es-100',
            vertexSource,
            fragmentSource,
            builtInUniforms: {
              modelMatrix: 'uModelMatrix',
              viewMatrix: 'uViewMatrix',
              projectionMatrix: 'uProjectionMatrix'
            }
          })
        ),
        state
      })
    )
  }
  const writer = material(packedVertex, packedFragment, {
    depthTest: true,
    depthWrite: true,
    depthFunction: 'less',
    cullMode: 'none',
    dither: false
  })
  const reader = material(receiverVertex, receiverFragment, {
    depthTest: false,
    depthWrite: false,
    cullMode: 'none',
    dither: false
  })
  reader.setParameter('uShadowMap', { type: 'texture2D', value: target.getColorAttachment(0) })
  reader.setParameter('uLightViewProjection', { type: 'mat4', value: IDENTITY })
  reader.setParameter('uLitColor', { type: 'vec3', value: [1, 1, 1] })
  reader.setParameter('uShadowColor', { type: 'vec3', value: [0, 0, 0] })
  setShadowBias(reader, 0)

  /** 矩阵值随 submission 变化，geometry/material 的资源身份不变。 */
  function submission(value: Material, worldMatrix = IDENTITY): DrawSubmission {
    return {
      item: { geometry, material: value, worldMatrix, castShadow: false },
      view: {
        viewMatrix: IDENTITY,
        projectionMatrix: IDENTITY,
        cameraWorldPosition: [0, 0, 0]
      }
    }
  }
  /** 在当前 framebuffer 内读回；不跨 scope 猜测屏幕内容。 */
  function pixel(): number[] {
    const data = new Uint8Array(4)
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return Array.from(data)
  }
  /** 每次重画前清为“没有遮挡物”，先清颜色和真实 depth buffer。 */
  function produce(depths: readonly number[]): void {
    backend.withRenderSurface(
      { surface: { kind: 'render-target', target }, clear: { color: [1, 1, 1, 1], depth: 1 } },
      () => {
        for (const depth of depths)
          backend.draw(submission(writer, translation(0, 0, depth * 2 - 1)))
      }
    )
  }
  /** 将片元光源深度固定为 d，输出可精确读回的白色/黑色可见性。 */
  function visibility(
    depth: number,
    bias = 0,
    matrix = translation(0, 0, depth * 2 - 1)
  ): number[] {
    reader.setParameter('uLightViewProjection', { type: 'mat4', value: matrix })
    setShadowBias(reader, bias)
    let result: number[] = []
    backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      backend.draw(submission(reader))
      result = pixel()
    })
    return result
  }
  return { gl, backend, target, writer, reader, material, submission, pixel, produce, visibility }
}

describe('WebGL1 packed depth real GPU', () => {
  /**
   * [DESIGN-WEIGHT:3][packed-depth-unorm-contract]
   * Given 独立手算的二进制分数；When 正式 pack 函数写 RGBA8；Then 得到准确字节。
   * depth=1 必须为白色而不是绕回零；漏掉 256/255 缩放会损坏其他行。
   */
  it('编码端点和不同通道的位权，实际经过 RGBA8 量化', () => {
    const f = fixture()
    const encoder = f.material(
      packedVertex,
      probe(
        packedFragment,
        `
      uniform highp float uDepth;
      void main() { gl_FragColor = packShadowDepth(uDepth); }
    `
      ),
      { depthTest: false, depthWrite: false, cullMode: 'none', dither: false }
    )
    const cases = [
      [0, [0, 0, 0, 0]],
      [1, [255, 255, 255, 255]],
      [0.5, [128, 0, 0, 0]],
      [0.25, [64, 0, 0, 0]],
      [1 / 256, [1, 0, 0, 0]],
      [1 / 65536, [0, 1, 0, 0]],
      [1 / 16777216, [0, 0, 1, 0]],
      [1 / 4294967296, [0, 0, 0, 1]],
      [1 - 1 / 16777216, [255, 255, 255, 0]]
    ] as const
    for (const [depth, expected] of cases) {
      encoder.setParameter('uDepth', { type: 'float', value: depth })
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: f.target } }, () => {
        f.backend.draw(f.submission(encoder))
        expect(f.pixel()).toEqual(expected)
      })
    }
  })

  /**
   * Given 浮点深度；When pack → FBO → texture2D → 正式 unpack；Then 误差≤1e-6。
   * 在 GPU 内比较误差后输出白/黑，避免把 8-bit 屏幕灰度当成高精度读回证明。
   */
  it('真实采样后的解码保持端点及非整二进制小数', () => {
    const f = fixture()
    const encoder = f.material(
      packedVertex,
      probe(
        packedFragment,
        `
      uniform highp float uDepth;
      void main() { gl_FragColor = packShadowDepth(uDepth); }
    `
      ),
      { depthTest: false, depthWrite: false, cullMode: 'none', dither: false }
    )
    const decoder = f.material(
      receiverVertex,
      probe(
        receiverFragment,
        `
      uniform highp float uExpected;
      void main() {
        float decoded = unpackShadowDepth(texture2D(uShadowMap, vec2(0.5)));
        float ok = abs(decoded - uExpected) <= 0.000001 ? 1.0 : 0.0;
        gl_FragColor = vec4(vec3(ok), 1.0);
      }
    `
      ),
      { depthTest: false, depthWrite: false, cullMode: 'none', dither: false }
    )
    decoder.setParameter('uShadowMap', { type: 'texture2D', value: f.target.getColorAttachment(0) })
    decoder.setParameter('uLightViewProjection', { type: 'mat4', value: IDENTITY })
    for (const depth of [0, 0.00001, 0.1, 0.3, 0.5, 0.9, 1 - 1 / 16777216, 1]) {
      encoder.setParameter('uDepth', { type: 'float', value: depth })
      decoder.setParameter('uExpected', { type: 'float', value: depth })
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: f.target } }, () => {
        f.backend.draw(f.submission(encoder))
      })
      f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
        f.backend.draw(f.submission(decoder))
        expect(f.pixel()).toEqual([255, 255, 255, 255])
      })
    }
  })

  /** Given 空深度图；When 比较中间/最远深度；Then 清屏不能造成全场景阴影。 */
  it('空白区域在 depth=0.5 和 depth=1 都受光', () => {
    const f = fixture()
    f.produce([])
    expect(f.visibility(0.5)).toEqual([255, 255, 255, 255])
    expect(f.visibility(1)).toEqual([255, 255, 255, 255])
  })

  /**
   * [DESIGN-WEIGHT:3][shadow-depth-comparison]
   * Given 遮挡深度0.25；Then 0.125受光、0.75遮挡、0.25相等受光。
   * 0.375减bias0.125恰为0.25；这会发现比较方向、bias符号和严格小于的错误。
   */
  it.each([
    [0.25, 0.75],
    [0.75, 0.25]
  ])('深度测试保留最近者，绘制顺序 %j', (...depths) => {
    const f = fixture()
    f.produce(depths)
    expect(f.visibility(0.125)).toEqual([255, 255, 255, 255])
    expect(f.visibility(0.75)).toEqual([0, 0, 0, 255])
    expect(f.visibility(0.25)).toEqual([255, 255, 255, 255])
    expect(f.visibility(0.375)).toEqual([0, 0, 0, 255])
    expect(f.visibility(0.375, 0.125)).toEqual([255, 255, 255, 255])
  })

  /** Given 整张图有近处遮挡；When 光源裁剪体外/w≤0；Then 不误采样 clamp 边缘。 */
  it('光源视锥外和 w<=0 返回受光', () => {
    const f = fixture()
    f.produce([0.125])
    for (const matrix of [
      translation(3, 0, 0),
      translation(-3, 0, 0),
      translation(0, 3, 0),
      translation(0, -3, 0),
      translation(0, 0, 3),
      translation(0, 0, -3)
    ]) {
      expect(f.visibility(0.5, 0, matrix)).toEqual([255, 255, 255, 255])
    }
    for (const w of [0, -1]) {
      const matrix: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, w]
      expect(f.visibility(0.5, 0, matrix)).toEqual([255, 255, 255, 255])
    }
  })

  /**
   * Given light clip z=0.5,w=2；When 除以 w；Then 深度为0.625，小于遮挡深度0.6875。
   * 若直接使用 clip.z，深度变成0.75，会错误输出阴影；全是 w=1 的样例抓不到此错误。
   */
  it('先做齐次除法，再从 NDC 转窗口深度', () => {
    const f = fixture()
    f.produce([0.6875])
    const matrix: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0.5, 2]
    expect(f.visibility(0.5, 0, matrix)).toEqual([255, 255, 255, 255])
  })

  /** Given 一个无 clear 的活动 scope；When 连续材质切换；Then 真实 GL 状态跟随每笔 draw。 */
  it('DITHER false → true → false 不依赖 clear 或切换 program', () => {
    const f = fixture()
    const ordinary = new Material({
      shaderModule: f.writer.shaderModule,
      state: { cullMode: 'none' }
    })
    onTestFinished(() => ordinary.dispose())
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      for (const [material, expected] of [
        [f.writer, false],
        [ordinary, true],
        [f.writer, false]
      ] as const) {
        f.backend.draw(f.submission(material))
        expect(f.gl.isEnabled(f.gl.DITHER)).toBe(expected)
      }
    })
  })
})
