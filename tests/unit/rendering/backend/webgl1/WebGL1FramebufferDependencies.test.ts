import { describe, expect, it } from 'vitest'
import { CleanupFailureError, WebGLContextLostError } from '@/rendering/core/errors'
import {
  fixture,
  texture,
  depth,
  target,
  view,
  caught,
  causes
} from '../fakes/createFramebufferFixture'

describe('FBO dependency barriers', () => {
  it('F01 D03 shares storage across targets and releases only the requested FBO', () => {
    const f = fixture(),
      p = texture(),
      d = depth(),
      a = target([p], d),
      b = target([p], d)
    const ra = f.targets.get(a),
      rb = f.targets.get(b)
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(1)
    expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
    a.dispose()
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[ra.framebuffer]])
    expect(f.targets.get(b)).toBe(rb)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
    expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
    expect([p.disposed, d.disposed]).toEqual([false, false])
    expect([p.sceneReferenceCount, d.sceneReferenceCount]).toEqual([0, 0])
  })
  it.each(['texture', 'depth'] as const)(
    'D01 %s release retries only unfinished dependents before storage',
    (kind) => {
      const f = fixture(),
        p = texture(),
        d = depth(),
        a = target([p], d),
        b = target([p], d)
      const ra = f.targets.get(a),
        rb = f.targets.get(b),
        original = f.api.deleteFramebuffer.getMockImplementation()!
      f.api.deleteFramebuffer.mockImplementationOnce(original).mockImplementationOnce(() => {
        throw new Error('FB pending')
      })
      const release = () => (kind === 'texture' ? f.textures.release(p) : f.depths.release(d))
      expect(release).toThrow(CleanupFailureError)
      expect(f.api.deleteTexture).not.toHaveBeenCalled()
      expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      release()
      expect(f.api.deleteFramebuffer.mock.calls).toEqual([
        [ra.framebuffer],
        [rb.framebuffer],
        [rb.framebuffer]
      ])
      const deleteStorage = kind === 'texture' ? f.api.deleteTexture : f.api.deleteRenderbuffer
      expect(deleteStorage).toHaveBeenCalledTimes(1)
      expect(f.attachments.size).toBe(0)
    }
  )
  it('D02 clears every reverse edge after FBO deletion', () => {
    const f = fixture(),
      p = texture(),
      q = texture(),
      d = depth(),
      t = target([p, q], d)
    const r = f.targets.get(t)
    f.textures.release(p)
    f.textures.release(q)
    f.depths.release(d)
    f.targets.release(t)
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[r.framebuffer]])
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })
  it('D04 publishes new revision before retrying old cleanup without allocating f2', () => {
    const f = fixture(),
      p = texture(),
      q = texture(),
      t = target([p]),
      old = f.targets.get(t)
    t.replaceAttachments({ colors: [view(q)] })
    f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('old') })
    expect(() => f.targets.get(t)).toThrow(CleanupFailureError)
    expect(() => f.targets.assertRecordUsable(old)).toThrow()
    const fresh = f.targets.get(t)
    expect(fresh.revision).toBe(1)
    expect(fresh.colors[0]!.storage.texture).toBe(q)
    expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
    f.textures.release(p)
    expect(f.targets.get(t)).toBe(fresh)
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[old.framebuffer], [old.framebuffer]])
  })
  it.each(['texture', 'depth'] as const)(
    'D05 failed rollback preserves %s barrier until candidate deletion',
    (kind) => {
      const f = fixture(),
        p = texture(),
        d = depth(),
        t = target([p], d)
      f.injectOnce('framebufferRenderbuffer', { kind: 'throw', cause: new Error('attach') })
      f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('rollback') })
      expect(caught(() => f.targets.get(t))).toBeInstanceOf(AggregateError)
      f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('retry') })
      const resource = kind === 'texture' ? p : d
      expect(() => resource.dispose()).toThrow(CleanupFailureError)
      expect(resource.cleanupState).toBe('failed')
      expect(f.api.deleteTexture).not.toHaveBeenCalled()
      expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      resource.dispose()
      expect(resource.cleanupState).toBe('complete')
      expect(f.attachments.size).toBe(0)
      expect(
        kind === 'texture' ? f.api.deleteTexture : f.api.deleteRenderbuffer
      ).toHaveBeenCalledTimes(1)
    }
  )
  it.each(['texture', 'target', 'depth'] as const)(
    'D06 synchronous %s dispose while attaching cannot complete or publish',
    (kind) => {
      const f = fixture(),
        p = texture(),
        d = depth(),
        t = target([p], d),
        resource = kind === 'texture' ? p : kind === 'depth' ? d : t
      const attach = f.api.framebufferTexture2D.getMockImplementation()!
      f.api.framebufferTexture2D.mockImplementationOnce((...args) => {
        attach(...args)
        expect(() => resource.dispose()).toThrow(CleanupFailureError)
        expect(resource.cleanupState).toBe('failed')
        expect(f.api.deleteTexture).not.toHaveBeenCalled()
        expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      })
      expect(() => f.targets.get(t)).toThrow()
      expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
      resource.dispose()
      expect(resource.cleanupState).toBe('complete')
    }
  )
  it.each(['second color', 'depth'] as const)(
    'D06 records first edge before allocating %s',
    (next) => {
      const f = fixture(),
        p = texture(),
        q = texture(),
        d = depth(),
        t = next === 'depth' ? target([p], d) : target([p, q])
      f.textures.get(p)
      const releaseFirst = () => {
        expect(() => f.textures.release(p)).toThrow(CleanupFailureError)
        expect(f.api.deleteTexture).not.toHaveBeenCalled()
      }
      if (next === 'depth') {
        const create = f.api.createRenderbuffer.getMockImplementation()!
        f.api.createRenderbuffer.mockImplementationOnce(() => {
          releaseFirst()
          return create()
        })
      } else {
        const create = f.api.createTexture.getMockImplementation()!
        f.api.createTexture.mockImplementationOnce(() => {
          releaseFirst()
          return create()
        })
      }
      expect(() => f.targets.get(t)).toThrow()
      expect(f.api.createFramebuffer).not.toHaveBeenCalled()
      expect(f.api.framebufferTexture2D).not.toHaveBeenCalled()
      f.textures.release(p)
      expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
    }
  )
  it.each(['replace', 'release', 'dispose manager'] as const)(
    'D07 %s during create prevents stale publication',
    (mode) => {
      const f = fixture(),
        p = texture(),
        t = target([p]),
        create = f.api.createFramebuffer.getMockImplementation()!
      f.api.createFramebuffer.mockImplementationOnce(() => {
        const h = create()
        if (mode === 'replace') t.replaceAttachments({ colors: [view(texture())] })
        else
          expect(() => (mode === 'release' ? f.targets.release(t) : f.targets.dispose())).toThrow(
            CleanupFailureError
          )
        return h
      })
      expect(() => f.targets.get(t)).toThrow()
      expect(f.api.framebufferTexture2D).not.toHaveBeenCalled()
      expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
      if (mode !== 'dispose manager') expect(f.targets.get(t).target).toBe(t)
      else expect(() => f.targets.get(t)).toThrow()
    }
  )
  it('D07 sticky loss abandons candidates and never restores old bindings after physical restore', () => {
    const f = fixture(),
      p = texture(),
      t = target([p]),
      attach = f.api.framebufferTexture2D.getMockImplementation()!
    f.api.framebufferTexture2D.mockImplementationOnce((...args) => {
      attach(...args)
      f.setLost(true)
    })
    expect(
      causes(caught(() => f.targets.get(t))).some((c) => c instanceof WebGLContextLostError)
    ).toBe(true)
    const n = f.commands.length
    f.restore()
    expect(() => f.targets.get(t)).toThrow(WebGLContextLostError)
    p.dispose()
    t.dispose()
    f.targets.dispose()
    expect(f.commands.slice(n)).toHaveLength(0)
  })
  it('D08 old concrete record cannot invalidate a reallocated record of the same CPU resource', () => {
    const f = fixture(),
      p = texture(),
      t = target([p]),
      old = f.targets.get(t).colors[0]!.storage
    f.textures.release(p)
    const fresh = f.targets.get(t)
    expect(fresh.colors[0]!.storage).not.toBe(old)
    f.api.deleteFramebuffer.mockClear()
    f.targets.releaseTexture(old)
    expect(f.targets.get(t)).toBe(fresh)
    expect(f.api.deleteFramebuffer).not.toHaveBeenCalled()
    expect(() => f.targets.releaseTexture({ ...fresh.colors[0]!.storage })).toThrow()
    expect(f.api.deleteFramebuffer).not.toHaveBeenCalled()
  })
  it('dispose retries current and retired FBOs without destroying borrowed storage', () => {
    const f = fixture(),
      t = target(),
      old = f.targets.get(t)
    t.replaceAttachments({ colors: [view(texture())] })
    f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: undefined })
    expect(() => f.targets.get(t)).toThrow(CleanupFailureError)
    f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: undefined })
    expect(() => f.targets.dispose()).toThrow(CleanupFailureError)
    f.targets.dispose()
    f.targets.dispose()
    expect(f.api.deleteFramebuffer.mock.calls.filter(([h]) => h === old.framebuffer)).toHaveLength(
      3
    )
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
    expect(f.attachments.size).toBe(0)
  })
})

describe('migrated lifecycle regressions', () => {
  it('release reentered by CPU dispose preserves a pending completion listener', () => {
    const f = fixture(),
      t = target(),
      r = f.targets.get(t),
      remove = f.api.deleteFramebuffer.getMockImplementation()!
    f.api.deleteFramebuffer.mockImplementationOnce((h) => {
      expect(() => t.dispose()).toThrow(CleanupFailureError)
      expect(t.cleanupState).toBe('failed')
      remove(h)
    })
    f.targets.release(t)
    expect(t.cleanupState).toBe('failed')
    t.dispose()
    expect(t.cleanupState).toBe('complete')
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[r.framebuffer]])
  })
  it('manager dispose reentry must fail until the outer deletion can finish', () => {
    const f = fixture(),
      t = target()
    f.targets.get(t)
    f.api.deleteFramebuffer.mockImplementationOnce(() => f.targets.dispose())
    expect(() => f.targets.dispose()).toThrow(CleanupFailureError)
    expect(() => f.targets.get(t)).toThrow()
    f.targets.dispose()
    expect(f.attachments.size).toBe(0)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
  })
  it('repeated retired deletion failures do not allocate a third FBO', () => {
    const f = fixture(),
      t = target(),
      old = f.targets.get(t)
    t.replaceAttachments({ colors: [view(texture())] })
    for (let i = 0; i < 3; i++) {
      f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('pending') })
      expect(() => f.targets.get(t)).toThrow(CleanupFailureError)
      expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
    }
    expect(f.targets.get(t).framebuffer).not.toBe(old.framebuffer)
    expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
  })
  it('query-time loss wins over a null capability limit', () => {
    const f = fixture(),
      query = f.api.getParameter.getMockImplementation()!
    f.api.getParameter.mockImplementation((n) => {
      if (n === f.gl.MAX_TEXTURE_SIZE) {
        f.setLost(true)
        return null
      }
      return query(n)
    })
    expect(() => f.targets.get(target())).toThrow(WebGLContextLostError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })
  it.each(['pure loss', 'error', 'undefined'] as const)(
    'cleanup preserves %s while stopping all subsequent GL',
    (mode) => {
      const f = fixture(),
        p = texture(),
        t = target([p])
      f.targets.get(t)
      const original = mode === 'error' ? new Error('delete') : undefined
      f.api.deleteFramebuffer.mockImplementationOnce(() => {
        f.setLost(true)
        if (mode !== 'pure loss') throw original
      })
      if (mode === 'pure loss') f.targets.release(t)
      else {
        const failure = caught(() => f.targets.release(t))
        expect(causes(failure)).toContain(original)
        expect(causes(failure).some((x) => x instanceof WebGLContextLostError)).toBe(true)
      }
      const n = f.commands.length
      f.restore()
      f.targets.release(t)
      t.dispose()
      p.dispose()
      expect(f.commands.slice(n)).toHaveLength(0)
      expect(f.api.deleteTexture).not.toHaveBeenCalled()
    }
  )
})

describe('review D04 regression', () => {
  it.each(['texture', 'depth'] as const)(
    'releasing retired %s while new current exists preserves the already published FBO',
    (kind) => {
      const f = fixture(),
        p0 = texture(),
        p1 = texture(),
        d0 = depth(),
        d1 = depth(),
        t = target([p0], d0)
      const old = f.targets.get(t)
      t.replaceAttachments({ colors: [view(p1)], depth: d1 })
      f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('retired pending') })
      expect(() => f.targets.get(t)).toThrow(CleanupFailureError)
      expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
      const published = f.api.createFramebuffer.mock.results[1]!.value
      // No get here: old retired and new current must still coexist when storage release begins.
      const release = () => (kind === 'texture' ? f.textures.release(p0) : f.depths.release(d0))
      f.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('still pending') })
      expect(release).toThrow(CleanupFailureError)
      expect(f.api.deleteTexture).not.toHaveBeenCalled()
      expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      release()
      expect(f.api.deleteFramebuffer.mock.calls).toEqual([
        [old.framebuffer],
        [old.framebuffer],
        [old.framebuffer]
      ])
      const fresh = f.targets.get(t)
      expect(fresh.framebuffer).toBe(published)
      expect(fresh.colors[0]!.storage.texture).toBe(p1)
      expect(fresh.depth!.depth).toBe(d1)
      expect(f.api.createFramebuffer).toHaveBeenCalledTimes(2)
      expect(f.api.deleteTexture).toHaveBeenCalledTimes(kind === 'texture' ? 1 : 0)
      expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(kind === 'depth' ? 1 : 0)
    }
  )
})
