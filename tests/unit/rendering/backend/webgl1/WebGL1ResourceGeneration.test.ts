import { describe, expect, it } from 'vitest'
import { WebGLContextLostError } from '@/rendering/core/errors'
import { withTextureUploadState } from '@/rendering/backend/webgl1/WebGL1TextureUploadSupport'
import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import { createFakeWebGL1StorageContext } from '../fakes/createFakeWebGL1StorageContext'
import { createFakeWebGL1TextureContext } from '../fakes/createFakeWebGL1TextureContext'

/**
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 * 保护永久失效和代次隔离；真实 GPU handle 不进入 CPU 资源。
 */
describe('WebGL1ResourceGeneration', () => {
  async function setup() {
    const { WebGL1ResourceGeneration } = await import(
      '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
    )
    const fake = createFakeWebGL1TextureContext()
    return { ...fake, guard: new WebGL1ResourceGeneration(fake.gl), WebGL1ResourceGeneration }
  }
  it('G01: 独立代次使用不同 token，同一 guard 的 token 稳定', async () => {
    const { guard, gl, WebGL1ResourceGeneration } = await setup()
    const token = guard.token
    guard.assertCurrent('allocate')
    expect(typeof token).toBe('symbol')
    expect(guard.token).toBe(token)
    expect(new WebGL1ResourceGeneration(gl).token).not.toBe(token)
  })
  it('G02: 物理 lost 后恢复仍不能重新使用旧代', async () => {
    const { guard, setLost } = await setup()
    setLost(true)
    expect(() => guard.assertCurrent('allocate')).toThrow(WebGLContextLostError)
    setLost(false)
    expect(() => guard.assertCurrent('restore old binding')).toThrow(WebGLContextLostError)
    expect(guard.lost).toBe(true)
  })
  it('G02: lost getter 的观察也会锁存失效', async () => {
    const { guard, setLost } = await setup()
    setLost(true)
    expect(guard.lost).toBe(true)
    setLost(false)
    expect(() => guard.assertCurrent('read cache')).toThrow(WebGLContextLostError)
  })
  it('G02: 显式 invalidate 无需物理 lost，不发任何资源 GL 命令', async () => {
    const { guard, api } = await setup()
    guard.invalidate()
    guard.invalidate()
    expect(() => guard.assertCurrent('publish')).toThrow(WebGLContextLostError)
    expect(api.bindTexture).not.toHaveBeenCalled()
    expect(api.deleteTexture).not.toHaveBeenCalled()
  })
  it('G01: 恢复后的新 guard 可用而旧 guard 保持失效', async () => {
    const { guard, gl, setLost, WebGL1ResourceGeneration } = await setup()
    setLost(true)
    expect(guard.lost).toBe(true)
    setLost(false)
    const restored = new WebGL1ResourceGeneration(gl)
    expect(() => restored.assertCurrent('new allocation')).not.toThrow()
    expect(() => guard.assertCurrent('old allocation')).toThrow(WebGLContextLostError)
    expect(restored.token).not.toBe(guard.token)
  })
})

/** [DESIGN-WEIGHT:3][texture-upload-state-scope] */
describe('C3 upload state recovery', () => {
  function setupUpload() {
    const fake = createFakeWebGL1StorageContext()
    const gl = fake.gl
    gl.activeTexture(gl.TEXTURE0 + 3)
    const previous = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, previous)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 8)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    fake.clearCommands()
    return { ...fake, guard: new WebGL1ResourceGeneration(gl), previous }
  }
  function caught(action: () => unknown): { threw: boolean; cause?: unknown } {
    try {
      action()
      return { threw: false }
    } catch (cause) {
      return { threw: true, cause }
    }
  }
  it('恢复原 unit、texture binding 和四项 unpack，不提前切换至 TEXTURE0', () => {
    const { gl, guard, previous } = setupUpload()
    const result = withTextureUploadState(gl, gl.TEXTURE_2D, guard, () => {
      expect(gl.getParameter(gl.ACTIVE_TEXTURE)).toBe(gl.TEXTURE0 + 3)
      expect(gl.getParameter(gl.UNPACK_ALIGNMENT)).toBe(1)
      expect(gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL)).toBe(false)
      expect(gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(false)
      expect(gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)).toBe(gl.NONE)
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
      return 42
    })
    expect(result).toBe(42)
    expect(gl.getParameter(gl.TEXTURE_BINDING_2D)).toBe(previous)
    expect(gl.getParameter(gl.UNPACK_ALIGNMENT)).toBe(8)
    expect(gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL)).toBe(true)
    expect(gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(true)
    expect(gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)).toBe(gl.BROWSER_DEFAULT_WEBGL)
  })
  it('G02: 物理恢复也不能在 finally 绑定旧 handle', () => {
    const fake = setupUpload()
    let boundary = 0
    expect(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.setLost(true)
        expect(fake.guard.lost).toBe(true)
        fake.restore()
        boundary = fake.commands.length
      })
    ).toThrow(WebGLContextLostError)
    expect(fake.commands.slice(boundary)).toEqual([])
  })
  it('G02: 显式失效后 callback 正常返回也不能报告作用域成功', () => {
    const fake = setupUpload()
    let boundary = 0
    expect(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.guard.invalidate()
        boundary = fake.commands.length
        return 42
      })
    ).toThrow(WebGLContextLostError)
    expect(fake.commands.slice(boundary)).toEqual([])
  })
  it('G03: 业务失败与多项恢复失败保留原始原因，独立 unpack 继续恢复', () => {
    const fake = setupUpload()
    const a = new Error('business'),
      b = new Error('active unit'),
      c = new Error('alignment')
    const result = caught(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.injectOnce('activeTexture', { kind: 'throw', cause: b })
        fake.injectOnce('pixelStorei', { kind: 'throw', cause: c })
        throw a
      })
    )
    expect(result.cause).toBeInstanceOf(AggregateError)
    expect((result.cause as AggregateError).errors).toEqual([a, b, c])
    expect(fake.commands.filter((x) => x.operation === 'bindTexture')).toHaveLength(0)
    expect(fake.gl.getParameter(fake.gl.UNPACK_ALIGNMENT)).toBe(1)
    expect(fake.gl.getParameter(fake.gl.UNPACK_FLIP_Y_WEBGL)).toBe(true)
    expect(fake.gl.getParameter(fake.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(true)
    expect(fake.gl.getParameter(fake.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL)).toBe(
      fake.gl.BROWSER_DEFAULT_WEBGL
    )
  })
  it('G03: 无恢复失败时原样传播业务错误，包括 throw undefined', () => {
    const fake = setupUpload()
    const result = caught(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        throw undefined
      })
    )
    expect(result).toEqual({ threw: true, cause: undefined })
    expect(fake.gl.getParameter(fake.gl.UNPACK_ALIGNMENT)).toBe(8)
  })
  it('G03: 仅恢复失败也必须抛错，不能返回业务结果', () => {
    const fake = setupUpload(),
      b = new Error('binding')
    const result = caught(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.injectOnce('bindTexture', { kind: 'throw', cause: b })
        return 42
      })
    )
    expect(result).toEqual({ threw: true, cause: b })
    expect(fake.gl.getParameter(fake.gl.UNPACK_ALIGNMENT)).toBe(8)
  })
  it('G03: activeTexture 返回 GL error 时也跳过依赖 binding，仍恢复 unpack', () => {
    const fake = setupUpload()
    const result = caught(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.injectOnce('activeTexture', { kind: 'error', code: fake.gl.OUT_OF_MEMORY })
      })
    )
    expect(result.threw).toBe(true)
    expect(fake.commands.filter((x) => x.operation === 'bindTexture')).toHaveLength(0)
    expect(fake.gl.getParameter(fake.gl.UNPACK_ALIGNMENT)).toBe(8)
  })
  it('G03: 恢复中 lost 后停止后续 GL，保留先前业务错误', () => {
    const fake = setupUpload(),
      a = new Error('business')
    const result = caught(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        fake.injectOnce('activeTexture', { kind: 'lost' })
        throw a
      })
    )
    expect(result.cause).toBeInstanceOf(AggregateError)
    const errors = (result.cause as AggregateError).errors
    expect(errors[0]).toBe(a)
    expect(errors[1]).toBeInstanceOf(WebGLContextLostError)
    const index = fake.commands.findIndex((x) => x.operation === 'activeTexture')
    expect(fake.commands.slice(index + 1).every((x) => x.operation === 'isContextLost')).toBe(true)
  })
  it('失效代在捕获任何 GL 状态前拒绝进入，不执行 callback', () => {
    const fake = setupUpload()
    fake.guard.invalidate()
    let called = false
    expect(() =>
      withTextureUploadState(fake.gl, fake.gl.TEXTURE_2D, fake.guard, () => {
        called = true
      })
    ).toThrow(WebGLContextLostError)
    expect(called).toBe(false)
    expect(fake.commands).toEqual([])
  })
})
