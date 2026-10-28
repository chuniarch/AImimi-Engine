import { mat4 } from 'gl-matrix'
import { InvalidDirectionalShadowError } from '@/rendering/core/errors'
import type { Mat4Tuple, Vec3Tuple } from '@/rendering/core/math/tuples'
import { assertNonArrayObject } from '@/rendering/core/validation'
import { copyMat4Snapshot } from '@/rendering/frame/copyMat4Snapshot'
import type { ViewState } from '@/rendering/frame/ViewState'
import {
  copyDirectionalShadowSettings,
  copyShadowVector,
  requireShadowLabel,
  type DirectionalShadowSettings
} from './DirectionalShadowSettings'

/** 从本帧灯光快照取出的值；不借用可变 Light 或 Camera。 */
export interface DirectionalShadowViewInput {
  readonly label: string
  readonly positionWorld: Vec3Tuple
  readonly targetWorld: Vec3Tuple
  readonly settings: DirectionalShadowSettings
}

/** view 用于深度图绘制；lightViewProjection 用于接收者查询同一张图。 */
export interface DirectionalShadowView {
  readonly view: ViewState
  readonly lightViewProjection: Mat4Tuple
}

/**
 * 将矩阵量化到 Float32，验证有限且可逆，再复制为冻结 tuple。
 * 零矩阵仅作为撤销哨兵使用，不属于可发布的绘图矩阵。
 */
export function copyDirectionalShadowMatrix(
  label: string,
  fieldName: string,
  source: ArrayLike<number>
): Mat4Tuple {
  if (source === null || typeof source !== 'object' || source.length !== 16) {
    throw new InvalidDirectionalShadowError(label, fieldName, 'must contain exactly 16 numbers')
  }
  const matrix = new Float32Array(16)
  for (let i = 0; i < 16; i++) {
    const component = source[i]
    if (typeof component !== 'number' || !Number.isFinite(Math.fround(component))) {
      throw new InvalidDirectionalShadowError(label, fieldName, 'must remain finite in Float32')
    }
    matrix[i] = component
  }
  const determinant = mat4.determinant(matrix)
  if (!Number.isFinite(determinant) || determinant === 0) {
    throw new InvalidDirectionalShadowError(label, fieldName, 'must remain invertible in Float32')
  }
  return copyMat4Snapshot(matrix, fieldName)
}

/** 先缩放再求长度，避免直接平方使很小/很大的有限方向下溢或溢出。 */
function normalize(label: string, fieldName: string, vector: Vec3Tuple): Vec3Tuple {
  const scale = Math.max(...vector.map(Math.abs))
  if (!Number.isFinite(scale) || scale === 0) {
    throw new InvalidDirectionalShadowError(
      label,
      fieldName,
      'must define a finite nonzero direction'
    )
  }
  const x = vector[0] / scale
  const y = vector[1] / scale
  const z = vector[2] / scale
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

/**
 * 纯计算：世界空间灯位/目标 → lookAt 视图 → OpenGL 正交投影 → P*V。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][directional-shadow-view-space]
 * z 轴从 target 指向 eye，x=normalize(up×z)，y=z×x。
 * 显式写出 lookAt 基，避免固定绝对 epsilon 把非零短视线当成重合。
 * 列主序矩阵乘列向量；投影深度为 [-1,1]，不预乘纹理坐标 bias。
 * 接收者 shader 负责透视除法和 ndc*0.5+0.5，不能在两处各做一次。
 *
 * 计算只创建 CPU 数组，不分配 FBO、不更新块或设置。
 * 成功也不证明已经画出阴影图；未来 Pass 必须在 draw/scope 成功后发布。
 *
 * @throws InvalidDirectionalShadowError 输入退化或矩阵不能以有限非奇异 Float32 表示。
 */
export function createDirectionalShadowView(
  input: DirectionalShadowViewInput
): DirectionalShadowView {
  assertNonArrayObject(
    input,
    () => new InvalidDirectionalShadowError('<unnamed>', 'view', 'must be a non-array object')
  )
  const label = requireShadowLabel(input.label)
  const settings = copyDirectionalShadowSettings(label, input.settings)
  const eye = copyShadowVector(label, 'positionWorld', input.positionWorld)
  const target = copyShadowVector(label, 'targetWorld', input.targetWorld)
  const z = normalize(label, 'direction', [
    eye[0] - target[0],
    eye[1] - target[1],
    eye[2] - target[2]
  ])
  const up = normalize(label, 'up', settings.up)
  const x = normalize(label, 'upCrossDirection', [
    up[1] * z[2] - up[2] * z[1],
    up[2] * z[0] - up[0] * z[2],
    up[0] * z[1] - up[1] * z[0]
  ])
  const y: Vec3Tuple = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0]
  ]
  const dotEye = (axis: Vec3Tuple): number => axis[0] * eye[0] + axis[1] * eye[1] + axis[2] * eye[2]
  const viewMatrix = copyDirectionalShadowMatrix(label, 'viewMatrix', [
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dotEye(x),
    -dotEye(y),
    -dotEye(z),
    1
  ])
  const projection = new Float32Array(16)
  const { halfExtent, near, far } = settings
  mat4.orthoNO(projection, -halfExtent, halfExtent, -halfExtent, halfExtent, near, far)
  const projectionMatrix = copyDirectionalShadowMatrix(label, 'projectionMatrix', projection)
  const product = new Float32Array(16)
  mat4.multiply(product, projectionMatrix, viewMatrix)
  return Object.freeze({
    view: Object.freeze({ viewMatrix, projectionMatrix, cameraWorldPosition: eye }),
    lightViewProjection: copyDirectionalShadowMatrix(label, 'lightViewProjection', product)
  })
}
