/**
 * 确认输入是非 null、非数组的对象，并让调用方获得 object 类型收窄。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][validation-rule-error-separation]
 *
 * 共享函数负责外层形状规则；调用方通过惰性工厂选择领域错误及诊断上下文。
 * 正常返回后不改变输入、不创建错误，也不复制或冻结对象。
 * Date、Map、TypedArray 和普通类实例都可能通过；本函数不检查“普通对象”，
 * 不验证字段存在性、字段名或字段值，也不能证明输入满足某个完整描述类型。
 *
 * @param value - 尚未验证的运行时输入。
 * @param errorFactory - 验证失败时调用一次，并抛出其返回的原始错误实例。
 * @throws 调用方 errorFactory 提供的领域错误。
 */
export function assertNonArrayObject(
  value: unknown,
  errorFactory: () => Error
): asserts value is object {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw errorFactory()
  }
}

/**
 * 要求输入确实是 boolean，并原样返回 true 或 false。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][validation-rule-error-separation]
 *
 * false 是合法值；不使用 truthy/falsy 判断，也不执行 Boolean(value) 转换。
 * 输入不合法时才创建错误，错误类型、字段路径和上下文由调用方决定。
 *
 * @param value - 尚未验证的运行时输入。
 * @param errorFactory - 验证失败时调用一次，并抛出其返回的原始错误实例。
 * @returns 原始 boolean，不应用默认值。
 * @throws 调用方 errorFactory 提供的领域错误。
 */
export function requireBoolean(value: unknown, errorFactory: () => Error): boolean {
  if (typeof value !== 'boolean') {
    throw errorFactory()
  }

  return value
}

/**
 * 要求输入是有限的 JavaScript number，并原样返回。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][validation-rule-error-separation]
 *
 * 拒绝数字字符串、NaN 和正负 Infinity；保留正负零，不转换或钳制数值。
 * 成功只证明 Number 的类型与有限性，不保证正数、整数、安全整数或有限 Float32。
 * 例如 1e100 可以通过，但 Math.fround(1e100) 为 Infinity；相机值域、
 * 投影矩阵结果和 GPU Float32 uniform 仍须由各自调用方继续验证。
 *
 * @param value - 尚未验证的运行时输入。
 * @param errorFactory - 验证失败时调用一次，并抛出其返回的原始错误实例。
 * @returns 原始 number，不进行 Number(value) 或 Math.fround() 转换。
 * @throws 调用方 errorFactory 提供的领域错误。
 */
export function requireFiniteNumber(value: unknown, errorFactory: () => Error): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw errorFactory()
  }

  return value
}
