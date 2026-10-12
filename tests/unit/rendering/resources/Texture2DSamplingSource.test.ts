import { describe, expect, it } from 'vitest'

import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { DataTexture2D, ImageTexture2D } from '@/rendering/resources/Texture2D'
import { copyTexture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'

/** 创建真实 CPU 目标；两个颜色槽和可选深度用于验证地址，不创建 WebGL context。 */
function createTarget(withDepth = true): RenderTarget {
  return new RenderTarget(
    {
      width: 32,
      height: 16,
      colors: [{ format: 'rgba8' }, { format: 'rgba8' }],
      ...(withDepth ? { depth: { format: 'depth16' as const } } : {})
    },
    { label: 'shadow/main' }
  )
}

describe('Texture2DSamplingSource CPU contract', () => {
  /** Given 两类 CPU 纹理；When 建立采样值；Then 只借用身份，不复制或 retain 资源。 */
  it('保留 DataTexture2D 和 ImageTexture2D 的对象身份', () => {
    const textures = [
      new DataTexture2D({
        label: 'data',
        source: { data: new Uint8Array(4), width: 1, height: 1 },
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data'
      }),
      new ImageTexture2D({
        label: 'image',
        source: { width: 1, height: 1 } as ImageBitmap,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'srgb'
      })
    ]

    for (const texture of textures) {
      expect(copyTexture2DSamplingSource(texture, 'parameters.uMap')).toBe(texture)
      expect(texture.sceneReferenceCount).toBe(0)
      texture.dispose()
      expect(() => copyTexture2DSamplingSource(texture, 'parameters.uMap')).toThrow(
        ResourceDisposedError
      )
    }
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
   * Given 可变地址；When 复制后修改原对象；Then 快照不漂移，且目标仍由 owner 管理。
   * 如果直接返回或冻结输入，隔离断言或原对象可写断言会失败。
   */
  it('复制并冻结地址，不冻结原包装和目标，不捕获 revision', () => {
    const target = createTarget()
    const replacement = createTarget()
    const input = { target, kind: 'color', index: 1 }
    const snapshot = copyTexture2DSamplingSource(input, 'parameters.uShadowMap')

    input.target = replacement
    input.kind = 'depth'
    input.index = 0

    expect(snapshot).toEqual({ target, kind: 'color', index: 1 })
    expect(snapshot).not.toBe(input)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(target)).toBe(false)
    expect(Reflect.set(snapshot, 'index', 0)).toBe(false)
    expect(snapshot).not.toHaveProperty('revision')
    expect(snapshot).not.toHaveProperty('texture')
    expect(target.sceneReferenceCount).toBe(0)

    target.resize(64, 32)
    expect(copyTexture2DSamplingSource(snapshot, 'parameters.uShadowMap')).toEqual({
      target,
      kind: 'color',
      index: 1
    })
    expect(target.descriptor.width).toBe(64)
    target.dispose()
    expect(() => copyTexture2DSamplingSource(snapshot, 'parameters.uShadowMap')).toThrow(
      ResourceDisposedError
    )
    replacement.dispose()
  })

  /** Given 合法槽位；When 仅验证逻辑地址；Then 不把 depth16 的 GPU 可采样性混进 CPU 层。 */
  it('接受两个颜色槽与存在的 depth[0]，但不按相同 label 合并目标', () => {
    const target = createTarget()
    const other = createTarget()
    for (const input of [
      target.getColorAttachment(0),
      target.getColorAttachment(1),
      target.getDepthAttachment()!
    ]) {
      const snapshot = copyTexture2DSamplingSource(input, 'parameters.uMap')
      expect(snapshot).toEqual(input)
      expect(snapshot).not.toBe(input)
    }
    expect(copyTexture2DSamplingSource(other.getColorAttachment(0), 'parameters.uMap')).toEqual({
      target: other,
      kind: 'color',
      index: 0
    })
    expect(target).not.toBe(other)
    target.dispose()
    other.dispose()
  })

  /** 外层错误须成为领域错误，不能泄漏读取 null.target 的 TypeError。 */
  it.each([undefined, null, [], 1, 'texture', {}, { target: {} }, { target: null }])(
    '拒绝非法采样来源 %#',
    (input) => {
      expect(() => copyTexture2DSamplingSource(input, 'parameters.uMap')).toThrow(
        InvalidMaterialError
      )
      expect(() => copyTexture2DSamplingSource(input, 'parameters.uMap')).toThrow('parameters.uMap')
    }
  )

  /** Given 活目标；When 地址被伪造；Then 验证 kind、安全整数和实际附件范围。 */
  it.each([
    { kind: 'cube', index: 0 },
    { kind: undefined, index: 0 },
    { kind: 'color', index: -1 },
    { kind: 'color', index: 0.5 },
    { kind: 'color', index: NaN },
    { kind: 'color', index: Infinity },
    { kind: 'color', index: Number.MAX_SAFE_INTEGER + 1 },
    { kind: 'color', index: '0' },
    { kind: 'color', index: undefined },
    { kind: 'color', index: 2 },
    { kind: 'depth', index: 1 }
  ])('拒绝非法附件地址 %#', (address) => {
    const target = createTarget()
    expect(() => copyTexture2DSamplingSource({ target, ...address }, 'parameters.uMap')).toThrow(
      InvalidMaterialError
    )
    expect(target.sceneReferenceCount).toBe(0)
    expect(target.disposed).toBe(false)
    target.dispose()
  })

  /** depth[0] 只有在 descriptor 真正配置了 depth 时才是有效地址。 */
  it('拒绝不存在的深度附件', () => {
    const target = createTarget(false)
    expect(() =>
      copyTexture2DSamplingSource({ target, kind: 'depth', index: 0 }, 'parameters.uDepth')
    ).toThrow(InvalidMaterialError)
    target.dispose()
  })
})
