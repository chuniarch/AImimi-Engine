import {
  textureDimension,
  textureRecord,
  type TextureErrorFactory
} from './textureResourceValidation'

/**
 * 读取静态图片的已知像素尺寸，不检查WebGL能力或取得图片所有权。
 * [DESIGN-WEIGHT:3][source-texture-fixed-layout]
 * HTML图片必须complete且natural尺寸有效；bitmap用width/height。
 * CPU层只验证所需结构，具体浏览器对象/realm仍由上传Manager确认。
 */
export function textureImageDimensions(
  source: unknown,
  field: string,
  error: TextureErrorFactory
): Readonly<{ width: number; height: number }> {
  const input = textureRecord(source, field, error)
  const html = 'naturalWidth' in input || 'naturalHeight' in input || 'complete' in input
  if (html && input.complete !== true) throw error(field, 'image must already be decoded')
  const width = textureDimension(html ? input.naturalWidth : input.width, field + '.width', error)
  const height = textureDimension(
    html ? input.naturalHeight : input.height,
    field + '.height',
    error
  )
  return Object.freeze({ width, height })
}
