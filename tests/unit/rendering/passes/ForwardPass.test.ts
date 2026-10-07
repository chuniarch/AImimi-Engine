import { describe, expect, it } from 'vitest'

import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import { createRenderFixture, RecordingBackend } from '../helpers/createRenderFixture'

describe('ForwardPass', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][forward-scope-and-queue-order]
   *
   * 先把 opaque 加入场景，
   * 以免错误地直接使用场景顺序也能通过测试。
   */
  it('入口包含 clear，先 background 后 opaque，并共享 ViewState', () => {
    const f = createRenderFixture()
    const opaque = f.mesh()
    const background = f.mesh('background')

    f.scene.add(opaque, background)

    const built = new RenderListBuilder().build(f.view)
    const backend = new RecordingBackend()

    new ForwardPass().execute({
      frame: f.frame,
      view: built.viewState,
      renderList: built.renderList,
      backend
    })

    expect(backend.scopes).toEqual([
      {
        surface: { kind: 'default-framebuffer' },
        clear: {
          color: [0, 0, 0, 1],
          depth: 1
        }
      }
    ])

    expect(backend.events).toEqual(['enter', 'draw', 'draw', 'leave'])

    expect(backend.submissions.map((entry) => entry.item.material)).toEqual([
      background.material,
      opaque.material
    ])

    for (const entry of backend.submissions) {
      expect(entry.view).toBe(built.viewState)
    }
  })

  /** 空场景也要清屏，否则上一帧图像会残留。 */
  it('空列表仍声明一次清屏', () => {
    const f = createRenderFixture()
    const built = new RenderListBuilder().build(f.view)
    const backend = new RecordingBackend()

    new ForwardPass().execute({
      frame: f.frame,
      view: built.viewState,
      renderList: built.renderList,
      backend
    })

    expect(backend.scopes).toHaveLength(1)
    expect(backend.scopes[0]!.clear).toEqual({
      color: [0, 0, 0, 1],
      depth: 1
    })
    expect(backend.submissions).toHaveLength(0)
  })

  /** 失败原样传播且不再提交后续 item；本测试不声称验证了真实 FBO 恢复。 */
  it('draw 抛错后立即停止后续提交', () => {
    const f = createRenderFixture()

    f.scene.add(f.mesh(), f.mesh())

    const built = new RenderListBuilder().build(f.view)
    const failure = new Error('draw failed')

    class FailingBackend extends RecordingBackend {
      override draw(submission: DrawSubmission): void {
        super.draw(submission)
        throw failure
      }
    }

    const backend = new FailingBackend()

    expect(() =>
      new ForwardPass().execute({
        frame: f.frame,
        view: built.viewState,
        renderList: built.renderList,
        backend
      })
    ).toThrow(failure)

    expect(backend.submissions).toHaveLength(1)
    expect(backend.events).toEqual(['enter', 'draw', 'leave'])
  })
})
