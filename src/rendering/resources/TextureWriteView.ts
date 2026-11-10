import { InvalidTextureViewError } from '@/rendering/core/errors/InvalidTextureViewError'
import { RenderTexture } from './RenderTexture'
import type { CubeFace } from './textureTypes'
import {
  textureChoice,
  textureKnownFields,
  textureRecord,
  type TextureErrorFactory
} from './textureResourceValidation'

/** 一个冻结写入地址，不拥有纹理、不增加Scene引用、不包含GPU handle。 */
export type TextureWriteView =
  | { readonly kind: '2d'; readonly texture: RenderTexture; readonly mipLevel: number }
  | {
      readonly kind: 'cube-face'
      readonly texture: RenderTexture
      readonly face: CubeFace
      readonly mipLevel: number
    }

/**
 * 验证后复制wrapper；只能借用活RenderTexture。
 * [DESIGN-WEIGHT:3][texture-write-view-subresource]
 * Resource不冻结。创建时合法不代表未来消费时仍可用，尺寸函数会重新验证。
 */
export function createTextureWriteView(view: TextureWriteView): TextureWriteView {
  const error: TextureErrorFactory = (field, reason, details) =>
    new InvalidTextureViewError(field, reason, details)
  const input = textureRecord(view, 'view', error)
  const kind = textureChoice(input.kind, ['2d', 'cube-face'], 'view.kind', error)
  textureKnownFields(
    input,
    kind === '2d' ? ['kind', 'texture', 'mipLevel'] : ['kind', 'texture', 'face', 'mipLevel'],
    'view',
    error
  )
  const texture = input.texture
  if (!(texture instanceof RenderTexture))
    throw error('view.texture', 'must reference a RenderTexture')
  texture.assertUsable()
  const descriptor = texture.descriptor
  if (
    (kind === '2d' && descriptor.dimension !== '2d') ||
    (kind === 'cube-face' && descriptor.dimension !== 'cube')
  ) {
    throw error('view.kind', 'must match texture dimension')
  }
  const mipLevel = input.mipLevel
  if (
    typeof mipLevel !== 'number' ||
    !Number.isSafeInteger(mipLevel) ||
    mipLevel < 0 ||
    mipLevel >= descriptor.mipLevelCount
  ) {
    throw error('view.mipLevel', 'must name a declared mip level')
  }
  if (kind === '2d') return Object.freeze({ kind, texture, mipLevel })
  const face = textureChoice(
    input.face,
    ['positive-x', 'negative-x', 'positive-y', 'negative-y', 'positive-z', 'negative-z'],
    'view.face',
    error
  )
  return Object.freeze({ kind, texture, face, mipLevel })
}

/** 只推导地址尺寸，不设置viewport，不证明该子资源已经写完。 */
export function getTextureWriteViewSize(view: TextureWriteView): readonly [number, number] {
  const checked = createTextureWriteView(view)
  const { width, height } = checked.texture.descriptor
  const scale = 2 ** checked.mipLevel
  return Object.freeze([
    Math.max(1, Math.floor(width / scale)),
    Math.max(1, Math.floor(height / scale))
  ])
}
