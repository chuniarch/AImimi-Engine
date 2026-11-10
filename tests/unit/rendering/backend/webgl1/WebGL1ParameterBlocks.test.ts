import { onTestFinished, describe, expect, it, vi } from 'vitest'
import { InvalidMaterialError, ResourceDisposedError } from '@/rendering/core/errors'
import { WebGL1Uniforms } from '@/rendering/backend/webgl1/WebGL1Uniforms'
import { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { Geometry } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Material, type MaterialParameter } from '@/rendering/resources/Material'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import type { Texture2DSamplingSource } from '@/rendering/resources/Texture2DSamplingSource'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { createFakeWebGL1ResourceContext } from '../fakes/createFakeWebGL1ResourceContext'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * 只替换 GPU 边界，CPU Material/Block/ProgramManager 为真实类。
 * 录制 uniform* 的参数能区分值过期、来源错误、prepare 提前上传等故障。
 */
function setup(
  active: readonly (readonly [string, number])[],
  entries: Record<string, MaterialParameter>,
  parameters: Record<string, MaterialParameter> = {}
) {
  const fake = createFakeWebGL1ResourceContext()
  const calls = {
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    activeTexture: vi.fn(),
    bindTexture: vi.fn()
  }
  Object.assign(fake.gl, {
    INT: 0x1404,
    BOOL: 0x8b56,
    FLOAT_MAT4: 0x8b5c,
    SAMPLER_2D: 0x8b5e,
    SAMPLER_CUBE: 0x8b60,
    TEXTURE0: 0x84c0,
    TEXTURE_2D: 0x0de1,
    ...calls
  })
  fake.uniforms.splice(
    0,
    fake.uniforms.length,
    ...active.map(([name, type]) => ({ name, type, size: 1, location: { id: name } }))
  )
  const shader = new ShaderModule({
    name: 'block-uniforms',
    language: 'glsl-es-100',
    vertexSource: 'void main(){ gl_Position = vec4(0.0); }',
    fragmentSource: 'void main(){ gl_FragColor = vec4(1.0); }',
    builtInUniforms: { modelMatrix: 'uModel' }
  })
  const block = new ParameterBlock({ label: 'frame', entries })
  const material = new Material({ shaderModule: shader, blocks: [block], parameters })
  const geometry = new Geometry({
    attributes: { position: new VertexAttribute({ data: new Float32Array(9), itemSize: 3 }) }
  })
  const submission: DrawSubmission = {
    item: { geometry, material, worldMatrix: IDENTITY, castShadow: false },
    view: { viewMatrix: IDENTITY, projectionMatrix: IDENTITY, cameraWorldPosition: [0, 0, 0] }
  }
  const manager = new WebGL1ProgramManager(fake.gl, { invalidateState: () => {} })
  const program = manager.get(shader)
  const resolve2D = vi.fn(
    (_source: Texture2DSamplingSource, _name: string): WebGLTexture => ({ id: '2d' })
  )
  const uniforms = new WebGL1Uniforms(fake.gl, 8, () => ({ handle: {}, target: 0x8513 }), resolve2D)
  return { fake, calls, shader, block, material, submission, program, uniforms, resolve2D }
}

describe('WebGL1 ParameterBlock draw lookup', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][uniform-live-parameter-block]
   * 失败目标：在 Material 构造时复制块，或按 program 缓存块值而不再读取。
   */
  it('两材质共享一块，set 一次之后两个 draw 都读取新值', () => {
    const f = setup([['uBias', 0x1406]], { uBias: { type: 'float', value: 1 } })
    const other = new Material({ shaderModule: f.shader, blocks: [f.block] })
    f.uniforms.upload(f.uniforms.prepare(f.program, f.submission))
    f.block.set('uBias', { type: 'float', value: 2 })
    f.uniforms.upload(f.uniforms.prepare(f.program, f.submission))
    f.uniforms.upload(
      f.uniforms.prepare(f.program, {
        ...f.submission,
        item: { ...f.submission.item, material: other }
      })
    )
    expect(f.calls.uniform1f.mock.calls).toEqual([
      [{ id: 'uBias' }, 1],
      [{ id: 'uBias' }, 2],
      [{ id: 'uBias' }, 2]
    ])
  })

  /** 三种来源并存但不覆盖；模型矩阵仍属于 draw，不写入块或 Material。 */
  it('内建、材质本地参数、多个块各自提供不同名称', () => {
    const f = setup(
      [
        ['uModel', 0x8b5c],
        ['uLocal', 0x1406],
        ['uBias', 0x1406],
        ['uTime', 0x1406]
      ],
      { uBias: { type: 'float', value: 3 } },
      { uLocal: { type: 'float', value: 2 } }
    )
    const time = new ParameterBlock({
      label: 'time',
      entries: { uTime: { type: 'float', value: 4 } }
    })
    const material = new Material({
      shaderModule: f.shader,
      blocks: [f.block, time],
      parameters: { uLocal: { type: 'float', value: 2 } }
    })
    f.uniforms.upload(
      f.uniforms.prepare(f.program, { ...f.submission, item: { ...f.submission.item, material } })
    )
    expect(f.calls.uniformMatrix4fv).toHaveBeenCalledWith(
      { id: 'uModel' },
      false,
      new Float32Array(IDENTITY)
    )
    expect(f.calls.uniform1f.mock.calls).toEqual([
      [{ id: 'uLocal' }, 2],
      [{ id: 'uBias' }, 3],
      [{ id: 'uTime' }, 4]
    ])
  })

  /** Prepared 命令捕获本次值；后续写块不能倒改已经准备好的上传参数。 */
  it('prepare 后写块不改变旧命令，下次 prepare 才读新值', () => {
    const f = setup([['uBias', 0x1406]], { uBias: { type: 'float', value: 1 } })
    const commands = f.uniforms.prepare(f.program, f.submission)
    f.block.set('uBias', { type: 'float', value: 2 })
    expect(f.calls.uniform1f).not.toHaveBeenCalled()
    f.uniforms.upload(commands)
    expect(f.calls.uniform1f).toHaveBeenLastCalledWith({ id: 'uBias' }, 1)
    f.uniforms.upload(f.uniforms.prepare(f.program, f.submission))
    expect(f.calls.uniform1f).toHaveBeenLastCalledWith({ id: 'uBias' }, 2)
  })

  /** inactive 项不需要解析纹理或读其资源；块本身仍必须存活。 */
  it('只读 active 块项，忽略 unused 的已释放纹理', () => {
    const owner = new RenderTargetBundle({
      width: 1,
      height: 1,
      label: 'unused',
      colors: [{ storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }]
    })
    onTestFinished(() => owner.dispose())
    const target = owner.target
    const f = setup([['uBias', 0x1406]], {
      uBias: { type: 'float', value: 1 },
      uUnused: { type: 'texture2D', value: target.getColorAttachment(0) }
    })
    target.dispose()
    f.uniforms.upload(f.uniforms.prepare(f.program, f.submission))
    expect(f.calls.uniform1f).toHaveBeenCalledOnce()
    expect(f.resolve2D).not.toHaveBeenCalled()
    f.block.dispose()
    expect(() => f.uniforms.prepare(f.program, f.submission)).toThrow(ResourceDisposedError)
  })

  /** 类型错/缺值都必须在 upload 之前失败；不能沿用共享 program 的旧值。 */
  it.each(['missing', 'mismatch', 'overflow'] as const)('%s 时不上传半批参数', (failure) => {
    const entries: Record<string, MaterialParameter> = { uFirst: { type: 'float', value: 1 } }
    if (failure !== 'missing')
      entries.uSecond =
        failure === 'mismatch' ? { type: 'int', value: 2 } : { type: 'float', value: 1e300 }
    const f = setup(
      [
        ['uFirst', 0x1406],
        ['uSecond', 0x1406]
      ],
      entries
    )
    expect(() => f.uniforms.prepare(f.program, f.submission)).toThrow(InvalidMaterialError)
    expect(f.calls.uniform1f).not.toHaveBeenCalled()
  })

  /** 块纹理仍通过唯一 resolver；失败不能被块层吞掉或直接绑定为 GPU handle。 */
  it('块中的附件地址与 uniform 名传给 resolve2D，保留原始失败', () => {
    const owner = new RenderTargetBundle({
      width: 1,
      height: 1,
      label: 'map',
      colors: [{ storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }]
    })
    onTestFinished(() => owner.dispose())
    const target = owner.target
    const ref = target.getColorAttachment(0)
    const f = setup([['uMap', 0x8b5e]], { uMap: { type: 'texture2D', value: ref } })
    const error = new Error('feedback rejected by resolver')
    f.resolve2D.mockImplementation(() => {
      throw error
    })
    expect(() => f.uniforms.prepare(f.program, f.submission)).toThrow(error)
    expect(f.resolve2D).toHaveBeenCalledWith(ref, 'uMap')
    expect(f.calls.bindTexture).not.toHaveBeenCalled()
    expect(f.calls.uniform1i).not.toHaveBeenCalled()
  })
})
