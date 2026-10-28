import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHW1Scene } from '@/scenes/games202/hw1/createHW1Scene'
import { loadHW1Assets, type HW1ModelData } from '@/scenes/games202/hw1/internal/loadHW1Assets'
import { Mesh } from '@/rendering/scene/Mesh'
import { ImageTexture2D } from '@/rendering/resources/Texture2D'
import type { Resource } from '@/rendering/core/Resource'

/** 只替换网络/图片入口，几何、材质、场景、Pass 和所有权使用正式实现。 */
vi.mock('@/scenes/games202/hw1/internal/loadHW1Assets', () => ({ loadHW1Assets: vi.fn() }))

/** 两份 Mary 材质和一份地面材质，防止工厂错误地把全部 face 套用 material[0]。 */
function assets(): readonly HW1ModelData[] {
  const material = (diffuseColor: readonly [number, number, number], image = false) => ({
    diffuseColor,
    specularColor: [0.2, 0.2, 0.2] as const,
    shininess: 32,
    diffuseImage: image
      ? ({ complete: true, naturalWidth: 2, naturalHeight: 2 } as HTMLImageElement)
      : null
  })
  const part = (name: string, surface: ReturnType<typeof material>) => ({
    name,
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    material: surface
  })
  return [
    {
      name: 'Mary',
      parts: [
        part('dress', material([0.8, 0.8, 0.8], true)),
        part('solid', material([0.2, 0.5, 0.8]))
      ]
    },
    { name: 'Floor', parts: [part('floor', material([0.8, 0.8, 0.8]))] }
  ]
}

const completed: Awaited<ReturnType<typeof createHW1Scene>>[] = []
afterEach(() => {
  for (const result of completed.splice(0)) {
    for (const pass of result.passes) pass.dispose()
    result.scene.dispose()
  }
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('HW1 CPU scene assembly', () => {
  /** [DESIGN-WEIGHT:3][hw1-scene-complete-installation] 场景交出完整流程，而不是只有模型。 */
  it('保留三个材质分组、模型变换、真实相机和完整阴影到光照流程', async () => {
    vi.mocked(loadHW1Assets).mockResolvedValue(assets())
    const result = await createHW1Scene(new AbortController().signal)
    completed.push(result)
    expect(result.passes.map((pass) => pass.name)).toEqual([
      'ShadowMapPass',
      'HW1LightingPass',
      'ForwardPass'
    ])
    expect(result.camera.parent).toBe(result.scene)
    expect(result.camera.transform.position).toEqual([0, 30, 50])
    expect(result.camera.fovY).toBeCloseTo(Math.PI / 3)
    expect(result.camera.transform.rotation[0]).toBeCloseTo(-Math.atan2(20, 50))
    expect(result.light.parent).toBe(result.scene)
    expect(result.light.transform.position).toEqual([0, 80, 80])
    expect(result.light.intensity).toBe(3)
    expect(result.light.shadow).toBe(result.shadow)
    expect(result.light.castShadow).toBe(true)
    const meshes = result.scene.children.filter((node): node is Mesh => node instanceof Mesh)
    expect(meshes).toHaveLength(3)
    expect(meshes.map((mesh) => mesh.transform.scale)).toEqual([
      [10, 10, 10],
      [10, 10, 10],
      [2, 2, 2]
    ])
    expect(meshes.every((mesh) => mesh.castShadow)).toBe(true)
    expect(meshes.map((mesh) => mesh.geometry.getAttributeNames())).toEqual(
      Array(3).fill(['position', 'normal', 'uv'])
    )
    expect(meshes[0]!.material).not.toBe(meshes[1]!.material)
    expect(meshes[0]!.material.shaderModule).toBe(meshes[1]!.material.shaderModule)
    expect(meshes[0]!.material.blocks).toEqual([result.lightBlock, result.shadow.block])
    expect(meshes[1]!.material.getParameter('uDiffuseColor')).toEqual({
      type: 'vec3',
      value: [0.2, 0.5, 0.8]
    })
    const map = meshes[0]!.material.getParameter('uDiffuseMap')!
    expect(map.type).toBe('texture2D')
    if (map.type !== 'texture2D') throw new Error('missing texture')
    expect(map.value).toBeInstanceOf(ImageTexture2D)
    expect((map.value as ImageTexture2D).colorSpace).toBe('data')
  })

  /** [DESIGN-WEIGHT:3][hw1-scene-resource-ownership] Pass 借用者先退场，Scene 释放全部拥有者。 */
  it('退出时释放模型资源、共享块与阴影，Pass 不提前释放借用依赖', async () => {
    vi.mocked(loadHW1Assets).mockResolvedValue(assets())
    const result = await createHW1Scene(new AbortController().signal)
    completed.push(result)
    const resources = new Set<Resource>([
      result.shadow,
      result.shadow.target,
      result.shadow.block,
      result.lightBlock
    ])
    for (const node of result.scene.children) {
      if (!(node instanceof Mesh)) continue
      resources.add(node.geometry).add(node.material).add(node.material.shaderModule)
      const map = node.material.getParameter('uDiffuseMap')!
      if (map.type === 'texture2D' && 'disposed' in map.value) resources.add(map.value)
    }
    for (const pass of result.passes) pass.dispose()
    expect([...resources].every((resource) => !resource.disposed)).toBe(true)
    result.scene.dispose()
    expect([...resources].every((resource) => resource.disposed)).toBe(true)
  })

  /** 忽略 signal 的 I/O 仍不能把取消后的结果装配成可安装 Scene。 */
  it('开始前和 I/O 完成后的取消都保留原 reason', async () => {
    const controller = new AbortController()
    const reason = new Error('left HW1')
    controller.abort(reason)
    await expect(createHW1Scene(controller.signal)).rejects.toBe(reason)
    expect(loadHW1Assets).not.toHaveBeenCalled()
    const next = new AbortController()
    vi.mocked(loadHW1Assets).mockImplementation(async () => {
      next.abort(reason)
      return assets()
    })
    await expect(createHW1Scene(next.signal)).rejects.toBe(reason)
  })
})
