import { describe, expect, it, vi } from 'vitest'
import {
  InvalidMaterialError,
  UnsupportedRenderFeatureError,
  WebGLContextLostError
} from '@/rendering/core/errors'
import { WebGL1ProgramManager } from '@/rendering/backend/webgl1/WebGL1ProgramManager'
import { WebGL1Uniforms } from '@/rendering/backend/webgl1/WebGL1Uniforms'
import { Geometry } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Material, type MaterialParameter } from '@/rendering/resources/Material'
import { ShaderModule, type BuiltInUniformBindings } from '@/rendering/resources/ShaderModule'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import { createFakeWebGL1ResourceContext } from '../fakes/createFakeWebGL1ResourceContext'
import { Mat4Tuple } from '@/rendering/core/math/tuples'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * 只在 GL 边界使用 fake：Material、ShaderModule、Geometry 和 ProgramManager
 * 都是真实对象。fake 指定反射结果，但不声称能够编译 GLSL 或验证像素。
 */
function setup(
  active: readonly (readonly [string, number, number?])[],
  parameters: Readonly<Record<string, MaterialParameter>> = {},
  builtInUniforms: BuiltInUniformBindings = {},
  maxTextureUnits = 8
) {
  const fake = createFakeWebGL1ResourceContext()

  const calls = {
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    activeTexture: vi.fn(),
    bindTexture: vi.fn()
  }

  Object.assign(fake.gl, {
    INT: 0x1404,
    BOOL: 0x8b56,
    FLOAT_VEC2: 0x8b50,
    FLOAT_MAT3: 0x8b5b,
    FLOAT_MAT4: 0x8b5c,
    SAMPLER_2D: 0x8b5e,
    SAMPLER_CUBE: 0x8b60,
    TEXTURE0: 0x84c0,
    TEXTURE_CUBE_MAP: 0x8513,
    ...calls
  })

  fake.uniforms.splice(
    0,
    fake.uniforms.length,
    ...active.map(([name, type, size = 1]) => ({
      name,
      type,
      size,
      location: { id: name }
    }))
  )

  const shader = new ShaderModule({
    name: 'uniform-test',
    language: 'glsl-es-100',
    vertexSource: 'void main() { gl_Position = vec4(0.0); }',
    fragmentSource: 'void main() { gl_FragColor = vec4(1.0); }',
    builtInUniforms
  })

  const material = new Material({ shaderModule: shader, parameters })

  const geometry = new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array(9),
        itemSize: 3
      })
    }
  })

  const submission: DrawSubmission = {
    item: {
      geometry,
      material,
      worldMatrix: IDENTITY
    },
    view: {
      viewMatrix: IDENTITY,
      projectionMatrix: IDENTITY,
      cameraWorldPosition: [2, 3, 4]
    }
  }

  const manager = new WebGL1ProgramManager(fake.gl, {
    invalidateState: () => {}
  })

  const program = manager.get(shader)

  const resolveCube = vi.fn(() => ({
    handle: { id: 'cube' },
    target: fake.gl.TEXTURE_CUBE_MAP
  }))

  const uniforms = new WebGL1Uniforms(fake.gl, maxTextureUnits, resolveCube)

  return {
    fake,
    calls,
    shader,
    material,
    submission,
    program,
    uniforms,
    resolveCube
  }
}

/** 给 sampler 测试提供有效 CPU 资源；测试不模拟像素上传。 */
function cube(): CubeTexture {
  const face = () => ({
    width: 1,
    height: 1,
    data: new Uint8Array([255, 0, 0, 255])
  })

  return new CubeTexture({
    label: 'test-cube',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    source: {
      kind: 'data',
      faces: [face(), face(), face(), face(), face(), face()]
    }
  })
}

describe('WebGL1Uniforms draw input contract', () => {
  /** 每种已支持的 CPU 参数都必须选择匹配的 GL 上传方法和参数形状。 */
  it.each<{
    parameter: MaterialParameter
    type: number
    method: keyof ReturnType<typeof setup>['calls']
    expected: number | Float32Array
  }>([
    {
      parameter: { type: 'float', value: 0.1 },
      type: 0x1406,
      method: 'uniform1f',
      expected: Math.fround(0.1)
    },
    {
      parameter: { type: 'int', value: 7 },
      type: 0x1404,
      method: 'uniform1i',
      expected: 7
    },
    {
      parameter: { type: 'bool', value: false },
      type: 0x8b56,
      method: 'uniform1i',
      expected: 0
    },
    {
      parameter: { type: 'vec2', value: [1, 2] },
      type: 0x8b50,
      method: 'uniform2fv',
      expected: new Float32Array([1, 2])
    },
    {
      parameter: { type: 'vec3', value: [1, 2, 3] },
      type: 0x8b51,
      method: 'uniform3fv',
      expected: new Float32Array([1, 2, 3])
    },
    {
      parameter: { type: 'vec4', value: [1, 2, 3, 4] },
      type: 0x8b52,
      method: 'uniform4fv',
      expected: new Float32Array([1, 2, 3, 4])
    },
    {
      parameter: {
        type: 'mat3',
        value: [1, 0, 0, 0, 1, 0, 0, 0, 1]
      },
      type: 0x8b5b,
      method: 'uniformMatrix3fv',
      expected: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    },
    {
      parameter: { type: 'mat4', value: IDENTITY },
      type: 0x8b5c,
      method: 'uniformMatrix4fv',
      expected: new Float32Array(IDENTITY)
    }
  ])('上传 $parameter.type', ({ parameter, type, method, expected }) => {
    const test = setup([['uValue', type]], { uValue: parameter })

    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))

    const argumentsAfterLocation = test.calls[method].mock.calls[0]!.slice(1)

    expect(argumentsAfterLocation).toEqual(
      parameter.type === 'mat3' || parameter.type === 'mat4' ? [false, expected] : [expected]
    )
  })

  /**
   * [DESIGN-WEIGHT:3][test-uniform-complete-draw-input]
   * A 给共享 program 写入颜色；B 没提供颜色时必须失败，而不是沿用 A 的红色。
   */
  it('拒绝缺失的 active 参数，且不部分上传前面的合法参数', () => {
    const test = setup(
      [
        ['uScale', 0x1406],
        ['uTint', 0x8b52]
      ],
      {
        uScale: { type: 'float', value: 1 },
        uTint: { type: 'vec4', value: [1, 0, 0, 1] }
      }
    )

    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))

    test.calls.uniform1f.mockClear()
    test.calls.uniform4fv.mockClear()

    const second = new Material({
      shaderModule: test.shader,
      parameters: {
        uScale: { type: 'float', value: 2 }
      }
    })

    const draw = {
      ...test.submission,
      item: {
        ...test.submission.item,
        material: second
      }
    }

    expect(() => test.uniforms.prepare(test.program, draw)).toThrow(InvalidMaterialError)

    expect(test.calls.uniform1f).not.toHaveBeenCalled()
    expect(test.calls.uniform4fv).not.toHaveBeenCalled()
  })

  /** 参数未被链接器保留时不上传；反射元数据也不能在每次 draw 重查。 */
  it('忽略 inactive 参数并按真实 program 缓存反射', () => {
    const test = setup([['uTint', 0x8b52]], {
      uTint: { type: 'vec4', value: [1, 0, 0, 1] },
      unused: { type: 'float', value: 2 }
    })

    test.fake.calls.getActiveUniform.mockClear()

    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))
    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))

    expect(test.fake.calls.getActiveUniform).toHaveBeenCalledTimes(1)
    expect(test.calls.uniform4fv).toHaveBeenCalledTimes(2)
    expect(test.calls.uniform1f).not.toHaveBeenCalled()
  })

  /** 类型不匹配和 Float32 溢出都应在执行 uniform* 前报告。 */
  it.each<MaterialParameter>([
    { type: 'int', value: 1 },
    { type: 'float', value: 1e300 }
  ])('拒绝不适合 float uniform 的参数 %j', (parameter) => {
    const test = setup([['uValue', 0x1406]], {
      uValue: parameter
    })

    expect(() => test.uniforms.prepare(test.program, test.submission)).toThrow(InvalidMaterialError)

    expect(test.calls.uniform1f).not.toHaveBeenCalled()
  })

  /** 只声明 size=1 仍可能是长度为 1 的数组，名字中的下标也要识别。 */
  it.each([1, 2])('拒绝未建立 CPU 契约的 uniform 数组，size=%i', (size) => {
    const test = setup([['uWeights[0]', 0x1406, size]])

    expect(() => test.uniforms.prepare(test.program, test.submission)).toThrow(
      UnsupportedRenderFeatureError
    )
  })

  /**
   * [DESIGN-WEIGHT:3][test-normal-matrix-view-space]
   * M 是非均匀缩放，V 是绕 Z 旋转 90°。它们不可交换，能区分 V*M、M*V
   * 和只使用 M 的错误；期望值手算，不调用被测实现所用的 inverse 函数。
   */
  it('上传 view-space inverse-transpose，并保持 CPU 输入不变', () => {
    const test = setup([['uNormal', 0x8b5b]], {}, { normalMatrix: 'uNormal' })

    const model: Mat4Tuple = [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1]

    const view: Mat4Tuple = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

    const draw: DrawSubmission = {
      item: {
        ...test.submission.item,
        worldMatrix: model
      },
      view: {
        ...test.submission.view,
        viewMatrix: view
      }
    }

    const beforeModel = [...model]
    const beforeView = [...view]

    test.uniforms.upload(test.uniforms.prepare(test.program, draw))

    const [location, transpose, result] = test.calls.uniformMatrix3fv.mock.calls[0]!

    expect(location).toBe(test.program.uniforms.get('uNormal'))
    expect(transpose).toBe(false)

    const expected = [0, 0.5, 0, -1 / 3, 0, 0, 0, 0, 0.25]

    Array.from(result as Float32Array).forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]!, 6)
    })

    expect(model).toEqual(beforeModel)
    expect(view).toEqual(beforeView)
  })

  /** 奇异矩阵只影响实际需要法线变换的 shader，不禁止所有未点亮材质的零缩放。 */
  it('只在 active normalMatrix 需要求逆时拒绝奇异矩阵', () => {
    const test = setup([['uNormal', 0x8b5b]], {}, { normalMatrix: 'uNormal' })

    const zeroX: Mat4Tuple = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

    const draw = {
      ...test.submission,
      item: {
        ...test.submission.item,
        worldMatrix: zeroX
      }
    }

    expect(() => test.uniforms.prepare(test.program, draw)).toThrow(InvalidMaterialError)

    const unlit = setup([])

    expect(() =>
      unlit.uniforms.prepare(unlit.program, {
        ...unlit.submission,
        item: {
          ...unlit.submission.item,
          worldMatrix: zeroX
        }
      })
    ).not.toThrow()
  })

  /** 同一 shader/material 的两个 RenderItem 必须各自上传模型矩阵。 */
  it('逐 draw 读取模型矩阵，不把它存回 Material', () => {
    const test = setup([['uModel', 0x8b5c]], {}, { modelMatrix: 'uModel' })

    const translated: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1]

    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))

    test.uniforms.upload(
      test.uniforms.prepare(test.program, {
        ...test.submission,
        item: {
          ...test.submission.item,
          worldMatrix: translated
        }
      })
    )

    expect(test.calls.uniformMatrix4fv.mock.calls[0]![2]).toEqual(new Float32Array(IDENTITY))

    expect(test.calls.uniformMatrix4fv.mock.calls[1]![2]).toEqual(new Float32Array(translated))

    expect(test.material.getParameterEntries()).toEqual([])
  })

  /** 每次 draw 从 unit 0 分配；sampler uniform 接收单元编号，不是 TEXTURE0 枚举。 */
  it('绑定 cubemap 并上传纹理单元索引', () => {
    const texture = cube()

    const test = setup([['uEnv', 0x8b60]], {
      uEnv: { type: 'cubeTexture', value: texture }
    })

    test.uniforms.upload(test.uniforms.prepare(test.program, test.submission))

    expect(test.resolveCube).toHaveBeenCalledWith(texture)

    expect(test.calls.activeTexture).toHaveBeenCalledWith(test.fake.gl.TEXTURE0)

    expect(test.calls.bindTexture).toHaveBeenCalledWith(test.fake.gl.TEXTURE_CUBE_MAP, {
      id: 'cube'
    })

    expect(test.calls.uniform1i).toHaveBeenCalledWith(test.program.uniforms.get('uEnv'), 0)
  })

  /** 超限在解析 GPU texture 之前拒绝，不能依赖 GL 静默失败。 */
  it('预检 texture unit 数量', () => {
    const texture = cube()

    const test = setup(
      [
        ['a', 0x8b60],
        ['b', 0x8b60]
      ],
      {
        a: { type: 'cubeTexture', value: texture },
        b: { type: 'cubeTexture', value: texture }
      },
      {},
      1
    )

    expect(() => test.uniforms.prepare(test.program, test.submission)).toThrow(
      UnsupportedRenderFeatureError
    )

    expect(test.resolveCube).not.toHaveBeenCalled()
  })

  /** 丢失时不继续反射/上传，也不把问题误报成材质字段错误。 */
  it('lost 后拒绝 prepare 和 upload', () => {
    const test = setup([])
    test.fake.setLost(true)

    expect(() => test.uniforms.prepare(test.program, test.submission)).toThrow(
      WebGLContextLostError
    )

    expect(() => test.uniforms.upload([])).toThrow(WebGLContextLostError)
  })
})
