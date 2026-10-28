// 经典脚本 (classic script)：第 43 课「每帧先抄一份」的小引擎。
// 课程页把这里的函数用 toString() 显示出来，所以页面上的代码就是正在运行的这一份。
// 依赖 shadow-raw.js、shadow-41.js、shadow-42.js。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'
  const { M } = RTeach.shadowRaw
  const { setUniforms, drawPositions } = RTeach.shadow41
  const { depthShader, cameraViewProjection } = RTeach.shadow42
  const liveLightViewProjection = RTeach.shadow42.lightViewProjection

  // ============ 第 42 课的 drawScene 切成两半：每一半只能自己去读场景 ============

  /** 前一半：第一遍。自己读灯、读每个物体 */
  function shadowPassLive(gl, managers, scene) {
    const light = scene.lights[0]
    const lightVP = liveLightViewProjection(light)
    const shadowMap = managers.renderTargets.get(light.shadow.target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMap.framebuffer)
    gl.viewport(0, 0, shadowMap.width, shadowMap.height)
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const depth = managers.programs.get(depthShader)
    gl.useProgram(depth.program)
    for (const mesh of scene.meshes) {
      const geometry = managers.geometries.get(mesh.geometry)
      setUniforms(gl, depth, { uLightVP: lightVP, uModel: mesh.modelMatrix() })
      drawPositions(gl, depth.position, geometry.buffer, geometry.count)
    }
  }

  /** 后一半：第二遍。也自己读灯、读相机、读每个物体 */
  function mainPassLive(gl, managers, scene, camera) {
    const light = scene.lights[0]
    const lightVP = liveLightViewProjection(light)
    const aspect = gl.canvas.width / gl.canvas.height
    const cameraVP = cameraViewProjection(camera, aspect)
    const shadowMap = managers.renderTargets.get(light.shadow.target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowMap.texture)
    for (const mesh of scene.meshes) {
      const program = managers.programs.get(mesh.material.shaderModule)
      const geometry = managers.geometries.get(mesh.geometry)
      gl.useProgram(program.program)
      setUniforms(gl, program, {
        uCameraVP: cameraVP,
        uModel: mesh.modelMatrix(),
        uLightVP: lightVP,
        uToLight: light.toLight,
        uShadowBias: light.shadow.bias,
        uShadowMap: 0,
        ...mesh.material.getParameters()
      })
      drawPositions(gl, program.position, geometry.buffer, geometry.count)
    }
  }

  // ============ 第 43 课：每帧开始时先抄一份，两遍只读这一份 ============

  /** 检查 16 个数都有限，复制成冻结的普通数组（Float32Array 冻结不了） */
  function snapshotMatrix(matrix, name) {
    if (matrix.length !== 16) throw new Error(name + '：必须是 16 个数')
    for (let i = 0; i < 16; i++) {
      if (!Number.isFinite(matrix[i])) {
        throw new Error(name + '：第 ' + i + ' 个数不是有限的数（' +
          matrix[i] + '）')
      }
    }
    return Object.freeze(Array.from(matrix))
  }

  /** 灯的快照：方向、阴影设置抄数值；阴影图借用（Manager 按它查表） */
  function snapshotLight(light) {
    const shadow = light.castShadow && light.shadow
      ? Object.freeze({
        target: light.shadow.target, // 借用
        bias: light.shadow.bias,
        halfExtent: light.shadow.halfExtent
      })
      : null
    return Object.freeze({
      toLight: Object.freeze([...light.toLight]),
      shadow
    })
  }

  /** 每帧开始时调用一次：把这一帧要用的东西从场景里抄出来 */
  function buildFrame(scene, camera, aspect) {
    const view = Object.freeze({
      cameraVP: snapshotMatrix(cameraViewProjection(camera, aspect),
        'camera 的 视图×投影')
    })
    const items = Object.freeze(scene.meshes.map((mesh) => Object.freeze({
      geometry: mesh.geometry, // 借用：Manager 按它查表
      material: mesh.material, // 借用
      modelMatrix: snapshotMatrix(mesh.modelMatrix(), 'mesh.modelMatrix')
    })))
    const lights = Object.freeze(scene.lights.map(snapshotLight))
    return Object.freeze({ view, items, lights })
  }

  /** 灯的 视图×投影：快照的纯函数，同一份快照谁来算都一样 */
  function lightViewProjection(light) {
    const view = M.lookAt(M.scale(light.toLight, 6), [0, 0, 0], [0, 1, 0])
    const projection = M.ortho(light.shadow.halfExtent, 0.1, 15)
    return snapshotMatrix(M.multiply(projection, view), 'light 的 视图×投影')
  }

  /** 第一遍：只读 frame，不碰场景 */
  function shadowPass(gl, managers, frame) {
    const light = frame.lights[0]
    const lightVP = lightViewProjection(light)
    const shadowMap = managers.renderTargets.get(light.shadow.target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMap.framebuffer)
    gl.viewport(0, 0, shadowMap.width, shadowMap.height)
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const depth = managers.programs.get(depthShader)
    gl.useProgram(depth.program)
    for (const item of frame.items) {
      const geometry = managers.geometries.get(item.geometry)
      setUniforms(gl, depth, { uLightVP: lightVP, uModel: item.modelMatrix })
      drawPositions(gl, depth.position, geometry.buffer, geometry.count)
    }
  }

  /** 第二遍：同样只读 frame */
  function mainPass(gl, managers, frame) {
    const light = frame.lights[0]
    const lightVP = lightViewProjection(light)
    const shadowMap = managers.renderTargets.get(light.shadow.target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowMap.texture)
    for (const item of frame.items) {
      const program = managers.programs.get(item.material.shaderModule)
      const geometry = managers.geometries.get(item.geometry)
      gl.useProgram(program.program)
      setUniforms(gl, program, {
        uCameraVP: frame.view.cameraVP,
        uModel: item.modelMatrix,
        uLightVP: lightVP,
        uToLight: light.toLight,
        uShadowBias: light.shadow.bias,
        uShadowMap: 0,
        ...item.material.getParameters() // 材质是借用的：参数仍是现读
      })
      drawPositions(gl, program.position, geometry.buffer, geometry.count)
    }
  }

  /** 一帧：先抄一份，再按顺序跑两遍 */
  function renderFrame(gl, managers, scene, camera) {
    const aspect = gl.canvas.width / gl.canvas.height
    const frame = buildFrame(scene, camera, aspect)
    shadowPass(gl, managers, frame)
    mainPass(gl, managers, frame)
  }

  RTeach.shadow43 = {
    shadowPassLive,
    mainPassLive,
    snapshotMatrix,
    snapshotLight,
    buildFrame,
    lightViewProjection,
    shadowPass,
    mainPass,
    renderFrame
  }
})()
