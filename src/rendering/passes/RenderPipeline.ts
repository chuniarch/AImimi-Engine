import { ResourceDisposedError } from '@/rendering/core/errors'
import { RenderExecutionError } from '@/rendering/core/errors/RenderExecutionError'
import type { RenderPass } from './RenderPass'
import type { RenderPassContext } from './RenderPassContext'

/**
 * 有序执行并拥有登记的 Pass，不拥有场景 Resource。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][pipeline-pass-ownership]
 *
 * add 转入所有权，remove 立即释放；不是“取出后转给别人”。
 *
 * 调用者不能把同一 Pass 同时交给多个 Pipeline，
 * 也不能在外部提前释放它。
 *
 * 本类检测自己的重复登记，不使用全局注册表追踪其他 Pipeline。
 */
export class RenderPipeline {
  private readonly passes: RenderPass[] = []

  /**
   * WeakSet 不阻止移除后的 Pass 被 GC，
   * 但能拒绝重新加入本 Pipeline 已释放的实例。
   */
  private readonly accepted = new WeakSet<RenderPass>()

  /**
   * Pipeline 的生命周期；与表示当前调用尚未退出的 busy 分开记录。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][pipeline-cleanup-only-state]
   *
   * closing 表示只能继续清理整个 Pipeline，不代表此刻仍在运行 dispose。
   * 主动 dispose 或 removePass 中的释放失败都会进入该状态。
   * 此后 addPass、removePass、execute 均被拒绝；后续清理入口是 dispose。
   */
  private state: 'active' | 'closing' | 'disposed' = 'active'

  /** 包括执行或释放中的同步回调；禁止其重入或修改本 Pipeline。 */
  private busy: boolean = false

  /** 包括执行或释放中的同步回调；禁止其重入或修改本 Pipeline。 */
  addPass(pass: RenderPass): void {
    this.assertIdle('addPass')

    if (this.accepted.has(pass))
      throw new RenderExecutionError('RenderPipeline', 'addPass', 'pass was already accepted')

    this.accepted.add(pass)
    this.passes.push(pass)
  }

  /**
   * 成功释放后才移除。
   * 失败时保留所有权，转入只允许 dispose 重试的状态。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][pipeline-cleanup-only-state]
   *
   * pass.dispose 抛错时，该 Pass 可能已经部分释放，不能继续执行。
   * splice 尚未发生，所以失败的 Pass 留在列表中，避免遗失剩余清理责任。
   * 本版选择终止整个 Pipeline 的使用：调用者处理异常后调用 dispose，
   * 按登记顺序清理所有剩余 Pass；不是重新调用 removePass 重试单项移除。
   */
  removePass(pass: RenderPass): boolean {
    this.assertIdle('removePass')

    const index = this.passes.indexOf(pass)
    if (index === -1) return false

    this.busy = true

    try {
      pass.dispose()
      this.passes.splice(index, 1)
      return true
    } catch (error) {
      this.state = 'closing'
      throw error
    } finally {
      this.busy = false
    }
  }

  /**
   * 顺序执行。
   * 异常中止后续 Pass，finally 允许调用者修复后发起下一帧。
   */
  execute(context: RenderPassContext): undefined {
    this.assertIdle('execute')

    this.busy = true

    try {
      for (const pass of this.passes) {
        pass.execute(context)
      }
    } finally {
      this.busy = false
    }
  }

  /*
   * TODO(render-pipeline-disposal-order-and-progress): 后续增加大量 Pass 或跨 Pass
   * 资源依赖时重新评估以下事项；当前仍按登记顺序清理，不在此改变运行时契约。
   *
   * 1. 清理顺序应依据 dispose 期间的真实依赖，而非直接套用执行或登记顺序。
   *    若改为逆序或依赖顺序，先明确资源所有权与借用关系，再更新文档及顺序测试。
   * 2. 评估反复 shift 的成本；逐项前移模型下存在 O(n²) 的数组管理开销，
   *    但实际成本取决于引擎优化。保持正序时可改用持久化游标，最后一次性清空数组；
   *    不应只为性能直接换成 pop，因为它会改变清理顺序。
   * 3. 游标只在当前 Pass 释放成功后递增，并跨 dispose 调用保存。
   *    抛错时保留失败项及后续项，重试跳过成功项；继续保留 closing 与 busy 防重入约束。
   * 4. 简单游标会暂时保留成功项的强引用；若需立即解除引用，应清空已完成槽位，
   *    并同步调整内部数组类型和访问不变量，不能仅移动游标就视为已经移除引用。
   * 5. 改动时回归验证清理顺序、首项/中间项/末项失败、显式重试、同步重入及完成后幂等；
   *    保持 Renderer 先完成 Pipeline 清理、再释放 Backend 的跨层依赖顺序。
   */

  /**
   * 按当前顺序清理；成功的 Pass 立即从待清理列表移除。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][render-dispose-retry-order]
   *
   * 抛错时保留失败项和后续项，禁止恢复 render/add/remove，
   * 只能显式重试 dispose。
   *
   * 不自动重试、不吞错，也不把尚未完成的清理标成成功。
   */
  dispose(): void {
    // 完整清理已经结束，重复调用不再执行任何 Pass。
    if (this.state === 'disposed') return

    // 允许 closing 状态下重试，但禁止当前清理回调中的同步重入。
    this.assertNotBusy('dispose')

    this.state = 'closing'
    this.busy = true

    try {
      while (this.passes.length > 0) {
        // 循环条件保证存在首项；公共修改入口也被 busy 检查拦住。
        const pass = this.passes[0]!

        // 抛错时下面的 shift 不执行，失败项仍保留在列表中。
        pass.dispose()

        // 只移除清理成功的项，记录本次已完成的进度。
        this.passes.shift()
      }

      // 只有全部 Pass 都清理成功，才能标记整个 Pipeline 已释放。
      this.state = 'disposed'
    } finally {
      // 抛错也必须复位，调用者才能在处理异常后再次尝试清理。
      this.busy = false
    }
  }

  /** 状态检查集中在公共操作入口，避免各方法遗漏相同的生命周期约束。 */
  private assertIdle(operation: string): void {
    if (this.state !== 'active') throw new ResourceDisposedError('RenderPipeline')

    this.assertNotBusy(operation)
  }

  /**
   * 统一拒绝同步重入，不检查 active/closing/disposed 生命周期。
   *
   * @remarks
   * assertIdle 先要求 active，再调用本方法；dispose 则在处理 disposed 后
   * 直接调用本方法，因此可以在 closing 且 busy=false 时继续清理。
   * busy 判断及其领域错误只在这里定义，两个入口复用同一份逻辑。
   */
  private assertNotBusy(operation: string): void {
    if (this.busy)
      throw new RenderExecutionError('RenderPipeline', operation, 'operation in progress')
  }
}
