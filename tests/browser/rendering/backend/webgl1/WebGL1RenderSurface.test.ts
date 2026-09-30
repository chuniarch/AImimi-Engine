import { describe, expect, it } from 'vitest'

import { WebGL1State } from '@/rendering/backend/webgl1/WebGL1State'
import { WebGL1SurfaceScope } from '@/rendering/backend/webgl1/WebGL1SurfaceScope'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { RenderTarget } from '@/rendering/resources/RenderTarget'

/**
 * 真实 WebGL1 设备测试，仅验证 scope 与 clear，不冒充 Backend 的三角形 draw 验收。
 *
 * @remarks
 * 测试自己建立完整 FBO，避免依赖尚未录入的 Task 13–14 Manager。
 * GPU 对象仅属于测试夹具；正式 Scope 不承担它们的创建与删除。
 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16

  const gl = requireNonNull(
    canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true
    }),
    () => new Error('Browser test requires WebGL1')
  )

  const framebuffer = requireNonNull(
    gl.createFramebuffer(),
    () => new Error('Test framebuffer allocation failed')
  )

  const texture = requireNonNull(
    gl.createTexture(),
    () => new Error('Test texture allocation failed')
  )

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    throw new Error('Test framebuffer is incomplete')
  }

  const target = new RenderTarget({
    width: 8,
    height: 8,
    colors: [{ format: 'rgba8' }]
  })

  const scope = new WebGL1SurfaceScope(gl, new WebGL1State(gl), {
    assertReady: () => {
      if (gl.isContextLost()) throw new Error('Test context unexpectedly lost')
    },

    isCurrent: () => true,

    resolveTarget: (requested) => {
      if (requested !== target) throw new Error('Unknown test target')
      return { framebuffer, width: 8, height: 8 }
    }
  })

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return {
    gl,
    target,
    scope,
    framebuffer,

    readPixel(x: number, y: number): number[] {
      const pixels = new Uint8Array(4)
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      return Array.from(pixels)
    },

    dispose(): void {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
      target.dispose()
    }
  }
}

describe('WebGL1 render surface real-device contract', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][surface-clear-write-masks]
   * 右上像素位于 1×1 scissor 之外；若未暂时关闭 scissor，它不会变红。
   * 若未暂时启用全部颜色写入，结果也不会是 [255, 0, 0, 255]。
   */
  it('真实像素证明整附件清除不受旧写掩码与 scissor 限制', () => {
    const f = fixture()
    const { gl } = f

    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.framebuffer)
      gl.viewport(2, 3, 4, 5)
      gl.colorMask(false, true, false, false)
      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(0, 0, 1, 1)

      f.scope.run(
        {
          surface: { kind: 'render-target', target: f.target },
          clear: { color: [1, 0, 0, 1] }
        },
        () => {
          expect(f.readPixel(7, 7)).toEqual([255, 0, 0, 255])
          expect(gl.getParameter(gl.COLOR_WRITEMASK)).toEqual([false, true, false, false])
          expect(gl.isEnabled(gl.SCISSOR_TEST)).toBe(true)
        }
      )

      expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(f.framebuffer)
      expect(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)).toEqual([2, 3, 4, 5])
      expect(gl.getError()).toBe(gl.NO_ERROR)
    } finally {
      f.dispose()
    }
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][surface-entry-clear-once]
   * 内层前写入蓝色；若内层退出错误地重清外层为红色，readPixels 会发现。
   */
  it('嵌套异常恢复外层 FBO，且不重复执行外层 clear', () => {
    const f = fixture()
    const { gl } = f
    const error = new Error('intentional callback failure')

    try {
      gl.viewport(1, 2, 10, 11)

      f.scope.run(
        {
          surface: { kind: 'render-target', target: f.target },
          clear: { color: [1, 0, 0, 1] }
        },
        () => {
          // 测试夹具直接改变像素，用来区分“恢复绑定”和“重新清除”。
          gl.clearColor(0, 0, 1, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)

          expect(() =>
            f.scope.run(
              {
                surface: { kind: 'default-framebuffer' },
                clear: { color: [0, 1, 0, 1] }
              },
              () => {
                throw error
              }
            )
          ).toThrow(error)

          expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(f.framebuffer)
          expect(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)).toEqual([0, 0, 8, 8])
          expect(f.readPixel(4, 4)).toEqual([0, 0, 255, 255])
        }
      )

      expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBeNull()
      expect(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)).toEqual([1, 2, 10, 11])
      expect(gl.getError()).toBe(gl.NO_ERROR)
    } finally {
      f.dispose()
    }
  })
})
