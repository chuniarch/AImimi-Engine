import { mountDatGUI, unmountDatGUI } from '@/gui/_shared/mountGUI'
import { mountOrbitCameraInput } from '@/rendering/controls/mountOrbitCameraInput'
import type { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { loadDeferredScene } from '@/scenes/games202/deferred/loadDeferredScene'
import type { SceneContext } from '@/scenes/types/SceneContext'

/** 仅记录本入口的清理进度，不替代底层 Resource 的生命周期协议。 */
interface CleanupTask {
  readonly run: () => void
  /** pending 请求仍可能交回迟到候选，不能仅凭本次取消成功就永久注销任务。 */
  readonly canComplete?: () => boolean
  done: boolean
}

/**
 * 控件只改 CPU Light；下一帧由 Builder 生成一致的灯光快照。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][deferred-controls-frame-boundary]
 * 固定 Y/Z，只调 X，避免把位置调到 target 产生零方向。
 * 关闭后保留的旧 DOM 回调必须无效；mount 失败先回滚自己的面板。
 */
function mountLightGUI(
  light: DirectionalLight,
  reportFailure: (error: unknown) => void,
  registerCleanup: (task: CleanupTask) => void
): void {
  const gui = mountDatGUI()
  let closed = false
  const task: CleanupTask = {
    run: () => {
      closed = true
      unmountDatGUI(gui)
    },
    done: false
  }
  // 先交出清理责任，再执行可能抛错的控件构造；回滚失败仍可由会话退出重试。
  registerCleanup(task)
  const state = { intensity: light.intensity, lightX: light.transform.position[0] }
  function update(action: () => void): void {
    if (closed) return
    try {
      action()
    } catch (error) {
      reportFailure(error)
    }
    state.intensity = light.intensity
    state.lightX = light.transform.position[0]
  }
  try {
    const folder = gui.addFolder('Deferred / Lambert / Floor + Box')
    folder
      .add(state, 'intensity', 0, 5)
      .name('光照强度')
      .listen()
      .onChange((value: number) => update(() => light.setIntensity(value)))
    folder
      .add(state, 'lightX', -8, 8)
      .name('灯光 X')
      .listen()
      .onChange((x: number) =>
        update(() => {
          const [, y, z] = light.transform.position
          light.transform.setPosition([x, y, z])
        })
      )
    folder.open()
  } catch (error) {
    closed = true
    try {
      task.run()
      task.done = true
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Deferred GUI rollback failed', {
        cause: error
      })
    }
    throw error
  }
}

/**
 * 将独立 Deferred 会话接到既有 Games202 选择器，不替换 HW3/SSR。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-gui-session-lifetime]
 * 先打开 render mode，再挂输入、发起构建；不 await ready，立即交回退出能力。
 * 关闭先使回调失效，再逐项卸载输入/面板/场景；某项失败不阻断其余清理。
 * 成功项从清单移除，失败项留给下一次显式调用。此处不另建帧循环。
 * 这不表示根选择器会保留已经切走的异步会话；本批默认工厂没有资产 I/O。
 */
// TODO(deferred-async-retirement-owner): 加入真正异步资产加载前，需要让根选择器
// 保留已退出但 ready 尚未结束的会话，才能重试切走后迟到的候选清理失败。
export async function openDeferredSceneSession(
  ctx: SceneContext,
  reportFailure: (error: unknown) => void
): Promise<() => void> {
  await ctx.engine.enterRenderMode()
  let active = true
  let busy = false
  const cleanup: CleanupTask[] = []
  try {
    const stopOrbit = mountOrbitCameraInput(
      ctx.gl.canvas as HTMLCanvasElement,
      () => (active ? (ctx.engine.currentSceneBinding?.camera ?? null) : null),
      { target: [0, 1, 0], minDistance: 0.5, maxDistance: 50, panSpeed: 0.8 }
    )
    cleanup.push({ run: stopOrbit, done: false })
    const session = loadDeferredScene(ctx.engine)
    let readySettled = false
    // 场景退出始终最后执行；ready 后的面板清理插到它之前。
    cleanup.push({ run: () => session.dispose(), canComplete: () => readySettled, done: false })
    void session.ready
      .finally(() => {
        readySettled = true
      })
      .then(() => {
        if (!active || session.current === null) return
        mountLightGUI(session.current.light, reportFailure, (task) => {
          cleanup.splice(cleanup.length - 1, 0, task)
        })
      })
      .catch(reportFailure)
  } catch (error) {
    active = false
    const errors: unknown[] = [error]
    for (const task of cleanup) {
      try {
        task.run()
      } catch (cause) {
        errors.push(cause)
      }
    }
    try {
      ctx.engine.clearScene()
    } catch (cause) {
      errors.push(cause)
    }
    if (errors.length > 1)
      throw new AggregateError(errors, 'Deferred entry rollback failed', { cause: error })
    throw error
  }

  return () => {
    if (busy) return
    active = false
    busy = true
    const errors: unknown[] = []
    try {
      for (const task of cleanup) {
        if (task.done) continue
        try {
          task.run()
          task.done = task.canComplete?.() ?? true
        } catch (error) {
          errors.push(error)
        }
      }
    } finally {
      busy = false
    }
    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new AggregateError(errors, 'Deferred GUI session cleanup failed')
  }
}
