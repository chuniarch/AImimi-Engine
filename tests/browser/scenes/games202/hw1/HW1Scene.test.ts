import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import { mat4, vec4 } from 'gl-matrix'
import { Engine } from '@/engine'
import { setupGames202HWSceneGUI } from '@/gui/games202/setup'
import { Renderer } from '@/rendering/Renderer'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Mesh } from '@/rendering/scene/Mesh'
import { createHW1Scene } from '@/scenes/games202/hw1/createHW1Scene'

/**
 * 使用仓库真实 OBJ/MTL/PNG 和真实 GPU，不能用三角形 fixture 代替场景迁移验收。
 * Renderer 的输入仍是同一个 SceneSetup；只降低测试目标尺寸以缩短 GPU 验证时间。
 */
async function fixture() {
  const controller = new AbortController()
  const result = await createHW1Scene(controller.signal)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  canvas.style.width = canvas.style.height = '256px'
  document.body.append(canvas)
  const pipeline = new RenderPipeline()
  const lifecycle: { backend?: WebGL1Backend; renderer?: Renderer } = {}
  onTestFinished(() => {
    try {
      if (lifecycle.renderer) lifecycle.renderer.dispose()
      else {
        try {
          pipeline.dispose()
        } finally {
          lifecycle.backend?.dispose()
        }
      }
    } finally {
      try {
        result.scene.dispose()
      } finally {
        const gl = canvas.getContext('webgl')
        if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
        canvas.remove()
      }
    }
  })
  for (const pass of result.passes) pipeline.addPass(pass)
  const backend = new WebGL1Backend(canvas, 'test/HW1/Mary+Floor', {
    antialias: false,
    preserveDrawingBuffer: true
  })
  lifecycle.backend = backend
  const renderer = new Renderer(backend, pipeline, new RenderListBuilder())
  lifecycle.renderer = renderer
  const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL1 required'))
  result.shadow.setMapSize(512)
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  console.info(
    JSON.stringify({
      evidence: 'HW1/real-assets/GPU',
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER)
    })
  )
  let frameNumber = 0
  function render(): Uint8Array {
    frameNumber++
    renderer.render({
      scene: result.scene,
      camera: result.camera,
      frame: {
        frameNumber,
        timeSeconds: frameNumber / 60,
        deltaSeconds: 1 / 60,
        drawingBufferWidth: 256,
        drawingBufferHeight: 256,
        pixelRatio: 1
      }
    })
    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBeNull()
    const pixels = new Uint8Array(256 * 256 * 4)
    gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return pixels
  }
  return { ...result, canvas, backend, gl, render }
}

/** 忽略低于 4/255 的量化差，只统计具有肉眼意义的颜色变化。 */
function differences(a: Uint8Array, b: Uint8Array): number {
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.max(
        Math.abs(a[i]! - b[i]!),
        Math.abs(a[i + 1]! - b[i + 1]!),
        Math.abs(a[i + 2]! - b[i + 2]!)
      ) > 4
    )
      changed++
  }
  return changed
}

/** 可选证据目录不污染正式源码；保存的图只是补充，验收由像素断言决定。 */
async function screenshot(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const directory: unknown = import.meta.env.VITE_SHADOW_EVIDENCE_DIR
  if (typeof directory !== 'string' || !directory.startsWith('/')) return
  await page.screenshot({ path: directory + '/hw1-' + name + '.png', element: canvas })
}

/** 监听在触发之前登记；不代替生产代码调用 preventDefault。 */
async function contextEvent(
  canvas: HTMLCanvasElement,
  name: string,
  action: () => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      canvas.removeEventListener(name, listener)
    }
    const listener = () => {
      cleanup()
      resolve()
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Missing ' + name))
    }, 5000)
    canvas.addEventListener(name, listener, { once: true })
    try {
      action()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

describe('HW1 real Mary + Floor / lit receiver', () => {
  /**
   * [DESIGN-WEIGHT:3][hw1-real-assets-receiver]
   * 真实纹理、纯色部件、地板同时进入 Forward；关阴影只移除遮挡，不应关闭太阳。
   * 再关闭太阳，留下环境项，以像素差区分“光照开关”与“阴影开关”。
   */
  it('真实三部件、有色接收者、硬阴影和直接光照均出现在主画面', async () => {
    const f = await fixture()
    const meshes = f.scene.children.filter((node): node is Mesh => node instanceof Mesh)
    expect(meshes.map((mesh) => mesh.name.split('/')[0])).toEqual(['Mary', 'Mary', 'Floor'])
    // 真实模型的所有顶点都应留在垂直视锥中，不用“有颜色”冒充完整取景。
    const cameraWorld = mat4.create()
    const projection = mat4.create()
    f.camera.copyWorldMatrixTo(cameraWorld)
    f.camera.copyProjectionMatrixTo(projection)
    const view = mat4.invert(mat4.create(), cameraWorld)!
    for (const mesh of meshes.filter((entry) => entry.name.startsWith('Mary/'))) {
      const model = mat4.create()
      mesh.copyWorldMatrixTo(model)
      const mvp = mat4.multiply(
        mat4.create(),
        projection,
        mat4.multiply(mat4.create(), view, model)
      )
      const positions = mesh.geometry.getAttribute('position')!.copyData()
      let minY = Infinity
      let maxY = -Infinity
      for (let i = 0; i < positions.length; i += 3) {
        const clip = vec4.transformMat4(
          vec4.create(),
          [positions[i]!, positions[i + 1]!, positions[i + 2]!, 1],
          mvp
        )
        minY = Math.min(minY, clip[1] / clip[3])
        maxY = Math.max(maxY, clip[1] / clip[3])
      }
      expect(minY).toBeGreaterThan(-0.95)
      expect(maxY).toBeLessThan(0.95)
    }
    const shadowed = f.render()
    await screenshot(f.canvas, 'shadow-on')
    let colored = 0
    for (let i = 0; i < shadowed.length; i += 4) {
      if (
        Math.max(shadowed[i]!, shadowed[i + 1]!, shadowed[i + 2]!) -
          Math.min(shadowed[i]!, shadowed[i + 1]!, shadowed[i + 2]!) >
        20
      )
        colored++
    }
    expect(colored).toBeGreaterThan(100)
    f.light.castShadow = false
    const unshadowed = f.render()
    await screenshot(f.canvas, 'shadow-off')
    expect(differences(shadowed, unshadowed)).toBeGreaterThan(30)
    f.light.setIntensity(0)
    const ambient = f.render()
    await screenshot(f.canvas, 'ambient-only')
    expect(differences(ambient, unshadowed)).toBeGreaterThan(1000)
    console.info(
      JSON.stringify({
        evidence: 'HW1/real-assets/pixels',
        colored,
        shadowChanged: differences(shadowed, unshadowed),
        lightingChanged: differences(ambient, unshadowed)
      })
    )
  }, 30000)

  /**
   * [DESIGN-WEIGHT:3][hw1-lighting-frame-snapshot]
   * 灯移动后照明与阴影共同更新。恢复必须重建贴图及 GPU 派生深度图；不是重复旧像素。
   */
  it('灯移动改变画面，真实 context 恢复后首帧还原同一新方向的光照和阴影', async () => {
    const f = await fixture()
    const first = f.render()
    f.light.transform.setPosition([80, 80, 80])
    const moved = f.render()
    expect(differences(first, moved)).toBeGreaterThan(100)
    const expectedDirection = f.lightBlock.get('uDirectionToLightView')
    await screenshot(f.canvas, 'light-moved')
    const lose = requireNonNull(
      f.gl.getExtension('WEBGL_lose_context'),
      () => new Error('WEBGL_lose_context required')
    )
    await contextEvent(f.canvas, 'webglcontextlost', () => lose.loseContext())
    expect(f.backend.ready).toBe(false)
    expect(f.shadow.disposed).toBe(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await contextEvent(f.canvas, 'webglcontextrestored', () => lose.restoreContext())
    expect(f.backend.ready).toBe(true)
    const restored = f.render()
    expect(differences(moved, restored)).toBe(0)
    expect(f.lightBlock.get('uDirectionToLightView')).toEqual(expectedDirection)
    await screenshot(f.canvas, 'first-restored')
    f.light.transform.setPosition([0, 80, 80])
    expect(differences(first, f.render())).toBe(0)
    console.info(
      JSON.stringify({
        evidence: 'HW1/real-assets/restore',
        movedPixels: differences(first, moved),
        restoredMismatch: differences(moved, restored)
      })
    )
  }, 30000)

  /**
   * [DESIGN-WEIGHT:3][hw1-engine-real-handoff]
   * 真正经过应用 GUI、两个真实 loader、Engine rAF 与同一 context，spy 只观察不替换实现。
   * HW2→HW1 后旧场景必须释放，HW1 帧不得触发 legacy render；关闭后才能再次走旧帧。
   */
  it('真实 GUI 从 HW2 切入 HW1，再退出到旧模式，GPU 资源和帧归属随会话交接', async () => {
    const canvas = document.createElement('canvas')
    const stack = document.createElement('div')
    stack.id = 'gui-stack'
    document.body.append(canvas, stack)
    const engine = Engine.create(canvas)
    const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL required'))
    const legacy = vi.spyOn(engine.legacyRenderer, 'render')
    const textures = vi.spyOn(gl, 'createTexture')
    const buffers = vi.spyOn(gl, 'createBuffer')
    const framebuffers = vi.spyOn(gl, 'createFramebuffer')
    let close: (() => Promise<void>) | undefined
    onTestFinished(async () => {
      try {
        if (close) await close()
      } finally {
        engine.dispose()
        legacy.mockRestore()
        textures.mockRestore()
        buffers.mockRestore()
        framebuffers.mockRestore()
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        stack.remove()
        canvas.remove()
        // 旧 PerformanceMonitor 尚无 dispose；只移除本测试创建的诊断 DOM。
        document.getElementById('performance-monitor')?.remove()
      }
    })
    await engine.loadScene(async (context) => {
      close = await setupGames202HWSceneGUI(context)
    })
    engine.start()
    await vi.waitFor(() => expect(engine.currentSceneBinding).not.toBeNull(), { timeout: 15000 })
    // 等 HW2 真正提交过 GPU 帧，不能只等待 CPU 安装便立即切走。
    await vi.waitFor(() => expect(textures).toHaveBeenCalled(), { timeout: 15000 })
    expect(engine.lastFailure).toBeNull()
    const previous = engine.currentSceneBinding!.scene
    const selection = Array.from(stack.querySelectorAll('select')).find((entry) =>
      Array.from(entry.options).some((option) => option.value === 'HW1')
    )!
    expect(selection).toBeDefined()
    selection.value = 'HW1'
    selection.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(
      () => expect(engine.currentSceneBinding?.scene.name).toBe('HW1 / Mary + Floor / Hard Shadow'),
      { timeout: 15000 }
    )
    const current = engine.currentSceneBinding!.scene
    const mesh = current.children.find((entry): entry is Mesh => entry instanceof Mesh)!
    await vi.waitFor(() => expect(mesh.material.blocks[0]!.version).toBeGreaterThan(0))
    expect(previous.disposed).toBe(true)
    expect(legacy).not.toHaveBeenCalled()
    expect(engine.running).toBe(true)
    expect(engine.lastFailure).toBeNull()
    expect(engine.lastSceneCleanupFailure).toBeNull()
    expect(engine.lastPipelineCleanupFailure).toBeNull()
    expect(() => engine.assertLegacyMode()).toThrow()
    engine.stop()
    const createdTextures = textures.mock.results
      .map((result) => result.value as WebGLTexture | null)
      .filter((value): value is WebGLTexture => value !== null)
    const createdBuffers = buffers.mock.results
      .map((result) => result.value as WebGLBuffer | null)
      .filter((value): value is WebGLBuffer => value !== null)
    const createdFramebuffers = framebuffers.mock.results
      .map((result) => result.value as WebGLFramebuffer | null)
      .filter((value): value is WebGLFramebuffer => value !== null)
    expect(createdTextures.length).toBeGreaterThan(2)
    expect(createdBuffers.length).toBeGreaterThan(2)
    expect(createdFramebuffers.length).toBeGreaterThan(0)
    await close!()
    close = undefined
    expect(current.disposed).toBe(true)
    expect(engine.currentSceneBinding).toBeNull()
    expect(() => engine.assertLegacyMode()).not.toThrow()
    expect(createdTextures.every((handle) => !gl.isTexture(handle))).toBe(true)
    expect(createdBuffers.every((handle) => !gl.isBuffer(handle))).toBe(true)
    expect(createdFramebuffers.every((handle) => !gl.isFramebuffer(handle))).toBe(true)
    engine.start()
    await vi.waitFor(() => expect(legacy).toHaveBeenCalled())
    engine.stop()
    console.info(
      JSON.stringify({
        evidence: 'HW1/Engine/GUI/handoff',
        texturesDeleted: createdTextures.length,
        buffersDeleted: createdBuffers.length,
        framebuffersDeleted: createdFramebuffers.length,
        legacyOnlyAfterExit: true
      })
    )
  }, 30000)
})
