import {
  copyTextureSamplingSource,
  type SamplingSourceErrorFactory,
  type Texture2DSamplingSource
} from './textureSamplingSource'
export type { SamplingSourceErrorFactory, Texture2DSamplingSource } from './textureSamplingSource'

/**
 * 保留旧2D入口供Material/调用者使用，实际规则与cube共用一个实现。
 * [DESIGN-WEIGHT:3][active-slot-versus-fixed-texture-binding]
 * 返回活动槽位时不在这里固化为当前纹理；实际draw前必须再次resolve。
 * 存活错误原样传播，非法输入使用调用者的Material/ParameterBlock领域错误。
 */
export function copyTexture2DSamplingSource(
  value: unknown,
  fieldName: string,
  createError?: SamplingSourceErrorFactory
): Texture2DSamplingSource {
  return copyTextureSamplingSource(value, '2d', fieldName, createError)
}
