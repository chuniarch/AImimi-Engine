import { InvalidLightError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import {
  DirectionalLight,
  normalizeLightDirection
} from '@/rendering/scene/lights/DirectionalLight'
import type { DirectionalLightSnapshot, DirectionalShadowSnapshot } from './LightFrameSnapshot'
import type { ViewState } from './ViewState'

/** 方向已归一化，量化后仍有限；普通数组可以冻结，不暴露可写 TypedArray。 */
function copyFloat32Direction(direction: Vec3Tuple): Vec3Tuple {
  return Object.freeze([
    Math.fround(direction[0]),
    Math.fround(direction[1]),
    Math.fround(direction[2])
  ] as const)
}

/**
 * 从一盏灯捕获一个帧输入，不上传 uniform、不分配或 resize 阴影图。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][directional-light-single-frame-sample]
 * view 来自 Builder 已验证的相机快照。P/T 各读取一次；方向从同一份 P/T 推导，
 * 不再调用 light.directionWorld 重新读取节点。view 只以左上 3x3 变换方向。
 * shadow 设置是冻结值快照，resource 是借用引用；两者不能混为深拷贝。
 * 所有验证成功才返回。失败时 Builder 不会发布半份帧输入。
 */
export function createDirectionalLightSnapshot(
  light: DirectionalLight,
  view: ViewState
): DirectionalLightSnapshot {
  const uuid = light.uuid
  const debugLabel = light.debugLabel
  const error = (fieldName: string, reason: string): InvalidLightError =>
    new InvalidLightError(fieldName, reason, { uuid, debugLabel })

  const world = new Float32Array(16)
  light.copyWorldMatrixTo(world)
  const positionWorld: Vec3Tuple = Object.freeze([world[12]!, world[13]!, world[14]!])
  const targetWorld: Vec3Tuple = Object.freeze([...light.targetWorld])
  const direction = normalizeLightDirection(
    positionWorld[0] - targetWorld[0],
    positionWorld[1] - targetWorld[1],
    positionWorld[2] - targetWorld[2],
    () => error('directionWorld', 'position and target must define a finite nonzero direction')
  )

  const [x, y, z] = direction
  const m = view.viewMatrix
  const directionView = normalizeLightDirection(
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
    () =>
      new InvalidRenderViewError(
        'camera.viewMatrix',
        'must preserve a finite nonzero light direction'
      )
  )

  const color = light.colorLinear
  const intensity = light.intensity
  const component = (index: 0 | 1 | 2): number => {
    const value = Math.fround(color[index] * intensity)
    if (!Number.isFinite(value)) throw error('radiance', 'must be representable as finite Float32')
    return value
  }
  const radiance: Vec3Tuple = Object.freeze([component(0), component(1), component(2)])
  const castShadow = light.castShadow
  const resource = light.shadow
  if (castShadow && resource === null)
    throw error('shadow', 'castShadow requires a shadow resource')

  let shadow: DirectionalShadowSnapshot | null = null
  if (resource !== null) {
    resource.assertUsable()
    const settings = resource.settings
    shadow = Object.freeze({
      resource,
      ...settings,
      up: Object.freeze([...settings.up]) as Vec3Tuple
    })
  }
  return Object.freeze({
    type: 'directional',
    uuid,
    debugLabel,
    positionWorld,
    targetWorld,
    directionToLightWorld: copyFloat32Direction(direction),
    directionToLightView: copyFloat32Direction(directionView),
    radiance,
    castShadow,
    shadow
  })
}
