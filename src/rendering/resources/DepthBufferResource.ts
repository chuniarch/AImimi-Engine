import { Resource } from '@/rendering/core/Resource'
import { InvalidDepthBufferResourceError } from '@/rendering/core/errors/InvalidDepthBufferResourceError'
import {
  textureDiagnosticLabel,
  textureDimension,
  textureKnownFields,
  textureLabel,
  textureRecord,
  type TextureErrorFactory
} from './textureResourceValidation'

export interface DepthBufferOptions {
  readonly label: string
  readonly width: number
  readonly height: number
}

/**
 * 固定尺寸depth16逻辑存储，不是Texture、不允许交给sampler。
 * [DESIGN-WEIGHT:3][depth-buffer-owned-storage]
 * C1不创建renderbuffer，后续Manager负责设备表示；尺寸改变需新资源并由owner替换。
 * label及固定元数据保留用于清理后诊断，使用入口仍需assertUsable。
 */
export class DepthBufferResource extends Resource {
  protected override readonly resourceType = 'DepthBufferResource'
  public readonly label: string
  public readonly width: number
  public readonly height: number
  public readonly format = 'depth16' as const

  constructor(options: DepthBufferOptions) {
    super()
    const label = textureDiagnosticLabel(options?.label)
    const error: TextureErrorFactory = (field, reason, details) =>
      new InvalidDepthBufferResourceError(label, field, reason, details)
    const input = textureRecord(options, 'options', error)
    textureKnownFields(input, ['label', 'width', 'height'], 'options', error)
    this.label = textureLabel(input.label, error)
    this.width = textureDimension(input.width, 'width', error)
    this.height = textureDimension(input.height, 'height', error)
  }

  /** 没有CPU像素；C0监听器仍必须成功后才结束资源清理。 */
  protected override disposeCPUData(): void {}
}

/** 工厂与constructor共享唯一实现，不增加Resource包装层。 */
export function createDepthBufferResource(options: DepthBufferOptions): DepthBufferResource {
  return new DepthBufferResource(options)
}
