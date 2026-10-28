import { describe, expect, it } from 'vitest'
import { createDeferredScene } from '@/scenes/games202/deferred/createDeferredScene'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import { DeferredLightingPass } from '@/rendering/passes/DeferredLightingPass'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import type { Resource } from '@/rendering/core/Resource'
import { Mesh } from '@/rendering/scene/Mesh'

/** 验证真实资源和帧提取，不用快照或 mock 代替场景装配。 */
describe('Deferred scene assembly', () => {
  /** 删除任一 retain、错误共享矩阵或倒转 Pass 顺序，都会破坏此契约。 */
  it('地面和方块独立，借用同一个专用 shader，并登记全部资源', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    try {
      expect(result.passes[0]).toBeInstanceOf(GBufferPass)
      expect(result.passes[1]).toBeInstanceOf(DeferredLightingPass)
      expect(result.passes).toHaveLength(2)
      const { renderList, lights } = new RenderListBuilder().build({
        scene: result.scene,
        camera: result.camera,
        frame: {
          frameNumber: 1,
          timeSeconds: 0,
          deltaSeconds: 0,
          drawingBufferWidth: 64,
          drawingBufferHeight: 64,
          pixelRatio: 1
        }
      })
      const [floor, box] = renderList.opaque
      expect(renderList.opaque).toHaveLength(2)
      expect(floor!.geometry).not.toBe(box!.geometry)
      expect(floor!.material).not.toBe(box!.material)
      expect(floor!.worldMatrix).not.toEqual(box!.worldMatrix)
      expect(floor!.material.shaderModule).toBe(box!.material.shaderModule)
      expect(lights).toHaveLength(1)
      expect(result.light.castShadow).toBe(false)
      expect(result.light.intensity).toBe(Math.PI)
      const resources = new Set<Resource>([
        floor!.geometry,
        box!.geometry,
        floor!.material,
        box!.material,
        floor!.material.shaderModule
      ])
      for (const item of [floor!, box!]) {
        const parameter = item.material.getParameter('uBaseColorMap')!
        expect(parameter.type).toBe('texture2D')
        if (parameter.type !== 'texture2D') throw new Error('wrong sampling type')
        expect(parameter.value).toBeInstanceOf(DataTexture2D)
        resources.add(parameter.value as DataTexture2D)
      }
      expect(resources.size).toBe(7)
      for (const resource of resources) expect(resource.sceneReferenceCount).toBe(1)
      for (const pass of result.passes) pass.dispose()
      result.scene.dispose()
      for (const resource of resources) expect(resource.disposed).toBe(true)
    } finally {
      for (const pass of result.passes) pass.dispose()
      result.scene.dispose()
    }
  })

  /** 每个三角形的叉积应朝向声明法线；错误绕序会被默认 back-face culling 隐藏。 */
  it('所有三角形绕序与单位法线一致，uv 和顶点数量匹配', async () => {
    const result = await createDeferredScene(new AbortController().signal)
    try {
      result.scene.traverse((node) => {
        if (!(node instanceof Mesh)) return
        const geometry = node.geometry
        const positions = geometry.getAttribute('position')!.copyData()
        const normals = geometry.getAttribute('normal')!.copyData()
        expect(geometry.getAttribute('uv')!.count).toBe(positions.length / 3)
        const indices = geometry.copyIndices()!
        for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i]! * 3,
            b = indices[i + 1]! * 3,
            c = indices[i + 2]! * 3
          const u = [
            positions[b]! - positions[a]!,
            positions[b + 1]! - positions[a + 1]!,
            positions[b + 2]! - positions[a + 2]!
          ]
          const v = [
            positions[c]! - positions[a]!,
            positions[c + 1]! - positions[a + 1]!,
            positions[c + 2]! - positions[a + 2]!
          ]
          const cross = [
            u[1]! * v[2]! - u[2]! * v[1]!,
            u[2]! * v[0]! - u[0]! * v[2]!,
            u[0]! * v[1]! - u[1]! * v[0]!
          ]
          expect(
            cross[0]! * normals[a]! + cross[1]! * normals[a + 1]! + cross[2]! * normals[a + 2]!
          ).toBeGreaterThan(0)
        }
      })
    } finally {
      for (const pass of result.passes) pass.dispose()
      result.scene.dispose()
    }
  })

  /** 取消在任何资源创建之前检查，不交出已经失效的候选。 */
  it('预先取消拒绝原始 signal.reason', async () => {
    const controller = new AbortController()
    const reason = new Error('cancelled')
    controller.abort(reason)
    await expect(createDeferredScene(controller.signal)).rejects.toBe(reason)
  })
})
