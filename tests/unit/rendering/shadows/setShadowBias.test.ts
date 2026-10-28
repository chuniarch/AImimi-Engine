import { describe, expect, it } from 'vitest'
import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { setShadowBias } from '@/rendering/shadows/setShadowBias'

/** 每例使用独立材质，旧值 0.01 用于验证失败不会破坏已提交参数。 */
function material(): Material {
  return new Material({
    shaderModule: new ShaderModule({
      name: 'test/shadow-bias',
      language: 'glsl-es-100',
      vertexSource: 'void main() { gl_Position = vec4(0.0); }',
      fragmentSource: 'precision highp float; void main() { gl_FragColor = vec4(1.0); }'
    }),
    parameters: { uShadowBias: { type: 'float', value: 0.01 } }
  })
}

describe('setShadowBias', () => {
  /** Given 合法归一化深度偏移；When 提交；Then 保留 CPU 数值，不误用世界空间单位。 */
  it.each([0, 0.001, 1])('写入非负有限 bias %s', (bias) => {
    const target = material()
    setShadowBias(target, bias)
    expect(target.getParameter('uShadowBias')).toEqual({ type: 'float', value: bias })
  })

  /**
   * [DESIGN-WEIGHT:3][shadow-depth-comparison]
   * Given 旧值；When 非法/Float32 溢出输入；Then 抛领域错误且旧值保持不变。
   */
  it.each([-0.001, NaN, Infinity, -Infinity, 1e100, '0.1', null, undefined])(
    '拒绝 %s，失败不修改旧参数',
    (bias) => {
      const target = material()
      expect(() => setShadowBias(target, bias as number)).toThrow(InvalidMaterialError)
      expect(target.getParameter('uShadowBias')).toEqual({ type: 'float', value: 0.01 })
    }
  )

  /** 生命周期由 Material 原有公共 API 负责；helper 不应绕过已释放状态。 */
  it('不复活已释放 Material', () => {
    const target = material()
    target.dispose()
    expect(() => setShadowBias(target, 0)).toThrow(ResourceDisposedError)
  })
})
