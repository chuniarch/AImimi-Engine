import { mat4 } from 'gl-matrix'

import { InvalidPerspectiveCameraError } from '@/rendering/core/errors'
import { Camera } from '@/rendering/scene/cameras/Camera'

/** 一组完整的透视参数；构造及修改均显式提供全部字段。 */
export interface PerspectiveCameraOptions {
  /** 垂直视场角，单位为弧度，必须满足 0 < fovY < PI。 */
  readonly fovY: number
  /** 视口宽 / 高，必须大于 0。 */
  readonly aspect: number
  /** 近裁剪平面到相机的正距离，必须大于 0。 */
  readonly near: number
  /** 远裁剪平面到相机的正距离，必须大于 near；本版不接受 Infinity。 */
  readonly far: number
}

/** 验证 JS/外部数据的运行时类型，不只依赖会在编译后消失的 TS 类型。 */
function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new InvalidPerspectiveCameraError(fieldName, 'must be a finite number', {
      received: value
    })

  return value
}

/**
 * 读取并验证一组参数，返回新对象；整个过程不修改相机。
 * 分别读取字段，避免后续持有调用者的 options 对象。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][perspective-atomic-update]
 *
 * 输入边界约定：构造函数和 setPerspective 必须先调用本函数，再把返回的
 * 同一份参数快照交给 createProjection。计算和提交应继续使用该快照，不能
 * 重新读取未经验证的外部 options，也不能在验证或候选矩阵计算完成前写入相机。
 *
 * PerspectiveCameraOptions 只表达字段类型，不是“已通过运行时验证”的类型证明。
 * 返回对象未使用品牌类型或 Object.freeze；安全性依赖本模块受控的调用顺序，
 * 以及调用者不修改候选快照的约定。
 *
 * @param options - 来自公开构造函数或 setter 的完整待验证配置。
 * @returns 四个字段均已读取并验证的新快照；尚不保证其 Float32 投影结果可用。
 * @throws {@link InvalidPerspectiveCameraError} 输入类型、范围或参数关系不合法。
 */
function copyValidatedOptions(options: PerspectiveCameraOptions): PerspectiveCameraOptions {
  if (options === null || typeof options !== 'object' || Array.isArray(options))
    throw new InvalidPerspectiveCameraError('options', 'must be a non-array object')

  const fovY = requireFiniteNumber(options.fovY, 'fovY')
  const aspect = requireFiniteNumber(options.aspect, 'aspect')
  const near = requireFiniteNumber(options.near, 'near')
  const far = requireFiniteNumber(options.far, 'far')

  if (fovY <= 0 || fovY >= Math.PI) {
    throw new InvalidPerspectiveCameraError('fovY', 'must satisfy 0 < fovY < PI', { fovY })
  }
  if (aspect <= 0) {
    throw new InvalidPerspectiveCameraError('aspect', 'must be positive', { aspect })
  }
  if (near <= 0) {
    throw new InvalidPerspectiveCameraError('near', 'must be positive', { near })
  }
  if (far <= near) {
    throw new InvalidPerspectiveCameraError('far', 'must be greater than near', { near, far })
  }

  return { fovY, aspect, near, far }
}

/**
 * 在独立缓冲中生成 WebGL 的 view → clip 投影矩阵。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][perspective-atomic-update]
 *
 * 计算边界约定：只接收 copyValidatedOptions 返回且未经修改的参数快照，
 * 不接收原始外部 options。因此这里不重复输入类型与范围验证，只验证计算结果。
 * 必须先完成本函数，再提交参数、投影矩阵与版本；抛错时不能覆盖旧相机状态。
 * 当前函数未导出；若未来改为公开 API，必须重新建立输入验证边界，不能仅依赖
 * PerspectiveCameraOptions 的静态类型，也不能把本函数当作通用输入验证器。
 *
 * 参数有限，不保证 Float32 计算结果可用。极小 fovY 可能产生 Infinity，
 * 极大 aspect 或极小 near 可能让关键系数下溢到零。这些情况必须在提交前拒绝。
 * 本检查不是一般的数值条件数评估，只拦截明确不可用的结果。
 *
 * mat4.perspective 使用弧度，约定相机朝局部 -Z，NDC 深度范围为 [-1, 1]。
 *
 * @param options - 已经通过 copyValidatedOptions 验证且未经修改的内部参数快照。
 * @returns 独立的 Float32 候选投影矩阵；本函数不会提交它或修改相机版本。
 * @throws {@link InvalidPerspectiveCameraError} Float32 结果非有限或关键系数归零。
 */
function createProjection(options: PerspectiveCameraOptions): Float32Array {
  const matrix = new Float32Array(16)
  const { fovY, aspect, near, far } = options
  mat4.perspective(matrix, fovY, aspect, near, far)

  for (const value of matrix) {
    if (!Number.isFinite(value))
      throw new InvalidPerspectiveCameraError(
        'projectionMatrix',
        'must contain only finite Float32 values',
        { ...options }
      )
  }

  if (matrix[0] === 0 || matrix[5] === 0 || matrix[14] === 0) {
    throw new InvalidPerspectiveCameraError(
      'projectionMatrix',
      'must not collapse a projection axis or depth term to zero',
      { ...options }
    )
  }

  return matrix
}

/**
 * 使用受控参数更新的透视相机，不包含 GPU 或 draw 行为。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][perspective-atomic-update]
 *
 * setPerspective 的顺序为：验证 → 比较 → 生成候选矩阵 → 提交参数和矩阵 → 增加版本。
 * 候选矩阵生成失败时，旧参数、旧矩阵、旧版本全部保持不变。
 *
 * [DESIGN-WEIGHT:2][perspective-number-comparison]
 *
 * 参数按 JavaScript Number 保存和精确比较，只有矩阵使用 Float32。
 * 因此重复传入 near=0.1 不会遇到“Float64 输入与 Float32 存储值直接比较”的问题。
 * 两个不同 Number 配置即使生成相同的 Float32 矩阵，仍视为配置发生变化。
 */
export class PerspectiveCamera extends Camera {
  /** 当前已提交的垂直视场角，单位为弧度。 */
  private fovYValue: number
  /** 当前已提交的宽高比。 */
  private aspectValue: number
  /** 当前已提交的近裁剪距离。 */
  private nearValue: number
  /** 当前已提交的远裁剪距离。 */
  private farValue: number

  /**
   * 完成构造时投影已经有效，初始 projectionVersion 为 0。
   * @param options - 完整的初始透视参数。
   * @throws {@link InvalidPerspectiveCameraError} 参数或生成的矩阵不可用。
   */
  constructor(options: PerspectiveCameraOptions) {
    super()
    const next = copyValidatedOptions(options)
    const projection = createProjection(next)

    this.fovYValue = next.fovY
    this.aspectValue = next.aspect
    this.nearValue = next.near
    this.farValue = next.far

    mat4.copy(this.projectionMatrixValue, projection)
  }

  /** 不依赖 constructor.name 的稳定诊断类型。 */
  protected override get debugType(): string {
    return 'PerspectiveCamera'
  }

  /** 已提交的垂直视场角，单位为弧度。 */
  get fovY(): number {
    return this.fovYValue
  }

  /** 已提交的视口宽 / 高。 */
  get aspect(): number {
    return this.aspectValue
  }

  /** 已提交的近裁剪距离。 */
  get near(): number {
    return this.nearValue
  }

  /** 已提交的远裁剪距离。 */
  get far(): number {
    return this.farValue
  }

  /**
   * 原子地提交完整透视配置；完全相同的参数不会重算或增加版本。
   * 不接受部分更新；调用者需显式保留其余字段。
   * @param options - 完整的新透视参数。
   * @throws {@link InvalidPerspectiveCameraError} 验证失败时旧状态不变。
   */
  setPerspective(options: PerspectiveCameraOptions): void {
    const next = copyValidatedOptions(options)
    if (
      next.fovY === this.fovYValue &&
      next.aspect === this.aspectValue &&
      next.near === this.nearValue &&
      next.far === this.farValue
    ) {
      return
    }

    const projection = createProjection(next)
    this.fovYValue = next.fovY
    this.aspectValue = next.aspect
    this.nearValue = next.near
    this.farValue = next.far
    mat4.copy(this.projectionMatrixValue, projection)

    this.projectionVersionValue++
  }

  /**
   * 复制投影，不重算、不增加版本，也不把内部缓冲交给外部。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][camera-projection-copy]
   *
   * @param out - 调用者提供的 16 分量矩阵；内容会被覆盖。
   */
  override copyProjectionMatrixTo(out: mat4): void {
    mat4.copy(out, this.projectionMatrixValue)
  }
}
