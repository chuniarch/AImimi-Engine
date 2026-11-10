import { describe, expect, it } from 'vitest'
import { ResourceDisposedError } from '@/rendering/core/errors'
import { InvalidTextureResourceError } from '@/rendering/core/errors/InvalidTextureResourceError'
import { InvalidTextureViewError } from '@/rendering/core/errors/InvalidTextureViewError'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import {
  createTextureWriteView,
  getTextureWriteViewSize,
  type TextureWriteView
} from '@/rendering/resources/TextureWriteView'
import { createTextureSamplingBinding } from '@/rendering/resources/TextureSamplingBinding'
import { DataTexture2D } from '@/rendering/resources/Texture2D'

/** 不申请像素数组；尺寸仅为CPU布局，使大尺寸测试不依赖GPU/内存。 */
function cube() {
  return new RenderTexture({
    label: 'P',
    production: 'manual',
    descriptor: {
      dimension: 'cube',
      width: 256,
      height: 256,
      mipLevelCount: 9,
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'linear'
    }
  })
}

describe('C1 write views and sampling bindings', () => {
  /** 多个地址只是借用同一身份；创建地址不得retain、dispose或冻结资源。 */
  it('同一个P的写入/读取包装保留身份且复制冻结wrapper', () => {
    const texture = cube()
    const input = { kind: 'cube-face' as const, texture, face: 'positive-x' as const, mipLevel: 2 }
    const view = createTextureWriteView(input)
    const binding = createTextureSamplingBinding(texture, { minFilter: 'linear-mipmap-linear' })
    input.mipLevel = 4
    expect(view).not.toBe(input)
    expect(view.texture).toBe(texture)
    expect(binding.texture).toBe(texture)
    expect(Object.isFrozen(view)).toBe(true)
    expect(Object.isFrozen(binding)).toBe(true)
    expect(Object.isFrozen(binding.sampler)).toBe(true)
    expect(Object.isFrozen(texture)).toBe(false)
    expect(texture.sceneReferenceCount).toBe(0)
    expect(getTextureWriteViewSize(view)).toEqual([64, 64])
  })

  it('每个mip尺寸按base推导；返回独立tuple', () => {
    const texture = cube()
    const view = createTextureWriteView({
      kind: 'cube-face',
      texture,
      face: 'negative-z',
      mipLevel: 8
    })
    expect(getTextureWriteViewSize(view)).toEqual([1, 1])
    expect(getTextureWriteViewSize(view)).not.toBe(getTextureWriteViewSize(view))
  })

  it('大于32位的CPU尺寸不被位移截断', () => {
    const texture = new RenderTexture({
      label: 'huge',
      production: 'manual',
      descriptor: {
        dimension: '2d',
        width: 2 ** 40,
        height: 2 ** 40,
        mipLevelCount: 41,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data'
      }
    })
    expect(getTextureWriteViewSize({ kind: '2d', texture, mipLevel: 2 })).toEqual([
      2 ** 38,
      2 ** 38
    ])
  })

  it.each([
    { kind: '2d', mipLevel: 0 },
    { kind: 'cube-face', face: 'up', mipLevel: 0 },
    { kind: 'cube-face', face: 'positive-x', mipLevel: -1 },
    { kind: 'cube-face', face: 'positive-x', mipLevel: 1.5 },
    { kind: 'cube-face', face: 'positive-x', mipLevel: 9 },
    { kind: 'cube-face', face: 'positive-x', mipLevel: NaN },
    { kind: 'cube-face', face: 'positive-x', mipLevel: 0, extra: true }
  ])('拒绝错误写入地址 %j', (shape) => {
    const value = { ...shape, texture: cube() } as TextureWriteView
    expect(() => createTextureWriteView(value)).toThrow(InvalidTextureViewError)
    expect(() => getTextureWriteViewSize(value)).toThrow(InvalidTextureViewError)
  })

  it('source只能采样，不能伪装RenderTexture输出', () => {
    const source = new DataTexture2D({
      label: 'data',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data',
      source: { width: 1, height: 1, data: new Uint8Array(4) }
    })
    expect(createTextureSamplingBinding(source).texture).toBe(source)
    expect(() =>
      createTextureWriteView({
        kind: '2d',
        texture: source,
        mipLevel: 0
      } as unknown as TextureWriteView)
    ).toThrow(InvalidTextureViewError)
  })

  it('sampler覆盖复制输入且不改默认值，不增加资源引用', () => {
    const texture = cube(),
      input = { minFilter: 'nearest' as const }
    const binding = createTextureSamplingBinding(texture, input)
    expect(binding.sampler.magFilter).toBe('linear')
    expect(binding.sampler.minFilter).toBe('nearest')
    expect(texture.defaultSampler.minFilter).toBe('linear')
    expect(texture.sceneReferenceCount).toBe(0)
    expect(binding.sampler).not.toBe(input)
  })

  it.each([null, {}, { label: 'fake' }])('拒绝非TextureResource采样来源 %j', (value) => {
    expect(() => createTextureSamplingBinding(value as never)).toThrow(InvalidTextureResourceError)
  })

  /** 旧wrapper不会让资源复活；消费前每次检查。 */
  it('资源关闭后拒绝新地址、采样请求与旧地址的尺寸消费', () => {
    const texture = cube()
    const view = createTextureWriteView({
      kind: 'cube-face',
      texture,
      face: 'positive-x',
      mipLevel: 0
    })
    texture.dispose()
    expect(() => createTextureSamplingBinding(texture)).toThrow(ResourceDisposedError)
    expect(() => createTextureWriteView(view)).toThrow(ResourceDisposedError)
    expect(() => getTextureWriteViewSize(view)).toThrow(ResourceDisposedError)
  })
})
