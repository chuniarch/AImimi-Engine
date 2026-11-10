import { resolveTextureSamplingSource } from '@/rendering/resources/textureSamplingSource'
import { mat4, vec3 } from 'gl-matrix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigValidationError } from '@/errors/EngineError/ConfigurationError/ConfigValidationError'
import { loadPRTSHTxt, type PRTData } from '@/loaders/loadPRTSHTxt'
import { fetchTextWithTimeout } from '@/network/fetchText'
import { Resource } from '@/rendering/core/Resource'
import { CubeTexture, type CubeFaces } from '@/rendering/resources/CubeTexture'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { createHW2Scene } from '@/scenes/games202/hw2/createHW2Scene'
import { HW2_CPU_PRESETS } from '@/scenes/games202/hw2/_config/hw2CPUSceneConfig'
import { loadHW2CubeImages } from '@/scenes/games202/hw2/internal/loadHW2CubeImages'
import { loadHW2OBJ } from '@/scenes/games202/hw2/internal/loadHW2OBJ'
import type { HW2ScenePreset } from '@/scenes/games202/hw2/types/HW2ScenePreset'

/** 只替代 I/O 边界；Scene、Geometry、Material、ShaderModule 等使用真实实现。 */
vi.mock('@/loaders/loadPRTSHTxt', () => ({ loadPRTSHTxt: vi.fn() }))
vi.mock('@/network/fetchText', () => ({ fetchTextWithTimeout: vi.fn() }))
vi.mock('@/scenes/games202/hw2/internal/loadHW2OBJ', () => ({ loadHW2OBJ: vi.fn() }))
vi.mock('@/scenes/games202/hw2/internal/loadHW2CubeImages', () => ({ loadHW2CubeImages: vi.fn() }))

/** 只在测试中控制外部加载的完成时机，不向生产类添加测试专用方法。 */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

/** 三个展开顶点；文件头可以不同，工厂只使用实际 transport 行数对齐。 */
function prtData(): PRTData {
  return {
    vertexCount: 99,
    transportSH: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      [10, 11, 12, 13, 14, 15, 16, 17, 18],
      [20, 21, 22, 23, 24, 25, 26, 27, 28]
    ],
    lightSH: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [11, 12, 13, 14, 15, 16, 17, 18, 19],
      [21, 22, 23, 24, 25, 26, 27, 28, 29]
    ]
  }
}

/** 路径是测试 I/O 标识，不触发真实网络访问。 */
function preset(): HW2ScenePreset {
  return {
    label: 'Indoor / Mary / Shadowed',
    env: {
      dir: '/prt/Indoor',
      cubeFaceUrls: ['/px.jpg', '/nx.jpg', '/py.jpg', '/ny.jpg', '/pz.jpg', '/nz.jpg'],
      cubeMapsize: 100
    },
    model: {
      path: '/models/mary',
      name: 'mary',
      transportType: 'shadowed',
      meshTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [10, 10, 10] }
    },
    sh: {
      attributeLayout: [
        { name: 'aTransportSH0', size: 3 },
        { name: 'aTransportSH1', size: 3 },
        { name: 'aTransportSH2', size: 3 }
      ],
      vertShaderPath: '/prt.vert',
      fragShaderPath: '/prt.frag'
    },
    backgroundShader: { vertShaderPath: '/background.vert', fragShaderPath: '/background.frag' }
  }
}

/** 图片 loader 的尺寸/取消行为由独立测试覆盖；这里只提供已加载图片引用。 */
function imageFaces(): CubeFaces<HTMLImageElement> {
  const image = () =>
    ({
      complete: true,
      naturalWidth: 2,
      naturalHeight: 2
    }) as HTMLImageElement
  return [image(), image(), image(), image(), image(), image()]
}

/** 从最终场景读取业务角色，而不是断言 private 字段的排列。 */
function sceneMeshes(scene: Scene): { prt: Mesh; background: Mesh } {
  const meshes = scene.children.filter((node): node is Mesh => node instanceof Mesh)
  const prt = meshes.find((mesh) => mesh.material.queue === 'opaque')
  const background = meshes.find((mesh) => mesh.material.queue === 'background')
  if (!prt || !background) throw new Error('Expected PRT and background meshes')
  return { prt, background }
}

/** 必须在 scene.dispose() 前收集借用引用；释放后 getter 应拒绝访问。 */
function resources(scene: Scene): Resource[] {
  const { prt, background } = sceneMeshes(scene)
  const texture = background.material.getParameter('uSkyboxMap')
  if (texture?.type !== 'cubeTexture') throw new Error('Expected cubeTexture parameter')
  return [
    prt.geometry,
    prt.material,
    prt.material.shaderModule,
    background.geometry,
    background.material,
    background.material.shaderModule,
    resolveTextureSamplingSource(texture.value, 'cube', 'uSkyboxMap').texture
  ]
}

const completedScenes: Scene[] = []

beforeEach(() => {
  vi.mocked(loadHW2OBJ).mockResolvedValue(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
  vi.mocked(loadPRTSHTxt).mockResolvedValue(prtData())
  vi.mocked(loadHW2CubeImages).mockResolvedValue(imageFaces())
  vi.mocked(fetchTextWithTimeout).mockImplementation(async (url) =>
    url.endsWith('.vert')
      ? 'void main() { gl_Position = vec4(0.0); }'
      : 'precision mediump float; void main() { gl_FragColor = vec4(1.0); }'
  )
})

afterEach(() => {
  for (const scene of completedScenes) scene.dispose()
  completedScenes.length = 0
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('createHW2Scene', () => {
  /** 所有可选配置都必须走新工厂，不能只验证一个默认配置。 */
  it('十二个 Mary 配置都可以构建，并且没有混入未确认的 Bunny', async () => {
    expect(new Set(HW2_CPU_PRESETS.map((entry) => entry.label)).size).toBe(12)
    for (const input of HW2_CPU_PRESETS) {
      expect(input.model.name).toBe('mary')
      const { scene } = await createHW2Scene(input, new AbortController().signal)
      completedScenes.push(scene)
      expect(sceneMeshes(scene).prt.transform.scale).toEqual([10, 10, 10])
      expect(Object.isFrozen(input.model.meshTransform.scale)).toBe(true)
    }
  })

  /** 防止遗漏 light 通道、内建矩阵映射、模型缩放或背景状态。 */
  it('把 CPU 数据装配为 PRT mesh、背景 mesh 和属于该 Scene 的 camera', async () => {
    const result = await createHW2Scene(preset(), new AbortController().signal)
    completedScenes.push(result.scene)
    const { prt, background } = sceneMeshes(result.scene)

    expect(result.camera.parent).toBe(result.scene)
    expect(prt.transform.scale).toEqual([10, 10, 10])
    expect(prt.geometry.vertexCount).toBe(3)
    expect(prt.geometry.getAttribute('aTransportSH1')!.copyData()).toEqual(
      new Float32Array([3, 4, 5, 13, 14, 15, 23, 24, 25])
    )
    expect(prt.material.getParameter('uLightSH_R')).toEqual({
      type: 'mat3',
      value: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    })
    expect(prt.material.getParameter('uLightSH_G')).toEqual({
      type: 'mat3',
      value: [11, 12, 13, 14, 15, 16, 17, 18, 19]
    })
    expect(prt.material.getParameter('uLightSH_B')).toEqual({
      type: 'mat3',
      value: [21, 22, 23, 24, 25, 26, 27, 28, 29]
    })
    expect(prt.material.shaderModule.builtInUniforms).toEqual({
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix'
    })
    expect(background.transform.scale).toEqual([100, 100, 100])
    expect(background.material.state).toEqual({
      depthTest: true,
      depthWrite: false,
      depthFunction: 'less-equal',
      cullMode: 'front',
      dither: true
    })
    const texture = background.material.getParameter('uSkyboxMap')
    expect(texture?.type === 'cubeTexture' && texture.value instanceof CubeTexture).toBe(true)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-factory-resource-ownership]
   *
   * 只检查 Mesh 的 Geometry/Material 不够：漏 retain shader 或 CubeTexture
   * 也会泄漏。这里沿真实依赖关系检查全部七个 Resource。
   */
  it('Scene 分别持有全部依赖，并在结束时全部交还', async () => {
    const { scene } = await createHW2Scene(preset(), new AbortController().signal)
    completedScenes.push(scene)
    const owned = resources(scene)

    expect(new Set(owned).size).toBe(7)
    expect(owned.every((resource) => resource.sceneReferenceCount === 1)).toBe(true)

    scene.dispose()

    expect(owned.every((resource) => resource.disposed && resource.sceneReferenceCount === 0)).toBe(
      true
    )
  })

  /** 不能只把相机搬到 [0,20,50]，还必须让局部 -Z 指向 [0,10,0]。 */
  it('相机朝向正确，而不是只设置 position', async () => {
    const { scene, camera } = await createHW2Scene(preset(), new AbortController().signal)
    completedScenes.push(scene)
    const world = mat4.create()
    camera.copyWorldMatrixTo(world)
    const view = mat4.invert(mat4.create(), world)!
    const target = vec3.transformMat4(vec3.create(), [0, 10, 0], view)

    expect(camera.transform.position).toEqual([0, 20, 50])
    expect(target[0]).toBeCloseTo(0)
    expect(target[1]).toBeCloseTo(0)
    expect(target[2]).toBeLessThan(0)
  })

  /** 背景 cullMode=front 要求 cube 三角形朝外；朝内会把可见面全部剔除。 */
  it('背景 cube 的每个三角形都朝外', async () => {
    const { scene } = await createHW2Scene(preset(), new AbortController().signal)
    completedScenes.push(scene)
    const geometry = sceneMeshes(scene).background.geometry
    const positions = geometry.getAttribute('position')!.copyData()
    const indices = geometry.copyIndices()!
    expect(indices).toHaveLength(36)

    for (let offset = 0; offset < indices.length; offset += 3) {
      const point = (index: number) =>
        vec3.fromValues(positions[index * 3]!, positions[index * 3 + 1]!, positions[index * 3 + 2]!)
      const a = point(indices[offset]!)
      const b = point(indices[offset + 1]!)
      const c = point(indices[offset + 2]!)
      const normal = vec3.cross(
        vec3.create(),
        vec3.sub(vec3.create(), b, a),
        vec3.sub(vec3.create(), c, a)
      )
      expect(vec3.dot(normal, a)).toBeGreaterThan(0)
    }
  })

  /** 加载尚未结束时修改原始数组，不得改变本次构建已经捕获的 preset。 */
  it('第一个 await 前复制 preset，避免输入漂移', async () => {
    const scale: [number, number, number] = [10, 10, 10]
    const input = preset()
    const pending = deferred<PRTData>()
    vi.mocked(loadPRTSHTxt).mockReturnValueOnce(pending.promise)

    const promise = createHW2Scene(
      {
        ...input,
        model: {
          ...input.model,
          meshTransform: { ...input.model.meshTransform, scale }
        }
      },
      new AbortController().signal
    )

    scale[0] = 999
    pending.resolve(prtData())
    const { scene } = await promise
    completedScenes.push(scene)
    expect(sceneMeshes(scene).prt.transform.scale).toEqual([10, 10, 10])
  })

  /** 预先取消不能启动任何网络请求。 */
  it('预先取消时不启动加载', async () => {
    const controller = new AbortController()
    const reason = new Error('cancelled')
    controller.abort(reason)

    await expect(createHW2Scene(preset(), controller.signal)).rejects.toBe(reason)
    expect(loadHW2OBJ).not.toHaveBeenCalled()
    expect(loadPRTSHTxt).not.toHaveBeenCalled()
    expect(fetchTextWithTimeout).not.toHaveBeenCalled()
    expect(loadHW2CubeImages).not.toHaveBeenCalled()
  })

  /** 即使依赖忽略 AbortSignal，await 后的检查也不能省略。 */
  it('取消后加载器仍然返回时，不创建 Resource', async () => {
    const pending = deferred<PRTData>()
    vi.mocked(loadPRTSHTxt).mockReturnValueOnce(pending.promise)
    const retain = vi.spyOn(Scene.prototype, 'retain')
    const controller = new AbortController()
    const reason = new Error('superseded')
    const promise = createHW2Scene(preset(), controller.signal)
    const rejected = expect(promise).rejects.toBe(reason)

    controller.abort(reason)
    pending.resolve(prtData())
    await rejected
    expect(retain).not.toHaveBeenCalled()
  })

  /** 一个 I/O 失败必须取消兄弟请求，但不能把父 signal 改成 aborted。 */
  it('加载失败时保留原错误，并取消本次其他加载', async () => {
    const failure = new Error('PRT download failed')
    vi.mocked(loadPRTSHTxt).mockRejectedValueOnce(failure)
    const controller = new AbortController()

    await expect(createHW2Scene(preset(), controller.signal)).rejects.toBe(failure)

    const childSignal = vi.mocked(loadHW2OBJ).mock.calls[0]![2]
    expect(childSignal).not.toBe(controller.signal)
    expect(childSignal.aborted).toBe(true)
    expect(controller.signal.aborted).toBe(false)
  })

  /** 合法数值不等于合法数据集：光照必须恰好三个通道、每通道九个系数。 */
  it('拒绝不完整的 light SH，并释放已登记资源', async () => {
    const data = prtData()
    data.lightSH[1]!.pop()
    vi.mocked(loadPRTSHTxt).mockResolvedValueOnce(data)
    const retain = vi.spyOn(Scene.prototype, 'retain')

    await expect(createHW2Scene(preset(), new AbortController().signal)).rejects.toThrow()

    for (const [resource] of retain.mock.calls) expect(resource.disposed).toBe(true)
  })

  /** 后期构造失败也必须清理前面已创建的 geometry、shader、material、texture。 */
  it('背景 shader 构造失败时释放半成品 Scene', async () => {
    vi.mocked(fetchTextWithTimeout).mockImplementation(async (url) =>
      url === '/background.frag' ? '' : 'void main() {}'
    )
    const retain = vi.spyOn(Scene.prototype, 'retain')

    await expect(createHW2Scene(preset(), new AbortController().signal)).rejects.toThrow()

    expect(retain.mock.calls.length).toBeGreaterThan(0)
    for (const [resource] of retain.mock.calls) expect(resource.disposed).toBe(true)
  })

  /** 在 Resource 已创建、尚未登记的边界注入失败，验证创建者负责直接清理。 */
  it('retain 失败时清理尚未归 Scene 管理的 Resource', async () => {
    const failure = new Error('retain failed')
    let candidate: Resource | undefined
    vi.spyOn(Scene.prototype, 'retain').mockImplementationOnce((resource) => {
      candidate = resource
      throw failure
    })

    await expect(createHW2Scene(preset(), new AbortController().signal)).rejects.toBe(failure)
    expect(candidate?.disposed).toBe(true)
    expect(candidate?.sceneReferenceCount).toBe(0)
  })

  /** preset 验证在 I/O 之前，不发送明知不合法的构建请求。 */
  it('拒绝非法 TRS 而不启动加载', async () => {
    const input = preset()
    await expect(
      createHW2Scene(
        {
          ...input,
          model: {
            ...input.model,
            meshTransform: { ...input.model.meshTransform, scale: [Infinity, 10, 10] }
          }
        },
        new AbortController().signal
      )
    ).rejects.toBeInstanceOf(ConfigValidationError)

    expect(loadHW2OBJ).not.toHaveBeenCalled()
  })
})
