import { afterEach, describe, expect, it, vi } from 'vitest'

import { CleanupFailureError } from '@/rendering/core/errors'

import type { SceneSetup } from '@/engine/SceneSetup'
import { Resource } from '@/rendering/core/Resource'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { Scene } from '@/rendering/scene/Scene'
import type { Camera } from '@/rendering/scene/cameras/Camera'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import {
  HW2SceneController,
  type SceneHost,
  type HW2SceneFactory
} from '@/scenes/games202/hw2/HW2SceneController'
import type { HW2SceneBuildResult } from '@/scenes/games202/hw2/createHW2Scene'
import type { HW2ScenePreset } from '@/scenes/games202/hw2/types/HW2ScenePreset'

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

/** 手动决定加载完成顺序，不使用 setTimeout 猜测网络时序。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** 完整 preset；factory 边界被替换后不会下载这些测试 URL。 */
function preset(label: string): HW2ScenePreset {
  return {
    label,
    env: {
      dir: '/prt',
      cubeFaceUrls: ['/px', '/nx', '/py', '/ny', '/pz', '/nz'],
      cubeMapsize: 100
    },
    model: {
      path: '/models',
      name: 'mary',
      transportType: 'shadowed',
      meshTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [10, 10, 10]
      }
    },
    sh: {
      attributeLayout: [
        { name: 'aTransportSH0', size: 3 },
        { name: 'aTransportSH1', size: 3 },
        { name: 'aTransportSH2', size: 3 }
      ],
      vertShaderPath: '/prt.vert',
      fragShaderPath: '/prt.frag'
    },
    backgroundShader: {
      vertShaderPath: '/background.vert',
      fragShaderPath: '/background.frag'
    }
  }
}

/** 用真实 Resource 生命周期确认 Scene 清理，而不是只检查 dispose mock 次数。 */
class ProbeResource extends Resource {
  protected readonly resourceType = 'ProbeResource'
  cpuDisposals = 0

  protected override disposeCPUData(): void {
    this.cpuDisposals += 1
  }
}

/** 每次构建交付一个独立 Scene；不允许多个结果复用同一个 Scene。 */
function built(label: string) {
  const scene = new Scene()
  scene.name = label
  const camera = new PerspectiveCamera({
    fovY: Math.PI / 4,
    aspect: 1,
    near: 0.1,
    far: 100
  })
  scene.add(camera)
  const resource = scene.retain(new ProbeResource())
  return { scene, camera, resource }
}

/** 测试直接给 host 装一个「旧场景」；它不经过 Controller，所以不带 Pass。 */
function setupOf(entry: ReturnType<typeof built>): SceneSetup {
  return { scene: entry.scene, camera: entry.camera, passes: [] }
}

/**
 * 只实现 Controller 所需的同步交接协议，不模拟完整 Engine。
 * setScene 先替换整份安装，再清理旧 Scene；clearScene 先断开引用。
 * 被拒绝的安装也记下来，测试才能确认 Controller 交出的 Pass 由它自己释放。
 */
class Host implements SceneHost {
  current: { scene: Scene; camera: Camera; passes: readonly RenderPass[] } | null = null
  installations: string[] = []
  rejected: SceneSetup[] = []
  clearCalls = 0
  rejectInstall: unknown = null
  rejectClear: unknown = null

  setScene(setup: SceneSetup): void {
    if (this.rejectInstall !== null) {
      this.rejected.push(setup)
      throw this.rejectInstall
    }
    const previous = this.current
    this.current = { scene: setup.scene, camera: setup.camera, passes: setup.passes }
    this.installations.push(setup.scene.name)
    previous?.scene.dispose()
  }

  clearScene(): void {
    this.clearCalls += 1
    const previous = this.current
    this.current = null
    previous?.scene.dispose()
    if (this.rejectClear !== null) throw this.rejectClear
  }
}

/** 加载边界保留实际收到的 signal，让测试直接观察 Controller 的取消行为。 */
function setup() {
  const calls: {
    preset: HW2ScenePreset
    signal: AbortSignal
    work: ReturnType<typeof deferred<HW2SceneBuildResult>>
  }[] = []
  const factory: HW2SceneFactory = (input, signal) => {
    const work = deferred<HW2SceneBuildResult>()
    calls.push({ preset: input, signal, work })
    return work.promise
  }
  const host = new Host()
  const controller = new HW2SceneController(host, factory)
  return { calls, host, controller }
}

/** 原型上的 dispose spy 只服务于单个用例。 */
afterEach(() => {
  vi.restoreAllMocks()
})

describe('HW2SceneController', () => {
  /** 删除 setScene 调用或提早释放 next，都会破坏可观察的当前场景。 */
  it('成功后交付完整 scene/camera，清理责任转交 host', async () => {
    const { calls, host, controller } = setup()
    const input = preset('A')
    const next = built('A')
    const pending = controller.applyPreset(input)
    expect(calls[0]!.preset).toBe(input)
    calls[0]!.work.resolve(next)
    await pending

    expect(host.current?.scene).toBe(next.scene)
    expect(host.current?.camera).toBe(next.camera)
    expect(next.resource.disposed).toBe(false)
    controller.dispose()
    expect(next.resource.cpuDisposals).toBe(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-controller-latest-request]
   *
   * A 故意忽略取消，B 先完成；删除过期判断就会让 A 覆盖 B。
   */
  it('B 取消 A；B 先安装，迟到的 A 只被释放', async () => {
    const { calls, host, controller } = setup()
    const a = built('A')
    const b = built('B')
    const first = controller.applyPreset(preset('A'))
    const second = controller.applyPreset(preset('B'))
    expect(calls[0]!.signal.aborted).toBe(true)

    calls[1]!.work.resolve(b)
    await second
    calls[0]!.work.resolve(a)
    await first

    expect(host.installations).toEqual(['B'])
    expect(host.current?.scene).toBe(b.scene)
    expect(a.resource.cpuDisposals).toBe(1)
    expect(b.resource.disposed).toBe(false)
    controller.dispose()
  })

  /** A 虽然先完成，但 B 已经被请求，所以等待 B 时也不能短暂安装 A。 */
  it('B 尚未完成时，A 的迟到结果也不能安装', async () => {
    const { calls, host, controller } = setup()
    const a = built('A')
    const b = built('B')
    const first = controller.applyPreset(preset('A'))
    const second = controller.applyPreset(preset('B'))
    calls[0]!.work.resolve(a)
    await first
    expect(host.current).toBeNull()
    expect(a.resource.disposed).toBe(true)

    calls[1]!.work.resolve(b)
    await second
    expect(host.current?.scene).toBe(b.scene)
    controller.dispose()
  })

  /** 取消依赖 signal，而不是猜测异常的 message 或 name。 */
  it('已被取消的加载 rejection 正常返回', async () => {
    const { calls, controller } = setup()
    const first = controller.applyPreset(preset('A'))
    const second = controller.applyPreset(preset('B'))
    calls[0]!.work.reject(new Error('loader wrapped cancellation'))
    await expect(first).resolves.toBeUndefined()

    controller.dispose()
    calls[1]!.work.reject(new Error('also cancelled'))
    await expect(second).resolves.toBeUndefined()
  })

  /** 即使异常名是 AbortError，没有实际取消的 active request 也必须报告失败。 */
  it('active request 失败保留原错误和旧 Scene', async () => {
    const { calls, host, controller } = setup()
    const old = built('old')
    host.setScene(setupOf(old))
    const failure = new Error('network failed')
    failure.name = 'AbortError'
    const pending = controller.applyPreset(preset('A'))
    const rejected = expect(pending).rejects.toBe(failure)
    calls[0]!.work.reject(failure)
    await rejected

    expect(host.current?.scene).toBe(old.scene)
    expect(old.resource.disposed).toBe(false)

    const retry = controller.applyPreset(preset('retry'))
    expect(calls[0]!.signal.aborted).toBe(false)
    const next = built('retry')
    calls[1]!.work.resolve(next)
    await retry
    expect(old.resource.cpuDisposals).toBe(1)
    controller.dispose()
  })

  /** 外部工厂可以同步抛错；仍要清掉 active 槽位，并向调用方传播。 */
  it('传播工厂同步异常', async () => {
    const host = new Host()
    const failure = new Error('factory failed synchronously')
    const controller = new HW2SceneController(host, () => {
      throw failure
    })
    await expect(controller.applyPreset(preset('A'))).rejects.toBe(failure)
    expect(host.current).toBeNull()
    controller.dispose()
  })

  /** Engine 没有接管 next 时，它仍由 Controller 负责清理。 */
  it('setScene 拒绝时释放 next，但不释放仍在显示的旧 Scene', async () => {
    const { calls, host, controller } = setup()
    const old = built('old')
    const next = built('next')
    host.setScene(setupOf(old))
    const failure = new Error('installation rejected')
    host.rejectInstall = failure
    const pending = controller.applyPreset(preset('next'))
    const rejected = expect(pending).rejects.toBe(failure)
    calls[0]!.work.resolve(next)
    await rejected

    expect(host.current?.scene).toBe(old.scene)
    expect(old.resource.disposed).toBe(false)
    expect(next.resource.cpuDisposals).toBe(1)
    controller.dispose()
  })

  /** 不能让 next 的清理异常覆盖最先发生的安装异常。 */
  it('安装与清理同时失败时保留两个错误', async () => {
    const { calls, host, controller } = setup()
    const next = built('next')
    const installationFailure = new Error('install')
    const cleanupFailure = new Error('cleanup')
    next.resource.onDispose(() => {
      throw cleanupFailure
    })
    host.rejectInstall = installationFailure
    const pending = controller.applyPreset(preset('next'))
    const rejected = expect(pending).rejects.toMatchObject({
      errors: [installationFailure, expect.any(CleanupFailureError)]
    })
    calls[0]!.work.resolve(next)
    await rejected
    const failure = await pending.catch((cause: unknown) => cause)
    expect((failure as AggregateError).errors[0]).toBe(installationFailure)
    expect(readCleanupListenerCause((failure as AggregateError).errors[1])).toBe(cleanupFailure)
    expect(next.scene.disposed).toBe(true)
    controller.dispose()
  })

  /** 主动取消只吞加载取消；迟到资源真正清理失败不能静默掩盖。 */
  it('过期 Scene 的清理失败仍向原调用方报告', async () => {
    const { calls, controller } = setup()
    const a = built('A')
    const failure = new Error('stale cleanup failed')
    a.resource.onDispose(() => {
      throw failure
    })
    const first = controller.applyPreset(preset('A'))
    const second = controller.applyPreset(preset('B'))
    const rejected = first.then(
      () => {
        throw new Error('Expected stale cleanup to reject')
      },
      (cause: unknown) => {
        expect(readCleanupListenerCause(cause)).toBe(failure)
      }
    )
    calls[0]!.work.resolve(a)
    await rejected

    controller.dispose()
    calls[1]!.work.reject(new Error('cancelled'))
    await second
  })

  /** 删除 active 的身份检查，会让 A 的 finally 擦掉仍在加载的 B。 */
  it('A 结束不能清掉 B 的 active 槽位', async () => {
    const { calls, controller } = setup()
    const first = controller.applyPreset(preset('A'))
    const second = controller.applyPreset(preset('B'))
    calls[0]!.work.reject(new Error('cancelled'))
    await first
    controller.dispose()
    expect(calls[1]!.signal.aborted).toBe(true)
    calls[1]!.work.reject(new Error('cancelled'))
    await second
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-controller-abort-reentrancy]
   *
   * abort listener 同步启动 C。B 不能在 abort(A) 返回后覆盖 C，甚至不应启动 B 的 I/O。
   */
  it('A 的 abort listener 同步请求 C 时，C 保持最新请求', async () => {
    const { calls, host, controller } = setup()
    const first = controller.applyPreset(preset('A'))
    let third: Promise<void> | undefined
    calls[0]!.signal.addEventListener(
      'abort',
      () => {
        third = controller.applyPreset(preset('C'))
      },
      { once: true }
    )

    const second = controller.applyPreset(preset('B'))
    expect(calls.map((call) => call.preset.label)).toEqual(['A', 'C'])
    const c = built('C')
    calls[1]!.work.resolve(c)
    await third
    await second
    const a = built('A')
    calls[0]!.work.resolve(a)
    await first
    expect(host.installations).toEqual(['C'])
    expect(a.resource.disposed).toBe(true)
    controller.dispose()
  })

  /** abort listener 可以让控制器同步结束；不能在结束后再启动新加载。 */
  it('abort listener 同步 dispose 时，不启动 B', async () => {
    const { calls, host, controller } = setup()
    const first = controller.applyPreset(preset('A'))
    calls[0]!.signal.addEventListener('abort', () => controller.dispose(), {
      once: true
    })
    await controller.applyPreset(preset('B'))
    expect(calls).toHaveLength(1)
    expect(host.clearCalls).toBe(1)
    calls[0]!.work.reject(new Error('cancelled'))
    await first
  })

  /** dispose 后禁止新请求，已忽略取消的旧构建仍须交还资源。 */
  it('dispose 幂等、取消加载、清理当前 Scene，并处理迟到成功', async () => {
    const { calls, host, controller } = setup()
    const old = built('old')
    host.setScene(setupOf(old))
    const pending = controller.applyPreset(preset('A'))
    controller.dispose()
    controller.dispose()
    expect(host.clearCalls).toBe(1)
    expect(host.current).toBeNull()
    expect(old.resource.cpuDisposals).toBe(1)
    expect(calls[0]!.signal.aborted).toBe(true)

    const late = built('A')
    calls[0]!.work.resolve(late)
    await pending
    expect(late.resource.cpuDisposals).toBe(1)
    await expect(controller.applyPreset(preset('B'))).rejects.toBeInstanceOf(ResourceDisposedError)
    expect(calls).toHaveLength(1)
  })

  /** 已完成的请求不再属于 active；dispose 不应补发一次无意义 abort。 */
  it('正常完成后移除 active 请求', async () => {
    const { calls, controller } = setup()
    const pending = controller.applyPreset(preset('A'))
    calls[0]!.work.resolve(built('A'))
    await pending
    controller.dispose()
    expect(calls[0]!.signal.aborted).toBe(false)
  })

  /** 清场景失败必须可见；控制器保持已结束，不能重新接受加载。 */
  it('clearScene 抛错仍保持终止状态，不重复清理', async () => {
    const { host, controller } = setup()
    const failure = new Error('clear failed')
    host.rejectClear = failure
    expect(() => controller.dispose()).toThrow(failure)
    expect(() => controller.dispose()).not.toThrow()
    expect(host.clearCalls).toBe(1)
    await expect(controller.applyPreset(preset('A'))).rejects.toBeInstanceOf(ResourceDisposedError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][engine-scene-setup-ownership]
   *
   * HW2 只有 ForwardPass；每次安装都交新实例，因为 Engine 拒绝它接管过的 Pass。
   */
  it('每次安装交出一条新的 [ForwardPass]', async () => {
    const { calls, host, controller } = setup()
    const first = controller.applyPreset(preset('A'))
    calls[0]!.work.resolve(built('A'))
    await first
    const firstPasses = host.current!.passes

    const second = controller.applyPreset(preset('B'))
    calls[1]!.work.resolve(built('B'))
    await second
    const secondPasses = host.current!.passes

    expect(firstPasses).toHaveLength(1)
    expect(firstPasses[0]).toBeInstanceOf(ForwardPass)
    expect(secondPasses).toHaveLength(1)
    expect(secondPasses[0]).toBeInstanceOf(ForwardPass)
    expect(secondPasses[0]).not.toBe(firstPasses[0])
    controller.dispose()
  })

  /** 提交前失败时 Pass 仍归 Controller：和 next 一起释放，先 Pass（借用者）后 Scene（拥有者）。 */
  it('setScene 拒绝时连同交出的 Pass 一起释放候选', async () => {
    const { calls, host, controller } = setup()
    const next = built('next')
    const order: string[] = []
    const disposed: unknown[] = []
    vi.spyOn(ForwardPass.prototype, 'dispose').mockImplementation(function (this: ForwardPass) {
      disposed.push(this)
      order.push('pass')
    })
    next.resource.onDispose(() => {
      order.push('scene')
    })
    const failure = new Error('installation rejected')
    host.rejectInstall = failure
    const pending = controller.applyPreset(preset('next'))
    const rejected = expect(pending).rejects.toBe(failure)
    calls[0]!.work.resolve(next)
    await rejected

    expect(host.rejected).toHaveLength(1)
    expect(disposed).toEqual([...host.rejected[0]!.passes])
    expect(order).toEqual(['pass', 'scene'])
    controller.dispose()
  })

  /** Pass 清理抛错也不能跳过 Scene 清理，更不能盖掉安装错误。 */
  it('Pass 清理失败时仍释放 Scene，并与安装错误一起报告', async () => {
    const { calls, host, controller } = setup()
    const next = built('next')
    const installationFailure = new Error('install')
    const passFailure = new Error('pass cleanup')
    vi.spyOn(ForwardPass.prototype, 'dispose').mockImplementation(() => {
      throw passFailure
    })
    host.rejectInstall = installationFailure
    const pending = controller.applyPreset(preset('next'))
    const rejected = expect(pending).rejects.toMatchObject({
      errors: [installationFailure, passFailure],
      cause: installationFailure
    })
    calls[0]!.work.resolve(next)
    await rejected
    expect(next.resource.cpuDisposals).toBe(1)
    controller.dispose()
  })
})
