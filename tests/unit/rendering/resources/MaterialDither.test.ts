import { describe, expect, it } from 'vitest'
import { InvalidMaterialError } from '@/rendering/core/errors'
import { Material, type RenderStateInput } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'

/** CPU 测试无需编译 GLSL；只验证 Material 的状态快照边界。 */
function shader(): ShaderModule {
  return new ShaderModule({
    name: 'test/dither',
    language: 'glsl-es-100',
    vertexSource: 'void main() { gl_Position = vec4(0.0); }',
    fragmentSource: 'precision mediump float; void main() { gl_FragColor = vec4(1.0); }'
  })
}

describe('Material dither contract', () => {
  /** Given 普通材质；When 未填写；Then 默认开启，不能依赖前一次 draw 的状态。 */
  it('省略 dither 时默认 true', () => {
    const material = new Material({ shaderModule: shader() })
    expect(material.state.dither).toBe(true)
  })

  /**
   * [DESIGN-WEIGHT:3][draw-dither-state]
   * Given 输入 false；When 构造后修改输入；Then 材质仍保留冻结的 false。
   * 用 || 提供默认值、漏复制或漏冻结，都会破坏这个契约。
   */
  it('保留 false，复制并冻结配置', () => {
    const state = { dither: false }
    const material = new Material({ shaderModule: shader(), state })
    state.dither = true
    expect(material.state.dither).toBe(false)
    expect(Reflect.set(material.state, 'dither', true)).toBe(false)
    expect(material.state.dither).toBe(false)
  })

  /** Given 明确开启；Then 与省略时相同，而不是把所有显式配置都当作 false。 */
  it('接受显式 true', () => {
    expect(new Material({ shaderModule: shader(), state: { dither: true } }).state.dither).toBe(
      true
    )
  })

  /** Given 绕过 TS 的输入；Then 不允许 truthy/falsy 自动转换。 */
  it.each([null, 0, 1, 'false', {}, []])('拒绝非法 dither %j', (dither) => {
    expect(
      () =>
        new Material({
          shaderModule: shader(),
          state: { dither } as unknown as RenderStateInput
        })
    ).toThrow(InvalidMaterialError)
  })
})
