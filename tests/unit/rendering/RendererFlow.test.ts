import { afterEach, describe, expect, it, vi } from 'vitest'

import { Renderer } from '@/rendering/Renderer'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { RenderExecutionError } from '@/rendering/core/errors/RenderExecutionError'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Group } from '@/rendering/scene/Group'
import { createRenderFixture, RecordingBackend } from './helpers/createRenderFixture'

/**
 * 组装真实的上层渲染链；仅替换通向设备的 Backend 边界。
 *
 * 不把 Scene/Camera/Builder/Pipeline/ForwardPass 替换成空 mock。
 * passes 默认只有 ForwardPass；换 Pipeline 的用例在它前面插入记录型 Pass。
 */
function createFlow(
  backend: RecordingBackend = new RecordingBackend(),
  passes: readonly RenderPass[] = [new ForwardPass()]
) {
  const fixture = createRenderFixture()
  const builder = new RenderListBuilder()
  const pipeline = new RenderPipeline()

  for (const pass of passes) pipeline.addPass(pass)

  const renderer = new Renderer(backend, pipeline, builder)

  return {
    ...fixture,
    backend,
    builder,
    pipeline,
    renderer
  }
}

/** 只记录执行和释放顺序的 Pass；不 draw，所以不改变 Backend 的 scope 计数。 */
function probe(name: string, events: string[]): RenderPass {
  return {
    name,
    execute: () => {
      events.push(name + ':execute')
    },
    dispose: () => {
      events.push(name + ':dispose')
    }
  }
}

/** spy 只记录真实 build 的调用，测试结束后恢复，避免污染后续用例。 */
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Renderer → Builder → Pipeline → ForwardPass 联合契约', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]
   * [DESIGN-WEIGHT:3][forward-scope-and-queue-order]
   *
   * parent x=10、两个 Mesh local x=2/9，
   * 模型世界位置应为 12/19。
   *
   * 相机 world z=5，view 平移应为 -5。
   * 背景最后加入 Scene，但提交时必须排在 opaque 前面。
   */
  it('从场景提取一次并提交正确的队列、世界矩阵和相机快照', () => {
    const f = createFlow()
    const build = vi.spyOn(f.builder, 'build')

    const parent = new Group()
    const a = f.mesh()
    const b = f.mesh()
    const background = f.mesh('background')

    parent.transform.setPosition([10, 0, 0])
    a.transform.setPosition([2, 0, 0])
    b.transform.setPosition([9, 0, 0])
    f.camera.transform.setPosition([0, 0, 5])

    parent.add(a, b)
    f.scene.add(parent, background)

    f.renderer.render(f.view)

    expect(build).toHaveBeenCalledTimes(1)

    expect(f.backend.scopes).toEqual([
      {
        surface: {
          kind: 'default-framebuffer'
        },
        clear: {
          color: [0, 0, 0, 1],
          depth: 1
        }
      }
    ])

    expect(f.backend.submissions.map((entry) => entry.item.material)).toEqual([
      background.material,
      a.material,
      b.material
    ])

    expect(f.backend.submissions.map((entry) => entry.item.worldMatrix[12])).toEqual([0, 12, 19])

    const viewState = f.backend.submissions[0]!.view

    for (const submission of f.backend.submissions) {
      expect(submission.view).toBe(viewState)

      expect(submission.view.cameraWorldPosition).toEqual([0, 0, 5])

      expect(submission.view.viewMatrix[14]).toBe(-5)

      expect(submission.item.geometry).toBe(f.geometry)
    }

    expect(f.backend.events).toEqual(['enter', 'draw', 'draw', 'draw', 'leave'])

    f.renderer.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][frame-item-value-reference-boundary]
   *
   * 第二帧同时换 Mesh、改相机，
   * 防止实现错误地缓存第一帧列表或复用可变矩阵。
   *
   * Backend 中保留的旧 submission 是测试观察值，
   * 不代表生产 Backend 必须长期保存它。
   */
  it('下一帧重新提取当前场景，但不会污染上一帧已经提交的值', () => {
    const f = createFlow()
    const build = vi.spyOn(f.builder, 'build')

    const firstMesh = f.mesh()
    firstMesh.transform.setPosition([1, 0, 0])
    f.camera.transform.setPosition([0, 0, 5])
    f.scene.add(firstMesh)

    f.renderer.render(f.view)

    expect(f.backend.submissions).toHaveLength(1)

    const first = f.backend.submissions[0]!

    firstMesh.removeFromParent()

    const secondMesh = f.mesh()
    secondMesh.transform.setPosition([4, 0, 0])
    f.scene.add(secondMesh)

    f.camera.transform.setPosition([0, 0, 9])
    f.frame.frameNumber = 2

    f.renderer.render(f.view)

    expect(f.backend.submissions).toHaveLength(2)

    const second = f.backend.submissions[1]!

    expect(build).toHaveBeenCalledTimes(2)
    expect(f.backend.scopes).toHaveLength(2)

    expect(first.item.material).toBe(firstMesh.material)
    expect(first.item.worldMatrix[12]).toBe(1)
    expect(first.view.cameraWorldPosition).toEqual([0, 0, 5])

    expect(second.item.material).toBe(secondMesh.material)
    expect(second.item.worldMatrix[12]).toBe(4)
    expect(second.view.cameraWorldPosition).toEqual([0, 0, 9])

    expect(second.view).not.toBe(first.view)
    expect(second.item.worldMatrix).not.toBe(first.item.worldMatrix)

    f.renderer.dispose()
  })

  /**
   * not-ready 必须在整个链入口生效；
   * ready 再次为 true 后可以开始新一帧。
   *
   * 这里只模拟 ready 状态，
   * 不模拟或证明真实 WebGL context 的恢复过程。
   */
  it('未 ready 时不提取或提交，重新 ready 后正常执行', () => {
    const f = createFlow()
    const build = vi.spyOn(f.builder, 'build')

    f.scene.add(f.mesh())
    f.backend.ready = false

    f.renderer.render(f.view)

    expect(build).not.toHaveBeenCalled()
    expect(f.backend.scopes).toHaveLength(0)
    expect(f.backend.submissions).toHaveLength(0)

    f.backend.ready = true

    f.renderer.render(f.view)

    expect(build).toHaveBeenCalledTimes(1)
    expect(f.backend.scopes).toHaveLength(1)
    expect(f.backend.submissions).toHaveLength(1)

    f.renderer.dispose()
  })

  /**
   * 让第二个 draw 失败：
   * 第三个必须不执行，原错误必须穿过全部编排层。
   *
   * 关闭故障后再次 render，
   * 验证 Renderer/Pipeline 的 busy 均已复位。
   *
   * RecordingBackend 的 leave 事件
   * 不等于真实 FBO/viewport 恢复验收。
   */
  it('中途 draw 失败停止本帧，修复后下一帧可以重新提交完整列表', () => {
    const failure = new Error('second draw failed')

    class FailingBackend extends RecordingBackend {
      fail = true
      attempts = 0

      /** 先记录一次提交尝试，再在第二次尝试时注入可控制的失败。 */
      override draw(submission: DrawSubmission): void {
        this.attempts++
        super.draw(submission)

        if (this.fail && this.attempts === 2) {
          throw failure
        }
      }
    }

    const backend = new FailingBackend()
    const f = createFlow(backend)
    const build = vi.spyOn(f.builder, 'build')

    f.scene.add(f.mesh(), f.mesh(), f.mesh())

    let received: unknown

    try {
      f.renderer.render(f.view)
    } catch (error) {
      received = error
    }

    // 比较错误对象身份，不只是比较错误消息。
    expect(received).toBe(failure)

    expect(backend.attempts).toBe(2)

    expect(backend.events).toEqual(['enter', 'draw', 'draw', 'leave'])

    expect(f.geometry.disposed).toBe(false)

    backend.fail = false

    f.renderer.render(f.view)

    expect(build).toHaveBeenCalledTimes(2)
    expect(backend.attempts).toBe(5)
    expect(backend.scopes).toHaveLength(2)
    expect(backend.submissions).toHaveLength(5)

    expect(backend.events).toEqual([
      'enter',
      'draw',
      'draw',
      'leave',

      'enter',
      'draw',
      'draw',
      'draw',
      'leave'
    ])

    f.renderer.dispose()
  })
})

describe('Renderer.replacePipeline 与真实链', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][renderer-pipeline-replacement]
   *
   * 换上的 Pipeline 从下一帧开始执行；返回的旧 Pipeline 没被释放，所有权回到调用者。
   * Renderer.dispose 只释放最后装着的那一条，旧 Pass 不会被释放两次。
   */
  it('返回旧 Pipeline 且不释放，下一帧按新顺序执行', () => {
    const f = createFlow()
    const events: string[] = []
    f.scene.add(f.mesh())
    f.renderer.render(f.view)

    const next = new RenderPipeline()
    next.addPass(probe('ShadowMapPass', events))
    next.addPass(new ForwardPass())

    const previous = f.renderer.replacePipeline(next)
    expect(previous).toBe(f.pipeline)

    // 已释放的 Pipeline 会拒绝 addPass；能加说明旧的仍是 active，等调用者处理。
    previous.addPass(probe('old-extra', events))

    f.renderer.render(f.view)

    expect(events).toEqual(['ShadowMapPass:execute'])
    expect(f.backend.scopes).toHaveLength(2)
    expect(f.backend.submissions).toHaveLength(2)

    previous.dispose()
    f.renderer.dispose()

    expect(events).toEqual(['ShadowMapPass:execute', 'old-extra:dispose', 'ShadowMapPass:dispose'])
    expect(f.backend.events.at(-1)).toBe('backend-dispose')
  })

  /**
   * 帧中途换 Pipeline 会让同一帧的后半段跑在另一条上；必须拒绝。
   * 当前帧照常完成，下一帧仍执行原来的 Pipeline，被拒的那条既不执行也不释放。
   */
  it('渲染中 replacePipeline 被拒，当前帧与当前 Pipeline 不变', () => {
    const events: string[] = []
    const rejected: unknown[] = []
    const candidate = new RenderPipeline()
    candidate.addPass(probe('candidate', events))

    // 先建链再登记 Pass，guard 才能引用同一个 Renderer。
    const f = createFlow(new RecordingBackend(), [])
    const guard: RenderPass = {
      name: 'guard',
      execute: () => {
        events.push('guard:execute')
        try {
          f.renderer.replacePipeline(candidate)
        } catch (error) {
          rejected.push(error)
        }
      },
      dispose: () => {}
    }

    f.pipeline.addPass(guard)
    f.pipeline.addPass(new ForwardPass())
    f.scene.add(f.mesh())

    f.renderer.render(f.view)

    expect(rejected).toHaveLength(1)
    expect(rejected[0]).toBeInstanceOf(RenderExecutionError)
    expect(f.backend.events).toEqual(['enter', 'draw', 'leave'])

    f.renderer.render(f.view)

    expect(events).toEqual(['guard:execute', 'guard:execute'])
    expect(f.backend.scopes).toHaveLength(2)

    f.renderer.dispose()
    expect(events).not.toContain('candidate:dispose')
    candidate.dispose()
  })

  /** 传入当前那条：调用者随后释放「旧的」就会拆掉正在用的 Pipeline。 */
  it('拒绝传入当前 Pipeline，拒绝后照常渲染', () => {
    const f = createFlow()
    f.scene.add(f.mesh())

    expect(() => f.renderer.replacePipeline(f.pipeline)).toThrow(RenderExecutionError)

    f.renderer.render(f.view)
    expect(f.backend.submissions).toHaveLength(1)
    f.renderer.dispose()
  })

  /**
   * closing 只允许重试 dispose：此时换进来的 Pipeline 没人会释放，也会让重试释放错的那条。
   * 拒绝后重试 dispose 释放的仍是原来那条；disposed 之后同样拒绝。
   */
  it('closing 与 disposed 时拒绝，候选 Pipeline 不被接管', () => {
    const events: string[] = []
    let fail = true
    const owned: RenderPass = {
      name: 'owned',
      execute: () => {},
      dispose: () => {
        events.push('owned:dispose')
        if (fail) throw new Error('pass cleanup failed')
      }
    }
    const f = createFlow(new RecordingBackend(), [owned])
    const candidate = new RenderPipeline()
    candidate.addPass(probe('candidate', events))

    expect(() => f.renderer.dispose()).toThrow('pass cleanup failed')
    expect(() => f.renderer.replacePipeline(candidate)).toThrow(ResourceDisposedError)

    fail = false
    f.renderer.dispose()
    expect(() => f.renderer.replacePipeline(candidate)).toThrow(ResourceDisposedError)

    expect(events).toEqual(['owned:dispose', 'owned:dispose'])
    candidate.dispose()
    expect(events).toEqual(['owned:dispose', 'owned:dispose', 'candidate:dispose'])
  })
})
