import { describe, expect, it } from 'vitest'

import {
  InvalidMaterialError,
  InvalidPerspectiveCameraError,
  InvalidRenderTargetError
} from '@/rendering/core/errors'
import {
  assertNonArrayObject,
  requireBoolean,
  requireFiniteNumber
} from '@/rendering/core/validation'

/**
 * 验证共享的是输入规则，而错误类型、上下文和实例仍由调用者决定。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][validation-rule-error-separation]
 * 使用真实领域错误和计数变量，捕获提前创建错误、包装错误或重复调用工厂的实现。
 * 合法输入的期望值来自字面量，不通过被测函数计算。
 */
describe('validation', () => {
  describe('assertNonArrayObject', () => {
    /**
     * Given 各种非数组对象；When 验证外层形状；Then 保留身份且不创建错误。
     * 如果误加“只能是普通对象”的限制，Date、Map 或类实例会错误地被拒绝。
     */
    it.each([{}, new Date(0), new Map(), new Set(), new Uint8Array(0)])(
      '接受非数组对象并保留身份 %j',
      (value) => {
        const original: unknown = value
        let factoryCalls = 0

        assertNonArrayObject(original, () => {
          factoryCalls += 1
          return new InvalidMaterialError('options', 'must be a non-array object')
        })

        // 静态收窄只保证 object，不声称字段已经通过验证。
        const narrowed: object = original
        expect(narrowed).toBe(value)
        expect(factoryCalls).toBe(0)
      }
    )

    /**
     * Given null、数组或非对象值；When 验证；Then 抛出调用者指定的同一个错误。
     * 防止遗漏 null/数组检查，以及把函数误当作 typeof 为 object 的输入。
     */
    it.each([null, undefined, [], 0, '', false, () => undefined])('拒绝非对象描述 %j', (value) => {
      const error = new InvalidRenderTargetError('descriptor', 'must be a non-array object')
      let factoryCalls = 0

      expect(() =>
        assertNonArrayObject(value, () => {
          factoryCalls += 1
          return error
        })
      ).toThrow(error)

      expect(factoryCalls).toBe(1)
    })
  })

  describe('requireBoolean', () => {
    /** Given true/false；When 验证；Then 原样返回，false 不被当成缺失值。 */
    it.each([true, false])('原样保留合法 boolean %s', (value) => {
      let factoryCalls = 0

      expect(
        requireBoolean(value, () => {
          factoryCalls += 1
          return new InvalidMaterialError('state.depthWrite', 'must be a boolean')
        })
      ).toBe(value)
      expect(factoryCalls).toBe(0)
    })

    /** 防止使用 Boolean(value) 或 truthy/falsy 判断，悄悄接受外部数据。 */
    it.each([null, undefined, 0, 1, 'true', [], {}])('拒绝隐式布尔转换 %j', (value) => {
      const error = new InvalidMaterialError('state.depthWrite', 'must be a boolean')
      let factoryCalls = 0

      expect(() =>
        requireBoolean(value, () => {
          factoryCalls += 1
          return error
        })
      ).toThrow(error)

      expect(factoryCalls).toBe(1)
    })
  })

  describe('requireFiniteNumber', () => {
    /**
     * Given 有限 Number（包括正负零和超出 Float32 范围的值）；When 验证；
     * Then 不转换精度、不钳制、不施加正数或整数等调用者专属约束。
     */
    it.each([0, -0, 0.1, -1, Number.MAX_VALUE, 1e100])('原样保留有限 Number %s', (value) => {
      let factoryCalls = 0

      expect(
        requireFiniteNumber(value, () => {
          factoryCalls += 1
          return new InvalidPerspectiveCameraError('aspect', 'must be a finite number')
        })
      ).toBe(value)
      expect(factoryCalls).toBe(0)
    })

    /** 防止省略 typeof 检查、数字字符串转换，或漏掉 NaN/Infinity。 */
    it.each([null, undefined, false, '1.6', {}, NaN, Infinity, -Infinity])(
      '拒绝非法有限数字 %j',
      (value) => {
        const error = new InvalidPerspectiveCameraError('aspect', 'must be a finite number', {
          received: value
        })
        let factoryCalls = 0

        expect(() =>
          requireFiniteNumber(value, () => {
            factoryCalls += 1
            return error
          })
        ).toThrow(error)

        expect(factoryCalls).toBe(1)
      }
    )
  })

  /**
   * Given 三个不同领域的错误实例；When 共享验证失败；Then 不包装或替换实例。
   * toThrow(error) 主要比较错误信息，此处用 toBe 明确保护错误身份与领域上下文。
   */
  it('失败时保留领域错误的实例身份', () => {
    const objectError = new InvalidRenderTargetError('descriptor', 'must be a non-array object')
    const booleanError = new InvalidMaterialError('state.depthWrite', 'must be a boolean')
    const numberError = new InvalidPerspectiveCameraError('aspect', 'must be a finite number', {
      received: '1.6'
    })
    const attempts = [
      { run: () => assertNonArrayObject(null, () => objectError), expected: objectError },
      { run: () => requireBoolean(1, () => booleanError), expected: booleanError },
      { run: () => requireFiniteNumber('1.6', () => numberError), expected: numberError }
    ]

    for (const { run, expected } of attempts) {
      let caught: unknown

      try {
        run()
      } catch (error) {
        caught = error
      }

      expect(caught).toBe(expected)
    }
  })
})
