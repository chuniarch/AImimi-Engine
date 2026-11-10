import { describe, expect, it, onTestFinished } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { Resource } from '@/rendering/core/Resource'
import { RenderTargetUnavailableError } from '@/rendering/core/errors'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const VERTEX = 'attribute vec3 position; void main(){ gl_Position = vec4(position, 1.0); }'

/**
 * 真实 WebGL1 Backend + 真实 CPU 资源。测试在 scope 内 readPixels，
 * 不依赖屏幕跨帧保留；最终释放所有 GPU/CPU 对象及测试 context。
 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 4
  const backend = new WebGL1Backend(canvas, 'parameter-block-test', { antialias: false })
  const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL1 is required'))
  const resources: Resource[] = []
  onTestFinished(() => {
    try {
      backend.dispose()
    } finally {
      for (const resource of resources.reverse()) resource.dispose()
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  })
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
  function shader(fragmentSource: string): ShaderModule {
    return own(
      new ShaderModule({
        name: 'block-pixels',
        language: 'glsl-es-100',
        vertexSource: VERTEX,
        fragmentSource
      })
    )
  }
  function material(module: ShaderModule, block: ParameterBlock): Material {
    return own(
      new Material({
        shaderModule: module,
        blocks: [block],
        state: { cullMode: 'none', depthTest: false, depthWrite: false, dither: false }
      })
    )
  }
  function draw(material: Material): void {
    const submission: DrawSubmission = {
      item: { geometry, material, worldMatrix: IDENTITY, castShadow: false },
      view: { viewMatrix: IDENTITY, projectionMatrix: IDENTITY, cameraWorldPosition: [0, 0, 0] }
    }
    backend.draw(submission)
  }
  function pixel(): number[] {
    const bytes = new Uint8Array(4)
    gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes)
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return Array.from(bytes)
  }
  return { backend, gl, own, shader, material, draw, pixel }
}

describe('ParameterBlock real WebGL1 acceptance', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][uniform-live-parameter-block]
   * Given 两个 Material 共享颜色块；When 只更新一次块；Then 两个 draw 都从红变绿。
   * 读取像素而非 mock 次数，捕获缺少后端接线和 program uniform 过期。
   */
  it('两个独立 Material 共同读取一次更新后的颜色', () => {
    const f = fixture()
    const block = f.own(
      new ParameterBlock({
        label: 'frame-color',
        entries: { uColor: { type: 'vec4', value: [1, 0, 0, 1] } }
      })
    )
    const shader = f.shader(
      'precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }'
    )
    const a = f.material(shader, block)
    const b = f.material(shader, block)
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      f.draw(a)
      expect(f.pixel()).toEqual([255, 0, 0, 255])
      f.draw(b)
      expect(f.pixel()).toEqual([255, 0, 0, 255])
    })
    block.set('uColor', { type: 'vec4', value: [0, 1, 0, 1] })
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      f.draw(a)
      expect(f.pixel()).toEqual([0, 255, 0, 255])
      f.draw(b)
      expect(f.pixel()).toEqual([0, 255, 0, 255])
    })
    expect(block.version).toBe(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][surface-texture-feedback]
   * 同一附件在另一目标中可采样，在自身 scope 内必须拒绝；失败后仍能正常 draw。
   * 数据来自生产者真实 draw，不以 CPU 图片代替离屏附件。
   */
  it('块附件可被采样，但不能反馈读当前输出', () => {
    const f = fixture()
    const target = f.own(
      new RenderTargetBundle({
        width: 4,
        height: 4,
        label: 'shared-target',
        colors: [{ storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }]
      })
    ).target
    const color = f.own(
      new ParameterBlock({
        label: 'blue',
        entries: { uColor: { type: 'vec4', value: [0, 0, 1, 1] } }
      })
    )
    const producer = f.material(
      f.shader(
        'precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }'
      ),
      color
    )
    const map = f.own(
      new ParameterBlock({
        label: 'map',
        entries: { uMap: { type: 'texture2D', value: target.getColorAttachment(0) } }
      })
    )
    const consumer = f.material(
      f.shader(
        'precision mediump float; uniform sampler2D uMap; void main(){ gl_FragColor = texture2D(uMap, vec2(0.5)); }'
      ),
      map
    )
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, () => {
      f.draw(producer)
      expect(f.pixel()).toEqual([0, 0, 255, 255])
      expect(() => f.draw(consumer)).toThrow(RenderTargetUnavailableError)
      expect(f.pixel()).toEqual([0, 0, 255, 255])
    })
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
      f.draw(consumer)
      expect(f.pixel()).toEqual([0, 0, 255, 255])
    })
  })
})
