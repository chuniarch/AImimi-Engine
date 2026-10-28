// 经典脚本 (classic script)：第 44 课「两遍变成两个 Pass」的小引擎。
// 课程页把这里的类和函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js、shadow-41.js、shadow-42.js、shadow-43.js。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const { M } = RTeach.shadowRaw
  const { setUniforms, drawPositions } = RTeach.shadow41
  const S42 = RTeach.shadow42
  const { ShaderModule, Geometry, Material, RenderTarget, Mesh, Scene } = S42
  const { buildFrame, lightViewProjection } = RTeach.shadow43

  // ==================== 后端：画到哪、画一个物体 ====================

  /** 后端只管「画到哪」和「画一个物体」，不知道有几遍、为什么画 */
  class Backend {
    constructor(gl) {
      this.gl = gl
      this.managers = S42.createManagers(gl)
      this.stack = [] // 正在里面的目的地；栈顶是当前在写的目标
    }

    /** 进门：记下现在画到哪，换到目的地；出门：一定换回来，出错也换 */
    withRenderSurface({ target = null, clear }, callback) {
      const gl = this.gl
      // 先记下进门前的状态，再去要目标：第一次建 framebuffer 会改绑定
      const previous = {
        framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
        viewport: gl.getParameter(gl.VIEWPORT)
      }
      this.stack.push(target)
      try {
        const resource = target && this.managers.renderTargets.get(target)
        gl.bindFramebuffer(gl.FRAMEBUFFER, resource ? resource.framebuffer : null)
        // viewport 由目的地的尺寸决定，写 Pass 的人不用、也没机会自己设
        gl.viewport(0, 0,
          resource ? resource.width : gl.drawingBufferWidth,
          resource ? resource.height : gl.drawingBufferHeight)
        if (clear) {
          gl.clearColor(...clear)
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        }
        callback()
      } finally {
        this.stack.pop()
        gl.bindFramebuffer(gl.FRAMEBUFFER, previous.framebuffer)
        gl.viewport(...previous.viewport)
      }
    }

    /** 画一个物体：要用的状态自己设好，不靠前面谁留下的 */
    draw({ item, shader = item.material.shaderModule, uniforms }) {
      const gl = this.gl
      if (this.stack.length === 0) {
        throw new Error('draw 必须在 withRenderSurface 里面调用')
      }
      const program = this.managers.programs.get(shader)
      const geometry = this.managers.geometries.get(item.geometry)
      const values = {}
      let unit = 0
      for (const [name, value] of Object.entries(uniforms)) {
        if (!(value instanceof RenderTarget)) {
          values[name] = value
          continue
        }
        // 值是一个 RenderTarget：绑到一个纹理单元上采样
        if (value === this.stack[this.stack.length - 1]) {
          throw new Error(name + '：不能采样正在写的目标 ' + value.label)
        }
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D,
          this.managers.renderTargets.get(value).texture)
        values[name] = unit++
      }
      gl.useProgram(program.program)
      gl.enable(gl.DEPTH_TEST) // 每次 draw 都设，不依赖别的 Pass 开过
      setUniforms(gl, program, values)
      drawPositions(gl, program.position, geometry.buffer, geometry.count)
    }
  }

  // ==================== passes/：每一遍是一个对象 ====================

  /** 第一遍：每盏投影子的灯，把物体画进这盏灯的阴影图 */
  class ShadowMapPass {
    constructor() {
      this.name = 'ShadowMapPass'
      // 这个 Pass 自己拥有画深度的 shader，dispose 时释放
      this.depthShader = new ShaderModule({
        name: 'shadow depth',
        vertexSource: S42.GLSL.depthVertex,
        fragmentSource: S42.GLSL.depthFragment
      })
    }

    execute({ frame, backend }) {
      for (const light of frame.lights) {
        if (light.shadow === null) continue
        const lightVP = lightViewProjection(light)
        const surface = { target: light.shadow.target, clear: [1, 1, 1, 1] }
        backend.withRenderSurface(surface, () => {
          for (const item of frame.items) {
            backend.draw({
              item,
              shader: this.depthShader,
              uniforms: { uLightVP: lightVP, uModel: item.modelMatrix }
            })
          }
        })
      }
    }

    dispose() {
      this.depthShader.dispose()
    }
  }

  /** 第二遍：每个物体用自己的材质画到屏幕 */
  class ForwardPass {
    constructor() {
      this.name = 'ForwardPass'
    }

    execute({ frame, backend }) {
      const light = frame.lights[0]
      // 和阴影有关的三项：第 45 课要处理的就是这几行
      const shadowValues = light.shadow === null ? {} : {
        uLightVP: lightViewProjection(light),
        uShadowBias: light.shadow.bias,
        uShadowMap: light.shadow.target
      }
      const surface = { target: null, clear: [0.08, 0.09, 0.12, 1] }
      backend.withRenderSurface(surface, () => {
        for (const item of frame.items) {
          backend.draw({
            item,
            uniforms: {
              uCameraVP: frame.view.cameraVP,
              uModel: item.modelMatrix,
              uToLight: light.toLight,
              ...shadowValues,
              ...item.material.getParameters()
            }
          })
        }
      })
    }

    dispose() {}
  }

  /** 按顺序执行一组 Pass，并拥有它们（dispose 时一起释放） */
  class RenderPipeline {
    constructor(passes) {
      this.passes = Object.freeze([...passes])
    }

    execute(context) {
      for (const pass of this.passes) pass.execute(context)
    }

    dispose() {
      for (const pass of this.passes) pass.dispose()
    }
  }

  /** 每帧：先抄一份，再把同一份 context 交给每个 Pass */
  class Renderer {
    constructor(gl) {
      this.backend = new Backend(gl)
      this.pipeline = new RenderPipeline([]) // 第一次安装前是空的
    }

    render(scene, camera) {
      const gl = this.backend.gl
      const aspect = gl.canvas.width / gl.canvas.height
      const frame = buildFrame(scene, camera, aspect)
      this.pipeline.execute(Object.freeze({ frame, backend: this.backend }))
    }

    /** 换上新的 Pipeline，把旧的交回去（这里不释放它） */
    replacePipeline(next) {
      const old = this.pipeline
      this.pipeline = next
      return old
    }
  }

  // ==================== 引擎：场景交出 { scene, camera, passes } ====================

  /** 课程版的「Scene.dispose」：释放这个场景用到的资源 */
  function disposeScene(scene) {
    for (const mesh of scene.meshes) {
      mesh.geometry.dispose()
      mesh.material.dispose()
      mesh.material.shaderModule.dispose()
    }
    for (const light of scene.lights) {
      if (light.shadow) light.shadow.target.dispose()
    }
  }

  /** 引擎不认识任何具体的 Pass：场景交什么，就装什么 */
  class Engine {
    constructor(gl) {
      this.renderer = new Renderer(gl)
      this.current = null
      this.diagnostics = [] // 旧场景清理失败的记录
    }

    setScene(setup) {
      // ① 准备：会失败的检查都放在这里；失败时 Pass 仍归调用者
      const passes = setup.passes
      if (!Array.isArray(passes) || passes.length === 0) {
        throw new Error('setScene：passes 不能为空')
      }
      for (const pass of passes) {
        if (typeof pass.execute !== 'function' ||
          typeof pass.dispose !== 'function') {
          throw new Error('setScene：每个 Pass 都要有 execute 和 dispose')
        }
      }
      if (new Set(passes).size !== passes.length) {
        throw new Error('setScene：同一个 Pass 不能出现两次')
      }
      const next = new RenderPipeline(passes)

      // ② 提交：从这里起，新的场景和 Pass 归引擎
      const oldPipeline = this.renderer.replacePipeline(next)
      const oldScene = this.current && this.current.scene
      this.current = { scene: setup.scene, camera: setup.camera }

      // ③ 清理旧的：失败只记下来，新场景已经装好了，不能再说「安装失败」
      try {
        oldPipeline.dispose()
        if (oldScene) disposeScene(oldScene)
      } catch (error) {
        this.diagnostics.push(error)
      }
    }

    frame() {
      if (this.current) this.renderer.render(this.current.scene, this.current.camera)
    }
  }

  // ==================== 应用：两个场景各自交出要用的 Pass ====================

  /** HW1 的样子：带阴影的三角形，两个 Pass */
  function createShadowSetup(lightAngleDegrees) {
    const app = S42.createShadowScene(lightAngleDegrees)
    return {
      scene: app.scene,
      camera: app.camera,
      light: app.light,
      passes: [new ShadowMapPass(), new ForwardPass()]
    }
  }

  /** 没有阴影的 shader：只有漫反射 */
  const PLAIN_GLSL = {
    vertex: `attribute vec3 aPosition;
       uniform mat4 uCameraVP;
       uniform mat4 uModel;
       void main() {
         gl_Position = uCameraVP * uModel * vec4(aPosition, 1.0);
       }`,
    fragment: `precision highp float;
       uniform vec3 uToLight;
       uniform vec3 uColor;
       void main() {
         float diffuse = max(dot(vec3(0.0, 1.0, 0.0), uToLight), 0.0);
         gl_FragColor = vec4(uColor * (0.25 + 0.75 * diffuse), 1.0);
       }`
  }

  /** HW2 的样子：没有阴影，只要一个 ForwardPass；物体先加三角形、后加地面 */
  function createPlainSetup(lightAngleDegrees) {
    const shader = new ShaderModule({
      name: 'lit without shadow',
      vertexSource: PLAIN_GLSL.vertex,
      fragmentSource: PLAIN_GLSL.fragment
    })
    const { SCENE } = RTeach.shadow41
    const material = (color) =>
      new Material({ shaderModule: shader, parameters: { uColor: color } })
    const scene = new Scene()
    scene.add(new Mesh(new Geometry({ positions: SCENE.trianglePositions }),
      material([0.3, 0.75, 0.45])))
    scene.add(new Mesh(new Geometry({ positions: SCENE.floorPositions }),
      material([0.55, 0.6, 0.7])))
    const angle = (lightAngleDegrees * Math.PI) / 180
    const light = scene.add(new S42.DirectionalLight({
      toLight: [Math.sin(angle), Math.cos(angle), 0.35]
    }))
    const camera = { eye: SCENE.cameraEye, target: SCENE.cameraTarget,
      fovY: Math.PI / 4 }
    return { scene, camera, light, passes: [new ForwardPass()] }
  }

  RTeach.shadow44 = {
    Backend,
    ShadowMapPass,
    ForwardPass,
    RenderPipeline,
    Renderer,
    disposeScene,
    Engine,
    createShadowSetup,
    PLAIN_GLSL,
    createPlainSetup
  }
})()
