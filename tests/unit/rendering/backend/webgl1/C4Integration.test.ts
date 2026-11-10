import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { afterEach, expect, it, vi } from 'vitest'
import { IncompleteFramebufferError } from '@/rendering/core/errors'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule, type ShaderModuleOptions } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { createFakeWebGL1BackendContext } from '../fakes/createFakeWebGL1BackendContext'
import { Mat4Tuple } from '@/rendering/core/math/tuples'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * 只把浏览器 GL 边界替换为协议假对象；ShaderModule、Material、Geometry
 * 以及 Backend 内的所有 Manager 均使用正式实现。
 */
function createFixture(
  indexed = false,
  mipmap = false,
  float = false,
  options: {
    shader?: Partial<ShaderModuleOptions>
    vertex?: number
    fragment?: number
    combined?: number
    extensions?: string[]
  } = {}
) {
  const fake = createFakeWebGL1BackendContext()

  if (mipmap) {
    const original = fake.calls.getExtension.getMockImplementation()!
    fake.calls.getExtension.mockImplementation((name) =>
      name === 'OES_fbo_render_mipmap' ? {} : original(name)
    )
  }

  if (float) {
    const original = fake.calls.getExtension.getMockImplementation()!
    fake.calls.getExtension.mockImplementation((name) =>
      name === 'OES_texture_float' ? {} : original(name)
    )
  }
  const parameter = fake.calls.getParameter.getMockImplementation()!
  fake.calls.getParameter.mockImplementation((name) => {
    if (name === fake.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS && options.vertex !== undefined)
      return options.vertex
    if (name === fake.gl.MAX_TEXTURE_IMAGE_UNITS && options.fragment !== undefined)
      return options.fragment
    if (name === fake.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS && options.combined !== undefined)
      return options.combined
    return parameter(name)
  })
  const extension = fake.calls.getExtension.getMockImplementation()!
  fake.calls.getExtension.mockImplementation((name) =>
    options.extensions?.includes(name) ? {} : extension(name)
  )
  // 此 shader 没有 active uniform；三角形只验证 Backend 的故障路径。
  fake.vertex.uniforms.splice(0)

  const backend = new WebGL1Backend(fake.canvas, 'backend-fault-test')
  const shader = new ShaderModule({
    name: 'fault-triangle',
    language: 'glsl-es-100',
    vertexSource: [
      'attribute vec3 position;',
      'void main() { gl_Position = vec4(position, 1.0); }'
    ].join('\n'),
    fragmentSource: [
      'precision mediump float;',
      'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
    ].join('\n'),
    ...options.shader
  })
  const geometry = new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array([-0.8, -0.8, 0, 0.8, -0.8, 0, 0, 0.8, 0]),
        itemSize: 3
      })
    },
    ...(indexed ? { indices: new Uint16Array([0, 1, 2]) } : {})
  })
  const material = new Material({ shaderModule: shader })
  const submission: DrawSubmission = {
    item: { geometry, material, worldMatrix: IDENTITY, castShadow: false },
    view: {
      viewMatrix: IDENTITY,
      projectionMatrix: IDENTITY,
      cameraWorldPosition: [0, 0, 0]
    }
  }

  const fixture = {
    fake,
    backend,
    shader,
    geometry,
    material,
    submission,

    /** Scope 是同步的；callback 结束之后才能检查入口状态是否恢复。 */
    draw(): void {
      backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
        backend.draw(submission)
      })
    }
  }

  cleanups.push(() => {
    backend.dispose()
    material.dispose()
    geometry.dispose()
    shader.dispose()
  })

  return fixture
}

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

import { createRenderTexture } from '@/rendering/resources/RenderTexture'
import { createTextureSamplingBinding } from '@/rendering/resources/TextureSamplingBinding'
function render() {
  return createRenderTexture({
    label: 'P',
    production: 'manual',
    descriptor: {
      dimension: '2d',
      width: 64,
      height: 64,
      mipLevelCount: 1,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'data'
    },
    defaultSampler: { minFilter: 'nearest', magFilter: 'nearest' }
  })
}
function target(texture = render()) {
  return new RenderTarget({ colors: [{ kind: '2d', texture, mipLevel: 0 }] }, { label: 'T' })
}
it('epoch is stable, absent on loss and distinct after restoration and across devices', () => {
  const a = createFixture(),
    b = createFixture()
  const first = a.backend.resourceEpoch
  expect(first).toBeTruthy()
  expect(a.backend.resourceEpoch).toBe(first)
  expect(b.backend.resourceEpoch).not.toBe(first)
  a.fake.loseContext()
  expect(a.backend.resourceEpoch).toBeNull()
  a.fake.restoreContext()
  expect(a.backend.resourceEpoch).toBeTruthy()
  expect(a.backend.resourceEpoch).not.toBe(first)
  a.backend.dispose()
  expect(a.backend.resourceEpoch).toBeNull()
})
it('physical loss without event permanently closes the exposed epoch', () => {
  const f = createFixture()
  f.fake.texture.setLost(true)
  expect(f.backend.resourceEpoch).toBeNull()
  f.fake.texture.setLost(false)
  expect(f.backend.resourceEpoch).toBeNull()
})
it('shared texture identity forbids sampling through a different target', () => {
  const f = createFixture(),
    p = render(),
    a = target(p),
    b = target(p)
  f.fake.vertex.uniforms.push({
    name: 'uMap',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('uMap', { type: 'texture2D', value: b.getColorAttachment(0) })
  f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
    expect(() => f.backend.draw(f.submission)).toThrow(/sample/)
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
  })
})
it('paused ancestor storage release is rejected even without target revision change', () => {
  const f = createFixture(),
    p = render(),
    a = target(p),
    b = target()
  let rejected = false
  expect(() =>
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target: b } }, () => {
        p.dispose()
        try {
          f.backend.draw(f.submission)
        } catch {
          rejected = true
        }
      })
    })
  ).toThrow()
  expect(rejected).toBe(true)
})
it('all samplers are preflighted before allocating or binding any sampled texture', () => {
  const f = createFixture(),
    p = render()
  f.fake.vertex.uniforms.push(
    { name: 'a', type: f.fake.gl.SAMPLER_2D, size: 1, location: {} as WebGLUniformLocation },
    { name: 'b', type: f.fake.gl.SAMPLER_2D, size: 1, location: {} as WebGLUniformLocation }
  )
  f.material.setParameter('a', { type: 'texture2D', value: createTextureSamplingBinding(p) })
  f.material.setParameter('b', {
    type: 'texture2D',
    value: createTextureSamplingBinding(p, { minFilter: 'linear' })
  })
  const before = f.fake.texture.api.createTexture.mock.calls.length
  expect(() => f.draw()).toThrow(/sampler/)
  expect(f.fake.texture.api.createTexture.mock.calls.length).toBe(before)
  expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
})
it('equivalent samplers share storage and later draw can switch filtering without reallocation', () => {
  const f = createFixture(),
    p = render()
  f.fake.vertex.uniforms.push(
    { name: 'a', type: f.fake.gl.SAMPLER_2D, size: 1, location: {} as WebGLUniformLocation },
    { name: 'b', type: f.fake.gl.SAMPLER_2D, size: 1, location: {} as WebGLUniformLocation }
  )
  for (const name of ['a', 'b'])
    f.material.setParameter(name, { type: 'texture2D', value: createTextureSamplingBinding(p) })
  f.draw()
  const count = f.fake.texture.api.texImage2D.mock.calls.length
  for (const name of ['a', 'b'])
    f.material.setParameter(name, {
      type: 'texture2D',
      value: createTextureSamplingBinding(p, { minFilter: 'linear' })
    })
  f.draw()
  expect(f.fake.texture.api.texImage2D.mock.calls.length).toBe(count)
  expect(f.fake.texture.api.texParameteri).toHaveBeenCalledWith(
    f.fake.gl.TEXTURE_2D,
    f.fake.gl.TEXTURE_MIN_FILTER,
    f.fake.gl.LINEAR
  )
})

it('loss during sampler upload stops subsequent uniform GL commands', () => {
  const f = createFixture(),
    p = render()
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('a', { type: 'texture2D', value: p })
  f.draw()
  f.fake.calls.uniform1i.mockClear()
  const original = f.fake.gl.activeTexture.bind(f.fake.gl)
  let armed = false
  f.fake.gl.activeTexture = (unit) => {
    original(unit)
    if (armed) {
      armed = false
      f.fake.loseContext()
      f.fake.texture.setLost(false)
      f.fake.vertex.setLost(false)
    }
  }
  // Arm after prepare's sampler restoration, just before uniform upload.
  const use = f.fake.gl.useProgram.bind(f.fake.gl)
  f.fake.gl.useProgram = (program) => {
    use(program)
    armed = true
  }
  expect(() => f.draw()).toThrow()
  expect(f.fake.calls.uniform1i).not.toHaveBeenCalled()
})
it('nested distinct output permits reading paused ancestor and restores its viewport', () => {
  const f = createFixture(),
    a = target(),
    b = target()
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('a', { type: 'texture2D', value: a.getColorAttachment(0) })
  f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
    const before = f.fake.readSurface()
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: b } }, () => {
      f.backend.draw(f.submission)
    })
    expect(f.fake.readSurface()).toEqual(before)
    expect(() => f.backend.draw(f.submission)).toThrow(/sample/)
  })
})
it('cube mip output uses actual 64x64 dimensions and rejects sampling another face', () => {
  const f = createFixture(false, true),
    p = createRenderTexture({
      label: 'cube',
      production: 'manual',
      descriptor: {
        dimension: 'cube',
        width: 256,
        height: 256,
        mipLevelCount: 9,
        storage: { format: 'rgba', type: 'uint8' },
        colorSpace: 'data'
      }
    })
  const a = new RenderTarget(
    { colors: [{ kind: 'cube-face', texture: p, face: 'positive-x', mipLevel: 2 }] },
    { label: 'cube face' }
  )
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.SAMPLER_CUBE,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('a', { type: 'cubeTexture', value: p })
  f.backend.withRenderSurface({ surface: { kind: 'render-target', target: a } }, () => {
    expect(f.fake.readSurface().viewport).toEqual([0, 0, 64, 64])
    expect(() => f.backend.draw(f.submission)).toThrow(/sample/)
  })
})

it.each(['default', 'source'] as const)(
  'preflight %s capability failure before allocating the earlier sampler',
  (kind) => {
    const f = createFixture(false, false, true)
    const bad =
      kind === 'default'
        ? createRenderTexture({
            label: 'float',
            production: 'manual',
            descriptor: {
              dimension: '2d',
              width: 64,
              height: 64,
              mipLevelCount: 1,
              storage: { format: 'rgba', type: 'float32' },
              colorSpace: 'data'
            },
            defaultSampler: { minFilter: 'linear', magFilter: 'linear' }
          })
        : new DataTexture2D({
            label: 'float-mips',
            storage: { format: 'rgba', type: 'float32' },
            colorSpace: 'data',
            mipmapPolicy: 'generate',
            sampler: { minFilter: 'nearest', magFilter: 'nearest' },
            source: { width: 2, height: 2, data: new Float32Array(16) }
          })
    for (const name of ['a', 'b'])
      f.fake.vertex.uniforms.push({
        name,
        type: f.fake.gl.SAMPLER_2D,
        size: 1,
        location: {} as WebGLUniformLocation
      })
    f.material.setParameter('a', { type: 'texture2D', value: render() })
    f.material.setParameter('b', {
      type: 'texture2D',
      value: createTextureSamplingBinding(bad, { minFilter: 'nearest', magFilter: 'nearest' })
    })
    expect(() => f.draw()).toThrow()
    expect(f.fake.texture.api.createTexture).not.toHaveBeenCalled()
  }
)
it('warm surface binding stops before viewport after synchronous loss', () => {
  const f = createFixture(),
    t = target()
  f.backend.withRenderSurface({ surface: { kind: 'render-target', target: t } }, () => undefined)
  f.fake.calls.viewport.mockClear()
  const bind = f.fake.gl.bindFramebuffer.bind(f.fake.gl)
  let armed = true
  f.fake.gl.bindFramebuffer = (target, handle) => {
    bind(target, handle)
    if (armed) {
      armed = false
      f.fake.loseContext()
      f.fake.texture.setLost(false)
      f.fake.vertex.setLost(false)
    }
  }
  expect(() =>
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target: t } }, () => undefined)
  ).toThrow()
  expect(f.fake.calls.viewport).not.toHaveBeenCalled()
})
it('loss observed only by storage forbids later default-surface GL', () => {
  const f = createFixture()
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('a', { type: 'texture2D', value: render() })
  f.fake.texture.api.texImage2D.mockImplementationOnce(() => {
    f.fake.texture.setLost(true)
  })
  expect(() => f.draw()).toThrow()
  f.fake.texture.setLost(false)
  const before = f.fake.calls.bindFramebuffer.mock.calls.length
  expect(f.backend.resourceEpoch).toBeNull()
  expect(() =>
    f.backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => undefined)
  ).toThrow()
  expect(f.fake.calls.bindFramebuffer.mock.calls.length).toBe(before)
})

function generated(
  dimension: '2d' | 'cube' = '2d',
  width = 4,
  type: 'uint8' | 'float32' = 'uint8'
) {
  const texture = createRenderTexture({
    label: 'generated',
    production: 'generated-from-base',
    descriptor: {
      dimension,
      width,
      height: width,
      mipLevelCount: Math.floor(Math.log2(width)) + 1,
      storage: { format: 'rgba', type },
      colorSpace: 'linear'
    },
    defaultSampler: { minFilter: 'nearest', magFilter: 'nearest' }
  })
  cleanups.push(() => texture.dispose())
  return texture
}
it.each(['2d', 'cube'] as const)(
  'generates %s mips explicitly and reuses the unique storage',
  (dimension) => {
    const { fake, backend } = createFixture()
    const texture = generated(dimension)
    expect(fake.texture.api.generateMipmap).not.toHaveBeenCalled()
    const before = fake.gl.getParameter(
      dimension === '2d' ? fake.gl.TEXTURE_BINDING_2D : fake.gl.TEXTURE_BINDING_CUBE_MAP
    )
    backend.generateMipmaps(texture)
    const uploads = fake.texture.api.texImage2D.mock.calls.length
    backend.generateMipmaps(texture)
    expect(fake.texture.api.generateMipmap).toHaveBeenCalledTimes(2)
    expect(fake.texture.api.generateMipmap).toHaveBeenLastCalledWith(
      dimension === '2d' ? fake.gl.TEXTURE_2D : fake.gl.TEXTURE_CUBE_MAP
    )
    expect(fake.texture.api.createTexture).toHaveBeenCalledTimes(1)
    expect(fake.texture.api.texImage2D).toHaveBeenCalledTimes(uploads)
    expect(
      fake.gl.getParameter(
        dimension === '2d' ? fake.gl.TEXTURE_BINDING_2D : fake.gl.TEXTURE_BINDING_CUBE_MAP
      )
    ).toBe(before)
  }
)
it('rejects manual, disposed, NPOT and unsupported float generation before allocation', () => {
  const { fake, backend } = createFixture()
  const manual = render()
  cleanups.push(() => manual.dispose())
  const dead = generated()
  dead.dispose()
  for (const texture of [manual, dead, generated('2d', 3), generated('2d', 4, 'float32')])
    expect(() => backend.generateMipmaps(texture)).toThrow()
  expect(fake.texture.api.createTexture).not.toHaveBeenCalled()
  expect(fake.texture.api.generateMipmap).not.toHaveBeenCalled()
})
it('rejects explicit generation inside any active surface before allocation', () => {
  const { fake, backend } = createFixture()
  const texture = generated()
  backend.withRenderSurface({ surface: { kind: 'default-framebuffer' } }, () => {
    expect(() => backend.generateMipmaps(texture)).toThrow(/surface is active/)
  })
  expect(fake.texture.api.createTexture).not.toHaveBeenCalled()
})
it('reports mip generation errors, restores bindings and permits retry', () => {
  const { fake, backend } = createFixture()
  const texture = generated()
  fake.texture.api.generateMipmap.mockImplementationOnce(() => fake.texture.setError(0x0502))
  expect(() => backend.generateMipmaps(texture)).toThrow()
  expect(fake.gl.getParameter(fake.gl.TEXTURE_BINDING_2D)).toBeNull()
  expect(() => backend.generateMipmaps(texture)).not.toThrow()
  expect(fake.texture.api.createTexture).toHaveBeenCalledTimes(1)
})
it('stops a lost mip command and allocates new storage only after restore', () => {
  const { fake, backend } = createFixture()
  const texture = generated()
  const epoch = backend.resourceEpoch
  fake.texture.api.generateMipmap.mockImplementationOnce(() => {
    fake.loseContext()
  })
  expect(() => backend.generateMipmaps(texture)).toThrow()
  expect(backend.resourceEpoch).toBeNull()
  expect(() => backend.generateMipmaps(texture)).toThrow()
  fake.restoreContext()
  backend.generateMipmaps(texture)
  expect(backend.resourceEpoch).not.toBe(epoch)
  expect(fake.texture.api.createTexture).toHaveBeenCalledTimes(2)
})

function samplerFixture(
  stage: 'vertex' | 'fragment' | 'both',
  vertex = 0,
  fragment = 8,
  combined = 8
) {
  const f = createFixture(false, false, false, {
    shader: { textureUsage: { a: stage } },
    vertex,
    fragment,
    combined
  })
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.SAMPLER_2D,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  const texture = render()
  cleanups.push(() => texture.dispose())
  f.material.setParameter('a', { type: 'texture2D', value: texture })
  return f
}
it.each([
  ['vertex', 0, 8, 8, 'vertex'],
  ['both', 1, 1, 1, 'combined']
] as const)('rejects %s stage budget before sampled allocation', (stage, v, f, c, reason) => {
  const fixture = samplerFixture(stage, v, f, c)
  expect(() => fixture.draw()).toThrow(new RegExp(reason))
  expect(fixture.fake.texture.api.createTexture).not.toHaveBeenCalled()
  expect(fixture.fake.calls.drawArrays).not.toHaveBeenCalled()
})
it.each(['vertex', 'both'] as const)(
  'accepts %s budget and assigns one unit to shared-stage uniform',
  (stage) => {
    const f = samplerFixture(stage, 1, 1, 2)
    expect(() => f.draw()).not.toThrow()
    expect(f.fake.calls.uniform1i).toHaveBeenCalledWith(expect.anything(), 0)
  }
)
it('counts only active samplers and rejects metadata naming an active non-sampler', () => {
  const f = createFixture(false, false, false, {
    shader: { textureUsage: { unused: 'vertex', a: 'vertex' } }
  })
  f.fake.vertex.uniforms.push({
    name: 'a',
    type: f.fake.gl.FLOAT,
    size: 1,
    location: {} as WebGLUniformLocation
  })
  f.material.setParameter('a', { type: 'float', value: 1 })
  expect(() => f.draw()).toThrow(/sampler/)
})
it('rejects declared explicit LOD before shader compilation, independently of FBO mip support', () => {
  const f = createFixture(false, true, false, { shader: { requiresShaderTextureLod: true } })
  expect(() => f.draw()).toThrow(/EXT_shader_texture_lod/)
  expect(f.fake.gl.createShader).not.toHaveBeenCalled()
})
it('permits declared LOD when negotiated and rechecks it after restore', () => {
  const f = createFixture(false, false, false, {
    shader: { requiresShaderTextureLod: true },
    extensions: ['EXT_shader_texture_lod']
  })
  expect(() => f.draw()).not.toThrow()
  f.fake.loseContext()
  f.fake.calls.getExtension.mockImplementation(() => null)
  f.fake.restoreContext()
  expect(() => f.draw()).toThrow(/EXT_shader_texture_lod/)
})
it('snapshots sampler stage metadata and rejects malformed declarations', () => {
  const usage = { a: 'vertex' as const }
  const f = createFixture(false, false, false, { shader: { textureUsage: usage } })
  expect(f.shader.textureUsage).toEqual(usage)
  expect(f.shader.textureUsage).not.toBe(usage)
  expect(Object.isFrozen(f.shader.textureUsage)).toBe(true)
  for (const textureUsage of [null, [], { a: 'geometry' }, { '': 'vertex' }]) {
    expect(
      () =>
        new ShaderModule({
          name: 'bad',
          language: 'glsl-es-100',
          vertexSource: 'void main(){}',
          fragmentSource: 'void main(){}',
          textureUsage
        } as unknown as ShaderModuleOptions)
    ).toThrow(/textureUsage/)
  }
})

import { GBufferPass } from '@/rendering/passes/GBufferPass'
import {
  createGBufferMaterial,
  createGBufferShaderModule
} from '@/rendering/gbuffer/createGBufferMaterial'
import { RenderList } from '@/rendering/frame/RenderList'
it.each(['direct', 'binding', 'shared-slot'] as const)(
  'GBuffer preflight rejects %s sampling of its actual second output texture',
  (kind) => {
    const f = createFixture()
    const shader = createGBufferShaderModule()
    const pass = new GBufferPass({ shaderModule: shader, label: 'G' })
    const b = pass.target.attachments.colors[1]!.texture
    const other = new RenderTarget(
      { colors: [{ kind: '2d', texture: b, mipLevel: 0 }] },
      { label: 'other' }
    )
    const material = createGBufferMaterial(
      shader,
      kind === 'direct'
        ? b
        : kind === 'binding'
          ? createTextureSamplingBinding(b)
          : other.getColorAttachment(0)
    )
    cleanups.push(() => {
      material.dispose()
      shader.dispose()
      other.dispose()
      pass.dispose()
    })
    expect(() =>
      pass.execute({
        backend: f.backend,
        frame: {
          frameNumber: 1,
          timeSeconds: 0,
          deltaSeconds: 0,
          drawingBufferWidth: 64,
          drawingBufferHeight: 64,
          pixelRatio: 1
        },
        view: f.submission.view,
        renderList: new RenderList([], [{ ...f.submission.item, material }]),
        lights: []
      })
    ).toThrow(/cannot sample this Pass output/)
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    expect(f.fake.texture.api.createTexture).not.toHaveBeenCalled()
  }
)
it('generates float render mips only with the negotiated filterable renderable subset', () => {
  const f = createFixture(false, false, true, {
    extensions: ['OES_texture_float_linear', 'WEBGL_color_buffer_float']
  })
  expect(() => f.backend.generateMipmaps(generated('2d', 4, 'float32'))).not.toThrow()
  expect(f.fake.texture.api.generateMipmap).toHaveBeenCalledTimes(1)
})
it.each(['OES_texture_float', 'OES_texture_float_linear', 'WEBGL_color_buffer_float'])(
  'rejects float mip generation without %s before allocating',
  (missing) => {
    const f = createFixture(false, false, false, {
      extensions: [
        'OES_texture_float',
        'OES_texture_float_linear',
        'WEBGL_color_buffer_float'
      ].filter((name) => name !== missing)
    })
    expect(() => f.backend.generateMipmaps(generated('2d', 4, 'float32'))).toThrow(
      /required|requires/
    )
    expect(f.fake.texture.api.createTexture).not.toHaveBeenCalled()
  }
)
it('does not report success when texture binding restoration fails after mip generation', () => {
  const f = createFixture()
  const texture = generated()
  f.backend.generateMipmaps(texture)
  const original = f.fake.texture.api.bindTexture.getMockImplementation()!
  let armed = false
  f.fake.texture.api.generateMipmap.mockImplementationOnce(() => {
    armed = true
  })
  f.fake.texture.api.bindTexture.mockImplementation((target, handle) => {
    if (armed && handle === null) {
      armed = false
      throw new Error('restore binding failure')
    }
    original(target, handle)
  })
  expect(() => f.backend.generateMipmaps(texture)).toThrow(/restore binding failure/)
  expect(() => f.backend.generateMipmaps(texture)).not.toThrow()
})
it('allows inactive stage declarations on a zero-vertex-budget device', () => {
  const f = createFixture(false, false, false, {
    shader: { textureUsage: { optimizedOut: 'vertex' } }
  })
  expect(() => f.draw()).not.toThrow()
})
it('does not generate mips when binding synchronously disposes the texture', () => {
  const f = createFixture()
  const texture = generated()
  f.backend.generateMipmaps(texture)
  const original = f.fake.texture.api.bindTexture.getMockImplementation()!
  f.fake.texture.api.generateMipmap.mockClear()
  f.fake.texture.api.bindTexture.mockImplementationOnce((target, handle) => {
    original(target, handle)
    texture.dispose()
  })
  expect(() => f.backend.generateMipmaps(texture)).toThrow()
  expect(f.fake.texture.api.generateMipmap).not.toHaveBeenCalled()
})

it.each(['toString', 'constructor', 'hasOwnProperty'])(
  'treats omitted metadata for sampler %s as legacy fragment-only',
  (name) => {
    const f = createFixture()
    f.fake.vertex.uniforms.push({
      name,
      type: f.fake.gl.SAMPLER_2D,
      size: 1,
      location: {} as WebGLUniformLocation
    })
    const texture = render()
    cleanups.push(() => texture.dispose())
    f.material.setParameter(name, { type: 'texture2D', value: texture })
    expect(() => f.draw()).not.toThrow()
    expect(f.fake.calls.uniform1i).toHaveBeenCalledWith(expect.anything(), 0)
  }
)
it.each(['toString', 'constructor', 'hasOwnProperty'])(
  'does not interpret numeric uniform %s as a sampler declaration',
  (name) => {
    const f = createFixture()
    f.fake.vertex.uniforms.push({
      name,
      type: f.fake.gl.FLOAT,
      size: 1,
      location: {} as WebGLUniformLocation
    })
    f.material.setParameter(name, { type: 'float', value: 0.5 })
    expect(() => f.draw()).not.toThrow()
    expect(f.fake.calls.uniform1f).toHaveBeenCalledWith(expect.anything(), 0.5)
  }
)

const hdrCubeExtensions = [
  'OES_texture_float',
  'OES_texture_float_linear',
  'WEBGL_color_buffer_float'
]

function hdrCubeFace() {
  const texture = createRenderTexture({
    label: 'test/environment/cube',
    production: 'manual',
    descriptor: {
      dimension: 'cube',
      width: 4,
      height: 4,
      mipLevelCount: 1,
      storage: { format: 'rgba', type: 'float32' },
      colorSpace: 'linear'
    },
    defaultSampler: { minFilter: 'linear', magFilter: 'linear' }
  })
  const target = new RenderTarget(
    { colors: [{ kind: 'cube-face', face: 'positive-x', mipLevel: 0, texture }] },
    { label: 'test/environment/+X/mip0' }
  )
  cleanups.push(() => {
    target.dispose()
    texture.dispose()
  })
  return target
}

/** [DESIGN-WEIGHT:3][environment-bake-float-cube-preflight] */
it.each([...hdrCubeExtensions, 'device limit'])(
  'environment bake: rejects unavailable %s before entering the +X draw',
  (unavailable) => {
    const f = createFixture(false, false, false, {
      extensions: hdrCubeExtensions.filter((name) => name !== unavailable)
    })
    const target = hdrCubeFace()
    if (unavailable === 'device limit') {
      const parameter = f.fake.calls.getParameter.getMockImplementation()!
      f.fake.calls.getParameter.mockImplementation((name) =>
        name === f.fake.gl.MAX_CUBE_MAP_TEXTURE_SIZE ? 2 : parameter(name)
      )
    }
    const entry = f.fake.readSurface()
    const draw = vi.fn(() => {
      f.backend.draw(f.submission)
      return undefined
    })
    expect(() =>
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, draw)
    ).toThrow(unavailable)
    expect(draw).not.toHaveBeenCalled()
    expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
    expect(f.fake.texture.api.createTexture).not.toHaveBeenCalled()
    expect(f.fake.readSurface()).toEqual(entry)
  }
)

it('environment bake: rejects incomplete +X FBO, restores surface, then retries', () => {
  const f = createFixture(false, false, false, { extensions: hdrCubeExtensions })
  const target = hdrCubeFace()
  const entry = f.fake.readSurface()
  const draw = vi.fn(() => {
    f.backend.draw(f.submission)
    return undefined
  })
  const produce = () =>
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, draw)
  f.fake.texture.api.checkFramebufferStatus.mockReturnValueOnce(0x8cd6)
  expect(produce).toThrow(IncompleteFramebufferError)
  expect(draw).not.toHaveBeenCalled()
  expect(f.fake.calls.drawArrays).not.toHaveBeenCalled()
  expect(f.fake.calls.deleteFramebuffer).toHaveBeenCalledTimes(1)
  expect(f.fake.readSurface()).toEqual(entry)

  produce()
  expect(draw).toHaveBeenCalledTimes(1)
  expect(f.fake.calls.drawArrays).toHaveBeenCalledTimes(1)
  expect(f.fake.texture.api.createTexture).toHaveBeenCalledTimes(1)
  expect(f.fake.readSurface()).toEqual(entry)
})

it('environment bake: a checked draw identifies the face that raised a GL error', () => {
  const f = createFixture(false, false, false, { extensions: hdrCubeExtensions })
  const target = hdrCubeFace()
  const entry = f.fake.readSurface()
  f.fake.calls.drawArrays.mockImplementationOnce(() => {
    f.fake.texture.setError(0x0502)
  })
  expect(() =>
    f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, () => {
      f.backend.draw({ ...f.submission, errorLabel: 'environment/base/positive-x/mip0' })
    })
  ).toThrow(/environment\/base\/positive-x\/mip0.*GL error 0x502/)
  expect(f.fake.readSurface()).toEqual(entry)
})
