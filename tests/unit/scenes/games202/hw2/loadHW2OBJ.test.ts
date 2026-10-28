import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { fetchTextWithTimeout } from '@/network/fetchText'
import { loadHW2OBJ } from '@/scenes/games202/hw2/internal/loadHW2OBJ'

/** 只替换网络；OBJ 的解析和顶点展开仍使用真实 OBJLoader。 */
vi.mock('@/network/fetchText', () => ({
  fetchTextWithTimeout: vi.fn()
}))

const fetchText = vi.mocked(fetchTextWithTimeout)

/**
 * 四个位置、两个三角形、两个材质区间，但只有一个 Mesh。
 *
 * mtllib 指向不存在的文件：
 * CPU 位置加载不应额外请求 MTL。
 */
const TWO_TRIANGLES = [
  'mtllib missing.mtl',
  'o sample',
  'v 0 0 0',
  'v 1 0 0',
  'v 0 1 0',
  'v 0 0 1',
  'usemtl first',
  'f 1 2 3',
  'usemtl second',
  'f 1 3 4'
].join('\n')

beforeEach(() => {
  fetchText.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadHW2OBJ CPU face-expanded positions', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-obj-face-order]
   *
   * 防止去重、重新排序或把 material groups 误判成多个独立 Geometry。
   * 期望数组由两条 f 指令手工展开，不调用被测解析器生成期望值。
   */
  it('保留面顺序，允许同一 Mesh 的多个材质区间，并且不加载 MTL', async () => {
    fetchText.mockResolvedValue(TWO_TRIANGLES)
    const signal = new AbortController().signal

    const positions = await loadHW2OBJ('/models/', 'sample', signal)

    expect(positions).toEqual(
      new Float32Array([
        0, 0, 0, 1, 0, 0, 0, 1, 0,

        0, 0, 0, 0, 1, 0, 0, 0, 1
      ])
    )

    expect(fetchText).toHaveBeenCalledExactlyOnceWith('/models/sample.obj', {
      signal
    })
  })

  /** 入口已经取消时不能发起无意义的请求。 */
  it('预先取消时不访问网络，并保留取消原因', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(loadHW2OBJ('/models', 'sample', controller.signal)).rejects.toBe(
      controller.signal.reason
    )

    expect(fetchText).not.toHaveBeenCalled()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-loader-abort-boundary]
   *
   * 网络替身故意忽略取消、仍返回文本。
   * 防止只转交 signal，却在 await 后不复查。
   */
  it('收到文本时请求已经取消，不再解析 OBJ', async () => {
    const controller = new AbortController()
    const parse = vi.spyOn(OBJLoader.prototype, 'parse')

    fetchText.mockImplementation(async () => {
      controller.abort()
      return TWO_TRIANGLES
    })

    await expect(loadHW2OBJ('/models', 'sample', controller.signal)).rejects.toBe(
      controller.signal.reason
    )

    expect(parse).not.toHaveBeenCalled()
  })

  /**
   * 拒绝无法证明与逐面 transport 顺序相同的输入，
   * 不自动拼接或三角化。
   */
  it.each([
    {
      label: '空模型',
      text: ''
    },
    {
      label: '多个 Mesh',
      text: TWO_TRIANGLES + '\no second-object\nf 1 2 3'
    },
    {
      label: '四边形',
      text: 'v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4'
    },
    {
      label: '不足三个角的面',
      text: 'v 0 0 0\nv 1 0 0\nf 1 2'
    },
    {
      label: '非有限坐标',
      text: TWO_TRIANGLES.replace('v 1 0 0', 'v Infinity 0 0')
    },
    {
      label: '越界位置引用',
      text: TWO_TRIANGLES.replace('f 1 2 3', 'f 1 2 99')
    }
  ])('拒绝 $label', async ({ text }) => {
    fetchText.mockResolvedValue(text)

    await expect(
      loadHW2OBJ('/models', 'sample', new AbortController().signal)
    ).rejects.toBeInstanceOf(ResourceLoadError)
  })

  /** 网络错误已有具体含义，不能被误包装成 OBJ 语法错误。 */
  it('原样传播网络失败', async () => {
    const failure = new Error('network unavailable')
    fetchText.mockRejectedValue(failure)

    await expect(loadHW2OBJ('/models', 'sample', new AbortController().signal)).rejects.toBe(
      failure
    )
  })

  /** 第三方解析异常需要补上模型路径，同时保留原始 cause。 */
  it('包装解析异常并保留原始 cause', async () => {
    const cause = new Error('parser failed')
    fetchText.mockResolvedValue(TWO_TRIANGLES)

    vi.spyOn(OBJLoader.prototype, 'parse').mockImplementationOnce(() => {
      throw cause
    })

    await expect(
      loadHW2OBJ('/models', 'sample', new AbortController().signal)
    ).rejects.toMatchObject({
      code: 'RESOURCE_LOAD_FAILED',
      cause
    })
  })
})
