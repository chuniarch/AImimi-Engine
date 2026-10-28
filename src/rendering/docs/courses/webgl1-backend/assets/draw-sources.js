// 自动生成：node assets/build/draw-sources.mjs <worktree>（2026-10-20）。不要手改。
window.RTeachDrawSources = {
 "real": [
  {
   "file": "src/rendering/passes/ForwardPass.ts",
   "start": 18,
   "text": "  execute(context: RenderPassContext): undefined {\n    context.backend.withRenderSurface(\n      {\n        surface: { kind: 'default-framebuffer' },\n        clear: {\n          color: [0, 0, 0, 1],\n          depth: 1\n        }\n      },\n      () => {\n        for (const item of context.renderList.background) {\n          context.backend.draw({\n            item,\n            view: context.view\n          })\n        }\n\n        for (const item of context.renderList.opaque) {\n          context.backend.draw({\n            item,\n            view: context.view\n          })\n        }\n\n        return undefined\n      }\n    )\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Backend.ts",
   "start": 179,
   "text": "  /** Scope 负责目标绑定、入口清除，以及正常/异常/嵌套退出时的 surface 恢复。 */\n  withRenderSurface(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void {\n    this.requireGeneration('enter render surface').scope.run(descriptor, callback)\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Backend.ts",
   "start": 184,
   "text": "  /**\n   * 执行一次完整 draw；不把成功提交解释成 GPU 已经执行完成。\n   *\n   * @remarks\n   * [DESIGN-WEIGHT:3][webgl-draw-order]\n   * 资源解析 → uniform 预检 → program/state → uniforms/textures → vertex input → draw。\n   * 资源冷路径可能使 State 缓存失效，所以必须先解析，再应用本次 draw 的状态。\n   * VertexInputManager 最后绑定 VAO/EBO，避免先前的 buffer 上传扰乱索引来源。\n   */\n  draw(submission: DrawSubmission): void {\n    const generation = this.requireGeneration('draw')\n    generation.scope.assertDrawable()\n\n    if (\n      !(submission?.item?.geometry instanceof Geometry) ||\n      !(submission?.item?.material instanceof Material) ||\n      submission.view === null ||\n      typeof submission.view !== 'object'\n    ) {\n      throw new InvalidMaterialError('submission', 'invalid draw submission')\n    }\n\n    const { geometry, material } = submission.item\n\n    const program = generation.resources.programs.get(material.shaderModule)\n    const buffers = generation.resources.geometries.get(geometry)\n    const commands = generation.uniforms.prepare(program, submission)\n\n    this.assertCurrentDraw(generation)\n\n    generation.state.useProgram(program.program)\n    this.applyDrawState(material, generation.state)\n    generation.uniforms.upload(commands)\n    generation.resources.vertexInputs.bind(geometry, buffers, program)\n\n    this.assertCurrentDraw(generation)\n\n    if (buffers.indexBuffer === null) {\n      this.gl.drawArrays(buffers.primitiveMode, 0, buffers.drawCount)\n    } else {\n      if (buffers.indexType === null) {\n        throw new WebGLOperationError('draw', 'Geometry', 'index buffer has no index type')\n      }\n\n      this.gl.drawElements(buffers.primitiveMode, buffers.drawCount, buffers.indexType, 0)\n    }\n\n    this.assertCurrentDraw(generation)\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Backend.ts",
   "start": 307,
   "text": "  /**\n   * 应用本次绘制的完整固定状态。\n   *\n   * @remarks\n   * [DESIGN-WEIGHT:3][draw-dither-state]\n   *\n   * 未支持的 blend/stencil/scissor 等固定关闭。DITHER 由 Material 明确选择：\n   * 编码深度的 draw 关闭，后续普通颜色 draw 可以重新开启。\n   * 不承诺 scope 退出恢复所有 GL 状态；下一笔 draw 重新应用自己的状态。\n   */\n  private applyDrawState(material: Material, state: WebGL1State): void {\n    const gl = this.gl\n\n    for (const capability of [\n      gl.BLEND,\n      gl.STENCIL_TEST,\n      gl.SCISSOR_TEST,\n      gl.POLYGON_OFFSET_FILL,\n      gl.SAMPLE_ALPHA_TO_COVERAGE,\n      gl.SAMPLE_COVERAGE\n    ]) {\n      gl.disable(capability)\n    }\n\n    // 每笔 draw 显式提交；冷路径、clear 或前一笔数据绘制都不决定本次值。\n    if (material.state.dither) gl.enable(gl.DITHER)\n    else gl.disable(gl.DITHER)\n\n    gl.colorMask(true, true, true, true)\n    gl.depthRange(0, 1)\n    gl.frontFace(gl.CCW)\n    gl.lineWidth(1)\n\n    state.setDepthState(material.state)\n    state.setCullMode(material.state.cullMode)\n  }"
  }
 ],
 "mini": [
  {
   "file": "assets/shadow-45.js",
   "start": 177,
   "text": "    execute({ frame, backend }) {\n      const light = frame.lights[0]\n      const surface = { target: null, clear: [0.08, 0.09, 0.12, 1] }\n      backend.withRenderSurface(surface, () => {\n        for (const item of frame.items) {\n          backend.draw({\n            item,\n            uniforms: {\n              uCameraVP: frame.view.cameraVP,\n              uModel: item.modelMatrix,\n              uToLight: light.toLight\n            }\n          })\n        }\n      })\n    }"
  },
  {
   "file": "assets/shadow-44.js",
   "start": 23,
   "text": "    /** 进门：记下现在画到哪，换到目的地；出门：一定换回来，出错也换 */\n    withRenderSurface({ target = null, clear }, callback) {\n      const gl = this.gl\n      // 先记下进门前的状态，再去要目标：第一次建 framebuffer 会改绑定\n      const previous = {\n        framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),\n        viewport: gl.getParameter(gl.VIEWPORT)\n      }\n      this.stack.push(target)\n      try {\n        const resource = target && this.managers.renderTargets.get(target)\n        gl.bindFramebuffer(gl.FRAMEBUFFER, resource ? resource.framebuffer : null)\n        // viewport 由目的地的尺寸决定，写 Pass 的人不用、也没机会自己设\n        gl.viewport(0, 0,\n          resource ? resource.width : gl.drawingBufferWidth,\n          resource ? resource.height : gl.drawingBufferHeight)\n        if (clear) {\n          gl.clearColor(...clear)\n          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)\n        }\n        callback()\n      } finally {\n        this.stack.pop()\n        gl.bindFramebuffer(gl.FRAMEBUFFER, previous.framebuffer)\n        gl.viewport(...previous.viewport)\n      }\n    }"
  },
  {
   "file": "assets/shadow-45.js",
   "start": 146,
   "text": "  /** 后端：值从三处找——Pass 给的、材质自己的、材质借用的块 */\n  class Backend extends S44.Backend {\n    draw({ item, shader = item.material.shaderModule, uniforms = {} }) {\n      const material = item.material\n      const values = { ...uniforms } // Pass 给的：相机、物体位置\n      const sources = [['材质', material.getParameters()]]\n      for (const block of material.blocks) {\n        block.assertUsable()\n        const entries = block.names.map((name) => [name, block.get(name)])\n        sources.push(['块 ' + block.label, Object.fromEntries(entries)])\n      }\n      for (const [source, entries] of sources) {\n        for (const [name, value] of Object.entries(entries)) {\n          // 材质和块之间构造时查过；这里查 Pass 给的和它们撞没撞\n          if (name in values) {\n            throw new Error('uniform ' + name + '：Pass 和' + source +\n              '都给了值')\n          }\n          values[name] = value\n        }\n      }\n      super.draw({ item, shader, uniforms: values })\n    }"
  },
  {
   "file": "assets/shadow-44.js",
   "start": 51,
   "text": "    /** 画一个物体：要用的状态自己设好，不靠前面谁留下的 */\n    draw({ item, shader = item.material.shaderModule, uniforms }) {\n      const gl = this.gl\n      if (this.stack.length === 0) {\n        throw new Error('draw 必须在 withRenderSurface 里面调用')\n      }\n      const program = this.managers.programs.get(shader)\n      const geometry = this.managers.geometries.get(item.geometry)\n      const values = {}\n      let unit = 0\n      for (const [name, value] of Object.entries(uniforms)) {\n        if (!(value instanceof RenderTarget)) {\n          values[name] = value\n          continue\n        }\n        // 值是一个 RenderTarget：绑到一个纹理单元上采样\n        if (value === this.stack[this.stack.length - 1]) {\n          throw new Error(name + '：不能采样正在写的目标 ' + value.label)\n        }\n        gl.activeTexture(gl.TEXTURE0 + unit)\n        gl.bindTexture(gl.TEXTURE_2D,\n          this.managers.renderTargets.get(value).texture)\n        values[name] = unit++\n      }\n      gl.useProgram(program.program)\n      gl.enable(gl.DEPTH_TEST) // 每次 draw 都设，不依赖别的 Pass 开过\n      setUniforms(gl, program, values)\n      drawPositions(gl, program.position, geometry.buffer, geometry.count)\n    }"
  }
 ]
}
