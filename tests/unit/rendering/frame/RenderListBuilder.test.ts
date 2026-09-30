import { describe, expect, it } from 'vitest'

import { ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { copyMat4Snapshot } from '@/rendering/frame/copyMat4Snapshot'
import { RenderList } from '@/rendering/frame/RenderList'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { Group } from '@/rendering/scene/Group'
import { createRenderFixture } from '../helpers/createRenderFixture'

describe('RenderListBuilder', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][frame-camera-value-snapshot]
   *
   * 父节点 x=10，相机局部 x=2，故世界位置=12、view 平移=-12。
   * 使用手算的投影系数，避免拿被测函数重复计算 expected。
   */
  it('复制相机 world inverse、投影及世界位置，并隔离后续相机修改', () => {
    const f = createRenderFixture()
    const parent = new Group()

    parent.transform.setPosition([10, 0, 0])
    f.camera.transform.setPosition([2, 0, 0])
    parent.add(f.camera)
    f.scene.add(parent)

    const view = new RenderListBuilder().build(f.view).viewState

    expect(view.cameraWorldPosition).toEqual([12, 0, 0])
    expect(view.viewMatrix[12]).toBe(-12)
    expect(view.projectionMatrix).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -2, -1, 0, 0, -3, 0])

    f.camera.transform.setPosition([100, 0, 0])
    f.camera.setPerspective({
      fovY: Math.PI / 3,
      aspect: 2,
      near: 1,
      far: 10
    })

    expect(view.cameraWorldPosition).toEqual([12, 0, 0])
    expect(view.projectionMatrix[10]).toBe(-2)

    for (const value of [view, view.viewMatrix, view.projectionMatrix, view.cameraWorldPosition]) {
      expect(Object.isFrozen(value)).toBe(true)
    }
  })

  /** 隐藏父节点排除整棵子树；background/opaque 各自保留场景先后顺序。 */
  it('按可见遍历稳定分类，并支持隐藏整个 Scene', () => {
    const f = createRenderFixture()
    const a = f.mesh()
    const skyA = f.mesh('background')
    const skyB = f.mesh('background')
    const b = f.mesh()
    const hidden = new Group()

    hidden.visible = false
    hidden.add(f.mesh())
    f.scene.add(a, skyA, hidden, skyB, b)

    const builder = new RenderListBuilder()
    const list = builder.build(f.view).renderList

    expect(list.background.map((item) => item.material)).toEqual([skyA.material, skyB.material])
    expect(list.opaque.map((item) => item.material)).toEqual([a.material, b.material])

    f.scene.visible = false

    const empty = builder.build(f.view).renderList

    expect(empty.background).toHaveLength(0)
    expect(empty.opaque).toHaveLength(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][frame-item-value-reference-boundary]
   *
   * 值快照必须隔离，Resource 身份必须保留，不能把这两种规则混淆。
   */
  it('矩阵、队列和包装冻结，但 Material 仍是可变的借用资源', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()

    mesh.transform.setPosition([2, 0, 0])
    f.scene.add(mesh)

    const builder = new RenderListBuilder()
    const first = builder.build(f.view).renderList

    expect(first.opaque).toHaveLength(1)

    const item = first.opaque[0]!

    mesh.transform.setPosition([9, 0, 0])
    mesh.material.setParameter('uValue', {
      type: 'float',
      value: 7
    })

    const second = builder.build(f.view).renderList

    expect(item.worldMatrix[12]).toBe(2)
    expect(second.opaque[0]!.worldMatrix[12]).toBe(9)
    expect(first.opaque).not.toBe(second.opaque)

    expect(item.geometry).toBe(f.geometry)
    expect(item.material).toBe(mesh.material)
    expect(item.material.getParameter('uValue')).toEqual({
      type: 'float',
      value: 7
    })
    expect('mesh' in item).toBe(false)

    for (const value of [first, first.background, first.opaque, item, item.worldMatrix]) {
      expect(Object.isFrozen(value)).toBe(true)
    }

    expect(Reflect.set(item.worldMatrix, '12', 999)).toBe(false)
    expect(f.geometry.sceneReferenceCount).toBe(0)
    expect(mesh.material.sceneReferenceCount).toBe(0)
  })

  /** RenderList 是公开构造器，不能仅假定输入来自 Builder 且已经冻结。 */
  it('RenderList 构造时复制外部队列、item 和矩阵', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()

    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1] as const

    const input = [
      {
        geometry: f.geometry,
        material: mesh.material,
        worldMatrix: matrix
      }
    ]

    const list = new RenderList([], input)

    expect(list.opaque[0]).not.toBe(input[0])
    expect(list.opaque[0]!.worldMatrix).not.toBe(matrix)

    input.length = 0

    expect(list.opaque).toHaveLength(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:2][frame-world-update-boundary]
   *
   * 检查真实重算版本，不用 spy 把祖先缓存检查次数误认为矩阵计算次数。
   */
  it('共享祖先每次变化只重算一次，不变的下一帧不重算', () => {
    const f = createRenderFixture()
    const parent = new Group()
    const a = f.mesh()
    const b = f.mesh()

    parent.transform.setPosition([10, 0, 0])
    a.transform.setPosition([1, 0, 0])
    b.transform.setPosition([2, 0, 0])

    parent.add(a, b)
    f.scene.add(parent)

    const before = parent.worldVersion
    const builder = new RenderListBuilder()

    expect(builder.build(f.view).renderList.opaque.map((item) => item.worldMatrix[12])).toEqual([
      11, 12
    ])

    expect(parent.worldVersion).toBe(before + 1)

    builder.build(f.view)

    expect(parent.worldVersion).toBe(before + 1)

    parent.transform.setPosition([20, 0, 0])

    expect(builder.build(f.view).renderList.opaque.map((item) => item.worldMatrix[12])).toEqual([
      21, 22
    ])

    expect(parent.worldVersion).toBe(before + 2)
  })

  /** 不可逆相机不得替换成单位矩阵；修复后同一个 Builder 仍可使用。 */
  it('拒绝不可逆相机但不保留失败半帧', () => {
    const f = createRenderFixture()
    const builder = new RenderListBuilder()

    f.camera.transform.setScale([0, 1, 1])

    expect(() => builder.build(f.view)).toThrow(InvalidRenderViewError)

    f.camera.transform.setScale([1, 1, 1])

    expect(builder.build(f.view).viewState.viewMatrix[0]).toBe(1)
  })

  /** 错误值不得在帧边界继续流向 GPU；长度和非有限数分别覆盖。 */
  it('拒绝错误矩阵长度及非有限 Mesh 世界矩阵', () => {
    expect(() => copyMat4Snapshot(new Float32Array(15), 'test')).toThrow(InvalidRenderViewError)

    const f = createRenderFixture()
    const mesh = f.mesh()

    mesh.transform.setPosition([Infinity, 0, 0])
    f.scene.add(mesh)

    expect(() => new RenderListBuilder().build(f.view)).toThrow(InvalidRenderViewError)
  })

  /** 已释放的资源和已退出的场景必须使用原有生命周期错误，不伪装成空场景。 */
  it('拒绝已释放的可见 Geometry 和 Scene', () => {
    const f = createRenderFixture()

    f.scene.add(f.mesh())
    f.geometry.dispose()

    expect(() => new RenderListBuilder().build(f.view)).toThrow(ResourceDisposedError)

    f.scene.dispose()

    expect(() => new RenderListBuilder().build(f.view)).toThrow(ResourceDisposedError)
  })
})
