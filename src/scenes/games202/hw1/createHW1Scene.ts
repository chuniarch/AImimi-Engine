import type { SceneSetup } from '@/engine/SceneSetup'
import type { Resource } from '@/rendering/core/Resource'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import { ShadowMapPass } from '@/rendering/passes/ShadowMapPass'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { DataTexture2D, ImageTexture2D, type Texture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import type { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import { createPackedDepthShaderModule } from '@/rendering/shadows/createPackedDepthShaderModule'
import { createHW1LightBlock, HW1LightingPass } from './HW1LightingPass'
import { createHW1ReceiverShaderModule } from './createHW1ReceiverShaderModule'
import { loadHW1Assets } from './internal/loadHW1Assets'

/** scene/passes 在安装前归调用者；其余字段只提供调节当前场景的借用入口。 */
export interface HW1SceneBuildResult extends SceneSetup {
  readonly camera: PerspectiveCamera
  readonly light: DirectionalLight
  readonly shadow: DirectionalLightShadow
  readonly lightBlock: ParameterBlock
}

/**
 * 加载并装配 Mary + Floor，不访问 canvas、Engine 或 WebGL。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-scene-complete-installation]
 * 先完成可取消 I/O，再同步构建资源和 Pass；只交付完整 SceneSetup。
 * 深度图 → 灯光块更新 → 普通 Forward 的顺序由场景明确提供，不在 Engine 写作业分支。
 *
 * [DESIGN-WEIGHT:3][hw1-scene-resource-ownership]
 * Scene retain 各独立 Resource；Material 借用 Shader/Texture/Block。
 * shadow 独占其 target/block，不能再单独 retain 这两个子资源。
 * 未安装候选回滚时先退 Pass、后释放 Scene。安装后交给 Engine；当前 Engine 退出时
 * 先清 Scene 再退 Pipeline，因此 Pass.dispose 不得读取已经释放的借用资源。
 */
export async function createHW1Scene(signal: AbortSignal): Promise<HW1SceneBuildResult> {
  signal.throwIfAborted()
  const models = await loadHW1Assets(signal)
  signal.throwIfAborted()
  const scene = new Scene()
  scene.name = 'HW1 / Mary + Floor / Hard Shadow'
  const passes: RenderPass[] = []

  /** retain 失败时资源尚未交给 Scene，工厂必须清理它。 */
  function retain<T extends Resource>(resource: T): T {
    try {
      return scene.retain(resource)
    } catch (error) {
      resource.tryDispose()
      throw error
    }
  }

  try {
    const shadow = retain(
      new DirectionalLightShadow({
        label: 'HW1/sun/shadow',
        mapSize: 2048,
        halfExtent: 100,
        near: 0.1,
        far: 300,
        bias: 0.001
      })
    )
    const light = new DirectionalLight({
      colorLinear: [1, 1, 1],
      intensity: 3,
      targetWorld: [0, 0, 0],
      castShadow: true,
      shadow
    })
    light.name = 'HW1 sun'
    light.transform.setPosition([0, 80, 80])
    const lightBlock = retain(createHW1LightBlock())
    const receiver = retain(createHW1ReceiverShaderModule())
    const depthShader = retain(createPackedDepthShaderModule())

    // 白色 fallback 只负责让无 map_Kd 的材质保持相同 shader 布局；Kd 仍单独保存。
    const white = retain(
      new DataTexture2D({
        label: 'HW1/white',
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data',
        source: { width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) }
      })
    )
    const textures = new Map<HTMLImageElement, Texture2D>()
    for (const model of models) {
      for (const part of model.parts) {
        const geometry = retain(
          new Geometry({
            attributes: {
              [VertexAttributeSemantic.Position]: new VertexAttribute({
                itemSize: 3,
                data: part.positions
              }),
              [VertexAttributeSemantic.Normal]: new VertexAttribute({
                itemSize: 3,
                data: part.normals
              }),
              [VertexAttributeSemantic.UV]: new VertexAttribute({ itemSize: 2, data: part.uvs })
            }
          })
        )
        const surface = part.material
        let texture: Texture2D = white
        if (surface.diffuseImage !== null) {
          const existing = textures.get(surface.diffuseImage)
          texture =
            existing ??
            retain(
              new ImageTexture2D({
                label: 'HW1/' + model.name + '/' + part.name + '/diffuse',
                storage: { format: 'rgba', type: 'uint8' },
                // PNG 以编码值上传，receiver 负责手动 sRGB 解码；不要改为 srgb 导致二次解码。
                colorSpace: 'data',
                source: surface.diffuseImage,
                sampler: {
                  wrapS: 'clamp-to-edge',
                  wrapT: 'clamp-to-edge',
                  minFilter: 'linear',
                  magFilter: 'linear'
                },
                mipmapPolicy: 'none'
              })
            )
          textures.set(surface.diffuseImage, texture)
        }
        const material = retain(
          new Material({
            shaderModule: receiver,
            blocks: [lightBlock, shadow.block],
            parameters: {
              uDiffuseMap: { type: 'texture2D', value: texture },
              uDiffuseColor: { type: 'vec3', value: surface.diffuseColor },
              uSpecularColor: { type: 'vec3', value: surface.specularColor },
              uShininess: { type: 'float', value: surface.shininess },
              uAmbientRadiance: { type: 'vec3', value: [0.1, 0.1, 0.1] }
            }
          })
        )
        const mesh = new Mesh(geometry, material)
        mesh.name = model.name + '/' + part.name
        mesh.castShadow = true
        const scale = model.name === 'Mary' ? 10 : 2
        mesh.transform.setScale([scale, scale, scale])
        scene.add(mesh)
      }
    }

    // Mary 的实际高度约 34.07；保持旧位置和观察目标，但用 60° 视野留出头顶边距。
    // 45°（甚至旧 Engine 的 50°）会在这个姿态裁掉头顶，不能只用三角形 fixture 验收取景。
    const camera = new PerspectiveCamera({ fovY: Math.PI / 3, aspect: 1, near: 0.1, far: 1000 })
    camera.name = 'HW1 camera'
    camera.transform.setPosition([0, 30, 50])
    camera.transform.setRotation([-Math.atan2(20, 50), 0, 0])
    scene.add(light, camera)
    // 逐个登记：后续构造失败时，已经创建的 Pass 也进入回滚清单。
    passes.push(new ShadowMapPass({ depthShader }))
    passes.push(new HW1LightingPass(light.uuid, lightBlock))
    passes.push(new ForwardPass())
    signal.throwIfAborted()
    return Object.freeze({
      scene,
      camera,
      passes: Object.freeze(passes),
      light,
      shadow,
      lightBlock
    })
  } catch (error) {
    const failures: unknown[] = [error]
    for (const pass of passes) {
      try {
        pass.dispose()
      } catch (cause) {
        failures.push(cause)
      }
    }
    try {
      scene.dispose()
    } catch (cause) {
      failures.push(cause)
    }
    if (failures.length > 1)
      throw new AggregateError(failures, 'HW1 build and cleanup failed', { cause: error })
    throw error
  }
}
