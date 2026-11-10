import { describe, expect, it } from 'vitest'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import {
  IncompleteFramebufferError,
  UnsupportedRenderFeatureError,
  WebGLResourceCreationError,
  RenderTargetUnavailableError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import {
  fixture,
  texture,
  depth,
  target,
  view,
  caught,
  causes
} from '../fakes/createFramebufferFixture'

describe('FBO-only allocation', () => {
  it('caches by identity and revision with frozen records', () => {
    const f = fixture(),
      t = target(),
      r = f.targets.get(t)
    expect(f.targets.get(t)).toBe(r)
    f.targets.assertRecordUsable(r)
    expect(Object.isFrozen(r)).toBe(true)
    expect(Object.isFrozen(r.colors)).toBe(true)
    expect(f.targets.get(target()).framebuffer).not.toBe(r.framebuffer)
    expect(r).toMatchObject({ width: 64, height: 64, revision: 0, generation: f.generation.token })
    expect(() => f.targets.assertRecordUsable({ ...r })).toThrow()
  })
  it('F02 uses fixed cube face and mip FBOs with effective dimensions', () => {
    const f = fixture(),
      p = texture(256, 'uint8', true),
      a = new RenderTarget(
        { colors: [{ kind: 'cube-face', texture: p, face: 'positive-x', mipLevel: 2 }] },
        { label: 'cube' }
      ),
      b = new RenderTarget(
        { colors: [{ kind: 'cube-face', texture: p, face: 'negative-z', mipLevel: 2 }] },
        { label: 'cube' }
      )
    const ra = f.targets.get(a),
      rb = f.targets.get(b)
    expect([ra.width, ra.height]).toEqual([64, 64])
    expect(ra.framebuffer).not.toBe(rb.framebuffer)
    expect(f.api.framebufferTexture2D.mock.calls).toEqual([
      [0x8d40, 0x8ce0, 0x8515, ra.colors[0]!.storage.handle, 2],
      [0x8d40, 0x8ce0, 0x851a, ra.colors[0]!.storage.handle, 2]
    ])
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(f.api.generateMipmap).not.toHaveBeenCalled()
  })
  it('F02 rejects nonzero mip without extension before any creation', () => {
    const f = fixture({ fboRenderMipmap: null }),
      p = texture(256, 'uint8', true),
      t = new RenderTarget(
        { colors: [{ kind: 'cube-face', texture: p, face: 'positive-x', mipLevel: 2 }] },
        { label: 'cube' }
      )
    expect(() => f.targets.get(t)).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.api.createTexture).not.toHaveBeenCalled()
  })
  it.each(['missing', 'colors', 'buffers'] as const)(
    'F03 preflights MRT %s before any creation',
    (mode) => {
      const f = fixture(mode === 'missing' ? { drawBuffers: null } : {}),
        query = f.api.getParameter.getMockImplementation()!
      if (mode !== 'missing')
        f.api.getParameter.mockImplementation((name) =>
          name ===
          (mode === 'colors' ? f.mrt.MAX_COLOR_ATTACHMENTS_WEBGL : f.mrt.MAX_DRAW_BUFFERS_WEBGL)
            ? 1
            : query(name)
        )
      expect(() => f.targets.get(target([texture(), texture()]))).toThrow(
        UnsupportedRenderFeatureError
      )
      expect(f.api.createFramebuffer).not.toHaveBeenCalled()
      expect(f.api.createTexture).not.toHaveBeenCalled()
      expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
    }
  )
  it.each(['textureFloat', 'colorBufferFloat'] as const)(
    'F03 preflights float %s independently',
    (cap) => {
      const f = fixture({ [cap]: null })
      expect(() => f.targets.get(target([texture(64, 'float32')]))).toThrow(
        UnsupportedRenderFeatureError
      )
      expect(f.api.createTexture).not.toHaveBeenCalled()
      expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    }
  )
  it('supports mixed float/uint8 MRT and configures all slots', () => {
    const f = fixture(),
      r = f.targets.get(target([texture(), texture(64, 'float32')], depth()))
    expect(f.api.texImage2D.mock.calls.map((a) => a[7])).toEqual([0x1401, 0x1406])
    expect(f.mrt.drawBuffersWEBGL).toHaveBeenCalledWith([0x8ce0, 0x8ce1])
    expect(r.depth?.width).toBe(64)
  })
  it('supports NPOT nearest targets without MRT or float filtering extensions', () => {
    const f = fixture({ drawBuffers: null, textureFloatLinear: null }),
      r = f.targets.get(target([texture(63, 'float32')]))
    expect(r.width).toBe(63)
    expect(r.depth).toBeNull()
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
  })
  it.each([0, -1, 1.5, NaN, Infinity, null, '4096'])(
    'rejects invalid device limit %s before allocation',
    (value) => {
      const f = fixture(),
        query = f.api.getParameter.getMockImplementation()!
      f.api.getParameter.mockImplementation((name) =>
        name === f.gl.MAX_TEXTURE_SIZE ? value : query(name)
      )
      expect(() => f.targets.get(target())).toThrow(UnsupportedRenderFeatureError)
      expect(f.api.createFramebuffer).not.toHaveBeenCalled()
      expect(f.api.createTexture).not.toHaveBeenCalled()
    }
  )
  it('preflights every color and depth dimension before creating first storage', () => {
    const f = fixture(),
      query = f.api.getParameter.getMockImplementation()!
    f.api.getParameter.mockImplementation((name) =>
      name === f.gl.MAX_RENDERBUFFER_SIZE ? 32 : query(name)
    )
    expect(() => f.targets.get(target([texture()], depth()))).toThrow(UnsupportedRenderFeatureError)
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createRenderbuffer).not.toHaveBeenCalled()
  })
  it.each(['createFramebuffer', 'createTexture', 'createRenderbuffer'] as const)(
    'keeps %s null as creation error',
    (op) => {
      const f = fixture()
      f.injectOnce(op, { kind: 'null' })
      expect(() => f.targets.get(target([texture()], depth()))).toThrow(WebGLResourceCreationError)
    }
  )
  it('F03 F04 incomplete FBO retains successful storage for another target', () => {
    const f = fixture(),
      p = texture(64, 'float32'),
      d = depth(),
      t = target([p], d)
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
    const error = caught(() => f.targets.get(t))
    expect(error).toBeInstanceOf(IncompleteFramebufferError)
    expect(String(error)).toContain('T')
    expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(f.api.deleteTexture).not.toHaveBeenCalled()
    expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
    f.targets.get(target([p], d))
    expect(f.api.createTexture).toHaveBeenCalledTimes(1)
    expect(f.api.createRenderbuffer).toHaveBeenCalledTimes(1)
  })
  it.each([
    'bindFramebuffer',
    'framebufferTexture2D',
    'framebufferRenderbuffer',
    'checkFramebufferStatus'
  ] as const)('distinguishes %s GL error from incompleteness', (op) => {
    const f = fixture()
    f.injectOnce(op, { kind: 'error', code: f.gl.OUT_OF_MEMORY })
    expect(() => f.targets.get(target([texture()], depth()))).toThrow(WebGLOperationError)
    expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    if (op === 'bindFramebuffer') expect(f.api.framebufferTexture2D).not.toHaveBeenCalled()
  })
  it('restores FBO RBO texture and active-unit bindings and external draw buffers', () => {
    const f = fixture(),
      oldF = f.gl.createFramebuffer(),
      oldD = f.gl.createRenderbuffer(),
      oldP = f.gl.createTexture()
    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, oldF)
    f.mrt.drawBuffersWEBGL([0x8ce1])
    f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, oldD)
    f.gl.activeTexture(f.gl.TEXTURE0 + 2)
    f.gl.bindTexture(f.gl.TEXTURE_2D, oldP)
    f.targets.get(target([texture(), texture()], depth()))
    expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(oldF)
    expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(oldD)
    expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 2)
    expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_2D)).toBe(oldP)
    expect(f.drawBuffers.get(oldF)).toEqual([0x8ce1])
  })
  it.each(['error', 'undefined'] as const)(
    'preserves %s business plus independent FBO/RBO restore failures',
    (kind) => {
      const f = fixture(),
        business = kind === 'error' ? new Error('business') : undefined,
        a = new Error('F restore'),
        b = new Error('D restore')
      f.api.framebufferTexture2D.mockImplementationOnce(() => {
        f.injectOnce('bindFramebuffer', { kind: 'throw', cause: a })
        f.injectOnce('bindRenderbuffer', { kind: 'throw', cause: b })
        throw business
      })
      const errors = causes(caught(() => f.targets.get(target())))
      expect(errors).toContain(business)
      expect(errors).toContain(a)
      expect(errors).toContain(b)
      expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    }
  )
  it('rejects restoration-only failure instead of publishing a candidate', () => {
    const f = fixture(),
      check = f.api.checkFramebufferStatus.getMockImplementation()!,
      failure = new Error('restore')
    f.api.checkFramebufferStatus.mockImplementationOnce((...args) => {
      const s = check(...args)
      f.injectOnce('bindFramebuffer', { kind: 'throw', cause: failure })
      return s
    })
    expect(caught(() => f.targets.get(target()))).toBe(failure)
    expect(f.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
  })
  it('D07 rejects rebuilding a bound old FBO before allocation', () => {
    const f = fixture(),
      t = target(),
      old = f.targets.get(t)
    t.replaceAttachments({ colors: [view(texture())] })
    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, old.framebuffer)
    expect(() => f.targets.get(t)).toThrow(RenderTargetUnavailableError)
    expect(f.api.createFramebuffer).toHaveBeenCalledTimes(1)
    f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, null)
    expect(f.targets.get(t).revision).toBe(1)
  })
  it('failed replacement keeps previous group for cleanup but never returns it for a new revision', () => {
    const f = fixture(),
      t = target(),
      old = f.targets.get(t)
    t.replaceAttachments({ colors: [view(texture())] })
    f.injectOnce('createFramebuffer', { kind: 'null' })
    expect(() => f.targets.get(t)).toThrow(WebGLResourceCreationError)
    expect(f.api.deleteFramebuffer).not.toHaveBeenCalled()
    const fresh = f.targets.get(t)
    expect(fresh).not.toBe(old)
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[old.framebuffer]])
  })
})

describe('migrated FBO regressions', () => {
  it.each([0, 1])('incomplete diagnostics retain label and revision %s', (revision) => {
    const f = fixture(),
      t = target()
    if (revision) t.replaceAttachments({ colors: [view(texture())] })
    f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
    const failure = caught(() => f.targets.get(t))
    expect(failure).toBeInstanceOf(IncompleteFramebufferError)
    expect((failure as IncompleteFramebufferError).details).toMatchObject({
      status: 0x8cd6,
      targetLabel: `T (RenderTarget revision ${revision})`
    })
  })
  it('oversized color leaves CPU dimensions unchanged and allocates nothing', () => {
    const f = fixture(),
      t = target([texture(8192)])
    expect(() => f.targets.get(t)).toThrow(UnsupportedRenderFeatureError)
    expect(t.width).toBe(8192)
    expect(f.api.createTexture).not.toHaveBeenCalled()
    expect(f.api.createFramebuffer).not.toHaveBeenCalled()
  })
  it.each(['nearest-linear', 'linear-nearest', 'linear-linear', 'default'] as const)(
    'missing float-linear rejects %s before any creation',
    (mode) => {
      const f = fixture({ textureFloatLinear: null }),
        base = texture(64, 'float32')
      const p = new RenderTexture({
        label: 'float',
        production: 'manual',
        descriptor: base.descriptor,
        ...(mode === 'default'
          ? {}
          : {
              defaultSampler: {
                ...base.defaultSampler,
                minFilter: mode.startsWith('linear') ? 'linear' : 'nearest',
                magFilter: mode.endsWith('linear') ? 'linear' : 'nearest'
              }
            })
      })
      expect(() => f.targets.get(target([p]))).toThrow(UnsupportedRenderFeatureError)
      expect(f.api.createTexture).not.toHaveBeenCalled()
      expect(f.api.createFramebuffer).not.toHaveBeenCalled()
    }
  )
})

describe('migrated allocation failures', () => {
  it.each(['nearest-nearest', 'nearest-linear', 'linear-nearest', 'linear-linear'] as const)(
    'retains requested float filters %s',
    (mode) => {
      const f = fixture(),
        base = texture(64, 'float32'),
        minFilter = mode.startsWith('linear') ? 'linear' : 'nearest',
        magFilter = mode.endsWith('linear') ? 'linear' : 'nearest'
      const p = new RenderTexture({
        label: 'float',
        production: 'manual',
        descriptor: base.descriptor,
        defaultSampler: { ...base.defaultSampler, minFilter, magFilter }
      })
      f.targets.get(target([p]))
      expect(f.api.texParameteri).toHaveBeenCalledWith(
        0x0de1,
        0x2801,
        minFilter === 'linear' ? 0x2601 : 0x2600
      )
      expect(f.api.texParameteri).toHaveBeenCalledWith(
        0x0de1,
        0x2800,
        magFilter === 'linear' ? 0x2601 : 0x2600
      )
    }
  )
  it.each(['success', 'third-null', 'upload-error', 'incomplete'] as const)(
    'four-color %s restores bindings and preserves successful shared storage',
    (mode) => {
      const f = fixture(),
        ps = Array.from({ length: 4 }, () => texture(64, 'float32')),
        t = target(ps, depth())
      const externalF = f.gl.createFramebuffer(),
        externalD = f.gl.createRenderbuffer(),
        externalP = f.gl.createTexture()
      f.gl.bindFramebuffer(f.gl.FRAMEBUFFER, externalF)
      f.gl.bindRenderbuffer(f.gl.RENDERBUFFER, externalD)
      f.gl.activeTexture(f.gl.TEXTURE0 + 2)
      f.gl.bindTexture(f.gl.TEXTURE_2D, externalP)
      f.mrt.drawBuffersWEBGL([0x8ce1])
      if (mode === 'third-null') {
        const create = f.api.createTexture.getMockImplementation()!
        f.api.createTexture
          .mockImplementationOnce(create)
          .mockImplementationOnce(create)
          .mockReturnValueOnce(null)
        expect(() => f.targets.get(t)).toThrow(WebGLResourceCreationError)
        expect(f.api.deleteTexture).not.toHaveBeenCalled()
        expect(f.api.createFramebuffer).toHaveBeenCalledTimes(1)
      } else if (mode === 'upload-error') {
        f.injectOnce('texImage2D', { kind: 'error', code: f.gl.OUT_OF_MEMORY })
        expect(() => f.targets.get(t)).toThrow(WebGLOperationError)
        expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
        expect(f.api.checkFramebufferStatus).not.toHaveBeenCalled()
      } else if (mode === 'incomplete') {
        f.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
        expect(() => f.targets.get(t)).toThrow(IncompleteFramebufferError)
        expect(f.api.deleteTexture).not.toHaveBeenCalled()
        expect(f.api.deleteRenderbuffer).not.toHaveBeenCalled()
      } else {
        const r = f.targets.get(t)
        expect(r.colors).toHaveLength(4)
        expect(f.mrt.drawBuffersWEBGL).toHaveBeenCalledWith([0x8ce0, 0x8ce1, 0x8ce2, 0x8ce3])
      }
      expect(f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING)).toBe(externalF)
      expect(f.gl.getParameter(f.gl.RENDERBUFFER_BINDING)).toBe(externalD)
      expect(f.gl.getParameter(f.gl.ACTIVE_TEXTURE)).toBe(f.gl.TEXTURE0 + 2)
      expect(f.gl.getParameter(f.gl.TEXTURE_BINDING_2D)).toBe(externalP)
      expect(f.drawBuffers.get(externalF)).toEqual([0x8ce1])
      const r = f.targets.get(t)
      expect(f.targets.get(t)).toBe(r)
      expect(f.api.deleteFramebuffer.mock.calls.flat()).not.toContain(externalF)
      expect(f.api.deleteRenderbuffer.mock.calls.flat()).not.toContain(externalD)
      expect(f.api.deleteTexture.mock.calls.flat()).not.toContain(externalP)
    }
  )
  it('CPU release and manager dispose are idempotent and leave borrowed CPU resources usable', () => {
    const f = fixture(),
      p = texture(),
      d = depth(),
      t = target([p], d),
      r = f.targets.get(t)
    t.dispose()
    t.dispose()
    f.targets.dispose()
    f.targets.dispose()
    expect(f.api.deleteFramebuffer.mock.calls).toEqual([[r.framebuffer]])
    p.assertUsable()
    d.assertUsable()
    expect(() => f.targets.get(target())).toThrow()
  })
  it('the same CPU target has separate representations in distinct contexts', () => {
    const a = fixture(),
      b = fixture(),
      t = target([texture(64, 'float32')])
    const x = a.targets.get(t),
      y = b.targets.get(t)
    expect(x.framebuffer).not.toBe(y.framebuffer)
    expect(x.colors[0]!.storage.handle).not.toBe(y.colors[0]!.storage.handle)
    t.dispose()
    expect(a.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(b.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
  })
})

describe('review mixed filter regression', () => {
  it.each([false, true])(
    'byte-linear and float-nearest do not require floatLinear, reversed=%s',
    (reversed) => {
      const f = fixture({ textureFloatLinear: null }),
        base = texture(),
        floatNearest = texture(64, 'float32')
      const byteLinear = new RenderTexture({
        label: 'byte-linear',
        production: 'manual',
        descriptor: base.descriptor
      })
      const colors = reversed ? [floatNearest, byteLinear] : [byteLinear, floatNearest]
      const r = f.targets.get(target(colors))
      expect(r.colors.map((c) => c.storage.texture)).toEqual(colors)
      expect(f.api.texImage2D.mock.calls.map((c) => c[7])).toEqual(
        reversed ? [0x1406, 0x1401] : [0x1401, 0x1406]
      )
      expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2801, 0x2601)
      expect(f.api.texParameteri).toHaveBeenCalledWith(0x0de1, 0x2801, 0x2600)
    }
  )
})
