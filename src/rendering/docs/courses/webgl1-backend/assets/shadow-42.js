// 经典脚本 (classic script)：第 42 课「画什么写成数据」的小引擎。
// 课程页把这里的类和函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js（矩阵小工具 M）和 shadow-41.js（建造函数、setUniforms、drawPositions）。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const { M } = RTeach.shadowRaw
  const { SCENE, makeProgram, makeShadowMap, makeBuffer, setUniforms, drawPositions } =
    RTeach.shadow41

  /** 平移矩阵（列主序）：把物体整体挪到 position */
  function translation(position) {
    const [x, y, z] = position
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])
  }

  /** 第 42 课的 GLSL：和第 41 课相比只多了 uModel（物体自己的位置） */
  const GLSL = {
    depthVertex: `attribute vec3 aPosition;
       uniform mat4 uLightVP;
       uniform mat4 uModel;
       void main() {
         gl_Position = uLightVP * uModel * vec4(aPosition, 1.0);
       }`,
    depthFragment: RTeach.shadow41.GLSL.depthFragment,
    mainVertex: `attribute vec3 aPosition;
       uniform mat4 uCameraVP;
       uniform mat4 uLightVP;
       uniform mat4 uModel;
       varying vec4 vLightClip; // 这个点在灯眼里的位置
       void main() {
         vec4 world = uModel * vec4(aPosition, 1.0);
         vLightClip = uLightVP * world;
         gl_Position = uCameraVP * world;
       }`,
    mainFragment: RTeach.shadow41.GLSL.mainFragment
  }

  // ==================== resources/：描述「是什么」的数据 ====================

  /** 所有资源的基类：可以被丢弃；丢弃时通知登记过的人 */
  class Resource {
    #disposed = false
    #listeners = new Set()

    get disposed() {
      return this.#disposed
    }

    assertUsable() {
      if (this.#disposed) throw new Error(this.constructor.name + ' 已经释放')
    }

    /** 登记「我被丢弃时叫你」；返回取消登记的函数 */
    onDispose(listener) {
      this.assertUsable()
      this.#listeners.add(listener)
      return () => this.#listeners.delete(listener)
    }

    dispose() {
      if (this.#disposed) return
      this.#disposed = true // 先标记：通知期间谁再来用都会被拒绝
      for (const listener of this.#listeners) listener()
      this.#listeners.clear()
    }
  }

  /** 几何：构造时检查并复制顶点，之后没有任何办法改它 */
  class Geometry extends Resource {
    #positions

    constructor({ positions }) {
      super()
      if (!(positions instanceof Float32Array)) {
        throw new Error('Geometry：positions 必须是 Float32Array')
      }
      if (positions.length % 3 !== 0) {
        throw new Error('Geometry：数组长度 ' + positions.length +
          ' 不是 3 的倍数（每个顶点 x、y、z 三个数）')
      }
      const vertexCount = positions.length / 3
      if (vertexCount < 3 || vertexCount % 3 !== 0) {
        throw new Error('Geometry：顶点数 ' + vertexCount +
          ' 不是 3 的倍数（每 3 个顶点一个三角形）')
      }
      this.#positions = positions.slice() // 复制：之后改原数组影响不到这里
    }

    get vertexCount() {
      this.assertUsable()
      return this.#positions.length / 3
    }

    /** 给出一份副本：拿到的人怎么改，都改不到这里 */
    copyPositions() {
      this.assertUsable()
      return this.#positions.slice()
    }
  }

  /** shader 源码：构造后冻结，名字和源码都不能再改 */
  class ShaderModule extends Resource {
    constructor({ name, vertexSource, fragmentSource }) {
      super()
      if (!vertexSource || !fragmentSource) {
        throw new Error('ShaderModule ' + name + '：两段源码都不能为空')
      }
      this.name = name
      this.vertexSource = vertexSource
      this.fragmentSource = fragmentSource
      Object.freeze(this)
    }
  }

  /** 材质：用哪个 shader（不能换）+ 一组参数（可以改，每次 draw 时读） */
  class Material extends Resource {
    #parameters = new Map()

    constructor({ shaderModule, parameters = {} }) {
      super()
      if (!(shaderModule instanceof ShaderModule)) {
        throw new Error('Material：shaderModule 必须是 ShaderModule')
      }
      shaderModule.assertUsable()
      this.shaderModule = shaderModule
      for (const [name, value] of Object.entries(parameters)) {
        this.setParameter(name, value)
      }
      Object.freeze(this)
    }

    setParameter(name, value) {
      this.assertUsable()
      const numbers = typeof value === 'number' ? [value] : [...value]
      if (!numbers.every(Number.isFinite)) {
        throw new Error('Material：参数 ' + name + ' 必须是有限的数')
      }
      this.#parameters.set(name,
        typeof value === 'number' ? value : Object.freeze(numbers))
    }

    /** 这一刻的全部参数；返回新对象，改它不影响材质 */
    getParameters() {
      this.assertUsable()
      return Object.fromEntries(this.#parameters)
    }
  }

  /** 画到哪的目标：尺寸可以改，每改一次 revision 加 1 */
  class RenderTarget extends Resource {
    #size
    #revision = 0

    constructor({ label, size }) {
      super()
      this.label = label
      this.#size = RenderTarget.requireSize(size)
      Object.freeze(this)
    }

    static requireSize(size) {
      if (!Number.isInteger(size) || size <= 0) {
        throw new Error('RenderTarget：尺寸必须是正整数，收到 ' + size)
      }
      return size
    }

    get size() {
      this.assertUsable()
      return this.#size
    }

    get revision() {
      this.assertUsable()
      return this.#revision
    }

    resize(size) {
      this.assertUsable()
      const next = RenderTarget.requireSize(size)
      if (next === this.#size) return
      this.#size = next
      this.#revision++
    }
  }

  // ==================== scene/：场景里有什么、在哪 ====================

  /** 场景里的一个物体：借用一个几何、一个材质，自己有位置 */
  class Mesh {
    constructor(geometry, material, position = [0, 0, 0]) {
      geometry.assertUsable()
      material.assertUsable()
      this.geometry = geometry
      this.material = material
      this.position = [...position] // 位置可以随时改，每次 draw 时读
    }

    modelMatrix() {
      return translation(this.position)
    }
  }

  /** 一盏灯的阴影设置：拥有自己的阴影图（一个 RenderTarget）和 bias */
  class DirectionalLightShadow {
    constructor({ mapSize, bias, halfExtent }) {
      this.target = new RenderTarget({ label: 'shadow map', size: mapSize })
      this.bias = bias
      this.halfExtent = halfExtent // 灯眼里看得见的范围 x、y ∈ [−h, h]
    }
  }

  /** 方向光：灯在哪个方向；投不投影子、阴影怎么画，都挂在灯上 */
  class DirectionalLight {
    constructor({ toLight, castShadow = false, shadow = null }) {
      this.toLight = M.normalize(toLight) // 从表面指向光源
      this.castShadow = castShadow
      this.shadow = shadow
    }
  }

  /** 场景：有哪些物体、哪些灯 */
  class Scene {
    constructor() {
      this.meshes = []
      this.lights = []
    }

    add(node) {
      if (node instanceof Mesh) this.meshes.push(node)
      else if (node instanceof DirectionalLight) this.lights.push(node)
      else throw new Error('Scene.add：只认 Mesh 和 DirectionalLight')
      return node
    }

    remove(node) {
      this.meshes = this.meshes.filter((mesh) => mesh !== node)
      this.lights = this.lights.filter((light) => light !== node)
    }
  }

  // ==================== backend：按资源查表，资源丢弃时自动删 ====================

  /** program：按 ShaderModule 查表；ShaderModule 丢弃时自动删 */
  class ProgramManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // ShaderModule → { program, uniforms, … }
    }

    get(shader) {
      shader.assertUsable()
      const cached = this.entries.get(shader)
      if (cached !== undefined) return cached

      const gl = this.gl
      const program =
        makeProgram(gl, shader.vertexSource, shader.fragmentSource)
      const uniforms = new Map()
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (let index = 0; index < count; index++) {
        const info = gl.getActiveUniform(program, index)
        const location = gl.getUniformLocation(program, info.name)
        uniforms.set(info.name, { location, type: info.type })
      }
      const position = gl.getAttribLocation(program, 'aPosition')
      // 新增：登记「这个 ShaderModule 被丢弃时，叫我 release 它」
      const unsubscribe = shader.onDispose(() => this.release(shader))
      const entry = { program, uniforms, position, unsubscribe }
      this.entries.set(shader, entry)
      return entry
    }

    release(shader) {
      const entry = this.entries.get(shader)
      if (entry === undefined) return
      entry.unsubscribe()
      this.entries.delete(shader)
      this.gl.deleteProgram(entry.program)
    }
  }

  /** 顶点 buffer：按 Geometry 查表；Geometry 丢弃时自动删 */
  class GeometryManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // Geometry → { buffer, count, … }
    }

    get(geometry) {
      geometry.assertUsable()
      const cached = this.entries.get(geometry)
      if (cached !== undefined) return cached

      const buffer = makeBuffer(this.gl, geometry.copyPositions())
      const unsubscribe = geometry.onDispose(() => this.release(geometry))
      const entry = { buffer, count: geometry.vertexCount, unsubscribe }
      this.entries.set(geometry, entry)
      return entry
    }

    release(geometry) {
      const entry = this.entries.get(geometry)
      if (entry === undefined) return
      entry.unsubscribe()
      this.entries.delete(geometry)
      this.gl.deleteBuffer(entry.buffer)
    }
  }

  /** 阴影图：按 RenderTarget 查表；revision 变了就重建，丢弃时自动删 */
  class RenderTargetManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // RenderTarget → { framebuffer, …, revision }
    }

    get(target) {
      target.assertUsable()
      const old = this.entries.get(target)
      if (old !== undefined && old.revision === target.revision) return old

      // 第一次，或者尺寸改过：照现在的描述建一份新的
      const built = makeShadowMap(this.gl, target.size)
      const unsubscribe =
        old?.unsubscribe ?? target.onDispose(() => this.release(target))
      const entry = { ...built, revision: target.revision, unsubscribe }
      this.entries.set(target, entry)
      if (old !== undefined) this.deleteGPU(old) // 新的建好以后才删旧的
      return entry
    }

    release(target) {
      const entry = this.entries.get(target)
      if (entry === undefined) return
      entry.unsubscribe()
      this.entries.delete(target)
      this.deleteGPU(entry)
    }

    deleteGPU(entry) {
      this.gl.deleteFramebuffer(entry.framebuffer)
      this.gl.deleteTexture(entry.texture)
      this.gl.deleteRenderbuffer(entry.depth)
    }
  }

  function createManagers(gl) {
    return {
      programs: new ProgramManager(gl),
      geometries: new GeometryManager(gl),
      renderTargets: new RenderTargetManager(gl)
    }
  }

  /** 第一遍用的 shader：属于「画阴影图」这件事，不属于哪个物体 */
  const depthShader = new ShaderModule({
    name: 'shadow depth',
    vertexSource: GLSL.depthVertex,
    fragmentSource: GLSL.depthFragment
  })

  /** 灯的 视图 × 正交投影（第 40 课 ⑤，范围改从灯的阴影设置里读） */
  function lightViewProjection(light) {
    const view = M.lookAt(M.scale(light.toLight, 6), [0, 0, 0], [0, 1, 0])
    return M.multiply(M.ortho(light.shadow.halfExtent, 0.1, 15), view)
  }

  /** 相机的 视图 × 透视投影；camera 是 { eye, target, fovY } */
  function cameraViewProjection(camera, aspect) {
    const view = M.lookAt(camera.eye, camera.target, [0, 1, 0])
    return M.multiply(M.perspective(camera.fovY, aspect, 0.1, 50), view)
  }

  /** 每帧：遍历场景里的物体，不再写死有哪几个 */
  function drawScene(gl, managers, scene, camera) {
    const { programs, geometries, renderTargets } = managers
    const light = scene.lights[0]
    if (!light || !light.castShadow || !light.shadow) {
      throw new Error('这一课的小引擎只画一盏投影子的方向光')
    }
    const shadow = light.shadow
    const lightVP = lightViewProjection(light)
    const aspect = gl.canvas.width / gl.canvas.height
    const cameraVP = cameraViewProjection(camera, aspect)

    // ⑥ 第一遍：每个物体都画进阴影图
    const shadowMap = renderTargets.get(shadow.target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMap.framebuffer)
    gl.viewport(0, 0, shadowMap.width, shadowMap.height)
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const depth = programs.get(depthShader)
    gl.useProgram(depth.program)
    for (const mesh of scene.meshes) {
      const geometry = geometries.get(mesh.geometry)
      setUniforms(gl, depth, { uLightVP: lightVP, uModel: mesh.modelMatrix() })
      drawPositions(gl, depth.position, geometry.buffer, geometry.count)
    }

    // ⑦ 第二遍：每个物体用自己的材质画到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowMap.texture)
    for (const mesh of scene.meshes) {
      const program = programs.get(mesh.material.shaderModule)
      const geometry = geometries.get(mesh.geometry)
      gl.useProgram(program.program)
      setUniforms(gl, program, {
        uCameraVP: cameraVP,
        uModel: mesh.modelMatrix(),
        uLightVP: lightVP,
        uToLight: light.toLight,
        uShadowBias: shadow.bias,
        uShadowMap: 0,
        ...mesh.material.getParameters() // uColor 来自材质
      })
      drawPositions(gl, program.position, geometry.buffer, geometry.count)
    }
  }

  /** 应用这一侧：把第 40 课的场景写成数据 */
  function createShadowScene(lightAngleDegrees) {
    const angle = (lightAngleDegrees * Math.PI) / 180
    const lit = new ShaderModule({
      name: 'lit with shadow',
      vertexSource: GLSL.mainVertex,
      fragmentSource: GLSL.mainFragment
    })
    const floorGeometry = new Geometry({ positions: SCENE.floorPositions })
    const triangleGeometry =
      new Geometry({ positions: SCENE.trianglePositions })
    const floorMaterial = new Material({
      shaderModule: lit,
      parameters: { uColor: SCENE.floorColor }
    })
    const triangleMaterial = new Material({
      shaderModule: lit,
      parameters: { uColor: SCENE.triangleColor }
    })
    const scene = new Scene()
    scene.add(new Mesh(floorGeometry, floorMaterial))
    const triangle = scene.add(new Mesh(triangleGeometry, triangleMaterial))
    const light = scene.add(new DirectionalLight({
      toLight: [Math.sin(angle), Math.cos(angle), 0.35],
      castShadow: true,
      shadow: new DirectionalLightShadow({
        mapSize: SCENE.shadowSize,
        bias: SCENE.shadowBias,
        halfExtent: 4.5
      })
    }))
    const camera = { eye: SCENE.cameraEye, target: SCENE.cameraTarget,
      fovY: Math.PI / 4 }
    return { scene, camera, light, triangle, lit, triangleGeometry }
  }

  RTeach.shadow42 = {
    GLSL,
    translation,
    Resource,
    Geometry,
    ShaderModule,
    Material,
    RenderTarget,
    Mesh,
    DirectionalLightShadow,
    DirectionalLight,
    Scene,
    ProgramManager,
    GeometryManager,
    RenderTargetManager,
    createManagers,
    depthShader,
    lightViewProjection,
    cameraViewProjection,
    drawScene,
    createShadowScene
  }
})()
