import { ConfigValidationError } from '@/errors/EngineError/ConfigurationError/ConfigValidationError'
import { SHLayoutError } from '@/errors/EngineError/ConfigurationError/SHLayoutError'
import { loadPRTSHTxt } from '@/loaders/loadPRTSHTxt'
import { fetchTextWithTimeout } from '@/network/fetchText'
import { Resource } from '@/rendering/core/Resource'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { createHW2PRTGeometry } from './internal/createHW2PRTGeometry'
import { loadHW2CubeImages } from './internal/loadHW2CubeImages'
import { loadHW2OBJ } from './internal/loadHW2OBJ'
import type { HW2ScenePreset, HW2ShaderPaths } from './types/HW2ScenePreset'

/** 成功交付的 Scene 拥有全部 Resource，Camera 已经挂入它的节点树。 */
export interface HW2SceneBuildResult {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
}

/** 在字段尚未验证时，也使用稳定的配置诊断路径。 */
function invalid(field: string, reason: string): never {
  throw new ConfigValidationError('HW2ScenePreset', [field + ': ' + reason])
}

/** 只证明“可以读取字段”，不声称字段已经满足 HW2ScenePreset。 */
function record(value: unknown, field: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(field, 'must be a non-array object')
  }
  return value as Readonly<Record<string, unknown>>
}

/** 不通过 trim 改写 URL 或名字；trim 仅用于拒绝空白文本。 */
function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalid(field, 'must be non-empty text')
  }
  return value
}

/** TRS 最终进入 Float32；有限 binary64 仍可能在转换时溢出。 */
function finite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(Math.fround(value))) {
    return invalid(field, 'must be representable as finite Float32')
  }
  return value
}

/** 验证并复制三个分量；不保留调用者的数组引用。 */
function tuple(value: unknown, field: string): Vec3Tuple {
  if (!Array.isArray(value) || value.length !== 3) {
    return invalid(field, 'must contain exactly 3 numbers')
  }
  const values: readonly unknown[] = value
  return Object.freeze([
    finite(values[0], field + '[0]'),
    finite(values[1], field + '[1]'),
    finite(values[2], field + '[2]')
  ])
}

/** URL 对复制后冻结；真正源码由随后并发加载获得。 */
function shaderPaths(value: unknown, field: string): HW2ShaderPaths {
  const input = record(value, field)
  return Object.freeze({
    vertShaderPath: text(input.vertShaderPath, field + '.vertShaderPath'),
    fragShaderPath: text(input.fragShaderPath, field + '.fragShaderPath')
  })
}

/**
 * 建立一次构建专属的 preset 快照。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-preset-before-await]
 *
 * 网络等待期间，调用者可能修改原数组或配置。URL、TRS、layout 都必须在
 * 第一个 await 前复制，此后不能再从原 preset 读取。
 * layout 的系数总数、重名及 Geometry 对齐规则仍由 createHW2PRTGeometry 验证。
 */
function snapshotPreset(preset: HW2ScenePreset): HW2ScenePreset {
  const input = record(preset, 'preset')
  const env = record(input.env, 'env')
  const model = record(input.model, 'model')
  const transform = record(model.meshTransform, 'model.meshTransform')
  const sh = record(input.sh, 'sh')
  const urls = env.cubeFaceUrls
  const layout = sh.attributeLayout

  if (!Array.isArray(urls) || urls.length !== 6) {
    return invalid('env.cubeFaceUrls', 'must contain exactly 6 URLs')
  }
  if (!Array.isArray(layout) || layout.length === 0) {
    return invalid('sh.attributeLayout', 'must be non-empty')
  }

  const cubeMapsize = finite(env.cubeMapsize, 'env.cubeMapsize')
  if (Math.fround(cubeMapsize) <= 0) {
    return invalid('env.cubeMapsize', 'must remain positive after Float32 conversion')
  }

  const requestedTransportType = model.transportType
  const transportType = (['shadowed', 'unshadowed', 'interreflection'] as const).find(
    (value) => value === requestedTransportType
  )
  if (transportType === undefined) return invalid('model.transportType', 'unsupported value')

  const copiedLayout = Array.from(layout, (value: unknown, index) => {
    const group = record(value, 'sh.attributeLayout[' + index + ']')
    return Object.freeze({
      name: text(group.name, 'attribute.name'),
      size: finite(group.size, 'attribute.size')
    })
  })

  return Object.freeze({
    label: text(input.label, 'label'),
    env: Object.freeze({
      dir: text(env.dir, 'env.dir'),
      cubeMapsize,
      cubeFaceUrls: Object.freeze([
        text(urls[0], 'face[0]'),
        text(urls[1], 'face[1]'),
        text(urls[2], 'face[2]'),
        text(urls[3], 'face[3]'),
        text(urls[4], 'face[4]'),
        text(urls[5], 'face[5]')
      ] as const)
    }),
    model: Object.freeze({
      path: text(model.path, 'model.path'),
      name: text(model.name, 'model.name'),
      transportType,
      meshTransform: Object.freeze({
        position: tuple(transform.position, 'model.position'),
        rotation: tuple(transform.rotation, 'model.rotation'),
        scale: tuple(transform.scale, 'model.scale')
      })
    }),
    sh: Object.freeze({
      ...shaderPaths(sh, 'sh'),
      attributeLayout: Object.freeze(copiedLayout)
    }),
    backgroundShader: shaderPaths(input.backgroundShader, 'backgroundShader')
  })
}

/** 三个通道依次对应 R/G/B；每通道九个系数按原顺序进入 mat3。 */
function lightChannels(lightSH: readonly (readonly number[])[]): readonly number[][] {
  if (!Array.isArray(lightSH) || lightSH.length !== 3) {
    throw new SHLayoutError('data_mismatch', 'HW2 requires 3 light SH channels')
  }
  return Array.from(lightSH, (row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      throw new SHLayoutError('data_mismatch', 'each light SH channel must contain 9 coefficients')
    }
    const values: readonly unknown[] = row
    const copy: number[] = []
    for (const value of values) {
      if (typeof value !== 'number' || !Number.isFinite(Math.fround(value))) {
        throw new SHLayoutError('data_mismatch', 'light SH must contain finite Float32 values')
      }
      copy.push(value)
    }
    return copy
  })
}

/**
 * 八个角点、十二个朝外三角形组成的单位 cube。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-background-cube-winding]
 *
 * 每个轴范围是 [-1,1]，Mesh.scale 再将它扩展为 preset 的半尺寸。
 * 朝外绕序配合 cullMode=front，让 cube 内部的相机看到背面。
 * 不调用旧 CubeGeometry：旧实现包含 WebGL 枚举值。
 */
function createBackgroundGeometry(): Geometry {
  return new Geometry({
    attributes: {
      [VertexAttributeSemantic.Position]: new VertexAttribute({
        itemSize: 3,
        // prettier-ignore
        data: new Float32Array([
          -1, -1, -1, // 0
           1, -1, -1, // 1
           1,  1, -1, // 2
          -1,  1, -1, // 3
          -1, -1,  1, // 4
           1, -1,  1, // 5
           1,  1,  1, // 6
          -1,  1,  1  // 7
        ])
      })
    },
    // prettier-ignore
    indices: new Uint8Array([
      0, 2, 1, 0, 3, 2, // -Z
      4, 5, 6, 4, 6, 7, // +Z
      1, 2, 6, 1, 6, 5, // +X
      0, 4, 7, 0, 7, 3, // -X
      3, 7, 6, 3, 6, 2, // +Y
      0, 1, 5, 0, 5, 4  // -Y
    ])
  })
}

/*
 * 后续释放容错策略见 src/rendering/TODOList.md 的
 * “Resource dispose-listener failure semantics”。本工厂不单独决定
 * listener 抛错时继续清理或聚合异常的策略。
 */

/**
 * 构建新的 HW2 CPU 场景，不修改当前正在显示的场景。
 *
 * @param preset - 纯数值配置；入口立即复制。
 * @param signal - 取消当前构建；成功返回后的 Scene 生命周期交给调用者。
 * @returns 完整 Scene 与属于它的 Camera。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-factory-resource-ownership]
 *
 * 七个 Resource 都分别 retain：两个 Geometry、两个 ShaderModule、
 * 两个 Material、一个 CubeTexture。Material 仅借用依赖，不能代替 Scene retain。
 *
 * 所有 I/O 完成后才开始同步资源装配，装配结束前不向外发布 Scene。
 * 失败时取消兄弟请求并 dispose 半成品；未成功 retain 的资源由创建者清理。
 *
 * 清理沿用 Scene/Resource 的现有行为，释放过程抛错会中断后续清理。
 * 此私有半成品尚未交给 Backend，正常情况下没有 GPU dispose listener。
 */
export async function createHW2Scene(
  preset: HW2ScenePreset,
  signal: AbortSignal
): Promise<HW2SceneBuildResult> {
  signal.throwIfAborted()
  const settings = snapshotPreset(preset)
  signal.throwIfAborted()
  const scene = new Scene()
  scene.name = settings.label

  const controller = new AbortController()
  const forwardAbort = (): void => controller.abort(signal.reason)
  signal.addEventListener('abort', forwardAbort, { once: true })

  /** retain 的交接失败时，尚未登记的 Resource 仍由本工厂负责。 */
  function retain<T extends Resource>(resource: T): T {
    try {
      return scene.retain(resource)
    } catch (error) {
      resource.tryDispose()
      throw error
    }
  }

  try {
    const childSignal = controller.signal
    const [positions, prt, prtVertex, prtFragment, backgroundVertex, backgroundFragment, faces] =
      await Promise.all([
        loadHW2OBJ(settings.model.path, settings.model.name, childSignal),
        loadPRTSHTxt(
          settings.env.dir,
          settings.model.name,
          settings.model.transportType,
          childSignal
        ),
        fetchTextWithTimeout(settings.sh.vertShaderPath, { signal: childSignal }),
        fetchTextWithTimeout(settings.sh.fragShaderPath, { signal: childSignal }),
        fetchTextWithTimeout(settings.backgroundShader.vertShaderPath, { signal: childSignal }),
        fetchTextWithTimeout(settings.backgroundShader.fragShaderPath, { signal: childSignal }),
        loadHW2CubeImages(settings.env.cubeFaceUrls, childSignal)
      ])

    signal.throwIfAborted()

    const geometry = retain(
      createHW2PRTGeometry(positions, prt.transportSH, settings.sh.attributeLayout)
    )
    const light = lightChannels(prt.lightSH)
    const builtInUniforms = {
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix'
    } as const

    const shader = retain(
      new ShaderModule({
        name: settings.label + '/PRT',
        language: 'glsl-es-100',
        vertexSource: prtVertex,
        fragmentSource: prtFragment,
        builtInUniforms
      })
    )
    const material = retain(
      new Material({
        shaderModule: shader,
        parameters: {
          uLightSH_R: { type: 'mat3', value: light[0]! },
          uLightSH_G: { type: 'mat3', value: light[1]! },
          uLightSH_B: { type: 'mat3', value: light[2]! }
        }
      })
    )
    const mesh = new Mesh(geometry, material)
    mesh.name = settings.model.name
    mesh.transform.setPosition(settings.model.meshTransform.position)
    mesh.transform.setRotation(settings.model.meshTransform.rotation)
    mesh.transform.setScale(settings.model.meshTransform.scale)

    const texture = retain(
      new CubeTexture({
        label: settings.label + '/background',
        source: { kind: 'images', faces },
        storage: { format: 'rgba', type: 'uint8' },
        /*
         * TODO(hw2-background-color-pipeline): 统一线性采样和最终输出变换时，
         * 同步修改 colorSpace、背景 fragment shader 与图像回归，不能单独改标签。
         */

        /**
         * 当前 HW2 背景 shader 直接显示 JPEG 编码值，保持旧作业显示链路。
         * data 表示原始数值采样，不触发 sRGB 自动解码；这不是线性 IBL 环境纹理。
         */
        colorSpace: 'data',
        sampler: {
          wrapS: 'clamp-to-edge',
          wrapT: 'clamp-to-edge',
          minFilter: 'linear',
          magFilter: 'linear'
        },
        mipmapPolicy: 'none'
      })
    )
    const backgroundGeometry = retain(createBackgroundGeometry())
    const backgroundShader = retain(
      new ShaderModule({
        name: settings.label + '/background',
        language: 'glsl-es-100',
        vertexSource: backgroundVertex,
        fragmentSource: backgroundFragment,
        builtInUniforms
      })
    )
    const backgroundMaterial = retain(
      new Material({
        shaderModule: backgroundShader,
        queue: 'background',
        state: {
          depthTest: true,
          depthWrite: false,
          depthFunction: 'less-equal',
          cullMode: 'front'
        },
        parameters: { uSkyboxMap: { type: 'cubeTexture', value: texture } }
      })
    )
    const background = new Mesh(backgroundGeometry, backgroundMaterial)
    background.name = 'HW2 background'
    const size = settings.env.cubeMapsize
    background.transform.setScale([size, size, size])

    // 工厂不知道 canvas 尺寸；aspect=1 为初始值，Task 21 安装时必须更新实际宽高比。
    const camera = new PerspectiveCamera({
      fovY: Math.PI / 4,
      aspect: 1,
      near: 0.1,
      far: 1000
    })
    camera.name = 'HW2 camera'
    camera.transform.setPosition([0, 20, 50])
    // 相机局部 -Z 指向 target-position = [0,-10,-50]，所以绕 X 向下转。
    camera.transform.setRotation([-Math.atan2(10, 50), 0, 0])

    scene.add(mesh, background, camera)
    signal.throwIfAborted()
    return Object.freeze({ scene, camera })
  } catch (error) {
    controller.abort(error)
    scene.dispose()
    // 底层网络封装可能改写 abort 错误；主动取消仍保持调用者原始 reason。
    signal.throwIfAborted()
    throw error
  } finally {
    signal.removeEventListener('abort', forwardAbort)
  }
}
