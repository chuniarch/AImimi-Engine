/**
 * 一张 cubemap face 的实际像素尺寸。
 *
 * @remarks
 * 它只描述 backend-independent 的二维尺寸，不包含图片对象、像素数组或
 * WebGL texture handle。
 */
export interface CubeFaceDimensions {
  readonly width: number
  readonly height: number
}

/**
 * 六张 cubemap face 的固定尺寸集合。
 *
 * @remarks
 * tuple 提供编译期长度约束。调用者仍需要在外部输入进入 tuple 之前验证运行时
 * 数组确实包含六个元素。
 */
type CubeFaceDimensionTuple<T extends CubeFaceDimensions> = readonly [T, T, T, T, T, T]

/**
 * 把通用 cubemap 尺寸验证错误转换成调用者需要的领域错误。
 */
export type CubeFaceDimensionErrorFactory = (
  reason: string,
  details: Readonly<Record<string, unknown>>
) => Error

/**
 * 验证 cubemap 六面的 backend-independent 尺寸不变量。
 *
 * @param faces - 按 +X、-X、+Y、-Y、+Z、-Z 排列的六面尺寸。
 * @param createError - 将验证原因和结构化上下文转换成领域错误的惰性工厂。
 *
 * @throws 调用者创建的领域错误
 * 任一尺寸不是正安全整数、任一面不是正方形或六面尺寸不一致时抛出。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][cubemap-face-dimension-invariant]
 *
 * Cubemap 的以下规则不依赖 WebGL1、WebGL2 或其他 backend：
 *
 * 1. 每一面的宽高必须是正安全整数；
 * 2. 每一面必须是正方形；
 * 3. 六面必须具有相同尺寸。
 *
 * WebGL1 的 NPOT、sampler、mipmap 和 extension 限制不属于这个函数。
 *
 * 错误工厂是惰性的：有效输入不会创建 Error 对象。
 */
export function assertValidCubeFaceDimensions<T extends CubeFaceDimensions>(
  faces: CubeFaceDimensionTuple<T>,
  createError: CubeFaceDimensionErrorFactory
): void {
  for (const [faceIndex, face] of faces.entries()) {
    const hasValidDimensions =
      Number.isSafeInteger(face.width) &&
      face.width > 0 &&
      Number.isSafeInteger(face.height) &&
      face.height > 0

    if (!hasValidDimensions) {
      throw createError(
        `face ${faceIndex} dimensions must be positive safe integers; received ${String(face.width)} × ${String(face.height)}`,
        {
          faceIndex,
          receivedWidth: face.width,
          receivedHeight: face.height
        }
      )
    }

    if (face.width !== face.height) {
      throw createError(
        `face ${faceIndex} must be square; received ${face.width} × ${face.height}`,
        {
          faceIndex,
          receivedWidth: face.width,
          receivedHeight: face.height
        }
      )
    }
  }

  const firstFace = faces[0]

  for (const [offset, face] of faces.slice(1).entries()) {
    const faceIndex = offset + 1

    if (face.width !== firstFace.width || face.height !== firstFace.height) {
      throw createError(
        `face ${faceIndex} dimensions ${face.width} × ${face.height} do not match face 0 dimensions ${firstFace.width} × ${firstFace.height}`,
        {
          faceIndex,
          expectedWidth: firstFace.width,
          expectedHeight: firstFace.height,
          receivedWidth: face.width,
          receivedHeight: face.height
        }
      )
    }
  }
}
