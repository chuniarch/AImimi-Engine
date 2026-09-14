import { describe, expect, it, vi } from 'vitest'

import { EngineError } from '@/errors/EngineError/BaseError'
import {
  InvalidMaterialError,
  RenderingError,
  ResourceDisposedError,
  ResourceHasSceneReferencesError
} from '@/rendering/core/errors'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import {
  Material,
  type MaterialOptions,
  type MaterialParameter,
  type RenderStateInput
} from '@/rendering/resources/Material'
import { ShaderModule, type WebGLShaderLanguage } from '@/rendering/resources/ShaderModule'
import { DataTexture2D, ImageTexture2D } from '@/rendering/resources/Texture2D'
import { Scene } from '@/rendering/scene/Scene'

/** 只建立 CPU shader；这里不验证 GLSL 编译或画面。 */
function createShader(language: WebGLShaderLanguage = 'glsl-es-100'): ShaderModule {
  return new ShaderModule({
    name: 'material-test',
    language,
    vertexSource:
      language === 'glsl-es-100'
        ? 'void main() { gl_Position = vec4(0.0); }'
        : '#version 300 es\nvoid main() { gl_Position = vec4(0.0); }',
    fragmentSource:
      language === 'glsl-es-100'
        ? 'precision mediump float; void main() { gl_FragColor = vec4(1.0); }'
        : '#version 300 es\nprecision mediump float; out vec4 color; void main() { color = vec4(1.0); }',
    builtInUniforms: { modelMatrix: 'uModel' }
  })
}

/** 用真实 CPU 资源代替 GPU handle，测试借用关系。 */
function createDataTexture(): DataTexture2D {
  return new DataTexture2D({
    label: 'material-data',
    source: { data: new Uint8Array([1, 2, 3, 4]), width: 1, height: 1 },
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'data'
  })
}

/** 六面使用相同输入对象也合法，CubeTexture 自己建立像素快照。 */
function createCubeTexture(): CubeTexture {
  const face = { data: new Uint8Array([1, 2, 3, 4]), width: 1, height: 1 }

  return new CubeTexture({
    label: 'material-cube',
    source: { kind: 'data', faces: [face, face, face, face, face, face] },
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear'
  })
}

/**
 * 此函数不执行，只由 tsc 验证负向类型契约。
 * Vitest 通过不等于这些 @ts-expect-error 已经被编译器检查。
 */
function checkReadonlyAPI(material: Material): void {
  // @ts-expect-error queue 只能读取
  material.queue = 'opaque'
  // @ts-expect-error state 的字段只读
  material.state.depthWrite = false
  // @ts-expect-error 返回的条目数组不允许 push
  material.getParameterEntries().push(['uX', { type: 'float', value: 1 }])
  // @ts-expect-error bool 参数要求 boolean
  material.setParameter('uFlag', { type: 'bool', value: 1 })
}

void checkReadonlyAPI

describe('Material CPU contract', () => {
  /**
   * 默认值必须是完整的 Backend 状态输入，而不是依赖上一次 draw 的部分描述。
   */
  it('保存 shader 引用并补齐默认队列与状态', () => {
    const shader = createShader()
    const material = new Material({ shaderModule: shader })

    expect(material.shaderModule).toBe(shader)
    expect(material.queue).toBe('opaque')
    expect(material.state).toEqual({
      depthTest: true,
      depthWrite: true,
      depthFunction: 'less-equal',
      cullMode: 'back'
    })
    expect(material.getParameterEntries()).toEqual([])
    expect(material.getParameter('missing')).toBeUndefined()
  })

  /** Material 不要求用户补写另一种 shader language。 */
  it('接受独立的 GLSL ES 3.00 ShaderModule', () => {
    const shader = createShader('glsl-es-300')
    expect(new Material({ shaderModule: shader }).shaderModule).toBe(shader)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:2][material-render-state-snapshot]
   *
   * 先构造，再修改输入对象；如果保存的是原对象引用，这个测试会失败。
   * Reflect.set 验证的是运行时冻结，不是 TypeScript readonly。
   */
  it('复制并冻结状态，保留显式 false', () => {
    const state = { depthTest: false, depthWrite: false, cullMode: 'front' as const }
    const material = new Material({ shaderModule: createShader(), queue: 'background', state })
    state.depthWrite = true

    expect(material.queue).toBe('background')
    expect(material.state.depthTest).toBe(false)
    expect(material.state.depthWrite).toBe(false)
    expect(material.state.cullMode).toBe('front')
    expect(Object.isFrozen(material.state)).toBe(true)
    expect(Reflect.set(material.state, 'depthWrite', true)).toBe(false)
  })

  it.each([
    { depthFunction: 'less', cullMode: 'none' },
    { depthFunction: 'less-equal', cullMode: 'back' },
    { depthFunction: 'always', cullMode: 'front' }
  ] as const)('接受已定义的深度与剔除枚举 %o', (state) => {
    const material = new Material({ shaderModule: createShader(), state })
    expect(material.state).toMatchObject(state)
  })

  /** 故意绕过静态类型，模拟 JavaScript 或反序列化数据进入公开入口。 */
  it.each([
    { depthWrite: null },
    { depthTest: 1 },
    { depthFunction: 'greater' },
    { cullMode: 'both' },
    { transparent: true },
    null,
    []
  ])('拒绝非法状态 %o', (state) => {
    expect(
      () =>
        new Material({
          shaderModule: createShader(),
          state: state as RenderStateInput
        })
    ).toThrow(InvalidMaterialError)
  })

  it.each(['transparent', '', null])('拒绝非法 queue %s', (queue) => {
    expect(
      () =>
        new Material({
          shaderModule: createShader(),
          queue: queue as MaterialOptions['queue']
        })
    ).toThrow(InvalidMaterialError)
  })

  it.each([null, [], 1])('拒绝非法参数容器 %o', (parameters) => {
    expect(
      () =>
        new Material({
          shaderModule: createShader(),
          parameters: parameters as unknown as MaterialOptions['parameters']
        })
    ).toThrow(InvalidMaterialError)
  })

  it('拒绝缺失或错误的 ShaderModule', () => {
    expect(() => new Material({ shaderModule: {} as ShaderModule })).toThrow(InvalidMaterialError)
    expect(() => new Material(null as unknown as MaterialOptions)).toThrow(InvalidMaterialError)
  })

  /**
   * int/bool 不能被混成 float；这些是 FFT 开关、stage 和 IBL 采样次数的真实需求。
   */
  it.each([
    { type: 'float', value: 0.1 },
    { type: 'int', value: -2147483648 },
    { type: 'int', value: 2147483647 },
    { type: 'bool', value: false }
  ] satisfies MaterialParameter[])('保留合法标量 %o', (parameter) => {
    const material = new Material({
      shaderModule: createShader(),
      parameters: { uValue: parameter }
    })

    expect(material.getParameter('uValue')).toEqual(parameter)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][material-parameter-copy-boundary]
   *
   * 每种数值数组都检查三个别名入口：构造输入、getter 输出、setter 输入。
   * 把生产代码改成保存/返回原数组，会使后续读取观察到 999、888 或 777。
   */
  it.each([
    ['vec2', 2],
    ['vec3', 3],
    ['vec4', 4],
    ['mat3', 9],
    ['mat4', 16]
  ] as const)('%s 在构造、读取与 setter 之间不共享数组', (type, length) => {
    const input = Array.from({ length }, (_, index) => index + 1)
    const original = [...input]
    // 表格已经保证每个标签的长度；只在测试夹具边界补足 tuple 类型。
    const parameter = { type, value: input } as MaterialParameter
    const material = new Material({
      shaderModule: createShader(),
      parameters: { uValue: parameter }
    })
    input[0] = 999

    const first = material.getParameter('uValue')!
    expect(first).toEqual({ type, value: original })
    const returnedValues = first.value as number[]
    returnedValues[0] = 888
    expect(material.getParameter('uValue')).toEqual({ type, value: original })

    const replacement = Array.from({ length }, (_, index) => index + 10)
    const expected = [...replacement]
    material.setParameter('uValue', { type, value: replacement } as MaterialParameter)
    replacement[0] = 777
    expect(material.getParameter('uValue')).toEqual({ type, value: expected })
  })

  /** 外层 record、参数 wrapper 和 Map 都必须与调用者隔离。 */
  it('复制 record 和 wrapper，按首次插入顺序返回独立条目', () => {
    const scalar = { type: 'float' as const, value: 1 }
    const input: Record<string, MaterialParameter> = {
      uA: scalar,
      uB: { type: 'vec2', value: [2, 3] }
    }
    const material = new Material({ shaderModule: createShader(), parameters: input })
    scalar.value = 999
    delete input.uB
    input.uC = { type: 'float', value: 5 }

    expect(material.getParameter('uA')).toEqual({ type: 'float', value: 1 })
    expect(material.getParameter('uC')).toBeUndefined()

    material.setParameter('uA', { type: 'float', value: 10 })
    material.setParameter('uC', { type: 'float', value: 5 })

    const entries = material.getParameterEntries()
    expect(entries.map(([name]) => name)).toEqual(['uA', 'uB', 'uC'])
    const vector = entries[1]![1]
    const returnedValues = vector.value as number[]
    returnedValues[0] = 999
    const returnedEntries = entries as unknown[]
    returnedEntries.pop()

    expect(material.getParameter('uB')).toEqual({ type: 'vec2', value: [2, 3] })
    expect(material.getParameterEntries()).toHaveLength(3)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][material-atomic-parameter-write]
   *
   * 每个非法输入都分别经过 constructor 和 setter。
   * setter 失败后旧值仍为 42，防止出现“先写入、后验证”的部分更新。
   */
  it.each([
    null,
    { type: 'unknown', value: 1 },
    { type: 'float', value: NaN },
    { type: 'float', value: Infinity },
    { type: 'float', value: '1' },
    { type: 'int', value: 1.5 },
    { type: 'int', value: 2147483648 },
    { type: 'int', value: -2147483649 },
    { type: 'bool', value: 1 },
    { type: 'vec2', value: [1] },
    { type: 'vec3', value: [1, 2, Infinity] },
    { type: 'vec4', value: [1, 2, 3, 4, 5] },
    { type: 'mat3', value: new Array(9) },
    { type: 'mat4', value: Array.from({ length: 15 }, () => 0) },
    { type: 'mat3', value: new Float32Array(9) },
    { type: 'texture2D', value: null },
    { type: 'cubeTexture', value: {} }
  ])('拒绝非法参数且不破坏旧值 %o', (invalid) => {
    const shader = createShader()
    const material = new Material({
      shaderModule: shader,
      parameters: {
        uValue: { type: 'float', value: 42 }
      }
    })
    const parameter = invalid as MaterialParameter

    expect(() => new Material({ shaderModule: shader, parameters: { uValue: parameter } })).toThrow(
      InvalidMaterialError
    )
    expect(() => material.setParameter('uValue', parameter)).toThrow(InvalidMaterialError)
    expect(material.getParameter('uValue')).toEqual({ type: 'float', value: 42 })
  })

  /** 内建 uniform 的实际名称由 ShaderModule 映射决定。 */
  it('拒绝覆盖内建 uniform 并验证参数名称', () => {
    const shader = createShader()
    const material = new Material({ shaderModule: shader })
    const parameter: MaterialParameter = { type: 'float', value: 1 }

    expect(() => new Material({ shaderModule: shader, parameters: { uModel: parameter } })).toThrow(
      InvalidMaterialError
    )
    expect(() => material.setParameter('uModel', parameter)).toThrow(InvalidMaterialError)
    expect(() => material.setParameter(' ', parameter)).toThrow(InvalidMaterialError)
    expect(() => material.getParameter('')).toThrow(InvalidMaterialError)
    expect(material.getParameter('uModel')).toBeUndefined()

    // Map 的键不触发 Object.prototype.__proto__ 的特殊赋值语义。
    material.setParameter('__proto__', parameter)
    expect(material.getParameter('__proto__')).toEqual(parameter)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][material-borrowed-resources]
   *
   * 真实 Texture2D 的两个子类和 CubeTexture 都保留对象身份。
   * 若复制资源或隐式 retain，引用相等断言或计数断言就会失败。
   */
  it('借用两种 Texture2D 和 CubeTexture，替换时不接管生命周期', () => {
    const data = createDataTexture()
    const image = new ImageTexture2D({
      label: 'image',
      source: { width: 1, height: 1 } as ImageBitmap,
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'srgb'
    })
    const cube = createCubeTexture()
    const shader = createShader()
    const material = new Material({
      shaderModule: shader,
      parameters: {
        uMap: { type: 'texture2D', value: data },
        uCube: { type: 'cubeTexture', value: cube }
      }
    })

    expect(material.getParameter('uMap')!.value).toBe(data)
    expect(material.getParameter('uCube')!.value).toBe(cube)
    material.setParameter('uMap', { type: 'texture2D', value: image })
    expect(material.getParameter('uMap')!.value).toBe(image)
    expect(data.disposed).toBe(false)

    expect(() =>
      material.setParameter('uWrong', {
        type: 'texture2D',
        value: cube
      } as unknown as MaterialParameter)
    ).toThrow(InvalidMaterialError)
    expect(() =>
      material.setParameter('uWrong', {
        type: 'cubeTexture',
        value: data
      } as unknown as MaterialParameter)
    ).toThrow(InvalidMaterialError)

    material.dispose()
    for (const resource of [shader, data, image, cube]) {
      expect(resource.sceneReferenceCount).toBe(0)
      expect(resource.disposed).toBe(false)
      resource.dispose()
    }
  })

  /** 使用期间借用对象可能被别处释放，错误不能被转换成“没有参数”。 */
  it('拒绝已释放依赖，setter 失败时仍保留原纹理', () => {
    const shader = createShader()
    const live = createDataTexture()
    const dead = createDataTexture()
    const material = new Material({
      shaderModule: shader,
      parameters: {
        uMap: { type: 'texture2D', value: live }
      }
    })
    dead.dispose()

    expect(
      () =>
        new Material({
          shaderModule: shader,
          parameters: {
            uMap: { type: 'texture2D', value: dead }
          }
        })
    ).toThrow(ResourceDisposedError)
    expect(() => material.setParameter('uMap', { type: 'texture2D', value: dead })).toThrow(
      ResourceDisposedError
    )
    expect(material.getParameter('uMap')!.value).toBe(live)

    live.dispose()
    expect(() => material.getParameter('uMap')).toThrow(ResourceDisposedError)
    shader.dispose()
    expect(() => material.shaderModule).toThrow(ResourceDisposedError)
    expect(() => new Material({ shaderModule: shader })).toThrow(ResourceDisposedError)
    material.dispose()
  })

  /**
   * Scene 分别登记 Material 和依赖。释放 Material 本身不会减少依赖的计数，
   * 所以它们能继续被同一 Scene 中的其他 Material 使用。
   */
  it('与 Scene 引用计数配合，最后一个 Scene 才释放共享资源', () => {
    const shader = createShader()
    const texture = createDataTexture()
    const material = new Material({
      shaderModule: shader,
      parameters: {
        uMap: { type: 'texture2D', value: texture }
      }
    })
    const a = new Scene()
    const b = new Scene()

    for (const resource of [material, shader, texture]) {
      a.retain(resource)
      b.retain(resource)
    }

    expect(() => material.dispose()).toThrow(ResourceHasSceneReferencesError)
    expect(material.tryDispose()).toBe(false)
    a.dispose()
    expect(material.disposed).toBe(false)
    expect(texture.sceneReferenceCount).toBe(1)

    b.release(material)
    expect(material.disposed).toBe(true)
    expect(shader.disposed).toBe(false)
    expect(texture.disposed).toBe(false)
    expect(texture.sceneReferenceCount).toBe(1)

    b.dispose()
    expect(shader.disposed).toBe(true)
    expect(texture.disposed).toBe(true)
  })

  /** dispose 是单向且幂等的，所有 Material 数据 API 都先检查生命周期。 */
  it('释放后拒绝查询与修改，且只通知一次', () => {
    const shader = createShader()
    const material = new Material({ shaderModule: shader })
    const listener = vi.fn()
    material.onDispose(listener)
    material.dispose()
    material.dispose()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(() => material.shaderModule).toThrow(ResourceDisposedError)
    expect(() => material.queue).toThrow(ResourceDisposedError)
    expect(() => material.state).toThrow(ResourceDisposedError)
    expect(() => material.getParameter('missing')).toThrow(ResourceDisposedError)
    expect(() => material.getParameterEntries()).toThrow(ResourceDisposedError)
    expect(() => material.setParameter('uValue', { type: 'float', value: 1 })).toThrow(
      ResourceDisposedError
    )
    expect(shader.disposed).toBe(false)
  })
})

describe('InvalidMaterialError', () => {
  /** 稳定错误码和字段上下文供上层捕获，不应靠解析 message 分类。 */
  it('沿用 EngineError/RenderingError 并保留冻结的诊断现场', () => {
    const details = { parameterName: 'uRoughness', fieldName: 'forged', reason: 'forged' }
    const error = new InvalidMaterialError('parameters.uRoughness', 'must be finite', details)
    details.parameterName = 'changed'

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.name).toBe('InvalidMaterialError')
    expect(error.code).toBe('INVALID_MATERIAL')
    expect(error.message).toContain('parameters.uRoughness')
    expect(error.details).toEqual({
      parameterName: 'uRoughness',
      fieldName: 'parameters.uRoughness',
      reason: 'must be finite'
    })
    expect(error.context).toBe(error.details)
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
