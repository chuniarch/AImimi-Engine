import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebGL1ResourceManager } from '@/rendering/backend/webgl1/WebGL1ResourceManager'
import {
  WebGLBackendDisposedError,
  WebGLContextLostError,
  CleanupFailureError,
  ResourceDisposedError
} from '@/rendering/core/errors'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { Geometry } from '@/rendering/resources/Geometry'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { createFakeWebGL1StorageContext } from '../fakes/createFakeWebGL1StorageContext'
import { createFakeWebGL1VertexInputContext } from '../fakes/createFakeWebGL1VertexInputContext'
import { texture, depth, target, caught, causes } from '../fakes/createFramebufferFixture'

/** Real coordinator and all six Managers; only the GL protocol boundary is a fake. */
function setup(withOES = true) {
  const storage = createFakeWebGL1StorageContext(),
    vertex = createFakeWebGL1VertexInputContext(withOES)
  const vertexParameters: readonly number[] = [
    vertex.gl.CURRENT_PROGRAM,
    vertex.gl.ARRAY_BUFFER_BINDING,
    vertex.gl.ELEMENT_ARRAY_BUFFER_BINDING,
    vertex.oes.VERTEX_ARRAY_BINDING_OES
  ]
  const gl = {
    ...vertex.gl,
    ...storage.gl,
    isContextLost: () => vertex.gl.isContextLost() || storage.gl.isContextLost(),
    getError: () => {
      const e = vertex.gl.getError()
      return e !== vertex.gl.NO_ERROR ? e : storage.gl.getError()
    },
    getParameter: (p: number): unknown =>
      vertexParameters.includes(p) ? vertex.gl.getParameter(p) : storage.gl.getParameter(p)
  } as WebGLRenderingContext
  const caps = {
    ...vertex.capabilities,
    drawBuffers: storage.mrt,
    depthTexture: null,
    textureFloat: null,
    textureFloatLinear: null,
    colorBufferFloat: null,
    fboRenderMipmap: null,
    maxVertexTextureUnits: 0,
    maxCombinedTextureUnits: 8,
    shaderTextureLod: null,
    maxTextureUnits: 8
  }
  const hooks = { invalidateState: vi.fn(() => undefined) }
  const resources = new WebGL1ResourceManager(gl, caps, hooks)
  const members = {
    vertexInputs: resources.vertexInputs,
    renderTargets: resources.renderTargets,
    textures: resources.textures,
    depthBuffers: resources.depthBuffers,
    geometries: resources.geometries,
    programs: resources.programs
  }
  // Fails at the missing public owner before any GPU allocation, rather than an incidental undefined call.
  expect(members.depthBuffers).toBeDefined()
  return { storage, vertex, gl, caps, hooks, resources, members }
}
function source() {
  return new DataTexture2D({
    label: 'S',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    source: { width: 1, height: 1, data: new Uint8Array([12, 34, 56, 255]) }
  })
}
function populate(f: ReturnType<typeof setup>) {
  const p = texture(),
    d = depth(),
    t = target([p], d),
    s = source()
  const g = new Geometry({
    attributes: { position: new VertexAttribute({ data: new Float32Array(9), itemSize: 3 }) },
    indices: new Uint16Array([0, 1, 2])
  })
  const shader = new ShaderModule({
    name: 'lifecycle',
    language: 'glsl-es-100',
    vertexSource: 'attribute vec3 position; void main(){gl_Position=vec4(position,1.0);}',
    fragmentSource: 'precision mediump float; void main(){gl_FragColor=vec4(1.0);}'
  })
  const geometry = f.members.geometries.get(g),
    program = f.members.programs.get(shader),
    framebuffer = f.members.renderTargets.get(t),
    uploaded = f.members.textures.get(s)
  f.members.vertexInputs.bind(g, geometry, program)
  return { p, d, t, s, g, shader, geometry, program, framebuffer, uploaded }
}
function observeDisposal(f: ReturnType<typeof setup>) {
  const order: string[] = []
  for (const [name, manager] of Object.entries(f.members)) {
    const dispose = manager.dispose.bind(manager)
    vi.spyOn(manager, 'dispose').mockImplementation(() => {
      order.push(name)
      dispose()
    })
  }
  return order
}
afterEach(() => vi.restoreAllMocks())

describe('C3 L01 real disposal order and dependency wiring', () => {
  it.each([true, false])('L01 closes six populated managers in dependency order, OES=%s', (oes) => {
    const f = setup(oes),
      c = populate(f),
      order = observeDisposal(f)
    const calls: string[] = []
    for (const op of ['deleteFramebuffer', 'deleteTexture', 'deleteRenderbuffer'] as const) {
      const remove = f.storage.api[op].getMockImplementation()!
      f.storage.api[op].mockImplementation((h) => {
        calls.push(op)
        remove(h)
      })
    }
    f.resources.dispose()
    f.resources.dispose()
    expect(order).toEqual([
      'vertexInputs',
      'renderTargets',
      'textures',
      'depthBuffers',
      'geometries',
      'programs'
    ])
    expect(calls).toEqual([
      'deleteFramebuffer',
      'deleteTexture',
      'deleteTexture',
      'deleteRenderbuffer'
    ])
    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
    expect(f.vertex.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(oes ? 1 : 0)
    for (const r of [c.p, c.d, c.t, c.s, c.g, c.shader]) {
      expect(r.disposed).toBe(false)
      expect(r.sceneReferenceCount).toBe(0)
    }
    expect(c.framebuffer.colors[0]!.storage).toBeDefined()
  })
  it('L01 failed FBO deletion stops all later owners and retries from FBO', () => {
    const f = setup(),
      c = populate(f),
      order = observeDisposal(f)
    f.storage.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('FBO pending') })
    expect(() => f.resources.dispose()).toThrow(CleanupFailureError)
    expect(order).toEqual(['vertexInputs', 'renderTargets'])
    expect(f.storage.api.deleteTexture).not.toHaveBeenCalled()
    expect(f.storage.api.deleteRenderbuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    f.resources.dispose()
    expect(order).toEqual([
      'vertexInputs',
      'renderTargets',
      'renderTargets',
      'textures',
      'depthBuffers',
      'geometries',
      'programs'
    ])
    expect(f.storage.api.deleteFramebuffer.mock.calls).toEqual([
      [c.framebuffer.framebuffer],
      [c.framebuffer.framebuffer]
    ])
  })
  it('L01 failed depth deletion does not repeat texture cleanup or advance to geometry', () => {
    const f = setup()
    populate(f)
    const order = observeDisposal(f)
    f.storage.injectOnce('deleteRenderbuffer', { kind: 'throw', cause: new Error('RBO pending') })
    expect(() => f.resources.dispose()).toThrow(CleanupFailureError)
    expect(order).toEqual(['vertexInputs', 'renderTargets', 'textures', 'depthBuffers'])
    expect(f.storage.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    f.resources.dispose()
    expect(order).toEqual([
      'vertexInputs',
      'renderTargets',
      'textures',
      'depthBuffers',
      'depthBuffers',
      'geometries',
      'programs'
    ])
    expect(f.storage.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(f.storage.api.deleteRenderbuffer).toHaveBeenCalledTimes(2)
  })
  it.each(['texture', 'depth'] as const)(
    'beforeDelete connects %s to every dependent FBO',
    (kind) => {
      const f = setup(),
        c = populate(f),
        other = target([c.p], c.d),
        b = f.members.renderTargets.get(other)
      expect(f.members.textures.get(c.p)).toBe(c.framebuffer.colors[0]!.storage)
      expect(f.members.depthBuffers.get(c.d)).toBe(c.framebuffer.depth)
      const remove = f.storage.api.deleteFramebuffer.getMockImplementation()!
      f.storage.api.deleteFramebuffer.mockImplementationOnce(remove).mockImplementationOnce(() => {
        throw new Error('second FBO')
      })
      const release = () =>
        kind === 'texture' ? f.members.textures.release(c.p) : f.members.depthBuffers.release(c.d)
      expect(release).toThrow(CleanupFailureError)
      expect(f.storage.api.deleteTexture).not.toHaveBeenCalled()
      expect(f.storage.api.deleteRenderbuffer).not.toHaveBeenCalled()
      release()
      expect(f.storage.api.deleteFramebuffer.mock.calls).toEqual([
        [c.framebuffer.framebuffer],
        [b.framebuffer],
        [b.framebuffer]
      ])
      expect(
        kind === 'texture' ? f.storage.api.deleteTexture : f.storage.api.deleteRenderbuffer
      ).toHaveBeenCalledTimes(1)
      f.resources.dispose()
    }
  )
})

describe('C3 L02 closing while an operation is building', () => {
  it('L02 held C3 managers reject both cache hits and new resources after shutdown begins', () => {
    const f = setup(),
      c = populate(f)
    f.storage.injectOnce('deleteFramebuffer', { kind: 'throw', cause: new Error('blocked') })
    expect(() => f.resources.dispose()).toThrow(CleanupFailureError)
    for (const get of [
      () => f.members.textures.get(c.p),
      () => f.members.textures.get(texture()),
      () => f.members.depthBuffers.get(c.d),
      () => f.members.depthBuffers.get(depth()),
      () => f.members.renderTargets.get(c.t),
      () => f.members.renderTargets.get(target())
    ])
      expect(get).toThrow(WebGLBackendDisposedError)
    f.resources.dispose()
  })
  it.each(['texture', 'depth', 'framebuffer'] as const)(
    'L02 standalone %s create callback closes coordinator without publishing',
    (kind) => {
      const f = setup(),
        p = texture(),
        d = depth(),
        t = target([p], d),
        order = observeDisposal(f)
      const op =
        kind === 'texture'
          ? 'createTexture'
          : kind === 'depth'
            ? 'createRenderbuffer'
            : 'createFramebuffer'
      const create = f.storage.api[op].getMockImplementation()!
      f.storage.api[op].mockImplementationOnce(() => {
        const h = create()
        expect(() => f.resources.dispose()).toThrow(CleanupFailureError)
        return h
      })
      const get = () =>
        kind === 'texture'
          ? f.members.textures.get(p)
          : kind === 'depth'
            ? f.members.depthBuffers.get(d)
            : f.members.renderTargets.get(t)
      expect(
        causes(caught(get)).some(
          (c) =>
            c instanceof WebGLBackendDisposedError ||
            (c instanceof Error && c.message.includes('released'))
        )
      ).toBe(true)
      expect(
        kind === 'texture'
          ? f.storage.api.texImage2D
          : kind === 'depth'
            ? f.storage.api.renderbufferStorage
            : f.storage.api.framebufferTexture2D
      ).not.toHaveBeenCalled()
      f.resources.dispose()
      const at =
        kind === 'texture' ? 'textures' : kind === 'depth' ? 'depthBuffers' : 'renderTargets'
      expect(order.filter((x) => x === at)).toHaveLength(2)
      expect(order.filter((x) => x === 'vertexInputs')).toHaveLength(1)
      expect(f.storage.attachments.size).toBe(0)
    }
  )
  it.each(['texture', 'depth'] as const)(
    'L02 closing during FBO %s allocation unwinds its unpublished candidate',
    (kind) => {
      const f = setup(),
        p = texture(),
        d = depth(),
        t = target([p], d)
      const op = kind === 'texture' ? 'texImage2D' : 'renderbufferStorage',
        allocate = f.storage.api[op].getMockImplementation()!
      f.storage.api[op].mockImplementationOnce((...args) => {
        Reflect.apply(allocate, undefined, args)
        expect(() => f.resources.dispose()).toThrow(CleanupFailureError)
      })
      expect(() => f.members.renderTargets.get(t)).toThrow()
      expect(f.storage.api.createFramebuffer).not.toHaveBeenCalled()
      f.resources.dispose()
      expect(f.storage.api.deleteTexture).toHaveBeenCalledTimes(1)
      expect(f.storage.api.deleteRenderbuffer).toHaveBeenCalledTimes(kind === 'depth' ? 1 : 0)
    }
  )
})

describe('C3 L03 old pending CPU listeners after restore', () => {
  it.each(['texture', 'depth', 'target'] as const)(
    'L03 old %s listener completes without touching old or new handles',
    (kind) => {
      const f = setup(),
        c = populate(f),
        resource = kind === 'texture' ? c.p : kind === 'depth' ? c.d : c.t
      f.storage.injectOnce('deleteFramebuffer', {
        kind: 'throw',
        cause: new Error('keep listener pending')
      })
      expect(() => resource.dispose()).toThrow(CleanupFailureError)
      expect(resource.cleanupState).toBe('failed')
      const release = vi.spyOn(
        kind === 'texture'
          ? f.members.textures
          : kind === 'depth'
            ? f.members.depthBuffers
            : f.members.renderTargets,
        'release'
      )
      f.storage.setLost(true)
      f.resources.invalidateForContextLoss()
      f.storage.restore()
      const next = new WebGL1ResourceManager(
        f.gl,
        { ...f.caps },
        { invalidateState: f.hooks.invalidateState }
      )
      const p = texture(),
        d = depth(),
        t = target([p], d),
        fresh = next.renderTargets.get(t)
      const n = f.storage.commands.length
      resource.dispose()
      expect(resource.cleanupState).toBe('complete')
      expect(release).toHaveBeenCalledTimes(1)
      f.resources.dispose()
      expect(f.storage.commands.slice(n)).toHaveLength(0)
      expect(next.renderTargets.get(t)).toBe(fresh)
      expect(fresh.generation).not.toBe(c.framebuffer.generation)
      if (kind === 'texture') expect(() => next.textures.get(c.p)).toThrow(ResourceDisposedError)
      next.dispose()
    }
  )
})

describe('C3 L04 sticky loss without a DOM event', () => {
  it.each(['texture', 'depth', 'framebuffer'] as const)(
    'L04 held %s entry latches loss for every C3 manager',
    (kind) => {
      const f = setup(),
        c = populate(f)
      f.storage.setLost(true)
      const get = () =>
        kind === 'texture'
          ? f.members.textures.get(c.p)
          : kind === 'depth'
            ? f.members.depthBuffers.get(c.d)
            : f.members.renderTargets.get(c.t)
      expect(get).toThrow(WebGLContextLostError)
      f.storage.restore()
      const n = f.storage.commands.length
      for (const action of [
        () => f.members.textures.get(c.s),
        () => f.members.depthBuffers.get(c.d),
        () => f.members.renderTargets.get(c.t),
        () => f.resources.programs
      ])
        expect(action).toThrow(WebGLContextLostError)
      f.resources.dispose()
      expect(f.storage.commands.slice(n)).toHaveLength(0)
      const next = new WebGL1ResourceManager(f.gl, { ...f.caps }, f.hooks)
      f.storage.api.texImage2D.mockClear()
      const sourceRecord = next.textures.get(c.s),
        fresh = next.renderTargets.get(c.t)
      expect(sourceRecord.generation).toBe(fresh.generation)
      expect(fresh.depth!.generation).toBe(fresh.generation)
      expect(fresh.colors[0]!.storage.generation).toBe(fresh.generation)
      expect(fresh.generation).not.toBe(c.framebuffer.generation)
      expect(f.storage.api.texImage2D.mock.calls.map((args) => args[8])).toEqual([
        new Uint8Array([12, 34, 56, 255]),
        null
      ])
      expect(f.storage.api.generateMipmap).not.toHaveBeenCalled()
      next.dispose()
    }
  )
})
