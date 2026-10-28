// 经典脚本 (classic script)：第 45 课「阴影值怎样送进 shader」的小引擎。
// 课程页把这里的类和函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js、shadow-41.js、shadow-42.js、shadow-43.js、shadow-44.js。
//
// 同一个场景，五种把阴影值交给 shader 的写法：
//   第 0 种「抄进材质」、A「draw 时带上」（就是第 44 课）、B「后端认识灯光」、
//   three.js「引擎数灯、替 shader 拼代码」、C「参数块」。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const { M } = RTeach.shadowRaw
  const { SCENE } = RTeach.shadow41
  const S42 = RTeach.shadow42
  const { Resource, ShaderModule, Geometry, RenderTarget, Mesh, Scene,
    DirectionalLight } = S42
  const S43 = RTeach.shadow43
  const { lightViewProjection } = S43
  const S44 = RTeach.shadow44

  // ==================== 值的种类：材质和参数块共用一套规则 ====================

  /** 这个值是哪一种：float、vec3、mat4，或者一张要采样的图 */
  function kindOf(value) {
    if (value instanceof RenderTarget) return 'texture'
    if (typeof value === 'number') return 'float'
    if (Array.isArray(value) || value instanceof Float32Array) {
      if (value.length === 3) return 'vec3'
      if (value.length === 16) return 'mat4'
    }
    return 'unknown'
  }

  /** 检查并复制一个值：数要有限，数组复制后冻结，图只借用 */
  function copyValue(owner, name, value) {
    const kind = kindOf(value)
    if (kind === 'unknown') {
      throw new Error(owner + '：' + name +
        ' 不是 float、vec3、mat4 或 RenderTarget')
    }
    if (kind === 'texture') {
      value.assertUsable()
      return value // 借用：不复制，也不拥有
    }
    const numbers = kind === 'float' ? [value] : Array.from(value)
    if (!numbers.every(Number.isFinite)) {
      throw new Error(owner + '：' + name + ' 必须是有限的数')
    }
    return kind === 'float' ? value : Object.freeze(numbers)
  }

  // ==================== C：参数块 ====================

  /** 参数块：一组有名字的值。名字和种类构造时定死，之后只能原地改值 */
  class ParameterBlock extends Resource {
    #values = new Map()
    #version = 0

    constructor({ label, entries }) {
      super()
      this.label = label
      for (const [name, value] of Object.entries(entries)) {
        const where = 'ParameterBlock ' + label
        this.#values.set(name, copyValue(where, name, value))
      }
      this.names = Object.freeze([...this.#values.keys()])
      Object.freeze(this)
    }

    /** 每次成功 set 加 1（WebGL1 用不到；以后按它决定要不要重传 UBO） */
    get version() {
      this.assertUsable()
      return this.#version
    }

    get(name) {
      this.assertUsable()
      return this.#values.get(name)
    }

    /** 名字必须已有、种类必须相同；先检查、复制，再替换：失败时旧值不变 */
    set(name, value) {
      this.assertUsable()
      const where = 'ParameterBlock ' + this.label
      if (!this.#values.has(name)) {
        throw new Error(where + '：没有 ' + name + '（名字在构造时定死）')
      }
      const next = copyValue(where, name, value)
      const expected = kindOf(this.#values.get(name))
      if (kindOf(next) !== expected) {
        throw new Error(where + '：' + name + ' 必须是 ' + expected +
          '，收到 ' + kindOf(next))
      }
      this.#values.set(name, next)
      this.#version++
    }
  }

  /** 材质：shader + 自己的参数 + 借用的参数块。一个名字只能有一个来源 */
  class Material extends Resource {
    #parameters = new Map()
    #blockOf = new Map() // 名字 → 提供它的块的 label

    constructor({ shaderModule, parameters = {}, blocks = [] }) {
      super()
      if (!(shaderModule instanceof ShaderModule)) {
        throw new Error('Material：shaderModule 必须是 ShaderModule')
      }
      shaderModule.assertUsable()
      this.shaderModule = shaderModule
      this.blocks = Object.freeze([...blocks]) // 借用：不拥有，不释放
      for (const block of this.blocks) {
        if (!(block instanceof ParameterBlock)) {
          throw new Error('Material：blocks 里只能放 ParameterBlock')
        }
        block.assertUsable()
        for (const name of block.names) {
          if (this.#blockOf.has(name)) {
            throw new Error('Material：' + name + ' 同时来自块 ' +
              this.#blockOf.get(name) + ' 和 ' + block.label)
          }
          this.#blockOf.set(name, block.label)
        }
      }
      for (const [name, value] of Object.entries(parameters)) {
        this.setParameter(name, value)
      }
      Object.freeze(this)
    }

    setParameter(name, value) {
      this.assertUsable()
      if (this.#blockOf.has(name)) {
        throw new Error('Material：' + name + ' 已经由块 ' +
          this.#blockOf.get(name) + ' 提供，不能再设')
      }
      this.#parameters.set(name, copyValue('Material', name, value))
    }

    /** 这一刻材质自己的参数；返回新对象，改它不影响材质 */
    getParameters() {
      this.assertUsable()
      return Object.fromEntries(this.#parameters)
    }
  }

  /** 后端：值从三处找——Pass 给的、材质自己的、材质借用的块 */
  class Backend extends S44.Backend {
    draw({ item, shader = item.material.shaderModule, uniforms = {} }) {
      const material = item.material
      const values = { ...uniforms } // Pass 给的：相机、物体位置
      const sources = [['材质', material.getParameters()]]
      for (const block of material.blocks) {
        block.assertUsable()
        const entries = block.names.map((name) => [name, block.get(name)])
        sources.push(['块 ' + block.label, Object.fromEntries(entries)])
      }
      for (const [source, entries] of sources) {
        for (const [name, value] of Object.entries(entries)) {
          // 材质和块之间构造时查过；这里查 Pass 给的和它们撞没撞
          if (name in values) {
            throw new Error('uniform ' + name + '：Pass 和' + source +
              '都给了值')
          }
          values[name] = value
        }
      }
      super.draw({ item, shader, uniforms: values })
    }
  }

  /** 第二遍：只给相机、物体位置和灯的方向；阴影的事一行都没有 */
  class ForwardPass {
    constructor() {
      this.name = 'ForwardPass'
    }

    execute({ frame, backend }) {
      const light = frame.lights[0]
      const surface = { target: null, clear: [0.08, 0.09, 0.12, 1] }
      backend.withRenderSurface(surface, () => {
        for (const item of frame.items) {
          backend.draw({
            item,
            uniforms: {
              uCameraVP: frame.view.cameraVP,
              uModel: item.modelMatrix,
              uToLight: light.toLight
            }
          })
        }
      })
    }

    dispose() {}
  }

  /** 全零矩阵：约定为「这一帧没有阴影」 */
  const NO_SHADOW = Object.freeze(new Array(16).fill(0))

  /** 一盏灯的阴影：拥有阴影图和参数块；块里的值只由 ShadowMapPass 写 */
  class DirectionalLightShadow extends Resource {
    #settings

    constructor({ label, mapSize, bias, halfExtent }) {
      super()
      this.label = label
      this.target = new RenderTarget({ label: label + ' map', size: mapSize })
      this.block = new ParameterBlock({
        label,
        entries: {
          uShadowMap: this.target, // 借用阴影图；构造后不再变
          uLightVP: NO_SHADOW, // 初值：没有阴影
          uShadowBias: bias
        }
      })
      this.#settings = Object.freeze({ bias, halfExtent })
      Object.freeze(this)
    }

    get settings() {
      this.assertUsable()
      return this.#settings
    }

    /** GUI 用：只改设置；块里的值等 ShadowMapPass 下一次发布 */
    setBias(bias) {
      this.assertUsable()
      if (!Number.isFinite(bias) || bias < 0) {
        throw new Error('DirectionalLightShadow：bias 必须是非负的有限数')
      }
      this.#settings = Object.freeze({ ...this.#settings, bias })
    }

    /** 只由 ShadowMapPass 调用：把这一帧的值写进块 */
    publish({ lightViewProjection, bias }) {
      this.block.set('uLightVP', lightViewProjection)
      this.block.set('uShadowBias', bias)
    }

    /** 只由 ShadowMapPass 调用：这一帧没有阴影 */
    publishNoShadow() {
      this.block.set('uLightVP', NO_SHADOW)
    }

    dispose() {
      if (this.disposed) return
      super.dispose()
      this.block.dispose() // 自己拥有的，一起释放
      this.target.dispose()
    }
  }

  /** 灯的快照：多抄 castShadow；阴影资源借用（ShadowMapPass 要往它的块里写） */
  function snapshotLight(light) {
    if (light.castShadow && light.shadow === null) {
      throw new Error('灯：castShadow 是 true，却没有 shadow')
    }
    const shadow = light.shadow === null ? null : Object.freeze({
      resource: light.shadow, // 借用
      target: light.shadow.target, // 借用
      ...light.shadow.settings // bias、halfExtent 的副本
    })
    return Object.freeze({
      toLight: Object.freeze([...light.toLight]),
      castShadow: light.castShadow,
      shadow
    })
  }

  /** 物体和相机照第 43 课抄；灯换成上面的 snapshotLight */
  function buildFrame(scene, camera, aspect) {
    const base = S43.buildFrame({ meshes: scene.meshes, lights: [] },
      camera, aspect)
    const lights = Object.freeze(scene.lights.map(snapshotLight))
    return Object.freeze({ ...base, lights })
  }

  /** 只画阴影图：每盏开着投影的灯一张（第 0 种、B、three.js 用它） */
  class ShadowDepthPass {
    constructor() {
      this.name = 'ShadowDepthPass'
      this.depthShader = new ShaderModule({
        name: 'shadow depth',
        vertexSource: S42.GLSL.depthVertex,
        fragmentSource: S42.GLSL.depthFragment
      })
      // 画深度时，物体换上这个材质（它没有参数、没有块）
      this.depthMaterial = new Material({ shaderModule: this.depthShader })
    }

    execute({ frame, backend }) {
      for (const light of frame.lights) {
        if (light.shadow === null || !light.castShadow) continue
        this.drawShadowMap(backend, frame, light, lightViewProjection(light))
      }
    }

    drawShadowMap(backend, frame, light, lightVP) {
      const surface = { target: light.shadow.target, clear: [1, 1, 1, 1] }
      backend.withRenderSurface(surface, () => {
        for (const item of frame.items) {
          backend.draw({
            item: { ...item, material: this.depthMaterial },
            uniforms: { uLightVP: lightVP, uModel: item.modelMatrix }
          })
        }
      })
    }

    dispose() {
      this.depthMaterial.dispose()
      this.depthShader.dispose()
    }
  }

  /** C 的 ShadowMapPass：画法同上，多一件事——发布这一帧的值 */
  class ShadowMapPass extends ShadowDepthPass {
    constructor() {
      super()
      this.name = 'ShadowMapPass'
      this.published = new Set() // 上一帧发布过的阴影
    }

    execute({ frame, backend }) {
      const seen = new Set()
      for (const light of frame.lights) {
        if (light.shadow === null) continue
        const shadow = light.shadow.resource
        seen.add(shadow)
        if (!light.castShadow) {
          shadow.publishNoShadow() // 关着：发布「没有阴影」，不画
          continue
        }
        const lightVP = lightViewProjection(light)
        shadow.publish({ lightViewProjection: lightVP, bias: light.shadow.bias })
        this.drawShadowMap(backend, frame, light, lightVP)
      }
      // 上一帧发布过、这一帧不见了（灯被移出场景）：也发布「没有阴影」
      for (const shadow of this.published) {
        if (!seen.has(shadow) && !shadow.disposed) shadow.publishNoShadow()
      }
      this.published = seen
    }
  }

  /** 第 44 课的 Renderer，换上这一课的后端和快照 */
  class Renderer extends S44.Renderer {
    constructor(gl, BackendClass = Backend) {
      super(gl)
      this.backend = new BackendClass(gl)
    }

    render(scene, camera) {
      const gl = this.backend.gl
      const frame = buildFrame(scene, camera, gl.canvas.width / gl.canvas.height)
      this.pipeline.execute(Object.freeze({ frame, backend: this.backend }))
    }
  }

  /** C 的接收者 shader：和第 42 课只差一处——w ≤ 0 当作受光 */
  const GLSL = {
    receiverFragment: `precision highp float;
       uniform sampler2D uShadowMap;
       uniform vec3 uToLight;
       uniform vec3 uColor;
       uniform float uShadowBias;
       varying vec4 vLightClip;
       void main() {
         float visible = 1.0;
         // 全零矩阵 → w = 0：这一帧没有阴影，当作受光
         if (vLightClip.w > 0.0) {
           vec3 p = vLightClip.xyz / vLightClip.w * 0.5 + 0.5;
           vec4 c = texture2D(uShadowMap, p.xy);
           float stored = dot(c,
             vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
           visible = p.z - uShadowBias <= stored ? 1.0 : 0.0;
         }
         float diffuse = max(dot(vec3(0.0, 1.0, 0.0), uToLight), 0.0);
         gl_FragColor = vec4(uColor * (0.25 + 0.75 * diffuse * visible), 1.0);
       }`
  }

  // ==================== 五种写法共用的场景 ====================

  /** 灯转到 angle 度时，从表面指向灯的方向 */
  function toLightAt(lightAngleDegrees) {
    const a = (lightAngleDegrees * Math.PI) / 180
    return M.normalize([Math.sin(a), Math.cos(a), 0.35])
  }

  const CAMERA = Object.freeze({
    eye: SCENE.cameraEye,
    target: SCENE.cameraTarget,
    fovY: Math.PI / 4
  })

  /** 地面、三角形、一盏灯；material(color) 决定接收者怎么拿阴影值 */
  function buildScene(lightAngleDegrees, shadow, material) {
    const scene = new Scene()
    scene.add(new Mesh(new Geometry({ positions: SCENE.floorPositions }),
      material(SCENE.floorColor)))
    scene.add(new Mesh(new Geometry({ positions: SCENE.trianglePositions }),
      material(SCENE.triangleColor)))
    const light = scene.add(new DirectionalLight({
      toLight: toLightAt(lightAngleDegrees),
      castShadow: true,
      shadow
    }))
    return { scene, camera: CAMERA, light }
  }

  function newShadow() {
    return new DirectionalLightShadow({
      label: 'sun shadow',
      mapSize: SCENE.shadowSize,
      bias: SCENE.shadowBias,
      halfExtent: 4.5
    })
  }

  function litShader() {
    return new ShaderModule({
      name: 'lit with shadow',
      vertexSource: S42.GLSL.mainVertex,
      fragmentSource: S42.GLSL.mainFragment
    })
  }

  // ---------- 第 0 种：建场景时把阴影值抄进材质 ----------

  function createCopySetup(lightAngleDegrees) {
    const shadow = newShadow()
    const lit = litShader()
    const light = new DirectionalLight({
      toLight: toLightAt(lightAngleDegrees), castShadow: true, shadow
    })
    // 抄：阴影图是引用，矩阵是此刻算出的 16 个数（副本）
    const lightVP = lightViewProjection(snapshotLight(light))
    const material = (color) => new Material({
      shaderModule: lit,
      parameters: {
        uColor: color,
        uShadowMap: shadow.target,
        uLightVP: lightVP,
        uShadowBias: shadow.settings.bias
      }
    })
    const setup = buildScene(lightAngleDegrees, shadow, material)
    return { ...setup, passes: [new ShadowDepthPass(), new ForwardPass()] }
  }

  // ---------- B：后端认识「灯光」 ----------

  /** B 的后端：draw 多收一个 lighting，后端知道每一项该叫什么名字 */
  class LightingBackend extends Backend {
    draw({ item, uniforms = {}, lighting }) {
      if (lighting === undefined) return super.draw({ item, uniforms })
      // 四项都是必填：后端认识它们，也只认识它们
      const fields = ['directionToLight', 'shadowMap',
        'lightViewProjection', 'shadowBias']
      for (const field of fields) {
        if (lighting[field] === undefined) {
          throw new Error('lighting.' + field + ' 必须有')
        }
      }
      super.draw({
        item,
        uniforms: {
          ...uniforms,
          uToLight: lighting.directionToLight,
          uShadowMap: lighting.shadowMap,
          uLightVP: lighting.lightViewProjection,
          uShadowBias: lighting.shadowBias
        }
      })
    }
  }

  /** B 的 ForwardPass：把灯的快照翻译成 lighting，交给后端 */
  class LightingForwardPass {
    constructor() {
      this.name = 'LightingForwardPass'
    }

    execute({ frame, backend }) {
      const light = frame.lights[0]
      const on = light.shadow !== null && light.castShadow
      const lighting = {
        directionToLight: light.toLight,
        shadowMap: on ? light.shadow.target : undefined,
        lightViewProjection: on ? lightViewProjection(light) : undefined,
        shadowBias: on ? light.shadow.bias : undefined
      }
      const surface = { target: null, clear: [0.08, 0.09, 0.12, 1] }
      backend.withRenderSurface(surface, () => {
        for (const item of frame.items) {
          const uniforms = {
            uCameraVP: frame.view.cameraVP,
            uModel: item.modelMatrix
          }
          backend.draw({ item, uniforms, lighting })
        }
      })
    }

    dispose() {}
  }

  function createLightingSetup(lightAngleDegrees) {
    const lit = litShader()
    const material = (color) =>
      new Material({ shaderModule: lit, parameters: { uColor: color } })
    const setup = buildScene(lightAngleDegrees, newShadow(), material)
    return {
      ...setup,
      passes: [new ShadowDepthPass(), new LightingForwardPass()]
    }
  }

  // ---------- three.js：引擎数灯，替 shader 拼代码 ----------

  /** 引擎拥有的 shader 片段；材质的 shader 只写 #include，由引擎替换 */
  const SHADOW_CHUNKS = {
    shadowmap_pars_vertex: `#if NUM_DIR_LIGHT_SHADOWS > 0
       uniform mat4 directionalShadowMatrix[NUM_DIR_LIGHT_SHADOWS];
       varying vec4 vDirectionalShadowCoord[NUM_DIR_LIGHT_SHADOWS];
       #endif`,
    shadowmap_vertex: `#if NUM_DIR_LIGHT_SHADOWS > 0
       for (int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i++) {
         vDirectionalShadowCoord[i] = directionalShadowMatrix[i] * world;
       }
       #endif`,
    shadowmap_pars_fragment: `#if NUM_DIR_LIGHT_SHADOWS > 0
       uniform sampler2D directionalShadowMap[NUM_DIR_LIGHT_SHADOWS];
       uniform float directionalShadowBias[NUM_DIR_LIGHT_SHADOWS];
       varying vec4 vDirectionalShadowCoord[NUM_DIR_LIGHT_SHADOWS];
       float getShadow(sampler2D map, vec4 coord, float bias) {
         vec3 p = coord.xyz / coord.w * 0.5 + 0.5;
         vec4 c = texture2D(map, p.xy);
         float stored = dot(c,
           vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
         return p.z - bias <= stored ? 1.0 : 0.0;
       }
       #endif`,
    shadowmap_fragment: `float visible = 1.0;
       #if NUM_DIR_LIGHT_SHADOWS > 0
       for (int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i++) {
         visible *= getShadow(directionalShadowMap[i],
           vDirectionalShadowCoord[i], directionalShadowBias[i]);
       }
       #endif`
  }

  /** 把 #include 换成引擎的片段，再写进灯数：灯数不同，就是不同的 shader */
  function expandShader(source, shadowCount) {
    return source
      .replace(/#include <(\w+)>/g, (line, name) => SHADOW_CHUNKS[name])
      .replace(/NUM_DIR_LIGHT_SHADOWS/g, String(shadowCount))
  }

  /** 引擎每帧数灯：投影子的灯有几盏，各自的矩阵、阴影图、bias 放进数组 */
  class LightsState {
    constructor() {
      this.shadowCount = -1
      this.version = 0 // 灯数变一次加 1：用灯的材质都要换 program
      this.values = {}
    }

    setup(frame) {
      const values = {}
      let count = 0
      for (const light of frame.lights) {
        if (light.shadow === null || !light.castShadow) continue
        const at = '[' + count + ']'
        values['directionalShadowMatrix' + at] = lightViewProjection(light)
        values['directionalShadowMap' + at] = light.shadow.target
        values['directionalShadowBias' + at] = light.shadow.bias
        count++
      }
      this.values = values
      if (count !== this.shadowCount) {
        this.shadowCount = count
        this.version++
      }
    }
  }

  /** 后端认识「用灯的材质」：换成这个灯数的 shader，再接上灯的数组 */
  class ThreeBackend extends Backend {
    constructor(gl, lights) {
      super(gl)
      this.lights = lights
      this.variants = new Map() // 原 shader → (灯数 → 拼好的 shader)
    }

    variantOf(shader) {
      // three.js 看 material.lights；这里看源码里有没有 #include
      if (!shader.vertexSource.includes('#include <')) return shader
      let byCount = this.variants.get(shader)
      if (byCount === undefined) {
        byCount = new Map()
        this.variants.set(shader, byCount)
        shader.onDispose(() => {
          for (const variant of byCount.values()) variant.dispose()
          this.variants.delete(shader)
        })
      }
      const count = this.lights.shadowCount
      if (!byCount.has(count)) {
        byCount.set(count, new ShaderModule({
          name: shader.name + '（' + count + ' 盏投影灯）',
          vertexSource: expandShader(shader.vertexSource, count),
          fragmentSource: expandShader(shader.fragmentSource, count)
        }))
      }
      return byCount.get(count)
    }

    draw({ item, uniforms = {} }) {
      const shader = this.variantOf(item.material.shaderModule)
      if (shader === item.material.shaderModule) {
        return super.draw({ item, uniforms })
      }
      // three.js 是让材质的 uniform 指向这些数组；这里每次 draw 接上
      super.draw({ item, shader, uniforms: { ...uniforms, ...this.lights.values } })
    }
  }

  /** three.js 的 render：先数灯（WebGLRenderer 里的 lights.setup），再跑 Pass */
  class ThreeRenderer extends Renderer {
    constructor(gl) {
      super(gl)
      this.lights = new LightsState()
      this.backend = new ThreeBackend(gl, this.lights)
    }

    render(scene, camera) {
      const gl = this.backend.gl
      const frame = buildFrame(scene, camera, gl.canvas.width / gl.canvas.height)
      this.lights.setup(frame)
      this.pipeline.execute(Object.freeze({ frame, backend: this.backend }))
    }
  }

  /** 材质的 shader 只留 #include：阴影那几段由引擎决定 */
  const THREE_GLSL = {
    vertex: `attribute vec3 aPosition;
       uniform mat4 uCameraVP;
       uniform mat4 uModel;
       #include <shadowmap_pars_vertex>
       void main() {
         vec4 world = uModel * vec4(aPosition, 1.0);
         #include <shadowmap_vertex>
         gl_Position = uCameraVP * world;
       }`,
    fragment: `precision highp float;
       uniform vec3 uToLight;
       uniform vec3 uColor;
       #include <shadowmap_pars_fragment>
       void main() {
         #include <shadowmap_fragment>
         float diffuse = max(dot(vec3(0.0, 1.0, 0.0), uToLight), 0.0);
         gl_FragColor = vec4(uColor * (0.25 + 0.75 * diffuse * visible), 1.0);
       }`
  }

  function createThreeSetup(lightAngleDegrees) {
    const lit = new ShaderModule({
      name: 'lit (three.js style)',
      vertexSource: THREE_GLSL.vertex,
      fragmentSource: THREE_GLSL.fragment
    })
    const material = (color) =>
      new Material({ shaderModule: lit, parameters: { uColor: color } })
    const setup = buildScene(lightAngleDegrees, newShadow(), material)
    return { ...setup, passes: [new ShadowDepthPass(), new ForwardPass()] }
  }

  // ---------- C：接收者借用灯的阴影块 ----------

  function createBlockSetup(lightAngleDegrees) {
    const shadow = newShadow()
    const receiver = new ShaderModule({
      name: 'lit, shadow from block',
      vertexSource: S42.GLSL.mainVertex,
      fragmentSource: GLSL.receiverFragment
    })
    // 两个接收者借用同一个块：块里的值变，两个都看到
    const material = (color) => new Material({
      shaderModule: receiver,
      parameters: { uColor: color },
      blocks: [shadow.block]
    })
    const setup = buildScene(lightAngleDegrees, shadow, material)
    return { ...setup, passes: [new ShadowMapPass(), new ForwardPass()] }
  }

  // ---------- 五种写法：各自用哪个 Renderer、哪个场景 ----------

  const APPROACHES = Object.freeze({
    copy: {
      label: '第 0 种：抄进材质',
      makeRenderer: (gl) => new Renderer(gl),
      makeSetup: createCopySetup
    },
    A: {
      label: 'A：draw 时带上（第 44 课）',
      makeRenderer: (gl) => new S44.Renderer(gl),
      makeSetup: S44.createShadowSetup
    },
    B: {
      label: 'B：后端认识灯光',
      makeRenderer: (gl) => new Renderer(gl, LightingBackend),
      makeSetup: createLightingSetup
    },
    three: {
      label: 'three.js：引擎数灯、拼 shader',
      makeRenderer: (gl) => new ThreeRenderer(gl),
      makeSetup: createThreeSetup
    },
    C: {
      label: 'C：参数块',
      makeRenderer: (gl) => new Renderer(gl),
      makeSetup: createBlockSetup
    }
  })

  RTeach.shadow45 = {
    kindOf,
    copyValue,
    ParameterBlock,
    Material,
    Backend,
    ForwardPass,
    NO_SHADOW,
    DirectionalLightShadow,
    snapshotLight,
    buildFrame,
    ShadowDepthPass,
    ShadowMapPass,
    Renderer,
    GLSL,
    toLightAt,
    CAMERA,
    buildScene,
    newShadow,
    createCopySetup,
    LightingBackend,
    LightingForwardPass,
    createLightingSetup,
    SHADOW_CHUNKS,
    expandShader,
    LightsState,
    ThreeBackend,
    ThreeRenderer,
    THREE_GLSL,
    createThreeSetup,
    createBlockSetup,
    APPROACHES
  }
})()
