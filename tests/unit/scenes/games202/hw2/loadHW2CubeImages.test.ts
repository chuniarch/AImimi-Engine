import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { InvalidCubeTextureError } from '@/rendering/core/errors'
import type { CubeFaces } from '@/rendering/resources/CubeTexture'
import { loadHW2CubeImages } from '@/scenes/games202/hw2/internal/loadHW2CubeImages'

/**
 * 只替代浏览器的外部图片加载边界。
 * 不模拟 loadHW2CubeImages 的并发、取消或清理逻辑。
 */
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

  /** 模拟浏览器报告实际像素尺寸后发出 load 事件。 */
  succeed(width = 2, height = width): void {
    this.complete = true
    this.naturalWidth = width
    this.naturalHeight = height
    this.onload?.()
  }

  /** 模拟移除 src；记录结果供测试观察请求取消后的状态。 */
  removeAttribute(name: string): void {
    if (name === 'src') this.src = ''
  }
}

/** 六面顺序固定；测试中的“完成顺序”可以与此相反。 */
const urls: CubeFaces<string> = [
  '/cube/posx.jpg',
  '/cube/negx.jpg',
  '/cube/posy.jpg',
  '/cube/negy.jpg',
  '/cube/posz.jpg',
  '/cube/negz.jpg'
]

beforeEach(() => {
  FakeImage.instances = []
  vi.stubGlobal('Image', FakeImage)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadHW2CubeImages', () => {
  /** 防止按完成先后 push 导致 cubemap 六面互换。 */
  it('并发开始六面加载，但按输入顺序返回', async () => {
    const promise = loadHW2CubeImages(urls, new AbortController().signal)
    expect(FakeImage.instances.map((image) => image.src)).toEqual(urls)

    for (const image of [...FakeImage.instances].reverse()) image.succeed()

    const faces = await promise
    expect(faces).toEqual(FakeImage.instances)
    expect(faces.map((image) => image.src)).toEqual(urls)
    expect(Object.isFrozen(faces)).toBe(true)
    expect(FakeImage.instances.every((image) => image.onload === null)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  /** 取消必须发生在 new Image 和设置 src 之前。 */
  it('预先取消时不开始任何图片请求', async () => {
    const controller = new AbortController()
    const reason = new Error('superseded')
    controller.abort(reason)

    await expect(loadHW2CubeImages(urls, controller.signal)).rejects.toBe(reason)
    expect(FakeImage.instances).toHaveLength(0)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][hw2-image-load-cancellation]
   *
   * 不只检查 Promise 拒绝，还检查 pending 图片解绑回调、取消 src、
   * 清除计时器，防止“界面已切换，但后台仍持有旧请求”。
   */
  it('运行中取消时清理所有尚未完成的图片', async () => {
    const controller = new AbortController()
    const promise = loadHW2CubeImages(urls, controller.signal)
    const reason = new Error('superseded')
    const rejected = expect(promise).rejects.toBe(reason)

    controller.abort(reason)
    await rejected

    expect(
      FakeImage.instances.every(
        (image) => image.src === '' && image.onload === null && image.onerror === null
      )
    ).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  /** 一面失败时不能让其余五面继续等待；失败不是取消用户的父 signal。 */
  it('一面失败时取消其余请求，并保留加载错误', async () => {
    const controller = new AbortController()
    const promise = loadHW2CubeImages(urls, controller.signal)
    const rejected = expect(promise).rejects.toBeInstanceOf(ResourceLoadError)

    FakeImage.instances[2]!.onerror?.()
    await rejected

    expect(controller.signal.aborted).toBe(false)
    expect(FakeImage.instances.every((image) => image.src === '')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  /** 加载一直不返回也必须有终止点；不使用真实时间等待。 */
  it('超时后拒绝，并清理六面请求', async () => {
    const promise = loadHW2CubeImages(urls, new AbortController().signal)
    const rejected = expect(promise).rejects.toBeInstanceOf(ResourceLoadError)

    await vi.advanceTimersByTimeAsync(6000)
    await rejected

    expect(FakeImage.instances.every((image) => image.src === '')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  /** 成功返回的图片由 CubeTexture 借用，之后父 signal 取消不能清空它们。 */
  it('成功后取消旧 signal 不破坏已经交付的图片', async () => {
    const controller = new AbortController()
    const promise = loadHW2CubeImages(urls, controller.signal)
    for (const image of FakeImage.instances) image.succeed()
    await promise

    controller.abort()
    expect(FakeImage.instances.map((image) => image.src)).toEqual(urls)
  })

  /** CPU 检查六面尺寸；WebGL1 NPOT 限制仍由 Manager 处理。 */
  it.each(['non-square', 'different-size'])('拒绝无效 cubemap 尺寸 %s', async (kind) => {
    const promise = loadHW2CubeImages(urls, new AbortController().signal)
    const rejected = expect(promise).rejects.toBeInstanceOf(InvalidCubeTextureError)

    FakeImage.instances.forEach((image, index) => {
      if (index !== 5) image.succeed()
      else if (kind === 'non-square') image.succeed(2, 4)
      else image.succeed(4)
    })

    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  /** load 事件本身不能替代对解码结果的检查。 */
  it('拒绝 load 之后仍没有实际像素的图片', async () => {
    const promise = loadHW2CubeImages(urls, new AbortController().signal)
    const rejected = expect(promise).rejects.toBeInstanceOf(ResourceLoadError)

    FakeImage.instances[0]!.succeed(0)
    await rejected

    expect(vi.getTimerCount()).toBe(0)
  })
})
