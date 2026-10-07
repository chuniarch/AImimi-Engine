import { describe, expect, expectTypeOf, it } from 'vitest'

import type { DrawSubmission, RenderBackend } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { ViewState } from '@/rendering/frame/ViewState'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { Mat4Tuple } from '@/rendering/core/math/tuples'

/**
 * 只由 tsc 验证，运行时不调用。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]
 * 若回调退化为 () => void，async 负例将不再报错，ts-expect-error 会失效。
 */
function checkTypes(backend: RenderBackend, item: RenderItem, view: ViewState): void {
  const descriptor: RenderSurfaceScopeDescriptor = {
    surface: { kind: 'default-framebuffer' },
    clear: { color: [0, 0, 0, 1], depth: 1 }
  }

  backend.withRenderSurface(descriptor, () => {
    backend.draw({ item, view })
  })

  // @ts-expect-error 旧的独立 clear 已被入口描述替代。
  backend.clear({ depth: 1 })
  // @ts-expect-error 旧的直接 surface 入参不再成立。
  backend.withRenderSurface({ kind: 'default-framebuffer' }, () => undefined)
  // @ts-expect-error null 不能表示默认输出。
  backend.withRenderSurface({ surface: null }, () => undefined)
  // @ts-expect-error render-target 分支必须给出目标。
  backend.withRenderSurface({ surface: { kind: 'render-target' } }, () => undefined)
  // @ts-expect-error 不允许 Promise 回调。
  backend.withRenderSurface(descriptor, async () => undefined)
  // @ts-expect-error 也不接受普通数值返回。
  backend.withRenderSurface(descriptor, () => 1)
  // @ts-expect-error ready 是只读观察值。
  backend.ready = true
  // @ts-expect-error Backend 消费完整 DrawSubmission。
  backend.draw({ geometry: item.geometry })
  // @ts-expect-error 矩阵必须含有 16 个元素。
  const incomplete: Mat4Tuple = [1, 0, 0]
  void incomplete
}
void checkTypes

describe('RenderBackend boundary contract', () => {
  /** 类型检查不能冒充 framebuffer 或像素验收。 */
  it('scope 同时接收目的地与入口清除描述', () => {
    expectTypeOf<RenderBackend['withRenderSurface']>().parameters.toEqualTypeOf<
      [RenderSurfaceScopeDescriptor, () => undefined]
    >()
    expectTypeOf<RenderBackend['draw']>().parameters.toEqualTypeOf<[DrawSubmission]>()
  })

  /** 描述只借用目标；不 retain，也不把已释放目标自动替换为屏幕。 */
  it('scope descriptor 不取得目标生命周期所有权', () => {
    const target = new RenderTarget(
      { width: 16, height: 8, colors: [{ format: 'rgba8' }] },
      { label: 'test/backend-surface' }
    )

    const descriptor: RenderSurfaceScopeDescriptor = {
      surface: { kind: 'render-target', target },
      clear: { color: [0, 0, 0, 1] }
    }

    expect(target.sceneReferenceCount).toBe(0)

    target.resize(32, 16)
    target.dispose()

    expect(descriptor.surface.kind).toBe('render-target')
    expect(target.disposed).toBe(true)
  })
})
