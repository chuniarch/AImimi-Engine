import { readFileSync } from 'node:fs'
import { BufferGeometry, Material } from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { ModelPaths } from '@/models/_config/modelPaths'
import { fetchTextWithTimeout } from '@/network/fetchText'
import { loadHW1Assets } from '@/scenes/games202/hw1/internal/loadHW1Assets'

/** 只替换外部网络和图片事件；分组、三角化、属性展开使用真实 OBJLoader。 */
vi.mock('@/network/fetchText', () => ({ fetchTextWithTimeout: vi.fn() }))
const fetchText = vi.mocked(fetchTextWithTimeout)
const originalPaths = { mary: ModelPaths.HW1_MARY, floor: ModelPaths.HW1_FLOOR }

class FakeImage {
  static instances: FakeImage[] = []
  src = ''
  crossOrigin: string | null = null
  complete = false
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    FakeImage.instances.push(this)
  }

  succeed(width = 2, height = 2): void {
    this.complete = true
    this.naturalWidth = width
    this.naturalHeight = height
    this.onload?.()
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = ''
  }
}

const MARY_OBJ = [
  'mtllib Marry.mtl',
  'o subject',
  'v 0 0 0',
  'v 1 0 0',
  'v 0 1 0',
  'v 0 0 1',
  'vt 0 0',
  'vt 1 0',
  'vt 0 1',
  'vn 0 0 1',
  'usemtl cloth',
  'f 1/1/1 2/2/1 3/3/1',
  'usemtl solid',
  'f 1 3 4',
  'usemtl cloth',
  'f 1/1/1 2/2/1 3/3/1'
].join('\n')
const MARY_MTL = [
  'newmtl cloth',
  'Kd 0.2 0.3 0.4',
  'Ks 0.1 0.2 0.3',
  'Ns 32',
  'map_Kd cloth.png',
  'newmtl solid',
  'Kd 0.8 0.7 0.6',
  'Ks 0 0 0',
  'Ns 9'
].join('\n')
const FLOOR_OBJ = [
  'mtllib floor.mtl',
  'o ground',
  'v 0 0 0',
  'v 1 0 0',
  'v 1 0 1',
  'v 0 0 1',
  'usemtl floor',
  'f 1 4 3 2'
].join('\n')
const FLOOR_MTL = 'newmtl floor\nKd 0.8 0.8 0.8\nKs 0.5 0.5 0.5\nNs 500'

/** 每个 URL 只能得到对应文件，避免错误文件名被宽泛 mock 掩盖。 */
function serve(maryOBJ = MARY_OBJ, maryMTL = MARY_MTL, floorMTL = FLOOR_MTL): void {
  fetchText.mockImplementation(async (url) => {
    const files: Record<string, string> = {
      [`${ModelPaths.HW1_MARY}Marry.obj`]: maryOBJ,
      [`${ModelPaths.HW1_MARY}Marry.mtl`]: maryMTL,
      [`${ModelPaths.HW1_FLOOR}floor.obj`]: FLOOR_OBJ,
      [`${ModelPaths.HW1_FLOOR}floor.mtl`]: floorMTL
    }
    if (!(url in files)) throw new Error(`Unexpected URL: ${url}`)
    return files[url]!
  })
}

beforeEach(() => {
  fetchText.mockReset()
  FakeImage.instances = []
  vi.stubGlobal('Image', FakeImage)
  vi.useFakeTimers()
  serve()
})

afterEach(() => {
  ModelPaths.HW1_MARY = originalPaths.mary
  ModelPaths.HW1_FLOOR = originalPaths.floor
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadHW1Assets', () => {
  /**
   * [DESIGN-WEIGHT:3][hw1-asset-material-groups]
   * 防止 material[0] 覆盖后续区间、相同材质合并后丢失顺序，或 Three 颜色转换改变 MTL 系数。
   */
  it('保留重复出现的材质组、线性系数和独立三角数组，并只加载一次共享图片', async () => {
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(Material.prototype, 'dispose')
    const controller = new AbortController()
    const promise = loadHW1Assets(controller.signal)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeImage.instances).toHaveLength(1)
    FakeImage.instances[0]!.succeed()
    const models = await promise

    expect(models.map((model) => model.name)).toEqual(['Mary', 'Floor'])
    const parts = models[0]!.parts
    expect(parts).toHaveLength(3)
    expect(new Set(parts.map((part) => part.name)).size).toBe(3)
    expect(parts[0]!.positions).toEqual(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    expect(parts[1]!.positions).toEqual(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 1]))
    expect(parts[0]!.normals).toEqual(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]))
    expect(parts[1]!.normals).toEqual(new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]))
    expect(parts[0]!.uvs).toEqual(new Float32Array([0, 0, 1, 0, 0, 1]))
    expect(parts[1]!.uvs).toEqual(new Float32Array(6))
    expect(parts[0]!.positions.buffer).not.toBe(parts[2]!.positions.buffer)
    expect(parts[0]!.material).toEqual({
      diffuseColor: [0.2, 0.3, 0.4],
      specularColor: [0.1, 0.2, 0.3],
      shininess: 32,
      diffuseImage: FakeImage.instances[0]
    })
    expect(parts[1]!.material).toEqual({
      diffuseColor: [0.8, 0.7, 0.6],
      specularColor: [0, 0, 0],
      shininess: 9,
      diffuseImage: null
    })
    expect(parts[2]!.material.diffuseImage).toBe(parts[0]!.material.diffuseImage)
    expect(models[1]!.parts[0]!.positions).toEqual(
      new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0])
    )
    expect(geometryDispose).toHaveBeenCalledTimes(2)
    expect(materialDispose).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
    controller.abort()
    expect(FakeImage.instances[0]!.src).toBe(`${ModelPaths.HW1_MARY}cloth.png`)
    expect(FakeImage.instances[0]!.onload).toBeNull()
    expect(FakeImage.instances[0]!.onerror).toBeNull()
  })

  it.each(['/site/assets/models/', 'file:///course/assets/models/'])(
    '保留配置的 URL 前缀 %s',
    async (base) => {
      ModelPaths.HW1_MARY = `${base}mary/`
      ModelPaths.HW1_FLOOR = `${base}floor/`
      serve()
      const promise = loadHW1Assets(new AbortController().signal)
      await vi.advanceTimersByTimeAsync(0)
      expect(FakeImage.instances[0]!.src).toBe(`${base}mary/cloth.png`)
      FakeImage.instances[0]!.succeed()
      await promise
      expect(fetchText.mock.calls.map(([url]) => url).sort()).toEqual(
        [
          `${base}mary/Marry.obj`,
          `${base}mary/Marry.mtl`,
          `${base}floor/floor.obj`,
          `${base}floor/floor.mtl`
        ].sort()
      )
    }
  )

  it('不同模型引用同一绝对图片时共享一次加载', async () => {
    serve(
      MARY_OBJ,
      MARY_MTL.replace('cloth.png', '/shared.png'),
      `${FLOOR_MTL}\nmap_Kd /shared.png`
    )
    fetchText.mockImplementation(async (url) => {
      if (url.endsWith('Marry.obj')) return MARY_OBJ
      if (url.endsWith('Marry.mtl')) return MARY_MTL.replace('cloth.png', '/shared.png')
      if (url.endsWith('floor.obj'))
        return FLOOR_OBJ.replace('usemtl floor', 'vt 0 0\nusemtl floor').replace(
          'f 1 4 3 2',
          'f 1/1 4/1 3/1 2/1'
        )
      return `${FLOOR_MTL}\nmap_Kd /shared.png`
    })
    const promise = loadHW1Assets(new AbortController().signal)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeImage.instances).toHaveLength(1)
    expect(FakeImage.instances[0]!.src).toBe('/shared.png')
    FakeImage.instances[0]!.succeed()
    const models = await promise
    expect(models[0]!.parts[0]!.material.diffuseImage).toBe(
      models[1]!.parts[0]!.material.diffuseImage
    )
  })

  it('真实仓库 Mary 的纯色部件与贴图部件均保留，Floor 四边形展开成两个三角形', async () => {
    fetchText.mockImplementation(async (url) =>
      readFileSync(
        new URL(
          `../../../../../public/assets/models/hw1/${url.includes('/mary/') ? 'mary' : 'floor'}/${url.split('/').at(-1)}`,
          import.meta.url
        ),
        'utf8'
      )
    )
    const promise = loadHW1Assets(new AbortController().signal)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeImage.instances).toHaveLength(1)
    FakeImage.instances[0]!.succeed()
    const models = await promise
    expect(models[0]!.parts).toHaveLength(2)
    expect(models[0]!.parts[0]!.material.diffuseColor).toEqual([0.270588, 0.552941, 0.87451])
    expect(models[0]!.parts[0]!.material.diffuseImage).toBeNull()
    expect(models[0]!.parts[1]!.material.shininess).toBe(900)
    expect(models[0]!.parts[1]!.material.diffuseImage).toBe(FakeImage.instances[0])
    expect(models[1]!.parts[0]!.positions).toHaveLength(18)
    expect(models[1]!.parts[0]!.normals).toEqual(
      new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
    )
  })

  it.each([
    ['空 OBJ', '', MARY_MTL],
    ['非有限位置', MARY_OBJ.replace('v 1 0 0', 'v Infinity 0 0'), MARY_MTL],
    ['越界索引', MARY_OBJ.replace('f 1/1/1', 'f 99/1/1'), MARY_MTL],
    ['缺失材质', MARY_OBJ.replace('usemtl cloth', 'usemtl unknown'), MARY_MTL],
    ['缺失贴图 UV', MARY_OBJ.replace('f 1/1/1', 'f 1//1'), MARY_MTL],
    ['一面混合法线', MARY_OBJ.replace('f 1/1/1', 'f 1/1'), MARY_MTL],
    ['线图元', `${MARY_OBJ}\nl 1 2`, MARY_MTL],
    ['非有限系数', MARY_OBJ, MARY_MTL.replace('Ns 32', 'Ns Infinity')],
    ['负高光指数', MARY_OBJ, MARY_MTL.replace('Ns 32', 'Ns -1')],
    ['不透明契约之外', MARY_OBJ, `${MARY_MTL}\nd 0.5`],
    ['发光材质', MARY_OBJ, `${MARY_MTL}\nKe 1 0 0`],
    ['纹理变换选项', MARY_OBJ, MARY_MTL.replace('cloth.png', '-s 2 2 1 cloth.png')],
    ['未支持贴图', MARY_OBJ, `${MARY_MTL}\nmap_Ks specular.png`],
    ['重复材质名', MARY_OBJ, `${MARY_MTL}\nnewmtl cloth`]
  ])('显式拒绝 %s', async (_label, obj, mtl) => {
    serve(obj, mtl)
    await expect(loadHW1Assets(new AbortController().signal)).rejects.toBeInstanceOf(
      ResourceLoadError
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it('Float32 溢出拒绝后仍释放解析期几何与材质', async () => {
    serve(MARY_OBJ.replace('v 1 0 0', 'v 1e100 0 0'))
    const dispose = vi.spyOn(BufferGeometry.prototype, 'dispose')
    await expect(loadHW1Assets(new AbortController().signal)).rejects.toBeInstanceOf(
      ResourceLoadError
    )
    expect(dispose).toHaveBeenCalled()
  })

  it('入口取消不启动 I/O', async () => {
    const controller = new AbortController()
    controller.abort(new Error('superseded'))
    await expect(loadHW1Assets(controller.signal)).rejects.toBe(controller.signal.reason)
    expect(fetchText).not.toHaveBeenCalled()
    expect(FakeImage.instances).toHaveLength(0)
  })

  it('文本依赖忽略取消并返回后，仍禁止解析和交付', async () => {
    const controller = new AbortController()
    const parse = vi.spyOn(OBJLoader.prototype, 'parse')
    fetchText.mockImplementation(async () => {
      controller.abort(new Error('superseded'))
      return MARY_OBJ
    })
    await expect(loadHW1Assets(controller.signal)).rejects.toBe(controller.signal.reason)
    expect(parse).not.toHaveBeenCalled()
  })

  it('一个文本失败取消同批请求并解除父取消监听', async () => {
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const failure = new Error('network unavailable')
    const signals: AbortSignal[] = []
    fetchText.mockImplementation(async (_url, options) => {
      signals.push(options!.signal!)
      throw failure
    })
    await expect(loadHW1Assets(controller.signal)).rejects.toBe(failure)
    expect(signals).toHaveLength(4)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    expect(controller.signal.aborted).toBe(false)
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  })

  it.each(['error', 'abort', 'timeout', 'empty-pixels'])(
    '图片 %s 清理全部待加载图片',
    async (mode) => {
      serve(MARY_OBJ.replace('f 1 3 4', 'f 1/1 3/2 4/3'), `${MARY_MTL}\nmap_Kd second.png`)
      const controller = new AbortController()
      const promise = loadHW1Assets(controller.signal)
      const rejected =
        mode === 'abort'
          ? expect(promise).rejects.toBe('superseded')
          : expect(promise).rejects.toBeInstanceOf(ResourceLoadError)
      await vi.advanceTimersByTimeAsync(0)
      expect(FakeImage.instances).toHaveLength(2)
      if (mode === 'error') FakeImage.instances[0]!.onerror?.()
      if (mode === 'abort') controller.abort('superseded')
      if (mode === 'timeout') await vi.advanceTimersByTimeAsync(6000)
      if (mode === 'empty-pixels') FakeImage.instances[0]!.succeed(0)
      await rejected
      expect(
        FakeImage.instances.every(
          (image) => image.src === '' && image.onload === null && image.onerror === null
        )
      ).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it('图片 load 与父取消同一轮发生时不交付过期数据', async () => {
    const controller = new AbortController()
    const promise = loadHW1Assets(controller.signal)
    const rejected = expect(promise).rejects.toBe('superseded')
    await vi.advanceTimersByTimeAsync(0)
    FakeImage.instances[0]!.succeed()
    controller.abort('superseded')
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })
})
