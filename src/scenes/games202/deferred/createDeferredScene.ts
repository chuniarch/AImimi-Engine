import type { SceneSetup } from '@/engine/SceneSetup'
import type { Resource } from '@/rendering/core/Resource'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import {
  createGBufferMaterial,
  createGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { DeferredLightingPass } from '@/rendering/passes/DeferredLightingPass'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { Geometry } from '@/rendering/resources/Geometry'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'

/** 安装前由调用者拥有；安装后只借用 light/camera 调节下一帧。 */
export interface DeferredSceneBuildResult extends SceneSetup {
  readonly camera: PerspectiveCamera
  readonly light: DirectionalLight
}

/** 只在构建时生成静态快照；没有逐帧修改 Geometry 的能力。 */
function createGeometry(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[]
): Geometry {
  return new Geometry({
    attributes: {
      [VertexAttributeSemantic.Position]: new VertexAttribute({
        data: new Float32Array(positions),
        itemSize: 3
      }),
      [VertexAttributeSemantic.Normal]: new VertexAttribute({
        data: new Float32Array(normals),
        itemSize: 3
      }),
      [VertexAttributeSemantic.UV]: new VertexAttribute({
        data: new Float32Array(uvs),
        itemSize: 2
      })
    },
    indices: new Uint16Array(indices)
  })
}

/** 六面各四个顶点，避免硬边处共享顶点造成法线平滑。 */
function createBoxGeometry(): Geometry {
  const faces: readonly (readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple])[] = [
    [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0]
    ],
    [
      [-1, 0, 0],
      [0, 0, 1],
      [0, 1, 0]
    ],
    [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, -1]
    ],
    [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1]
    ],
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0]
    ],
    [
      [0, 0, -1],
      [-1, 0, 0],
      [0, 1, 0]
    ]
  ]
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = []
  for (const [normal, u, v] of faces) {
    const base = positions.length / 3
    // 每面的 cross(u,v)=normal；这四个角按外侧观察为逆时针。
    for (const [s, t] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ] as const) {
      for (const axis of [0, 1, 2] as const)
        positions.push(normal[axis] + s * u[axis] + t * v[axis])
      normals.push(...normal)
      uvs.push((s + 1) / 2, (t + 1) / 2)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return createGeometry(positions, normals, uvs, indices)
}

/**
 * 装配地面、方块和一盏方向光，不创建 canvas、Backend 或帧循环。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-scene-ownership-and-order]
 * Scene retain 独立资源；Material/Mesh 只借用。共享一个 GBuffer shader，
 * 但每个模型都有自己的 Geometry、Material 和 Transform。
 * 安装的 Pass 必须依次为 GBuffer → Lighting；不能再加 Forward 重画一遍。
 * 构建失败先清 Pass，再清 Scene；成功后由 Engine 接管二者。
 *
 * [DESIGN-WEIGHT:3][deferred-scene-linear-input]
 * 1×1 uint8 颜色明确表示线性反射率，不是 PNG 的 sRGB 编码值。
 * GBuffer 保存线性数据，Lambert 计算后只在最终显示出口进行一次编码。
 * 当前没有阴影、环境光、PBR 或 SSR，因此背光面变黑是预期行为。
 *
 * @param signal - 构建请求的取消信号；保留异步接口供未来可取消资产加载。
 * @returns 完整、尚未安装的候选。仅创建 CPU 对象，不证明设备支持四个浮点附件。
 */
export async function createDeferredScene(signal: AbortSignal): Promise<DeferredSceneBuildResult> {
  signal.throwIfAborted()
  const scene = new Scene()
  scene.name = 'Deferred / Lambert / Floor + Box'
  const passes: RenderPass[] = []

  /** 登记失败时资源还没有所有者，不能遗失刚创建的对象。 */
  function retain<T extends Resource>(resource: T): T {
    try {
      return scene.retain(resource)
    } catch (error) {
      try {
        resource.tryDispose()
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Deferred retain rollback failed', {
          cause: error
        })
      }
      throw error
    }
  }

  /** 常量颜色仍走真实的纹理参数契约，不向 GBuffer shader 塞入特殊分支。 */
  function color(label: string, rgba: readonly [number, number, number, number]): DataTexture2D {
    return retain(
      new DataTexture2D({
        label,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'linear',
        sampler: { minFilter: 'nearest', magFilter: 'nearest' },
        source: { width: 1, height: 1, data: new Uint8Array(rgba) }
      })
    )
  }

  try {
    const shader = retain(createGBufferShaderModule())
    const floorGeometry = retain(
      createGeometry(
        [-4, 0, 4, 4, 0, 4, 4, 0, -4, -4, 0, -4],
        [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 0, 1, 0, 1, 1, 0, 1],
        [0, 1, 2, 0, 2, 3]
      )
    )
    const floorMaterial = retain(
      createGBufferMaterial(shader, color('Deferred/floor/linear', [128, 128, 128, 255]))
    )
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.name = 'Deferred floor'
    const boxGeometry = retain(createBoxGeometry())
    const boxMaterial = retain(
      createGBufferMaterial(shader, color('Deferred/box/linear', [204, 51, 26, 255]))
    )
    const box = new Mesh(boxGeometry, boxMaterial)
    box.name = 'Deferred box'
    box.transform.setPosition([0, 1, 0])
    const camera = new PerspectiveCamera({ fovY: Math.PI / 3, aspect: 1, near: 0.1, far: 100 })
    camera.name = 'Deferred camera'
    camera.transform.setPosition([0, 3, 6])
    camera.transform.setRotation([-Math.atan2(2, 6), 0, 0])
    const light = new DirectionalLight({ intensity: Math.PI, targetWorld: [0, 0, 0] })
    light.name = 'Deferred sun'
    light.transform.setPosition([3, 5, 4])
    scene.add(floor, box, camera, light)
    const producer = new GBufferPass({ shaderModule: shader, label: 'Deferred/Lambert/GBuffer' })
    passes.push(producer)
    passes.push(new DeferredLightingPass(producer))
    signal.throwIfAborted()
    return Object.freeze({ scene, camera, light, passes: Object.freeze(passes) })
  } catch (error) {
    const errors: unknown[] = [error]
    for (const pass of passes) {
      try {
        pass.dispose()
      } catch (cause) {
        errors.push(cause)
      }
    }
    try {
      scene.dispose()
    } catch (cause) {
      errors.push(cause)
    }
    if (errors.length > 1)
      throw new AggregateError(errors, 'Deferred build rollback failed', { cause: error })
    throw error
  }
}
