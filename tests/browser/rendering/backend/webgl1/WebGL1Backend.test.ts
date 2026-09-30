import { describe, expect, it, vi } from 'vitest'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { Geometry } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import {
  InvalidMaterialError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLOperationError
} from '@/rendering/core/errors'
import type { DrawSubmission } from '@/rendering/backend/RenderBackend'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * 真实 WebGL 的最小验收夹具，不是最终 HW2 demo。
 * 不伪造编译结果、GPU handles 或像素；三角形只用于定位 Backend 问题。
 */
function setup(indexed = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32

  const backend = new WebGL1Backend(canvas, 'backend-browser-test', { antialias: false })

  const gl = canvas.getContext('webgl')!

  const shader = new ShaderModule({
    name: 'backend-triangle',
    language: 'glsl-es-100',

    vertexSource: `
      attribute vec3 position;
      uniform mat4 uModel;
      uniform mat4 uView;
      uniform mat4 uProjection;

      void main() {
        gl_Position =
          uProjection * uView * uModel * vec4(position, 1.0);
      }
    `,

    fragmentSource: `
      precision mediump float;
      uniform vec4 uColor;

      void main() {
        gl_FragColor = uColor;
      }
    `,

    builtInUniforms: {
      modelMatrix: 'uModel',
      viewMatrix: 'uView',
      projectionMatrix: 'uProjection'
    }
  })

  const geometry = new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array([-0.8, -0.8, 0, 0.8, -0.8, 0, 0, 0.8, 0]),
        itemSize: 3
      })
    },

    ...(indexed ? { indices: new Uint16Array([0, 1, 2]) } : {})
  })

  const material = new Material({
    shaderModule: shader,
    parameters: {
      uColor: { type: 'vec4', value: [1, 0, 0, 1] }
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
      cameraWorldPosition: [0, 0, 0]
    }
  }

  /** 在同步 scope 内读取，避免默认 framebuffer 在帧结束后被浏览器丢弃。 */
  const draw = () =>
    backend.withRenderSurface(
      {
        surface: { kind: 'default-framebuffer' },
        clear: {
          color: [0, 0, 1, 1],
          depth: 1
        }
      },
      () => {
        backend.draw(submission)

        const center = new Uint8Array(4)
        const outside = new Uint8Array(4)

        gl.readPixels(16, 16, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center)

        gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, outside)

        expect(Array.from(center)).toEqual([255, 0, 0, 255])
        expect(Array.from(outside)).toEqual([0, 0, 255, 255])
        expect(gl.getError()).toBe(gl.NO_ERROR)
      }
    )

  const dispose = () => {
    backend.dispose()
    material.dispose()
    geometry.dispose()
    shader.dispose()
  }

  return {
    canvas,
    backend,
    gl,
    shader,
    material,
    geometry,
    submission,
    draw,
    dispose
  }
}

/** 有界等待真实事件；超时是测试失败，不把未恢复视作通过。 */
function nextEvent(target: EventTarget, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = () => {
      clearTimeout(timer)
      resolve()
    }

    const timer = setTimeout(() => {
      target.removeEventListener(type, listener)
      reject(new Error('Timed out waiting for ' + type))
    }, 5000)

    target.addEventListener(type, listener, { once: true })
  })
}

describe('WebGL1Backend real GPU', () => {
  /**
   * [DESIGN-WEIGHT:3][test-backend-real-pixels]
   * 像素证明链路确实运行；spy 只辅助区分 drawArrays 与 drawElements 的选择。
   */
  it.each([false, true])('绘制真实三角形，indexed=%s', (indexed) => {
    const test = setup(indexed)
    const arrays = vi.spyOn(test.gl, 'drawArrays')
    const elements = vi.spyOn(test.gl, 'drawElements')

    try {
      test.draw()

      expect(arrays).toHaveBeenCalledTimes(indexed ? 0 : 1)
      expect(elements).toHaveBeenCalledTimes(indexed ? 1 : 0)
    } finally {
      arrays.mockRestore()
      elements.mockRestore()
      test.dispose()
    }
  })

  /** 相同 CPU 身份复用 GPU 表示；Backend dispose 不释放借用的 CPU Resource。 */
  it('重复 draw 复用 program/buffer，并独立结束 Backend 生命周期', () => {
    const test = setup()
    const programs = vi.spyOn(test.gl, 'createProgram')
    const buffers = vi.spyOn(test.gl, 'createBuffer')

    try {
      test.draw()
      test.draw()

      expect(programs).toHaveBeenCalledTimes(1)
      expect(buffers).toHaveBeenCalledTimes(1)

      test.backend.dispose()
      test.backend.dispose()

      expect(test.geometry.disposed).toBe(false)
      expect(test.material.disposed).toBe(false)
      expect(test.shader.disposed).toBe(false)

      expect(() => test.backend.draw(test.submission)).toThrow(WebGLBackendDisposedError)
    } finally {
      programs.mockRestore()
      buffers.mockRestore()
      test.dispose()
    }
  })

  /** 一次成功 draw 之后换成缺参材质，不能沿用 program 中残留的红色。 */
  it('缺参失败时不发 draw，并恢复原 framebuffer/viewport', () => {
    const test = setup()
    const draw = vi.spyOn(test.gl, 'drawArrays')

    const incomplete = new Material({
      shaderModule: test.shader
    })

    try {
      test.draw()
      draw.mockClear()

      test.gl.viewport(2, 3, 8, 9)

      expect(() =>
        test.backend.withRenderSurface(
          {
            surface: { kind: 'default-framebuffer' }
          },
          () => {
            test.backend.draw({
              ...test.submission,
              item: {
                ...test.submission.item,
                material: incomplete
              }
            })
          }
        )
      ).toThrow(InvalidMaterialError)

      expect(draw).not.toHaveBeenCalled()

      expect(test.gl.getParameter(test.gl.FRAMEBUFFER_BINDING)).toBeNull()

      expect(Array.from(test.gl.getParameter(test.gl.VIEWPORT) as Int32Array)).toEqual([2, 3, 8, 9])
    } finally {
      draw.mockRestore()
      incomplete.dispose()
      test.dispose()
    }
  })

  /** 非法操作在改变 drawing buffer/销毁资源之前拒绝，scope 随后仍可正常结束。 */
  it('只允许活动 scope 内 draw，禁止 scope 内 resize/dispose', () => {
    const test = setup()

    try {
      expect(() => test.backend.draw(test.submission)).toThrow(WebGLOperationError)

      test.backend.resizeDrawingBuffer(20, 10, 2)

      expect([test.canvas.width, test.canvas.height]).toEqual([40, 20])

      test.backend.withRenderSurface(
        {
          surface: { kind: 'default-framebuffer' }
        },
        () => {
          expect(() => test.backend.resizeDrawingBuffer(10, 10, 1)).toThrow(WebGLOperationError)

          expect(() => test.backend.dispose()).toThrow(WebGLOperationError)
        }
      )

      expect(test.backend.ready).toBe(true)
    } finally {
      test.dispose()
    }
  })

  /**
   * [DESIGN-WEIGHT:3][test-backend-context-generation]
   * 真正失去并恢复 context；仍使用同一组 CPU 资源，第二次 draw 必须创建新 handles。
   * 扩展不可用时明确 skip，不能声称该设备已通过 context 恢复验收。
   */
  it('恢复后延迟重建资源并再次产生正确像素', async (context) => {
    const test = setup()
    const extension = test.gl.getExtension('WEBGL_lose_context')

    if (extension === null) {
      test.dispose()
      context.skip()
      return
    }

    const programs = vi.spyOn(test.gl, 'createProgram')
    const buffers = vi.spyOn(test.gl, 'createBuffer')

    try {
      test.draw()

      const oldProgram = programs.mock.results[0]!.value
      const oldBuffer = buffers.mock.results[0]!.value

      const lost = nextEvent(test.canvas, 'webglcontextlost')

      extension.loseContext()
      await lost

      expect(test.backend.ready).toBe(false)

      expect(() => test.backend.draw(test.submission)).toThrow(WebGLContextLostError)

      /**
       * [DESIGN-WEIGHT:3][test-context-restore-event-boundary]
       * lost Promise 在事件 listener 内 resolve；先切到下一轮任务，确保浏览器
       * 完成本次事件派发，再调用要求 context 已可恢复的 restoreContext()。
       */
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 0)
      })

      const restored = nextEvent(test.canvas, 'webglcontextrestored')

      extension.restoreContext()
      await restored

      expect(test.backend.ready).toBe(true)

      // 恢复事件只重建管理对象；GPU program 仍等到下一次 draw 才创建。
      expect(programs).toHaveBeenCalledTimes(1)

      test.draw()

      expect(programs).toHaveBeenCalledTimes(2)
      expect(buffers).toHaveBeenCalledTimes(2)

      expect(programs.mock.results[1]!.value).not.toBe(oldProgram)

      expect(buffers.mock.results[1]!.value).not.toBe(oldBuffer)

      expect(test.backend.lastFailure).toBeNull()
    } finally {
      programs.mockRestore()
      buffers.mockRestore()
      test.dispose()
    }
  }, 15000)
})
