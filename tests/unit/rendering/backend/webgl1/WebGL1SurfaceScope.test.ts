import { describe, expect, it, vi } from 'vitest'

import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
import { WebGL1SurfaceScope } from '@/rendering/backend/webgl1/WebGL1SurfaceScope'
import {
  RenderTargetUnavailableError,
  ResourceDisposedError,
  UnsupportedRenderFeatureError,
  WebGLContextLostError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { createFakeWebGL1Context } from '../fakes/createFakeWebGL1Context'

/**
 * 扩展现有 State fake，只记录 scope 所需的 clear 协议，不模拟真实像素。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 * 被测对象仍是真实 Scope + State；只在 WebGL API 边界替换浏览器设备。
 * params 表示实际 fake GL 状态，与生产 State 的 private 缓存相互独立。
 */
function harness() {
  const base = createFakeWebGL1Context()

  const constants = {
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    STENCIL_BUFFER_BIT: 0x0400,
    COLOR_WRITEMASK: 0x0c23,
    DEPTH_WRITEMASK: 0x0b72,
    STENCIL_WRITEMASK: 0x0b98,
    STENCIL_BACK_WRITEMASK: 0x8ca5,
    DEPTH_BITS: 0x0d56,
    STENCIL_BITS: 0x0d57,
    SCISSOR_TEST: 0x0c11,
    DITHER: 0x0bd0
  }

  const params = new Map<number, unknown>([
    [constants.COLOR_WRITEMASK, [false, true, false, true]],
    [constants.DEPTH_WRITEMASK, false],
    [constants.STENCIL_WRITEMASK, 3],
    [constants.STENCIL_BACK_WRITEMASK, 3],
    [constants.DEPTH_BITS, 24],
    [constants.STENCIL_BITS, 8]
  ])

  const enabled = new Set([constants.SCISSOR_TEST, constants.DITHER])
  const deleted = new Set<WebGLFramebuffer>()

  const clears: {
    bits: number
    framebuffer: unknown
    colorMask: unknown
    depthMask: unknown
    stencilMask: unknown
    scissor: boolean
  }[] = []

  let current = true

  const calls = {
    getParameter: vi.fn((name: number): unknown =>
      params.has(name) ? params.get(name) : base.gl.getParameter(name)
    ),

    isFramebuffer: vi.fn((value: WebGLFramebuffer) => !deleted.has(value)),

    isEnabled: vi.fn((cap: number) => enabled.has(cap)),

    enable: vi.fn((cap: number) => {
      enabled.add(cap)
    }),

    disable: vi.fn((cap: number) => {
      enabled.delete(cap)
    }),

    colorMask: vi.fn((r: boolean, g: boolean, b: boolean, a: boolean) => {
      params.set(constants.COLOR_WRITEMASK, [r, g, b, a])
    }),

    depthMask: vi.fn((value: boolean) => {
      params.set(constants.DEPTH_WRITEMASK, value)
    }),

    stencilMask: vi.fn((value: number) => {
      params.set(constants.STENCIL_WRITEMASK, value)
      params.set(constants.STENCIL_BACK_WRITEMASK, value)
    }),

    stencilMaskSeparate: vi.fn((face: number, value: number) => {
      params.set(
        face === base.gl.FRONT ? constants.STENCIL_WRITEMASK : constants.STENCIL_BACK_WRITEMASK,
        value
      )
    }),

    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    clearStencil: vi.fn(),

    clear: vi.fn((bits: number) => {
      clears.push({
        bits,
        framebuffer: base.gl.getParameter(base.gl.FRAMEBUFFER_BINDING),
        colorMask: params.get(constants.COLOR_WRITEMASK),
        depthMask: params.get(constants.DEPTH_WRITEMASK),
        stencilMask: params.get(constants.STENCIL_WRITEMASK),
        scissor: enabled.has(constants.SCISSOR_TEST)
      })
    })
  }

  const gl = { ...base.gl, ...constants, ...calls } as unknown as WebGLRenderingContext

  const resources = new Map<
    RenderTarget,
    {
      framebuffer: WebGLFramebuffer
      width: number
      height: number
    }
  >()

  const resolve = vi.fn((target: RenderTarget) => {
    const resource = resources.get(target)

    if (resource === undefined) throw new Error('missing test fixture')

    return resource
  })

  const scope = new WebGL1SurfaceScope(gl, new WebGL1State(gl), {
    assertReady: () => {
      if (!current || gl.isContextLost()) throw new WebGLContextLostError('test scope')
    },
    isCurrent: () => current,
    resolveTarget: resolve
  })

  return {
    gl,
    scope,
    calls,
    clears,
    params,
    enabled,
    deleted,
    resolve,
    base,

    retire: () => {
      current = false
    },

    target(width = 16, height = 8) {
      const target = new RenderTarget(
        { width, height, colors: [{ format: 'rgba8' }] },
        { label: 'test/surface-scope' }
      )

      const resource = { framebuffer: {}, width, height }
      resources.set(target, resource)

      return { target, resource }
    }
  }
}

const SCREEN: RenderSurfaceScopeDescriptor = {
  surface: { kind: 'default-framebuffer' }
}

describe('WebGL1SurfaceScope', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
   * 删除 finally，或把恢复目标写死成 null，都会使本测试失败。
   */
  it('正常退出恢复真实外层 FBO 和非默认 viewport', () => {
    const h = harness()
    const outer: WebGLFramebuffer = {}
    const inner = h.target()

    h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, outer)
    h.gl.viewport(3, 4, 80, 40)

    h.scope.run({ surface: { kind: 'render-target', target: inner.target } }, () => {
      expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBe(inner.resource.framebuffer)
      expect(Array.from(h.gl.getParameter(h.gl.VIEWPORT) as Int32Array)).toEqual([0, 0, 16, 8])
      expect(h.scope.active).toBe(true)
    })

    expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBe(outer)
    expect(Array.from(h.gl.getParameter(h.gl.VIEWPORT) as Int32Array)).toEqual([3, 4, 80, 40])
    expect(h.scope.active).toBe(false)
  })

  /** 目标解析可能已经修改 GL；捕获必须早于 resolveTarget。 */
  it('目标解析失败也恢复入口，且保留原始错误对象', () => {
    const h = harness()
    const target = h.target().target
    const outer: WebGLFramebuffer = {}
    const error = new Error('allocation failed')

    h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, outer)
    h.gl.viewport(1, 2, 30, 40)

    h.resolve.mockImplementationOnce(() => {
      h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, {})
      h.gl.viewport(0, 0, 1, 1)
      throw error
    })

    const callback = vi.fn(() => undefined)

    expect(() =>
      h.scope.run(
        {
          surface: { kind: 'render-target', target }
        },
        callback
      )
    ).toThrow(error)

    expect(callback).not.toHaveBeenCalled()
    expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBe(outer)
    expect(Array.from(h.gl.getParameter(h.gl.VIEWPORT) as Int32Array)).toEqual([1, 2, 30, 40])
  })

  /** 即使 JavaScript 抛出 undefined，也不能把它误判为“没有异常”。 */
  it('callback 抛出 undefined 时仍恢复并重新抛出', () => {
    const h = harness()
    let threw = false

    try {
      h.scope.run(SCREEN, () => {
        throw undefined
      })
    } catch (error: unknown) {
      threw = true
      expect(error).toBeUndefined()
    }

    expect(threw).toBe(true)
    expect(h.scope.active).toBe(false)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][surface-entry-clear-once]
   * 若内层退出时重走外层入口 clear，调用数量会从 2 变为 3。
   */
  it('嵌套按栈恢复，内层退出不再次清除外层', () => {
    const h = harness()
    const outer = h.target(32, 16)

    h.scope.run(
      {
        surface: { kind: 'render-target', target: outer.target },
        clear: { color: [1, 0, 0, 1] }
      },
      () => {
        expect(h.calls.clear).toHaveBeenCalledTimes(1)

        h.scope.run(
          {
            surface: { kind: 'default-framebuffer' },
            clear: { color: [0, 1, 0, 1] }
          },
          () => {
            expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBeNull()
          }
        )

        expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBe(outer.resource.framebuffer)
        expect(h.calls.clear).toHaveBeenCalledTimes(2)
      }
    )

    expect(h.clears.map((entry) => entry.framebuffer)).toEqual([outer.resource.framebuffer, null])
    expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBeNull()
  })

  it.each([undefined, {}])('省略或空 clear 不发送清除命令：%s', (clear) => {
    const h = harness()

    h.scope.run({ ...SCREEN, clear }, () => undefined)

    expect(h.calls.clear).not.toHaveBeenCalled()
    expect(h.calls.colorMask).not.toHaveBeenCalled()
  })

  /** 全附件 clear 不应受到上一次 draw 的写掩码或 scissor 限制。 */
  it('组合 clear 位，并临时开启写入；结束后恢复掩码和 scissor', () => {
    const h = harness()

    h.scope.run(
      {
        ...SCREEN,
        clear: { color: [0.2, 0.3, 0.4, 1], depth: 1, stencil: 0 }
      },
      () => {
        expect(h.clears).toEqual([
          {
            bits: 0x4500,
            framebuffer: null,
            colorMask: [true, true, true, true],
            depthMask: true,
            stencilMask: 0xffffffff,
            scissor: false
          }
        ])

        expect(h.params.get(h.gl.COLOR_WRITEMASK)).toEqual([false, true, false, true])
        expect(h.params.get(h.gl.DEPTH_WRITEMASK)).toBe(false)
        expect(h.params.get(h.gl.STENCIL_WRITEMASK)).toBe(3)
        expect(h.enabled.has(h.gl.SCISSOR_TEST)).toBe(true)
        expect(h.enabled.has(h.gl.DITHER)).toBe(true)
      }
    )
  })

  it('仅 depth clear 不顺便清除颜色', () => {
    const h = harness()

    h.scope.run({ ...SCREEN, clear: { depth: 0.5 } }, () => undefined)

    expect(h.calls.clear).toHaveBeenCalledExactlyOnceWith(h.gl.DEPTH_BUFFER_BIT)
    expect(h.calls.clearColor).not.toHaveBeenCalled()
    expect(h.calls.colorMask).not.toHaveBeenCalled()
  })

  it.each([
    null,
    { surface: null },
    { surface: { kind: 'unknown' } },
    { ...SCREEN, clear: null },
    { ...SCREEN, clear: { depth: 2 } },
    { ...SCREEN, clear: { stencil: 0.5 } },
    { ...SCREEN, clear: { color: [0, 0, NaN, 1] } },
    { ...SCREEN, clear: { color: [0, 0, 1] } }
  ])('非法输入在解析或绑定目标前被拒绝：%j', (input) => {
    const h = harness()

    expect(() =>
      h.scope.run(input as unknown as RenderSurfaceScopeDescriptor, () => undefined)
    ).toThrow(WebGLOperationError)

    expect(h.resolve).not.toHaveBeenCalled()
    expect(h.base.calls.bindFramebuffer).not.toHaveBeenCalled()
  })

  it('缺少 depth 附件时拒绝清除，不执行 callback', () => {
    const h = harness()
    h.params.set(h.gl.DEPTH_BITS, 0)

    const callback = vi.fn(() => undefined)

    expect(() => h.scope.run({ ...SCREEN, clear: { depth: 1 } }, callback)).toThrow(
      UnsupportedRenderFeatureError
    )

    expect(callback).not.toHaveBeenCalled()
    expect(h.calls.clear).not.toHaveBeenCalled()
  })

  it('已释放目标不解析成默认 framebuffer', () => {
    const h = harness()
    const target = h.target().target
    target.dispose()

    expect(() =>
      h.scope.run(
        {
          surface: { kind: 'render-target', target }
        },
        () => undefined
      )
    ).toThrow(ResourceDisposedError)

    expect(h.resolve).not.toHaveBeenCalled()
  })

  it('没有活动 scope 时拒绝 draw 前置检查', () => {
    const h = harness()

    expect(() => h.scope.assertDrawable()).toThrow(WebGLOperationError)

    h.scope.run(SCREEN, () => {
      expect(() => h.scope.assertDrawable()).not.toThrow()
    })
  })

  /** 这能检测违规修改，但不能撤销 owner 已经执行的 resize。 */
  it('callback 修改活动目标 revision 时拒绝成功退出', () => {
    const h = harness()
    const target = h.target().target

    expect(() =>
      h.scope.run(
        {
          surface: { kind: 'render-target', target }
        },
        () => {
          target.resize(64, 64)
        }
      )
    ).toThrow(RenderTargetUnavailableError)

    expect(h.gl.getParameter(h.gl.FRAMEBUFFER_BINDING)).toBeNull()
  })

  it('物理 lost 后不再尝试恢复旧绑定', () => {
    const h = harness()

    expect(() =>
      h.scope.run(SCREEN, () => {
        h.base.setLost(true)
        h.base.calls.bindFramebuffer.mockClear()
        h.base.calls.viewport.mockClear()
      })
    ).toThrow(WebGLContextLostError)

    expect(h.base.calls.bindFramebuffer).not.toHaveBeenCalled()
    expect(h.base.calls.viewport).not.toHaveBeenCalled()
  })

  /** isContextLost 已回到 false 也不能让旧 generation 的快照复活。 */
  it('当前 generation 被替换后不恢复旧快照', () => {
    const h = harness()

    expect(() =>
      h.scope.run(SCREEN, () => {
        h.retire()
        h.base.calls.bindFramebuffer.mockClear()
      })
    ).toThrow(WebGLContextLostError)

    expect(h.base.calls.bindFramebuffer).not.toHaveBeenCalled()
  })

  it('运行时发现非 undefined 返回值时恢复状态并报错', () => {
    const h = harness()
    const callback = (() => 7) as unknown as () => undefined

    expect(() => h.scope.run(SCREEN, callback)).toThrow(WebGLOperationError)
    expect(h.scope.active).toBe(false)
  })

  /** 不静默吞掉恢复失败，也不让它覆盖原始绘制错误。 */
  it('绘制和恢复都失败时按顺序保留两个错误', () => {
    const h = harness()
    const outer: WebGLFramebuffer = {}
    const original = new Error('draw failed')

    h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, outer)

    let caught: unknown

    try {
      h.scope.run(SCREEN, () => {
        h.deleted.add(outer)
        throw original
      })
    } catch (error: unknown) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AggregateError)

    const errors: unknown[] = (caught as AggregateError).errors

    expect(errors[0]).toBe(original)
    expect(errors[1]).toBeInstanceOf(RenderTargetUnavailableError)
  })
})
