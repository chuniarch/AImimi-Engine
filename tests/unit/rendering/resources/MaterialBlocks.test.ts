import { describe, expect, it } from 'vitest'
import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import { Material, type MaterialOptions } from '@/rendering/resources/Material'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { ShaderModule } from '@/rendering/resources/ShaderModule'

/** 保留实际映射名 uModel，用来区分语义名 modelMatrix 与真实 uniform 名。 */
function shader(): ShaderModule {
  return new ShaderModule({
    name: 'blocks',
    language: 'glsl-es-100',
    vertexSource: 'void main() { gl_Position = vec4(0.0); }',
    fragmentSource: 'void main() { gl_FragColor = vec4(1.0); }',
    builtInUniforms: { modelMatrix: 'uModel' }
  })
}

/** 每次建立独立块；同名与同对象身份是两个不同的冲突。 */
function block(name = 'uBias'): ParameterBlock {
  return new ParameterBlock({ label: 'shared', entries: { [name]: { type: 'float', value: 1 } } })
}

describe('Material borrowed ParameterBlocks', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-borrowing]
   * Given 两个 Material；When 更新共同块；Then 两边仍引用同一对象，无须逐材质 set。
   */
  it('复制并冻结列表但共享块身份，不把块值复制进本地参数', () => {
    const shared = block()
    const input = [shared]
    const a = new Material({ shaderModule: shader(), blocks: input })
    const b = new Material({ shaderModule: shader(), blocks: [shared] })
    input.length = 0
    expect(a.blocks).toEqual([shared])
    expect(Object.isFrozen(a.blocks)).toBe(true)
    shared.set('uBias', { type: 'float', value: 2 })
    expect(a.blocks[0]).toBe(b.blocks[0])
    expect(a.blocks[0]!.get('uBias')).toEqual({ type: 'float', value: 2 })
    expect(a.getParameter('uBias')).toBeUndefined()
    expect(a.getParameterEntries()).toEqual([])
    a.dispose()
    expect(shared.disposed).toBe(false)
    expect(shared.sceneReferenceCount).toBe(0)
    expect(b.blocks[0]).toBe(shared)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][material-single-parameter-source]
   * 不建立“后者覆盖前者”的优先级，四类歧义均在接线时拒绝。
   */
  it.each(['same-instance', 'same-name', 'local-name', 'built-in-name'] as const)(
    '拒绝 %s 冲突',
    (kind) => {
      const shared = block(kind === 'built-in-name' ? 'uModel' : 'uBias')
      const blocks =
        kind === 'same-instance'
          ? [shared, shared]
          : kind === 'same-name'
            ? [shared, block()]
            : [shared]
      expect(
        () =>
          new Material({
            shaderModule: shader(),
            blocks,
            parameters: kind === 'local-name' ? { uBias: { type: 'float', value: 9 } } : {}
          })
      ).toThrow(InvalidMaterialError)
      expect(shared.disposed).toBe(false)
      expect(shared.sceneReferenceCount).toBe(0)
    }
  )

  /** 构造后再写也不能绕过单一来源检查，失败不能偷偷新增本地覆盖值。 */
  it('setter 拒绝块名称，但不误拒绝没有映射为内建的语义文字', () => {
    const material = new Material({ shaderModule: shader(), blocks: [block()] })
    expect(() => material.setParameter('uBias', { type: 'float', value: 2 })).toThrow(
      InvalidMaterialError
    )
    expect(material.getParameterEntries()).toEqual([])
    material.setParameter('modelMatrix', { type: 'float', value: 3 })
    expect(material.getParameter('modelMatrix')).toEqual({ type: 'float', value: 3 })
  })

  /** JS 输入与稀疏列表不能让 undefined 伪装为一个块。 */
  it.each([null, {}, 1, [null], [{}], new Array(1)])('拒绝非法列表 %j', (blocks) => {
    expect(
      () => new Material({ shaderModule: shader(), blocks: blocks as MaterialOptions['blocks'] })
    ).toThrow(InvalidMaterialError)
  })

  /** 缺省不引入新依赖；老 Material 构造方式必须保持有效。 */
  it('不提供 blocks 时得到空列表', () => {
    expect(new Material({ shaderModule: shader() }).blocks).toEqual([])
  })

  /** 构造借用与后续消费都验证存活；不自动 retain 以掩盖错误所有权。 */
  it('构造拒绝死块，读取已借用列表也拒绝后来被释放的块', () => {
    const shared = block()
    const material = new Material({ shaderModule: shader(), blocks: [shared] })
    shared.dispose()
    expect(() => new Material({ shaderModule: shader(), blocks: [shared] })).toThrow(
      ResourceDisposedError
    )
    expect(() => material.blocks).toThrow(ResourceDisposedError)
    material.dispose()
    expect(() => material.blocks).toThrow(ResourceDisposedError)
  })
})
