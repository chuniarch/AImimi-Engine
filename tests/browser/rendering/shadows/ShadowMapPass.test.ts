import { describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'
import { Renderer } from '@/rendering/Renderer'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { ShadowMapPass } from '@/rendering/passes/ShadowMapPass'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
import { DirectionalLight } from '@/rendering/scene/lights/DirectionalLight'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import { createPackedDepthShaderModule } from '@/rendering/shadows/createPackedDepthShaderModule'
import receiverVertex from '@/shaders/lighting/shadow/hardShadowVisibility/vertex.vert?raw'
import receiverFragment from '@/shaders/lighting/shadow/hardShadowVisibility/fragment.frag?raw'

const WHITE = [255, 255, 255, 255]
const BLACK = [0, 0, 0, 255]
const RED = [255, 0, 0, 255]
let gpuReported = false

/** 三处主画面取样点；readPixels 的原点在左下，所有点都远离几何与阴影边缘。 */
interface FramePixels {
  readonly left: number[]
  readonly right: number[]
  readonly caster: number[]
}

/**
 * 只记录实际运行设备，不把“WebGL context 存在”当作任何可见性断言的替代。
 * debug renderer 扩展属于可选诊断，缺少它仍然执行全部真实像素检查。
 */
function reportGPU(gl: WebGLRenderingContext): void {
  if (gpuReported) return
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  console.info(
    JSON.stringify({
      evidence: 'ShadowMapPass/GPU',
      version: String(gl.getParameter(gl.VERSION)),
      vendor: String(gl.getParameter(gl.VENDOR)),
      renderer: String(gl.getParameter(gl.RENDERER)),
      unmaskedVendor: debug === null ? null : String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)),
      unmaskedRenderer:
        debug === null ? null : String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    })
  )
  gpuReported = true
}

/**
 * 构造完整的真实渲染链，测试不替换 Backend、Builder、Pass 或 GLSL。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][shadow-pass-produce-before-publish]
 * 相机在 (0,0,2) 朝 -Z，接收面为 z=0 的 [-1,1]²；投影者在 z=1，半宽高 .18。
 * 光从 (-2,0,4) 指向原点，投影者中心的阴影沿光线落在 (.5,0,0)。
 * 96² 视口中的 (36,48)/(60,48) 对应接收面 x≈-.479/.521，分别应为白/黑。
 * 中心 (48,48) 应为投影者自身的红色，证明深度材质没有覆盖其 Forward 材质。
 *
 * [DESIGN-WEIGHT:3][directional-shadow-owned-resources]
 * Scene retain 共享 Geometry、各 ShaderModule、Material 以及 shadow 所有者。
 * shadow 独占的 target/block 不另行 retain；Renderer 拥有 Pipeline 和 Backend。
 * 创建 Backend 前就登记清理，正常顺序为 Renderer → Scene → loseContext → DOM。
 */
function fixture() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const scene = new Scene()
  const lifecycle: {
    backend?: WebGL1Backend
    pipeline?: RenderPipeline
    renderer?: Renderer
  } = {}

  onTestFinished(() => {
    try {
      if (lifecycle.renderer !== undefined) lifecycle.renderer.dispose()
      else {
        // 构造尚未完成时，所有权还没有交给 Renderer，也必须清理已完成的对象。
        try {
          lifecycle.pipeline?.dispose()
        } finally {
          lifecycle.backend?.dispose()
        }
      }
    } finally {
      try {
        scene.dispose()
      } finally {
        try {
          const context = canvas.getContext('webgl')
          if (context !== null && !context.isContextLost()) {
            context.getExtension('WEBGL_lose_context')?.loseContext()
          }
        } finally {
          canvas.remove()
        }
      }
    }
  })

  document.body.append(canvas)
  const backend = new WebGL1Backend(canvas, 'test/shadow-map-pass', {
    antialias: false,
    preserveDrawingBuffer: true
  })
  lifecycle.backend = backend
  const pipeline = new RenderPipeline()
  lifecycle.pipeline = pipeline
  const renderer = new Renderer(backend, pipeline, new RenderListBuilder())
  lifecycle.renderer = renderer
  const gl = requireNonNull(canvas.getContext('webgl'), () => new Error('WebGL1 required'))
  reportGPU(gl)

  const camera = new PerspectiveCamera({ fovY: Math.PI / 2, aspect: 1, near: 0.1, far: 10 })
  camera.transform.setPosition([0, 0, 2])
  const shadow = scene.retain(
    new DirectionalLightShadow({
      label: 'test/shadow-map-pass/sun',
      mapSize: 128,
      halfExtent: 2,
      near: 0.1,
      far: 10,
      bias: 0.001
    })
  )
  const depthShader = scene.retain(createPackedDepthShaderModule())
  pipeline.addPass(new ShadowMapPass({ depthShader }))
  pipeline.addPass(new ForwardPass())

  // 两个三角形都从 +Z 看为 CCW；真实 ShadowMapPass 的背面剔除必须保留它们。
  const geometry = scene.retain(
    new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]),
          itemSize: 3
        })
      }
    })
  )
  const receiverShader = scene.retain(
    new ShaderModule({
      name: 'test/shadow-map-pass/receiver',
      language: 'glsl-es-100',
      vertexSource: receiverVertex,
      fragmentSource: receiverFragment,
      builtInUniforms: {
        modelMatrix: 'uModelMatrix',
        viewMatrix: 'uViewMatrix',
        projectionMatrix: 'uProjectionMatrix'
      }
    })
  )
  const receiverMaterial = scene.retain(
    new Material({
      shaderModule: receiverShader,
      blocks: [shadow.block],
      parameters: {
        uLitColor: { type: 'vec3', value: [1, 1, 1] },
        uShadowColor: { type: 'vec3', value: [0, 0, 0] }
      },
      state: {
        depthTest: true,
        depthWrite: true,
        depthFunction: 'less',
        cullMode: 'none',
        dither: false
      }
    })
  )
  const casterShader = scene.retain(
    new ShaderModule({
      name: 'test/shadow-map-pass/red-surface',
      language: 'glsl-es-100',
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        void main() {
          gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentSource: `
        precision highp float;
        void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }
      `,
      builtInUniforms: {
        modelMatrix: 'uModelMatrix',
        viewMatrix: 'uViewMatrix',
        projectionMatrix: 'uProjectionMatrix'
      }
    })
  )
  const casterMaterial = scene.retain(
    new Material({
      shaderModule: casterShader,
      state: {
        depthTest: true,
        depthWrite: true,
        depthFunction: 'less',
        cullMode: 'none',
        dither: false
      }
    })
  )
  const receiver = new Mesh(geometry, receiverMaterial)
  const caster = new Mesh(geometry, casterMaterial)
  caster.transform.setPosition([0, 0, 1])
  caster.transform.setScale([0.18, 0.18, 1])
  caster.castShadow = true
  const light = new DirectionalLight({ targetWorld: [0, 0, 0], castShadow: true, shadow })
  light.transform.setPosition([-2, 0, 4])
  scene.add(receiver, caster, camera, light)
  let frameNumber = 0

  /** readPixels 等待所需的 GPU 结果；不插入原生 clear/draw/bind 修补引擎状态。 */
  function pixel(x: number): number[] {
    const bytes = new Uint8Array(4)
    gl.readPixels(x, 48, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes)
    expect(gl.getError()).toBe(gl.NO_ERROR)
    return Array.from(bytes)
  }

  /** 每一帧都从 Scene 重新提取，经同一 Pipeline 生产阴影再绘制主画面。 */
  function render(label: string): FramePixels {
    frameNumber++
    renderer.render({
      scene,
      camera,
      frame: {
        frameNumber,
        timeSeconds: frameNumber / 60,
        deltaSeconds: 1 / 60,
        drawingBufferWidth: canvas.width,
        drawingBufferHeight: canvas.height,
        pixelRatio: 1
      }
    })
    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBeNull()
    const pixels = { left: pixel(36), right: pixel(60), caster: pixel(48) }
    console.info(
      JSON.stringify({ evidence: 'ShadowMapPass/pixels', label, frameNumber, ...pixels })
    )
    return pixels
  }

  return { canvas, gl, backend, scene, shadow, receiverMaterial, caster, light, render }
}

/**
 * 先监听真实 context 事件，再触发浏览器扩展；缺事件时明确失败。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][test-context-restore-event-boundary]
 * Promise 只说明 listener 已执行，不代表整个事件派发已经结束。
 * 调用者必须在 lost 与 restoreContext 之间跨过一个浏览器 task。
 * 成功、超时、触发函数抛错时都清理本次 listener 和 timer。
 */
function triggerContextEvent(
  canvas: HTMLCanvasElement,
  type: 'webglcontextlost' | 'webglcontextrestored',
  trigger: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer)
      canvas.removeEventListener(type, listener)
    }
    const listener = () => {
      cleanup()
      resolve()
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for ' + type))
    }, 5000)
    canvas.addEventListener(type, listener, { once: true })
    try {
      trigger()
    } catch (error: unknown) {
      cleanup()
      reject(error)
    }
  })
}

/** 三个独立期望一起检查；红色中心还检查后续 ForwardPass 确实执行了表面材质。 */
function expectVisibility(
  pixels: FramePixels,
  left: readonly number[],
  right: readonly number[]
): void {
  expect(pixels.left).toEqual(left)
  expect(pixels.right).toEqual(right)
  expect(pixels.caster).toEqual(RED)
}

/**
 * 仅诊断 runner 显式提供绝对目录时保存图片，普通测试不会往正式 checkout 写截图。
 * 图像供人复核，测试通过仍由真实 readPixels 的三处颜色决定。
 */
async function screenshot(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const directory: unknown = import.meta.env.VITE_SHADOW_EVIDENCE_DIR
  if (typeof directory !== 'string' || directory.length === 0) return
  if (!directory.startsWith('/')) throw new Error('Shadow evidence directory must be absolute')
  await page.screenshot({ path: directory + '/' + name + '.png', element: canvas })
}

describe('ShadowMapPass → ForwardPass real GPU', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][shadow-pass-produce-before-publish]
   * Given 未生产过阴影的新 Scene；When 第一帧完整渲染；Then 左白、右黑、中心红。
   * 没有 ShadowMapPass 时 block 的 no-shadow 矩阵会令右侧为白，此断言必须失败。
   */
  it('第一帧真实深度图使接收面右侧变黑，投影者仍使用自己的红色材质', () => {
    const f = fixture()
    expectVisibility(f.render('initial/light-left'), WHITE, BLACK)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]
   * Given 左侧灯已产生右侧阴影；When 移灯到右侧再移回；Then 三帧阴影依次右/左/右。
   * 同一个接收材质、同一个块和同一个 Renderer 持续工作，旧矩阵或旧纹理不能蒙混通过。
   */
  it('移动灯光后三帧阴影右移左再恢复，每帧都消费本帧结果', async () => {
    const f = fixture()
    expectVisibility(f.render('moving/light-left'), WHITE, BLACK)
    await screenshot(f.canvas, 'light-left')

    // When 第二帧只有灯的位置改变；传播方向反转 x 分量，阴影落在 x=-.5。
    f.light.transform.setPosition([2, 0, 4])
    expectVisibility(f.render('moving/light-right'), BLACK, WHITE)
    await screenshot(f.canvas, 'light-right')

    // Then 返回原位置必须重新得到第一帧的可见性，不能遗留第二帧的黑色像素。
    f.light.transform.setPosition([-2, 0, 4])
    expectVisibility(f.render('moving/light-left-restored'), WHITE, BLACK)
    await screenshot(f.canvas, 'light-left-restored')
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][mesh-cast-shadow-frame-snapshot]
   * Given 已有黑色阴影；When 投影者关闭 castShadow；Then 接收面变白但物体仍然红色。
   * 再开启时黑色阴影恢复，覆盖清空旧图与每帧重新提取 Mesh 开关这两个方向。
   */
  it('投影者 castShadow 关闭后清掉旧阴影，重新开启后恢复', () => {
    const f = fixture()
    expectVisibility(f.render('caster/on'), WHITE, BLACK)
    f.caster.castShadow = false
    expectVisibility(f.render('caster/off'), WHITE, WHITE)
    f.caster.castShadow = true
    expectVisibility(f.render('caster/on-restored'), WHITE, BLACK)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][shadow-pass-produce-before-publish]
   * Given 已发布右侧阴影；When 灯不再投影、隐藏或移出 Scene；Then 旧结果必须撤销。
   * 不手工调用 publishNoShadow，也不重建接收材质；恢复原灯后下一帧重新产生阴影。
   */
  it.each(['castShadow=false', 'visible=false', 'removed'] as const)(
    '灯光 %s 后撤销旧阴影，恢复后重新产生阴影',
    (mode) => {
      const f = fixture()
      expectVisibility(f.render('light/' + mode + '/before'), WHITE, BLACK)

      // When 通过不同的公开场景操作关闭灯，覆盖仍在快照内和已消失两种路径。
      if (mode === 'castShadow=false') f.light.castShadow = false
      else if (mode === 'visible=false') f.light.visible = false
      else f.scene.remove(f.light)
      expectVisibility(f.render('light/' + mode + '/disabled'), WHITE, WHITE)

      // Then 原来的资源与参数块仍可借用，下一帧恢复实际阴影。
      if (mode === 'castShadow=false') f.light.castShadow = true
      else if (mode === 'visible=false') f.light.visible = true
      else f.scene.add(f.light)
      expectVisibility(f.render('light/' + mode + '/restored'), WHITE, BLACK)
    }
  )

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][attachment-content-rebuild]
   * Given 128² 阴影图已被接收者采样；When 下一帧改为 NPOT 的 63²；Then 重建并重画。
   * 保留同一个块、target 身份与 color[0] 地址；分辨率改变不能要求重建接收材质。
   * resize 同时移灯，强制验证新存储里是新帧内容，而不只是旧图仍能返回某个黑像素。
   */
  it('mapSize 从 128 改为 NPOT 63 后保留块和附件逻辑地址，采样新帧内容', () => {
    const f = fixture()
    expectVisibility(f.render('resize/128'), WHITE, BLACK)
    const block = f.shadow.block
    const target = f.shadow.target
    const address = block.get('uShadowMap')
    const revision = target.revision
    expect(address).toEqual({ type: 'texture2D', value: { target, kind: 'color', index: 0 } })
    expect(f.receiverMaterial.blocks[0]).toBe(block)

    // When 配置先更新，实际存储到下一帧由 ShadowMapPass 在输出 scope 外调整。
    f.shadow.setMapSize(63)
    expect(target.width).toBe(128)
    f.light.transform.setPosition([2, 0, 4])
    expectVisibility(f.render('resize/63-light-right'), BLACK, WHITE)

    // Then 地址包装允许复制，但底层逻辑目标身份和参数块必须保持稳定。
    expect(f.shadow.target).toBe(target)
    expect(f.shadow.block).toBe(block)
    expect(f.receiverMaterial.blocks[0]).toBe(block)
    expect(block.get('uShadowMap')).toEqual(address)
    expect(target.width).toBe(63)
    expect(target.height).toBe(63)
    expect(target.revision).toBe(revision + 1)

    f.light.transform.setPosition([-2, 0, 4])
    expectVisibility(f.render('resize/63-light-left-restored'), WHITE, BLACK)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][attachment-content-rebuild]
   * Given 已用真实阴影图画出右侧黑影；When context lost 时把灯移到右侧，再恢复；
   * Then 首个恢复帧必须重新生产左侧黑影，之后移回灯还能恢复右侧黑影。
   * 保留原来的 Scene、Renderer、Light、Material、target、block 和附件逻辑地址，
   * 不重新构造它们、不手动 publish，也不重新给接收者绑定纹理。
   * 像素换边可以发现旧矩阵、空的新纹理或跳过生产的错误；FBO 身份改变另外证明
   * Backend 使用了新代 GPU 存储。逻辑 target 的 revision 不因 context 恢复而改变。
   *
   * [DESIGN-WEIGHT:3][test-context-restore-event-boundary]
   * lost listener 不替 Backend 调用 preventDefault，允许测试发现生产监听器失效。
   * await lost 后先让出一个 task，再请求 restore；缺扩展或事件超时均失败，不 skip。
   */
  it('真实 context 恢复后，同一阴影资源在首个恢复帧重画新位置的阴影', async () => {
    const f = fixture()
    const extension = requireNonNull(
      f.gl.getExtension('WEBGL_lose_context'),
      () => new Error('Shadow recovery acceptance requires WEBGL_lose_context')
    )
    expectVisibility(f.render('context/before-loss'), WHITE, BLACK)
    const block = f.shadow.block
    const target = f.shadow.target
    const address = block.get('uShadowMap')
    const revision = target.revision

    /** 只在 Backend scope 内观察绑定，不用原生 bind/clear/draw 修补恢复结果。 */
    const captureFramebuffer = (): WebGLFramebuffer => {
      let framebuffer: WebGLFramebuffer | null = null
      f.backend.withRenderSurface({ surface: { kind: 'render-target', target } }, () => {
        framebuffer = requireNonNull<WebGLFramebuffer>(
          f.gl.getParameter(f.gl.FRAMEBUFFER_BINDING),
          () => new Error('Shadow target must bind a framebuffer')
        )
        return undefined
      })
      return requireNonNull<WebGLFramebuffer>(
        framebuffer,
        () => new Error('Shadow framebuffer was not captured')
      )
    }
    const beforeFramebuffer = captureFramebuffer()
    expect(f.gl.isFramebuffer(beforeFramebuffer)).toBe(true)

    // When 真的丢失 context；CPU 资源继续存活，灯的位置仍然可以改变。
    await triggerContextEvent(f.canvas, 'webglcontextlost', () => extension.loseContext())
    expect(f.gl.isContextLost()).toBe(true)
    expect(f.backend.ready).toBe(false)
    expect(f.shadow.disposed).toBe(false)
    expect(target.disposed).toBe(false)
    expect(block.disposed).toBe(false)
    f.light.transform.setPosition([2, 0, 4])

    // listener resolve 之后仍可能处在 lost 派发中；下一 task 才允许请求恢复。
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    await triggerContextEvent(f.canvas, 'webglcontextrestored', () => extension.restoreContext())
    expect(f.gl.isContextLost()).toBe(false)
    expect(f.backend.ready).toBe(true)
    expect(f.backend.lastFailure).toBeNull()

    // Then 先走完整生产/消费链，再观察 FBO，避免观察动作替首帧提前分配目标。
    expectVisibility(f.render('context/first-restored-light-right'), BLACK, WHITE)
    const afterFramebuffer = captureFramebuffer()
    expect(afterFramebuffer).not.toBe(beforeFramebuffer)
    expect(f.gl.isFramebuffer(afterFramebuffer)).toBe(true)
    expect(f.shadow.target).toBe(target)
    expect(f.shadow.block).toBe(block)
    expect(f.receiverMaterial.blocks[0]).toBe(block)
    expect(block.get('uShadowMap')).toEqual(address)
    expect(target.revision).toBe(revision)

    // 恢复后还要持续更新，不能只在恢复事件中补画一次固定图。
    f.light.transform.setPosition([-2, 0, 4])
    expectVisibility(f.render('context/next-frame-light-left'), WHITE, BLACK)
  }, 15000)
})
