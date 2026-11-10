import { describe, expect, it, vi } from 'vitest'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import { InvalidDirectionalShadowError, ResourceDisposedError } from '@/rendering/core/errors'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import { ShadowMapPass } from '@/rendering/passes/ShadowMapPass'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import { createDirectionalShadowView } from '@/rendering/shadows/createDirectionalShadowView'
import { createPackedDepthShaderModule } from '@/rendering/shadows/createPackedDepthShaderModule'
import { createRenderFixture, RecordingBackend } from '../helpers/createRenderFixture'

/**
 * 只替换 GPU 边界：资源、场景提取、矩阵和 ParameterBlock 都使用真实实现。
 * enter 模拟绑定/清屏，leave 模拟恢复输出状态；leave 抛错意味着结果仍不能发布。
 */
class FaultBackend extends RecordingBackend {
  onEnter?: () => void
  onDraw?: (submission: DrawSubmission) => void
  onLeave?: () => void

  override withRenderSurface(
    descriptor: RenderSurfaceScopeDescriptor,
    callback: () => undefined
  ): void {
    this.scopes.push(descriptor)
    this.events.push('enter')
    this.onEnter?.()
    try {
      callback()
    } finally {
      this.events.push('leave')
      this.onLeave?.()
    }
  }

  override draw(submission: DrawSubmission): void {
    super.draw(submission)
    this.onDraw?.(submission)
  }
}

/** 提取块的公开值，避免测试依赖 ShadowMapPass 的 private 字段。 */
function matrix(shadow: DirectionalLightShadow): readonly number[] {
  const parameter = shadow.block.get('uLightViewProjection')
  if (parameter?.type !== 'mat4') throw new Error('fixture requires a mat4')
  return parameter.value
}

/** 一盏位于 (0,0,5) 的灯照向原点；正交体覆盖 x/y 的 [-2,2]。 */
function fixture() {
  const base = createRenderFixture()
  const backend = new FaultBackend()
  const shadow = new DirectionalLightShadow({
    label: 'key-shadow',
    mapSize: 8,
    halfExtent: 2,
    near: 1,
    far: 10,
    bias: 0.003
  })
  const light = new DirectionalLight({ targetWorld: [0, 0, 0], castShadow: true, shadow })
  light.transform.setPosition([0, 0, 5])
  const caster = base.mesh()
  caster.castShadow = true
  base.scene.add(light, caster)
  const shader = createPackedDepthShaderModule()
  const pass = new ShadowMapPass({ depthShader: shader })
  const build = (): RenderPassContext => {
    const result = new RenderListBuilder().build(base.view)
    return Object.freeze({
      frame: Object.freeze({ ...base.frame }),
      view: result.viewState,
      renderList: result.renderList,
      lights: result.lights,
      backend
    })
  }
  return { ...base, backend, shadow, light, caster, shader, pass, build }
}

describe('ShadowMapPass frame producer', () => {
  it('先清白色深度目标，只借用 opaque 投影者，退出 scope 后才发布', () => {
    // Given：背景、非投影物体和投影者共存，只有最后一类参加深度绘制。
    const f = fixture()
    const background = f.mesh('background')
    background.castShadow = true
    f.scene.add(background, f.mesh())
    const context = f.build()
    const original = context.renderList.opaque[0]!
    const publish = vi.spyOn(f.shadow, 'publish')
    const zero = Array(16).fill(0)
    f.backend.onEnter = () => expect(matrix(f.shadow)).toEqual(zero)
    f.backend.onDraw = () => expect(matrix(f.shadow)).toEqual(zero)
    f.backend.onLeave = () => {
      expect(matrix(f.shadow)).toEqual(zero)
      expect(publish).not.toHaveBeenCalled()
    }

    // When：完整退出作用域才允许向接收者提供非零矩阵。
    expect(f.pass.execute(context)).toBeUndefined()

    // Then：原 Material/RenderItem 未被改写，深度材质关闭抖动并写深度。
    expect(f.backend.events).toEqual(['enter', 'draw', 'leave'])
    expect(f.backend.scopes[0]).toEqual({
      surface: { kind: 'render-target', target: f.shadow.target },
      clear: { color: [1, 1, 1, 1], depth: 1 }
    })
    const draw = f.backend.submissions[0]!
    expect(draw.item).not.toBe(original)
    expect(draw.item.geometry).toBe(original.geometry)
    expect(draw.item.worldMatrix).toBe(original.worldMatrix)
    expect(draw.item.material).not.toBe(original.material)
    expect(original.material).toBe(f.caster.material)
    expect(draw.item.material.shaderModule).toBe(f.shader)
    expect(draw.item.material.state).toEqual({
      depthTest: true,
      depthWrite: true,
      depthFunction: 'less',
      cullMode: 'back',
      dither: false
    })
    const expected = createDirectionalShadowView({
      label: f.shadow.label,
      positionWorld: [0, 0, 5],
      targetWorld: [0, 0, 0],
      settings: f.shadow.settings
    })
    expect(draw.view).toEqual(expected.view)
    expect(draw.view).not.toBe(context.view)
    expect(matrix(f.shadow)).toEqual(expected.lightViewProjection)
    expect(publish).toHaveBeenCalledOnce()
  })

  it('没有投影者仍清屏并发布最远深度图，不沿用上一帧像素', () => {
    const f = fixture()
    f.caster.castShadow = false
    f.pass.execute(f.build())
    expect(f.backend.events).toEqual(['enter', 'leave'])
    expect(matrix(f.shadow)).not.toEqual(Array(16).fill(0))
  })

  it('只消费捕获的灯位、mapSize 与 bias；修改配置在下一次提取生效', () => {
    const f = fixture()
    f.shadow.setMapSize(16)
    const first = f.build()
    f.light.transform.setPosition([5, 0, 0])
    f.shadow.setMapSize(32)
    f.shadow.setBias(0.02)
    f.backend.onEnter = () => {
      expect(f.shadow.target.width).toBe(16)
      expect(f.shadow.target.height).toBe(16)
    }
    f.pass.execute(first)
    const oldMatrix = matrix(f.shadow)
    expect(f.backend.submissions[0]!.view.cameraWorldPosition).toEqual([0, 0, 5])
    // CPU bias 保留原 number；只有 GPU uniform 上传时才量化为 Float32。
    expect(f.shadow.block.get('uShadowBias')).toEqual({ type: 'float', value: 0.003 })
    f.backend.onEnter = undefined
    f.pass.execute(f.build())
    expect(f.shadow.target.width).toBe(32)
    expect(matrix(f.shadow)).not.toEqual(oldMatrix)
    expect(f.shadow.block.get('uShadowBias')).toEqual({ type: 'float', value: 0.02 })
  })

  it.each(['disabled', 'hidden', 'removed'] as const)('%s 后撤销旧矩阵而不释放目标', (reason) => {
    const f = fixture()
    f.pass.execute(f.build())
    if (reason === 'disabled') f.light.castShadow = false
    if (reason === 'hidden') f.light.visible = false
    if (reason === 'removed') f.light.removeFromParent()
    f.pass.execute(f.build())
    expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
    expect(f.backend.scopes).toHaveLength(1)
    expect(f.shadow.target.disposed).toBe(false)
  })

  it('上帧资源已经释放且本帧不再引用时安全忘记它', () => {
    const f = fixture()
    f.pass.execute(f.build())
    f.light.removeFromParent()
    f.shadow.dispose()
    expect(() => f.pass.execute(f.build())).not.toThrow()
  })

  it('撤销失败保留旧与新资源；即使下一帧两盏灯都消失也不会漏掉撤销', () => {
    const f = fixture()
    f.pass.execute(f.build())
    const second = new DirectionalLightShadow({
      label: 'pending-reset',
      mapSize: 4,
      halfExtent: 2,
      near: 1,
      far: 10,
      bias: 0
    })
    // Given：两份资源都曾有有效结果；下一帧仅 B 仍可见。
    second.publish(matrix(f.shadow) as Parameters<DirectionalLightShadow['publish']>[0], 0, 0)
    f.light.removeFromParent()
    const nextLight = new DirectionalLight({ shadow: second, castShadow: false })
    f.scene.add(nextLight)
    const error = new Error('reset failed')
    vi.spyOn(f.shadow, 'publishNoShadow').mockImplementationOnce(() => {
      throw error
    })
    expect(() => f.pass.execute(f.build())).toThrow(error)
    expect(matrix(second)).not.toEqual(Array(16).fill(0))

    // When：撤销失败之后，B 也被移除；重试仍必须记得两个待撤销身份。
    nextLight.removeFromParent()
    f.pass.execute(f.build())
    expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
    expect(matrix(second)).toEqual(Array(16).fill(0))
    expect(f.backend.scopes).toHaveLength(1)
  })

  it('两盏灯使用不同目标，保持独立视图和发布值', () => {
    const f = fixture()
    const second = new DirectionalLightShadow({
      label: 'fill',
      mapSize: 4,
      halfExtent: 3,
      near: 1,
      far: 20,
      bias: 0.01
    })
    const light = new DirectionalLight({ targetWorld: [0, 0, 0], castShadow: true, shadow: second })
    light.transform.setPosition([5, 0, 0])
    f.scene.add(light)
    f.pass.execute(f.build())
    expect(f.backend.scopes).toHaveLength(2)
    expect(f.backend.scopes[1]!.surface).toEqual({ kind: 'render-target', target: second.target })
    expect(matrix(second)).not.toEqual(matrix(f.shadow))
    expect(f.backend.submissions[1]!.view.cameraWorldPosition).toEqual([5, 0, 0])
  })

  it.each([true, false])(
    '同一 shadow 不能交给两个可见灯，即使第二盏 castShadow=%s',
    (castShadow) => {
      const f = fixture()
      f.pass.execute(f.build())
      f.scene.add(new DirectionalLight({ shadow: f.shadow, castShadow }))
      expect(() => f.pass.execute(f.build())).toThrow(InvalidDirectionalShadowError)
      expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
      expect(f.backend.scopes).toHaveLength(1)
    }
  )

  it('任一灯的视图退化时，全部视图的准备阶段先失败，零次绘制', () => {
    const f = fixture()
    const second = new DirectionalLightShadow({
      label: 'parallel-up',
      mapSize: 4,
      halfExtent: 2,
      near: 1,
      far: 10,
      bias: 0
    })
    // 默认方向沿 Y，与默认 up 平行；方向本身有效，但阴影视图无效。
    f.scene.add(new DirectionalLight({ castShadow: true, shadow: second }))
    expect(() => f.pass.execute(f.build())).toThrow(InvalidDirectionalShadowError)
    expect(f.backend.scopes).toHaveLength(0)
    expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
  })

  it.each(['enter', 'draw', 'leave'] as const)(
    '%s 故障保留错误身份，阻断消费者并允许重试',
    (phase) => {
      const f = fixture()
      const error = new Error(phase + ' failure')
      const fail = () => {
        throw error
      }
      if (phase === 'enter') f.backend.onEnter = fail
      if (phase === 'draw') f.backend.onDraw = fail
      if (phase === 'leave') f.backend.onLeave = fail
      const consume = vi.fn(() => undefined)
      const pipeline = new RenderPipeline()
      pipeline.addPass(f.pass)
      pipeline.addPass({ name: 'receiver', execute: consume, dispose() {} })
      const publish = vi.spyOn(f.shadow, 'publish')
      expect(() => pipeline.execute(f.build())).toThrow(error)
      expect(publish).not.toHaveBeenCalled()
      expect(consume).not.toHaveBeenCalled()
      expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
      f.backend.onEnter = f.backend.onDraw = f.backend.onLeave = undefined
      pipeline.execute(f.build())
      expect(consume).toHaveBeenCalledOnce()
    }
  )

  it('后续灯失败时停止整个 Pipeline，不承诺回滚先前灯已经完成的结果', () => {
    const f = fixture()
    const second = new DirectionalLightShadow({
      label: 'second',
      mapSize: 4,
      halfExtent: 2,
      near: 1,
      far: 10,
      bias: 0
    })
    const light = new DirectionalLight({ castShadow: true, shadow: second, targetWorld: [0, 0, 0] })
    light.transform.setPosition([4, 0, 0])
    f.scene.add(light)
    f.backend.onDraw = () => {
      if (f.backend.submissions.length === 2) throw new Error('second failed')
    }
    const consume = vi.fn(() => undefined)
    const pipeline = new RenderPipeline()
    pipeline.addPass(f.pass)
    pipeline.addPass({ name: 'receiver', execute: consume, dispose() {} })
    expect(() => pipeline.execute(f.build())).toThrow('second failed')
    expect(matrix(f.shadow)).not.toEqual(Array(16).fill(0))
    expect(matrix(second)).toEqual(Array(16).fill(0))
    expect(consume).not.toHaveBeenCalled()
  })

  it.each(['not-ready', 'revision', 'disposed'] as const)('scope 返回后发生 %s 不发布', (fault) => {
    const f = fixture()
    const publish = vi.spyOn(f.shadow, 'publish')
    f.backend.onLeave = () => {
      if (fault === 'not-ready') f.backend.ready = false
      if (fault === 'revision') f.shadow.prepareSize(9)
      if (fault === 'disposed') f.shadow.dispose()
    }
    expect(() => f.pass.execute(f.build())).toThrow(
      fault === 'disposed' ? ResourceDisposedError : InvalidDirectionalShadowError
    )
    expect(publish).not.toHaveBeenCalled()
  })

  it('execute 入口 backend 不可用也先撤销旧结果，不进入 scope', () => {
    const f = fixture()
    f.pass.execute(f.build())
    f.backend.ready = false
    expect(() => f.pass.execute(f.build())).toThrow(InvalidDirectionalShadowError)
    expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
    expect(f.backend.scopes).toHaveLength(1)
  })

  it('发布自身失败仍阻断消费者，不能把它吞掉当成成功', () => {
    const f = fixture()
    const error = new Error('publish failed')
    vi.spyOn(f.shadow, 'publish').mockImplementationOnce(() => {
      throw error
    })
    const next = vi.fn(() => undefined)
    const pipeline = new RenderPipeline()
    pipeline.addPass(f.pass)
    pipeline.addPass({ name: 'next', execute: next, dispose() {} })
    expect(() => pipeline.execute(f.build())).toThrow(error)
    expect(next).not.toHaveBeenCalled()
  })

  it('在 draw 内同步重入 execute 或 dispose 会被拒绝且不破坏外层调用', () => {
    const f = fixture()
    const context = f.build()
    f.backend.onDraw = () => {
      expect(() => f.pass.execute(context)).toThrow(InvalidDirectionalShadowError)
      expect(() => f.pass.dispose()).toThrow(InvalidDirectionalShadowError)
    }
    f.pass.execute(context)
    expect(matrix(f.shadow)).not.toEqual(Array(16).fill(0))
  })

  it('仅释放自有 Material；shader、shadow 和 Geometry 仍属于原所有者', () => {
    const f = fixture()
    f.pass.execute(f.build())
    const depthMaterial = f.backend.submissions[0]!.item.material
    const onDispose = vi.fn()
    depthMaterial.onDispose(onDispose)
    f.pass.dispose()
    f.pass.dispose()
    expect(onDispose).toHaveBeenCalledOnce()
    expect(depthMaterial.disposed).toBe(true)
    expect(f.shader.disposed).toBe(false)
    expect(f.shadow.disposed).toBe(false)
    expect(f.shadow.block.disposed).toBe(false)
    expect(f.shadow.target.disposed).toBe(false)
    expect(f.geometry.disposed).toBe(false)
    expect(f.caster.material.disposed).toBe(false)
    expect(() => f.pass.execute(f.build())).toThrow(ResourceDisposedError)
  })

  it('清理失败进入只允许清理的状态，解除借用计数后可重试', () => {
    const f = fixture()
    f.pass.execute(f.build())
    const owned = f.backend.submissions[0]!.item.material
    // 故意违反所有权边界，制造 dispose 尚未开始的失败，不模拟 listener 的未定语义。
    owned.retainSceneReference()
    expect(() => f.pass.dispose()).toThrow()
    expect(() => f.pass.execute(f.build())).toThrow(ResourceDisposedError)
    owned.releaseSceneReference()
    expect(() => f.pass.dispose()).not.toThrow()
    expect(f.shader.disposed).toBe(false)
  })

  it('Material 清理回调不能同步再次 dispose Pass', () => {
    const f = fixture()
    f.pass.execute(f.build())
    f.backend.submissions[0]!.item.material.onDispose(() => {
      expect(() => f.pass.dispose()).toThrow(InvalidDirectionalShadowError)
    })
    expect(() => f.pass.dispose()).not.toThrow()
  })

  it('手工构造的启用但无 shadow 快照仍在绘制前被拒绝', () => {
    const f = fixture()
    const context = f.build()
    const invalid: RenderPassContext = {
      ...context,
      lights: [{ ...context.lights[0]!, shadow: null }]
    }
    expect(() => f.pass.execute(invalid)).toThrow(InvalidDirectionalShadowError)
    expect(f.backend.scopes).toHaveLength(0)
  })

  it('提取后借用的 shadow 被释放，在绘制前明确拒绝', () => {
    const f = fixture()
    const context = f.build()
    f.shadow.dispose()
    expect(() => f.pass.execute(context)).toThrow(ResourceDisposedError)
    expect(f.backend.scopes).toHaveLength(0)
  })

  it('提取后借用的 shader 被释放，在绘制前明确拒绝', () => {
    const f = fixture()
    const context = f.build()
    f.shader.dispose()
    expect(() => f.pass.execute(context)).toThrow(ResourceDisposedError)
    expect(f.backend.scopes).toHaveLength(0)
  })

  it.each(['wrong-resource', 'disposed', 'wrong-language', 'missing-binding'] as const)(
    '构造拒绝 %s depthShader',
    (fault) => {
      const shader =
        fault === 'wrong-language'
          ? new ShaderModule({
              name: '300',
              language: 'glsl-es-300',
              vertexSource: 'void main(){}',
              fragmentSource: 'void main(){}'
            })
          : fault === 'missing-binding'
            ? new ShaderModule({
                name: 'missing',
                language: 'glsl-es-100',
                vertexSource: 'void main(){}',
                fragmentSource: 'void main(){}'
              })
            : createPackedDepthShaderModule()
      if (fault === 'disposed') shader.dispose()
      expect(
        () =>
          new ShadowMapPass({
            depthShader: fault === 'wrong-resource' ? ({} as ShaderModule) : shader
          })
      ).toThrow(fault === 'disposed' ? ResourceDisposedError : InvalidDirectionalShadowError)
    }
  )
})

describe('ShadowMapPass owned material cleanup progress', () => {
  /** 通过真实 draw submission 借到自有 Material，避免突破 private 字段。 */
  it('Material 任务失败后 Pass 保持关闭，后续继续同一任务', () => {
    const f = fixture()
    const context = f.build()
    f.pass.execute(context)
    const material = f.backend.submissions[0]!.item.material
    let attempts = 0
    material.onDispose(() => {
      if (++attempts === 1) throw new Error('material')
    })
    expect(() => f.pass.dispose()).toThrow()
    expect(() => f.pass.execute(context)).toThrow(ResourceDisposedError)
    f.pass.dispose()
    f.pass.dispose()
    expect(material.cleanupState).toBe('complete')
    expect(attempts).toBe(2)
    expect(f.shader.disposed).toBe(false)
  })
})

it('C5 rejects shadow publication if the epoch changes during scope exit', () => {
  const f = fixture()
  f.backend.onLeave = () => {
    f.backend.ready = false
    f.backend.ready = true
  }
  expect(() => f.pass.execute(f.build())).toThrow(InvalidDirectionalShadowError)
  expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
})
it('C5 validates the shadow immediately before a receiver samples its block', () => {
  const f = fixture()
  const context = f.build()
  f.pass.execute(context)
  const receiver = new ForwardPass((frame) => f.shadow.prepareSampling(frame))
  const zero = Array(16).fill(0)
  f.backend.onDraw = () => expect(matrix(f.shadow)).not.toEqual(zero)
  receiver.execute(context)
  // Recover after ForwardPass has entered the framebuffer boundary but before receiver draw.
  f.backend.onEnter = () => {
    f.backend.ready = false
    f.backend.ready = true
  }
  f.backend.onDraw = () => expect(matrix(f.shadow)).toEqual(zero)
  receiver.execute(context)
  f.backend.onDraw = f.backend.onEnter = undefined
  const next = f.build()
  f.pass.execute(next)
  f.backend.onDraw = () => expect(matrix(f.shadow)).not.toEqual(zero)
  receiver.execute(next)
})

it.each(['frame', 'revision', 'block'] as const)(
  'C5 disables shadow sampling when the published %s changes',
  (change) => {
    const f = fixture()
    const frame = f.build()
    f.pass.execute(frame)
    expect(matrix(f.shadow)).not.toEqual(Array(16).fill(0))
    if (change === 'revision') f.shadow.prepareSize(16)
    if (change === 'block') f.shadow.block.set('uShadowBias', { type: 'float', value: 0.01 })
    f.shadow.prepareSampling(change === 'frame' ? f.build() : frame)
    expect(matrix(f.shadow)).toEqual(Array(16).fill(0))
  }
)
