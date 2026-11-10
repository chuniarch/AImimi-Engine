import { describe, expect, it } from 'vitest'
import { InvalidMaterialError, InvalidParameterBlockError } from '@/rendering/core/errors'
import { Material } from '@/rendering/resources/Material'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { createTextureSamplingBinding } from '@/rendering/resources/TextureSamplingBinding'
import { resolveTextureSamplingSource } from '@/rendering/resources/textureSamplingSource'

/** 参数契约不需要编译GLSL，源码只作为活ShaderModule依赖。 */
function shader() {
  return new ShaderModule({
    name: 'S',
    language: 'glsl-es-100',
    vertexSource: 'void main() {}',
    fragmentSource: 'void main() {}'
  })
}
function texture(cube: boolean) {
  return new RenderTexture({
    label: 'T',
    production: 'manual',
    descriptor: {
      dimension: cube ? 'cube' : '2d',
      width: 4,
      height: 4,
      mipLevelCount: 1,
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'linear'
    }
  })
}
describe('C2 Material and ParameterBlock shared sampling rules', () => {
  it.each([false, true])('两种参数容器都借用dimension cube=%s 的RenderTexture绑定', (cube) => {
    const resource = texture(cube),
      type = cube ? 'cubeTexture' : 'texture2D',
      binding = createTextureSamplingBinding(resource)
    const parameter = { type, value: binding } as const
    const material = new Material({ shaderModule: shader(), parameters: { uMap: parameter } })
    const block = new ParameterBlock({ label: 'B', entries: { uMap: parameter } })
    for (const value of [material.getParameter('uMap')!, block.get('uMap')!]) {
      expect(value.type).toBe(type)
      if (value.type === 'texture2D' || value.type === 'cubeTexture')
        expect(
          resolveTextureSamplingSource(value.value, cube ? 'cube' : '2d', 'uMap').texture
        ).toBe(resource)
    }
    material.dispose()
    block.dispose()
    expect(resource.disposed).toBe(false)
    expect(resource.sceneReferenceCount).toBe(0)
  })
  it('维度错误保留各自领域错误，setter失败后不破坏原值', () => {
    const material = new Material({
      shaderModule: shader(),
      parameters: {
        uMap: { type: 'texture2D', value: createTextureSamplingBinding(texture(false)) }
      }
    })
    const block = new ParameterBlock({
      label: 'B',
      entries: { uMap: { type: 'texture2D', value: createTextureSamplingBinding(texture(false)) } }
    })
    const wrong = { type: 'texture2D', value: createTextureSamplingBinding(texture(true)) } as const
    expect(() => material.setParameter('uMap', wrong)).toThrow(InvalidMaterialError)
    expect(() => block.set('uMap', wrong)).toThrow(InvalidParameterBlockError)
    expect(material.getParameter('uMap')!.type).toBe('texture2D')
  })
})
