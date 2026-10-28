import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupGames202HWSceneGUI } from '@/gui/games202/setup'
import type { SceneContext } from '@/scenes/types/SceneContext'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'

/** 替换 DOM 和真实资产 I/O；switcher 和 GUI 接线仍使用正式实现。 */
const ports = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
  hw1: vi.fn(),
  hw2: vi.fn(),
  hw3: vi.fn(),
  hw4: vi.fn(),
  orbit: vi.fn(),
  stopOrbit: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/gui/_shared/mountGUI', () => ({
  mountDatGUI: ports.mount,
  unmountDatGUI: ports.unmount
}))

vi.mock('@/scenes/games202/hw1/loadHW1Scene', () => ({
  loadHW1Scene: ports.hw1
}))

vi.mock('@/scenes/games202/hw2/loadHW2Scene', () => ({
  loadHW2Scene: ports.hw2
}))

vi.mock('@/scenes/games202/hw3/cave/loadHW3Scene', () => ({
  loadHW3Scene: ports.hw3
}))

vi.mock('@/scenes/games202/hw4/loadHW4Scene', () => ({
  loadHW4Scene: ports.hw4
}))

vi.mock('@/logging/Logger', () => ({
  logger: { error: ports.error }
}))

/** 这里验证 DOM 输入的安装/卸载交接；轨道数学由独立测试覆盖真实 Camera。 */
vi.mock('@/rendering/controls/mountOrbitCameraInput', () => ({
  mountOrbitCameraInput: ports.orbit
}))

describe('Games202 GUI wiring', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ports.orbit.mockReturnValue(ports.stopOrbit)
  })

  /**
   * 直接触发 GUI 已登记的选择回调。
   *
   * Fake 不实现渲染，仅提供源码实际调用的面板协议。
   */
  function guiFixture() {
    let select!: (name: string) => void
    let state!: { scene: string; status: string; error: string }
    const controls = new Map<
      string,
      { object: Record<string, unknown>; change: (value: unknown) => void }
    >()

    const panel = {
      addFolder: () => panel,
      open: () => undefined,

      add: (object: unknown, property: string) => {
        if (property === 'scene') {
          state = object as typeof state
        }

        const control = {
          onChange: (callback: (name: string) => void) => {
            if (property === 'scene') {
              select = callback
            }
            controls.set(property, {
              object: object as Record<string, unknown>,
              change: callback as (value: unknown) => void
            })

            return control
          },

          listen: () => control,
          name: () => control
        }

        return control
      }
    }

    ports.mount.mockReturnValue(panel)

    return {
      select: (name: string) => select(name),
      change: (property: string, value: unknown) => {
        const control = controls.get(property)!
        control.object[property] = value
        control.change(value)
      },

      get state() {
        return state
      }
    }
  }

  /** HW1 与 HW2 使用同一个新 Engine 入口；pending I/O 不占住切换队列。 */
  it('HW1 只收到 Engine，加载 pending 时可退出，迟到 ready 不挂 GUI', async () => {
    const gui = guiFixture()
    const engine = {
      assertLegacyMode: vi.fn(),
      onLoopFailure: () => () => undefined,
      enterRenderMode: vi.fn(async () => undefined)
    }
    const ctx = {
      engine,
      renderer: { clearRenderPasses: vi.fn() },
      gl: { canvas: {} }
    } as unknown as SceneContext
    ports.hw2.mockReturnValue({ ready: Promise.resolve(), dispose: vi.fn() })
    let finish!: () => void
    const dispose = vi.fn()
    ports.hw1.mockReturnValue({
      ready: new Promise<void>((resolve) => {
        finish = resolve
      }),
      current: null,
      dispose
    })
    ports.hw3.mockResolvedValue(() => undefined)
    const close = await setupGames202HWSceneGUI(ctx)
    gui.select('HW1')
    await vi.waitFor(() => expect(gui.state.status).toBe('HW1 会话已打开'))
    expect(ports.hw1).toHaveBeenCalledWith(engine)
    expect(engine.enterRenderMode).toHaveBeenCalledTimes(2)
    gui.select('HW3')
    await vi.waitFor(() => expect(gui.state.status).toBe('HW3 会话已打开'))
    finish()
    await Promise.resolve()
    expect(gui.state.status).toBe('HW3 会话已打开')
    expect(dispose).toHaveBeenCalledOnce()
    expect(ports.stopOrbit).toHaveBeenCalledTimes(2)
    expect(ports.mount).toHaveBeenCalledOnce()
    await close()
  })

  /** 控件改 CPU 光源，不写 GL 或直接改 Material；退出后迟到回调无效。 */
  it('HW1 ready 后挂载真实硬阴影控件，并在场景释放前卸载', async () => {
    const gui = guiFixture()
    const shadow = new DirectionalLightShadow({
      label: 'GUI sun',
      mapSize: 128,
      halfExtent: 100,
      near: 0.1,
      far: 300,
      bias: 0.001
    })
    const light = new DirectionalLight({ castShadow: true, shadow, intensity: 3 })
    light.transform.setPosition([0, 80, 80])
    const dispose = vi.fn(() => {
      expect(ports.unmount).toHaveBeenCalledTimes(1)
      shadow.dispose()
    })
    const ctx = {
      engine: {
        assertLegacyMode: vi.fn(),
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined
      },
      renderer: { clearRenderPasses: vi.fn() },
      gl: { canvas: {} }
    } as unknown as SceneContext
    ports.hw2.mockReturnValue({ ready: Promise.resolve(), dispose: vi.fn() })
    ports.hw1.mockReturnValue({ ready: Promise.resolve(), current: { light, shadow }, dispose })
    ports.hw3.mockResolvedValue(() => undefined)
    const close = await setupGames202HWSceneGUI(ctx)
    gui.select('HW1')
    await vi.waitFor(() => expect(ports.mount).toHaveBeenCalledTimes(2))
    gui.change('lightX', 40)
    gui.change('intensity', 2)
    gui.change('bias', 0.002)
    gui.change('castShadow', false)
    expect(light.transform.position).toEqual([40, 80, 80])
    expect(light.intensity).toBe(2)
    expect(shadow.settings.bias).toBe(0.002)
    expect(light.castShadow).toBe(false)
    gui.select('HW3')
    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce())
    gui.change('intensity', 9)
    expect(light.intensity).toBe(2)
    await close()
  })

  /**
   * [DESIGN-WEIGHT:3][games202-serialized-handoff]
   *
   * 如果误传 ctx 给 HW2，或 await session.ready，
   * 这个用例就会失败。
   */
  it('HW2 只收到 Engine，默认加载 pending 时仍可退出并进入 HW3', async () => {
    const gui = guiFixture()
    const events: string[] = []

    const engine = {
      assertLegacyMode: () => {
        events.push('gate')
      },
      onLoopFailure: () => () => undefined,
      enterRenderMode: async () => {
        events.push('enter')
      }
    }

    const renderer = {
      clearRenderPasses: () => {
        events.push('clear')
      }
    }

    // setup 只读这里提供的两个端口；
    // 场景 loader 所需的其余 ctx 由 I/O double 接管。
    const ctx = { engine, renderer, gl: { canvas: {} } } as unknown as SceneContext

    ports.hw1.mockResolvedValue(() => {
      events.push('dispose HW1')
    })

    ports.hw2.mockImplementation(() => {
      events.push('load HW2')

      return {
        ready: new Promise<void>(() => undefined),

        dispose: () => {
          events.push('dispose HW2')
        }
      }
    })

    ports.hw3.mockResolvedValue(() => {
      events.push('dispose HW3')
    })

    const close = await setupGames202HWSceneGUI(ctx)

    await vi.waitFor(() => {
      expect(gui.state.status).toBe('HW2 会话已打开')
    })

    expect(ports.hw2).toHaveBeenCalledWith(engine, expect.any(Function))
    expect(gui.state.scene).toBe('HW2')

    gui.select('HW3')

    await vi.waitFor(() => {
      expect(gui.state.status).toBe('HW3 会话已打开')
    })

    // 先打开渲染会话，再把 Engine 交给 HW2；退出由 HW2 会话自己清场。
    expect(events).toEqual(['gate', 'clear', 'enter', 'load HW2', 'dispose HW2', 'gate', 'clear'])

    await close()

    expect(events.at(-1)).toBe('dispose HW3')
    expect(ports.stopOrbit).toHaveBeenCalledTimes(1)
    expect(ports.unmount).toHaveBeenCalledTimes(1)
  })

  /** 不仅测试 switcher：验证 GUI catch 不会绕过退出失败继续加载。 */
  it('HW2 退出失败显示错误，并阻止旧 loader 启动', async () => {
    const gui = guiFixture()
    const gate = vi.fn()
    const clear = vi.fn()

    const ctx = {
      engine: {
        assertLegacyMode: gate,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined
      },
      renderer: { clearRenderPasses: clear },
      gl: { canvas: {} }
    } as unknown as SceneContext

    ports.hw1.mockResolvedValue(() => undefined)

    let failing = true

    ports.hw2.mockReturnValue({
      ready: Promise.resolve(),

      dispose: () => {
        if (failing) {
          throw new Error('device still closing')
        }
      }
    })

    const close = await setupGames202HWSceneGUI(ctx)

    await vi.waitFor(() => {
      expect(gui.state.status).toBe('HW2 会话已打开')
    })

    gui.select('HW3')

    await vi.waitFor(() => {
      expect(gui.state.error).toBe('device still closing')
    })

    expect(ports.hw3).not.toHaveBeenCalled()
    expect(gate).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)
    // GPU 清理失败也必须先停输入，不能继续操纵正在退出的相机。
    expect(ports.stopOrbit).toHaveBeenCalledTimes(1)

    failing = false

    await close()
  })

  /** 默认资源还没加载好时离开 HW2，迟到的 ready 不应覆盖 HW3 的状态。 */
  it('默认 HW2 pending 时选择 HW3，不被迟到的 ready 状态覆盖', async () => {
    const gui = guiFixture()

    const ctx = {
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined
      },
      renderer: { clearRenderPasses: () => undefined },
      gl: { canvas: {} }
    } as unknown as SceneContext

    let finishHW2!: () => void
    let finishHW3!: (dispose: () => void) => void

    ports.hw2.mockReturnValue({
      ready: new Promise<void>((resolve) => {
        finishHW2 = resolve
      }),
      dispose: () => undefined
    })

    ports.hw3.mockReturnValue(
      new Promise<() => void>((resolve) => {
        finishHW3 = resolve
      })
    )

    const close = await setupGames202HWSceneGUI(ctx)
    gui.select('HW3')
    await vi.waitFor(() => expect(ports.hw3).toHaveBeenCalledTimes(1))
    finishHW2()
    await Promise.resolve()
    expect(gui.state.status).toBe('切换中')

    finishHW3(() => undefined)

    await vi.waitFor(() => {
      expect(gui.state.status).toBe('HW3 会话已打开')
    })

    await close()
  })

  /** 捕获第一个相机而不是查询当前 binding，会让预设切换后的相机失控。 */
  it('输入 getter 每次读取当前 HW2 camera，退出后始终返回 null', async () => {
    const gui = guiFixture()
    let binding: { camera: object } | null = null
    const canvas = {}
    const ctx = {
      gl: { canvas },
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined,
        get currentSceneBinding() {
          return binding
        }
      },
      renderer: { clearRenderPasses: () => undefined }
    } as unknown as SceneContext
    ports.hw2.mockReturnValue({ ready: Promise.resolve(), dispose: () => undefined })
    ports.hw3.mockResolvedValue(() => undefined)
    const close = await setupGames202HWSceneGUI(ctx)
    expect(ports.orbit).toHaveBeenCalledTimes(1)
    const [element, getCamera, options] = ports.orbit.mock.calls[0]!
    expect(element).toBe(canvas)
    expect(options.target).toEqual([0, 10, 0])
    // 验证实际 HW2 接线传入用户选择的倍率，而不是只修改控制器默认值。
    expect(options.panSpeed).toBe(0.8)
    expect(getCamera()).toBeNull()
    const first = {}
    const second = {}
    binding = { camera: first }
    expect(getCamera()).toBe(first)
    binding = { camera: second }
    expect(getCamera()).toBe(second)
    gui.select('HW3')
    await vi.waitFor(() => expect(ports.hw3).toHaveBeenCalledTimes(1))
    expect(getCamera()).toBeNull()
    await close()
  })

  /**
   * [DESIGN-WEIGHT:3][engine-render-session-entry]
   * loader 同步抛错时，已经挂载的输入要回滚；已经打开的渲染会话也要离开，
   * 否则 disposer 没交给切换器，会话会一直占着设备。
   */
  it('HW2 loader 创建失败时卸载输入、离开新模式并报告原始错误', async () => {
    const gui = guiFixture()
    const clearScene = vi.fn()
    const ctx = {
      gl: { canvas: {} },
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined,
        clearScene
      },
      renderer: { clearRenderPasses: () => undefined }
    } as unknown as SceneContext
    ports.hw2.mockImplementation(() => {
      throw new Error('mount failed')
    })
    const close = await setupGames202HWSceneGUI(ctx)
    expect(gui.state.error).toBe('mount failed')
    expect(ports.stopOrbit).toHaveBeenCalledTimes(1)
    expect(clearScene).toHaveBeenCalledTimes(1)
    await close()
  })

  /** 入口失败时会话没建成：不挂输入、不加载 HW2，也没有会话要离开。 */
  it('进入新模式失败时不挂载输入、不加载 HW2，并报告错误', async () => {
    const gui = guiFixture()
    const clearScene = vi.fn()
    const ctx = {
      gl: { canvas: {} },
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => {
          throw new Error('device unavailable')
        },
        clearScene
      },
      renderer: { clearRenderPasses: () => undefined }
    } as unknown as SceneContext
    const close = await setupGames202HWSceneGUI(ctx)
    expect(gui.state.error).toBe('device unavailable')
    expect(ports.orbit).not.toHaveBeenCalled()
    expect(ports.hw2).not.toHaveBeenCalled()
    expect(clearScene).not.toHaveBeenCalled()
    await close()
  })

  /** 离开新模式也失败时两个错误一起报告，清理错误不能盖掉入口错误。 */
  it('loader 失败且离开新模式也失败时保留两个错误', async () => {
    const gui = guiFixture()
    const loadFailure = new Error('mount failed')
    const cleanupFailure = new Error('session cleanup failed')
    const ctx = {
      gl: { canvas: {} },
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure: () => () => undefined,
        enterRenderMode: async () => undefined,
        clearScene: () => {
          throw cleanupFailure
        }
      },
      renderer: { clearRenderPasses: () => undefined }
    } as unknown as SceneContext
    ports.hw2.mockImplementation(() => {
      throw loadFailure
    })
    const close = await setupGames202HWSceneGUI(ctx)
    expect(gui.state.error).toBe('HW2 entry and render session cleanup both failed')
    expect(ports.error).toHaveBeenCalledTimes(1)
    expect(ports.error.mock.calls[0]![1]).toMatchObject({
      errors: [loadFailure, cleanupFailure],
      cause: loadFailure
    })
    expect(ports.stopOrbit).toHaveBeenCalledTimes(1)
    await close()
  })

  /**
   * [DESIGN-WEIGHT:3][engine-loop-failure-notice]
   * 帧循环在 rAF 回调里失败停止时，没有 Promise 能把错误交回切换器；它订阅 Engine 的通知，
   * 显示到同一个 error 框。关闭之后取消订阅；迟到的通知也不再改面板。
   */
  it('帧循环失败停止时显示到 error 框，关闭后取消订阅', async () => {
    const gui = guiFixture()
    let notify: ((failure: { operation: string; cause: unknown }) => void) | undefined
    const unsubscribe = vi.fn()
    const onLoopFailure = vi.fn((listener: typeof notify) => {
      notify = listener
      return unsubscribe
    })
    const ctx = {
      gl: { canvas: {} },
      engine: {
        assertLegacyMode: () => undefined,
        onLoopFailure,
        enterRenderMode: async () => undefined
      },
      renderer: { clearRenderPasses: () => undefined }
    } as unknown as SceneContext
    ports.hw2.mockReturnValue({ ready: Promise.resolve(), dispose: () => undefined })

    const close = await setupGames202HWSceneGUI(ctx)
    expect(onLoopFailure).toHaveBeenCalledTimes(1)
    expect(gui.state.error).toBe('')

    const cause = new Error(
      'WebGL preflight failed for CornellBox / Mary / Shadowed/background: GL errors: 1282'
    )
    notify!({ operation: 'frame', cause })
    expect(gui.state.status).toBe('失败')
    expect(gui.state.error).toBe('渲染循环已停止（frame）：' + cause.message)
    expect(ports.error).toHaveBeenCalledTimes(1)
    expect(ports.error.mock.calls[0]![1]).toMatchObject({ cause })

    await close()
    expect(unsubscribe).toHaveBeenCalledTimes(1)

    // 取消订阅之后真实的 Engine 不会再调用它；这里直接调用，确认关闭后也不改面板
    notify!({ operation: 'frame', cause: new Error('late failure') })
    expect(gui.state.error).toBe('渲染循环已停止（frame）：' + cause.message)
    expect(ports.error).toHaveBeenCalledTimes(1)
  })
})
