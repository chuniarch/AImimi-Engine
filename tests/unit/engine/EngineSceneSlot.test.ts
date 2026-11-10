import { describe, expect, it } from 'vitest'

import { CleanupFailureError } from '@/rendering/core/errors'

import { EngineError } from '@/errors/EngineError/BaseError'
import { SceneHandoffError } from '@/errors/EngineError/SceneHandoffError'
import { EngineSceneSlot } from '@/engine/EngineSceneSlot'
import { Resource } from '@/rendering/core/Resource'
import { Group } from '@/rendering/scene/Group'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

/**
 * C0 保留 Scene → Resource → 原始 listener 失败的两层诊断，不能用宽松 toThrow
 * 取代原始 cause 身份/类型断言；场景交接和安装语义仍由下面各用例独立检查。
 */
function readCleanupListenerCause(cause: unknown): unknown {
  expect(cause).toBeInstanceOf(CleanupFailureError)
  const sceneFailure = cause as CleanupFailureError
  expect(sceneFailure.failures).toHaveLength(1)
  expect(sceneFailure.failures[0]!.phase).toBe('scene-reference')
  const resourceFailure = sceneFailure.failures[0]!.cause
  expect(resourceFailure).toBeInstanceOf(CleanupFailureError)
  const failures = (resourceFailure as CleanupFailureError).failures
  expect(failures).toHaveLength(1)
  expect(failures[0]!.phase).toBe('listener')
  return failures[0]!.cause
}

/** 使用真实 CPU 资源，观察 Scene 引用计数最终是否触发一次清理。 */
class CountedResource extends Resource {
  protected readonly resourceType = 'CountedResource'
  public cpuDisposals = 0

  protected override disposeCPUData(): void {
    this.cpuDisposals++
  }
}

/** 每次创建独立 Scene/Camera，避免测试之间共享可变场景树。 */
function createPair() {
  const scene = new Scene()
  const camera = new PerspectiveCamera({
    fovY: Math.PI / 4,
    aspect: 1,
    near: 0.1,
    far: 100
  })
  scene.add(camera)
  return { scene, camera }
}

/** 既检查领域错误类型，也检查原因，不能让任意 TypeError 满足断言。 */
function expectRejection(action: () => void, reason: SceneHandoffError['reason']): void {
  let received: unknown

  try {
    action()
  } catch (error: unknown) {
    received = error
  }

  expect(received).toBeInstanceOf(SceneHandoffError)
  expect((received as SceneHandoffError).reason).toBe(reason)
}

describe('EngineSceneSlot 场景所有权', () => {
  /** 配对包装不可修改，但被借用的场景对象仍然保持正常可变。 */
  it('接管完整配对，冻结包装而不是冻结场景', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()

    expect(slot.current).toBeNull()
    slot.setScene(pair.scene, pair.camera)

    expect(slot.current?.scene).toBe(pair.scene)
    expect(slot.current?.camera).toBe(pair.camera)
    expect(Object.isFrozen(slot.current)).toBe(true)
    expect(slot.lastCleanupFailure).toBeNull()

    pair.scene.name = 'Mary'
    expect(slot.current?.scene.name).toBe('Mary')
    expect(pair.scene.disposed).toBe(false)
    slot.dispose()
  })

  /** 若错误地只检查 camera.parent === scene，合法的分组相机就会被拒绝。 */
  it('接受位于多层 Group 下的相机', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const outer = new Group()
    const inner = new Group()
    inner.add(pair.camera)
    outer.add(inner)
    pair.scene.add(outer)

    slot.setScene(pair.scene, pair.camera)

    expect(slot.current?.camera).toBe(pair.camera)
    slot.dispose()
  })

  /** 失败发生在提交前：旧场景不能被提前释放，候选场景也不能被擅自释放。 */
  it('拒绝不属于候选场景的相机，并保持双方所有权不变', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    slot.setScene(previous.scene, previous.camera)
    const binding = slot.current

    expectRejection(() => slot.setScene(next.scene, previous.camera), 'camera-outside-scene')

    expect(slot.current).toBe(binding)
    expect(previous.scene.disposed).toBe(false)
    expect(next.scene.disposed).toBe(false)
    slot.dispose()
    next.scene.dispose()
  })

  /** 运行时边界不能仅依赖会被擦除的 TypeScript 类型。 */
  it('拒绝错误的 Scene 和 Camera 对象', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()

    expectRejection(() => slot.setScene(null as unknown as Scene, pair.camera), 'invalid-scene')
    expectRejection(() => slot.setScene(pair.scene, {} as PerspectiveCamera), 'invalid-camera')

    expect(slot.current).toBeNull()
    expect(pair.scene.disposed).toBe(false)
    slot.dispose()
    pair.scene.dispose()
  })

  /** 即使重新把 Camera 加到已释放的 Scene，也不能复活 Scene 生命周期。 */
  it('拒绝已释放的候选 Scene', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    pair.scene.dispose()

    expectRejection(() => slot.setScene(pair.scene, pair.camera), 'scene-disposed')
    expect(slot.current).toBeNull()
    slot.dispose()
  })

  /** 重复安装同一配对不是一次资源生命周期切换。 */
  it('重复安装同一配对保持包装身份且不释放资源', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const resource = pair.scene.retain(new CountedResource())
    slot.setScene(pair.scene, pair.camera)
    const binding = slot.current

    slot.setScene(pair.scene, pair.camera)

    expect(slot.current).toBe(binding)
    expect(resource.sceneReferenceCount).toBe(1)
    expect(resource.cpuDisposals).toBe(0)
    slot.dispose()
  })

  /** Camera 改变并不意味着 Scene 已经退出槽位。 */
  it('同一 Scene 更换 Camera 时不释放该 Scene', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const alternate = createPair()
    pair.scene.add(alternate.camera)
    slot.setScene(pair.scene, pair.camera)

    slot.setScene(pair.scene, alternate.camera)

    expect(slot.current?.camera).toBe(alternate.camera)
    expect(pair.scene.disposed).toBe(false)
    slot.dispose()
    alternate.scene.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-handoff]
   * 从真实资源释放回调中读取配对，验证“先提交，后清理”的可观察顺序。
   */
  it('旧场景清理回调只能观察到完整的新配对', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    const resource = previous.scene.retain(new CountedResource())
    let observed: unknown
    resource.onDispose(() => {
      observed = slot.current
    })
    slot.setScene(previous.scene, previous.camera)

    slot.setScene(next.scene, next.camera)

    expect(observed).toBe(slot.current)
    expect(slot.current?.scene).toBe(next.scene)
    expect(slot.current?.camera).toBe(next.camera)
    expect(previous.scene.disposed).toBe(true)
    expect(next.scene.disposed).toBe(false)
    expect(resource.cpuDisposals).toBe(1)
    slot.dispose()
  })

  /** 若实现先粗暴释放资源，新 Scene 借用的共享资源会提前消失。 */
  it('替换 Scene 只交还旧引用，最后清场景才真正释放共享资源', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    const shared = previous.scene.retain(new CountedResource())
    next.scene.retain(shared)
    slot.setScene(previous.scene, previous.camera)

    slot.setScene(next.scene, next.camera)

    expect(shared.sceneReferenceCount).toBe(1)
    expect(shared.disposed).toBe(false)
    slot.clearScene()
    expect(shared.sceneReferenceCount).toBe(0)
    expect(shared.cpuDisposals).toBe(1)
    slot.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-post-commit-cleanup]
   * 使用真实 Resource listener 制造失败；新场景不能因此被视为安装失败。
   * cpuDisposals=0 同时提醒：记录错误不等于完成剩余清理。
   */
  it('旧场景清理抛错时保留新配对，并独立记录原始失败', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    const resource = previous.scene.retain(new CountedResource())
    const failure = new Error('listener failed')
    resource.onDispose(() => {
      throw failure
    })
    slot.setScene(previous.scene, previous.camera)

    expect(() => slot.setScene(next.scene, next.camera)).not.toThrow()

    expect(slot.current?.scene).toBe(next.scene)
    expect(next.scene.disposed).toBe(false)
    expect(slot.lastCleanupFailure).toEqual({
      operation: 'replace',
      sceneUuid: previous.scene.uuid,
      cause: expect.any(CleanupFailureError)
    })
    expect(readCleanupListenerCause(slot.lastCleanupFailure?.cause)).toBe(failure)
    expect(Object.isFrozen(slot.lastCleanupFailure)).toBe(true)
    expect(resource.cpuDisposals).toBe(0)

    const diagnostic = slot.lastCleanupFailure
    slot.clearScene()
    expect(slot.lastCleanupFailure).toBe(diagnostic)
    slot.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-detach-before-cleanup]
   * 如果 clearScene 先 dispose 后摘除，回调就会读到已退出的旧场景。
   */
  it('clearScene 在回调前摘除配对，重复清理无副作用', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const resource = pair.scene.retain(new CountedResource())
    const observed: unknown[] = []
    resource.onDispose(() => observed.push(slot.current))
    slot.setScene(pair.scene, pair.camera)

    slot.clearScene()
    slot.clearScene()

    expect(observed).toEqual([null])
    expect(resource.cpuDisposals).toBe(1)
    expect(slot.disposed).toBe(false)
    slot.dispose()
  })

  /** 清场景与关闭槽位是两个操作；清场景之后仍然可以再次进入 HW2。 */
  it('clearScene 后允许再次接管场景', () => {
    const slot = new EngineSceneSlot()
    const first = createPair()
    const second = createPair()
    slot.setScene(first.scene, first.camera)
    slot.clearScene()

    slot.setScene(second.scene, second.camera)

    expect(slot.current?.scene).toBe(second.scene)
    expect(second.scene.disposed).toBe(false)
    slot.dispose()
  })

  /** 清理失败也不能把原 Scene 重新挂回当前槽位。 */
  it('clearScene 清理失败时保持空槽位，并记录 clear 诊断', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const resource = pair.scene.retain(new CountedResource())
    const failure = new Error('clear failed')
    resource.onDispose(() => {
      throw failure
    })
    slot.setScene(pair.scene, pair.camera)

    expect(() => slot.clearScene()).not.toThrow()

    expect(slot.current).toBeNull()
    expect(slot.lastCleanupFailure?.operation).toBe('clear')
    expect(readCleanupListenerCause(slot.lastCleanupFailure?.cause)).toBe(failure)
    slot.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-handoff]
   * 释放回调同步调用 setScene/clearScene/dispose，不能夺走刚接管的新 Scene。
   */
  it('拒绝替换期间的同步重入，并在结束后解除保护', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    const nested = createPair()
    const resource = previous.scene.retain(new CountedResource())
    const reasons: string[] = []
    resource.onDispose(() => {
      for (const action of [
        () => slot.setScene(nested.scene, nested.camera),
        () => slot.clearScene(),
        () => slot.dispose()
      ]) {
        try {
          action()
        } catch (error: unknown) {
          if (!(error instanceof SceneHandoffError)) throw error
          reasons.push(error.reason)
        }
      }
    })
    slot.setScene(previous.scene, previous.camera)

    slot.setScene(next.scene, next.camera)

    expect(reasons).toEqual([
      'transition-in-progress',
      'transition-in-progress',
      'transition-in-progress'
    ])
    expect(slot.current?.scene).toBe(next.scene)
    expect(nested.scene.disposed).toBe(false)
    expect(slot.lastCleanupFailure).toBeNull()

    slot.setScene(nested.scene, nested.camera)
    expect(next.scene.disposed).toBe(true)
    expect(slot.current?.scene).toBe(nested.scene)
    slot.dispose()
  })

  /** 即使回调没有捕获重入错误，也不能让外层已完成的安装变成拒绝。 */
  it('未捕获的重入错误成为旧场景清理诊断，而不是外层安装错误', () => {
    const slot = new EngineSceneSlot()
    const previous = createPair()
    const next = createPair()
    const resource = previous.scene.retain(new CountedResource())
    resource.onDispose(() => slot.clearScene())
    slot.setScene(previous.scene, previous.camera)

    expect(() => slot.setScene(next.scene, next.camera)).not.toThrow()

    expect(slot.current?.scene).toBe(next.scene)
    expect(readCleanupListenerCause(slot.lastCleanupFailure?.cause)).toBeInstanceOf(
      SceneHandoffError
    )
    slot.dispose()
  })

  /** 永久关闭后拒绝新配对；拒绝不能代替调用者释放未交出的候选 Scene。 */
  it('dispose 永久关闭槽位，并且幂等', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const candidate = createPair()
    const resource = pair.scene.retain(new CountedResource())
    slot.setScene(pair.scene, pair.camera)

    slot.dispose()
    slot.dispose()
    slot.clearScene()

    expect(slot.current).toBeNull()
    expect(slot.disposed).toBe(true)
    expect(resource.cpuDisposals).toBe(1)
    expectRejection(() => slot.setScene(candidate.scene, candidate.camera), 'slot-disposed')
    expect(candidate.scene.disposed).toBe(false)
    candidate.scene.dispose()
  })

  /** dispose 必须先关闭槽位，再执行可以回调用户代码的 Scene 清理。 */
  it('dispose 回调观察到关闭状态，递归 dispose 无副作用', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const resource = pair.scene.retain(new CountedResource())
    const observed: unknown[] = []
    resource.onDispose(() => {
      observed.push(slot.current, slot.disposed)
      slot.dispose()
    })
    slot.setScene(pair.scene, pair.camera)

    slot.dispose()

    expect(observed).toEqual([null, true])
    expect(resource.cpuDisposals).toBe(1)
    expect(slot.lastCleanupFailure).toBeNull()
  })

  /** 关闭过程失败仍然是“槽位已关闭，资源清理失败”，不能偷偷重新启用。 */
  it('dispose 清理失败时保留关闭状态及诊断', () => {
    const slot = new EngineSceneSlot()
    const pair = createPair()
    const resource = pair.scene.retain(new CountedResource())
    const failure = new Error('dispose failed')
    resource.onDispose(() => {
      throw failure
    })
    slot.setScene(pair.scene, pair.camera)

    expect(() => slot.dispose()).not.toThrow()

    expect(slot.current).toBeNull()
    expect(slot.disposed).toBe(true)
    expect(slot.lastCleanupFailure?.operation).toBe('dispose')
    expect(readCleanupListenerCause(slot.lastCleanupFailure?.cause)).toBe(failure)
  })

  /** 新领域错误保持项目统一的错误分类与冻结诊断约定。 */
  it('SceneHandoffError 继承 EngineError 并保存稳定诊断', () => {
    const error = new SceneHandoffError('camera-outside-scene', {
      sceneUuid: 'scene-for-diagnostics'
    })

    expect(error).toBeInstanceOf(EngineError)
    expect(error.code).toBe('SCENE_HANDOFF_REJECTED')
    expect(error.context?.reason).toBe('camera-outside-scene')
    expect(Object.isFrozen(error.context)).toBe(true)
  })
})
