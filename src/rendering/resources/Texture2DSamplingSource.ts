import type { RenderingErrorDetails } from '@/rendering/core/errors/RenderingError'
import { InvalidMaterialError } from '@/rendering/core/errors'
import { assertNonArrayObject } from '@/rendering/core/validation'
import { RenderTarget, type RenderTargetAttachmentRef } from '@/rendering/resources/RenderTarget'
import { Texture2D } from '@/rendering/resources/Texture2D'

/**
 * Material 的二维采样来源：CPU 纹理资源，或离屏目标中的一个附件地址。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][render-target-attachment-borrowing]
 *
 * 两者都不包含可跨 context 使用的 GPU handle。
 * Texture2D 由纹理 Manager 上传；附件由 RenderTarget Manager 解析。
 * Material 只借用资源，不因保存此值而 retain、release 或 dispose 它。
 */
export type Texture2DSamplingSource = Texture2D | RenderTargetAttachmentRef

/** 同一采样规则可供材质或参数块使用；仅错误的领域与上下文不同。 */
export type SamplingSourceErrorFactory = (
  fieldName: string,
  reason: string,
  details?: RenderingErrorDetails
) => Error

/** 保持旧的两参数调用兼容，默认仍报告 InvalidMaterialError。 */
const materialError: SamplingSourceErrorFactory = (fieldName, reason, details) =>
  new InvalidMaterialError(fieldName, reason, details)

/**
 * 验证二维采样来源；保留纹理身份，复制并冻结附件地址。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
 *
 * 例如输入 { target: shadowTarget, kind: 'color', index: 0 }：
 * - 复制的是三字段地址包装，不是 RenderTarget，也不是附件中的像素；
 * - 不保存 revision，resize 后仍由同一个 target 解析当前附件；
 * - 只冻结新包装，不冻结调用者的对象或 target；
 * - 每次调用均重新检查资源是否存活，旧引用不能让已释放资源复活。
 *
 * 本函数只证明逻辑地址存在，不证明当前设备支持采样。
 * depth[0] 可以是合法 CPU 地址，但 WebGL1 的 depth16 renderbuffer
 * 仍须由 Backend 在采样时拒绝。这里不查询 WebGL、不创建 GPU 存储。
 *
 * @param value - 可能来自 JavaScript 的任意值，不能只信任 TypeScript 类型。
 * @param fieldName - 调用者提供的诊断路径，例如 parameters.uShadowMap。
 * @returns 同一个活 Texture2D，或一个新的冻结附件包装。
 * @param createError - 非法输入的惰性领域错误工厂；省略时保持 Material 旧行为。
 * @throws createError 返回的错误：来源、目标类型、附件种类或索引不合法。
 * @throws ResourceDisposedError 纹理或目标已开始释放。
 */
export function copyTexture2DSamplingSource(
  value: unknown,
  fieldName: string,
  createError: SamplingSourceErrorFactory = materialError
): Texture2DSamplingSource {
  if (value instanceof Texture2D) {
    value.assertUsable()
    return value
  }

  assertNonArrayObject(value, () =>
    createError(fieldName, 'must reference a Texture2D or a RenderTarget attachment')
  )

  // 只断言可读取字段；各字段仍是 unknown，不能把未验证输入断言为合法附件。
  const input = value as Readonly<Record<string, unknown>>
  const target = input.target
  const kind = input.kind
  const index = input.index

  if (!(target instanceof RenderTarget))
    throw createError(fieldName + '.target', 'must reference a RenderTarget')

  target.assertUsable()

  if (kind !== 'color' && kind !== 'depth')
    throw createError(fieldName + '.kind', 'must be color or depth', {
      received: kind
    })

  if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 0)
    throw createError(fieldName + '.index', 'must be a non-negative safe integer', {
      received: index
    })

  const descriptor = target.descriptor
  if (kind === 'color' && index >= descriptor.colors.length)
    throw createError(fieldName + '.index', 'must name an existing color slot', {
      received: index,
      colorCount: descriptor.colors.length,
      targetLabel: target.label
    })

  if (kind === 'depth' && (index !== 0 || descriptor.depth === undefined))
    throw createError(fieldName + '.index', 'must name an existing depth[0]', {
      received: index,
      targetLabel: target.label
    })

  return Object.freeze({
    target,
    kind,
    index
  })
}
