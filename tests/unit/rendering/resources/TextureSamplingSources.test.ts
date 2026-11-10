import { describe, expect, it } from 'vitest'
import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { createTextureSamplingBinding } from '@/rendering/resources/TextureSamplingBinding'
import {
  resolveTextureSamplingSource,
  copyTextureSamplingSource
} from '@/rendering/resources/textureSamplingSource'
import { DataTexture2D } from '@/rendering/resources/Texture2D'

function owner() {
  return new RenderTargetBundle({
    label: 'map',
    width: 64,
    height: 64,
    colors: [
      {
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data',
        defaultSampler: { minFilter: 'nearest', magFilter: 'nearest' }
      }
    ],
    depth: true
  })
}
describe('C2 sampling storage versus active slot', () => {
  /** null不能在第二次读取变成undefined后，被当作合法缺省sampler吞掉。 */
  it('只读取一次sampler getter，第一次null必须明确拒绝', () => {
    const bundle = owner(),
      texture = bundle.target.attachments.colors[0]!.texture
    let reads = 0
    const input = {
      texture,
      get sampler() {
        return ++reads === 1 ? null : undefined
      }
    }
    expect(() => copyTextureSamplingSource(input, '2d', 'uMap')).toThrow(InvalidMaterialError)
    expect(reads).toBe(1)
  })
  /** 合法配置也只能读取一次，不能把第一次nearest换成后来的默认linear。 */
  it('只读取一次合法sampler getter，保存实际验证的请求', () => {
    const bundle = owner(),
      texture = bundle.target.attachments.colors[0]!.texture
    let reads = 0
    const input = {
      texture,
      get sampler() {
        return ++reads === 1 ? { minFilter: 'linear', magFilter: 'linear' } : undefined
      }
    }
    const resolved = resolveTextureSamplingSource(input, '2d', 'uMap')
    expect(resolved.sampler.minFilter).toBe('linear')
    expect(reads).toBe(1)
  })
  it('slot随替换解析新存储，旧fixed binding仍指旧纹理并明确失效', () => {
    const bundle = owner(),
      slot = bundle.target.getColorAttachment(0)
    const old = resolveTextureSamplingSource(slot, '2d', 'uMap')
    bundle.resize(128, 128)
    const next = resolveTextureSamplingSource(slot, '2d', 'uMap')
    expect(next.texture).not.toBe(old.texture)
    expect(next.texture.descriptor.width).toBe(128)
    expect(next.sampler.minFilter).toBe('nearest')
    expect(() => resolveTextureSamplingSource(old, '2d', 'uMap')).toThrow(ResourceDisposedError)
  })
  it('fixed binding复制sampler保留纹理，不retain、不冻结资源', () => {
    const bundle = owner(),
      texture = bundle.target.attachments.colors[0]!.texture
    const input = createTextureSamplingBinding(texture, { minFilter: 'linear' })
    const copied = copyTextureSamplingSource(input, '2d', 'uMap')
    const resolved = resolveTextureSamplingSource(copied, '2d', 'uMap')
    expect(resolved.texture).toBe(texture)
    expect(resolved.sampler.minFilter).toBe('linear')
    expect(resolved.sampler).not.toBe(input.sampler)
    expect(texture.defaultSampler.minFilter).toBe('nearest')
    expect(texture.sceneReferenceCount).toBe(0)
    expect(Object.isFrozen(texture)).toBe(false)
  })
  it('legacy直接CPU source保留身份，解析时才补全binding', () => {
    const texture = new DataTexture2D({
      label: 'D',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data',
      source: { width: 1, height: 1, data: new Uint8Array(4) }
    })
    expect(copyTextureSamplingSource(texture, '2d', 'uMap')).toBe(texture)
    expect(resolveTextureSamplingSource(texture, '2d', 'uMap').texture).toBe(texture)
  })
  it('不能把cube face、非零mip或depth16当旧sampler2D槽位', () => {
    const cube = new RenderTexture({
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
    const target = new RenderTarget(
      { colors: [{ kind: 'cube-face', texture: cube, face: 'positive-x', mipLevel: 2 }] },
      { label: 'face' }
    )
    expect(() => resolveTextureSamplingSource(target.getColorAttachment(0), '2d', 'uMap')).toThrow(
      InvalidMaterialError
    )
    const bundle = owner()
    expect(() =>
      resolveTextureSamplingSource(bundle.target.getDepthAttachment(), '2d', 'uMap')
    ).toThrow(InvalidMaterialError)
    expect(() =>
      resolveTextureSamplingSource(createTextureSamplingBinding(cube), '2d', 'uMap')
    ).toThrow(InvalidMaterialError)
    expect(
      resolveTextureSamplingSource(createTextureSamplingBinding(cube), 'cube', 'uEnv').texture
    ).toBe(cube)
  })
  it.each([null, {}, { texture: null, sampler: {} }, { target: null, kind: 'color', index: 0 }])(
    '拒绝runtime来源 %j',
    (value) => {
      expect(() => resolveTextureSamplingSource(value, '2d', 'uMap')).toThrow(InvalidMaterialError)
    }
  )
  it('槽位被替换成不兼容face后，旧wrapper消费也必须重新验证', () => {
    const bundle = owner(),
      slot = bundle.target.getColorAttachment(0)
    const cube = new RenderTexture({
      label: 'P',
      production: 'manual',
      descriptor: {
        dimension: 'cube',
        width: 64,
        height: 64,
        mipLevelCount: 1,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data'
      }
    })
    bundle.target.replaceAttachments({
      colors: [{ kind: 'cube-face', texture: cube, face: 'positive-x', mipLevel: 0 }]
    })
    expect(() => resolveTextureSamplingSource(slot, '2d', 'uMap')).toThrow(InvalidMaterialError)
  })

  /** 单独测试2D非零mip，避免cube案例同时触发两个条件而漏掉mip验证。 */
  it('非零2D mip槽位不能冒充普通sampler2D绑定', () => {
    const texture = new RenderTexture({
      label: 'M',
      production: 'manual',
      descriptor: {
        dimension: '2d',
        width: 8,
        height: 8,
        mipLevelCount: 4,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data'
      }
    })
    const target = new RenderTarget(
      { colors: [{ kind: '2d', texture, mipLevel: 1 }] },
      { label: 'mip' }
    )
    expect(() => resolveTextureSamplingSource(target.getColorAttachment(0), '2d', 'uMap')).toThrow(
      InvalidMaterialError
    )
  })
})
