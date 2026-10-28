import { HW2SceneController, type HW2SceneFactory, type SceneHost } from './HW2SceneController'
import { HW2_CPU_PRESETS } from './_config/hw2CPUSceneConfig'

/** GUI 只接触标签和异步操作，不获得 Scene、Engine 或 GPU 对象。 */
export interface HW2GUIOptions {
  readonly labels: readonly string[]
  readonly initialLabel: string

  /** 调用方必须观察 rejection；取消正常结束，真实加载/清理错误仍传播。 */
  readonly onSelect: (label: string) => Promise<void>
}

/**
 * 挂载 GUI 并返回同步卸载函数。
 *
 * 挂载期间只登记 onSelect，不同步触发它。
 * 挂载若抛错，由实现者撤销已创建的 DOM/listener；不能遗失半成品。
 * 卸载若失败，应允许调用者再次尝试。
 */
export type MountHW2GUI = (options: HW2GUIOptions) => () => void

/** 会话先返回，资源加载后完成；两者不是同一个时间点。 */
export interface HW2SceneSession {
  /** 默认预设安装或被取消时完成；失败由调用方报告，不自动销毁整个会话。 */
  readonly ready: Promise<void>

  /** 立即终止请求并退出 HW2；清理失败会抛错，可再次调用重试。 */
  dispose(): void
}

/**
 * HW2 应用入口：组装预设、Controller 与 GUI。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-entry-early-dispose]
 *
 * 本函数故意不是 async。调用方无需等数据加载完成，就能拿到 dispose，
 * 因而“进入 HW2 后马上离开”不会被网络请求卡住。
 * 同一个 host 同时只允许一个 HW2 会话；由作业切换器保证交接顺序，
 * 并在调用本函数之前打开 host 的渲染会话（Engine.enterRenderMode）。
 *
 * 工厂注入只用于替换资产 I/O；场景竞争和所有权仍由真实 Controller 处理。
 */
export function loadHW2Scene(
  host: SceneHost,
  mountGUI: MountHW2GUI,
  factory?: HW2SceneFactory
): HW2SceneSession {
  const initial = HW2_CPU_PRESETS.find((preset) => preset.label === 'CornellBox / Mary / Shadowed')
  if (!initial) throw new RangeError('Missing default HW2 Mary preset')

  const controller = new HW2SceneController(host, factory)
  let closed = false
  let disposing = false
  let controllerStopped = false
  let hostCleared = false
  let guiUnmounted = false

  /** 关闭后迟到的 GUI 事件不再触发 I/O；未知标签不能静默选中其他模型。 */
  async function select(label: string): Promise<void> {
    if (closed) return

    const preset = HW2_CPU_PRESETS.find((entry) => entry.label === label)
    if (!preset) throw new RangeError('Unknown HW2 preset: ' + label)

    await controller.applyPreset(preset)
  }

  // 先挂载，再启动异步工厂。挂载失败时还没有创建候选场景。
  const unmountGUI = mountGUI({
    labels: Object.freeze(HW2_CPU_PRESETS.map((preset) => preset.label)),
    initialLabel: initial.label,
    onSelect: select
  })

  const ready = controller.applyPreset(initial)

  /**
   * 独立尝试 host 和 GUI 清理，成功部分不重复执行。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-entry-cleanup-retry]
   *
   * Controller.dispose 首次调用就永久终止 Controller，即使 clearScene 抛错。
   * 因此重试必须直接调用 host.clearScene，而不是重复调用已终止 Controller。
   * host 对应 Task 21 Engine：清理失败时保留尚未释放的 Backend 以便重试。
   * 此函数不承诺重试任意 Resource listener 的部分失败。
   */
  function dispose(): void {
    if (disposing || (hostCleared && guiUnmounted)) return

    closed = true
    disposing = true
    const errors: unknown[] = []

    try {
      if (!hostCleared) {
        try {
          if (!controllerStopped) {
            controllerStopped = true
            controller.dispose()
          } else {
            host.clearScene()
          }

          hostCleared = true
        } catch (error) {
          errors.push(error)
        }
      }

      if (!guiUnmounted) {
        try {
          unmountGUI()
          guiUnmounted = true
        } catch (error) {
          errors.push(error)
        }
      }
    } finally {
      disposing = false
    }

    if (errors.length === 1) throw errors[0]

    if (errors.length > 1) {
      throw new AggregateError(errors, 'HW2 host and GUI cleanup failed')
    }
  }

  return Object.freeze({ ready, dispose })
}
