import { mat4, vec4 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { EngineError } from '@/errors/EngineError/BaseError'
import { InvalidPerspectiveCameraError, RenderingError } from '@/rendering/core/errors'
import { Group } from '@/rendering/scene/Group'
import { SceneNode } from '@/rendering/scene/SceneNode'
import { Camera } from '@/rendering/scene/cameras/Camera'
import {
  PerspectiveCamera,
  type PerspectiveCameraOptions
} from '@/rendering/scene/cameras/PerspectiveCamera'

/** 便于手算：垂直视场 90°、宽高比 2、near 1、far 11。 */
const OPTIONS: PerspectiveCameraOptions = {
  fovY: Math.PI / 2,
  aspect: 2,
  near: 1,
  far: 11
}

/** 只通过公共复制接口观察矩阵。 */
function projectionOf(camera: Camera): number[] {
  const out = mat4.create()
  camera.copyProjectionMatrixTo(out)
  return Array.from(out)
}

/** 从公开 getter 观察完整配置，检查失败后的状态是否保持一致。 */
function optionsOf(camera: PerspectiveCamera): PerspectiveCameraOptions {
  return { fovY: camera.fovY, aspect: camera.aspect, near: camera.near, far: camera.far }
}

/** 类型检查专用；不执行这些故意错误的表达式。 */
function checkCameraTypes(camera: PerspectiveCamera): void {
  // @ts-expect-error Camera 为抽象类且构造器受保护。
  new Camera()
  // @ts-expect-error 配置只能通过受控 setter 修改。
  camera.near = 2
  // @ts-expect-error 版本号只读。
  camera.projectionVersion = 2
  // @ts-expect-error 不向调用者暴露内部可变矩阵。
  void camera.projectionMatrixValue
  // @ts-expect-error setter 要求完整参数，不做隐式部分合并。
  camera.setPerspective({ aspect: 1 })
}
void checkCameraTypes

describe('PerspectiveCamera CPU contract', () => {
  /** 防止保存 options 对象别名，导致绕过 setter 就能改变相机参数。 */
  it('复制参数并以有效的零版本投影完成构造', () => {
    const input = { ...OPTIONS }
    const camera = new PerspectiveCamera(input)
    input.near = 5

    expect(camera).toBeInstanceOf(Camera)
    expect(camera).toBeInstanceOf(SceneNode)
    expect(optionsOf(camera)).toEqual(OPTIONS)
    expect(camera.projectionVersion).toBe(0)
    expect(camera.debugLabel).toBe('PerspectiveCamera#' + camera.uuid.slice(0, 8))
    expect(Reflect.set(camera, 'near', 2)).toBe(false)
    expect(Reflect.set(camera, 'projectionVersion', 9)).toBe(false)
  })

  /**
   * 期望值由公式手算，不调用生产代码使用的 mat4.perspective 生成期望值。
   * 数组按列存储：f=1，f/aspect=0.5，深度两项分别为 -1.2 和 -2.2。
   */
  it('按弧度生成 WebGL 透视投影', () => {
    const actual = projectionOf(new PerspectiveCamera(OPTIONS))
    const expected = [0.5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.2, -1, 0, 0, -2.2, 0]
    expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 6))
  })

  /** 若误用 0..1 深度矩阵或把相机朝向当成 +Z，这些裁剪边界将不成立。 */
  it('把近远平面映射到 NDC 的 -1 和 1', () => {
    const camera = new PerspectiveCamera(OPTIONS)
    const matrix = mat4.create()
    camera.copyProjectionMatrixTo(matrix)
    const near = vec4.fromValues(0, 0, -1, 1)
    const far = vec4.fromValues(0, 0, -11, 1)
    const corner = vec4.fromValues(2, 1, -1, 1)
    vec4.transformMat4(near, near, matrix)
    vec4.transformMat4(far, far, matrix)
    vec4.transformMat4(corner, corner, matrix)

    expect(near[2] / near[3]).toBeCloseTo(-1, 5)
    expect(far[2] / far[3]).toBeCloseTo(1, 5)
    expect(corner[0] / corner[3]).toBeCloseTo(1, 5)
    expect(corner[1] / corner[3]).toBeCloseTo(1, 5)
  })

  /**
   * 如果复制接口返回内部缓冲，外部修改将污染后续读取。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][camera-projection-copy]
   */
  it('覆盖调用者缓冲且不泄漏内部矩阵', () => {
    const camera = new PerspectiveCamera(OPTIONS)
    const expected = projectionOf(camera)
    const out = new Float32Array(16).fill(999)
    camera.copyProjectionMatrixTo(out)
    expect(Array.from(out)).toEqual(expected)
    out.fill(999)

    expect(projectionOf(camera)).toEqual(expected)
    expect(camera.projectionVersion).toBe(0)
  })

  /**
   * 防止把 Float32 矩阵数值与 Float64 配置比较，重复输入 0.1 必须保持版本。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][perspective-number-comparison]
   */
  it('重复配置，包括 0.1，不增加版本', () => {
    const options = { ...OPTIONS, near: 0.1 }
    const camera = new PerspectiveCamera(options)
    const before = projectionOf(camera)
    camera.setPerspective({ ...options })

    expect(camera.near).toBe(0.1)
    expect(camera.projectionVersion).toBe(0)
    expect(projectionOf(camera)).toEqual(before)
  })

  /** 四个字段逐个覆盖，防止漏比较、漏提交某个字段；重复提交不得再递增。 */
  it.each([
    { field: 'fovY', patch: { fovY: Math.PI / 3 } },
    { field: 'aspect', patch: { aspect: 1 } },
    { field: 'near', patch: { near: 2 } },
    { field: 'far', patch: { far: 21 } }
  ])('修改 $field 后同步更新参数、矩阵与版本', ({ patch }) => {
    const camera = new PerspectiveCamera(OPTIONS)
    const before = projectionOf(camera)
    const next = { ...OPTIONS, ...patch }
    camera.setPerspective(next)

    expect(optionsOf(camera)).toEqual(next)
    expect(camera.projectionVersion).toBe(1)
    expect(projectionOf(camera)).not.toEqual(before)
    camera.setPerspective({ ...next })
    projectionOf(camera)
    expect(camera.projectionVersion).toBe(1)
  })

  /** version 表示配置变化，不能用 Float32 矩阵量化后的相等来吞掉真实输入变化。 */
  it('保留可区分的 Number 配置变化', () => {
    const camera = new PerspectiveCamera(OPTIONS)
    const nextAspect = 2 + Number.EPSILON * 2
    camera.setPerspective({ ...OPTIONS, aspect: nextAspect })

    expect(camera.aspect).toBe(nextAspect)
    expect(camera.projectionVersion).toBe(1)
  })

  /**
   * 验证失败必须发生在提交之前：参数、矩阵、版本均不能部分更新。
   * 极端有限数专门覆盖“参数有限，但矩阵溢出或下溢”的情况。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][perspective-atomic-update]
   */
  it.each([
    { label: 'null options', value: null },
    { label: 'array options', value: [] },
    { label: 'missing fields', value: { aspect: 1 } },
    { label: 'zero fov', value: { ...OPTIONS, fovY: 0 } },
    { label: 'PI fov', value: { ...OPTIONS, fovY: Math.PI } },
    { label: 'degrees mistaken for radians', value: { ...OPTIONS, fovY: 90 } },
    { label: 'NaN fov', value: { ...OPTIONS, fovY: NaN } },
    { label: 'zero aspect', value: { ...OPTIONS, aspect: 0 } },
    { label: 'negative aspect', value: { ...OPTIONS, aspect: -1 } },
    { label: 'string aspect', value: { ...OPTIONS, aspect: '2' } },
    { label: 'zero near', value: { ...OPTIONS, near: 0 } },
    { label: 'negative near', value: { ...OPTIONS, near: -1 } },
    { label: 'far equals near', value: { ...OPTIONS, far: 1 } },
    { label: 'far below near', value: { ...OPTIONS, far: 0.5 } },
    { label: 'infinite far', value: { ...OPTIONS, far: Infinity } },
    { label: 'late invalid field', value: { fovY: 1, aspect: 1, near: 2, far: 1 } },
    { label: 'matrix overflow', value: { ...OPTIONS, fovY: Number.MIN_VALUE } },
    { label: 'horizontal underflow', value: { ...OPTIONS, aspect: Number.MAX_VALUE } },
    { label: 'depth underflow', value: { ...OPTIONS, near: Number.MIN_VALUE } }
  ])('拒绝 $label 且保持旧状态', ({ value }) => {
    const camera = new PerspectiveCamera(OPTIONS)
    const before = projectionOf(camera)
    const invalid = value as PerspectiveCameraOptions

    expect(() => new PerspectiveCamera(invalid)).toThrow(InvalidPerspectiveCameraError)
    expect(() => camera.setPerspective(invalid)).toThrow(InvalidPerspectiveCameraError)
    expect(optionsOf(camera)).toEqual(OPTIONS)
    expect(projectionOf(camera)).toEqual(before)
    expect(camera.projectionVersion).toBe(0)
  })

  /**
   * 父节点 TRS/reparent 改变世界矩阵，但不能改变镜头的投影配置。
   * 反方向也成立：改变 aspect 不能使未变的 world matrix 重算。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][camera-world-projection-separation]
   */
  it('世界变换和投影配置独立更新', () => {
    const parent = new Group()
    const camera = new PerspectiveCamera(OPTIONS)
    parent.transform.setPosition([10, 0, 0])
    parent.transform.setScale([2, 2, 2])
    camera.transform.setPosition([1, 0, 3])
    parent.add(camera)
    const world = mat4.create()
    camera.copyWorldMatrixTo(world)
    expect([world[12], world[13], world[14]]).toEqual([12, 0, 6])
    expect(camera.projectionVersion).toBe(0)
    const worldVersion = camera.worldVersion

    camera.setPerspective({ ...OPTIONS, aspect: 1 })
    const changedProjection = projectionOf(camera)
    camera.copyWorldMatrixTo(world)
    expect(camera.worldVersion).toBe(worldVersion)

    const anotherParent = new Group()
    anotherParent.transform.setPosition([-10, 0, 0])
    anotherParent.add(camera)
    camera.copyWorldMatrixTo(world)
    expect([world[12], world[13], world[14]]).toEqual([-9, 0, 3])
    expect(camera.worldVersion).toBeGreaterThan(worldVersion)
    expect(camera.projectionVersion).toBe(1)
    expect(projectionOf(camera)).toEqual(changedProjection)
  })

  /** 诊断字段必须保存错误发生时的快照，而不是依赖调用者的可变对象。 */
  it('InvalidPerspectiveCameraError 保留统一基类和冻结诊断', () => {
    const details = { near: 2, far: 1 }
    const error = new InvalidPerspectiveCameraError('far', 'must be greater than near', details)
    details.far = 100

    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidPerspectiveCameraError')
    expect(error.code).toBe('INVALID_PERSPECTIVE_CAMERA')
    expect(error.details).toEqual({
      near: 2,
      far: 1,
      fieldName: 'far',
      reason: 'must be greater than near'
    })
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
