import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { Mat4Tuple } from '../core/math/tuples'

/**
 * 验证、复制并冻结 16 个列主序分量，不泄露可变 TypedArray。
 *
 * @param source - 需要复制的矩阵。
 * @param fieldName - 矩阵来源，仅用于错误诊断。
 * @throws {@link InvalidRenderViewError} 长度错误或存在非有限分量。
 */
export function copyMat4Snapshot(source: ArrayLike<number>, fieldName: string): Mat4Tuple {
  if (source === null || typeof source !== 'object' || source.length !== 16)
    throw new InvalidRenderViewError(fieldName, 'must contain exactly 16 components')

  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(source[i]))
      throw new InvalidRenderViewError(fieldName, 'component ' + i + ' must be finite')
  }

  // 上面已验证全部分量；固定长度写法让 TypeScript 同样知道这里恰好有 16 项。
  const result: Mat4Tuple = [
    source[0]!,
    source[1]!,
    source[2]!,
    source[3]!,
    source[4]!,
    source[5]!,
    source[6]!,
    source[7]!,
    source[8]!,
    source[9]!,
    source[10]!,
    source[11]!,
    source[12]!,
    source[13]!,
    source[14]!,
    source[15]!
  ]

  return Object.freeze(result)
}
