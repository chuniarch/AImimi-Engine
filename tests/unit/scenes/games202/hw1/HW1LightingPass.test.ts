import { describe, expect, it } from 'vitest'
import { HW1LightingPass, createHW1LightBlock } from '@/scenes/games202/hw1/HW1LightingPass'
import { ResourceDisposedError } from '@/rendering/core/errors'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'

/** 只提供本 Pass 允许读取的帧数据；触碰 backend/scene 会因为不存在而使测试失败。 */
function context(radiance: readonly [number, number, number], uuid = 'sun'): RenderPassContext {
  // 刻意不伪造完整 Renderer：这里只验证 Pass 读取的两个快照值和 UUID。
  return {
    lights: [{ uuid, directionToLightView: [0, 1, 0], radiance }]
  } as unknown as RenderPassContext
}

describe('HW1LightingPass', () => {
  /** [DESIGN-WEIGHT:3][hw1-lighting-frame-snapshot] 两个材质下一次 draw 都读同一帧的方向和辐亮度。 */
  it('按 UUID 从帧快照更新共享块，关闭阴影不会关闭光照', () => {
    const block = createHW1LightBlock()
    const pass = new HW1LightingPass('sun', block)
    try {
      pass.execute(context([3, 2, 1]))
      expect(block.get('uLightRadiance')).toEqual({ type: 'vec3', value: [3, 2, 1] })
      expect(block.get('uDirectionToLightView')).toEqual({ type: 'vec3', value: [0, 1, 0] })
      pass.execute(context([1, 0, 0]))
      expect(block.get('uLightRadiance')).toEqual({ type: 'vec3', value: [1, 0, 0] })
      pass.execute(context([9, 9, 9], 'another light'))
      expect(block.get('uLightRadiance')).toEqual({ type: 'vec3', value: [0, 0, 0] })
    } finally {
      pass.dispose()
      block.dispose()
    }
  })

  /** Pass 的退出不能清掉其他材质仍借用的块，但终止的 Pass 不能继续写它。 */
  it('释放只终止自身，借用块的生命周期由场景负责', () => {
    const block = createHW1LightBlock()
    const pass = new HW1LightingPass('sun', block)
    pass.dispose()
    pass.dispose()
    expect(block.disposed).toBe(false)
    expect(() => pass.execute(context([1, 1, 1]))).toThrow(ResourceDisposedError)
    block.dispose()
  })
})
