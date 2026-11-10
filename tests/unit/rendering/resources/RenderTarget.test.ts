import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { EngineError } from '@/errors/EngineError/BaseError'
import {
  InvalidRenderTargetError,
  RenderingError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError
} from '@/rendering/core/errors'
import { RenderTarget, type RenderTargetOptions } from '@/rendering/resources/RenderTarget'
import {
  RenderTargetBundle,
  type RenderTargetBundleOptions
} from '@/rendering/resources/RenderTargetBundle'
import { Scene } from '@/rendering/scene/Scene'

const options: RenderTargetBundleOptions = {
  width: 256,
  height: 128,
  label: 'test/render-target',
  colors: [
    { storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' },
    { storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }
  ],
  depth: true
}

function fixture() {
  const owner = new RenderTargetBundle(options)
  onTestFinished(() => owner.dispose())
  return { owner, target: owner.target }
}

function checkLabelTypes(target: RenderTarget): void {
  // @ts-expect-error options are required
  new RenderTarget(target.attachments)
  // @ts-expect-error label is required
  new RenderTarget(target.attachments, {})
  // @ts-expect-error label is read-only
  target.label = 'renamed'
}
void checkLabelTypes

describe('RenderTarget borrowed composition and owner', () => {
  it('copies diagnostic options, retains its label through replacement and disposal', () => {
    const { owner, target } = fixture()
    const input = { label: 'gbuffer/main' }
    const borrowed = new RenderTarget(target.attachments, input)
    onTestFinished(() => borrowed.dispose())
    input.label = 'caller/changed'
    owner.resize(512, 256)
    borrowed.replaceAttachments(target.attachments)
    expect(borrowed.label).toBe('gbuffer/main')
    expect(borrowed.attachments).not.toHaveProperty('label')
    expect(borrowed.revision).toBe(1)
    borrowed.dispose()
    expect(borrowed.label).toBe('gbuffer/main')
  })

  it.each([undefined, null, [], 'gbuffer/main', 1])('rejects malformed options %#', (input) => {
    const { target } = fixture()
    expect(
      () => new RenderTarget(target.attachments, input as unknown as RenderTargetOptions)
    ).toThrow(InvalidRenderTargetError)
  })

  it.each([undefined, null, '', ' \t\n', 123, false, {}])('rejects malformed label %#', (label) => {
    const { target } = fixture()
    expect(() => new RenderTarget(target.attachments, { label } as RenderTargetOptions)).toThrow(
      InvalidRenderTargetError
    )
  })

  it('rejects label in the attachment composition', () => {
    const { target } = fixture()
    const attachments = { ...target.attachments, label: 'misplaced' }
    expect(() => new RenderTarget(attachments, { label: 'g' })).toThrow(InvalidRenderTargetError)
  })

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '256'])(
    'rejects invalid width and height without replacing storage %#',
    (size) => {
      const { target, owner } = fixture()
      const before = target.attachments
      for (const key of ['width', 'height'] as const) {
        expect(
          () => new RenderTargetBundle({ ...options, [key]: size } as RenderTargetBundleOptions)
        ).toThrow(InvalidRenderTargetError)
      }
      expect(() => owner.resize(size as number, 4)).toThrow(InvalidRenderTargetError)
      expect(() => owner.resize(4, size as number)).toThrow(InvalidRenderTargetError)
      expect(target.attachments).toBe(before)
      expect(target.revision).toBe(0)
    }
  )

  it.each([
    null,
    [],
    1,
    'nearest',
    { minFilter: null },
    { magFilter: null },
    { minFilter: false },
    { magFilter: 9728 },
    { minFilter: 'nearest-mipmap-nearest' },
    { magFilter: 'linear-mipmap-linear' }
  ])('rejects invalid base-only sampler %#', (defaultSampler) => {
    const invalid = { ...options, colors: [{ ...options.colors[0], defaultSampler }] }
    expect(() => new RenderTargetBundle(invalid as RenderTargetBundleOptions)).toThrow(
      InvalidRenderTargetError
    )
  })

  it('keeps logical color and depth slot addresses across resize', () => {
    const { owner, target } = fixture()
    const color = target.getColorAttachment(0)
    const depth = target.getDepthAttachment()!
    const before = target.attachments
    owner.resize(3, 5)
    expect(target.getColorAttachment(0)).toEqual(color)
    expect(target.getDepthAttachment()).toEqual(depth)
    expect(Object.isFrozen(color)).toBe(true)
    expect(Object.isFrozen(depth)).toBe(true)
    expect([target.width, target.height, target.revision]).toEqual([3, 5, 1])
    expect(before.colors[0]!.texture.disposed).toBe(true)
    expect(before.depth?.disposed).toBe(true)
    owner.resize(256, 128)
    expect(target.revision).toBe(2)
  })

  it.each([-1, 2, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    'rejects an out-of-range or non-integer slot %#',
    (index) => {
      const { target } = fixture()
      expect(() => target.getColorAttachment(index)).toThrow(InvalidRenderTargetError)
    }
  )

  it('closes all reads and replacement when the borrowed target is disposed', () => {
    const { target } = fixture()
    const before = target.attachments
    const listener = vi.fn(() => {
      expect(target.disposed).toBe(true)
      expect(() => target.attachments).toThrow(ResourceDisposedError)
    })
    target.onDispose(listener)
    target.dispose()
    target.dispose()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(() => target.attachments).toThrow(ResourceDisposedError)
    expect(() => target.revision).toThrow(ResourceDisposedError)
    expect(() => target.replaceAttachments(before)).toThrow(ResourceDisposedError)
    expect(() => target.getColorAttachment(0)).toThrow(ResourceDisposedError)
    expect(() => target.getDepthAttachment()).toThrow(ResourceDisposedError)
    expect(before.colors[0]!.texture.disposed).toBe(false)
  })

  it('releases an owned group after its final Scene reference', () => {
    const { owner, target } = fixture()
    const color = target.attachments.colors[0]!.texture
    const first = new Scene()
    const second = new Scene()
    first.retain(owner)
    second.retain(owner)
    expect(() => owner.dispose()).toThrow(ResourceHasSceneReferencesError)
    expect(owner.tryDispose()).toBe(false)
    first.release(owner)
    expect(target.disposed).toBe(false)
    second.release(owner)
    expect(target.disposed).toBe(true)
    expect(color.disposed).toBe(true)
  })
})

describe('InvalidRenderTargetError', () => {
  it('preserves its code and frozen diagnostic details', () => {
    const error = new InvalidRenderTargetError('width', 'must be positive', {
      fieldName: 'wrong',
      reason: 'wrong',
      received: -1
    })
    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidRenderTargetError')
    expect(error.code).toBe('INVALID_RENDER_TARGET')
    expect(error.details).toEqual({ fieldName: 'width', reason: 'must be positive', received: -1 })
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
