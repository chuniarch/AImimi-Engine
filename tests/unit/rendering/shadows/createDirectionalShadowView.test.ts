import { describe, expect, it } from 'vitest'
import type { Mat4Tuple, Vec3Tuple } from '@/rendering/core/math/tuples'
import { InvalidDirectionalShadowError } from '@/rendering/core/errors'
import {
  createDirectionalShadowView,
  type DirectionalShadowViewInput
} from '@/rendering/shadows/createDirectionalShadowView'

/** 默认夹具：灯在 z=10 朝原点看，左右上下各2，near=0、far=20。 */
function input(): DirectionalShadowViewInput {
  return {
    label: 'shadow/numerical',
    positionWorld: [0, 0, 10],
    targetWorld: [0, 0, 0],
    settings: { mapSize: 512, halfExtent: 2, near: 0, far: 20, bias: 0, up: [0, 1, 0] }
  }
}

/** 只做独立的列主序矩阵乘点，用字面量检查输出空间，不重用被测 view builder。 */
function transform(matrix: Mat4Tuple, point: Vec3Tuple): readonly number[] {
  return [0, 1, 2, 3].map(
    (row) =>
      matrix[row]! * point[0] +
      matrix[4 + row]! * point[1] +
      matrix[8 + row]! * point[2] +
      matrix[12 + row]!
  )
}

describe('createDirectionalShadowView', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-view-space]
   * Given 对称正交投影；When 变换边界点；Then near→-1、far→1，不包含纹理bias。
   */
  it('生成 P*V，而非 V*P，也不提前映射到纹理坐标', () => {
    const result = createDirectionalShadowView(input())
    const worldNear: Vec3Tuple = [2, 2, 10]
    const worldFar: Vec3Tuple = [-2, -2, -10]
    expect(transform(result.lightViewProjection, worldNear)[0]).toBeCloseTo(1)
    expect(transform(result.lightViewProjection, worldNear)[1]).toBeCloseTo(1)
    expect(transform(result.lightViewProjection, worldNear)[2]).toBeCloseTo(-1)
    expect(transform(result.lightViewProjection, worldFar)[0]).toBeCloseTo(-1)
    expect(transform(result.lightViewProjection, worldFar)[1]).toBeCloseTo(-1)
    expect(transform(result.lightViewProjection, worldFar)[2]).toBeCloseTo(1)
    expect(transform(result.view.viewMatrix, [0, 0, 10])).toEqual([0, 0, 0, 1])
    expect(result.view.cameraWorldPosition).toEqual([0, 0, 10])
  })

  /** 侧面光防止 helper 实际忽略 target/up、始终只生成 z 方向视图。 */
  it('正确处理沿世界 x 轴观察的灯', () => {
    const result = createDirectionalShadowView({ ...input(), positionWorld: [10, 0, 0] })
    expect(transform(result.view.viewMatrix, [10, 0, 0])).toEqual([0, 0, 0, 1])
    const origin = transform(result.view.viewMatrix, [0, 0, 0])
    expect(origin[2]).toBeCloseTo(-10)
    expect(transform(result.view.viewMatrix, [10, 0, -2])[0]).toBeCloseTo(2)
  })

  /** Given 可变数组；When 计算后调用者修改；Then 返回值为独立且逐层冻结的快照。 */
  it('复制输入并冻结输出，矩阵分量明确经过 Float32 量化', () => {
    const position: [number, number, number] = [0.1, 0, 10]
    const result = createDirectionalShadowView({ ...input(), positionWorld: position })
    position[0] = 99
    expect(result.view.cameraWorldPosition).toEqual([0.1, 0, 10])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.view)).toBe(true)
    expect(Object.isFrozen(result.view.cameraWorldPosition)).toBe(true)
    for (const matrix of [
      result.view.viewMatrix,
      result.view.projectionMatrix,
      result.lightViewProjection
    ]) {
      expect(Object.isFrozen(matrix)).toBe(true)
      expect(matrix.every((entry) => Object.is(entry, Math.fround(entry)))).toBe(true)
    }
  })

  /** 不把绝对距离很短但有方向的视线误判成 identity。 */
  it('非零短视线仍产生正确方向，不依赖 gl-matrix 的绝对 epsilon', () => {
    const result = createDirectionalShadowView({ ...input(), positionWorld: [1e-9, 0, 0] })
    expect(transform(result.view.viewMatrix, [0, 0, -1])[0]).toBeCloseTo(1)
  })

  /** 几何退化或非法 JS 数据不能被“自动换一个 up”静默修复。 */
  it.each([
    { positionWorld: [0, 0, 0] },
    { positionWorld: [NaN, 0, 10] },
    { positionWorld: [0, 0] },
    { targetWorld: null },
    { targetWorld: [0, Infinity, 0] },
    { settings: { ...input().settings, up: [0, 0, 1] } },
    { settings: { ...input().settings, up: [0, 0, 0] } },
    { settings: { ...input().settings, near: 20, far: 10 } },
    { settings: { ...input().settings, halfExtent: 1e-100 } },
    { settings: { ...input().settings, halfExtent: 1e100 } },
    { settings: { ...input().settings, far: 1e100 } },
    { positionWorld: [1e100, 0, 0] }
  ])('拒绝退化/不可表示的输入 %#', (patch) => {
    expect(() =>
      createDirectionalShadowView({ ...input(), ...patch } as DirectionalShadowViewInput)
    ).toThrow(InvalidDirectionalShadowError)
  })
})
