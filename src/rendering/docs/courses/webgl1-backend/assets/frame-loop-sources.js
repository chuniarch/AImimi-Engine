// 自动生成：node assets/build/frame-loop-sources.mjs <worktree>（2026-10-20）。不要手改。
window.RTeachFrameLoopSources = [
 {
  "file": "src/engine.ts",
  "start": 665,
  "text": "  /** 使用具名 handler，dispose 可以准确解绑。busy/lost 时只保存尺寸请求。 */\n  private readonly handleResize = (): void => {\n    if (this.state !== 'active') return\n    this.viewportRequest = Engine.readViewport()\n    this.canvas.style.width = this.viewportRequest.width + 'px'\n    this.canvas.style.height = this.viewportRequest.height + 'px'\n    this.resizePending = true\n    if (this.inFrame || this.transitioning || this.rendering) return\n    try {\n      this.applyResize()\n    } catch (cause: unknown) {\n      this.recordFailure('resize', cause)\n      // ready 检查与实际 resize 之间仍可能发生物理 loss。\n      // 新模式保留原有帧链与 resizePending，恢复后下一帧重试；\n      // 其他错误仍停止循环，不能把任意失败都当作可恢复的 context loss。\n      if (this.session === null || !(cause instanceof WebGLContextLostError)) this.stop()\n    }\n  }"
 },
 {
  "file": "src/engine.ts",
  "start": 703,
  "text": "  /**\n   * resize 操作只发生在绘制 scope 外，且只有当前路径能修改 drawing buffer。\n   * 会话路径只看会话自己的 Backend 是否 ready，不看旧路径的 context：\n   * 两者以后可能不在同一块 canvas 上（见 selectSessionCanvas）。\n   */\n  private applyResize(): void {\n    if (!this.resizePending || this.closing) return\n    const size = this.viewportRequest\n    const session = this.session\n    if (session !== null) {\n      if (!session.backend.ready) return\n      session.backend.resizeDrawingBuffer(size.width, size.height, size.ratio)\n      const binding = this.sceneSlot.current\n      if (binding !== null) this.syncCamera(session, binding.camera)\n    } else {\n      if (this.legacyContextInvalid || this.gl.isContextLost()) return\n      const width = Math.max(1, Math.floor(size.width * size.ratio))\n      const height = Math.max(1, Math.floor(size.height * size.ratio))\n      if (this.canvas.width !== width) this.canvas.width = width\n      if (this.canvas.height !== height) this.canvas.height = height\n      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)\n      this.camera.aspect = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight\n      this.camera.updateProjectionMatrix()\n    }\n    this.appliedPixelRatio = size.ratio\n    this.resizePending = false\n  }"
 },
 {
  "file": "src/engine.ts",
  "start": 731,
  "text": "  /**\n   * 每次回调只 tick 一次。FrameClock 的可变对象留在 legacy 分支，\n   * 新模式复制六个标量，不能把 textureUnitCounter 等旧 draw 状态带进新链。\n   */\n  private readonly loop = (): void => {\n    this.rafId = null\n    if (!this.runningValue || this.state !== 'active') return\n    this.inFrame = true\n    try {\n      this.applyResize()\n      const oldFrame = this.frameClock.tick()\n      const session = this.session\n      if (session !== null) {\n        if (!this.closing) {\n          const size = session.readDrawingBufferSize()\n          const frame: FrameSnapshot = Object.freeze({\n            frameNumber: oldFrame.frame,\n            timeSeconds: oldFrame.elapsedTime,\n            deltaSeconds: oldFrame.deltaTime,\n            drawingBufferWidth: size.width,\n            drawingBufferHeight: size.height,\n            pixelRatio: this.appliedPixelRatio\n          })\n          this.update(frame)\n          this.render(frame)\n        }\n      } else if (!this.legacyContextInvalid && !this.gl.isContextLost()) {\n        for (const updater of [...this.updaters]) {\n          updater.update({\n            frameContext: oldFrame,\n            camera: this.camera,\n            controls: this.cameraControls\n          })\n        }\n        this.cameraControls.update()\n        this.legacyRenderer.render(oldFrame)\n      }\n      this.perfMonitor.update()\n    } catch (cause: unknown) {\n      this.recordFailure('frame', cause)\n      // context lost 等待浏览器恢复；其他错误停止循环，避免每帧重放相同故障。\n      if (!(cause instanceof WebGLContextLostError)) this.stop()\n    } finally {\n      this.inFrame = false\n      this.scheduleFrame()\n    }\n  }\n\n  /** stop 在当前帧内发生时，不再安排下一次回调。 */\n  private scheduleFrame(): void {\n    if (this.runningValue && this.rafId === null) this.rafId = requestAnimationFrame(this.loop)\n  }"
 },
 {
  "file": "src/engine.ts",
  "start": 408,
  "text": "  /** 借用当前配对向新 Renderer 提交一帧；不把 Scene 长期存进 Renderer。 */\n  render(frame: FrameSnapshot): void {\n    this.assertActive('render')\n    if (this.transitioning || this.rendering)\n      throw new EngineOperationError('render', 'operation in progress')\n    const binding = this.sceneSlot.current\n    if (binding === null || this.session === null || this.closing) return\n    this.rendering = true\n    try {\n      this.session.renderer.render({ ...binding, frame })\n    } finally {\n      this.rendering = false\n    }\n  }"
 },
 {
  "file": "src/rendering/Renderer.ts",
  "start": 35,
  "text": "  /**\n   * @remarks\n   * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]\n   *\n   * ready=false 时不读取场景；否则提取一次，\n   * 并向全部 Pass 传入同一个 context。\n   *\n   * FrameSnapshot 显式复制六个标量，\n   * 防止外部修改原对象影响后续 Pass。\n   */\n  render(view: RenderView): void {\n    if (this.state !== 'active') {\n      throw new ResourceDisposedError('Renderer')\n    }\n\n    this.assertNotBusy('render')\n\n    if (!this.backend.ready) return\n\n    this.busy = true\n\n    try {\n      const source = view.frame\n\n      const frame: FrameSnapshot = Object.freeze({\n        frameNumber: source.frameNumber,\n        timeSeconds: source.timeSeconds,\n        deltaSeconds: source.deltaSeconds,\n        drawingBufferWidth: source.drawingBufferWidth,\n        drawingBufferHeight: source.drawingBufferHeight,\n        pixelRatio: source.pixelRatio\n      })\n\n      const { renderList, viewState } = this.renderListBuilder.build(view)\n\n      const context: RenderPassContext = Object.freeze({\n        frame,\n        view: viewState,\n        renderList,\n        backend: this.backend\n      })\n\n      this.pipeline.execute(context)\n    } finally {\n      this.busy = false\n    }\n  }"
 },
 {
  "file": "src/rendering/passes/RenderPipeline.ts",
  "start": 86,
  "text": "  /**\n   * 顺序执行。\n   * 异常中止后续 Pass，finally 允许调用者修复后发起下一帧。\n   */\n  execute(context: RenderPassContext): undefined {\n    this.assertIdle('execute')\n\n    this.busy = true\n\n    try {\n      for (const pass of this.passes) {\n        pass.execute(context)\n      }\n    } finally {\n      this.busy = false\n    }\n  }"
 },
 {
  "file": "src/rendering/passes/RenderPass.ts",
  "start": 3,
  "text": "/** Pipeline 持有的一个同步渲染步骤，不代表 WebGL draw call。 */\nexport interface RenderPass {\n  readonly name: string\n\n  /** 必须同步完成；不得返回 Promise 或启动跨出本调用的异步 draw。 */\n  execute(context: RenderPassContext): undefined"
 }
]
