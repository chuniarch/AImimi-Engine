// 经典脚本 (classic script)：第 41 课「只做一次与每帧做」的两版小引擎。
// 课程页把这里的函数和类用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js 的矩阵小工具 M（第 40 课）。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const { M } = RTeach.shadowRaw

  /** 场景里不随灯变的数：和第 40 课 ① 相同，另加一个运行中可以换上的大三角形 */
  const SCENE = {
    floorPositions: new Float32Array([
      -3, 0, -3, 3, 0, -3, 3, 0, 3,
      -3, 0, -3, 3, 0, 3, -3, 0, 3
    ]),
    trianglePositions: new Float32Array([
      -0.9, 1.2, -0.6, 0.9, 1.2, -0.6, 0, 1.2, 0.9
    ]),
    bigTrianglePositions: new Float32Array([
      -1.5, 1.2, -1.0, 1.5, 1.2, -1.0, 0, 1.2, 1.5
    ]),
    floorColor: [0.75, 0.75, 0.75],
    triangleColor: [0.95, 0.55, 0.15],
    cameraEye: [0, 4.5, 6.5],
    cameraTarget: [0, 0.4, 0],
    shadowBias: 0.005,
    shadowSize: 512
  }

  /** 两对 GLSL：和第 40 课 ② 一字不差 */
  const GLSL = {
    depthVertex: `attribute vec3 aPosition;
       uniform mat4 uLightVP;
       void main() { gl_Position = uLightVP * vec4(aPosition, 1.0); }`,
    depthFragment: `precision highp float;
       void main() { // 把 0..1 的深度拆进 RGBA 四个 8 位通道（第 27 课）
         vec4 p = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * gl_FragCoord.z);
         gl_FragColor = p - p.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
       }`,
    mainVertex: `attribute vec3 aPosition;
       uniform mat4 uCameraVP;
       uniform mat4 uLightVP;
       varying vec4 vLightClip; // 这个点在灯眼里的位置
       void main() {
         vLightClip = uLightVP * vec4(aPosition, 1.0);
         gl_Position = uCameraVP * vec4(aPosition, 1.0);
       }`,
    mainFragment: `precision highp float;
       uniform sampler2D uShadowMap;
       uniform vec3 uToLight;
       uniform vec3 uColor;
       uniform float uShadowBias;
       varying vec4 vLightClip;
       void main() {
         // 阴影图上的坐标 xy 和深度 z
         vec3 p = vLightClip.xyz / vLightClip.w * 0.5 + 0.5;
         vec4 c = texture2D(uShadowMap, p.xy);
         float stored = dot(c,
           vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
         // 比挡住它的东西更远 → 在阴影里
         float visible = p.z - uShadowBias <= stored ? 1.0 : 0.0;
         // 两个物体都水平，法线朝上
         float diffuse = max(dot(vec3(0.0, 1.0, 0.0), uToLight), 0.0);
         gl_FragColor = vec4(uColor * (0.25 + 0.75 * diffuse * visible), 1.0);
       }`
  }

  // ==================== 建造：从第 40 课 ②③④ 原样搬出来 ====================

  /** ② 编译、链接一个 program */
  function makeProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram()
    const stages = [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource]
    ]
    for (const [type, source] of stages) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader))
      }
      gl.attachShader(program, shader)
      gl.deleteShader(shader) // 新加：已挂在 program 上，program 删除时一起删
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program))
    }
    return program
  }

  /** ③ 阴影图：size × size 的颜色纹理存深度，配一个深度缓冲 */
  function makeShadowMap(gl, size) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const depth = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
      size, size)
    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, texture, 0)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER, depth)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('阴影图的 framebuffer 不完整')
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { texture, depth, framebuffer, width: size, height: size }
  }

  /** ④ 把一组顶点上传成一个 buffer */
  function makeBuffer(gl, positions) {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    return buffer
  }

  // ==================== 每帧：两版共用 ====================

  /** ⑤ 这一帧的矩阵（第 40 课 ⑤） */
  function frameMatrices(canvas, lightAngleDegrees) {
    const angle = (lightAngleDegrees * Math.PI) / 180
    const toLight = M.normalize([Math.sin(angle), Math.cos(angle), 0.35])
    const lightView = M.lookAt(M.scale(toLight, 6), [0, 0, 0], [0, 1, 0])
    const lightVP = M.multiply(M.ortho(4.5, 0.1, 15), lightView)
    const aspect = canvas.width / canvas.height
    const cameraView = M.lookAt(SCENE.cameraEye, SCENE.cameraTarget,
      [0, 1, 0])
    const cameraVP = M.multiply(
      M.perspective(Math.PI / 4, aspect, 0.1, 50), cameraView)
    return { toLight, lightVP, cameraVP }
  }

  /** 绑一个 buffer 当 aPosition，画 count 个顶点 */
  function drawPositions(gl, location, buffer, count) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, count)
  }

  // ==================== 第一版 ====================

  /** 第一版：②③④ 只做一次，建好的 GPU 对象装进一个对象交回去 */
  function setup(gl) {
    return {
      depthProgram: makeProgram(gl, GLSL.depthVertex, GLSL.depthFragment),
      mainProgram: makeProgram(gl, GLSL.mainVertex, GLSL.mainFragment),
      shadowMap: makeShadowMap(gl, SCENE.shadowSize),
      floorBuffer: makeBuffer(gl, SCENE.floorPositions),
      triangleBuffer: makeBuffer(gl, SCENE.trianglePositions)
    }
  }

  /** 第一版：⑤⑥⑦ 每帧做，只用 setup 交回来的东西 */
  function drawFrame(gl, built, lightAngleDegrees) {
    const { toLight, lightVP, cameraVP } =
      frameMatrices(gl.canvas, lightAngleDegrees)

    // ⑥ 第一遍：画进阴影图
    gl.bindFramebuffer(gl.FRAMEBUFFER, built.shadowMap.framebuffer)
    gl.viewport(0, 0, built.shadowMap.width, built.shadowMap.height)
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const depth = built.depthProgram
    gl.useProgram(depth)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(depth, 'uLightVP'), false, lightVP)
    const depthPosition = gl.getAttribLocation(depth, 'aPosition')
    drawPositions(gl, depthPosition, built.floorBuffer, 6)
    drawPositions(gl, depthPosition, built.triangleBuffer, 3)

    // ⑦ 第二遍：画到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    const main = built.mainProgram
    gl.useProgram(main)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(main, 'uCameraVP'), false, cameraVP)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(main, 'uLightVP'), false, lightVP)
    gl.uniform3fv(gl.getUniformLocation(main, 'uToLight'), toLight)
    gl.uniform1f(
      gl.getUniformLocation(main, 'uShadowBias'), SCENE.shadowBias)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, built.shadowMap.texture)
    gl.uniform1i(gl.getUniformLocation(main, 'uShadowMap'), 0)
    const mainPosition = gl.getAttribLocation(main, 'aPosition')
    gl.uniform3fv(gl.getUniformLocation(main, 'uColor'), SCENE.floorColor)
    drawPositions(gl, mainPosition, built.floorBuffer, 6)
    gl.uniform3fv(
      gl.getUniformLocation(main, 'uColor'), SCENE.triangleColor)
    drawPositions(gl, mainPosition, built.triangleBuffer, 3)
  }

  // ==================== 第二版 ====================

  /** program：第一次被要时编译，之后按 shader 描述对象查表 */
  class ProgramManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // shader 描述对象 → 建好的 program
    }

    get(shader) {
      const cached = this.entries.get(shader)
      if (cached !== undefined) return cached // 第二次起只查表

      const gl = this.gl
      const program =
        makeProgram(gl, shader.vertexSource, shader.fragmentSource)
      // 链接后把每个 active uniform 的位置和类型查一次，存起来
      const uniforms = new Map()
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (let index = 0; index < count; index++) {
        const info = gl.getActiveUniform(program, index)
        const location = gl.getUniformLocation(program, info.name)
        uniforms.set(info.name, { location, type: info.type })
      }
      const position = gl.getAttribLocation(program, 'aPosition')
      const resource = { program, uniforms, position }
      this.entries.set(shader, resource)
      return resource
    }

    release(shader) {
      const entry = this.entries.get(shader)
      if (entry === undefined) return
      this.entries.delete(shader)
      this.gl.deleteProgram(entry.program)
    }
  }

  /** 顶点 buffer：第一次被要时上传，之后按几何描述对象查表 */
  class GeometryManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // 几何描述对象 → { buffer, count }
    }

    get(geometry) {
      const cached = this.entries.get(geometry)
      if (cached !== undefined) return cached

      const buffer = makeBuffer(this.gl, geometry.positions)
      const resource = { buffer, count: geometry.positions.length / 3 }
      this.entries.set(geometry, resource)
      return resource
    }

    release(geometry) {
      const entry = this.entries.get(geometry)
      if (entry === undefined) return
      this.entries.delete(geometry)
      this.gl.deleteBuffer(entry.buffer)
    }
  }

  /** 阴影图这类「画到哪」的目标：第一次被要时建，之后按目标描述对象查表 */
  class RenderTargetManager {
    constructor(gl) {
      this.gl = gl
      this.entries = new Map() // 目标描述对象 → { framebuffer, texture, … }
    }

    get(target) {
      const cached = this.entries.get(target)
      if (cached !== undefined) return cached

      const resource = makeShadowMap(this.gl, target.size)
      this.entries.set(target, resource)
      return resource
    }

    release(target) {
      const entry = this.entries.get(target)
      if (entry === undefined) return
      this.entries.delete(target)
      this.gl.deleteFramebuffer(entry.framebuffer)
      this.gl.deleteTexture(entry.texture)
      this.gl.deleteRenderbuffer(entry.depth)
    }
  }

  /** 一个 context 一套 Manager（真实代码里是 WebGL1ResourceManager） */
  function createManagers(gl) {
    return {
      programs: new ProgramManager(gl),
      geometries: new GeometryManager(gl),
      renderTargets: new RenderTargetManager(gl)
    }
  }

  /**
   * 第二版的描述对象：只写「是什么」，不含任何 GPU 对象。
   * 页面加载时建一次，之后一直是这几个对象（第 42 课把它们做成类）。
   */
  function createDescriptions() {
    return {
      depthShader: {
        name: 'depth',
        vertexSource: GLSL.depthVertex,
        fragmentSource: GLSL.depthFragment
      },
      mainShader: {
        name: 'main',
        vertexSource: GLSL.mainVertex,
        fragmentSource: GLSL.mainFragment
      },
      shadowTarget: { name: 'shadow', size: SCENE.shadowSize },
      floorGeometry: { name: 'floor', positions: SCENE.floorPositions },
      triangleGeometry: {
        name: 'triangle',
        positions: SCENE.trianglePositions
      },
      // 名字故意和上一个相同：名字是给人看的，不保证唯一
      bigTriangleGeometry: {
        name: 'triangle',
        positions: SCENE.bigTrianglePositions
      }
    }
  }

  /**
   * 按 program 反射出来的表设 uniform。shader 里每个 active uniform
   * 都必须有值，少一个就抛错（真实代码 WebGL1Uniforms.prepare 也查这个方向）。
   */
  function setUniforms(gl, resource, values) {
    for (const [name, { location, type }] of resource.uniforms) {
      const value = values[name]
      if (value === undefined) throw new Error('uniform ' + name + ' 没有值')
      if (type === gl.FLOAT_MAT4) gl.uniformMatrix4fv(location, false, value)
      else if (type === gl.FLOAT_VEC3) gl.uniform3fv(location, value)
      else if (type === gl.FLOAT) gl.uniform1f(location, value)
      else if (type === gl.SAMPLER_2D) gl.uniform1i(location, value)
      else throw new Error('uniform ' + name + ' 的类型这里没有处理')
    }
  }

  /**
   * 第二版的每帧：用到什么就向 Manager 要什么，第一次要时才建。
   * d 是描述对象（createDescriptions 的结果），triangle 用 d.triangleGeometry。
   */
  function drawWithManagers(gl, managers, d, lightAngleDegrees) {
    const { programs, geometries, renderTargets } = managers
    const { toLight, lightVP, cameraVP } =
      frameMatrices(gl.canvas, lightAngleDegrees)
    const floor = geometries.get(d.floorGeometry)
    const triangle = geometries.get(d.triangleGeometry)

    // ⑥ 第一遍：画进阴影图
    const shadowMap = renderTargets.get(d.shadowTarget)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMap.framebuffer)
    gl.viewport(0, 0, shadowMap.width, shadowMap.height)
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const depth = programs.get(d.depthShader)
    gl.useProgram(depth.program)
    setUniforms(gl, depth, { uLightVP: lightVP })
    drawPositions(gl, depth.position, floor.buffer, floor.count)
    drawPositions(gl, depth.position, triangle.buffer, triangle.count)

    // ⑦ 第二遍：画到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    const main = programs.get(d.mainShader)
    gl.useProgram(main.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowMap.texture)
    const shared = {
      uCameraVP: cameraVP,
      uLightVP: lightVP,
      uToLight: toLight,
      uShadowBias: SCENE.shadowBias,
      uShadowMap: 0
    }
    setUniforms(gl, main, { ...shared, uColor: SCENE.floorColor })
    drawPositions(gl, main.position, floor.buffer, floor.count)
    setUniforms(gl, main, { ...shared, uColor: SCENE.triangleColor })
    drawPositions(gl, main.position, triangle.buffer, triangle.count)
  }

  RTeach.shadow41 = {
    SCENE,
    GLSL,
    makeProgram,
    makeShadowMap,
    makeBuffer,
    frameMatrices,
    drawPositions,
    setup,
    drawFrame,
    ProgramManager,
    GeometryManager,
    RenderTargetManager,
    createManagers,
    createDescriptions,
    setUniforms,
    drawWithManagers
  }
})()
