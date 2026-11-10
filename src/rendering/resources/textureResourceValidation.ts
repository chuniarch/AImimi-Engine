import { assertNonArrayObject } from '@/rendering/core/validation'
import type { RenderingErrorDetails } from '@/rendering/core/errors/RenderingError'
import type {
  TextureResourceDescriptor,
  TextureSamplerDescriptor,
  TextureStorageDescriptor
} from './textureTypes'

/** 共用验证只决定规则，调用者保留领域错误与label上下文。 */
export type TextureErrorFactory = (
  field: string,
  reason: string,
  details?: RenderingErrorDetails
) => Error

/** 未确认label也要有可读诊断；此函数不证明label合法。 */
export function textureDiagnosticLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '<unnamed>'
}

/** 只检查外层形状，返回字段仍为unknown的字典。 */
export function textureRecord(
  value: unknown,
  field: string,
  error: TextureErrorFactory
): Readonly<Record<string, unknown>> {
  assertNonArrayObject(value, () => error(field, 'must be a non-array object'))
  return value as Readonly<Record<string, unknown>>
}

/** 检查字段名不会把未知字段值收窄成某个完整业务类型。 */
export function textureKnownFields(
  input: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  field: string,
  error: TextureErrorFactory
): void {
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) throw error(field + '.' + key, 'unknown field')
}

/** 保留原始label，不把trim后的显示字符串当缓存key。 */
export function textureLabel(value: unknown, error: TextureErrorFactory): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw error('label', 'must be non-blank text')
  return value
}

/** 不转换字符串、不钳制；CPU允许设备上限以上的合法逻辑尺寸。 */
export function textureDimension(
  value: unknown,
  field: string,
  error: TextureErrorFactory
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw error(field, 'must be a positive safe integer', { received: value })
  return value
}

/** membership通过后才断言有限字符串union；不是把未知对象断言成业务描述。 */
export function textureChoice<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  error: TextureErrorFactory
): T[number] {
  if (typeof value !== 'string' || !allowed.some((option) => option === value))
    throw error(field, 'unsupported value', { received: value })
  return value as T[number]
}

/**
 * 精确计算floor(log2(maxDimension))+1，避免Math.log2在2^53-1附近舍入到53。
 * 不使用32位位移，也不创建像素数组。
 */
export function fullTextureMipCount(width: number, height: number): number {
  let size = Math.max(width, height),
    levels = 1
  while (size >= 2) {
    size = Math.floor(size / 2)
    levels++
  }
  return levels
}

/** storage是输入数据快照，与Resource本身身份分开。 */
export function textureStorageSnapshot(
  value: unknown,
  error: TextureErrorFactory
): Readonly<TextureStorageDescriptor> {
  const input = textureRecord(value, 'storage', error)
  textureKnownFields(input, ['format', 'type'], 'storage', error)
  return Object.freeze({
    format: textureChoice(input.format, ['r', 'rg', 'rgb', 'rgba'], 'storage.format', error),
    type: textureChoice(input.type, ['uint8', 'float32'], 'storage.type', error)
  })
}

const DEFAULT_SAMPLER: TextureSamplerDescriptor = Object.freeze({
  wrapS: 'clamp-to-edge',
  wrapT: 'clamp-to-edge',
  minFilter: 'linear',
  magFilter: 'linear'
})

/** 复制完整sampler；undefined用默认，显式null/非法值不被当成缺省。 */
export function textureSamplerSnapshot(
  value: unknown,
  error: TextureErrorFactory,
  defaults: TextureSamplerDescriptor = DEFAULT_SAMPLER
): Readonly<TextureSamplerDescriptor> {
  const input = value === undefined ? {} : textureRecord(value, 'sampler', error)
  textureKnownFields(input, ['wrapS', 'wrapT', 'minFilter', 'magFilter'], 'sampler', error)
  return Object.freeze({
    wrapS: textureChoice(
      input.wrapS === undefined ? defaults.wrapS : input.wrapS,
      ['clamp-to-edge', 'repeat', 'mirrored-repeat'],
      'sampler.wrapS',
      error
    ),
    wrapT: textureChoice(
      input.wrapT === undefined ? defaults.wrapT : input.wrapT,
      ['clamp-to-edge', 'repeat', 'mirrored-repeat'],
      'sampler.wrapT',
      error
    ),
    minFilter: textureChoice(
      input.minFilter === undefined ? defaults.minFilter : input.minFilter,
      [
        'nearest',
        'linear',
        'nearest-mipmap-nearest',
        'linear-mipmap-nearest',
        'nearest-mipmap-linear',
        'linear-mipmap-linear'
      ],
      'sampler.minFilter',
      error
    ),
    magFilter: textureChoice(
      input.magFilter === undefined ? defaults.magFilter : input.magFilter,
      ['nearest', 'linear'],
      'sampler.magFilter',
      error
    )
  })
}

/** 只有声明整条链才允许mipmap过滤；不在这里检查设备支持或像素生产状态。 */
export function assertTextureSamplerLayout(
  sampler: TextureSamplerDescriptor,
  descriptor: TextureResourceDescriptor,
  error: TextureErrorFactory
): void {
  if (
    sampler.minFilter.includes('mipmap') &&
    descriptor.mipLevelCount !== fullTextureMipCount(descriptor.width, descriptor.height)
  ) {
    throw error('sampler.minFilter', 'mipmap filtering requires a complete declared mip chain')
  }
}

/** 验证全部布局，再建立无外部可变子对象的冻结快照。 */
export function textureResourceDescriptorSnapshot(
  value: unknown,
  error: TextureErrorFactory
): TextureResourceDescriptor {
  const input = textureRecord(value, 'descriptor', error)
  textureKnownFields(
    input,
    ['dimension', 'width', 'height', 'mipLevelCount', 'storage', 'colorSpace'],
    'descriptor',
    error
  )
  const dimension = textureChoice(input.dimension, ['2d', 'cube'], 'descriptor.dimension', error)
  const width = textureDimension(input.width, 'descriptor.width', error)
  const height = textureDimension(input.height, 'descriptor.height', error)
  if (dimension === 'cube' && width !== height)
    throw error('descriptor.height', 'cubemap faces must be square')
  const mipLevelCount = textureDimension(input.mipLevelCount, 'descriptor.mipLevelCount', error)
  if (mipLevelCount > fullTextureMipCount(width, height))
    throw error('descriptor.mipLevelCount', 'exceeds base dimensions')
  return Object.freeze({
    dimension,
    width,
    height,
    mipLevelCount,
    storage: textureStorageSnapshot(input.storage, error),
    colorSpace: textureChoice(
      input.colorSpace,
      ['srgb', 'linear', 'data'],
      'descriptor.colorSpace',
      error
    )
  })
}
