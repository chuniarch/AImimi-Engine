import { describe, expect, it } from 'vitest'

import { InvalidGeometryError } from '@/rendering/core/errors'
import { createHW2PRTGeometry } from '@/scenes/games202/hw2/internal/createHW2PRTGeometry'

/** 一个完整三角形；测试只替换 CPU 输入，不模拟 Geometry 或 VertexAttribute。 */
function positions(): Float32Array {
  return new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
}

/** 每行对应一个展开顶点，每列对应一个 SH 系数。 */
function transport(): number[][] {
  return [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [10, 11, 12, 13, 14, 15, 16, 17, 18],
    [20, 21, 22, 23, 24, 25, 26, 27, 28]
  ]
}

/** 实际二阶 SH shader 使用三个 vec3。 */
const regularLayout = [
  { name: 'aTransportSH0', size: 3 },
  { name: 'aTransportSH1', size: 3 },
  { name: 'aTransportSH2', size: 3 }
] as const

describe('createHW2PRTGeometry', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-transport-group-width]
   *
   * 特意使用 2/3/4，而不是 3/3/3：若内层循环误写成 group 数量 3，
   * 第一组会写多、第三组会漏写，下面的手算期望会立即失败。
   * 此 fixture 只验证数据装配；实际 shader 也必须声明对应的分量数。
   */
  it('按每组 size 切分，而不是按 group 数量切分', () => {
    const geometry = createHW2PRTGeometry(positions(), transport(), [
      { name: 'coeff01', size: 2 },
      { name: 'coeff234', size: 3 },
      { name: 'coeff5678', size: 4 }
    ])

    try {
      expect(geometry.getAttribute('coeff01')!.copyData()).toEqual(
        new Float32Array([0, 1, 10, 11, 20, 21])
      )
      expect(geometry.getAttribute('coeff234')!.copyData()).toEqual(
        new Float32Array([2, 3, 4, 12, 13, 14, 22, 23, 24])
      )
      expect(geometry.getAttribute('coeff5678')!.copyData()).toEqual(
        new Float32Array([5, 6, 7, 8, 15, 16, 17, 18, 25, 26, 27, 28])
      )
      expect(geometry.indexed).toBe(false)
      expect(geometry.drawCount).toBe(3)
    } finally {
      geometry.dispose()
    }
  })

  /** 修改加载结果不得悄悄改变已经创建的 Geometry。 */
  it('保留 position 语义，并隔离调用者随后修改的数组', () => {
    const sourcePositions = positions()
    const sourceTransport = transport()
    const geometry = createHW2PRTGeometry(sourcePositions, sourceTransport, regularLayout)

    try {
      sourcePositions[0] = 999
      sourceTransport[0]![0] = 999

      expect(geometry.getAttributeNames()).toEqual([
        'position',
        'aTransportSH0',
        'aTransportSH1',
        'aTransportSH2'
      ])
      expect(geometry.getAttribute('position')!.copyData()[0]).toBe(0)
      expect(geometry.getAttribute('aTransportSH0')!.copyData()[0]).toBe(0)
    } finally {
      geometry.dispose()
    }
  })

  /** 防止把 exporter 的顶点数或缺行数据误当作展开后的 transport 行数。 */
  it('拒绝 transport 行数与 position count 不一致', () => {
    expect(() => createHW2PRTGeometry(positions(), transport().slice(0, 2), regularLayout)).toThrow(
      InvalidGeometryError
    )
  })

  /** 非三角形、非有限 position 都不能进入未来 GPU 上传。 */
  it.each([
    new Float32Array(),
    new Float32Array([0, 0, 0]),
    new Float32Array([NaN, 0, 0, 1, 0, 0, 0, 1, 0])
  ])('拒绝无效 position 输入 %#', (value) => {
    expect(() => createHW2PRTGeometry(value, transport(), regularLayout)).toThrow(
      InvalidGeometryError
    )
  })

  /** 防止布局覆盖 position、重名覆盖以及超出 WebGL1 属性分量范围。 */
  it.each(
    [
      [],
      [
        { name: 'position', size: 3 },
        { name: 'x', size: 3 },
        { name: 'y', size: 3 }
      ],
      [
        { name: 'x', size: 3 },
        { name: 'x', size: 3 },
        { name: 'y', size: 3 }
      ],
      [
        { name: ' ', size: 3 },
        { name: 'x', size: 3 },
        { name: 'y', size: 3 }
      ],
      [
        { name: 'x', size: 5 },
        { name: 'y', size: 4 }
      ],
      [
        { name: 'x', size: 1.5 },
        { name: 'y', size: 3.5 },
        { name: 'z', size: 4 }
      ],
      [
        { name: 'x', size: 3 },
        { name: 'y', size: 3 }
      ]
    ].map((layout) => ({ layout }))
  )('拒绝无效 layout %#', ({ layout }) => {
    expect(() => createHW2PRTGeometry(positions(), transport(), layout)).toThrow(
      InvalidGeometryError
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-transport-float32-validation]
   *
   * 1e100 是有限的 JS number，但转成 Float32 后变成 Infinity，
   * 因此只检查 Number.isFinite(value) 不够。
   */
  it.each([NaN, Infinity, 1e100])('拒绝不可表示为有限 Float32 的系数 %s', (value) => {
    const rows = transport()
    rows[1]![4] = value
    expect(() => createHW2PRTGeometry(positions(), rows, regularLayout)).toThrow(
      InvalidGeometryError
    )
  })

  /** 每个顶点必须完整提供九个系数；不允许用默认零补齐缺失数据。 */
  it('拒绝单行系数不足', () => {
    const rows = transport()
    rows[1]!.pop()
    expect(() => createHW2PRTGeometry(positions(), rows, regularLayout)).toThrow(
      InvalidGeometryError
    )
  })
})
