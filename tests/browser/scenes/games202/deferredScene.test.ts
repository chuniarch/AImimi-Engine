import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Engine } from '@/engine'
import { openDeferredSceneSession } from '@/gui/games202/openDeferredSceneSession'
import { Renderer } from '@/rendering/Renderer'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import { Mesh } from '@/rendering/scene/Mesh'
import { createDeferredScene } from '@/scenes/games202/deferred/createDeferredScene'
import type { SceneContext } from '@/scenes/types/SceneContext'

/** 真实 SceneSetup/Renderer/Backend/GPU，不用手工 RenderItem 代替场景提取。 */
async function fixture() {
  const result = await createDeferredScene(new AbortController().signal)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  document.body.append(canvas)
  const backend = new WebGL1Backend(canvas, 'test/Deferred scene', {
    antialias: false,
    preserveDrawingBuffer: true
  })
  const gl = canvas.getContext('webgl')!
  const pipeline = new RenderPipeline()
  for (const pass of result.passes) pipeline.addPass(pass)
  const renderer = new Renderer(backend, pipeline, new RenderListBuilder())
  onTestFinished(() => {
    try {
      renderer.dispose()
    } finally {
      result.scene.dispose()
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  })
  for (const name of ['WEBGL_draw_buffers', 'OES_texture_float', 'WEBGL_color_buffer_float']) {
    if (!gl.getExtension(name)) throw new Error('GPU acceptance requires ' + name)
  }
  let frameNumber = 0
  function render(width = 64, height = 64): Uint8Array {
    backend.resizeDrawingBuffer(width, height, 1)
    const { camera } = result
    camera.setPerspective({
      fovY: camera.fovY,
      aspect: width / height,
      near: camera.near,
      far: camera.far
    })
    renderer.render({
      scene: result.scene,
      camera,
      frame: {
        frameNumber: ++frameNumber,
        timeSeconds: frameNumber / 60,
        deltaSeconds: 1 / 60,
        drawingBufferWidth: width,
        drawingBufferHeight: height,
        pixelRatio: 1
      }
    })
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return pixels
  }
  return { ...result, canvas, gl, backend, render }
}

/** 独立手算：front cosine=4/sqrt(50)，intensity=PI 抵消 Lambert 的 PI。 */
function expectFront(pixels: Uint8Array, width: number, height: number): void {
  const offset = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
  const expected = [179, 94, 68]
  for (let c = 0; c < 3; c++)
    expect(Math.abs(pixels[offset + c]! - expected[c]!)).toBeLessThanOrEqual(2)
}

/** 事件监听先登记；超时显式失败，不将缺失恢复事件当作跳过成功。 */
async function contextEvent(
  canvas: HTMLCanvasElement,
  name: string,
  trigger: () => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      canvas.removeEventListener(name, done)
      reject(new Error('timeout: ' + name))
    }, 10000)
    function done() {
      clearTimeout(timeout)
      resolve()
    }
    canvas.addEventListener(name, done, { once: true })
    trigger()
  })
}

describe('Deferred scene real GPU', () => {
  /** 把地面放在后提交，深度测试仍应保留前方橙色方块。 */
  it('地面后画也不会盖过方块，画面含灰色地面和橙色模型', async () => {
    const f = await fixture()
    const floor = f.scene.children.find(
      (node) => node instanceof Mesh && node.name === 'Deferred floor'
    )!
    floor.removeFromParent()
    f.scene.add(floor)
    const pixels = f.render()
    expectFront(pixels, 64, 64)
    let gray = 0,
      orange = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (
        pixels[i]! > 80 &&
        Math.abs(pixels[i]! - pixels[i + 1]!) < 3 &&
        Math.abs(pixels[i + 1]! - pixels[i + 2]!) < 3
      )
        gray++
      if (pixels[i]! > pixels[i + 1]! + 30 && pixels[i + 1]! > pixels[i + 2]! + 10) orange++
    }
    expect(gray).toBeGreaterThan(100)
    expect(orange).toBeGreaterThan(100)
  })

  /** 删除逐帧灯光提取或忘记 resize 附件都会失败。 */
  it('灯光归零后无旧光照，恢复强度与 resize 后重新生产', async () => {
    const f = await fixture()
    expectFront(f.render(), 64, 64)
    f.light.setIntensity(0)
    const dark = f.render()
    for (let i = 0; i < dark.length; i += 4) expect([...dark.slice(i, i + 3)]).toEqual([0, 0, 0])
    f.light.setIntensity(Math.PI)
    expectFront(f.render(80, 48), 80, 48)
    const target = f.passes.find((pass) => pass instanceof GBufferPass)!.target
    expect(target.width).toBe(80)
    expect(target.height).toBe(48)
  })

  /** CPU Scene/Pass 保留，恢复只重建 GPU 表示；生产者必须重新画全部附件。 */
  it('context 恢复后的首个新帧重新生产同一画面', async () => {
    const f = await fixture()
    const before = f.render()
    const lose = f.gl.getExtension('WEBGL_lose_context')
    if (!lose) throw new Error('WEBGL_lose_context required')
    await contextEvent(f.canvas, 'webglcontextlost', () => lose.loseContext())
    expect(f.backend.ready).toBe(false)
    expect(f.scene.disposed).toBe(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await contextEvent(f.canvas, 'webglcontextrestored', () => lose.restoreContext())
    await vi.waitFor(() => expect(f.backend.ready).toBe(true))
    expect(f.render()).toEqual(before)
  }, 30000)

  /** 真正 Engine rAF/GUI/同一 context；不在测试里替换 setScene 或 Backend。 */
  it('真实 Engine 进入、退出并再次进入，旧模式只在退出后获准', async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = canvas.style.height = '64px'
    const stack = document.createElement('div')
    stack.id = 'gui-stack'
    document.body.append(canvas, stack)
    const engine = Engine.create(canvas)
    const gl = canvas.getContext('webgl')!
    const legacy = vi.spyOn(engine.legacyRenderer, 'render')
    const createFBO = vi.spyOn(gl, 'createFramebuffer')
    const failures: unknown[] = []
    let close: (() => void) | undefined
    let context!: SceneContext
    onTestFinished(() => {
      try {
        close?.()
      } finally {
        engine.dispose()
        legacy.mockRestore()
        createFBO.mockRestore()
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        canvas.remove()
        stack.remove()
        document.getElementById('performance-monitor')?.remove()
      }
    })
    await engine.loadScene(async (ctx) => {
      context = ctx
      close = await openDeferredSceneSession(ctx, (error) => failures.push(error))
    })
    engine.start()
    await vi.waitFor(() => expect(createFBO).toHaveBeenCalled(), { timeout: 10000 })
    const previous = engine.currentSceneBinding!.scene
    expect(engine.lastFailure).toBeNull()
    expect(legacy).not.toHaveBeenCalled()
    engine.stop()
    close!()
    close = undefined
    expect(previous.disposed).toBe(true)
    expect(() => engine.assertLegacyMode()).not.toThrow()
    const count = createFBO.mock.calls.length
    close = await openDeferredSceneSession(context, (error) => failures.push(error))
    engine.start()
    await vi.waitFor(() => expect(createFBO.mock.calls.length).toBeGreaterThan(count), {
      timeout: 10000
    })
    expect(engine.currentSceneBinding!.scene).not.toBe(previous)
    expect(engine.lastFailure).toBeNull()
    expect(failures).toEqual([])
    expect(legacy).not.toHaveBeenCalled()
    engine.stop()
  }, 30000)
})
