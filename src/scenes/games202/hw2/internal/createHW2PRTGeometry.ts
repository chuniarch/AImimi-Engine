import { InvalidGeometryError } from '@/rendering/core/errors'
import { Geometry } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'

/**
 * 一个 transport attribute 的 CPU 布局描述。
 * size 对应 VertexAttribute.itemSize，不是 attribute 的数量。
 */
export interface HW2TransportAttributeGroup {
  readonly name: string
  readonly size: number
}

/** 当前二阶 SH 使用九个系数；不表示所有未来 SH 阶数都只能为九。 */
const ORDER2_COEFFICIENT_COUNT = 9

/**
 * 将 face-expanded position 和逐顶点 SH 系数装配成静态 Geometry。
 *
 * @param positions - OBJ 三角面顺序展开的 xyz，不能去重或重新排序。
 * @param transportSH - 同一展开顺序的逐顶点系数；每行九个。
 * @param layout - 按系数顺序排列的分组，分量总数必须为九。
 * @returns 尚未被 Scene retain 的 Geometry；调用者负责接管或 dispose。
 * @throws InvalidGeometryError 输入布局、计数或数值不满足当前 PRT 契约。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-transport-group-width]
 *
 * 例如布局为 2/3/4 时，第 v 个顶点的：
 * - 第 0 组读取 row[0..1]，写入该组 v * 2 的位置；
 * - 第 1 组读取 row[2..4]，写入该组 v * 3 的位置；
 * - 第 2 组读取 row[5..8]，写入该组 v * 4 的位置。
 *
 * 每组使用自己的 size，不能把 layout.length 当作每组分量数。
 * 本函数不生成 GPU buffer，不决定 shader attribute location，也不添加别名。
 * shader 必须使用 position 以及 layout 声明的实际名称。
 */
export function createHW2PRTGeometry(
  positions: Float32Array,
  transportSH: readonly (readonly number[])[],
  layout: readonly HW2TransportAttributeGroup[]
): Geometry {
  if (
    !(positions instanceof Float32Array) ||
    positions.length === 0 ||
    positions.length % 9 !== 0
  ) {
    throw new InvalidGeometryError('PRT positions must contain complete expanded triangles')
  }

  for (const value of positions) {
    if (!Number.isFinite(value)) {
      throw new InvalidGeometryError('PRT positions must be finite')
    }
  }

  const rawLayout: unknown = layout
  if (!Array.isArray(rawLayout) || rawLayout.length === 0) {
    throw new InvalidGeometryError('PRT attribute layout must be a non-empty array')
  }

  const names = new Set<string>([VertexAttributeSemantic.Position])
  let coefficientCount = 0

  for (const group of layout) {
    if (
      group === null ||
      typeof group !== 'object' ||
      typeof group.name !== 'string' ||
      group.name.trim().length === 0 ||
      names.has(group.name) ||
      !Number.isInteger(group.size) ||
      group.size < 1 ||
      group.size > 4
    ) {
      throw new InvalidGeometryError(
        'PRT attribute names must be unique and sizes must be integers in [1, 4]'
      )
    }

    names.add(group.name)
    coefficientCount += group.size
  }

  if (coefficientCount !== ORDER2_COEFFICIENT_COUNT) {
    throw new InvalidGeometryError('order-2 PRT requires exactly 9 coefficients', {
      coefficientCount
    })
  }

  const vertexCount = positions.length / 3
  const rawTransport: unknown = transportSH

  if (!Array.isArray(rawTransport) || rawTransport.length !== vertexCount) {
    throw new InvalidGeometryError('PRT transport rows must match expanded position count', {
      vertexCount,
      transportRowCount: Array.isArray(rawTransport) ? rawTransport.length : null
    })
  }

  const groups = layout.map((group) => ({
    ...group,
    data: new Float32Array(vertexCount * group.size)
  }))

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const row = transportSH[vertexIndex]
    const rawRow: unknown = row

    if (!Array.isArray(rawRow) || rawRow.length !== coefficientCount) {
      throw new InvalidGeometryError('each PRT transport row must contain 9 coefficients', {
        vertexIndex
      })
    }

    let coefficientOffset = 0

    for (const group of groups) {
      for (let component = 0; component < group.size; component += 1) {
        const coefficientIndex = coefficientOffset + component
        const value = row![coefficientIndex]

        /**
         * @remarks
         * [DESIGN-WEIGHT:3][hw2-transport-float32-validation]
         *
         * 拒绝 NaN、Infinity 和转换为 Float32 后溢出的有限 number。
         * 不依赖 TypedArray 把 undefined 等错误输入静默转换为 NaN。
         */
        if (typeof value !== 'number' || !Number.isFinite(Math.fround(value))) {
          throw new InvalidGeometryError(
            'PRT coefficients must be representable as finite Float32',
            {
              vertexIndex,
              coefficientIndex,
              received: value
            }
          )
        }

        group.data[vertexIndex * group.size + component] = value
      }

      coefficientOffset += group.size
    }
  }

  const attributes: [string, VertexAttribute][] = [
    [VertexAttributeSemantic.Position, new VertexAttribute({ data: positions, itemSize: 3 })]
  ]

  for (const group of groups) {
    attributes.push([group.name, new VertexAttribute({ data: group.data, itemSize: group.size })])
  }

  // 所有数据通过验证后才创建 Resource；构造失败前的临时数组由 GC 回收。
  return new Geometry({
    attributes: Object.fromEntries(attributes),
    topology: 'triangles'
  })
}
