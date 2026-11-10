import { describe, expect, it, vi } from 'vitest'
import {
  WebGL1DepthBufferManager,
  type WebGL1DepthBufferOwnerHooks
} from '@/rendering/backend/webgl1/WebGL1DepthBufferManager'
import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import { DepthBufferResource } from '@/rendering/resources/DepthBufferResource'
import {
  CleanupFailureError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { createFakeWebGL1StorageContext } from '../fakes/createFakeWebGL1StorageContext'

function depth(width = 64, height = 64) {
  return new DepthBufferResource({ label: 'D', width, height })
}
function setup(hooks: Partial<WebGL1DepthBufferOwnerHooks> = {}) {
  const f = createFakeWebGL1StorageContext()
  const generation = new WebGL1ResourceGeneration(f.gl)
  const beforeDelete = vi.fn<WebGL1DepthBufferOwnerHooks['beforeDelete']>(() => undefined),
    invalidateState = vi.fn(() => undefined)
  const manager = new WebGL1DepthBufferManager(f.gl, generation, {
    invalidateState,
    assertAvailable: () => {},
    beforeDelete,
    ...hooks
  })
  return { ...f, manager, generation, beforeDelete, invalidateState }
}
function caught(action: () => unknown): unknown {
  try {
    action()
  } catch (cause) {
    return cause
  }
  throw new Error('Expected failure')
}
function causes(cause: unknown): unknown[] {
  if (cause instanceof AggregateError) return [cause, ...cause.errors.flatMap(causes)]
  if (cause instanceof CleanupFailureError)
    return [cause, ...cause.failures.flatMap((f) => causes(f.cause))]
  return [cause]
}

/** Commands are the GL boundary; resource/manager/lifecycle implementations are real. */
describe('WebGL1DepthBufferManager allocation', () => {
  it('constructs without GL, caches by identity/generation and restores the old RBO binding', () => {
    const f = setup()
    expect(f.commands).toHaveLength(0)
    const old = f.gl.createRenderbuffer()
    f.gl.bindRenderbuffer(0x8d41, old)
    f.api.createRenderbuffer.mockClear()
    const d = depth(),
      record = f.manager.get(d)
    for (let i = 0; i < 3; i++) expect(f.manager.get(d)).toBe(record)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(1)
    expect(f.api.renderbufferStorage.mock.calls).toEqual([[0x8d41, 0x81a5, 64, 64]])
    expect(f.gl.getParameter(0x8ca7)).toBe(old)
    expect(record).toMatchObject({
      depth: d,
      generation: f.generation.token,
      width: 64,
      height: 64
    })
    expect(Object.isFrozen(record)).toBe(true)
    expect(f.manager.get(depth()).handle).not.toBe(record.handle)
    expect(setup().manager.get(d).handle).not.toBe(record.handle)
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.bindTexture).not.toHaveBeenCalled()
    expect(f.api.texImage2D).not.toHaveBeenCalled()
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.invalidateState).toHaveBeenCalled()
  })

  it.each([
    [8192, 64],
    [64, 8192]
  ])('rejects oversized %s x %s before creating a handle', (width, height) => {
    const f = setup()
    expect(() => f.manager.get(depth(width, height))).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, NaN, Infinity, null, '4096'])(
    'rejects invalid device limit %s before allocation',
    (limit) => {
      const f = setup(),
        query = f.api.getParameter.getMockImplementation()!
      f.api.getParameter.mockImplementation((name) => (name === 0x84e8 ? limit : query(name)))
      expect(() => f.manager.get(depth())).toThrow(UnsupportedRenderFeatureError)
      expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    }
  )

  it('captures the dimensions once for validation, allocation and the returned record', () => {
    const f = setup(),
      d = depth(),
      width = vi.fn(() => 64),
      height = vi.fn(() => 32)
    Object.defineProperties(d, { width: { get: width }, height: { get: height } })
    const record = f.manager.get(d)
    expect(width).toHaveBeenCalledTimes(1)
    expect(height).toHaveBeenCalledTimes(1)
    expect(f.api.renderbufferStorage.mock.calls).toEqual([[0x8d41, 0x81a5, 64, 32]])
    expect([record.width, record.height]).toEqual([64, 32])
  })

  it('create null remains a creation error and never deletes null', () => {
    const f = setup()
    f.injectOnce('createRenderbuffer', { kind: 'null' })
    expect(() => f.manager.get(depth())).toThrow(WebGLResourceCreationError)
    expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
  })

  it('failed candidate binding never reallocates the previously bound renderbuffer', () => {
    const f = setup(),
      old = f.gl.createRenderbuffer()
    f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, old)
    f.injectOnce('bindRenderbuffer', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.manager.get(depth())).toThrow(WebGLOperationError)
    expect(f.api.renderbufferStorage).not.toHaveBeenCalled()
    expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(old)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })

  it('storage GL error restores binding, deletes only the candidate and allows a fresh attempt', () => {
    const f = setup(),
      d = depth(),
      old = f.gl.createRenderbuffer()
    f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, old)
    f.injectOnce('renderbufferStorage', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.manager.get(d)).toThrow(WebGLOperationError)
    expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(old)
    expect(f.api.deleteRenderbuffer.mock.calls[0]?.[0]).not.toBe(old)
    f.manager.get(d)
    expect(f.api.renderbufferStorage).toHaveBeenCalledTimes(2)
  })

  it.each(['error', 'undefined'] as const)(
    'preserves %s storage cause and restoration failure together',
    (kind) => {
      const f = setup(),
        d = depth(),
        original = kind === 'error' ? new Error('storage') : undefined,
        restore = new Error('restore')
      f.api.renderbufferStorage.mockImplementationOnce(() => {
        f.injectOnce('bindRenderbuffer', { kind: 'throw', cause: restore })
        throw original
      })
      const failure = caught(() => f.manager.get(d))
      expect(failure).toBeInstanceOf(AggregateError)
      expect(causes(failure)).toContain(original)
      expect(causes(failure)).toContain(restore)
      expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
      f.manager.get(d)
      expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(2)
    }
  )

  it('restoration-only failure rejects publication and rolls back', () => {
    const f = setup(),
      d = depth(),
      restore = new Error('restore')
    f.api.renderbufferStorage.mockImplementationOnce(() => {
      f.injectOnce('bindRenderbuffer', { kind: 'throw', cause: restore })
    })
    expect(caught(() => f.manager.get(d))).toBe(restore)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
    f.manager.get(d)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(2)
  })

  it('rollback failure retains its candidate; get must finish cleanup before allocating again', () => {
    const f = setup(),
      d = depth(),
      storage = new Error('storage'),
      deletion = new Error('delete')
    f.injectOnce('renderbufferStorage', { kind: 'throw', cause: storage })
    f.injectOnce('deleteRenderbuffer', { kind: 'throw', cause: deletion })
    const failure = caught(() => f.manager.get(d))
    expect(causes(failure)).toContain(storage)
    expect(causes(failure)).toContain(deletion)
    f.injectOnce('deleteRenderbuffer', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.manager.get(d)).toThrow(CleanupFailureError)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(1)
    f.manager.get(d)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(2)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(3)
    expect(f.beforeDelete).toHaveBeenCalledTimes(1)
  })
})

describe('WebGL1DepthBufferManager lifecycle', () => {
  it('dependency failure blocks deletion and retry does not repeat a successful barrier', () => {
    const f = setup(),
      d = depth(),
      record = f.manager.get(d)
    f.beforeDelete.mockImplementationOnce(() => {
      throw new Error('FBO pending')
    })
    expect(() => f.manager.release(d)).toThrow(CleanupFailureError)
    expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
    expect(() => f.manager.assertRecordUsable(record)).toThrow(WebGLOperationError)
    f.injectOnce('deleteRenderbuffer', { kind: 'throw', cause: new Error('delete') })
    expect(() => f.manager.release(d)).toThrow(CleanupFailureError)
    f.manager.release(d)
    expect(f.beforeDelete).toHaveBeenCalledTimes(2)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(2)
    expect(d.disposed).toBe(false)
  })

  it('the barrier clears a real fake FBO before deleting its borrowed depth storage', () => {
    const f = setup(),
      d = depth(),
      record = f.manager.get(d),
      framebuffer = f.gl.createFramebuffer()
    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, framebuffer)
    f.gl.framebufferRenderbuffer(
      f.gl.FRAMEBUFFER,
      f.gl.DEPTH_ATTACHMENT,
      f.gl.RENDERBUFFER,
      record.handle
    )
    f.beforeDelete.mockImplementationOnce((value) => {
      expect(value).toBe(record)
      f.gl.deleteFramebuffer(framebuffer)
      return undefined
    })
    f.clearCommands()
    f.manager.release(d)
    expect(
      f.commands.filter((c) => c.operation.startsWith('delete')).map((c) => c.operation)
    ).toEqual(['deleteFramebuffer', 'deleteRenderbuffer'])
    expect(d.sceneReferenceCount).toBe(0)
  })

  it('Resource cleanup remains pending after delete failure and retry completes once', () => {
    const f = setup(),
      d = depth()
    f.manager.get(d)
    f.injectOnce('deleteRenderbuffer', { kind: 'throw', cause: new Error('delete') })
    expect(() => d.dispose()).toThrow(CleanupFailureError)
    expect(d.cleanupState).toBe('failed')
    expect(() => f.manager.get(d)).toThrow(ResourceDisposedError)
    d.dispose()
    d.dispose()
    expect(d.cleanupState).toBe('complete')
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(2)
  })

  it.each(['createRenderbuffer', 'renderbufferStorage'] as const)(
    'Resource.dispose during %s cannot finish before candidate cleanup',
    (operation) => {
      const f = setup(),
        d = depth()
      const disposeDuring = () => {
        expect(() => d.dispose()).toThrow(CleanupFailureError)
        expect(d.cleanupState).toBe('failed')
      }
      if (operation === 'createRenderbuffer') {
        const create = f.api.createRenderbuffer.getMockImplementation()!
        f.api.createRenderbuffer.mockImplementationOnce(() => {
          disposeDuring()
          return create()
        })
      } else {
        const allocate = f.api.renderbufferStorage.getMockImplementation()!
        f.api.renderbufferStorage.mockImplementationOnce((...args) => {
          disposeDuring()
          allocate(...args)
        })
      }
      expect(() => f.manager.get(d)).toThrow(ResourceDisposedError)
      expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
      d.dispose()
      expect(d.cleanupState).toBe('complete')
    }
  )

  it('disposal during preflight is observed before any allocation', () => {
    const f = setup(),
      d = depth(),
      query = f.api.getParameter.getMockImplementation()!
    f.api.getParameter.mockImplementationOnce((name) => {
      expect(() => d.dispose()).toThrow(CleanupFailureError)
      return query(name)
    })
    expect(() => f.manager.get(d)).toThrow(ResourceDisposedError)
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    d.dispose()
    expect(d.cleanupState).toBe('complete')
  })

  it.each(['release', 'dispose'] as const)(
    'caught manager %s during storage still cancels publication',
    (action) => {
      const f = setup(),
        d = depth()
      f.api.renderbufferStorage.mockImplementationOnce(() => {
        expect(() => (action === 'release' ? f.manager.release(d) : f.manager.dispose())).toThrow(
          CleanupFailureError
        )
        expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      })
      expect(() => f.manager.get(d)).toThrow(WebGLBackendDisposedError)
      expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
      if (action === 'release') f.manager.get(d)
      else expect(() => f.manager.get(d)).toThrow(WebGLBackendDisposedError)
    }
  )

  it('recursive get during preflight cannot allocate a second candidate', () => {
    const f = setup(),
      d = depth(),
      query = f.api.getParameter.getMockImplementation()!
    f.api.getParameter.mockImplementationOnce((name) => {
      expect(() => f.manager.get(d)).toThrow(WebGLOperationError)
      return query(name)
    })
    f.manager.get(d)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(1)
  })

  it('release reentry and Resource.dispose during deletion retain a completion barrier', () => {
    const f = setup(),
      d = depth()
    f.manager.get(d)
    const remove = f.api.deleteRenderbuffer.getMockImplementation()!
    f.api.deleteRenderbuffer.mockImplementationOnce((handle) => {
      expect(() => f.manager.release(d)).toThrow(CleanupFailureError)
      expect(() => d.dispose()).toThrow(CleanupFailureError)
      remove(handle)
    })
    f.manager.release(d)
    d.dispose()
    expect(d.cleanupState).toBe('complete')
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })

  it('manager closing survives partial failure and only remaining entries are retried', () => {
    const f = setup(),
      a = depth(),
      b = depth(),
      aRecord = f.manager.get(a),
      bRecord = f.manager.get(b)
    const remove = f.api.deleteRenderbuffer.getMockImplementation()!
    f.api.deleteRenderbuffer.mockImplementationOnce(remove).mockImplementationOnce(() => {
      throw new Error('second delete')
    })
    expect(() => f.manager.dispose()).toThrow(CleanupFailureError)
    expect(() => f.manager.get(a)).toThrow(WebGLBackendDisposedError)
    f.manager.dispose()
    f.manager.dispose()
    expect(f.api.deleteRenderbuffer.mock.calls.map((args) => args[0])).toEqual([
      aRecord.handle,
      bRecord.handle,
      bRecord.handle
    ])
    expect(a.disposed).toBe(false)
    expect(b.disposed).toBe(false)
    f.api.deleteRenderbuffer.mockClear()
    a.dispose()
    b.dispose()
    expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
  })

  it('coordinator availability closes previously held normal access but allows cleanup', () => {
    let closed = false
    const f = setup({
      assertAvailable: () => {
        if (closed) throw new WebGLBackendDisposedError('closed')
      }
    })
    const d = depth(),
      record = f.manager.get(d)
    closed = true
    expect(() => f.manager.get(d)).toThrow(WebGLBackendDisposedError)
    expect(() => f.manager.assertRecordUsable(record)).toThrow(WebGLBackendDisposedError)
    f.manager.dispose()
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })

  it('foreign and released records remain unavailable without creating a replacement', () => {
    const a = setup(),
      b = setup(),
      d = depth(),
      old = a.manager.get(d)
    expect(() => a.manager.assertRecordUsable(b.manager.get(d))).toThrow(WebGLOperationError)
    a.manager.release(d)
    expect(() => a.manager.assertRecordUsable(old)).toThrow(WebGLOperationError)
    const current = a.manager.get(d)
    expect(() => a.manager.assertRecordUsable(old)).toThrow(WebGLOperationError)
    a.manager.assertRecordUsable(current)
    expect(a.api.createRenderbuffer).toHaveBeenCalledTimes(2)
  })
})

describe('WebGL1DepthBufferManager generation', () => {
  it.each(['createRenderbuffer', 'renderbufferStorage', 'restore'] as const)(
    'loss during %s forbids every subsequent GL operation even after physical restore',
    (operation) => {
      const f = setup(),
        d = depth()
      const lose = () => {
        f.generation.invalidate()
        f.clearCommands()
      }
      if (operation === 'createRenderbuffer') {
        const create = f.api.createRenderbuffer.getMockImplementation()!
        f.api.createRenderbuffer.mockImplementationOnce(() => {
          const result = create()
          lose()
          return result
        })
      } else if (operation === 'renderbufferStorage')
        f.api.renderbufferStorage.mockImplementationOnce(lose)
      else {
        const bind = f.api.bindRenderbuffer.getMockImplementation()!
        f.api.bindRenderbuffer.mockImplementationOnce(bind).mockImplementationOnce(lose)
      }
      expect(() => f.manager.get(d)).toThrow(WebGLContextLostError)
      f.restore()
      expect(() => f.manager.get(d)).toThrow(WebGLContextLostError)
      d.dispose()
      expect(f.commands.filter((c) => c.operation !== 'isContextLost')).toHaveLength(0)
      expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
    }
  )

  it('physical loss latches permanently; a new manager can allocate the same live CPU resource', () => {
    const f = setup(),
      d = depth(),
      old = f.manager.get(d)
    f.setLost(true)
    expect(() => f.manager.get(d)).toThrow(WebGLContextLostError)
    f.restore()
    const next = new WebGL1DepthBufferManager(f.gl, new WebGL1ResourceGeneration(f.gl), {
      invalidateState: () => undefined,
      assertAvailable: () => {},
      beforeDelete: () => undefined
    })
    const record = next.get(d)
    expect(record.handle).not.toBe(old.handle)
    expect(record.generation).not.toBe(old.generation)
    f.clearCommands()
    f.manager.release(d)
    f.manager.dispose()
    expect(f.commands.filter((c) => c.operation !== 'isContextLost')).toHaveLength(0)
    next.assertRecordUsable(record)
  })

  it('an old pending CPU listener cannot delete new-generation storage', () => {
    const f = setup(),
      d = depth()
    f.manager.get(d)
    f.injectOnce('deleteRenderbuffer', { kind: 'throw', cause: new Error('old cleanup') })
    expect(() => d.dispose()).toThrow(CleanupFailureError)
    f.manager.invalidateForContextLoss()
    f.restore()
    const next = new WebGL1DepthBufferManager(f.gl, new WebGL1ResourceGeneration(f.gl), {
      invalidateState: () => undefined,
      assertAvailable: () => {},
      beforeDelete: () => undefined
    })
    const current = next.get(depth())
    f.clearCommands()
    d.dispose()
    expect(d.cleanupState).toBe('complete')
    expect(f.commands.filter((c) => c.operation !== 'isContextLost')).toHaveLength(0)
    next.assertRecordUsable(current)
  })

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
    'preserves %s failure during %s including %s concurrent with loss',
    (phase, operation, kind) => {
      const f = setup(),
        d = depth(),
        original = new Error('storage'),
        cleanup = kind === 'error' ? new Error('cleanup') : undefined
      if (operation === 'release') f.manager.get(d)
      else f.injectOnce('renderbufferStorage', { kind: 'throw', cause: original })
      const fail = () => {
        f.generation.invalidate()
        f.clearCommands()
        throw cleanup
      }
      if (phase === 'dependency') f.beforeDelete.mockImplementationOnce(fail)
      else f.api.deleteRenderbuffer.mockImplementationOnce(fail)
      const failure = caught(() =>
        operation === 'create' ? f.manager.get(d) : f.manager.release(d)
      )
      expect(causes(failure)).toContain(cleanup)
      if (operation === 'create') expect(causes(failure)).toContain(original)
      expect(causes(failure).some((value) => value instanceof WebGLContextLostError)).toBe(true)
      f.restore()
      f.manager.dispose()
      d.dispose()
      expect(f.commands.filter((c) => c.operation !== 'isContextLost')).toHaveLength(0)
    }
  )

  it('pure loss while deleting abandons responsibility without reporting a business failure', () => {
    const f = setup(),
      d = depth()
    f.manager.get(d)
    f.api.deleteRenderbuffer.mockImplementationOnce(() => {
      f.generation.invalidate()
    })
    expect(() => f.manager.release(d)).not.toThrow()
    f.restore()
    d.dispose()
    expect(d.cleanupState).toBe('complete')
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })
})
