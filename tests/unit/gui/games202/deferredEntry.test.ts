import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupGames202HWSceneGUI } from '@/gui/games202/setup'
import { openDeferredSceneSession } from '@/gui/games202/openDeferredSceneSession'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import type { SceneContext } from '@/scenes/types/SceneContext'

/** 只替换 DOM/旧资产入口；新 root switcher 与 Deferred session GUI 使用真实实现。 */
const ports = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
  orbit: vi.fn(),
  stopOrbit: vi.fn(),
  load: vi.fn(),
  hw2: vi.fn(),
  hw3: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/gui/_shared/mountGUI', () => ({
  mountDatGUI: ports.mount,
  unmountDatGUI: ports.unmount
}))
vi.mock('@/rendering/controls/mountOrbitCameraInput', () => ({
  mountOrbitCameraInput: ports.orbit
}))
vi.mock('@/scenes/games202/deferred/loadDeferredScene', () => ({ loadDeferredScene: ports.load }))
vi.mock('@/scenes/games202/hw1/loadHW1Scene', () => ({ loadHW1Scene: vi.fn() }))
vi.mock('@/scenes/games202/hw2/loadHW2Scene', () => ({ loadHW2Scene: ports.hw2 }))
vi.mock('@/scenes/games202/hw3/cave/loadHW3Scene', () => ({ loadHW3Scene: ports.hw3 }))
vi.mock('@/scenes/games202/hw4/loadHW4Scene', () => ({ loadHW4Scene: vi.fn() }))
vi.mock('@/logging/Logger', () => ({ logger: { error: ports.error } }))

/** Fake 面板保存已注册回调，测试真正入口对这些回调作出的响应。 */
function fixture() {
  const callbacks = new Map<string, (value: number | string) => void>()
  let options: readonly string[] = []
  const panel = {
    addFolder: () => panel,
    open: () => undefined,
    add: (_object: unknown, key: string, values?: unknown) => {
      if (key === 'scene') options = values as readonly string[]
      const controller = {
        name: () => controller,
        listen: () => controller,
        onChange: (callback: (value: number | string) => void) => {
          callbacks.set(key, callback)
          return controller
        }
      }
      return controller
    }
  }
  ports.mount.mockReturnValue(panel)
  const events: string[] = []
  const engine = {
    enterRenderMode: vi.fn(async () => {
      events.push('enter')
    }),
    assertLegacyMode: vi.fn(),
    clearScene: vi.fn(),
    onLoopFailure: () => () => undefined,
    currentSceneBinding: null
  }
  const ctx = {
    engine,
    renderer: { clearRenderPasses: vi.fn() },
    gl: { canvas: {} }
  } as unknown as SceneContext
  const light = new DirectionalLight({ intensity: Math.PI, targetWorld: [0, 0, 0] })
  light.transform.setPosition([3, 5, 4])
  const dispose = vi.fn(() => {
    events.push('scene exit')
  })
  ports.load.mockReturnValue({ ready: Promise.resolve(), current: { light }, dispose })
  ports.hw2.mockReturnValue({ ready: Promise.resolve(), dispose: vi.fn() })
  ports.hw3.mockResolvedValue(() => undefined)
  ports.orbit.mockReturnValue(ports.stopOrbit)
  return {
    ctx,
    engine,
    light,
    dispose,
    events,
    change: (key: string, value: number | string) => callbacks.get(key)!(value),
    get options() {
      return options
    }
  }
}

describe('Deferred GUI entry', () => {
  beforeEach(() => vi.resetAllMocks())

  /** 删除新 dispatch 或换掉旧 HW3 分支会失败；默认仍然是 HW2。 */
  it('根入口保留默认 HW2 和旧 HW3，独立选择 Deferred/Lambert', async () => {
    const f = fixture()
    const close = await setupGames202HWSceneGUI(f.ctx)
    expect(ports.hw2).toHaveBeenCalledOnce()
    expect(f.options).toEqual(['HW1', 'HW2', 'HW3', 'HW4', 'Deferred/Lambert'])
    f.change('scene', 'Deferred/Lambert')
    await vi.waitFor(() => expect(ports.load).toHaveBeenCalledWith(f.engine))
    f.change('scene', 'HW3')
    await vi.waitFor(() => expect(ports.hw3).toHaveBeenCalledWith(f.ctx))
    expect(f.dispose).toHaveBeenCalledOnce()
    await close()
  })

  /** 光照变化发生在 CPU Light；退出后旧回调不能再改 Light。 */
  it('控件修改灯光，先撤销输入和面板再退出场景', async () => {
    const f = fixture()
    const close = await openDeferredSceneSession(f.ctx, ports.error)
    await vi.waitFor(() => expect(ports.mount).toHaveBeenCalledOnce())
    f.change('intensity', 0.5)
    f.change('lightX', -3)
    expect(f.light.intensity).toBe(0.5)
    expect(f.light.transform.position).toEqual([-3, 5, 4])
    f.dispose.mockImplementation(() => {
      expect(ports.stopOrbit).toHaveBeenCalledOnce()
      expect(ports.unmount).toHaveBeenCalledOnce()
    })
    close()
    f.change('intensity', 4)
    expect(f.light.intensity).toBe(0.5)
    close()
    expect(f.dispose).toHaveBeenCalledOnce()
    expect(ports.error).not.toHaveBeenCalled()
  })

  /** 等 ready 的时候也已经能退出；不能在迟到完成时挂回面板。 */
  it('pending 时退出，迟到 ready 不再挂 GUI', async () => {
    const f = fixture()
    let finish!: () => void
    ports.load.mockReturnValue({
      ready: new Promise<void>((resolve) => {
        finish = resolve
      }),
      current: { light: f.light },
      dispose: f.dispose
    })
    const close = await openDeferredSceneSession(f.ctx, ports.error)
    close()
    finish()
    await Promise.resolve()
    expect(ports.mount).not.toHaveBeenCalled()
    expect(f.dispose).toHaveBeenCalledOnce()
  })

  /** GUI 失败不能阻断 scene 清理；失败的 unmount 需要显式下次调用重试。 */
  it('面板清理失败仍退出场景，重试不重复成功步骤', async () => {
    const f = fixture()
    const close = await openDeferredSceneSession(f.ctx, ports.error)
    await vi.waitFor(() => expect(ports.mount).toHaveBeenCalledOnce())
    ports.unmount.mockImplementationOnce(() => {
      throw new Error('panel cleanup')
    })
    expect(close).toThrow('panel cleanup')
    expect(f.dispose).toHaveBeenCalledOnce()
    close()
    expect(ports.unmount).toHaveBeenCalledTimes(2)
    expect(f.dispose).toHaveBeenCalledOnce()
  })

  /** 打开会话后输入挂载失败，也必须退出新渲染模式。 */
  it('输入挂载失败关闭已打开的渲染会话', async () => {
    const f = fixture()
    const failure = new Error('input mount')
    ports.orbit.mockImplementation(() => {
      throw failure
    })
    await expect(openDeferredSceneSession(f.ctx, ports.error)).rejects.toBe(failure)
    expect(f.engine.clearScene).toHaveBeenCalledOnce()
    expect(ports.load).not.toHaveBeenCalled()
  })

  /** 挂载和回滚同时失败时，仍要保存 GUI 句柄，不能只打印错误后遗失。 */
  it('面板挂载与回滚同时失败，退出仍能重试同一个面板', async () => {
    const f = fixture()
    const mountError = new Error('folder mount')
    ports.mount.mockReturnValue({
      addFolder: () => {
        throw mountError
      }
    })
    ports.unmount.mockImplementationOnce(() => {
      throw new Error('rollback')
    })
    const close = await openDeferredSceneSession(f.ctx, ports.error)
    await vi.waitFor(() => expect(ports.error).toHaveBeenCalledOnce())
    expect(ports.error.mock.calls[0]![0]).toBeInstanceOf(AggregateError)
    close()
    expect(ports.unmount).toHaveBeenCalledTimes(2)
    expect(f.dispose).toHaveBeenCalledOnce()
  })

  /** pending 时成功取消不等于未来迟到候选的清理也完成；显式重试必须可达。 */
  it('提前退出后迟到清理失败，外层退出句柄仍能把重试交给 session', async () => {
    const f = fixture()
    let reject!: (error: unknown) => void
    ports.load.mockReturnValue({
      ready: new Promise<void>((_resolve, fail) => {
        reject = fail
      }),
      current: null,
      dispose: f.dispose
    })
    const close = await openDeferredSceneSession(f.ctx, ports.error)
    close()
    reject(new Error('late candidate cleanup'))
    await vi.waitFor(() => expect(ports.error).toHaveBeenCalledOnce())
    close()
    expect(f.dispose).toHaveBeenCalledTimes(2)
    close()
    expect(f.dispose).toHaveBeenCalledTimes(2)
  })
})
