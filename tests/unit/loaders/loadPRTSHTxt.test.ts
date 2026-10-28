import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { loadPRTSHTxt } from '@/loaders/loadPRTSHTxt'
import { fetchTextWithTimeout } from '@/network/fetchText'

/** 网络以外的文本拆分、数值验证、RGB 转置均运行真实实现。 */
vi.mock('@/network/fetchText', () => ({
  fetchTextWithTimeout: vi.fn()
}))

const fetchText = vi.mocked(fetchTextWithTimeout)

/**
 * 每行一个 SH 系数，每列一个 RGB 通道。
 * 测试中的期望值由列手工读出。
 */
const LIGHT = [
  '1 11 21',
  '2 12 22',
  '3 13 23',
  '4 14 24',
  '5 15 25',
  '6 16 26',
  '7 17 27',
  '8 18 28',
  '9 19 29'
].join('\n')

/** 四个导出器内部顶点形成两个面，因此有六行逐面顶点系数。 */
const TRANSPORT = [
  '4',
  '0 1 2 3 4 5 6 7 8',
  '10 11 12 13 14 15 16 17 18',
  '20 21 22 23 24 25 26 27 28',
  '30 31 32 33 34 35 36 37 38',
  '40 41 42 43 44 45 46 47 48',
  '50 51 52 53 54 55 56 57 58'
].join('\n')

/**
 * 根据完整 URL 返回不同文本。
 * 走错路径会失败，不让两个请求共用随意的响应。
 */
function serve(light = LIGHT, transport = TRANSPORT): void {
  fetchText.mockImplementation(async (url) => {
    if (url === '/prt/light.txt') return light
    if (url === '/prt/transport_sample_shadowed.txt') return transport

    throw new Error('Unexpected request: ' + url)
  })
}

beforeEach(() => {
  fetchText.mockReset()
})

describe('loadPRTSHTxt', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][prt-export-header-vs-face-count]
   *
   * 防止把文件头的内部顶点数误当成数据行数，
   * 或者截断为 header 行。
   *
   * 这和真实 Mary 的 7905 / 30522 是同一种结构，
   * 而不是容忍损坏文件。
   */
  it('保留文件头，但按实际行解析全部逐面系数并转置 RGB', async () => {
    serve()
    const signal = new AbortController().signal

    const result = await loadPRTSHTxt('/prt/', 'sample', 'shadowed', signal)

    expect(result.vertexCount).toBe(4)
    expect(result.transportSH).toHaveLength(6)

    expect(result.transportSH[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])

    expect(result.transportSH[5]).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58])

    expect(result.lightSH).toEqual([
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [11, 12, 13, 14, 15, 16, 17, 18, 19],
      [21, 22, 23, 24, 25, 26, 27, 28, 29]
    ])

    expect(fetchText).toHaveBeenCalledTimes(2)

    expect(fetchText).toHaveBeenCalledWith('/prt/light.txt', {
      signal
    })

    expect(fetchText).toHaveBeenCalledWith('/prt/transport_sample_shadowed.txt', { signal })
  })

  /** 新增可选 signal 不要求现有三参数调用立即迁移。 */
  it('保留三参数调用兼容性', async () => {
    serve()

    const result = await loadPRTSHTxt('/prt', 'sample', 'shadowed')

    expect(result.transportSH).toHaveLength(6)
  })

  /**
   * 文件允许 Windows 换行和尾部空白，
   * 但不能把数据内部的空行补成零。
   */
  it('接受 CRLF 与尾部空白', async () => {
    serve(LIGHT.replaceAll('\n', '\r\n') + '\r\n', TRANSPORT.replaceAll('\n', '\r\n') + '\r\n')

    const result = await loadPRTSHTxt('/prt', 'sample', 'shadowed')

    expect(result.transportSH).toHaveLength(6)
  })

  /**
   * Number + safe integer 验证不能退化成 parseInt，
   * 后者会错误接受 4oops。
   */
  it.each(['0', '-1', '1.5', '4oops', '9007199254740992'])('拒绝非法文件头 %s', async (header) => {
    serve(LIGHT, TRANSPORT.replace(/^4/, header))

    await expect(loadPRTSHTxt('/prt', 'sample', 'shadowed')).rejects.toBeInstanceOf(
      ResourceLoadError
    )
  })

  /**
   * 每个用例各自破坏一个输入不变量。
   * 不能用默认零或 NaN 悄悄继续。
   */
  it.each([
    {
      label: '空光照',
      light: '',
      transport: TRANSPORT
    },
    {
      label: '光照列数错误',
      light: LIGHT.replace('1 11 21', '1 11'),
      transport: TRANSPORT
    },
    {
      label: '光照非有限值',
      light: LIGHT.replace('1 11 21', 'NaN 11 21'),
      transport: TRANSPORT
    },
    {
      label: '空 transport',
      light: LIGHT,
      transport: ''
    },
    {
      label: '没有系数行',
      light: LIGHT,
      transport: '4'
    },
    {
      label: 'transport 行宽错误',
      light: LIGHT,
      transport: TRANSPORT.replace('0 1 2 3 4 5 6 7 8', '0 1')
    },
    {
      label: 'transport 非有限值',
      light: LIGHT,
      transport: TRANSPORT.replace('0 1 2 3 4 5 6 7 8', 'Infinity 1 2 3 4 5 6 7 8')
    },
    {
      label: '内部空行',
      light: LIGHT,
      transport: TRANSPORT.replace('4\n', '4\n\n')
    },
    {
      label: '不完整三角形',
      light: LIGHT,
      transport: TRANSPORT.split('\n').slice(0, -1).join('\n')
    }
  ])('拒绝 $label', async ({ light, transport }) => {
    serve(light, transport)

    await expect(loadPRTSHTxt('/prt', 'sample', 'shadowed')).rejects.toBeInstanceOf(
      ResourceLoadError
    )
  })

  /** 入口取消必须在任何网络调用前生效。 */
  it('预先取消时不发出请求', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(loadPRTSHTxt('/prt', 'sample', 'shadowed', controller.signal)).rejects.toBe(
      controller.signal.reason
    )

    expect(fetchText).not.toHaveBeenCalled()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-loader-abort-boundary]
   *
   * 即使依赖忽略取消并成功返回，
   * 加载器也不能交付已过期的数据。
   */
  it('两份文本到达后再次检查取消状态', async () => {
    const controller = new AbortController()

    fetchText.mockImplementation(async (url) => {
      if (url.endsWith('/light.txt')) return LIGHT

      controller.abort()
      return TRANSPORT
    })

    await expect(loadPRTSHTxt('/prt', 'sample', 'shadowed', controller.signal)).rejects.toBe(
      controller.signal.reason
    )
  })

  /** 本层不把 HTTP/超时等错误统一伪装成 PRT 数据格式错误。 */
  it('原样传播加载失败', async () => {
    const failure = new Error('HTTP failure')
    fetchText.mockRejectedValue(failure)

    await expect(loadPRTSHTxt('/prt', 'sample', 'shadowed')).rejects.toBe(failure)
  })
})
