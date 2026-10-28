import { InvalidMaterialError } from '@/rendering/core/errors'
import { Material } from '@/rendering/resources/Material'
import { requireShadowBias } from './requireShadowBias'

/**
 * 为直接保存 uShadowBias 的旧示例材质提交归一化深度偏移。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][shadow-depth-comparison]
 * shader 使用 receiverDepth - bias <= storedDepth；bias 不是世界空间距离。
 * 先验证再提交，非法输入不覆盖旧值；不拥有或释放 Material。
 * 使用 ParameterBlock 的新阴影通路应修改 shadow.setBias，再由 Pass 按帧发布；
 * 不要用此函数绕过共享块的固定布局和发布顺序。
 *
 * @throws InvalidMaterialError bias 非法或不能作为该材质的普通参数写入。
 * @throws ResourceDisposedError Material 或其 ShaderModule 已释放。
 */
export function setShadowBias(material: Material, bias: number): void {
  const value = requireShadowBias(
    bias,
    (reason, details) => new InvalidMaterialError('uShadowBias', reason, details)
  )
  material.setParameter('uShadowBias', { type: 'float', value })
}
