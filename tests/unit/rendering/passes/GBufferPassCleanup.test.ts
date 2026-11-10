import { describe, expect, it } from 'vitest'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import { createGBufferShaderModule } from '@/rendering/gbuffer/createGBufferMaterial'
import { ResourceDisposedError } from '@/rendering/core/errors'

describe('GBufferPass owned target cleanup', () => {
  /** 使用真实 RenderTarget 的清理任务注入故障，不模拟 Pass 自身实现。 */
  it('失败后关闭入口，后续 dispose 继续失败 target', () => {
    const shaderModule = createGBufferShaderModule()
    const pass = new GBufferPass({ shaderModule, label: 'cleanup/gbuffer' })
    const target = pass.target
    let attempts = 0
    target.onDispose(() => {
      if (++attempts === 1) throw new Error('GPU')
    })
    expect(() => pass.dispose()).toThrow()
    expect(() => pass.target).toThrow(ResourceDisposedError)
    pass.dispose()
    pass.dispose()
    expect(target.cleanupState).toBe('complete')
    expect(attempts).toBe(2)
    expect(shaderModule.disposed).toBe(false)
    shaderModule.dispose()
  })

  /** 清理中的内层 dispose 必须报告未完成，不能让外层 owner 提前标记成功。 */
  it('target 清理回调不能重入 dispose 并虚报完成', () => {
    const shaderModule = createGBufferShaderModule()
    const pass = new GBufferPass({ shaderModule, label: 'cleanup/reentry' })
    const target = pass.target
    target.onDispose(() => {
      expect(() => pass.dispose()).toThrow()
      expect(target.cleanupState).toBe('running')
    })
    pass.dispose()
    expect(target.cleanupState).toBe('complete')
    shaderModule.dispose()
  })
})
