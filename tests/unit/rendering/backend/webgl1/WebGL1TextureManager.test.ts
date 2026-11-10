import { describe, expect, it, vi } from 'vitest'
import {
  WebGL1TextureManager,
  type WebGL1TextureOwnerHooks
} from '@/rendering/backend/webgl1/WebGL1TextureManager'
import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import { RenderTexture, type RenderTextureOptions } from '@/rendering/resources/RenderTexture'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import {
  CleanupFailureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError,
  UnsupportedRenderFeatureError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { createFakeWebGL1StorageContext } from '../fakes/createFakeWebGL1StorageContext'

function render(options: Partial<RenderTextureOptions> = {}) {
  return new RenderTexture({
    label: 'P',
    production: 'manual',
    descriptor: {
      dimension: '2d',
      width: 64,
      height: 64,
      mipLevelCount: 1,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear'
    },
    ...options
  })
}
function data() {
  return new DataTexture2D({
    label: 'P',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'data',
    source: { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 255]) }
  })
}
function setup(hooks: Partial<WebGL1TextureOwnerHooks> = {}, float = false, linear = false) {
  const fake = createFakeWebGL1StorageContext()
  const generation = new WebGL1ResourceGeneration(fake.gl)
  const beforeDelete = vi.fn(() => undefined)
  const manager = new WebGL1TextureManager(
    fake.gl,
    { textureFloat: float ? {} : null, textureFloatLinear: linear ? {} : null },
    generation,
    { invalidateState: () => undefined, assertAvailable: () => {}, beforeDelete, ...hooks }
  )
  return { ...fake, generation, manager, beforeDelete }
}
function caught(action: () => unknown): unknown {
  try {
    action()
  } catch (cause) {
    return cause
  }
  throw new Error('Expected failure')
}

describe('WebGL1TextureManager ownership', () => {
  it('constructor performs no GL and one identity has one ready record', () => {
    const f = setup()
    expect(f.commands).toHaveLength(0)
    const p = render(),
      first = f.manager.get(p)
    for (let i = 0; i < 3; i++) expect(f.manager.get(p)).toBe(first)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(first.texture).toBe(p)
    expect(first.generation).toBe(f.generation.token)
    expect(f.manager.get(render()).handle).not.toBe(first.handle)
    expect(setup().manager.get(p).handle).not.toBe(first.handle)
  })

  it.each(['manual', 'generated-from-base'] as const)(
    'render %s allocates declared levels once and never generates content',
    (production) => {
      const f = setup(),
        p = render({
          production,
          descriptor: {
            dimension: '2d',
            width: 64,
            height: 64,
            mipLevelCount: 7,
            storage: { format: 'rgba', type: 'uint8' },
            colorSpace: 'linear'
          }
        })
      f.manager.get(p)
      expect(
        f.api.texImage2D.mock.calls.map((args) => [args[1], args[3], args[4], args[8]])
      ).toEqual([
        [0, 64, 64, null],
        [1, 32, 32, null],
        [2, 16, 16, null],
        [3, 8, 8, null],
        [4, 4, 4, null],
        [5, 2, 2, null],
        [6, 1, 1, null]
      ])
      // A producer may have drawn into this handle between the two calls.
      f.manager.get(p)
      expect(f.api.texImage2D).toHaveBeenCalledTimes(7)
      expect(f.api.generateMipmap).not.toHaveBeenCalled()
    }
  )

  it('256 cube allocates all 54 face/level locations under one handle', () => {
    const f = setup(),
      p = render({
        descriptor: {
          dimension: 'cube',
          width: 256,
          height: 256,
          mipLevelCount: 9,
          storage: { format: 'rgba', type: 'uint8' },
          colorSpace: 'linear'
        }
      })
    expect(f.manager.get(p).target).toBe(0x8513)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(f.api.texImage2D).toHaveBeenCalledTimes(54)
    expect(
      f.api.texImage2D.mock.calls
        .filter((args) => args[1] === 2)
        .map((args) => [args[0], args[3], args[4]])
    ).toEqual([
      [0x8515, 64, 64],
      [0x8516, 64, 64],
      [0x8517, 64, 64],
      [0x8518, 64, 64],
      [0x8519, 64, 64],
      [0x851a, 64, 64]
    ])
    expect(
      f.api.texImage2D.mock.calls.filter((args) => args[0] === 0x8515).map((args) => args[3])
    ).toEqual([256, 128, 64, 32, 16, 8, 4, 2, 1])
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
  })

  it('source snapshot is read once and ready cache never re-uploads', () => {
    const f = setup(),
      p = data(),
      source = vi.spyOn(p, 'copySource')
    f.manager.get(p)
    f.manager.get(p)
    expect(source).toHaveBeenCalledTimes(1)
    expect(f.api.texImage2D).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'float render storage checks upload/filter capability independently, linear=%s',
    (linear) => {
      const p = render({
        descriptor: {
          dimension: '2d',
          width: 64,
          height: 64,
          mipLevelCount: 7,
          storage: { format: 'rgba', type: 'float32' },
          colorSpace: 'data'
        },
        defaultSampler: {
          minFilter: linear ? 'linear' : 'nearest',
          magFilter: linear ? 'linear' : 'nearest'
        }
      })
      const noFloat = setup()
      expect(() => noFloat.manager.get(p)).toThrow(UnsupportedRenderFeatureError)
      expect(noFloat.api.createTexture).not.toHaveBeenCalled()
      const f = setup({}, true)
      if (linear) {
        expect(() => f.manager.get(p)).toThrow(UnsupportedRenderFeatureError)
        expect(f.api.createTexture).not.toHaveBeenCalled()
      } else {
        f.manager.get(p)
        expect(f.api.texImage2D).toHaveBeenCalledTimes(7)
        expect(f.api.generateMipmap).not.toHaveBeenCalled()
      }
    }
  )

  it('null create preserves creation error without a delete', () => {
    const f = setup()
    f.injectOnce('createTexture', { kind: 'null' })
    expect(() => f.manager.get(render())).toThrow(WebGLResourceCreationError)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })

  it('upload GL error preserves operation error and rolls back', () => {
    const f = setup()
    f.injectOnce('texImage2D', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.manager.get(render())).toThrow(WebGLOperationError)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('failed rollback retains candidate and retries it before any second allocation', () => {
    const f = setup(),
      p = render(),
      upload = new DOMException('blocked', 'SecurityError'),
      deletion = new Error('delete failed')
    f.injectOnce('texImage2D', { kind: 'throw', cause: upload })
    f.injectOnce('deleteTexture', { kind: 'throw', cause: deletion })
    const failure = caught(() => f.manager.get(p))
    expect(failure).toBeInstanceOf(AggregateError)
    expect((failure as AggregateError).errors[0]).toBe(upload)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    f.injectOnce('deleteTexture', { kind: 'throw', cause: deletion })
    expect(() => f.manager.get(p)).toThrow(CleanupFailureError)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    const ready = f.manager.get(p)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(3)
    expect(f.api.createTexture).toHaveBeenCalledTimes(2)
    f.manager.assertRecordUsable(ready)
    expect(f.beforeDelete).toHaveBeenCalledTimes(1)
  })

  it('undefined upload cause survives rollback failure', () => {
    const f = setup()
    f.injectOnce('texImage2D', { kind: 'throw', cause: undefined })
    f.injectOnce('deleteTexture', { kind: 'throw', cause: new Error('delete') })
    const failure = caught(() => f.manager.get(render()))
    expect(failure).toBeInstanceOf(AggregateError)
    expect((failure as AggregateError).errors[0]).toBeUndefined()
    f.manager.dispose()
  })

  it('dependency failure blocks deletion; successful barrier is not replayed after delete error', () => {
    const beforeDelete = vi.fn(() => undefined),
      f = setup({ beforeDelete }),
      p = render()
    const record = f.manager.get(p)
    beforeDelete.mockImplementationOnce(() => {
      throw new Error('dependent FBO')
    })
    expect(() => f.manager.release(p)).toThrow(CleanupFailureError)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
    expect(() => f.manager.assertRecordUsable(record)).toThrow(WebGLOperationError)
    f.injectOnce('deleteTexture', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.manager.release(p)).toThrow(CleanupFailureError)
    f.manager.release(p)
    expect(beforeDelete).toHaveBeenCalledTimes(2)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(p.disposed).toBe(false)
  })

  it.each(['createTexture', 'texImage2D', 'texParameteri'] as const)(
    'during %s Resource.dispose remains pending until candidate cleanup',
    (operation) => {
      const f = setup(),
        p = render(),
        original = f.api[operation].getMockImplementation()!
      f.api[operation].mockImplementationOnce((...args: unknown[]) => {
        expect(() => p.dispose()).toThrow(CleanupFailureError)
        expect(p.cleanupState).toBe('failed')
        return Reflect.apply(original, f.api, args)
      })
      expect(() => f.manager.get(p)).toThrow()
      expect(f.api.createTexture).toHaveBeenCalledTimes(1)
      expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
      p.dispose()
      expect(p.cleanupState).toBe('complete')
    }
  )

  it.each(['release', 'dispose'] as const)(
    'synchronous manager %s during upload prevents publication even when caught',
    (action) => {
      const f = setup(),
        p = render()
      f.api.texImage2D.mockImplementationOnce(() => {
        expect(() => (action === 'release' ? f.manager.release(p) : f.manager.dispose())).toThrow(
          CleanupFailureError
        )
        expect(f.api.deleteTexture).not.toHaveBeenCalled()
      })
      expect(() => f.manager.get(p)).toThrow(WebGLBackendDisposedError)
      expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
      if (action === 'release') f.manager.get(p)
      else expect(() => f.manager.get(p)).toThrow(WebGLBackendDisposedError)
    }
  )

  it('recursive get during source read cannot allocate a second candidate', () => {
    const f = setup(),
      p = data(),
      read = p.copySource.bind(p)
    vi.spyOn(p, 'copySource').mockImplementationOnce(() => {
      expect(() => f.manager.get(p)).toThrow(WebGLOperationError)
      return read()
    })
    f.manager.get(p)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
  })

  it('busy release from dependency hook cannot pretend cleanup completed', () => {
    const f = setup(),
      p = render()
    f.manager.get(p)
    f.beforeDelete.mockImplementationOnce(() => {
      expect(() => f.manager.release(p)).toThrow(CleanupFailureError)
      expect(() => p.dispose()).toThrow(CleanupFailureError)
      expect(f.api.deleteTexture).not.toHaveBeenCalled()
      return undefined
    })
    f.manager.release(p)
    p.dispose()
    expect(p.cleanupState).toBe('complete')
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('stale and foreign records cannot be borrowed or trigger allocation', () => {
    const a = setup(),
      b = setup(),
      p = render(),
      old = a.manager.get(p),
      foreign = b.manager.get(p)
    expect(() => a.manager.assertRecordUsable(foreign)).toThrow(WebGLOperationError)
    a.manager.release(p)
    const current = a.manager.get(p)
    expect(() => a.manager.assertRecordUsable(old)).toThrow(WebGLOperationError)
    a.manager.assertRecordUsable(current)
    expect(a.api.createTexture).toHaveBeenCalledTimes(2)
  })

  it('coordinator closing rejects previously borrowed manager without allocating', () => {
    let closed = false
    const f = setup({
      assertAvailable: () => {
        if (closed) throw new WebGLBackendDisposedError('closed')
      }
    })
    const p = render()
    f.manager.get(p)
    closed = true
    expect(() => f.manager.get(p)).toThrow(WebGLBackendDisposedError)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    f.manager.dispose()
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })

  it('sticky loss during creation abandons old responsibility without deleting or rebinding', () => {
    const f = setup(),
      p = render(),
      create = f.api.createTexture.getMockImplementation()!
    f.api.createTexture.mockImplementationOnce(() => {
      const handle = create()
      f.generation.invalidate()
      f.clearCommands()
      return handle
    })
    expect(() => f.manager.get(p)).toThrow(WebGLContextLostError)
    expect(f.commands.filter((c) => c.operation !== 'isContextLost')).toHaveLength(0)
    f.restore()
    p.dispose()
    expect(() => f.manager.get(render())).toThrow(WebGLContextLostError)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })
})

/** Flatten the public error containers only; undefined is an actual captured cause. */
function allCauses(cause: unknown): unknown[] {
  if (cause instanceof AggregateError) return [cause, ...cause.errors.flatMap(allCauses)]
  if (cause instanceof CleanupFailureError)
    return [cause, ...cause.failures.flatMap((failure) => allCauses(failure.cause))]
  return [cause]
}

describe('cleanup failure concurrent with generation loss', () => {
  it.each([
    ['dependency', 'create', 'error'],
    ['dependency', 'create', 'undefined'],
    ['delete', 'create', 'error'],
    ['delete', 'create', 'undefined'],
    ['dependency', 'release', 'error'],
    ['dependency', 'release', 'undefined'],
    ['delete', 'release', 'error'],
    ['delete', 'release', 'undefined']
  ] as const)(
    '%s failure during %s preserves %s while abandoning the lost generation',
    (phase, operation, kind) => {
      const f = setup(),
        p = render(),
        original = new DOMException('upload failed', 'SecurityError')
      const cleanup = kind === 'error' ? new Error('cleanup failed') : undefined
      if (operation === 'release') f.manager.get(p)
      else f.injectOnce('texImage2D', { kind: 'throw', cause: original })
      const fail = () => {
        f.generation.invalidate()
        f.clearCommands()
        throw cleanup
      }
      if (phase === 'dependency') f.beforeDelete.mockImplementationOnce(fail)
      else f.api.deleteTexture.mockImplementationOnce(fail)
      const failure = caught(() =>
        operation === 'create' ? f.manager.get(p) : f.manager.release(p)
      )
      const causes = allCauses(failure)
      expect(causes).toContain(cleanup)
      if (operation === 'create') expect(causes).toContain(original)
      expect(causes.some((cause) => cause instanceof WebGLContextLostError)).toBe(true)
      expect(f.commands.filter((command) => command.operation !== 'isContextLost')).toHaveLength(0)
      f.restore()
      f.manager.dispose()
      p.dispose()
      expect(f.commands.filter((command) => command.operation !== 'isContextLost')).toHaveLength(0)
    }
  )

  it('pure context loss during deletion completes abandonment without an extra failure', () => {
    const f = setup(),
      p = render()
    f.manager.get(p)
    f.api.deleteTexture.mockImplementationOnce(() => {
      f.generation.invalidate()
    })
    expect(() => f.manager.release(p)).not.toThrow()
    f.restore()
    p.dispose()
    expect(p.cleanupState).toBe('complete')
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })
})

describe('storage fake fault boundary', () => {
  it('an injected GL error does not delete the handle before a retry', () => {
    const f = createFakeWebGL1StorageContext(),
      handle = f.gl.createTexture()
    f.injectOnce('deleteTexture', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    f.gl.deleteTexture(handle)
    expect(f.gl.getError()).toBe(f.gl.OUT_OF_MEMORY)
    expect(() => f.gl.bindTexture(f.gl.TEXTURE_2D, handle)).not.toThrow()
    expect(() => f.gl.deleteTexture(handle)).not.toThrow()
  })
})
