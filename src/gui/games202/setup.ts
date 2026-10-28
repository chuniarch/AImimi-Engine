import { openDeferredSceneSession } from '@/gui/games202/openDeferredSceneSession'
import { logger } from '@/logging/Logger'
import { mountOrbitCameraInput } from '@/rendering/controls/mountOrbitCameraInput'
import { loadHW1Scene } from '@/scenes/games202/hw1/loadHW1Scene'
import type { HW1SceneBuildResult } from '@/scenes/games202/hw1/createHW1Scene'
import { loadHW2Scene, type HW2GUIOptions } from '@/scenes/games202/hw2/loadHW2Scene'
import { loadHW3Scene } from '@/scenes/games202/hw3/cave/loadHW3Scene'
import { loadHW4Scene } from '@/scenes/games202/hw4/loadHW4Scene'
import type { SceneContext } from '@/scenes/types/SceneContext'
import { mountDatGUI, unmountDatGUI } from '../_shared/mountGUI'
import { Games202SceneSwitcher, HOMEWORK_NAMES, type HomeworkName } from './Games202SceneSwitcher'

/**
 * 借用已安装的 HW1 光源；控件只修改下一帧提取的数据，不直接修改共享参数块或 GL。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][hw1-controls-frame-input]
 * 只开放灯的 X 位置，保留 Y=80/Z=80，避免 GUI 把视线调到与 up 平行。
 * 本批只有 RGBA 硬阴影，不显示尚未迁移的 PCF/PCSS 选项。
 */
function mountHW1GUI(
  result: HW1SceneBuildResult,
  reportFailure: (error: unknown) => void
): () => void {
  const gui = mountDatGUI()
  let closed = false
  const { light, shadow } = result
  const state = {
    lightX: light.transform.position[0],
    intensity: light.intensity,
    castShadow: light.castShadow,
    bias: shadow.settings.bias
  }
  const update = (action: () => void): void => {
    if (closed) return
    try {
      action()
    } catch (error) {
      reportFailure(error)
    }
    state.lightX = light.transform.position[0]
    state.intensity = light.intensity
    state.castShadow = light.castShadow
    state.bias = shadow.settings.bias
  }
  try {
    const folder = gui.addFolder('HW1 / Mary + Floor / Hard Shadow')
    folder
      .add(state, 'lightX', -100, 100)
      .name('灯光 X')
      .listen()
      .onChange((x: number) =>
        update(() => {
          const [, y, z] = light.transform.position
          light.transform.setPosition([x, y, z])
        })
      )
    folder
      .add(state, 'intensity', 0, 5)
      .name('光照强度')
      .listen()
      .onChange((value: number) => update(() => light.setIntensity(value)))
    folder
      .add(state, 'castShadow')
      .name('硬阴影')
      .listen()
      .onChange((value: boolean) =>
        update(() => {
          light.castShadow = value
        })
      )
    folder
      .add(state, 'bias', 0, 0.01)
      .name('深度 bias')
      .listen()
      .onChange((value: number) => update(() => shadow.setBias(value)))
    folder.open()
  } catch (error) {
    closed = true
    try {
      unmountDatGUI(gui)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'HW1 GUI mount and rollback failed')
    }
    throw error
  }
  return () => {
    closed = true
    unmountDatGUI(gui)
  }
}

/**
 * dat.GUI 适配层。HW2 业务入口只定义 mount seam，不 import dat.GUI。
 *
 * 异步失败交给根 GUI 报告；销毁后的迟到回调不更新已卸载面板。
 */
function mountHW2GUI(options: HW2GUIOptions, reportFailure: (error: unknown) => void): () => void {
  const gui = mountDatGUI()
  let closed = false
  let version = 0
  const state = { preset: options.initialLabel, status: '默认加载进度见根面板' }

  try {
    const folder = gui.addFolder('HW2 / Mary / PRT')

    // “请求预设”并不宣称这一项已经显示；新请求失败时旧场景仍可能在显示。
    folder
      .add(state, 'preset', [...options.labels])
      .name('请求预设')
      .onChange((label: string) => {
        if (closed) return

        const request = ++version
        state.status = '加载中'

        void options.onSelect(label).then(
          () => {
            if (!closed && request === version) {
              state.status = '请求完成'
            }
          },
          (error: unknown) => {
            // 过期请求的清理失败也必须报告，不能只按 version 静默丢弃。
            reportFailure(error)

            if (!closed && request === version) {
              state.status = '请求失败；见根面板'
            }
          }
        )
      })

    folder.add(state, 'status').name('预设请求状态').listen()
    folder.open()
  } catch (error) {
    try {
      unmountDatGUI(gui)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'HW2 GUI mount and rollback failed')
    }

    throw error
  }

  return () => {
    closed = true
    version += 1
    unmountDatGUI(gui)
  }
}

/**
 * HW1/HW2 入口打开渲染会话之后、交出 disposer 之前失败：离开新模式，再传播原错误。
 *
 * 不离开的话会话一直占着设备，切换器以后的 beforeLoad（assertLegacyMode）都会被拒。
 * 离开也失败时两个错误一起抛出，不让清理错误盖掉入口错误。
 */
function leaveRenderModeAfterFailedEntry(ctx: SceneContext, error: unknown, name: string): never {
  try {
    ctx.engine.clearScene()
  } catch (cleanupError) {
    throw new AggregateError(
      [error, cleanupError],
      name + ' entry and render session cleanup both failed',
      {
        cause: error
      }
    )
  }

  throw error
}

/**
 * 安装 Games202 作业选择器；默认打开 HW2，并让 GUI 初值与实际入口一致。
 *
 * @returns 异步根清理函数；必须先 await 它，再销毁 Engine 或整体更换应用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][games202-serialized-handoff]
 *
 * 每次进入新作业前：旧会话清理成功 → Engine 允许旧模式 → 清空旧 pass。
 * HW1/HW2 只收到 ctx.engine，旧 HW3/4 才收到完整 SceneContext。
 * 根 GUI 会观察所有 Promise rejection；初次加载失败也保留错误面板和退出能力。
 */
// TODO(games202-root-session-owner): Engine.loadScene 目前不接管 loader 返回的
// 根 GUI disposer。应用级热切换/销毁调用方需要保存并 await 此返回值；
// 本批只保证本选择器内部 HW1↔HW2↔HW3↔HW4 的交接，不宣称整个应用卸载已闭环。
export async function setupGames202HWSceneGUI(ctx: SceneContext): Promise<() => Promise<void>> {
  const gui = mountDatGUI()
  const initialHomework: HomeworkName = 'HW2'
  const state = { scene: initialHomework, status: '初始化', error: '' }
  let closed = false
  let guiUnmounted = false
  let requestVersion = 0

  /** 先保留 GUI 诊断，再尝试记录完整错误；日志 sink 抛错也不产生新的 rejection。 */
  function reportFailure(error: unknown): void {
    state.status = '失败'
    state.error = error instanceof Error ? error.message : 'Unknown failure'

    try {
      logger.error('[Games202 scene session]', error)
    } catch {
      // 错误 sink 本身失败时，至少保留 GUI 诊断，不能制造第二个未处理 rejection。
      state.error += ' (logging failed)'
    }
  }

  const switcher = new Games202SceneSwitcher(
    async (name) => {
      switch (name) {
        case 'HW1':
        case 'HW2': {
          const version = requestVersion
          let active = true

          /**
           * [DESIGN-WEIGHT:3][engine-render-session-entry]
           * 先打开新渲染会话，再把 host 交给 HW2；Controller 的 setScene 只复用会话。
           * 切换器串行交接，本 loader 交回 disposer 之前不会有清场插进来，
           * 所以这里不处理「会话打开中被清场」。入口失败时还没挂载任何东西，直接传播。
           */
          await ctx.engine.enterRenderMode()

          /**
           * [DESIGN-WEIGHT:3][hw2-orbit-input-lifetime]
           * Engine.create 的 canvas 是 DOM canvas；不控制 ctx.camera（旧 Three 相机）。
           * 每次事件查询当前 binding，预设换相机后无需重新挂载 DOM listener。
           * target 与 createHW2Scene 的初始朝向一致；挂载不会改写初始取景。
           * 右键沿屏幕平面移动，0.8 是灵敏度倍率；此处不启用阻尼或另建帧循环。
           */
          // TODO(engine-session-canvas-switch): 会话 canvas 可能不是 ctx.gl.canvas 之后，
          // 输入要挂到会话 canvas 上；本批 WebGL1 会话与旧路径共用这块 canvas。
          let stopOrbit: () => void
          try {
            stopOrbit = mountOrbitCameraInput(
              ctx.gl.canvas as HTMLCanvasElement,
              () => (active && !closed ? (ctx.engine.currentSceneBinding?.camera ?? null) : null),
              { target: [0, 10, 0], minDistance: 1, maxDistance: 300, panSpeed: 0.8 }
            )
          } catch (error) {
            leaveRenderModeAfterFailedEntry(ctx, error, name)
          }

          let session: ReturnType<typeof loadHW2Scene> | ReturnType<typeof loadHW1Scene>
          let currentHW1: () => HW1SceneBuildResult | null = () => null
          let stopHW1GUI: (() => void) | null = null
          try {
            if (name === 'HW1') {
              const hw1 = loadHW1Scene(ctx.engine)
              session = hw1
              currentHW1 = () => hw1.current
            } else {
              session = loadHW2Scene(ctx.engine, (options) => mountHW2GUI(options, reportFailure))
            }
          } catch (error) {
            active = false
            stopOrbit()
            leaveRenderModeAfterFailedEntry(ctx, error, name)
          }

          // 不 await 默认资源。立即交还退出能力；HW1 仅在成功安装且仍活动时挂控件。
          void session.ready
            .then(() => {
              if (active && !closed && version === requestVersion) {
                const hw1 = currentHW1()
                if (hw1 !== null) stopHW1GUI = mountHW1GUI(hw1, reportFailure)
                state.status = name + ' 默认预设请求结束'
              }
            })
            .catch(reportFailure)

          return () => {
            active = false
            // 输入先停止，随后即使设备清理失败，也不能再操纵退出中的相机。
            stopOrbit()
            if (stopHW1GUI !== null) {
              stopHW1GUI()
              stopHW1GUI = null
            }
            session.dispose()
          }
        }

        // 独立实验入口，不替换旧 HW3/SSR，也不共享旧 Renderer。
        case 'Deferred/Lambert':
          return openDeferredSceneSession(ctx, reportFailure)

        case 'HW3':
          return loadHW3Scene(ctx)

        case 'HW4':
          return loadHW4Scene(ctx)
      }
    },
    () => {
      // 先校验，再接触旧 pass；context lost 或 Backend 未退出时绝不继续。
      ctx.engine.assertLegacyMode()
      ctx.renderer.clearRenderPasses()
    }
  )

  try {
    const folder = gui.addFolder('switch scenes')

    folder.add(state, 'scene', [...HOMEWORK_NAMES]).onChange((name: HomeworkName) => {
      if (closed) return

      const request = ++requestVersion
      state.status = '切换中'
      state.error = ''

      void switcher.switchTo(name).then(() => {
        if (!closed && request === requestVersion) {
          state.status = name + ' 会话已打开'
        }
      }, reportFailure)
    })

    folder.add(state, 'status').listen()
    folder.add(state, 'error').listen()
    folder.open()
  } catch (error) {
    // 尚未启动任何 loader，仅需回滚根 GUI。
    try {
      unmountDatGUI(gui)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Games202 GUI mount and rollback failed')
    }

    throw error
  }

  /**
   * [DESIGN-WEIGHT:3][engine-loop-failure-notice]
   * 帧循环在 rAF 回调里失败停止时，没有 Promise 能把错误交到这里；订阅 Engine 的通知，
   * 显示到同一个 error 框。HW3 → HW2 曾因预检失败停止绘制，界面上却什么都没有。
   * GUI 挂好之后才订阅，挂载失败的回滚路径就不用取消订阅。
   */
  const stopWatchingLoop = ctx.engine.onLoopFailure((failure) => {
    if (closed) return
    const reason = failure.cause instanceof Error ? failure.cause.message : String(failure.cause)
    reportFailure(
      new Error('渲染循环已停止（' + failure.operation + '）：' + reason, { cause: failure.cause })
    )
  })

  await switcher.switchTo(initialHomework).then(() => {
    if (requestVersion === 0 && !closed) {
      state.status = initialHomework + ' 会话已打开'
    }
  }, reportFailure)

  return async () => {
    closed = true
    requestVersion += 1
    stopWatchingLoop()
    const errors: unknown[] = []

    try {
      await switcher.dispose()
    } catch (error) {
      errors.push(error)
    }

    if (!guiUnmounted) {
      try {
        unmountDatGUI(gui)
        guiUnmounted = true
      } catch (error) {
        errors.push(error)
      }
    }

    if (errors.length === 1) throw errors[0]

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Games202 cleanup failed')
    }
  }
}
