import { replaceTestGBufferStorage } from '../../../helpers/replaceTestGBufferStorage'
import { describe, expect, it, onTestFinished } from 'vitest'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import { Resource } from '@/rendering/core/Resource'
import {
  InvalidGBufferError,
  CleanupFailureError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError,
  RenderTargetUnavailableError
} from '@/rendering/core/errors'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { RenderList } from '@/rendering/frame/RenderList'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import { GBufferSlot, createGBufferTarget } from '@/rendering/gbuffer/GBufferLayout'
import {
  createGBufferMaterial,
  createGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { RecordingBackend } from '../helpers/createRenderFixture'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** 只替代设备边界；真实 Material/Geometry/RenderTarget 和 Pass 仍照常执行。 */
class BoundaryBackend extends RecordingBackend {
  failAt: 'enter' | 'draw' | 'exit' | null = null
  readonly failure = new Error('injected device failure')
  beforeDraw?: () => void
  beforeScope?: () => void
  afterScope?: () => void

  override withRenderSurface(
    descriptor: RenderSurfaceScopeDescriptor,
    callback: () => undefined
  ): void {
    this.beforeScope?.()
    if (this.failAt === 'enter') throw this.failure
    super.withRenderSurface(descriptor, callback)
    this.afterScope?.()
    if (this.failAt === 'exit') throw this.failure
  }

  override draw(submission: DrawSubmission): void {
    super.draw(submission)
    this.beforeDraw?.()
    if (this.failAt === 'draw') throw this.failure
  }
}

/** 构造真实 CPU 资源；测试不靠伪造的 shaderModule getter 绕过材质验证。 */
function fixture() {
  const owned: Resource[] = []
  function own<T extends Resource>(resource: T): T {
    owned.push(resource)
    return resource
  }
  const shader = own(createGBufferShaderModule())
  const texture = own(
    new DataTexture2D({
      label: 'test/base-color',
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'linear',
      source: { width: 1, height: 1, data: new Float32Array([0.25, 0.5, 0.75, 1]) }
    })
  )
  const geometry = own(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
          itemSize: 3
        }),
        normal: new VertexAttribute({
          data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          itemSize: 3
        }),
        uv: new VertexAttribute({ data: new Float32Array([0, 0, 1, 0, 0, 1]), itemSize: 2 })
      }
    })
  )
  const material = own(createGBufferMaterial(shader, texture))
  const backend = new BoundaryBackend()
  const pass = new GBufferPass({ shaderModule: shader, label: 'test/gbuffer' })
  const item: RenderItem = { geometry, material, worldMatrix: IDENTITY, castShadow: false }

  function context(
    opaque: RenderItem[] = [item],
    background: RenderItem[] = []
  ): RenderPassContext {
    return Object.freeze({
      frame: Object.freeze({
        frameNumber: 1,
        timeSeconds: 0,
        deltaSeconds: 1 / 60,
        drawingBufferWidth: 4,
        drawingBufferHeight: 3,
        pixelRatio: 2
      }),
      view: Object.freeze({
        viewMatrix: IDENTITY,
        projectionMatrix: IDENTITY,
        cameraWorldPosition: [0, 0, 0] as const
      }),
      renderList: new RenderList(background, opaque),
      lights: Object.freeze([]),
      backend
    })
  }

  onTestFinished(() => {
    pass.dispose()
    for (const resource of owned.reverse()) resource.dispose()
  })
  return { own, shader, texture, geometry, material, backend, pass, item, context }
}

describe('GBuffer producer resources', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
   * Given 指定尺寸；When 创建目标；Then 消费语义必须指向独立的正确槽位。
   * 改错槽位、格式或 nearest 会破坏后续数值采样，此处不测试常量的文本。
   */
  it('语义地址指向四个 rgba32f nearest 槽位，并保留 depth16', () => {
    const owner = createGBufferTarget(8, 5, 'test/layout')
    const target = owner.target
    onTestFinished(() => owner.dispose())
    expect(owner.label).toBe('test/layout')
    expect([target.width, target.height]).toEqual([8, 5])
    expect(new Set(target.attachments.colors.map((view) => view.texture)).size).toBe(4)
    expect(target.attachments.colors).toHaveLength(4)
    for (const { texture } of target.attachments.colors) {
      expect(texture.descriptor.storage).toEqual({ format: 'rgba', type: 'float32' })
      expect(texture.defaultSampler).toMatchObject({ minFilter: 'nearest', magFilter: 'nearest' })
    }
    expect(target.attachments.depth?.format).toBe('depth16')
    expect([
      target.getColorAttachment(GBufferSlot.baseColorLinear).index,
      target.getColorAttachment(GBufferSlot.viewDepth).index,
      target.getColorAttachment(GBufferSlot.normalView).index,
      target.getColorAttachment(GBufferSlot.positionView).index
    ]).toEqual([0, 1, 2, 3])
  })

  /** 错误尺寸不应被工厂自动取整，空 label 不应被静默改名。 */
  it.each([
    [0, 2, 'g'],
    [2, 0, 'g'],
    [1.5, 2, 'g'],
    [2, 2, ' ']
  ] as const)('拒绝非法目标输入 %j/%j/%j', (width, height, label) => {
    expect(() => createGBufferTarget(width, height, label)).toThrow()
  })

  /** 同名不是共享 key；一个 Pass resize 不得改掉另一个目标。 */
  it('同名目标仍各自拥有尺寸和 revision', () => {
    const a = createGBufferTarget(2, 2, 'same')
    const b = createGBufferTarget(2, 2, 'same')
    onTestFinished(() => {
      a.dispose()
      b.dispose()
    })
    a.resize(3, 2)
    expect(b.target.width).toBe(2)
    expect(b.target.revision).toBe(0)
  })

  /** Given 专用工厂；Then 矩阵由 Backend 提供，颜色纹理由 Material 借用。 */
  it('工厂固定生产 ABI 和绘制状态，但不接管 shader/texture', () => {
    const f = fixture()
    expect(f.shader.builtInUniforms).toEqual({
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix',
      normalMatrix: 'uNormalMatrix'
    })
    expect(f.material.queue).toBe('opaque')
    expect(f.material.state).toEqual({
      depthTest: true,
      depthWrite: true,
      depthFunction: 'less',
      cullMode: 'back',
      dither: false
    })
    expect(f.material.getParameter('uBaseColorMap')).toEqual({
      type: 'texture2D',
      value: f.texture
    })
    f.material.dispose()
    expect(f.shader.disposed).toBe(false)
    expect(f.texture.disposed).toBe(false)
    expect(f.shader.sceneReferenceCount).toBe(0)
    expect(f.texture.sceneReferenceCount).toBe(0)
  })

  /** 名字相同不能证明 shader 真会写四附件；拒绝普通 Forward shader。 */
  it('拒绝非专用工厂创建的 ShaderModule', () => {
    const f = fixture()
    const foreign = f.own(
      new ShaderModule({
        name: f.shader.name,
        language: 'glsl-es-100',
        vertexSource: 'void main(){gl_Position=vec4(0.0);}',
        fragmentSource: 'void main(){gl_FragColor=vec4(1.0);}'
      })
    )
    expect(() => createGBufferMaterial(foreign, f.texture)).toThrow(InvalidGBufferError)
    expect(() => new GBufferPass({ shaderModule: foreign, label: 'bad' })).toThrow(
      InvalidGBufferError
    )
  })

  /** 借用不延长生命周期；使用已释放依赖必须显式失败。 */
  it('拒绝已释放的 shader 和颜色纹理', () => {
    const f = fixture()
    f.texture.dispose()
    expect(() => createGBufferMaterial(f.shader, f.texture)).toThrow(ResourceDisposedError)
    f.shader.dispose()
    expect(() => createGBufferMaterial(f.shader, f.texture)).toThrow(ResourceDisposedError)
  })
})

describe('GBufferPass ordering and lifetime', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
   * Given 两个 opaque 和一个 background；When execute；Then 只按 opaque 顺序画，
   * 每笔使用原 ViewState，resize 在 scope 外完成且清除包含颜色零和深度一。
   */
  it('使用真实像素尺寸、共享 view 并保持 opaque 顺序，不画 background', () => {
    const f = fixture()
    const second = f.own(createGBufferMaterial(f.shader, f.texture))
    const background = f.own(new Material({ shaderModule: f.shader, queue: 'background' }))
    const context = f.context(
      [f.item, { ...f.item, material: second }],
      [{ ...f.item, material: background }]
    )
    const oldParameters = f.material.getParameterEntries()
    f.backend.beforeScope = () => {
      expect(f.pass.target.width).toBe(4)
      expect(f.pass.target.height).toBe(3)
    }
    f.backend.beforeDraw = () => {
      expect(f.pass.target.width).toBe(4)
      expect(f.pass.target.height).toBe(3)
      expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
    }
    f.backend.afterScope = () => {
      expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
    }
    f.pass.execute(context)
    expect(f.backend.scopes).toEqual([
      {
        surface: { kind: 'render-target', target: f.pass.target },
        clear: { color: [0, 0, 0, 0], depth: 1 }
      }
    ])
    expect(f.backend.submissions.map((s) => s.item.material)).toEqual([f.material, second])
    for (const submission of f.backend.submissions) expect(submission.view).toBe(context.view)
    expect(f.material.getParameterEntries()).toEqual(oldParameters)
    const output = f.pass.getOutput(context)
    expect(Object.isFrozen(output)).toBe(true)
    expect([
      output.baseColorLinear.index,
      output.viewDepth.index,
      output.normalView.index,
      output.positionView.index
    ]).toEqual([0, 1, 2, 3])
    expect(output.positionView.target).toBe(f.pass.target)
    expect(f.pass.target.sceneReferenceCount).toBe(0)
  })

  /** 空场景仍清除；否则上一帧有效 alpha 会保留，Lighting 会画出幽灵表面。 */
  it('空列表仍清除并发布有效空输出；相同尺寸不增加 revision', () => {
    const f = fixture()
    const first = f.context()
    f.pass.execute(first)
    const revision = f.pass.target.revision
    const next = f.context([])
    f.pass.execute(next)
    expect(f.backend.scopes).toHaveLength(2)
    expect(f.backend.submissions).toHaveLength(1)
    expect(f.pass.target.revision).toBe(revision)
    expect(f.pass.getOutput(next).revision).toBe(revision)
    expect(() => f.pass.getOutput(first)).toThrow(RenderTargetUnavailableError)
  })

  /** 整条队列预检：第二个材质错误时，第一个也不能先画出去。 */
  it('第二个 shader 即便源码相同但身份不同，也在第一笔 draw 前拒绝', () => {
    const f = fixture()
    const other = f.own(createGBufferShaderModule())
    const wrong = f.own(createGBufferMaterial(other, f.texture))
    expect(() => f.pass.execute(f.context([f.item, { ...f.item, material: wrong }]))).toThrow(
      InvalidGBufferError
    )
    expect(f.backend.scopes).toHaveLength(0)
    expect(f.backend.submissions).toHaveLength(0)
  })

  /** 同一 shader 不是充分条件：关闭深度写入会让后画的远处表面覆盖近处。 */
  it.each([
    { depthTest: false },
    { depthWrite: false },
    { depthFunction: 'always' as const },
    { dither: true }
  ])('拒绝破坏生产契约的状态 %j', (state) => {
    const f = fixture()
    const wrong = f.own(
      new Material({
        shaderModule: f.shader,
        state: {
          depthTest: true,
          depthWrite: true,
          depthFunction: 'less',
          dither: false,
          ...state
        },
        parameters: { uBaseColorMap: { type: 'texture2D', value: f.texture } }
      })
    )
    expect(() => f.pass.execute(f.context([f.item, { ...f.item, material: wrong }]))).toThrow(
      InvalidGBufferError
    )
    expect(f.backend.scopes).toHaveLength(0)
  })

  /** 缺少输入与错误类型必须由生产者明确指出，不能依赖之前一笔 draw 的 sampler。 */
  it.each(['missing', 'wrong-type', 'self-feedback'] as const)('拒绝颜色参数 %s', (kind) => {
    const f = fixture()
    const wrong = f.own(new Material({ shaderModule: f.shader, state: f.material.state }))
    if (kind === 'wrong-type') wrong.setParameter('uBaseColorMap', { type: 'float', value: 1 })
    if (kind === 'self-feedback')
      wrong.setParameter('uBaseColorMap', {
        type: 'texture2D',
        value: f.pass.target.getColorAttachment(0)
      })
    expect(() => f.pass.execute(f.context([f.item, { ...f.item, material: wrong }]))).toThrow(
      InvalidGBufferError
    )
    expect(f.backend.scopes).toHaveLength(0)
  })

  /** 缺少 normal/uv 会让旧 GL attribute 状态意外影响结果，整队列预检时拒绝。 */
  it.each(['normal', 'uv'] as const)('拒绝缺失 %s 属性', (name) => {
    const f = fixture()
    const attributes: Record<string, VertexAttribute> = {}
    for (const key of ['position', 'normal', 'uv']) {
      if (key !== name) attributes[key] = f.geometry.getAttribute(key)!
    }
    const wrong = f.own(new Geometry({ attributes }))
    expect(() => f.pass.execute(f.context([f.item, { ...f.item, geometry: wrong }]))).toThrow(
      InvalidGBufferError
    )
    expect(f.backend.scopes).toHaveLength(0)
  })

  /** 不能只验证属性存在；vec2 normal 的默认补零不属于本生产者的输入契约。 */
  it('拒绝不匹配的属性 itemSize', () => {
    const f = fixture()
    const wrong = f.own(
      new Geometry({
        attributes: {
          position: f.geometry.getAttribute('position')!,
          normal: new VertexAttribute({ data: new Float32Array(6), itemSize: 2 }),
          uv: f.geometry.getAttribute('uv')!
        }
      })
    )
    expect(() => f.pass.execute(f.context([{ ...f.item, geometry: wrong }]))).toThrow(
      InvalidGBufferError
    )
    expect(f.backend.scopes).toHaveLength(0)
  })

  /** GPU 可能已部分写入，但失败不得留下上一帧或半成品的成功凭证。 */
  it.each(['enter', 'draw', 'exit'] as const)(
    '%s 失败不发布，重试同一 context 重新生产',
    (stage) => {
      const f = fixture()
      const previous = f.context()
      f.pass.execute(previous)
      const context = f.context()
      f.backend.failAt = stage
      expect(() => f.pass.execute(context)).toThrow(f.backend.failure)
      expect(() => f.pass.getOutput(previous)).toThrow(RenderTargetUnavailableError)
      expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
      f.backend.failAt = null
      f.pass.execute(context)
      expect(f.pass.getOutput(context).target).toBe(f.pass.target)
    }
  )

  /** 相同 frameNumber 不等于同一提取结果；也不能读 resize 前的存储。 */
  it('拒绝未生产、其他 context 与旧 revision', () => {
    const f = fixture()
    const context = f.context()
    expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
    f.pass.execute(context)
    expect(() => f.pass.getOutput({ ...context })).toThrow(RenderTargetUnavailableError)
    replaceTestGBufferStorage(f.pass.target, 8, 3)
    replaceTestGBufferStorage(f.pass.target, 4, 3)
    expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
  })

  /** readiness 只作当前检查；恢复后 Renderer 仍须用新 context 重画。 */
  it('设备失效后拒绝消费；新 context 必须重新生产', () => {
    const f = fixture()
    const context = f.context()
    f.pass.execute(context)
    f.backend.ready = false
    expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
    expect(() => f.pass.execute(f.context())).toThrow(RenderTargetUnavailableError)
    f.backend.ready = true
    expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
    const next = f.context()
    f.pass.execute(next)
    expect(f.pass.getOutput(next).target).toBe(f.pass.target)
  })

  /** scope 内发生外部 resize 时不发布过期凭证；真实 Backend 同样禁止活动目标 resize。 */
  it('scope 结束时 target revision 已变化则拒绝发布', () => {
    const f = fixture()
    const context = f.context()
    f.backend.afterScope = () => {
      replaceTestGBufferStorage(f.pass.target, 5, 3)
    }
    expect(() => f.pass.execute(context)).toThrow(RenderTargetUnavailableError)
    expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
  })

  /** 重入不是第二帧：不能覆盖外层生产状态，也不能在 draw 回调里释放目标。 */
  it('拒绝同步重入 execute 与活动期间 dispose', () => {
    const f = fixture()
    const context = f.context()
    f.backend.beforeDraw = () => {
      expect(() => f.pass.execute(context)).toThrow(InvalidGBufferError)
      expect(() => f.pass.dispose()).toThrow(InvalidGBufferError)
    }
    f.pass.execute(context)
    expect(f.pass.getOutput(context).target).toBe(f.pass.target)
  })

  /** Pass 只拥有目标；场景资源需由 Scene/创建者释放。 */
  it('dispose 幂等且不释放借用资源，之后不能执行或消费', () => {
    const f = fixture()
    const context = f.context()
    f.pass.execute(context)
    const target = f.pass.target
    f.pass.dispose()
    f.pass.dispose()
    expect(target.disposed).toBe(true)
    for (const borrowed of [f.geometry, f.material, f.shader, f.texture])
      expect(borrowed.disposed).toBe(false)
    expect(() => f.pass.execute(context)).toThrow(ResourceDisposedError)
    expect(() => f.pass.getOutput(context)).toThrow(ResourceDisposedError)
  })

  /** 外部错误 retain 会阻止 owner 清理；关闭中的 Pass 不再渲染，但允许显式重试释放。 */
  it('target 释放被引用数阻止时保留重试路径', () => {
    const f = fixture()
    const target = f.pass.target
    target.retainSceneReference()
    try {
      const attachments = target.attachments
      try {
        f.pass.dispose()
        throw new Error('Expected target reference to block cleanup')
      } catch (error) {
        expect(error).toBeInstanceOf(CleanupFailureError)
        if (!(error instanceof CleanupFailureError)) throw error
        expect(error.failures[0]?.cause).toBeInstanceOf(ResourceHasSceneReferencesError)
      }
      expect(attachments.colors.every(({ texture }) => !texture.disposed)).toBe(true)
      expect(attachments.depth?.disposed).toBe(false)
      expect(() => f.pass.execute(f.context())).toThrow(ResourceDisposedError)
    } finally {
      target.releaseSceneReference()
    }
    expect(() => f.pass.dispose()).not.toThrow()
  })
})

it('C5 rejects GBuffer output after a full recovery between reads', () => {
  const f = fixture()
  const context = f.context()
  f.pass.execute(context)
  expect(f.pass.getOutput(context).target).toBe(f.pass.target)
  f.backend.ready = false
  f.backend.ready = true
  expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
  const next = f.context()
  f.pass.execute(next)
  expect(f.pass.getOutput(next).target).toBe(f.pass.target)
})
it('C5 rejects GBuffer publication if the backend changes epoch during scope exit', () => {
  const f = fixture()
  const context = f.context()
  f.backend.afterScope = () => {
    f.backend.ready = false
    f.backend.ready = true
  }
  expect(() => f.pass.execute(context)).toThrow(RenderTargetUnavailableError)
  expect(() => f.pass.getOutput(context)).toThrow(RenderTargetUnavailableError)
})
