import { describe, expect, it } from 'vitest'
import { createPackedDepthShaderModule } from '@/rendering/shadows/createPackedDepthShaderModule'
import vertexSource from '@/shaders/lighting/shadow/packedDepth/vertex.vert?raw'
import fragmentSource from '@/shaders/lighting/shadow/packedDepth/fragment.frag?raw'

/**
 * 工厂测试只确认 CPU 源码与 uniform 协议，不把字符串比较当成 GPU 编译验收。
 * 真实 shader 的像素正确性由既有 packed-depth 浏览器测试覆盖。
 */
describe('createPackedDepthShaderModule', () => {
  it('连接完整 GLSL ES 1.00 生产者和三种矩阵语义', () => {
    const shader = createPackedDepthShaderModule()
    expect(shader.language).toBe('glsl-es-100')
    expect(shader.vertexSource).toBe(vertexSource)
    expect(shader.fragmentSource).toBe(fragmentSource)
    expect(shader.builtInUniforms).toEqual({
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix'
    })
    shader.dispose()
  })

  it('每次返回独立、由调用者管理的资源，而非隐式全局单例', () => {
    const first = createPackedDepthShaderModule()
    const second = createPackedDepthShaderModule()
    expect(first).not.toBe(second)
    expect(first.name).toBe(second.name)
    first.dispose()
    expect(second.disposed).toBe(false)
    expect(second.vertexSource).toBe(vertexSource)
    second.dispose()
  })
})
