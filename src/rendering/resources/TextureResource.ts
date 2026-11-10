import { Resource } from '@/rendering/core/Resource'
import type {
  TextureOrigin,
  TextureResourceDescriptor,
  TextureSamplerDescriptor
} from './textureTypes'
import {
  assertTextureSamplerLayout,
  textureChoice,
  textureKnownFields,
  textureLabel,
  textureRecord,
  textureResourceDescriptorSnapshot,
  textureSamplerSnapshot,
  type TextureErrorFactory
} from './textureResourceValidation'
export type { TextureResourceOptions, TextureResourceDescriptor } from './textureTypes'

/**
 * CPU source与GPU render来源共有的唯一Resource祖先，不包含WebGL handle。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][texture-storage-single-identity]
 * label只是诊断；Manager以本对象身份查当前context记录。
 * descriptor、defaultSampler复制冻结，本Resource自身保持可推进C0生命周期。
 * 构造没有分配GPU内存；descriptor也不是生产完成证明。
 */
export abstract class TextureResource extends Resource {
  public readonly label: string
  public readonly origin: TextureOrigin
  public readonly defaultSampler: Readonly<TextureSamplerDescriptor>
  private readonly descriptorValue: TextureResourceDescriptor

  /** 子类固定origin和领域错误；unknown入口用于真实运行时验证，而非相信TS声明。 */
  protected constructor(options: unknown, origin: TextureOrigin, error: TextureErrorFactory) {
    super()
    const input = textureRecord(options, 'options', error)
    textureKnownFields(input, ['label', 'descriptor', 'defaultSampler'], 'options', error)
    this.label = textureLabel(input.label, error)
    this.origin = textureChoice(origin, ['source', 'render'], 'origin', error)
    this.descriptorValue = textureResourceDescriptorSnapshot(input.descriptor, error)
    this.defaultSampler = textureSamplerSnapshot(input.defaultSampler, error)
    assertTextureSamplerLayout(this.defaultSampler, this.descriptorValue, error)
  }

  /** 固定布局只在资源可用时消费；关闭不等于GPU清理已完成。 */
  get descriptor(): TextureResourceDescriptor {
    this.assertUsable()
    return this.descriptorValue
  }
}
