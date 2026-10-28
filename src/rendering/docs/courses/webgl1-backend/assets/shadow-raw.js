// 经典脚本 (classic script)：第 40 课起「带阴影的三角形」系列的原生写法。
// 课程页把 drawShadowedTriangle.toString() 显示出来，所以页面上的代码就是正在运行的这一份。
window.RTeach = window.RTeach || {}
;(function () {
  'use strict'

  /** 第 0 部分：矩阵小工具。公式见第 25、32 课；矩阵都是列主序的 Float32Array。 */
  const M = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    normalize(a) {
      const length = Math.hypot(a[0], a[1], a[2])
      return [a[0] / length, a[1] / length, a[2] / length]
    },
    /** 视图矩阵 V：世界坐标 → 「站在 eye、看向 target」的相机坐标 */
    lookAt(eye, target, up) {
      const f = M.normalize(M.sub(target, eye))
      const s = M.normalize(M.cross(f, up))
      const u = M.cross(s, f)
      return new Float32Array([
        s[0], u[0], -f[0], 0,
        s[1], u[1], -f[1], 0,
        s[2], u[2], -f[2], 0,
        -M.dot(s, eye), -M.dot(u, eye), M.dot(f, eye), 1
      ])
    },
    /** 正交投影：看得见的是 x、y ∈ [−h, h]，深度从 near 到 far */
    ortho(h, near, far) {
      return new Float32Array([
        1 / h, 0, 0, 0,
        0, 1 / h, 0, 0,
        0, 0, -2 / (far - near), 0,
        0, 0, -(far + near) / (far - near), 1
      ])
    },
    /** 透视投影 P（第 25、32 课） */
    perspective(fovY, aspect, near, far) {
      const f = 1 / Math.tan(fovY / 2)
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
      ])
    },
    /** 列主序矩阵乘法：返回 a × b */
    multiply(a, b) {
      const out = new Float32Array(16)
      for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
          let sum = 0
          for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k]
          out[column * 4 + row] = sum
        }
      }
      return out
    }
  }

  /**
   * 一个函数画完：地面上悬着一个三角形，一盏方向光，带阴影。
   * 没有任何工程结构：场景数据、GPU 建造、矩阵、两遍绘制全写在一起，
   * 每次调用从头做一遍。
   * lightAngleDegrees：灯偏离正上方的角度（−60 到 60）。
   */
  function drawShadowedTriangle(canvas, lightAngleDegrees) {
    const gl = canvas.getContext('webgl')

    // ① 场景数据：顶点、颜色、灯、相机，全是写死的数
    const floorPositions = new Float32Array([
      -3, 0, -3, 3, 0, -3, 3, 0, 3,
      -3, 0, -3, 3, 0, 3, -3, 0, 3
    ])
    const trianglePositions = new Float32Array([
      -0.9, 1.2, -0.6, 0.9, 1.2, -0.6, 0, 1.2, 0.9
    ])
    const floorColor = [0.75, 0.75, 0.75]
    const triangleColor = [0.95, 0.55, 0.15]
    const angle = (lightAngleDegrees * Math.PI) / 180
    // 灯的方向：从表面指向光源
    const toLight = M.normalize([Math.sin(angle), Math.cos(angle), 0.35])
    const cameraEye = [0, 4.5, 6.5]
    const cameraTarget = [0, 0.4, 0]
    const shadowBias = 0.005

    // ② 编译两个 program：一个把深度画进阴影图，一个画最终画面
    function makeProgram(vertexSource, fragmentSource) {
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
      }
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program))
      }
      return program
    }
    const depthProgram = makeProgram(
      `attribute vec3 aPosition;
       uniform mat4 uLightVP;
       void main() { gl_Position = uLightVP * vec4(aPosition, 1.0); }`,
      `precision highp float;
       void main() { // 把 0..1 的深度拆进 RGBA 四个 8 位通道（第 27 课）
         vec4 p = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * gl_FragCoord.z);
         gl_FragColor = p - p.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
       }`
    )
    const mainProgram = makeProgram(
      `attribute vec3 aPosition;
       uniform mat4 uCameraVP;
       uniform mat4 uLightVP;
       varying vec4 vLightClip; // 这个点在灯眼里的位置
       void main() {
         vLightClip = uLightVP * vec4(aPosition, 1.0);
         gl_Position = uCameraVP * vec4(aPosition, 1.0);
       }`,
      `precision highp float;
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
    )

    // ③ 阴影图：512 × 512 的颜色纹理存深度，再配一个深度缓冲，
    //    挂在一个 framebuffer 上
    const shadowSize = 512
    const shadowTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadowSize, shadowSize,
      0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const shadowDepth = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, shadowDepth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
      shadowSize, shadowSize)
    const shadowFramebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, shadowTexture, 0)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER, shadowDepth)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('阴影图的 framebuffer 不完整')
    }

    // ④ 把两个物体的顶点上传到显卡
    const floorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, floorPositions, gl.STATIC_DRAW)
    const triangleBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, trianglePositions, gl.STATIC_DRAW)

    // ⑤ 这一帧的矩阵：灯的 视图×投影（正交），相机的 视图×投影（透视）
    const lightView = M.lookAt(M.scale(toLight, 6), [0, 0, 0], [0, 1, 0])
    const lightVP = M.multiply(M.ortho(4.5, 0.1, 15), lightView)
    const aspect = canvas.width / canvas.height
    const cameraView = M.lookAt(cameraEye, cameraTarget, [0, 1, 0])
    const cameraVP = M.multiply(M.perspective(Math.PI / 4, aspect, 0.1, 50), cameraView)

    // ⑥ 第一遍：站在灯的位置看，把离灯最近的深度画进阴影图
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)
    gl.viewport(0, 0, shadowSize, shadowSize)
    gl.clearColor(1, 1, 1, 1) // 白色 = 最远
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.useProgram(depthProgram)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(depthProgram, 'uLightVP'), false, lightVP)
    const depthPosition = gl.getAttribLocation(depthProgram, 'aPosition')
    gl.enableVertexAttribArray(depthPosition)
    gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer) // 画地面
    gl.vertexAttribPointer(depthPosition, 3, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer) // 画三角形
    gl.vertexAttribPointer(depthPosition, 3, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // ⑦ 第二遍：站在相机的位置看，画到屏幕；
    //    每个像素去阴影图里查自己有没有被挡住
    gl.bindFramebuffer(gl.FRAMEBUFFER, null) // 回到屏幕
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.08, 0.09, 0.12, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(mainProgram)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(mainProgram, 'uCameraVP'), false, cameraVP)
    gl.uniformMatrix4fv(
      gl.getUniformLocation(mainProgram, 'uLightVP'), false, lightVP)
    gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uToLight'), toLight)
    gl.uniform1f(gl.getUniformLocation(mainProgram, 'uShadowBias'), shadowBias)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture)
    gl.uniform1i(gl.getUniformLocation(mainProgram, 'uShadowMap'), 0)
    const mainPosition = gl.getAttribLocation(mainProgram, 'aPosition')
    gl.enableVertexAttribArray(mainPosition)
    // 画地面
    gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uColor'), floorColor)
    gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer)
    gl.vertexAttribPointer(mainPosition, 3, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    // 画三角形
    gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uColor'), triangleColor)
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer)
    gl.vertexAttribPointer(mainPosition, 3, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  RTeach.shadowRaw = { M, drawShadowedTriangle }
})()
