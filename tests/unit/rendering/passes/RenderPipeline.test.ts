import { describe, expect, it } from 'vitest'

import { ResourceDisposedError } from '@/rendering/core/errors'
import { RenderExecutionError } from '@/rendering/core/errors/RenderExecutionError'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { createRenderFixture, RecordingBackend } from '../helpers/createRenderFixture'

/** 构造真实 CPU 帧；只替换 Backend 边界。 */
function context(): RenderPassContext {
  const f = createRenderFixture()
  const built = new RenderListBuilder().build(f.view)

  return {
    frame: f.frame,
    view: built.viewState,
    renderList: built.renderList,
    backend: new RecordingBackend()
  }
}

/** 事件是 Pipeline 调用协议的可观察输出，不读取其私有数组。 */
function pass(name: string, events: string[]): RenderPass {
  return {
    name,

    execute: () => {
      events.push('execute-' + name)
    },

    dispose: () => {
      events.push('dispose-' + name)
    }
  }
}

describe('RenderPipeline', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][pipeline-pass-ownership]
   *
   * remove 必须立即释放；
   * 最后 dispose 不能再次释放已经移除的实例。
   */
  it('按登记顺序执行，remove 立即释放，dispose 按剩余顺序且幂等', () => {
    const events: string[] = []
    const a = pass('a', events)
    const b = pass('b', events)
    const pipeline = new RenderPipeline()

    pipeline.addPass(a)
    pipeline.addPass(b)
    pipeline.execute(context())

    expect(pipeline.removePass(a)).toBe(true)
    expect(pipeline.removePass(a)).toBe(false)

    pipeline.execute(context())
    pipeline.dispose()
    pipeline.dispose()

    expect(events).toEqual(['execute-a', 'execute-b', 'dispose-a', 'execute-b', 'dispose-b'])
  })

  /** 检查重复登记与生命周期；不能仅凭 Pass.name 去重。 */
  it('拒绝同一实例重复加入、移除后重新加入及释放后的使用', () => {
    const pipeline = new RenderPipeline()
    const a = pass('same-name', [])

    pipeline.addPass(a)
    pipeline.addPass(pass('same-name', []))

    expect(() => pipeline.addPass(a)).toThrow(RenderExecutionError)

    pipeline.removePass(a)

    expect(() => pipeline.addPass(a)).toThrow(RenderExecutionError)

    pipeline.dispose()

    expect(() => pipeline.addPass(pass('b', []))).toThrow(ResourceDisposedError)
    expect(() => pipeline.execute(context())).toThrow(ResourceDisposedError)
  })

  /** 若 finally 忘记复位 busy，第一次异常会永久阻止后续 render。 */
  it('执行失败停止后续 Pass，但允许修复后执行新一帧', () => {
    const events: string[] = []
    let fail = true
    const failure = new Error('pass failed')
    const pipeline = new RenderPipeline()

    pipeline.addPass({
      name: 'a',

      execute: () => {
        if (fail) throw failure
        events.push('execute-a')
      },

      dispose: () => {}
    })

    pipeline.addPass(pass('b', events))

    expect(() => pipeline.execute(context())).toThrow(failure)
    expect(events).toEqual([])

    fail = false
    pipeline.execute(context())

    expect(events).toEqual(['execute-a', 'execute-b'])
  })

  /** 防止遍历过程中跳过、重复或释放正在执行的 Pass。 */
  it('拒绝 execute 内同步修改、释放或重入 Pipeline', () => {
    const pipeline = new RenderPipeline()
    let visits = 0

    const guard: RenderPass = {
      name: 'guard',

      execute: (ctx) => {
        visits++

        expect(() => pipeline.addPass(pass('late', []))).toThrow(RenderExecutionError)

        expect(() => pipeline.removePass(guard)).toThrow(RenderExecutionError)

        expect(() => pipeline.dispose()).toThrow(RenderExecutionError)

        expect(() => pipeline.execute(ctx)).toThrow(RenderExecutionError)
      },

      dispose: () => {}
    }

    pipeline.addPass(guard)
    pipeline.execute(context())

    // 如果 Pipeline 根本没调用 Pass，不能让内部断言“没有执行也算通过”。
    expect(visits).toBe(1)

    pipeline.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-dispose-retry-order]
   *
   * 重试必须保留失败项及后续项，跳过已经释放成功的项。
   */
  it('dispose 失败保留清理进度并禁止恢复 execute', () => {
    const events: string[] = []
    const pipeline = new RenderPipeline()
    let fail = true
    const failure = new Error('cleanup failed')

    pipeline.addPass(pass('a', events))

    pipeline.addPass({
      name: 'b',
      execute: () => {},

      dispose: () => {
        events.push('dispose-b')
        if (fail) throw failure
      }
    })

    pipeline.addPass(pass('c', events))

    expect(() => pipeline.dispose()).toThrow(failure)

    expect(events).toEqual(['dispose-a', 'dispose-b'])

    expect(() => pipeline.execute(context())).toThrow(ResourceDisposedError)

    fail = false

    pipeline.dispose()
    pipeline.dispose()

    expect(events).toEqual(['dispose-a', 'dispose-b', 'dispose-b', 'dispose-c'])
  })

  /** remove 失败不能丢掉该 Pass 的所有权，也不能继续执行部分释放的 Pipeline。 */
  it('remove 释放失败后只能通过 dispose 完成清理', () => {
    const events: string[] = []
    const pipeline = new RenderPipeline()
    let fail = true
    const failure = new Error('remove failed')

    const a: RenderPass = {
      name: 'a',
      execute: () => {},

      dispose: () => {
        events.push('dispose-a')
        if (fail) throw failure
      }
    }

    pipeline.addPass(a)

    expect(() => pipeline.removePass(a)).toThrow(failure)

    expect(() => pipeline.execute(context())).toThrow(ResourceDisposedError)

    fail = false
    pipeline.dispose()

    expect(events).toEqual(['dispose-a', 'dispose-a'])
  })
})
