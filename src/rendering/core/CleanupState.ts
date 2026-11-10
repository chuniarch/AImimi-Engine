/**
 * 同步清理流程的进度；它与“是否仍允许正常使用”是两个不同的问题。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][resource-disposal-progress]
 *
 * not-started：尚未关闭使用入口。
 * running：当前调用正在清理，允许观察状态，但不能再次执行同一任务。
 * failed：本轮清理失败，剩余工作保留，等待下一次显式调用。
 * complete：本对象负责的全部清理任务已经成功返回。
 *
 * failed 只能继续进入 running，不能回到 not-started。
 * complete 是终态；它不表示 CPU 已等待 GPU 的物理回收完成。
 */
export type CleanupState = 'not-started' | 'running' | 'failed' | 'complete'
