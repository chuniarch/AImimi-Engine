import { describe, expect, expectTypeOf, it } from 'vitest'

import type { DrawSubmission, RenderBackend } from '@/rendering/backend/RenderBackend'
import type { ClearDescriptor, RenderSurface } from '@/rendering/backend/RenderSurface'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { Mat4Tuple, ViewState } from '@/rendering/frame/ViewState'
import { RenderTarget } from '@/rendering/resources/RenderTarget'

/**
 * 只交给 tsc 检查，不在运行时调用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]
 * Vitest 转译不会验证 ts-expect-error；必须另外运行测试项目的 tsc。
 */
function checkTypeContracts(
  backend: RenderBackend,
  target: RenderTarget,
  item: RenderItem,
  view: ViewState
): void {
  backend.withRenderSurface({ kind: 'default-framebuffer' }, () => undefined)
  backend.withRenderSurface({ kind: 'render-target', target }, () => undefined)
  backend.clear({ depth: 1 })
  backend.draw({ item, view })

  // @ts-expect-error 默认输出不能用 null 表示。
  backend.withRenderSurface(null, () => undefined)
  // @ts-expect-error render-target 分支必须明确给出逻辑目标。
  backend.withRenderSurface({ kind: 'render-target' }, () => undefined)

  const asyncCallback = async (): Promise<undefined> => undefined
  // @ts-expect-error Promise 不能跨越同步 scope。
  backend.withRenderSurface({ kind: 'default-framebuffer' }, asyncCallback)
  // @ts-expect-error 普通数值返回也不是同步 callback 的 undefined 契约。
  backend.withRenderSurface({ kind: 'default-framebuffer' }, () => 1)
  // @ts-expect-error ready 是只读观察值。
  backend.ready = true
  // @ts-expect-error Backend 消费 DrawSubmission，不消费零散 Mesh/Camera 字段。
  backend.draw({ geometry: item.geometry, material: item.material })
  // @ts-expect-error 矩阵必须包含 16 个元素。
  const incomplete: Mat4Tuple = [1, 0, 0]
  void incomplete
}
void checkTypeContracts

describe('RenderBackend boundary contract', () => {
  /**
   * 这是类型契约，不是 framebuffer 恢复测试。
   * 若接口被放宽成 () => void，tsc 会发现对应 ts-expect-error 不再成立。
   */
  it('公开输入类型固定为显式 surface、clear 与 draw submission', () => {
    expectTypeOf<RenderBackend['withRenderSurface']>().parameters.toEqualTypeOf<
      [RenderSurface, () => undefined]
    >()
    expectTypeOf<RenderBackend['draw']>().parameters.toEqualTypeOf<[DrawSubmission]>()
    expectTypeOf<RenderBackend['clear']>().parameters.toEqualTypeOf<[ClearDescriptor]>()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-surface-explicit-destination]
   * 一个指向已释放目标的 surface 不会自动转换为 default-framebuffer。
   * 真正的 Backend 必须拒绝它；本测试不伪造尚未实现的 Backend。
   */
  it('surface 借用目标，resize 与 dispose 不改变输出分支', () => {
    const target = new RenderTarget({
      width: 256,
      height: 128,
      colors: [{ format: 'rgba8' }]
    })
    const surface: RenderSurface = { kind: 'render-target', target }

    target.resize(512, 256)
    expect(surface.target.descriptor.width).toBe(512)
    expect(target.sceneReferenceCount).toBe(0)

    target.dispose()
    expect(surface.kind).toBe('render-target')
    expect(surface.target.disposed).toBe(true)
  })
})
