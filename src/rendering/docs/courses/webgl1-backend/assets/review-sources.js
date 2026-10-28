// 自动生成：node assets/build/review-sources.mjs <worktree>（2026-10-20）。不要手改。
window.RTeachReviewSources = {
 "particles": [
  {
   "file": "src/rendering/resources/Geometry.ts",
   "start": 10,
   "text": "/**\n * 此静态 Geometry 版本支持的 primitive topology。\n *\n * @remarks\n * 当前支持 triangles、lines、line-strip 和 triangle-strip。\n *\n * TODO(geometry-topology-expansion): 当后续作业或运行时需求确实需要 points、\n * line-loop、triangle-fan 等拓扑时，同步扩展类型、drawCount 验证、WebGL1 topology\n * 映射和测试。不能只扩展此 union。\n */\nexport type PrimitiveTopology = 'triangles' | 'lines' | 'line-strip' | 'triangle-strip'"
  },
  {
   "file": "src/rendering/resources/Geometry.ts",
   "start": 118,
   "text": "/**\n * 不含任何 GPU handle 的静态 CPU Geometry。\n *\n * @remarks\n * [DESIGN-WEIGHT:2][geometry-cpu-gpu-boundary]\n *\n * Geometry 只保存：\n *\n * - attribute semantic name 到不可变 VertexAttribute 的映射；\n * - 可选的无符号 index 快照；\n * - primitive topology；\n * - 已验证的 vertexCount 和 drawCount。\n *\n * Geometry 不知道 WebGL context、WebGLBuffer、VAO、attribute location 或扩展状态。\n * 后续每个 WebGL1Backend/context 的 GeometryManager 分别为同一 Geometry 创建和\n * 释放 GPU 表示。\n *\n * 初版 Geometry 是完全静态的，不提供 revision、usage 或 updateAttribute()。\n */\nexport class Geometry extends Resource {"
  },
  {
   "file": "src/rendering/resources/VertexAttribute.ts",
   "start": 79,
   "text": "  constructor(options: {\n    readonly data: VertexAttributeData\n    readonly itemSize: number\n    readonly normalized?: boolean\n  }) {\n    const { data, itemSize, normalized = false } = options\n\n    if (!Number.isInteger(itemSize) || itemSize <= 0) {\n      throw new InvalidVertexAttributeError(\n        ATTRIBUTE_DIAGNOSTIC_NAME,\n        `itemSize must be a positive integer; received ${String(itemSize)}`\n      )\n    }\n\n    if (data.length % itemSize !== 0) {\n      throw new InvalidVertexAttributeError(\n        ATTRIBUTE_DIAGNOSTIC_NAME,\n        `data length ${data.length} is not divisible by itemSize ${itemSize}`\n      )\n    }\n\n    this.dataValue = copyVertexAttributeData(data)\n    this.itemSize = itemSize\n    this.normalized = normalized\n  }"
  },
  {
   "file": "src/rendering/scene/Mesh.ts",
   "start": 23,
   "text": "  /** 借用原 Geometry 的身份，不持有独立副本。 */\n  private readonly geometryValue: Geometry\n"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 73,
   "text": "  private readonly entries = new Map<Geometry, GeometryEntry>()"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 104,
   "text": "  get(geometry: Geometry): WebGL1GeometryResource {\n    this.assertAvailable('get geometry')\n\n    if (geometry.disposed) throw new ResourceDisposedError('Geometry')\n\n    if (this.releasing.has(geometry)) {\n      throw new WebGLOperationError('get geometry', 'Geometry', 'release is in progress')\n    }\n\n    const cached = this.entries.get(geometry)\n    if (cached !== undefined) return cached.resource\n\n    // 先做 CPU 预检；Uint32 无法降级时，一个 GPU buffer 都不创建。\n    const indices = this.prepareIndices(geometry.copyIndices())\n    const mode = this.primitiveMode(geometry.topology)\n    const gl = this.gl\n\n    // 本次创建过程的清理清单，不是 CPU Geometry 的资源列表。\n    const owned: WebGLBuffer[] = []\n\n    this.checkError('preflight', 'Geometry')"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 142,
   "text": "      try {\n        for (const name of geometry.getAttributeNames()) {\n          const attribute = geometry.getAttribute(name)!\n          const data = attribute.copyData()\n          const type = this.attributeType(data)\n\n          const buffer = this.upload(gl.ARRAY_BUFFER, data, `Geometry.attribute:${name}`, owned)"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 212,
   "text": "  release(geometry: Geometry): void {\n    const entry = this.entries.get(geometry)\n\n    if (entry === undefined || this.releasing.has(geometry)) return\n\n    if (this.gl.isContextLost() || this.lostValue) {\n      this.invalidateForContextLoss()\n      return\n    }\n\n    this.releasing.add(geometry)\n\n    try {\n      this.hooks.beforeDelete?.(geometry)\n\n      if (this.gl.isContextLost() || this.lostValue) {\n        this.invalidateForContextLoss()\n        return\n      }\n\n      entry.unsubscribe()\n      this.entries.delete(geometry)\n\n      for (const attribute of entry.resource.attributes.values()) {\n        this.gl.deleteBuffer(attribute.buffer)\n      }\n\n      if (entry.resource.indexBuffer !== null) {\n        this.gl.deleteBuffer(entry.resource.indexBuffer)\n      }\n\n      this.hooks.invalidateState()\n    } finally {\n      this.releasing.delete(geometry)\n    }\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 314,
   "text": "  private upload(\n    target: number,\n    data: VertexAttributeData | IndexData,\n    label: string,\n    owned: WebGLBuffer[]\n  ): WebGLBuffer {\n    const gl = this.gl\n    const candidate = gl.createBuffer()\n\n    this.assertAvailable('create buffer')\n\n    const buffer = requireNonNull(candidate, () => new WebGLResourceCreationError('buffer', label))\n\n    owned.push(buffer)\n\n    gl.bindBuffer(target, buffer)\n    gl.bufferData(target, data, gl.STATIC_DRAW)\n\n    // bufferData 返回 void；try/catch 本身捕获不到 GL 错误码。\n    this.checkError('upload buffer', label)\n\n    return buffer\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1GeometryManager.ts",
   "start": 357,
   "text": "  /** default 留在 switch 内，新增 CPU topology 时由 assertNever 提醒同步扩展。 */\n  private primitiveMode(topology: PrimitiveTopology): number {\n    let mode: number\n\n    switch (topology) {\n      case 'triangles':\n        mode = this.gl.TRIANGLES\n        break\n\n      case 'lines':\n        mode = this.gl.LINES\n        break\n\n      case 'line-strip':\n        mode = this.gl.LINE_STRIP\n        break\n\n      case 'triangle-strip':\n        mode = this.gl.TRIANGLE_STRIP\n        break\n\n      default:\n        assertNever(topology)\n    }\n\n    return mode\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1ManualVertexInputManager.ts",
   "start": 106,
   "text": "  /** 禁用受管理的位置并清空当前 buffer 绑定，不删除 CPU/GPU 资源。 */\n  unbind(): void {\n    if (this.support.disposed) return\n\n    if (this.support.contextLost) {\n      this.invalidateForContextLoss()\n      return\n    }\n\n    try {\n      this.resetBindings(false)\n      this.support.checkError('unbind manual vertex input')\n    } finally {\n      this.hooks.invalidateState()\n    }\n  }\n\n  /** 当前输入借用了该 Geometry 时先解绑，其他 Geometry 不受影响。 */\n  releaseGeometry(geometry: Geometry): void {\n    if (this.currentGeometry === geometry) {\n      this.unbind()\n    }\n  }"
  },
  {
   "file": "src/rendering/core/Resource.ts",
   "start": 204,
   "text": "  private finalizeDisposal(): void {\n    if (this.disposedValue) return\n\n    this.disposedValue = true\n\n    for (const listener of this.disposeListeners) {\n      listener()\n    }\n\n    this.disposeListeners.clear()\n\n    this.disposeCPUData()\n  }"
  }
 ],
 "texture": [
  {
   "file": "src/rendering/resources/Texture.ts",
   "start": 18,
   "text": "/**\n * 当前 CPU Texture 资源支持的逻辑像素通道布局。\n *\n * @remarks\n * backend 负责把逻辑 format 映射为 WebGL1/WebGL2 的 format/internalFormat。\n */\nexport type TextureFormat = 'r' | 'rg' | 'rgb' | 'rgba'\n\n/**\n * 当前 CPU Texture 资源支持的像素标量类型。\n *\n * @remarks\n * uint8 覆盖普通 PNG/JPEG 等 LDR 图像；float32 覆盖 HDR/EXR 解码后的线性数据。\n */\nexport type TextureDataType = 'uint8' | 'float32'\n\n/** 纹理数据采用的颜色空间语义。 */\nexport type TextureColorSpace = 'srgb' | 'linear' | 'data'"
  },
  {
   "file": "src/rendering/resources/Texture2D.ts",
   "start": 14,
   "text": "/**\n * 浏览器可以作为普通二维图片来源的对象。\n *\n * @remarks\n * 当前不纳入 HTMLCanvasElement、HTMLVideoElement 或 VideoFrame，因为本阶段资源\n * 是静态 Texture。需要动态上传时应单独引入 version/update 契约。\n */\nexport type TextureImageSource = HTMLImageElement | ImageBitmap"
  },
  {
   "file": "src/rendering/resources/Texture2D.ts",
   "start": 102,
   "text": "/**\n * 由 Uint8Array 或 Float32Array 提供像素的二维纹理资源。\n *\n * @remarks\n * HDR/EXR loader 应先把文件解析为 Float32Array、width 和 height，再构造\n * DataTexture2D。ShaderModule 不参与文件格式解析。\n */\nexport class DataTexture2D extends Texture2D {\n  protected readonly resourceType = 'DataTexture2D'\n\n  private sourceValue: TexturePixelSnapshot2D | null\n\n  constructor(options: DataTexture2DOptions) {\n    const textureLabel = getTextureDiagnosticLabel(options.label)\n\n    super(options, (reason) => new InvalidTextureSourceError(textureLabel, reason))\n\n    this.sourceValue = createTexturePixelSnapshot2D(\n      options.source,\n      this.storage,\n      (reason) => new InvalidTextureSourceError(this.label, reason)\n    )\n  }"
  },
  {
   "file": "src/rendering/resources/texturePixelSnapshot.ts",
   "start": 116,
   "text": "  const expectedLength = source.width * source.height * getChannelCount(storage.format)\n\n  if (!Number.isSafeInteger(expectedLength)) {\n    throw createError('texture dimensions exceed the safe CPU array length range')\n  }\n\n  if (source.data.length !== expectedLength) {\n    throw createError(\n      `data length ${source.data.length} does not match expected length ${expectedLength}`\n    )\n  }\n\n  return Object.freeze({\n    data: copyTexturePixelArray(source.data),\n    width: source.width,\n    height: source.height\n  })"
  },
  {
   "file": "src/rendering/resources/Texture2D.ts",
   "start": 140,
   "text": "  /**\n   * 复制完整二维像素 source。\n   *\n   * @returns wrapper 和 TypedArray 都是新对象。\n   */\n  copySource(): TexturePixelSource2D {\n    this.assertUsable()\n\n    return copyTexturePixelSnapshot2D(this.sourceValue!)\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Texture2DManager.ts",
   "start": 51,
   "text": "function readSource(texture: Texture2D): UploadSource {\n  if (texture instanceof DataTexture2D) {\n    return { kind: 'data', ...texture.copySource() }\n  }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Texture2DManager.ts",
   "start": 103,
   "text": "  /** 首次调用完整上传；后续借用相同 GPU 对象，静态来源更新需新建 CPU Texture。 */\n  get(texture: Texture2D): WebGL1Texture2DResource {\n    this.assertReady()\n    texture.assertUsable()\n    const cached = this.entries.get(texture)\n    if (cached !== undefined) return cached.resource\n\n    const gl = this.gl\n    let handle: WebGLTexture | null = null\n    try {\n      assertTextureOperation(gl, 'begin texture2D upload', texture.label)\n      const source = readSource(texture)\n      const format = this.validateStorage(texture, source)\n      const type = texture.storage.type === 'float32' ? gl.FLOAT : gl.UNSIGNED_BYTE\n\n      withTextureUploadState(gl, gl.TEXTURE_2D, () => {\n        handle = requireNonNull(\n          gl.createTexture(),\n          () => new WebGLResourceCreationError('texture2D', texture.label)\n        )\n        gl.bindTexture(gl.TEXTURE_2D, handle)\n        if (source.kind === 'data') {\n          gl.texImage2D(\n            gl.TEXTURE_2D,\n            0,\n            format,\n            source.width,\n            source.height,\n            0,\n            format,\n            type,\n            source.data\n          )\n        } else {\n          gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, source.image)\n        }\n        assertTextureOperation(gl, 'upload texture2D pixels', texture.label)\n        this.applySampler(texture)\n        if (texture.mipmapPolicy === 'generate') gl.generateMipmap(gl.TEXTURE_2D)\n        assertTextureOperation(gl, 'configure texture2D', texture.label)\n      })"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Texture2DManager.ts",
   "start": 170,
   "text": "  /**\n   * 在分配 handle 之前，验证当前 WebGL1 设备能否准确实现描述。\n   *\n   * @remarks\n   * r/rg 不冒充 LUMINANCE 系列；float 上传与 float 线性过滤分别检查。\n   * sRGB uint8 必须使用 EXT_sRGB，不能静默改成线性格式。\n   * 本批不实现 float 自动 mip；支持上传不代表支持自动 mip 生成。\n   */\n  private validateStorage(texture: Texture2D, source: UploadSource): number {\n    const gl = this.gl\n    const unsupported = (reason: string): never => {\n      throw new UnsupportedRenderFeatureError('texture2D ' + texture.label, reason)\n    }\n    const { width, height } = source\n    if (\n      !Number.isSafeInteger(width) ||\n      width <= 0 ||\n      !Number.isSafeInteger(height) ||\n      height <= 0\n    ) {\n      throw new InvalidTextureSourceError(\n        texture.label,\n        'pixel dimensions must be positive safe integers'\n      )\n    }\n    const maximum = requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, 'MAX_TEXTURE_SIZE')\n    if (width > maximum || height > maximum) unsupported('pixel dimensions exceed device limit')\n\n    const pot = Number.isInteger(Math.log2(width)) && Number.isInteger(Math.log2(height))\n    if (\n      !pot &&\n      (texture.sampler.wrapS !== 'clamp-to-edge' ||\n        texture.sampler.wrapT !== 'clamp-to-edge' ||\n        texture.mipmapPolicy !== 'none' ||\n        (texture.sampler.minFilter !== 'nearest' && texture.sampler.minFilter !== 'linear'))\n    ) {\n      unsupported('WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps')\n    }\n\n    const storage = texture.storage\n    if (storage.format !== 'rgb' && storage.format !== 'rgba') {\n      unsupported('r/rg channel mapping is not implemented')\n    }\n    if (storage.type === 'float32') {\n      if (source.kind !== 'data') unsupported('float32 requires CPU pixel data')\n      if (this.capabilities.textureFloat === null) unsupported('OES_texture_float is required')\n      const linear =\n        texture.sampler.magFilter === 'linear' || texture.sampler.minFilter.includes('linear')\n      if (linear && this.capabilities.textureFloatLinear === null) {\n        unsupported('OES_texture_float_linear is required')\n      }\n      if (texture.mipmapPolicy !== 'none')\n        unsupported('float32 mipmap generation is not implemented')\n      if (texture.colorSpace === 'srgb') unsupported('sRGB storage requires uint8')\n    }\n    if (texture.colorSpace === 'srgb') {\n      if (this.srgbExtension === undefined) this.srgbExtension = gl.getExtension('EXT_sRGB')\n      if (gl.isContextLost()) throw new WebGLContextLostError('query EXT_sRGB')\n      if (this.srgbExtension === null)\n        unsupported('EXT_sRGB is required; no implicit color-space fallback')\n      const extension = this.srgbExtension!\n      return storage.format === 'rgb' ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT\n    }\n    return storage.format === 'rgb' ? gl.RGB : gl.RGBA\n  }"
  }
 ],
 "longrun": [
  {
   "file": "src/rendering/backend/webgl1/WebGL1Backend.ts",
   "start": 78,
   "text": "    this.lifecycle = new WebGLContextLifecycle(canvas, {\n      onLost: () => {\n        this.invalidateGeneration()\n      },\n\n      restore: () => {\n        const epoch = this.epoch\n        const candidate = this.createGeneration()\n\n        if (this.disposedValue || epoch !== this.epoch || this.gl.isContextLost()) {\n          candidate.resources.invalidateForContextLoss()\n          candidate.resources.dispose()\n\n          throw new WebGLContextLostError('publish restored backend')\n        }\n\n        this.generation = candidate\n      },\n\n      onReady: () => {\n        if (this.gl.isContextLost()) {\n          throw new WebGLContextLostError('finish restoration')\n        }\n      },\n\n      onRestoreFailed: () => {\n        // 原始错误由 lifecycle.lastFailure 保存，不在 DOM listener 中继续抛出。\n      },\n\n      onSuppressedError: (error) => {\n        this.suppressedValue = error\n      }\n    })"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1Backend.ts",
   "start": 289,
   "text": "     * [DESIGN-WEIGHT:3][attachment-content-rebuild]\n     * 恢复只创建新 generation；CPU 来源可重传，附件内容必须由生产者重画。"
  },
  {
   "file": "src/rendering/Renderer.ts",
   "start": 44,
   "text": "  render(view: RenderView): void {\n    if (this.state !== 'active') {\n      throw new ResourceDisposedError('Renderer')\n    }\n\n    this.assertNotBusy('render')\n\n    if (!this.backend.ready) return"
  },
  {
   "file": "src/rendering/passes/RenderPassContext.ts",
   "start": 6,
   "text": "/**\n * 本帧所有 Pass 共用的上下文，不包含可变 Scene/Camera。\n * Renderer 冻结包装；backend 和逻辑 Resource 仍是借用引用。\n */\nexport interface RenderPassContext {\n  readonly frame: FrameSnapshot\n  readonly view: ViewState\n  readonly renderList: RenderList\n  readonly backend: RenderBackend\n}"
  },
  {
   "file": "src/rendering/backend/RenderBackend.ts",
   "start": 18,
   "text": "export interface RenderBackend {\n  /** 设备已就绪、未 lost 且未 disposed 时才为 true。 */\n  readonly ready: boolean\n\n  /** 调整默认 drawing buffer，不修改离屏目标；不能在活动 scope 中调用。 */\n  resizeDrawingBuffer(cssWidth: number, cssHeight: number, pixelRatio: number): void\n\n  /**\n   * 绑定目标、执行入口清除，然后同步执行 callback。\n   *\n   * @remarks\n   * [DESIGN-WEIGHT:3][render-surface-synchronous-scope]\n   * WebGL1 必须在解析 GPU 目标前捕获真实 framebuffer/viewport。\n   * 正常、异常和嵌套退出均恢复入口状态，但不回滚像素、不释放逻辑目标。\n   * context generation 已失效时，禁止用旧快照恢复 GPU 绑定。\n   *\n   * callback 只返回 undefined；禁止跨 await 或启动稍后再次 draw 的任务。\n   * scope 内不得 resize/dispose 当前或外层目标，也不得修改 drawing buffer。\n   */\n  withRenderSurface(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void\n\n  /** 仅在活动 scope 内提交绘制；返回不代表 GPU 已完成执行。 */\n  draw(submission: DrawSubmission): void\n\n  /** 幂等释放 Backend 的 GPU 表示与监听，不释放借用的 CPU Resource。 */\n  dispose(): void\n}"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts",
   "start": 247,
   "text": "    for (const color of descriptor.colors) {\n      if (color.format !== 'rgba32f') continue\n\n      if (this.capabilities.textureFloat === null) {\n        throw new UnsupportedRenderFeatureError(\n          'rgba32f render target',\n          'OES_texture_float is required'\n        )\n      }\n      if (this.capabilities.colorBufferFloat === null) {\n        throw new UnsupportedRenderFeatureError(\n          'rgba32f render target',\n          'WEBGL_color_buffer_float is required'\n        )\n      }\n\n      const requiresLinear =\n        color.sampler.minFilter === 'linear' || color.sampler.magFilter === 'linear'\n      if (requiresLinear && this.capabilities.textureFloatLinear === null) {\n        throw new UnsupportedRenderFeatureError(\n          'rgba32f linear filtering',\n          'OES_texture_float_linear is required'\n        )\n      }\n    }"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts",
   "start": 322,
   "text": "          const color = descriptor.colors[index]!\n          const type = color.format === 'rgba32f' ? gl.FLOAT : gl.UNSIGNED_BYTE\n          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null)"
  },
  {
   "file": "src/rendering/backend/webgl1/WebGL1ResourceManager.ts",
   "start": 171,
   "text": "  invalidateForContextLoss(): void {\n    if (this.lost) return\n\n    this.lost = true\n\n    for (const manager of this.disposalOrder) {\n      manager.invalidateForContextLoss()\n    }\n  }"
  }
 ]
}
