import { describe, expect, it } from 'vitest'
import { EngineError } from '@/errors/EngineError/BaseError'
import { RenderingError } from '@/rendering/core/errors/RenderingError'
import { CleanupFailureError } from '@/rendering/core/errors/CleanupFailureError'

describe('CleanupFailureError', () => {
  /** 防止丢弃非 Error 原因或把外部记录当成永久诊断快照。 */
  it('复制冻结本轮失败，保留原始 cause 和继承关系', () => {
    const cause = new Error('GPU failure')
    const first = { phase: 'listener' as const, label: 'context A', cause }
    const source = [first, { phase: 'listener' as const, label: 'context B', cause: undefined }]
    const error = new CleanupFailureError('Geometry', source)
    first.label = 'changed'
    source.pop()
    expect(error).toBeInstanceOf(EngineError)
    expect(error).toBeInstanceOf(RenderingError)
    expect(error.code).toBe('CLEANUP_FAILED')
    expect(error.recoverable).toBe(true)
    expect(error.details).toEqual({ ownerLabel: 'Geometry', failureCount: 2 })
    expect(error.failures.map((item) => item.label)).toEqual(['context A', 'context B'])
    expect(error.cause.errors).toEqual([cause, undefined])
    expect(error.failures[0]!.cause).toBe(cause)
    expect(Object.isFrozen(error.failures)).toBe(true)
    expect(Object.isFrozen(error.failures[0])).toBe(true)
    expect(Object.isFrozen(cause)).toBe(false)
  })
})
