import { describe, expect, it } from 'vitest'

import { Renderer } from '@/rendering/Renderer'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { RenderExecutionError } from '@/rendering/core/errors/RenderExecutionError'
import { RenderListBuilder, type RenderListBuildResult } from '@/rendering/frame/RenderListBuilder'
import type { RenderView } from '@/rendering/frame/RenderView'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { createRenderFixture, RecordingBackend } from './helpers/createRenderFixture'

/** 记录次数但执行真实提取，不用空 mock 掩盖 Scene/Camera 读取行为。 */
class CountingBuilder extends RenderListBuilder {
  calls = 0

  override build(view: RenderView): RenderListBuildResult {
    this.calls++
    return super.build(view)
  }
}

describe('Renderer', () => {
  /** 已释放 Scene 是探针：若 not-ready 仍提取，它必然报错。 */
  it('Backend 未 ready 时跳过 Builder 和 Pipeline', () => {
    const f = createRenderFixture()
    f.scene.dispose()

    const backend = new RecordingBackend()
    backend.ready = false

    const builder = new CountingBuilder()
    const pipeline = new RenderPipeline()
    let executed = false

    pipeline.addPass({
      name: 'probe',

      execute: () => {
        executed = true
      },

      dispose: () => {}
    })

    new Renderer(backend, pipeline, builder).render(f.view)

    expect(builder.calls).toBe(0)
    expect(executed).toBe(false)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]
   *
   * 第一个 Pass 修改原输入；
   * 第二个仍须读到相同 context 和之前提取的值。
   */
  it('每次只提取一次，共享冻结 context，并且不保留上次 Scene', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()

    mesh.transform.setPosition([2, 0, 0])
    f.scene.add(mesh)

    const pipeline = new RenderPipeline()
    const builder = new CountingBuilder()
    const contexts: RenderPassContext[] = []

    pipeline.addPass({
      name: 'first',

      execute: (ctx) => {
        contexts.push(ctx)

        mesh.transform.setPosition([9, 0, 0])
        f.camera.transform.setPosition([5, 0, 0])
        f.frame.timeSeconds = 99
      },

      dispose: () => {}
    })

    pipeline.addPass({
      name: 'second',

      execute: (ctx) => {
        contexts.push(ctx)
      },

      dispose: () => {}
    })

    const renderer = new Renderer(new RecordingBackend(), pipeline, builder)

    renderer.render(f.view)

    expect(builder.calls).toBe(1)
    expect(contexts[0]).toBe(contexts[1])

    expect(contexts[1]!.renderList.opaque[0]!.worldMatrix[12]).toBe(2)

    expect(contexts[1]!.view.cameraWorldPosition).toEqual([0, 0, 0])

    expect(contexts[1]!.frame.timeSeconds).toBe(1)
    expect(contexts[1]!.frame).not.toBe(f.frame)
    expect(Object.isFrozen(contexts[1])).toBe(true)
    expect(Object.isFrozen(contexts[1]!.frame)).toBe(true)

    renderer.render(createRenderFixture().view)

    expect(builder.calls).toBe(2)
    expect(contexts[2]!.renderList.opaque).toHaveLength(0)
    expect(contexts[2]).not.toBe(contexts[0])
  })

  /** 提取异常不能进入 Pipeline；修复输入后仍可使用同一个 Renderer。 */
  it('提取失败原样传播且可开始后续正常帧', () => {
    const f = createRenderFixture()
    const pipeline = new RenderPipeline()
    let count = 0

    pipeline.addPass({
      name: 'probe',

      execute: () => {
        count++
      },

      dispose: () => {}
    })

    const renderer = new Renderer(new RecordingBackend(), pipeline, new RenderListBuilder())

    f.camera.transform.setScale([0, 1, 1])

    expect(() => renderer.render(f.view)).toThrow(InvalidRenderViewError)

    expect(count).toBe(0)

    f.camera.transform.setScale([1, 1, 1])
    renderer.render(f.view)

    expect(count).toBe(1)
  })

  /** 不允许 Pass 在当前帧内部开始嵌套 render 或拆掉正在使用的 Backend。 */
  it('拒绝 render 中重入和 dispose', () => {
    let visits = 0
    const f = createRenderFixture()
    const pipeline = new RenderPipeline()

    const renderer = new Renderer(new RecordingBackend(), pipeline, new RenderListBuilder())

    pipeline.addPass({
      name: 'guard',

      execute: () => {
        visits++

        expect(() => renderer.render(f.view)).toThrow(RenderExecutionError)

        expect(() => renderer.dispose()).toThrow(RenderExecutionError)
      },

      dispose: () => {}
    })

    renderer.render(f.view)

    expect(visits).toBe(1)

    renderer.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-dispose-retry-order]
   *
   * Pipeline 未释放成功前 Backend 必须继续存活，
   * 避免清理顺序倒置。
   */
  it('先 Pipeline 后 Backend，清理失败可以显式重试，成功后幂等', () => {
    const f = createRenderFixture()
    const backend = new RecordingBackend()
    const pipeline = new RenderPipeline()
    let fail = true
    const failure = new Error('cleanup failed')

    pipeline.addPass({
      name: 'owned',
      execute: () => {},

      dispose: () => {
        backend.events.push('pass-dispose')
        if (fail) throw failure
      }
    })

    const renderer = new Renderer(backend, pipeline, new RenderListBuilder())

    expect(() => renderer.dispose()).toThrow(failure)

    expect(backend.events).toEqual(['pass-dispose'])

    expect(() => renderer.render(f.view)).toThrow(ResourceDisposedError)

    fail = false

    renderer.dispose()
    renderer.dispose()

    expect(backend.events).toEqual(['pass-dispose', 'pass-dispose', 'backend-dispose'])

    expect(f.geometry.disposed).toBe(false)
    expect(f.scene.disposed).toBe(false)
  })

  /** Backend 失败后的重试不能再次释放已经清理完成的 Pass。 */
  it('Backend 清理失败后保留依赖并允许重试', () => {
    let fail = true
    const failure = new Error('backend cleanup failed')

    class RetryBackend extends RecordingBackend {
      override dispose(): void {
        this.events.push('backend-attempt')

        if (fail) throw failure

        super.dispose()
      }
    }

    const backend = new RetryBackend()
    const pipeline = new RenderPipeline()

    pipeline.addPass({
      name: 'owned',
      execute: () => {},

      dispose: () => {
        backend.events.push('pass-dispose')
      }
    })

    const renderer = new Renderer(backend, pipeline, new RenderListBuilder())

    expect(() => renderer.dispose()).toThrow(failure)

    fail = false
    renderer.dispose()

    expect(backend.events).toEqual([
      'pass-dispose',
      'backend-attempt',
      'backend-attempt',
      'backend-dispose'
    ])
  })

  /** Pass 执行异常也必须解除 Renderer 的 busy，不能只验证 Builder 失败路径。 */
  it('Pass 失败后 Renderer 仍可开始下一帧', () => {
    const f = createRenderFixture()
    const pipeline = new RenderPipeline()
    const failure = new Error('pass failed')
    let fail = true
    let visits = 0

    pipeline.addPass({
      name: 'retry',

      execute: () => {
        visits++
        if (fail) throw failure
      },

      dispose: () => {}
    })

    const renderer = new Renderer(new RecordingBackend(), pipeline, new RenderListBuilder())

    expect(() => renderer.render(f.view)).toThrow(failure)

    fail = false
    renderer.render(f.view)

    expect(visits).toBe(2)
  })
})
