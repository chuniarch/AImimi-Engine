import { onTestFinished, describe, expect, it, vi } from 'vitest'
import {
  InvalidParameterBlockError,
  RenderingError,
  ResourceDisposedError
} from '@/rendering/core/errors'
import { ParameterBlock, type ParameterBlockOptions } from '@/rendering/resources/ParameterBlock'
import type { MaterialParameter } from '@/rendering/resources/Material'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import { RenderTargetBundle } from '@/rendering/resources/RenderTargetBundle'
import { Scene } from '@/rendering/scene/Scene'

/** 真实 CPU 纹理；本组不创建 WebGL context，也不把逻辑引用伪造成 GPU handle。 */
function texture(): DataTexture2D {
  return new DataTexture2D({
    label: 'block-map',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'data',
    source: { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 4]) }
  })
}

/** tsc 才检查这些负向约束；函数不在 Vitest 运行时调用。 */
function checkReadonly(block: ParameterBlock): void {
  // @ts-expect-error version 只读，不能由消费者伪造更新。
  block.version = 3
  // @ts-expect-error names 不能扩展块的布局。
  block.names.push('newName')
  // @ts-expect-error 参数标签和值必须相符。
  block.set('flag', { type: 'bool', value: 1 })
}
void checkReadonly

describe('ParameterBlock fixed layout and snapshots', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-fixed-layout]
   * Given 外部 record/向量；When 外部修改输入、读取结果；Then 块中初值不变。
   * 漏掉任一复制边界都会让外部写入绕过 set 与 version。
   */
  it('复制输入和读取值，冻结名称列表，不借用调用者的容器', () => {
    const vector: [number, number, number] = [1, 2, 3]
    const entries: Record<string, MaterialParameter> = {
      uDirection: { type: 'vec3', value: vector }
    }
    const block = new ParameterBlock({ label: 'sun', entries })
    vector[0] = 99
    entries.uOther = { type: 'float', value: 7 }
    const first = block.get('uDirection')!
    if (first.type !== 'vec3') throw new Error('Fixture must remain vec3')
    Reflect.set(first.value, 0, 88)
    const snapshot = block.getEntries()
    Reflect.set(snapshot[0]!, 0, 'renamed')
    expect(block.get('uDirection')).toEqual({ type: 'vec3', value: [1, 2, 3] })
    expect(block.names).toEqual(['uDirection'])
    expect(Object.isFrozen(block.names)).toBe(true)
    expect(block.getEntries()[0]![0]).toBe('uDirection')
    expect(block.version).toBe(0)
    expect(block.get('missing')).toBeUndefined()
  })

  /** 空布局合法；名字保留原样，Map 不把 Object.prototype 字段当成已有条目。 */
  it('允许空块和原型同名键，不 trim 或隐式添加名字', () => {
    const empty = new ParameterBlock({ label: 'empty', entries: {} })
    expect(empty.getEntries()).toEqual([])
    const block = new ParameterBlock({
      label: 'names',
      entries: {
        ['__proto__']: { type: 'float', value: 1 },
        constructor: { type: 'float' as const, value: 2 },
        ' uSpaced ': { type: 'float', value: 3 }
      }
    })
    expect(block.get('__proto__')).toEqual({ type: 'float', value: 1 })
    expect(block.get('uSpaced')).toBeUndefined()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-atomic-write]
   * version 记录成功写入次数，不是浮点值相等比较器；读操作不得改变它。
   */
  it('成功 set 每次只加一个版本，包括写入相同值', () => {
    const block = new ParameterBlock({
      label: 'bias',
      entries: { uBias: { type: 'float', value: 0.003 } }
    })
    block.set('uBias', { type: 'float', value: 0.005 })
    expect(block.version).toBe(1)
    block.set('uBias', { type: 'float', value: 0.005 })
    expect(block.get('uBias')).toEqual({ type: 'float', value: 0.005 })
    block.getEntries()
    expect(block.version).toBe(2)
  })

  /** 失败不能提前修改 Map、名称、参数类型或版本。 */
  it.each([
    ['missing', { type: 'float', value: 2 }],
    ['uBias', { type: 'int', value: 2 }],
    ['uBias', { type: 'float', value: NaN }],
    ['uBias', null],
    ['', { type: 'float', value: 2 }]
  ])('拒绝 %s 的非法写入并保留原状态', (name, parameter) => {
    const block = new ParameterBlock({
      label: 'sun',
      entries: { uBias: { type: 'float', value: 1 } }
    })
    expect(() => block.set(name as string, parameter as MaterialParameter)).toThrow(
      InvalidParameterBlockError
    )
    expect(block.getEntries()).toEqual([['uBias', { type: 'float', value: 1 }]])
    expect(block.version).toBe(0)
  })

  /** 一套复制器覆盖 Material 与块；验证规则不能随调用方改变。 */
  it.each<MaterialParameter>([
    { type: 'int', value: -2147483648 },
    { type: 'int', value: 2147483647 },
    { type: 'bool', value: false },
    { type: 'vec2', value: [1, 2] },
    { type: 'vec3', value: [1, 2, 3] },
    { type: 'vec4', value: [1, 2, 3, 4] },
    { type: 'mat3', value: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
    { type: 'mat4', value: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }
  ])('保留合法 $type 参数并复制 setter 输入', (parameter) => {
    const block = new ParameterBlock({ label: 'values', entries: { uValue: parameter } })
    block.set('uValue', parameter)
    expect(block.get('uValue')).toEqual(parameter)
    expect(block.get('uValue')).not.toBe(parameter)
    if (Array.isArray(parameter.value)) {
      expect(block.get('uValue')!.value).not.toBe(parameter.value)
    }
  })

  /** 外部 JS 可以越过静态类型，所有非法值仍须得到块领域错误。 */
  it.each([
    null,
    { type: 'unknown', value: 1 },
    { type: 'float', value: Infinity },
    { type: 'int', value: 2147483648 },
    { type: 'int', value: 0.5 },
    { type: 'bool', value: 1 },
    { type: 'vec3', value: [1, 2, NaN] },
    { type: 'mat3', value: new Array(9) },
    { type: 'mat4', value: new Float32Array(16) },
    { type: 'texture2D', value: {} },
    { type: 'cubeTexture', value: {} }
  ])('非法参数 %j 不泄漏 InvalidMaterialError 或 TypeError', (value) => {
    expect(
      () =>
        new ParameterBlock({ label: 'invalid', entries: { uValue: value as MaterialParameter } })
    ).toThrow(InvalidParameterBlockError)
  })

  /** 描述本身也要验证；缺失 entries 不能悄悄成为空块。 */
  it.each([
    null,
    undefined,
    [],
    { label: '', entries: {} },
    { label: '  ', entries: {} },
    { label: 1, entries: {} },
    { label: 'x' },
    { label: 'x', entries: null },
    { label: 'x', entries: [] },
    { label: 'x', entries: { ' ': { type: 'float', value: 1 } } }
  ])('拒绝非法构造描述 %j', (options) => {
    expect(() => new ParameterBlock(options as unknown as ParameterBlockOptions)).toThrow(
      InvalidParameterBlockError
    )
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][parameter-block-borrowing]
   * CPU 资源身份共享，附件包装复制；释放块不能释放纹理或附件目标。
   */
  it('只借用纹理与附件，替换和释放不影响它们的生命周期', () => {
    const first = texture()
    const second = texture()
    const face = { width: 1, height: 1, data: new Uint8Array(4) }
    const cube = new CubeTexture({
      label: 'cube',
      storage: { format: 'rgba', type: 'uint8' },
      colorSpace: 'linear',
      source: { kind: 'data', faces: [face, face, face, face, face, face] }
    })
    const owner = new RenderTargetBundle({
      width: 2,
      height: 2,
      label: 'target',
      colors: [{ storage: { format: 'rgba', type: 'uint8' }, colorSpace: 'data' }]
    })
    onTestFinished(() => owner.dispose())
    const target = owner.target
    const ref = { ...target.getColorAttachment(0) }
    const block = new ParameterBlock({
      label: 'maps',
      entries: {
        uMap: { type: 'texture2D', value: first },
        uCube: { type: 'cubeTexture', value: cube },
        uShadow: { type: 'texture2D', value: ref }
      }
    })
    ref.index = 99
    expect(block.get('uMap')!.value).toBe(first)
    expect(block.get('uShadow')!.value).toEqual({ target, kind: 'color', index: 0 })
    expect(Object.isFrozen(block.get('uShadow')!.value)).toBe(true)
    block.set('uMap', { type: 'texture2D', value: second })
    block.dispose()
    for (const resource of [first, second, cube, target]) {
      expect(resource.disposed).toBe(false)
      expect(resource.sceneReferenceCount).toBe(0)
      resource.dispose()
    }
  })

  /** 生命周期错误不能被公共参数验证器改写为“输入格式错误”。 */
  it('拒绝已释放资源，失败 setter 不替换旧纹理或增加 version', () => {
    const current = texture()
    const dead = texture()
    dead.dispose()
    const block = new ParameterBlock({
      label: 'alive',
      entries: { uMap: { type: 'texture2D', value: current } }
    })
    expect(() => block.set('uMap', { type: 'texture2D', value: dead })).toThrow(
      ResourceDisposedError
    )
    expect(block.get('uMap')!.value).toBe(current)
    expect(block.version).toBe(0)
    current.dispose()
    expect(() => block.get('uMap')).toThrow(ResourceDisposedError)
    expect(() => block.getEntries()).toThrow(ResourceDisposedError)
  })

  /** 同一块跨两个 Scene，最后一个释放才结束；disposed 后所有数据访问拒绝。 */
  it('复用 Resource 生命周期，最后一个 Scene 释放后只通知一次', () => {
    const block = new ParameterBlock({ label: 'shared', entries: {} })
    const a = new Scene()
    const b = new Scene()
    const listener = vi.fn()
    block.onDispose(listener)
    a.retain(block)
    b.retain(block)
    a.dispose()
    expect(block.disposed).toBe(false)
    b.dispose()
    block.dispose()
    expect(listener).toHaveBeenCalledOnce()
    for (const access of [
      () => block.names,
      () => block.version,
      () => block.get('x'),
      () => block.getEntries(),
      () => block.set('x', { type: 'float', value: 1 })
    ]) {
      expect(access).toThrow(ResourceDisposedError)
    }
  })

  /** 字段现场保留块 label，且不能被传入 details 覆盖。 */
  it('沿用 RenderingError 并冻结诊断现场', () => {
    const error = new InvalidParameterBlockError('sun', 'entries.uBias', 'invalid', {
      label: 'wrong'
    })
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.code).toBe('INVALID_PARAMETER_BLOCK')
    expect(error.details).toMatchObject({
      label: 'sun',
      fieldName: 'entries.uBias',
      reason: 'invalid'
    })
    expect(Object.isFrozen(error.details)).toBe(true)
  })
})
