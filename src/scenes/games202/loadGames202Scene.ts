import { setupGames202HWSceneGUI } from '@/gui/games202/setup'
import type { SceneContext } from '../types/SceneContext'

/**
 * 保留根 GUI 的清理返回值；直接调用本函数的应用可以保存并 await 它。
 *
 * 经由 Engine.loadScene 调用时，返回值所有权仍见 setup 中的 root-session TODO。
 */
export async function loadGames202Scenes(ctx: SceneContext): Promise<() => Promise<void>> {
  return setupGames202HWSceneGUI(ctx)
}
