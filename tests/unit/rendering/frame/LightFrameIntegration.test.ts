import { describe, expect, it, vi } from 'vitest'
import { Renderer } from '@/rendering/Renderer'
import { InvalidLightError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { Light } from '@/rendering/scene/lights/Light'
import { Group } from '@/rendering/scene/Group'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import { createRenderFixture, RecordingBackend } from '../helpers/createRenderFixture'

/** 不依赖 GL；本批只验证 CPU 资源身份与按帧配置提取。 */
function createShadow(): DirectionalLightShadow {
  return new DirectionalLightShadow({
    label: 'frame/sun',
    mapSize: 512,
    halfExtent: 2,
    near: 0,
    far: 20,
    bias: 0.003
  })
}

describe('Light frame extraction and dispatch', () => {
  /** 没有灯的 HW2 不会被公共收集器自动塞进一盏默认太阳。 */
  it('空场景仍返回必填的冻结空 lights', () => {
    const f = createRenderFixture()
    const result = new RenderListBuilder().build(f.view)
    expect(result.lights).toEqual([])
    expect(Object.isFrozen(result.lights)).toBe(true)
  })

  /** 同一轮 DFS 分类 Mesh 与 Light；隐藏父节点排除子树，零强度不影响收集。 */
  it('一次可见遍历收集所有方向光，保留灯与队列的顺序', () => {
    const f = createRenderFixture()
    const first = new DirectionalLight()
    const dark = new DirectionalLight({ intensity: 0 })
    const hidden = new Group()
    hidden.visible = false
    hidden.add(new DirectionalLight(), f.mesh())
    const hiddenLight = new DirectionalLight()
    hiddenLight.visible = false
    const mesh = f.mesh()
    const sky = f.mesh('background')
    f.scene.add(first, sky, hidden, mesh, hiddenLight, dark)
    const traverse = vi.spyOn(f.scene, 'traverseVisible')
    const result = new RenderListBuilder().build(f.view)
    expect(traverse).toHaveBeenCalledTimes(1)
    expect(result.lights.map((light) => light.uuid)).toEqual([first.uuid, dark.uuid])
    expect(result.lights[1]!.radiance).toEqual([0, 0, 0])
    expect(result.renderList.opaque.map((item) => item.material)).toEqual([mesh.material])
    expect(result.renderList.background.map((item) => item.material)).toEqual([sky.material])
    traverse.mockRestore()
  })

  /** 共用一个相机数值快照，view 平移不进入方向，旋转则必须进入方向。 */
  it('相机旋转用于灯方向，world position 同时保留用于阴影视图', () => {
    const f = createRenderFixture()
    const sun = new DirectionalLight({ targetWorld: [0, 0, 0] })
    sun.transform.setPosition([0, 10, 0])
    f.scene.add(sun)
    f.camera.transform.setPosition([4, 5, 6])
    f.camera.transform.setRotation([0, 0, Math.PI / 2])
    const value = new RenderListBuilder().build(f.view).lights[0]!
    expect(value.positionWorld).toEqual([0, 10, 0])
    expect(value.directionToLightWorld).toEqual([0, 1, 0])
    expect(value.directionToLightView[0]).toBeCloseTo(1)
    expect(value.directionToLightView[1]).toBeCloseTo(0)
    expect(value.directionToLightView[2]).toBeCloseTo(0)
  })

  /** 未支持的 Light 不是 Group；静默忽略会让用户看见灯却永远没有光。 */
  it('拒绝尚未支持的 Light 子类，而不是静默丢弃', () => {
    class FutureLight extends Light {
      constructor() {
        super()
      }
      protected override get debugType(): string {
        return 'FutureLight'
      }
    }
    const f = createRenderFixture()
    f.scene.add(new FutureLight())
    expect(() => new RenderListBuilder().build(f.view)).toThrow(InvalidRenderViewError)
  })

  /**
   * Given 两个 Pass 共用本帧；When 第一个改原 Light、Mesh 和阴影设置；
   * Then 第二个仍看旧值，下一帧才看新值。检查值与引用，避免只检查 freeze。
   */
  it('两个 Pass 共用同一灯光快照；帧中修改只影响下一帧', () => {
    const f = createRenderFixture()
    const shadow = createShadow()
    const sun = new DirectionalLight({ shadow, castShadow: true })
    const mesh = f.mesh()
    mesh.castShadow = true
    f.scene.add(sun, mesh)
    const contexts: RenderPassContext[] = []
    const pipeline = new RenderPipeline()
    pipeline.addPass({
      name: 'edit',
      execute(context) {
        contexts.push(context)
        sun.setIntensity(4)
        sun.transform.setPosition([2, 0, 0])
        sun.castShadow = false
        shadow.setMapSize(1024)
        shadow.setBias(0.006)
        mesh.castShadow = false
      },
      dispose() {}
    })
    pipeline.addPass({
      name: 'read',
      execute(context) {
        contexts.push(context)
      },
      dispose() {}
    })
    const renderer = new Renderer(new RecordingBackend(), pipeline, new RenderListBuilder())
    renderer.render(f.view)
    const first = contexts[0]!
    const second = contexts[1]!
    expect(second.lights).toBe(first.lights)
    expect(second.lights[0]!.radiance).toEqual([1, 1, 1])
    expect(second.lights[0]!.positionWorld).toEqual([0, 0, 0])
    expect(second.lights[0]!.castShadow).toBe(true)
    expect(second.lights[0]!.shadow!.mapSize).toBe(512)
    expect(second.lights[0]!.shadow!.bias).toBe(0.003)
    expect(second.renderList.opaque[0]!.castShadow).toBe(true)
    expect(second.lights[0]!.shadow!.resource).toBe(shadow)
    expect(Object.isFrozen(first.lights)).toBe(true)
    renderer.render(f.view)
    const next = contexts[3]!
    expect(next.lights).not.toBe(first.lights)
    expect(next.lights[0]!.radiance).toEqual([4, 4, 4])
    expect(next.lights[0]!.positionWorld).toEqual([2, 0, 0])
    expect(next.lights[0]!.castShadow).toBe(false)
    expect(next.lights[0]!.shadow!.mapSize).toBe(1024)
    expect(next.lights[0]!.shadow!.bias).toBe(0.006)
    expect(next.renderList.opaque[0]!.castShadow).toBe(false)
    expect(shadow.target.width).toBe(512)
    expect(shadow.sceneReferenceCount).toBe(0)
    renderer.dispose()
    shadow.dispose()
  })

  /** 失败发生在提取阶段，不能先执行某个 Pass；修正后 finally 已解除 busy。 */
  it('开启阴影却没有资源时不执行 Pass，修正后同一个 Renderer 可以重试', () => {
    const f = createRenderFixture()
    const sun = new DirectionalLight({ castShadow: true })
    f.scene.add(sun)
    let calls = 0
    const pipeline = new RenderPipeline()
    pipeline.addPass({
      name: 'probe',
      execute() {
        calls++
      },
      dispose() {}
    })
    const renderer = new Renderer(new RecordingBackend(), pipeline, new RenderListBuilder())
    expect(() => renderer.render(f.view)).toThrow(InvalidLightError)
    expect(calls).toBe(0)
    sun.castShadow = false
    renderer.render(f.view)
    expect(calls).toBe(1)
  })

  /** 先收集有效灯再遇到坏灯，也不能发布半个结果或保留上次帧。 */
  it('方向退化时拒绝整帧，修复后重新收集', () => {
    const f = createRenderFixture()
    const good = new DirectionalLight()
    const bad = new DirectionalLight({ targetWorld: [0, 0, 0] })
    f.scene.add(good, bad)
    const builder = new RenderListBuilder()
    expect(() => builder.build(f.view)).toThrow(InvalidLightError)
    bad.setTargetWorld([0, -1, 0])
    expect(builder.build(f.view).lights.map((light) => light.uuid)).toEqual([good.uuid, bad.uuid])
  })

  /** not-ready 保留原有短路边界，不为了新灯光功能提前读 Scene。 */
  it('Backend 未 ready 时连非法灯光也不读取', () => {
    const f = createRenderFixture()
    f.scene.add(new DirectionalLight({ castShadow: true }))
    const backend = new RecordingBackend()
    backend.ready = false
    const builder = new RenderListBuilder()
    const build = vi.spyOn(builder, 'build')
    const pipeline = new RenderPipeline()
    let calls = 0
    pipeline.addPass({
      name: 'probe',
      execute() {
        calls++
      },
      dispose() {}
    })
    new Renderer(backend, pipeline, builder).render(f.view)
    expect(build).not.toHaveBeenCalled()
    expect(calls).toBe(0)
    build.mockRestore()
  })
})
