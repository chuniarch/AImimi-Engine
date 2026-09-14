import { mat4 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { EngineError } from '@/errors/EngineError/BaseError'
import { InvalidMeshError, RenderingError, ResourceDisposedError } from '@/rendering/core/errors'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import { Group } from '@/rendering/scene/Group'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { SceneNode } from '@/rendering/scene/SceneNode'

/**
 * 创建最小的真实 CPU 资源，不创建 WebGL context，也不模拟 Resource 生命周期。
 * 三个 position 组成一个三角形；shader 文本本批只作为 CPU 源代码保存。
 */
function createResources() {
  const geometry = new Geometry({
    attributes: {
      [VertexAttributeSemantic.Position]: new VertexAttribute({
        data: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        itemSize: 3
      })
    }
  })
  const shader = new ShaderModule({
    name: 'mesh-test',
    language: 'glsl-es-100',
    vertexSource: 'void main() { gl_Position = vec4(0.0); }',
    fragmentSource: 'void main() { gl_FragColor = vec4(1.0); }'
  })
  const material = new Material({ shaderModule: shader })

  return { geometry, shader, material }
}

/** 经公开 API 取得节点世界矩阵，不读取私有缓存。 */
function worldOf(node: SceneNode): mat4 {
  const out = mat4.create()
  node.copyWorldMatrixTo(out)
  return out
}

/**
 * 编译期契约，不在 Vitest 中执行。
 * TypeScript 应拒绝替换借用引用，以及调用不属于 CPU Mesh 的 draw/dispose。
 */
function checkMeshTypes(mesh: Mesh, geometry: Geometry, material: Material): void {
  // @ts-expect-error geometry 是只有 getter 的借用引用。
  mesh.geometry = geometry
  // @ts-expect-error material 是只有 getter 的借用引用。
  mesh.material = material
  // @ts-expect-error 绘制属于后续 Backend。
  mesh.draw()
  // @ts-expect-error 节点移除不等于 Resource 释放。
  mesh.dispose()
}
void checkMeshTypes

describe('Mesh CPU scene contract', () => {
  /**
   * 若构造函数复制资源或擅自 retain，本测试必须失败。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][mesh-borrowed-resources]
   */
  it('两个独立节点借用同一 Geometry 和 Material', () => {
    const { geometry, material } = createResources()
    const first = new Mesh(geometry, material)
    const second = new Mesh(geometry, material)

    expect(first).toBeInstanceOf(SceneNode)
    expect(first.uuid).not.toBe(second.uuid)
    expect(first.geometry).toBe(geometry)
    expect(second.geometry).toBe(geometry)
    expect(first.material).toBe(material)
    expect(second.material).toBe(material)
    expect(geometry.sceneReferenceCount).toBe(0)
    expect(material.sceneReferenceCount).toBe(0)
    expect(Reflect.set(first, 'geometry', geometry)).toBe(false)
    expect(Reflect.set(first, 'material', material)).toBe(false)
  })

  /** 防止新增子类退回 constructor.name，或丢失 name 优先显示的规则。 */
  it('提供稳定的 Mesh 诊断标签并允许 rename', () => {
    const { geometry, material } = createResources()
    const mesh = new Mesh(geometry, material)
    expect(mesh.debugLabel).toBe('Mesh#' + mesh.uuid.slice(0, 8))

    mesh.name = 'boat'
    expect(mesh.debugLabel).toBe('boat#' + mesh.uuid.slice(0, 8))
  })

  /**
   * 共享材质时模型矩阵仍来自各自节点；数值由 10 + 1、10 + 2 手工确定。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][mesh-model-matrix-source]
   */
  it('共享资源的 Mesh 保持独立的模型矩阵', () => {
    const { geometry, material } = createResources()
    const parent = new Group()
    const first = new Mesh(geometry, material)
    const second = new Mesh(geometry, material)
    parent.transform.setPosition([10, 0, 0])
    first.transform.setPosition([1, 0, 0])
    second.transform.setPosition([2, 0, 0])
    parent.add(first, second)

    const copied = worldOf(first)
    expect(copied[12]).toBe(11)
    expect(worldOf(second)[12]).toBe(12)
    copied[12] = 999
    expect(worldOf(first)[12]).toBe(11)

    first.transform.setPosition([3, 0, 0])
    expect(worldOf(first)[12]).toBe(13)
    expect(worldOf(second)[12]).toBe(12)
  })

  /** 如果移除节点误 dispose 借用资源，重新加入另一个 Scene 后就无法读取资源。 */
  it('移除 Mesh 不释放借用资源，且可以重新加入场景', () => {
    const { geometry, material } = createResources()
    const mesh = new Mesh(geometry, material)
    const first = new Scene()
    const second = new Scene()
    first.add(mesh)

    mesh.removeFromParent()
    mesh.removeFromParent()

    expect(first.children).toEqual([])
    expect(mesh.parent).toBeNull()
    expect(geometry.disposed).toBe(false)
    expect(material.disposed).toBe(false)
    second.add(mesh)
    expect(mesh.parent).toBe(second)
    expect(mesh.geometry.drawCount).toBe(3)
    expect(mesh.material).toBe(material)
    expect(geometry.sceneReferenceCount).toBe(0)
  })

  /**
   * 两个 Scene 显式持有资源。第一个退出不能破坏第二个；最后一个退出才释放。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][mesh-borrowed-resources]
   */
  it('资源存活遵循 Scene 引用数，而不是 Mesh 数量', () => {
    const { geometry, shader, material } = createResources()
    const first = new Scene()
    const second = new Scene()
    const firstMesh = new Mesh(geometry, material)
    const secondMesh = new Mesh(geometry, material)
    first.add(firstMesh)
    second.add(secondMesh)

    for (const resource of [geometry, shader, material]) {
      first.retain(resource)
      second.retain(resource)
    }

    first.dispose()
    expect(firstMesh.parent).toBeNull()
    expect(secondMesh.geometry.drawCount).toBe(3)
    expect(secondMesh.material).toBe(material)
    expect(geometry.sceneReferenceCount).toBe(1)

    second.dispose()
    expect(secondMesh.parent).toBeNull()
    expect(geometry.disposed).toBe(true)
    expect(material.disposed).toBe(true)
    expect(shader.disposed).toBe(true)
    expect(() => secondMesh.geometry).toThrow(ResourceDisposedError)
    expect(() => secondMesh.material).toThrow(ResourceDisposedError)
  })

  /** 故意绕过 TS，模拟 JS 调用者；类型无效时不能偷偷修改合法依赖的生命周期。 */
  it.each([
    { field: 'geometry', value: null },
    { field: 'geometry', value: {} },
    { field: 'material', value: undefined },
    { field: 'material', value: {} }
  ])('拒绝错误的 $field 引用：$value', ({ field, value }) => {
    const { geometry, material } = createResources()
    const construct = () =>
      new Mesh(
        field === 'geometry' ? (value as Geometry) : geometry,
        field === 'material' ? (value as Material) : material
      )

    expect(construct).toThrow(InvalidMeshError)
    expect(geometry.disposed).toBe(false)
    expect(material.disposed).toBe(false)
  })

  /** 与“类型错误”区分：真实但已释放的资源必须抛生命周期领域错误。 */
  it('在构造及读取时拒绝已经释放的依赖', () => {
    const { geometry, material } = createResources()
    const mesh = new Mesh(geometry, material)
    geometry.dispose()
    expect(() => new Mesh(geometry, material)).toThrow(ResourceDisposedError)
    expect(() => mesh.geometry).toThrow(ResourceDisposedError)
    expect(mesh.material).toBe(material)

    const another = createResources()
    material.dispose()
    expect(() => new Mesh(another.geometry, material)).toThrow(ResourceDisposedError)
    expect(() => mesh.material).toThrow(ResourceDisposedError)
  })

  /** 消费者仍可用项目统一基类、稳定 code 和结构化字段分类错误。 */
  it('InvalidMeshError 沿用统一错误层级', () => {
    const error = new InvalidMeshError('geometry')
    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidMeshError')
    expect(error.code).toBe('INVALID_MESH')
    expect(error.details.fieldName).toBe('geometry')
  })
})
