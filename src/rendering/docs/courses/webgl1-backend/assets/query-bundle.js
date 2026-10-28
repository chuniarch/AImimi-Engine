// 自动生成：esbuild 打包 dual-webgl-backend worktree 的 src/rendering（2026-10-15 工作区版本）和课程代码 query-course.ts。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachQuery = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name = (target2, value) => __defProp(target2, "name", { value, configurable: true });
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/query-entry.ts
  var query_entry_exports = {};
  __export(query_entry_exports, {
    DuplicateSceneNodeError: () => DuplicateSceneNodeError,
    ForwardPass: () => ForwardPass,
    Geometry: () => Geometry,
    IncompleteFramebufferError: () => IncompleteFramebufferError,
    InvalidCubeTextureError: () => InvalidCubeTextureError,
    InvalidGeometryError: () => InvalidGeometryError,
    InvalidMaterialError: () => InvalidMaterialError,
    InvalidMeshError: () => InvalidMeshError,
    InvalidPerspectiveCameraError: () => InvalidPerspectiveCameraError,
    InvalidRenderTargetError: () => InvalidRenderTargetError,
    InvalidShaderModuleError: () => InvalidShaderModuleError,
    InvalidTextureSourceError: () => InvalidTextureSourceError,
    InvalidVertexAttributeError: () => InvalidVertexAttributeError,
    Material: () => Material,
    Mesh: () => Mesh,
    PerspectiveCamera: () => PerspectiveCamera,
    ProgramLinkError: () => ProgramLinkError,
    RenderListBuilder: () => RenderListBuilder,
    RenderPipeline: () => RenderPipeline,
    RenderTarget: () => RenderTarget,
    RenderTargetUnavailableError: () => RenderTargetUnavailableError,
    Renderer: () => Renderer,
    RenderingError: () => RenderingError,
    ResourceDisposedError: () => ResourceDisposedError,
    ResourceHasSceneReferencesError: () => ResourceHasSceneReferencesError,
    ResourceSceneReferenceUnderflowError: () => ResourceSceneReferenceUnderflowError,
    Scene: () => Scene,
    SceneGraphCycleError: () => SceneGraphCycleError,
    ShaderCompilationError: () => ShaderCompilationError,
    ShaderModule: () => ShaderModule,
    UnsupportedIndexTypeError: () => UnsupportedIndexTypeError,
    UnsupportedRenderFeatureError: () => UnsupportedRenderFeatureError,
    UnsupportedShaderLanguageError: () => UnsupportedShaderLanguageError,
    VertexAttribute: () => VertexAttribute,
    VertexAttributeSemantic: () => VertexAttributeSemantic,
    WebGL1Backend: () => WebGL1Backend,
    WebGLBackendDisposedError: () => WebGLBackendDisposedError,
    WebGLContextCreationError: () => WebGLContextCreationError,
    WebGLContextLostError: () => WebGLContextLostError,
    WebGLOperationError: () => WebGLOperationError,
    WebGLResourceCreationError: () => WebGLResourceCreationError,
    course: () => query_course_exports
  });

  // src/errors/EngineError/BaseError.ts
  var _EngineError = class _EngineError extends Error {
    constructor(message, code, options = {}) {
      super(message);
      // 错误代码（用于国际化、错误码映射等）
      __publicField(this, "code");
      // 时间戳
      __publicField(this, "timestamp");
      // 错误上下文（附加信息）
      __publicField(this, "context");
      // 是否可恢复
      __publicField(this, "recoverable");
      // 原始错误（Error Cause），用于错误链追踪
      __publicField(this, "cause");
      Object.setPrototypeOf(this, new.target.prototype);
      this.name = this.constructor.name;
      this.code = code;
      this.context = options.context;
      this.recoverable = options.recoverable ?? false;
      this.timestamp = /* @__PURE__ */ new Date();
      if (options.cause) {
        this.cause = options.cause;
      }
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, new.target);
      }
    }
    /**
     * 转换为JSON（用于日志和监控）
     *
     * @remarks
     * 适用于日志系统、监控平台或错误上报服务。
     */
    toJSON() {
      return {
        name: this.name,
        code: this.code,
        message: this.message,
        context: this.context,
        recoverable: this.recoverable,
        timestamp: this.timestamp.toISOString(),
        stack: this.stack
      };
    }
    /**
     * 转换为用户友好的消息
     *
     * @remarks
     * - 子类可重写该方法以支持国际化或更友好的提示
     * - 默认返回 `message`
     */
    toUserMessage() {
      return this.message;
    }
  };
  __name(_EngineError, "EngineError");
  var EngineError = _EngineError;

  // src/rendering/core/errors/RenderingError.ts
  var _RenderingError = class _RenderingError extends EngineError {
    /**
     * @param message - 面向开发者的可读错误描述。
     * @param code - 供程序分类、日志聚合或本地化映射使用的稳定错误码。
     * @param details - 创建错误时需要保留的领域上下文；只复制并冻结最外层。
     */
    constructor(message, code, details = {}) {
      const frozenDetails = Object.freeze({
        ...details
      });
      super(message, code, {
        context: frozenDetails,
        recoverable: false
      });
      /** 与 `EngineError.context` 引用相同对象的冻结诊断快照。 */
      __publicField(this, "details");
      this.details = frozenDetails;
    }
  };
  __name(_RenderingError, "RenderingError");
  var RenderingError = _RenderingError;
  var _ResourceDisposedError = class _ResourceDisposedError extends RenderingError {
    /** @param resourceName - 不依赖压缩后类名的稳定资源诊断类型。 */
    constructor(resourceName) {
      super(`${resourceName} has been disposed`, "RESOURCE_DISPOSED", {
        resourceName
      });
    }
  };
  __name(_ResourceDisposedError, "ResourceDisposedError");
  var ResourceDisposedError = _ResourceDisposedError;
  var _ResourceHasSceneReferencesError = class _ResourceHasSceneReferencesError extends RenderingError {
    /**
     * @param resourceName - 稳定的资源诊断类型。
     * @param sceneReferenceCount - 当前仍然存在的 Scene 引用数量。
     */
    constructor(resourceName, sceneReferenceCount) {
      const referenceState = sceneReferenceCount === 1 ? "1 Scene reference remains" : `${sceneReferenceCount} Scene references remain`;
      super(
        `${resourceName} cannot be disposed while ${referenceState}`,
        "RESOURCE_HAS_SCENE_REFERENCES",
        {
          resourceName,
          sceneReferenceCount
        }
      );
    }
  };
  __name(_ResourceHasSceneReferencesError, "ResourceHasSceneReferencesError");
  var ResourceHasSceneReferencesError = _ResourceHasSceneReferencesError;
  var _ResourceSceneReferenceUnderflowError = class _ResourceSceneReferenceUnderflowError extends RenderingError {
    /** @param resourceName - 稳定的资源诊断类型。 */
    constructor(resourceName) {
      super(
        `${resourceName} cannot release a Scene reference because its Scene reference count is already zero`,
        "RESOURCE_SCENE_REFERENCE_UNDERFLOW",
        {
          resourceName,
          sceneReferenceCount: 0
        }
      );
    }
  };
  __name(_ResourceSceneReferenceUnderflowError, "ResourceSceneReferenceUnderflowError");
  var ResourceSceneReferenceUnderflowError = _ResourceSceneReferenceUnderflowError;
  var _SceneGraphCycleError = class _SceneGraphCycleError extends RenderingError {
    /**
     * @param parentLabel - 尝试收养子节点的父节点诊断标签。
     * @param childLabel - 会形成循环的子节点诊断标签。
     */
    constructor(parentLabel, childLabel) {
      super(
        `Adding ${childLabel} to ${parentLabel} would create a scene graph cycle`,
        "SCENE_GRAPH_CYCLE",
        {
          parentLabel,
          childLabel
        }
      );
    }
  };
  __name(_SceneGraphCycleError, "SceneGraphCycleError");
  var SceneGraphCycleError = _SceneGraphCycleError;
  var _DuplicateSceneNodeError = class _DuplicateSceneNodeError extends RenderingError {
    /** @param nodeLabel - 重复节点的可读调试标签。 */
    constructor(nodeLabel) {
      super(
        `Scene node ${nodeLabel} appears more than once in the same operation`,
        "DUPLICATE_SCENE_NODE",
        {
          nodeLabel
        }
      );
    }
  };
  __name(_DuplicateSceneNodeError, "DuplicateSceneNodeError");
  var DuplicateSceneNodeError = _DuplicateSceneNodeError;
  var _InvalidVertexAttributeError = class _InvalidVertexAttributeError extends RenderingError {
    /**
     * @param attributeName - 出错属性的语义名称，例如 `position`。
     * @param reason - 具体违反的输入约束。
     */
    constructor(attributeName, reason) {
      super(`Vertex attribute ${attributeName} is invalid: ${reason}`, "INVALID_VERTEX_ATTRIBUTE", {
        attributeName,
        reason
      });
    }
  };
  __name(_InvalidVertexAttributeError, "InvalidVertexAttributeError");
  var InvalidVertexAttributeError = _InvalidVertexAttributeError;
  var _InvalidGeometryError = class _InvalidGeometryError extends RenderingError {
    /**
     * @param reason - Geometry 无效的主要原因。
     * @param details - 与该原因相关的额外计数、属性名或索引上下文。
     */
    constructor(reason, details = {}) {
      super(`Geometry is invalid: ${reason}`, "INVALID_GEOMETRY", {
        ...details,
        reason
      });
    }
  };
  __name(_InvalidGeometryError, "InvalidGeometryError");
  var InvalidGeometryError = _InvalidGeometryError;
  var _WebGLResourceCreationError = class _WebGLResourceCreationError extends RenderingError {
    /**
     * @param resourceKind - 创建失败的 GPU 对象种类，例如 `buffer` 或 `texture`。
     * @param label - 调用位置提供的稳定资源标签。
     */
    constructor(resourceKind, label2) {
      super(`WebGL failed to create ${resourceKind} for ${label2}`, "WEBGL_RESOURCE_CREATION_FAILED", {
        resourceKind,
        label: label2
      });
    }
  };
  __name(_WebGLResourceCreationError, "WebGLResourceCreationError");
  var WebGLResourceCreationError = _WebGLResourceCreationError;
  var _WebGLContextCreationError = class _WebGLContextCreationError extends RenderingError {
    /** @param canvasLabel - 请求 context 的 canvas 诊断标签。 */
    constructor(canvasLabel) {
      super(`WebGL1 context creation failed for ${canvasLabel}`, "WEBGL_CONTEXT_CREATION_FAILED", {
        canvasLabel
      });
    }
  };
  __name(_WebGLContextCreationError, "WebGLContextCreationError");
  var WebGLContextCreationError = _WebGLContextCreationError;
  var _WebGLContextLostError = class _WebGLContextLostError extends RenderingError {
    /** @param operation - 被 context-lost 状态阻止的操作名称。 */
    constructor(operation) {
      super(`Cannot perform ${operation} while the WebGL context is lost`, "WEBGL_CONTEXT_LOST", {
        operation
      });
    }
  };
  __name(_WebGLContextLostError, "WebGLContextLostError");
  var WebGLContextLostError = _WebGLContextLostError;
  var _WebGLBackendDisposedError = class _WebGLBackendDisposedError extends RenderingError {
    /** @param operation - backend 释放后被调用的操作名称。 */
    constructor(operation) {
      super(
        `Cannot perform ${operation} after the WebGL backend has been disposed`,
        "WEBGL_BACKEND_DISPOSED",
        {
          operation
        }
      );
    }
  };
  __name(_WebGLBackendDisposedError, "WebGLBackendDisposedError");
  var WebGLBackendDisposedError = _WebGLBackendDisposedError;
  var _ShaderCompilationError = class _ShaderCompilationError extends RenderingError {
    /**
     * @param shaderName - 逻辑 ShaderModule 的稳定名称。
     * @param stage - 编译失败的 vertex 或 fragment 阶段。
     * @param infoLog - WebGL 驱动返回的编译日志。
     */
    constructor(shaderName, stage, infoLog) {
      super(
        `${stage} shader compilation failed for ${shaderName}: ${infoLog}`,
        "SHADER_COMPILATION_FAILED",
        {
          shaderName,
          stage,
          infoLog
        }
      );
    }
  };
  __name(_ShaderCompilationError, "ShaderCompilationError");
  var ShaderCompilationError = _ShaderCompilationError;
  var _ProgramLinkError = class _ProgramLinkError extends RenderingError {
    /**
     * @param shaderName - 尝试链接的逻辑 ShaderModule 名称。
     * @param infoLog - WebGL 驱动返回的链接日志。
     */
    constructor(shaderName, infoLog) {
      super(`Program link failed for ${shaderName}: ${infoLog}`, "PROGRAM_LINK_FAILED", {
        shaderName,
        infoLog
      });
    }
  };
  __name(_ProgramLinkError, "ProgramLinkError");
  var ProgramLinkError = _ProgramLinkError;
  var _UnsupportedShaderLanguageError = class _UnsupportedShaderLanguageError extends RenderingError {
    /**
     * @param shaderName - 被拒绝的 ShaderModule 名称。
     * @param language - 该 ShaderModule 选择的 shader language。
     * @param backendKind - 不支持该 language 的 backend 种类。
     */
    constructor(shaderName, language, backendKind) {
      super(
        `Shader ${shaderName} uses ${language}, which the ${backendKind} backend does not support`,
        "UNSUPPORTED_SHADER_LANGUAGE",
        {
          shaderName,
          language,
          backendKind
        }
      );
      this.name = "UnsupportedShaderLanguageError";
    }
  };
  __name(_UnsupportedShaderLanguageError, "UnsupportedShaderLanguageError");
  var UnsupportedShaderLanguageError = _UnsupportedShaderLanguageError;
  var _UnsupportedIndexTypeError = class _UnsupportedIndexTypeError extends RenderingError {
    /**
     * @param indexType - 原始索引数据类型。
     * @param reason - 扩展缺失或数值范围不允许降级等具体原因。
     */
    constructor(indexType, reason) {
      super(`Index type ${indexType} is unsupported: ${reason}`, "UNSUPPORTED_INDEX_TYPE", {
        indexType,
        reason
      });
    }
  };
  __name(_UnsupportedIndexTypeError, "UnsupportedIndexTypeError");
  var UnsupportedIndexTypeError = _UnsupportedIndexTypeError;
  var _InvalidTextureSourceError = class _InvalidTextureSourceError extends RenderingError {
    /**
     * @param textureLabel - 纹理逻辑标签。
     * @param reason - 尺寸、加载状态或数据形状等失败原因。
     */
    constructor(textureLabel, reason) {
      super(`Texture source ${textureLabel} is invalid: ${reason}`, "INVALID_TEXTURE_SOURCE", {
        textureLabel,
        reason
      });
    }
  };
  __name(_InvalidTextureSourceError, "InvalidTextureSourceError");
  var InvalidTextureSourceError = _InvalidTextureSourceError;
  var _IncompleteFramebufferError = class _IncompleteFramebufferError extends RenderingError {
    /**
     * @param status - `gl.checkFramebufferStatus()` 返回的原始枚举值。
     * @param targetLabel - 对应逻辑 RenderTarget 的诊断标签。
     */
    constructor(status, targetLabel) {
      super(
        `Framebuffer ${targetLabel} is incomplete with status ${status}`,
        "INCOMPLETE_FRAMEBUFFER",
        {
          status,
          targetLabel
        }
      );
    }
  };
  __name(_IncompleteFramebufferError, "IncompleteFramebufferError");
  var IncompleteFramebufferError = _IncompleteFramebufferError;
  var _RenderTargetUnavailableError = class _RenderTargetUnavailableError extends RenderingError {
    /**
     * @param targetLabel - 不可用目标的稳定标签。
     * @param reason - disposed、attachment 缺失等具体原因。
     */
    constructor(targetLabel, reason) {
      super(`Render target ${targetLabel} is unavailable: ${reason}`, "RENDER_TARGET_UNAVAILABLE", {
        targetLabel,
        reason
      });
    }
  };
  __name(_RenderTargetUnavailableError, "RenderTargetUnavailableError");
  var RenderTargetUnavailableError = _RenderTargetUnavailableError;
  var _UnsupportedRenderFeatureError = class _UnsupportedRenderFeatureError extends RenderingError {
    /**
     * @param feature - 不受支持的逻辑功能名称。
     * @param reason - 缺少扩展或能力限制等具体原因。
     */
    constructor(feature, reason) {
      super(`Render feature ${feature} is unsupported: ${reason}`, "UNSUPPORTED_RENDER_FEATURE", {
        feature,
        reason
      });
    }
  };
  __name(_UnsupportedRenderFeatureError, "UnsupportedRenderFeatureError");
  var UnsupportedRenderFeatureError = _UnsupportedRenderFeatureError;

  // src/rendering/core/errors/InvalidShaderModuleError.ts
  var _InvalidShaderModuleError = class _InvalidShaderModuleError extends RenderingError {
    /**
     * @param shaderName - ShaderModule 的稳定诊断名称。
     * @param reason - 违反的具体构造约束。
     * @param details - 可选的额外结构化诊断信息。
     */
    constructor(shaderName, reason, details = {}) {
      super(`Shader module ${shaderName} is invalid: ${reason}`, "INVALID_SHADER_MODULE", {
        ...details,
        shaderName,
        reason
      });
      this.name = "InvalidShaderModuleError";
    }
  };
  __name(_InvalidShaderModuleError, "InvalidShaderModuleError");
  var InvalidShaderModuleError = _InvalidShaderModuleError;

  // src/rendering/core/errors/InvalidCubeTextureError.ts
  var _InvalidCubeTextureError = class _InvalidCubeTextureError extends RenderingError {
    /**
     * @param textureLabel - CubeTexture 的稳定诊断标签。
     * @param reason - 违反的具体构造约束。
     * @param details - 可选的额外结构化诊断信息。
     */
    constructor(textureLabel, reason, details = {}) {
      super(`Cube texture ${textureLabel} is invalid: ${reason}`, "INVALID_CUBE_TEXTURE", {
        ...details,
        textureLabel,
        reason
      });
    }
  };
  __name(_InvalidCubeTextureError, "InvalidCubeTextureError");
  var InvalidCubeTextureError = _InvalidCubeTextureError;

  // src/rendering/core/errors/InvalidMaterialError.ts
  var _InvalidMaterialError = class _InvalidMaterialError extends RenderingError {
    /**
     * @param fieldName - 错误字段，例如 state.depthWrite 或 parameters.uRoughness。
     * @param reason - 具体违反了什么约束。
     * @param details - 附加诊断；不能覆盖 fieldName 和 reason。
     */
    constructor(fieldName, reason, details = {}) {
      super("Material field " + fieldName + " is invalid: " + reason, "INVALID_MATERIAL", {
        ...details,
        fieldName,
        reason
      });
      this.name = "InvalidMaterialError";
    }
  };
  __name(_InvalidMaterialError, "InvalidMaterialError");
  var InvalidMaterialError = _InvalidMaterialError;

  // src/rendering/core/errors/InvalidMeshError.ts
  var _InvalidMeshError = class _InvalidMeshError extends RenderingError {
    /** @param fieldName - 不合法的资源字段。 */
    constructor(fieldName) {
      super("Mesh " + fieldName + " must reference the corresponding resource type", "INVALID_MESH", {
        fieldName
      });
      this.name = "InvalidMeshError";
    }
  };
  __name(_InvalidMeshError, "InvalidMeshError");
  var InvalidMeshError = _InvalidMeshError;

  // src/rendering/core/errors/InvalidPerspectiveCameraError.ts
  var _InvalidPerspectiveCameraError = class _InvalidPerspectiveCameraError extends RenderingError {
    /**
     * @param fieldName - 无效字段，或表示计算结果的 projectionMatrix。
     * @param reason - 具体违反的约束。
     * @param details - 原始参数等诊断现场；不能覆盖 fieldName 和 reason。
     */
    constructor(fieldName, reason, details = {}) {
      super(
        "PerspectiveCamera " + fieldName + " is invalid: " + reason,
        "INVALID_PERSPECTIVE_CAMERA",
        {
          ...details,
          fieldName,
          reason
        }
      );
      this.name = "InvalidPerspectiveCameraError";
    }
  };
  __name(_InvalidPerspectiveCameraError, "InvalidPerspectiveCameraError");
  var InvalidPerspectiveCameraError = _InvalidPerspectiveCameraError;

  // src/rendering/core/errors/InvalidRenderTargetError.ts
  var _InvalidRenderTargetError = class _InvalidRenderTargetError extends RenderingError {
    /**
     * @param fieldName - 出错字段，例如 width 或 colors[0].format。
     * @param reason - 违反的具体 CPU 契约。
     * @param details - 诊断现场；不能覆盖 fieldName/reason。
     */
    constructor(fieldName, reason, details = {}) {
      super("RenderTarget " + fieldName + " is invalid: " + reason, "INVALID_RENDER_TARGET", {
        ...details,
        fieldName,
        reason
      });
      this.name = "InvalidRenderTargetError";
    }
  };
  __name(_InvalidRenderTargetError, "InvalidRenderTargetError");
  var InvalidRenderTargetError = _InvalidRenderTargetError;

  // src/rendering/core/errors/WebGLOperationError.ts
  var _WebGLOperationError = class _WebGLOperationError extends RenderingError {
    constructor(operation, label2, reason) {
      super(`WebGL ${operation} failed for ${label2}: ${reason}`, "WEBGL_OPERATION_FAILED", {
        operation,
        label: label2,
        reason
      });
    }
  };
  __name(_WebGLOperationError, "WebGLOperationError");
  var WebGLOperationError = _WebGLOperationError;

  // src/rendering/core/errors/RenderExecutionError.ts
  var _RenderExecutionError = class _RenderExecutionError extends RenderingError {
    constructor(owner, operation, reason) {
      super(owner + "." + operation + ": " + reason, "INVALID_RENDER_EXECUTION", {
        owner,
        operation,
        reason
      });
      this.name = "RenderExecutionError";
    }
  };
  __name(_RenderExecutionError, "RenderExecutionError");
  var RenderExecutionError = _RenderExecutionError;

  // src/rendering/Renderer.ts
  var _Renderer = class _Renderer {
    constructor(backend, pipeline, renderListBuilder) {
      __publicField(this, "backend");
      __publicField(this, "pipeline");
      __publicField(this, "renderListBuilder");
      __publicField(this, "state", "active");
      __publicField(this, "busy", false);
      this.backend = backend;
      this.pipeline = pipeline;
      this.renderListBuilder = renderListBuilder;
    }
    /**
     * @remarks
     * [DESIGN-WEIGHT:3][renderer-one-frame-extraction]
     *
     * ready=false 时不读取场景；否则提取一次，
     * 并向全部 Pass 传入同一个 context。
     *
     * FrameSnapshot 显式复制六个标量，
     * 防止外部修改原对象影响后续 Pass。
     */
    render(view) {
      if (this.state !== "active") {
        throw new ResourceDisposedError("Renderer");
      }
      this.assertNotBusy("render");
      if (!this.backend.ready) return;
      this.busy = true;
      try {
        const source = view.frame;
        const frame = Object.freeze({
          frameNumber: source.frameNumber,
          timeSeconds: source.timeSeconds,
          deltaSeconds: source.deltaSeconds,
          drawingBufferWidth: source.drawingBufferWidth,
          drawingBufferHeight: source.drawingBufferHeight,
          pixelRatio: source.pixelRatio
        });
        const { renderList, viewState } = this.renderListBuilder.build(view);
        const context = Object.freeze({
          frame,
          view: viewState,
          renderList,
          backend: this.backend
        });
        this.pipeline.execute(context);
      } finally {
        this.busy = false;
      }
    }
    /**
     * 先完成 Pipeline 清理，才允许释放 Backend。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-dispose-retry-order]
     *
     * 任一步失败都会停在 closing，
     * 保留依赖并允许显式再次 dispose。
     *
     * Pipeline 已成功释放时其 dispose 幂等，
     * 因此 Backend 失败后的重试不会重复释放 Pass。
     */
    dispose() {
      if (this.state === "disposed") return;
      this.assertNotBusy("dispose");
      this.state = "closing";
      this.busy = true;
      try {
        this.pipeline.dispose();
        this.backend.dispose();
        this.state = "disposed";
      } finally {
        this.busy = false;
      }
    }
    /** 防止 Pass 在 render 内再次 render，或提前拆除当前正在使用的依赖。 */
    assertNotBusy(operation) {
      if (this.busy) throw new RenderExecutionError("Renderer", operation, "operation in progress");
    }
  };
  __name(_Renderer, "Renderer");
  var Renderer = _Renderer;

  // node_modules/gl-matrix/esm/common.js
  var EPSILON = 1e-6;
  var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
  var RANDOM = Math.random;
  var degree = Math.PI / 180;
  if (!Math.hypot) Math.hypot = function() {
    var y = 0, i = arguments.length;
    while (i--) {
      y += arguments[i] * arguments[i];
    }
    return Math.sqrt(y);
  };

  // node_modules/gl-matrix/esm/mat3.js
  var mat3_exports = {};
  __export(mat3_exports, {
    add: () => add,
    adjoint: () => adjoint,
    clone: () => clone,
    copy: () => copy,
    create: () => create,
    determinant: () => determinant,
    equals: () => equals,
    exactEquals: () => exactEquals,
    frob: () => frob,
    fromMat2d: () => fromMat2d,
    fromMat4: () => fromMat4,
    fromQuat: () => fromQuat,
    fromRotation: () => fromRotation,
    fromScaling: () => fromScaling,
    fromTranslation: () => fromTranslation,
    fromValues: () => fromValues,
    identity: () => identity,
    invert: () => invert,
    mul: () => mul,
    multiply: () => multiply,
    multiplyScalar: () => multiplyScalar,
    multiplyScalarAndAdd: () => multiplyScalarAndAdd,
    normalFromMat4: () => normalFromMat4,
    projection: () => projection,
    rotate: () => rotate,
    scale: () => scale,
    set: () => set,
    str: () => str,
    sub: () => sub,
    subtract: () => subtract,
    translate: () => translate,
    transpose: () => transpose
  });
  function create() {
    var out = new ARRAY_TYPE(9);
    if (ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[5] = 0;
      out[6] = 0;
      out[7] = 0;
    }
    out[0] = 1;
    out[4] = 1;
    out[8] = 1;
    return out;
  }
  __name(create, "create");
  function fromMat4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
  }
  __name(fromMat4, "fromMat4");
  function clone(a) {
    var out = new ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  __name(clone, "clone");
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  __name(copy, "copy");
  function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    var out = new ARRAY_TYPE(9);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
  }
  __name(fromValues, "fromValues");
  function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
  }
  __name(set, "set");
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  __name(identity, "identity");
  function transpose(out, a) {
    if (out === a) {
      var a01 = a[1], a02 = a[2], a12 = a[5];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a01;
      out[5] = a[7];
      out[6] = a02;
      out[7] = a12;
    } else {
      out[0] = a[0];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a[1];
      out[4] = a[4];
      out[5] = a[7];
      out[6] = a[2];
      out[7] = a[5];
      out[8] = a[8];
    }
    return out;
  }
  __name(transpose, "transpose");
  function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    var b01 = a22 * a11 - a12 * a21;
    var b11 = -a22 * a10 + a12 * a20;
    var b21 = a21 * a10 - a11 * a20;
    var det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }
  __name(invert, "invert");
  function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    out[0] = a11 * a22 - a12 * a21;
    out[1] = a02 * a21 - a01 * a22;
    out[2] = a01 * a12 - a02 * a11;
    out[3] = a12 * a20 - a10 * a22;
    out[4] = a00 * a22 - a02 * a20;
    out[5] = a02 * a10 - a00 * a12;
    out[6] = a10 * a21 - a11 * a20;
    out[7] = a01 * a20 - a00 * a21;
    out[8] = a00 * a11 - a01 * a10;
    return out;
  }
  __name(adjoint, "adjoint");
  function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
  }
  __name(determinant, "determinant");
  function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    var b00 = b[0], b01 = b[1], b02 = b[2];
    var b10 = b[3], b11 = b[4], b12 = b[5];
    var b20 = b[6], b21 = b[7], b22 = b[8];
    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;
    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;
    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
  }
  __name(multiply, "multiply");
  function translate(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], x = v[0], y = v[1];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a10;
    out[4] = a11;
    out[5] = a12;
    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
  }
  __name(translate, "translate");
  function rotate(out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;
    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;
    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
  }
  __name(rotate, "rotate");
  function scale(out, a, v) {
    var x = v[0], y = v[1];
    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];
    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  __name(scale, "scale");
  function fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = v[0];
    out[7] = v[1];
    out[8] = 1;
    return out;
  }
  __name(fromTranslation, "fromTranslation");
  function fromRotation(out, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = -s;
    out[4] = c;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  __name(fromRotation, "fromRotation");
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = v[1];
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  __name(fromScaling, "fromScaling");
  function fromMat2d(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;
    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;
    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
  }
  __name(fromMat2d, "fromMat2d");
  function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var yx = y * x2;
    var yy = y * y2;
    var zx = z * x2;
    var zy = z * y2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;
    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;
    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;
    return out;
  }
  __name(fromQuat, "fromQuat");
  function normalFromMat4(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return out;
  }
  __name(normalFromMat4, "normalFromMat4");
  function projection(out, width, height) {
    out[0] = 2 / width;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = -2 / height;
    out[5] = 0;
    out[6] = -1;
    out[7] = 1;
    out[8] = 1;
    return out;
  }
  __name(projection, "projection");
  function str(a) {
    return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
  }
  __name(str, "str");
  function frob(a) {
    return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
  }
  __name(frob, "frob");
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    return out;
  }
  __name(add, "add");
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    return out;
  }
  __name(subtract, "subtract");
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    return out;
  }
  __name(multiplyScalar, "multiplyScalar");
  function multiplyScalarAndAdd(out, a, b, scale6) {
    out[0] = a[0] + b[0] * scale6;
    out[1] = a[1] + b[1] * scale6;
    out[2] = a[2] + b[2] * scale6;
    out[3] = a[3] + b[3] * scale6;
    out[4] = a[4] + b[4] * scale6;
    out[5] = a[5] + b[5] * scale6;
    out[6] = a[6] + b[6] * scale6;
    out[7] = a[7] + b[7] * scale6;
    out[8] = a[8] + b[8] * scale6;
    return out;
  }
  __name(multiplyScalarAndAdd, "multiplyScalarAndAdd");
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
  }
  __name(exactEquals, "exactEquals");
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8));
  }
  __name(equals, "equals");
  var mul = multiply;
  var sub = subtract;

  // node_modules/gl-matrix/esm/mat4.js
  var mat4_exports = {};
  __export(mat4_exports, {
    add: () => add2,
    adjoint: () => adjoint2,
    clone: () => clone2,
    copy: () => copy2,
    create: () => create2,
    determinant: () => determinant2,
    equals: () => equals2,
    exactEquals: () => exactEquals2,
    frob: () => frob2,
    fromQuat: () => fromQuat3,
    fromQuat2: () => fromQuat2,
    fromRotation: () => fromRotation2,
    fromRotationTranslation: () => fromRotationTranslation,
    fromRotationTranslationScale: () => fromRotationTranslationScale,
    fromRotationTranslationScaleOrigin: () => fromRotationTranslationScaleOrigin,
    fromScaling: () => fromScaling2,
    fromTranslation: () => fromTranslation2,
    fromValues: () => fromValues2,
    fromXRotation: () => fromXRotation,
    fromYRotation: () => fromYRotation,
    fromZRotation: () => fromZRotation,
    frustum: () => frustum,
    getRotation: () => getRotation,
    getScaling: () => getScaling,
    getTranslation: () => getTranslation,
    identity: () => identity2,
    invert: () => invert2,
    lookAt: () => lookAt,
    mul: () => mul2,
    multiply: () => multiply2,
    multiplyScalar: () => multiplyScalar2,
    multiplyScalarAndAdd: () => multiplyScalarAndAdd2,
    ortho: () => ortho,
    orthoNO: () => orthoNO,
    orthoZO: () => orthoZO,
    perspective: () => perspective,
    perspectiveFromFieldOfView: () => perspectiveFromFieldOfView,
    perspectiveNO: () => perspectiveNO,
    perspectiveZO: () => perspectiveZO,
    rotate: () => rotate2,
    rotateX: () => rotateX,
    rotateY: () => rotateY,
    rotateZ: () => rotateZ,
    scale: () => scale2,
    set: () => set2,
    str: () => str2,
    sub: () => sub2,
    subtract: () => subtract2,
    targetTo: () => targetTo,
    translate: () => translate2,
    transpose: () => transpose2
  });
  function create2() {
    var out = new ARRAY_TYPE(16);
    if (ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = 0;
      out[12] = 0;
      out[13] = 0;
      out[14] = 0;
    }
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  }
  __name(create2, "create");
  function clone2(a) {
    var out = new ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(clone2, "clone");
  function copy2(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(copy2, "copy");
  function fromValues2(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    var out = new ARRAY_TYPE(16);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  __name(fromValues2, "fromValues");
  function set2(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  __name(set2, "set");
  function identity2(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(identity2, "identity");
  function transpose2(out, a) {
    if (out === a) {
      var a01 = a[1], a02 = a[2], a03 = a[3];
      var a12 = a[6], a13 = a[7];
      var a23 = a[11];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;
    } else {
      out[0] = a[0];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a[1];
      out[5] = a[5];
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a[2];
      out[9] = a[6];
      out[10] = a[10];
      out[11] = a[14];
      out[12] = a[3];
      out[13] = a[7];
      out[14] = a[11];
      out[15] = a[15];
    }
    return out;
  }
  __name(transpose2, "transpose");
  function invert2(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  __name(invert2, "invert");
  function adjoint2(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
    out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
    out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
    out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
    out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
    out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
    return out;
  }
  __name(adjoint2, "adjoint");
  function determinant2(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  }
  __name(determinant2, "determinant");
  function multiply2(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  __name(multiply2, "multiply");
  function translate2(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];
      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];
      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  __name(translate2, "translate");
  function scale2(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(scale2, "scale");
  function rotate2(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len3 = Math.hypot(x, y, z);
    var s, c, t;
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    var b00, b01, b02;
    var b10, b11, b12;
    var b20, b21, b22;
    if (len3 < EPSILON) {
      return null;
    }
    len3 = 1 / len3;
    x *= len3;
    y *= len3;
    z *= len3;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    return out;
  }
  __name(rotate2, "rotate");
  function rotateX(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }
  __name(rotateX, "rotateX");
  function rotateY(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }
  __name(rotateY, "rotateY");
  function rotateZ(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    if (a !== out) {
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }
  __name(rotateZ, "rotateZ");
  function fromTranslation2(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromTranslation2, "fromTranslation");
  function fromScaling2(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromScaling2, "fromScaling");
  function fromRotation2(out, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len3 = Math.hypot(x, y, z);
    var s, c, t;
    if (len3 < EPSILON) {
      return null;
    }
    len3 = 1 / len3;
    x *= len3;
    y *= len3;
    z *= len3;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromRotation2, "fromRotation");
  function fromXRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromXRotation, "fromXRotation");
  function fromYRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromYRotation, "fromYRotation");
  function fromZRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromZRotation, "fromZRotation");
  function fromRotationTranslation(out, q, v) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslation, "fromRotationTranslation");
  function fromQuat2(out, a) {
    var translation = new ARRAY_TYPE(3);
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7];
    var magnitude = bx * bx + by * by + bz * bz + bw * bw;
    if (magnitude > 0) {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
    } else {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    }
    fromRotationTranslation(out, a, translation);
    return out;
  }
  __name(fromQuat2, "fromQuat2");
  function getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  __name(getTranslation, "getTranslation");
  function getScaling(out, mat) {
    var m11 = mat[0];
    var m12 = mat[1];
    var m13 = mat[2];
    var m21 = mat[4];
    var m22 = mat[5];
    var m23 = mat[6];
    var m31 = mat[8];
    var m32 = mat[9];
    var m33 = mat[10];
    out[0] = Math.hypot(m11, m12, m13);
    out[1] = Math.hypot(m21, m22, m23);
    out[2] = Math.hypot(m31, m32, m33);
    return out;
  }
  __name(getScaling, "getScaling");
  function getRotation(out, mat) {
    var scaling = new ARRAY_TYPE(3);
    getScaling(scaling, mat);
    var is1 = 1 / scaling[0];
    var is2 = 1 / scaling[1];
    var is3 = 1 / scaling[2];
    var sm11 = mat[0] * is1;
    var sm12 = mat[1] * is2;
    var sm13 = mat[2] * is3;
    var sm21 = mat[4] * is1;
    var sm22 = mat[5] * is2;
    var sm23 = mat[6] * is3;
    var sm31 = mat[8] * is1;
    var sm32 = mat[9] * is2;
    var sm33 = mat[10] * is3;
    var trace = sm11 + sm22 + sm33;
    var S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out[3] = 0.25 * S;
      out[0] = (sm23 - sm32) / S;
      out[1] = (sm31 - sm13) / S;
      out[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out[3] = (sm23 - sm32) / S;
      out[0] = 0.25 * S;
      out[1] = (sm12 + sm21) / S;
      out[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out[3] = (sm31 - sm13) / S;
      out[0] = (sm12 + sm21) / S;
      out[1] = 0.25 * S;
      out[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out[3] = (sm12 - sm21) / S;
      out[0] = (sm31 + sm13) / S;
      out[1] = (sm23 + sm32) / S;
      out[2] = 0.25 * S;
    }
    return out;
  }
  __name(getRotation, "getRotation");
  function fromRotationTranslationScale(out, q, v, s) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslationScale, "fromRotationTranslationScale");
  function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    var ox = o[0];
    var oy = o[1];
    var oz = o[2];
    var out0 = (1 - (yy + zz)) * sx;
    var out1 = (xy + wz) * sx;
    var out2 = (xz - wy) * sx;
    var out4 = (xy - wz) * sy;
    var out5 = (1 - (xx + zz)) * sy;
    var out6 = (yz + wx) * sy;
    var out8 = (xz + wy) * sz;
    var out9 = (yz - wx) * sz;
    var out10 = (1 - (xx + yy)) * sz;
    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslationScaleOrigin, "fromRotationTranslationScaleOrigin");
  function fromQuat3(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var yx = y * x2;
    var yy = y * y2;
    var zx = z * x2;
    var zy = z * y2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromQuat3, "fromQuat");
  function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left);
    var tb = 1 / (top - bottom);
    var nf = 1 / (near - far);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near * 2 * nf;
    out[15] = 0;
    return out;
  }
  __name(frustum, "frustum");
  function perspectiveNO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf;
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  __name(perspectiveNO, "perspectiveNO");
  var perspective = perspectiveNO;
  function perspectiveZO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf;
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  __name(perspectiveZO, "perspectiveZO");
  function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI / 180);
    var downTan = Math.tan(fov.downDegrees * Math.PI / 180);
    var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
    var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
    var xScale = 2 / (leftTan + rightTan);
    var yScale = 2 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = yScale;
    out[6] = 0;
    out[7] = 0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near / (near - far);
    out[15] = 0;
    return out;
  }
  __name(perspectiveFromFieldOfView, "perspectiveFromFieldOfView");
  function orthoNO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  __name(orthoNO, "orthoNO");
  var ortho = orthoNO;
  function orthoZO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
  }
  __name(orthoZO, "orthoZO");
  function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len3;
    var eyex = eye[0];
    var eyey = eye[1];
    var eyez = eye[2];
    var upx = up[0];
    var upy = up[1];
    var upz = up[2];
    var centerx = center[0];
    var centery = center[1];
    var centerz = center[2];
    if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
      return identity2(out);
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len3 = 1 / Math.hypot(z0, z1, z2);
    z0 *= len3;
    z1 *= len3;
    z2 *= len3;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len3 = Math.hypot(x0, x1, x2);
    if (!len3) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len3 = 1 / len3;
      x0 *= len3;
      x1 *= len3;
      x2 *= len3;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len3 = Math.hypot(y0, y1, y2);
    if (!len3) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len3 = 1 / len3;
      y0 *= len3;
      y1 *= len3;
      y2 *= len3;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  __name(lookAt, "lookAt");
  function targetTo(out, eye, target2, up) {
    var eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2];
    var z0 = eyex - target2[0], z1 = eyey - target2[1], z2 = eyez - target2[2];
    var len3 = z0 * z0 + z1 * z1 + z2 * z2;
    if (len3 > 0) {
      len3 = 1 / Math.sqrt(len3);
      z0 *= len3;
      z1 *= len3;
      z2 *= len3;
    }
    var x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
    len3 = x0 * x0 + x1 * x1 + x2 * x2;
    if (len3 > 0) {
      len3 = 1 / Math.sqrt(len3);
      x0 *= len3;
      x1 *= len3;
      x2 *= len3;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  __name(targetTo, "targetTo");
  function str2(a) {
    return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
  }
  __name(str2, "str");
  function frob2(a) {
    return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
  }
  __name(frob2, "frob");
  function add2(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
  }
  __name(add2, "add");
  function subtract2(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
  }
  __name(subtract2, "subtract");
  function multiplyScalar2(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
  }
  __name(multiplyScalar2, "multiplyScalar");
  function multiplyScalarAndAdd2(out, a, b, scale6) {
    out[0] = a[0] + b[0] * scale6;
    out[1] = a[1] + b[1] * scale6;
    out[2] = a[2] + b[2] * scale6;
    out[3] = a[3] + b[3] * scale6;
    out[4] = a[4] + b[4] * scale6;
    out[5] = a[5] + b[5] * scale6;
    out[6] = a[6] + b[6] * scale6;
    out[7] = a[7] + b[7] * scale6;
    out[8] = a[8] + b[8] * scale6;
    out[9] = a[9] + b[9] * scale6;
    out[10] = a[10] + b[10] * scale6;
    out[11] = a[11] + b[11] * scale6;
    out[12] = a[12] + b[12] * scale6;
    out[13] = a[13] + b[13] * scale6;
    out[14] = a[14] + b[14] * scale6;
    out[15] = a[15] + b[15] * scale6;
    return out;
  }
  __name(multiplyScalarAndAdd2, "multiplyScalarAndAdd");
  function exactEquals2(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  }
  __name(exactEquals2, "exactEquals");
  function equals2(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
    var a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
    var a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    var b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    var b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    var b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
  }
  __name(equals2, "equals");
  var mul2 = multiply2;
  var sub2 = subtract2;

  // node_modules/gl-matrix/esm/quat.js
  var quat_exports = {};
  __export(quat_exports, {
    add: () => add5,
    calculateW: () => calculateW,
    clone: () => clone5,
    conjugate: () => conjugate,
    copy: () => copy5,
    create: () => create5,
    dot: () => dot3,
    equals: () => equals5,
    exactEquals: () => exactEquals5,
    exp: () => exp,
    fromEuler: () => fromEuler,
    fromMat3: () => fromMat3,
    fromValues: () => fromValues5,
    getAngle: () => getAngle,
    getAxisAngle: () => getAxisAngle,
    identity: () => identity3,
    invert: () => invert3,
    len: () => len2,
    length: () => length3,
    lerp: () => lerp3,
    ln: () => ln,
    mul: () => mul4,
    multiply: () => multiply4,
    normalize: () => normalize3,
    pow: () => pow,
    random: () => random2,
    rotateX: () => rotateX3,
    rotateY: () => rotateY3,
    rotateZ: () => rotateZ3,
    rotationTo: () => rotationTo,
    scale: () => scale5,
    set: () => set5,
    setAxes: () => setAxes,
    setAxisAngle: () => setAxisAngle,
    slerp: () => slerp,
    sqlerp: () => sqlerp,
    sqrLen: () => sqrLen2,
    squaredLength: () => squaredLength3,
    str: () => str4
  });

  // node_modules/gl-matrix/esm/vec3.js
  var vec3_exports = {};
  __export(vec3_exports, {
    add: () => add3,
    angle: () => angle,
    bezier: () => bezier,
    ceil: () => ceil,
    clone: () => clone3,
    copy: () => copy3,
    create: () => create3,
    cross: () => cross,
    dist: () => dist,
    distance: () => distance,
    div: () => div,
    divide: () => divide,
    dot: () => dot,
    equals: () => equals3,
    exactEquals: () => exactEquals3,
    floor: () => floor,
    forEach: () => forEach,
    fromValues: () => fromValues3,
    hermite: () => hermite,
    inverse: () => inverse,
    len: () => len,
    length: () => length,
    lerp: () => lerp,
    max: () => max,
    min: () => min,
    mul: () => mul3,
    multiply: () => multiply3,
    negate: () => negate,
    normalize: () => normalize,
    random: () => random,
    rotateX: () => rotateX2,
    rotateY: () => rotateY2,
    rotateZ: () => rotateZ2,
    round: () => round,
    scale: () => scale3,
    scaleAndAdd: () => scaleAndAdd,
    set: () => set3,
    sqrDist: () => sqrDist,
    sqrLen: () => sqrLen,
    squaredDistance: () => squaredDistance,
    squaredLength: () => squaredLength,
    str: () => str3,
    sub: () => sub3,
    subtract: () => subtract3,
    transformMat3: () => transformMat3,
    transformMat4: () => transformMat4,
    transformQuat: () => transformQuat,
    zero: () => zero
  });
  function create3() {
    var out = new ARRAY_TYPE(3);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    return out;
  }
  __name(create3, "create");
  function clone3(a) {
    var out = new ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  __name(clone3, "clone");
  function length(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return Math.hypot(x, y, z);
  }
  __name(length, "length");
  function fromValues3(x, y, z) {
    var out = new ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  __name(fromValues3, "fromValues");
  function copy3(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  __name(copy3, "copy");
  function set3(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  __name(set3, "set");
  function add3(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }
  __name(add3, "add");
  function subtract3(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
  __name(subtract3, "subtract");
  function multiply3(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }
  __name(multiply3, "multiply");
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
  }
  __name(divide, "divide");
  function ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
  }
  __name(ceil, "ceil");
  function floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
  }
  __name(floor, "floor");
  function min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
  }
  __name(min, "min");
  function max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
  }
  __name(max, "max");
  function round(out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    return out;
  }
  __name(round, "round");
  function scale3(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
  }
  __name(scale3, "scale");
  function scaleAndAdd(out, a, b, scale6) {
    out[0] = a[0] + b[0] * scale6;
    out[1] = a[1] + b[1] * scale6;
    out[2] = a[2] + b[2] * scale6;
    return out;
  }
  __name(scaleAndAdd, "scaleAndAdd");
  function distance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return Math.hypot(x, y, z);
  }
  __name(distance, "distance");
  function squaredDistance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return x * x + y * y + z * z;
  }
  __name(squaredDistance, "squaredDistance");
  function squaredLength(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return x * x + y * y + z * z;
  }
  __name(squaredLength, "squaredLength");
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }
  __name(negate, "negate");
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    return out;
  }
  __name(inverse, "inverse");
  function normalize(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var len3 = x * x + y * y + z * z;
    if (len3 > 0) {
      len3 = 1 / Math.sqrt(len3);
    }
    out[0] = a[0] * len3;
    out[1] = a[1] * len3;
    out[2] = a[2] * len3;
    return out;
  }
  __name(normalize, "normalize");
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  __name(dot, "dot");
  function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2];
    var bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  __name(cross, "cross");
  function lerp(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
  }
  __name(lerp, "lerp");
  function hermite(out, a, b, c, d, t) {
    var factorTimes2 = t * t;
    var factor1 = factorTimes2 * (2 * t - 3) + 1;
    var factor2 = factorTimes2 * (t - 2) + t;
    var factor3 = factorTimes2 * (t - 1);
    var factor4 = factorTimes2 * (3 - 2 * t);
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  __name(hermite, "hermite");
  function bezier(out, a, b, c, d, t) {
    var inverseFactor = 1 - t;
    var inverseFactorTimesTwo = inverseFactor * inverseFactor;
    var factorTimes2 = t * t;
    var factor1 = inverseFactorTimesTwo * inverseFactor;
    var factor2 = 3 * t * inverseFactorTimesTwo;
    var factor3 = 3 * factorTimes2 * inverseFactor;
    var factor4 = factorTimes2 * t;
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  __name(bezier, "bezier");
  function random(out, scale6) {
    scale6 = scale6 || 1;
    var r = RANDOM() * 2 * Math.PI;
    var z = RANDOM() * 2 - 1;
    var zScale = Math.sqrt(1 - z * z) * scale6;
    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale6;
    return out;
  }
  __name(random, "random");
  function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
  __name(transformMat4, "transformMat4");
  function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
  }
  __name(transformMat3, "transformMat3");
  function transformQuat(out, a, q) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var x = a[0], y = a[1], z = a[2];
    var uvx = qy * z - qz * y, uvy = qz * x - qx * z, uvz = qx * y - qy * x;
    var uuvx = qy * uvz - qz * uvy, uuvy = qz * uvx - qx * uvz, uuvz = qx * uvy - qy * uvx;
    var w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
  }
  __name(transformQuat, "transformQuat");
  function rotateX2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0];
    r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
    r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateX2, "rotateX");
  function rotateY2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
    r[1] = p[1];
    r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateY2, "rotateY");
  function rotateZ2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
    r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
    r[2] = p[2];
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateZ2, "rotateZ");
  function angle(a, b) {
    var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2], mag1 = Math.sqrt(ax * ax + ay * ay + az * az), mag2 = Math.sqrt(bx * bx + by * by + bz * bz), mag = mag1 * mag2, cosine = mag && dot(a, b) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  __name(angle, "angle");
  function zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  __name(zero, "zero");
  function str3(a) {
    return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
  }
  __name(str3, "str");
  function exactEquals3(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  __name(exactEquals3, "exactEquals");
  function equals3(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2];
    var b0 = b[0], b1 = b[1], b2 = b[2];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2));
  }
  __name(equals3, "equals");
  var sub3 = subtract3;
  var mul3 = multiply3;
  var div = divide;
  var dist = distance;
  var sqrDist = squaredDistance;
  var len = length;
  var sqrLen = squaredLength;
  var forEach = function() {
    var vec = create3();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 3;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset; i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
      }
      return a;
    };
  }();

  // node_modules/gl-matrix/esm/vec4.js
  function create4() {
    var out = new ARRAY_TYPE(4);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
    }
    return out;
  }
  __name(create4, "create");
  function clone4(a) {
    var out = new ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  __name(clone4, "clone");
  function fromValues4(x, y, z, w) {
    var out = new ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  __name(fromValues4, "fromValues");
  function copy4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  __name(copy4, "copy");
  function set4(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  __name(set4, "set");
  function add4(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  __name(add4, "add");
  function scale4(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
  }
  __name(scale4, "scale");
  function length2(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return Math.hypot(x, y, z, w);
  }
  __name(length2, "length");
  function squaredLength2(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return x * x + y * y + z * z + w * w;
  }
  __name(squaredLength2, "squaredLength");
  function normalize2(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    var len3 = x * x + y * y + z * z + w * w;
    if (len3 > 0) {
      len3 = 1 / Math.sqrt(len3);
    }
    out[0] = x * len3;
    out[1] = y * len3;
    out[2] = z * len3;
    out[3] = w * len3;
    return out;
  }
  __name(normalize2, "normalize");
  function dot2(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  __name(dot2, "dot");
  function lerp2(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    var aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
  }
  __name(lerp2, "lerp");
  function exactEquals4(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  __name(exactEquals4, "exactEquals");
  function equals4(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
  __name(equals4, "equals");
  var forEach2 = function() {
    var vec = create4();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 4;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset; i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        vec[3] = a[i + 3];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
        a[i + 3] = vec[3];
      }
      return a;
    };
  }();

  // node_modules/gl-matrix/esm/quat.js
  function create5() {
    var out = new ARRAY_TYPE(4);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    out[3] = 1;
    return out;
  }
  __name(create5, "create");
  function identity3(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  __name(identity3, "identity");
  function setAxisAngle(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }
  __name(setAxisAngle, "setAxisAngle");
  function getAxisAngle(out_axis, q) {
    var rad = Math.acos(q[3]) * 2;
    var s = Math.sin(rad / 2);
    if (s > EPSILON) {
      out_axis[0] = q[0] / s;
      out_axis[1] = q[1] / s;
      out_axis[2] = q[2] / s;
    } else {
      out_axis[0] = 1;
      out_axis[1] = 0;
      out_axis[2] = 0;
    }
    return rad;
  }
  __name(getAxisAngle, "getAxisAngle");
  function getAngle(a, b) {
    var dotproduct = dot3(a, b);
    return Math.acos(2 * dotproduct * dotproduct - 1);
  }
  __name(getAngle, "getAngle");
  function multiply4(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  __name(multiply4, "multiply");
  function rotateX3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
  }
  __name(rotateX3, "rotateX");
  function rotateY3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var by = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
  }
  __name(rotateY3, "rotateY");
  function rotateZ3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bz = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
  }
  __name(rotateZ3, "rotateZ");
  function calculateW(out, a) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1 - x * x - y * y - z * z));
    return out;
  }
  __name(calculateW, "calculateW");
  function exp(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var et = Math.exp(w);
    var s = r > 0 ? et * Math.sin(r) / r : 0;
    out[0] = x * s;
    out[1] = y * s;
    out[2] = z * s;
    out[3] = et * Math.cos(r);
    return out;
  }
  __name(exp, "exp");
  function ln(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var t = r > 0 ? Math.atan2(r, w) / r : 0;
    out[0] = x * t;
    out[1] = y * t;
    out[2] = z * t;
    out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
    return out;
  }
  __name(ln, "ln");
  function pow(out, a, b) {
    ln(out, a);
    scale5(out, out, b);
    exp(out, out);
    return out;
  }
  __name(pow, "pow");
  function slerp(out, a, b, t) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    var omega, cosom, sinom, scale0, scale1;
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    if (1 - cosom > EPSILON) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
  }
  __name(slerp, "slerp");
  function random2(out) {
    var u1 = RANDOM();
    var u2 = RANDOM();
    var u3 = RANDOM();
    var sqrt1MinusU1 = Math.sqrt(1 - u1);
    var sqrtU1 = Math.sqrt(u1);
    out[0] = sqrt1MinusU1 * Math.sin(2 * Math.PI * u2);
    out[1] = sqrt1MinusU1 * Math.cos(2 * Math.PI * u2);
    out[2] = sqrtU1 * Math.sin(2 * Math.PI * u3);
    out[3] = sqrtU1 * Math.cos(2 * Math.PI * u3);
    return out;
  }
  __name(random2, "random");
  function invert3(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var dot4 = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    var invDot = dot4 ? 1 / dot4 : 0;
    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
  }
  __name(invert3, "invert");
  function conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  }
  __name(conjugate, "conjugate");
  function fromMat3(out, m) {
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;
    if (fTrace > 0) {
      fRoot = Math.sqrt(fTrace + 1);
      out[3] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[0] = (m[5] - m[7]) * fRoot;
      out[1] = (m[6] - m[2]) * fRoot;
      out[2] = (m[1] - m[3]) * fRoot;
    } else {
      var i = 0;
      if (m[4] > m[0]) i = 1;
      if (m[8] > m[i * 3 + i]) i = 2;
      var j = (i + 1) % 3;
      var k = (i + 2) % 3;
      fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
      out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
      out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }
    return out;
  }
  __name(fromMat3, "fromMat3");
  function fromEuler(out, x, y, z) {
    var halfToRad = 0.5 * Math.PI / 180;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;
    var sx = Math.sin(x);
    var cx = Math.cos(x);
    var sy = Math.sin(y);
    var cy = Math.cos(y);
    var sz = Math.sin(z);
    var cz = Math.cos(z);
    out[0] = sx * cy * cz - cx * sy * sz;
    out[1] = cx * sy * cz + sx * cy * sz;
    out[2] = cx * cy * sz - sx * sy * cz;
    out[3] = cx * cy * cz + sx * sy * sz;
    return out;
  }
  __name(fromEuler, "fromEuler");
  function str4(a) {
    return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  __name(str4, "str");
  var clone5 = clone4;
  var fromValues5 = fromValues4;
  var copy5 = copy4;
  var set5 = set4;
  var add5 = add4;
  var mul4 = multiply4;
  var scale5 = scale4;
  var dot3 = dot2;
  var lerp3 = lerp2;
  var length3 = length2;
  var len2 = length3;
  var squaredLength3 = squaredLength2;
  var sqrLen2 = squaredLength3;
  var normalize3 = normalize2;
  var exactEquals5 = exactEquals4;
  var equals5 = equals4;
  var rotationTo = function() {
    var tmpvec3 = create3();
    var xUnitVec3 = fromValues3(1, 0, 0);
    var yUnitVec3 = fromValues3(0, 1, 0);
    return function(out, a, b) {
      var dot4 = dot(a, b);
      if (dot4 < -0.999999) {
        cross(tmpvec3, xUnitVec3, a);
        if (len(tmpvec3) < 1e-6) cross(tmpvec3, yUnitVec3, a);
        normalize(tmpvec3, tmpvec3);
        setAxisAngle(out, tmpvec3, Math.PI);
        return out;
      } else if (dot4 > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      } else {
        cross(tmpvec3, a, b);
        out[0] = tmpvec3[0];
        out[1] = tmpvec3[1];
        out[2] = tmpvec3[2];
        out[3] = 1 + dot4;
        return normalize3(out, out);
      }
    };
  }();
  var sqlerp = function() {
    var temp1 = create5();
    var temp2 = create5();
    return function(out, a, b, c, d, t) {
      slerp(temp1, a, d, t);
      slerp(temp2, b, c, t);
      slerp(out, temp1, temp2, 2 * t * (1 - t));
      return out;
    };
  }();
  var setAxes = function() {
    var matr = create();
    return function(out, view, right, up) {
      matr[0] = right[0];
      matr[3] = right[1];
      matr[6] = right[2];
      matr[1] = up[0];
      matr[4] = up[1];
      matr[7] = up[2];
      matr[2] = -view[0];
      matr[5] = -view[1];
      matr[8] = -view[2];
      return normalize3(out, fromMat3(out, matr));
    };
  }();

  // src/rendering/core/errors/InvalidRenderViewError.ts
  var _InvalidRenderViewError = class _InvalidRenderViewError extends RenderingError {
    constructor(fieldName, reason) {
      super(fieldName + ": " + reason, "INVALID_RENDER_VIEW", {
        fieldName,
        reason
      });
      this.name = "InvalidRenderViewError";
    }
  };
  __name(_InvalidRenderViewError, "InvalidRenderViewError");
  var InvalidRenderViewError = _InvalidRenderViewError;

  // src/errors/LanguageError/ExhaustiveMatchError.ts
  var _ExhaustiveMatchError = class _ExhaustiveMatchError extends Error {
    constructor(value, message) {
      super(message ?? `Unhandled discriminated union member: ${JSON.stringify(value)}`);
      this.name = "ExhaustiveMatchError";
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, new.target);
      }
    }
  };
  __name(_ExhaustiveMatchError, "ExhaustiveMatchError");
  var ExhaustiveMatchError = _ExhaustiveMatchError;

  // src/errors/helper/helpers.ts
  function assertNever(value, message) {
    throw new ExhaustiveMatchError(value, message);
  }
  __name(assertNever, "assertNever");

  // src/rendering/core/Resource.ts
  var _Resource = class _Resource {
    constructor() {
      /** 由基类独占维护的单向生命周期状态。 */
      __publicField(this, "disposedValue", false);
      /**
       * 当前持有该 Resource 的 Scene 数量。
       *
       * @remarks
       * 该字段只通过 retainSceneReference() 和 releaseSceneReference() 修改。
       * 它不表示 JavaScript 的真实对象引用数量，也不统计 Mesh 数量或 WebGL context 数量。
       */
      __publicField(this, "sceneReferenceCountValue", 0);
      /**
       * 按注册顺序保存 listener。`readonly` 禁止替换 Set，但允许增删其中的 listener。
       */
      __publicField(this, "disposeListeners", /* @__PURE__ */ new Set());
    }
    // ==================== public ====================
    /**
     * 供子类与外部借用者在使用本资源前统一验证生命周期。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][resource-lifecycle-guard]
     *
     * 错误中的稳定类型由资源自己的 resourceType 提供，调用者无需重复传入名称。
     * 此方法只读取状态，不 retain、不 dispose，也不改变 listener 或 CPU 数据。
     * finalizeDisposal() 在通知 listener 前标记 disposed，因此释放期间就已拒绝使用。
     * 成功只证明本次检查时 CPU 资源存活，不保证 GPU 上传或 context 可用；
     * 跨 await 后如需继续使用，调用方仍须遵守所有权约定并在消费处重新检查。
     *
     * @throws {@link ResourceDisposedError} 当资源已经完成或开始释放。
     */
    assertUsable() {
      if (this.disposedValue) {
        throw new ResourceDisposedError(this.resourceType);
      }
    }
    /** 当前资源是否已经进入 disposed 状态。 */
    get disposed() {
      return this.disposedValue;
    }
    /**
     * 获取当前持有该 Resource 的 Scene 数量。
     *
     * @returns 非负整数；调用者只能读取，不能直接修改。
     */
    get sceneReferenceCount() {
      return this.sceneReferenceCountValue;
    }
    /**
     * 注册一个同步释放监听器。
     *
     * @param listener - Resource 首次释放时调用的清理函数。
     * @returns 幂等的取消订阅函数；Manager 先于 Resource 销毁时必须调用它。
     * @throws {@link ResourceDisposedError} 当资源已经释放，避免创建永远不会触发的订阅。
     */
    onDispose(listener) {
      this.assertUsable();
      this.disposeListeners.add(listener);
      return () => {
        this.disposeListeners.delete(listener);
      };
    }
    /**
     * 登记一个新的 Scene 存活引用。
     *
     * @remarks
     * retain 在引用计数语义中表示：“新增一个要求该 Resource 继续存活的持有者。”
     * 同一个 Scene 的对象身份去重由 Scene 内部 Set 负责，本方法只处理计数。
     *
     * @throws {@link ResourceDisposedError}
     * 已经真正释放的 Resource 不能重新恢复为可用状态。
     */
    retainSceneReference() {
      this.assertUsable();
      this.sceneReferenceCountValue += 1;
    }
    /**
     * 释放一个 Scene 存活引用。
     *
     * @remarks
     * 方法先验证当前计数，之后只减少一次。计数从 1 变成 0 时，立即自动执行真正清理，
     * 避免产生“已经没有所有者，但仍等待其他代码调用 dispose”的泄漏状态。
     *
     * @throws {@link ResourceSceneReferenceUnderflowError}
     * 当前计数已经为 0 时抛出，且状态保持不变。
     */
    releaseSceneReference() {
      if (this.sceneReferenceCountValue === 0)
        throw new ResourceSceneReferenceUnderflowError(this.resourceType);
      this.sceneReferenceCountValue -= 1;
      if (this.sceneReferenceCountValue === 0) this.finalizeDisposal();
    }
    /**
     * 尝试立即释放 Resource，而不把“仍有 Scene 引用”当成异常。
     *
     * @returns 调用结束后 Resource 已经 disposed 时返回 true；仍有 Scene 引用时返回 false。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][resource-safe-try-dispose]
     *
     * 适用于“资源可能仍被共享”这一正常业务分支。返回 false 时，引用计数、listener、
     * disposed 状态和 CPU 数据全部保持不变。
     */
    tryDispose() {
      if (this.disposedValue) return true;
      if (this.sceneReferenceCountValue > 0) return false;
      this.finalizeDisposal();
      return true;
    }
    /**
     * 严格要求 Resource 立即完成释放。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][resource-strict-dispose]
     *
     * 没有 Scene 引用时，直接执行真正清理；已经 disposed 时保持幂等；仍有 Scene 引用
     * 时抛出领域错误。调用成功返回后，调用者可以确定 `disposed === true`。
     *
     * @throws {@link ResourceHasSceneReferencesError}
     * 一个或多个 Scene 仍然持有 Resource 时抛出，状态保持不变。对于正常的非异常尝试，
     * 调用 tryDispose()。
     */
    dispose() {
      if (this.disposedValue) return;
      if (this.sceneReferenceCountValue > 0) {
        throw new ResourceHasSceneReferencesError(this.resourceType, this.sceneReferenceCountValue);
      }
      this.finalizeDisposal();
    }
    /**
     * 执行唯一的真正清理流程。
     *
     * @remarks
     * 只有两个入口可以抵达这里：
     *
     * - 无 Scene 引用时调用 dispose()/tryDispose()；
     * - releaseSceneReference() 把最后一个引用从 1 减到 0。
     *
     * 顺序固定为：标记 disposed → 按注册顺序通知 listener → 清空 listener →
     * disposeCPUData()。先标记状态可以阻止 listener 在释放期间重新使用资源。
     */
    finalizeDisposal() {
      if (this.disposedValue) return;
      this.disposedValue = true;
      for (const listener of this.disposeListeners) {
        listener();
      }
      this.disposeListeners.clear();
      this.disposeCPUData();
    }
  };
  __name(_Resource, "Resource");
  var Resource = _Resource;

  // src/rendering/resources/VertexAttributeSemantic.ts
  var VertexAttributeSemantic = {
    Position: "position",
    Normal: "normal",
    UV: "uv",
    Color: "color"
  };

  // src/rendering/resources/Geometry.ts
  function copyIndexData(indices) {
    if (indices instanceof Uint8Array) return new Uint8Array(indices);
    if (indices instanceof Uint16Array) return new Uint16Array(indices);
    if (indices instanceof Uint32Array) return new Uint32Array(indices);
    throw new InvalidGeometryError("indices use an unsupported TypedArray type");
  }
  __name(copyIndexData, "copyIndexData");
  function assertValidDrawCount(topology, drawCount) {
    switch (topology) {
      case "triangles": {
        if (drawCount < 3 || drawCount % 3 !== 0) {
          throw new InvalidGeometryError(
            `triangles require at least 3 draw elements and a count divisible by 3; received ${drawCount}`,
            {
              topology,
              drawCount
            }
          );
        }
        break;
      }
      case "lines": {
        if (drawCount < 2 || drawCount % 2 !== 0) {
          throw new InvalidGeometryError(
            `lines require at least 2 draw elements and a count divisible by 2; received ${drawCount}`,
            {
              topology,
              drawCount
            }
          );
        }
        break;
      }
      case "line-strip": {
        if (drawCount < 2) {
          throw new InvalidGeometryError(
            `line-strip requires at least 2 draw elements; received ${drawCount}`,
            {
              topology,
              drawCount
            }
          );
        }
        break;
      }
      case "triangle-strip": {
        if (drawCount < 3) {
          throw new InvalidGeometryError(
            `triangle-strip requires at least 3 draw elements; received ${drawCount}`,
            {
              topology,
              drawCount
            }
          );
        }
        break;
      }
      default: {
        assertNever(topology, `[Geometry] unsupported primitive topology: ${String(topology)}`);
      }
    }
  }
  __name(assertValidDrawCount, "assertValidDrawCount");
  var _Geometry = class _Geometry extends Resource {
    /**
     * 创建并验证静态 CPU Geometry。
     *
     * @param options.attributes - position、normal、uv 等语义名称到属性值的映射。
     * @param options.indices - 可选无符号索引数据；构造时复制。
     * @param options.topology - 图元组织方式；默认 triangles。
     *
     * @throws {@link InvalidGeometryError}
     * 缺少 position、position 为空、属性 count 不一致、索引越界或 drawCount
     * 不满足 topology 时抛出。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][geometry-draw-count-validation]
     *
     * 构造过程先复制 attribute record 和 indices，再根据最终快照完成验证。
     * topology 验证使用真正提交给 draw call 的 drawCount：
     *
     * - 非索引 Geometry：`position.count`；
     * - 索引 Geometry：`indices.length`。
     */
    constructor(options) {
      super();
      /** 不依赖 constructor.name 的稳定资源诊断类型。 */
      __publicField(this, "resourceType", "Geometry");
      /**
       * Geometry 自己持有的属性映射副本。
       *
       * @remarks
       * Map 本身不向外暴露；getAttributeNames() 返回新数组，getAttribute() 只返回
       * 已经不可变的 VertexAttribute。
       */
      __publicField(this, "attributesValue");
      /**
       * Geometry 自己持有的 index 快照。
       *
       * @remarks
       * 字段不是 readonly，是为了在 disposeCPUData() 中断开对可能较大 TypedArray
       * backing buffer 的引用。公开 API 仍然没有任何修改索引的方法。
       */
      __publicField(this, "indicesValue");
      /** position attribute 在构造时确定的顶点数量。 */
      __publicField(this, "vertexCountValue");
      /** indexed 时为 index count，否则为 vertexCount。 */
      __publicField(this, "drawCountValue");
      /** 经过构造验证的 primitive topology。 */
      __publicField(this, "topologyValue");
      const { attributes, indices, topology = "triangles" } = options;
      const copiedAttributes = new Map(Object.entries(attributes));
      const position = copiedAttributes.get(VertexAttributeSemantic.Position);
      if (position === void 0) {
        throw new InvalidGeometryError("a position attribute is required");
      }
      const vertexCount = position.count;
      if (vertexCount === 0) {
        throw new InvalidGeometryError("the position attribute must contain at least one vertex", {
          vertexCount
        });
      }
      for (const [attributeName, attribute] of copiedAttributes) {
        if (attribute.count !== vertexCount) {
          throw new InvalidGeometryError(
            `attribute ${attributeName} has ${attribute.count} vertices; expected ${vertexCount}`,
            {
              attributeName,
              attributeCount: attribute.count,
              vertexCount
            }
          );
        }
      }
      const copiedIndices = indices === void 0 ? null : copyIndexData(indices);
      if (copiedIndices !== null) {
        for (const [indexOffset, vertexIndex] of copiedIndices.entries()) {
          if (vertexIndex >= vertexCount) {
            throw new InvalidGeometryError(
              `index ${vertexIndex} at offset ${indexOffset} is outside vertex count ${vertexCount}`,
              {
                indexOffset,
                vertexIndex,
                vertexCount
              }
            );
          }
        }
      }
      const drawCount = copiedIndices?.length ?? vertexCount;
      assertValidDrawCount(topology, drawCount);
      this.attributesValue = copiedAttributes;
      this.indicesValue = copiedIndices;
      this.vertexCountValue = vertexCount;
      this.drawCountValue = drawCount;
      this.topologyValue = topology;
    }
    /**
     * 获取指定语义名称的不可变 VertexAttribute。
     *
     * @param name - 属性语义，例如 position、normal 或 uv。
     * @returns 对应属性；不存在时返回 undefined。
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    getAttribute(name) {
      this.assertUsable();
      return this.attributesValue.get(name);
    }
    /**
     * 按构造输入顺序复制所有属性名称。
     *
     * @returns 每次调用都创建的新数组。
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    getAttributeNames() {
      this.assertUsable();
      return [...this.attributesValue.keys()];
    }
    /**
     * 复制索引数据。
     *
     * @returns indexed Geometry 返回同类型新 TypedArray；非 indexed Geometry 返回 null。
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    copyIndices() {
      this.assertUsable();
      return this.indicesValue === null ? null : copyIndexData(this.indicesValue);
    }
    /**
     * 获取 position attribute 确定的顶点数量。
     *
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    get vertexCount() {
      this.assertUsable();
      return this.vertexCountValue;
    }
    /**
     * 获取未来 draw call 实际消费的元素数量。
     *
     * @remarks
     * indexed Geometry 使用 index count；非 indexed Geometry 使用 vertexCount。
     *
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    get drawCount() {
      this.assertUsable();
      return this.drawCountValue;
    }
    /**
     * 获取 Geometry 是否使用索引绘制。
     *
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    get indexed() {
      this.assertUsable();
      return this.indicesValue !== null;
    }
    /**
     * 获取经过验证的 primitive topology。
     *
     * @throws {@link ResourceDisposedError} Geometry 已释放时抛出。
     */
    get topology() {
      this.assertUsable();
      return this.topologyValue;
    }
    /**
     * 断开 Geometry 对 CPU attribute 和 index 数据的引用。
     *
     * @remarks
     * Resource 基类保证 dispose listener 已经先收到通知。每个 context 的
     * GeometryManager 应利用该通知删除自己的 WebGLBuffer；本方法本身绝不调用
     * WebGL API。
     */
    disposeCPUData() {
      this.attributesValue.clear();
      this.indicesValue = null;
    }
  };
  __name(_Geometry, "Geometry");
  var Geometry = _Geometry;

  // src/rendering/core/validation.ts
  function assertNonArrayObject(value, errorFactory) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw errorFactory();
    }
  }
  __name(assertNonArrayObject, "assertNonArrayObject");
  function requireBoolean(value, errorFactory) {
    if (typeof value !== "boolean") {
      throw errorFactory();
    }
    return value;
  }
  __name(requireBoolean, "requireBoolean");
  function requireFiniteNumber(value, errorFactory) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw errorFactory();
    }
    return value;
  }
  __name(requireFiniteNumber, "requireFiniteNumber");

  // src/rendering/resources/Texture.ts
  var WRAP_MODES = /* @__PURE__ */ new Set(["clamp-to-edge", "repeat", "mirrored-repeat"]);
  var MAG_FILTERS = /* @__PURE__ */ new Set(["nearest", "linear"]);
  var MIN_FILTERS = /* @__PURE__ */ new Set([
    "nearest",
    "linear",
    "nearest-mipmap-nearest",
    "linear-mipmap-nearest",
    "nearest-mipmap-linear",
    "linear-mipmap-linear"
  ]);
  var MIPMAP_MIN_FILTERS = /* @__PURE__ */ new Set([
    "nearest-mipmap-nearest",
    "linear-mipmap-nearest",
    "nearest-mipmap-linear",
    "linear-mipmap-linear"
  ]);
  var FORMATS = /* @__PURE__ */ new Set(["r", "rg", "rgb", "rgba"]);
  var DATA_TYPES = /* @__PURE__ */ new Set(["uint8", "float32"]);
  var COLOR_SPACES = /* @__PURE__ */ new Set(["srgb", "linear", "data"]);
  var MIPMAP_POLICIES = /* @__PURE__ */ new Set(["none", "generate"]);
  function createTextureDescriptorSnapshot(options, createError) {
    if (typeof options.label !== "string" || options.label.trim().length === 0) {
      throw createError("label must be a non-empty string");
    }
    if (options.sampler !== void 0 && (options.sampler === null || typeof options.sampler !== "object")) {
      throw createError("sampler must be an object when provided");
    }
    if (options.storage === null || typeof options.storage !== "object") {
      throw createError("storage must be an object");
    }
    const samplerInput = options.sampler ?? {};
    const wrapS = samplerInput.wrapS ?? "clamp-to-edge";
    const wrapT = samplerInput.wrapT ?? "clamp-to-edge";
    const minFilter = samplerInput.minFilter ?? "linear";
    const magFilter = samplerInput.magFilter ?? "linear";
    const format = options.storage.format;
    const type = options.storage.type;
    const colorSpace = options.colorSpace;
    const mipmapPolicy = options.mipmapPolicy ?? "none";
    if (!WRAP_MODES.has(wrapS)) {
      throw createError(`unsupported wrapS ${String(wrapS)}`);
    }
    if (!WRAP_MODES.has(wrapT)) {
      throw createError(`unsupported wrapT ${String(wrapT)}`);
    }
    if (!MIN_FILTERS.has(minFilter)) {
      throw createError(`unsupported minFilter ${String(minFilter)}`);
    }
    if (!MAG_FILTERS.has(magFilter)) {
      throw createError(`unsupported magFilter ${String(magFilter)}`);
    }
    if (!FORMATS.has(format)) {
      throw createError(`unsupported format ${String(format)}`);
    }
    if (!DATA_TYPES.has(type)) {
      throw createError(`unsupported data type ${String(type)}`);
    }
    if (!COLOR_SPACES.has(colorSpace)) {
      throw createError(`unsupported color space ${String(colorSpace)}`);
    }
    if (!MIPMAP_POLICIES.has(mipmapPolicy)) {
      throw createError(`unsupported mipmap policy ${String(mipmapPolicy)}`);
    }
    if (mipmapPolicy === "none" && MIPMAP_MIN_FILTERS.has(minFilter)) {
      throw createError(`minFilter ${minFilter} requires mipmapPolicy "generate"`);
    }
    const sampler = Object.freeze({
      wrapS,
      wrapT,
      minFilter,
      magFilter
    });
    const storage = Object.freeze({
      format,
      type
    });
    return Object.freeze({
      label: options.label,
      sampler,
      storage,
      colorSpace,
      mipmapPolicy
    });
  }
  __name(createTextureDescriptorSnapshot, "createTextureDescriptorSnapshot");
  var _Texture = class _Texture extends Resource {
    /**
     * @param options - 通用纹理描述。
     * @param createError - 由具体子类提供的领域错误工厂。
     */
    /**
     * @param options - 通用纹理描述。
     * @param createError - 由具体子类提供的领域错误工厂。
     */
    constructor(options, createError) {
      super();
      __publicField(this, "label");
      __publicField(this, "sampler");
      __publicField(this, "storage");
      __publicField(this, "colorSpace");
      __publicField(this, "mipmapPolicy");
      const descriptor = createTextureDescriptorSnapshot(options, createError);
      this.label = descriptor.label;
      this.sampler = descriptor.sampler;
      this.storage = descriptor.storage;
      this.colorSpace = descriptor.colorSpace;
      this.mipmapPolicy = descriptor.mipmapPolicy;
    }
  };
  __name(_Texture, "Texture");
  var Texture = _Texture;

  // src/rendering/resources/texturePixelSnapshot.ts
  function getChannelCount(format) {
    const channelCounts = {
      r: 1,
      rg: 2,
      rgb: 3,
      rgba: 4
    };
    return channelCounts[format];
  }
  __name(getChannelCount, "getChannelCount");
  function copyTexturePixelArray(data) {
    if (data instanceof Uint8Array) {
      return new Uint8Array(data);
    }
    if (data instanceof Float32Array) {
      return new Float32Array(data);
    }
    throw new TypeError("Unsupported texture pixel array");
  }
  __name(copyTexturePixelArray, "copyTexturePixelArray");
  function createTexturePixelSnapshot2D(source, storage, createError) {
    if (source === null || typeof source !== "object") {
      throw createError("pixel source must be an object");
    }
    if (!Number.isInteger(source.width) || source.width <= 0 || !Number.isInteger(source.height) || source.height <= 0) {
      throw createError(
        `width and height must be positive integers; received ${String(source.width)} × ${String(source.height)}`
      );
    }
    const hasSupportedArray = source.data instanceof Uint8Array || source.data instanceof Float32Array;
    if (!hasSupportedArray) {
      throw createError("data must be a Uint8Array or Float32Array");
    }
    if (storage.type === "uint8" && !(source.data instanceof Uint8Array)) {
      throw createError("storage type uint8 requires Uint8Array data");
    }
    if (storage.type === "float32" && !(source.data instanceof Float32Array)) {
      throw createError("storage type float32 requires Float32Array data");
    }
    const expectedLength = source.width * source.height * getChannelCount(storage.format);
    if (!Number.isSafeInteger(expectedLength)) {
      throw createError("texture dimensions exceed the safe CPU array length range");
    }
    if (source.data.length !== expectedLength) {
      throw createError(
        `data length ${source.data.length} does not match expected length ${expectedLength}`
      );
    }
    return Object.freeze({
      data: copyTexturePixelArray(source.data),
      width: source.width,
      height: source.height
    });
  }
  __name(createTexturePixelSnapshot2D, "createTexturePixelSnapshot2D");
  function copyTexturePixelSnapshot2D(source) {
    return {
      data: copyTexturePixelArray(source.data),
      width: source.width,
      height: source.height
    };
  }
  __name(copyTexturePixelSnapshot2D, "copyTexturePixelSnapshot2D");

  // src/rendering/resources/assertValidCubeFaceDimensions.ts
  function assertValidCubeFaceDimensions(faces, createError) {
    for (const [faceIndex, face] of faces.entries()) {
      const hasValidDimensions = Number.isSafeInteger(face.width) && face.width > 0 && Number.isSafeInteger(face.height) && face.height > 0;
      if (!hasValidDimensions) {
        throw createError(
          `face ${faceIndex} dimensions must be positive safe integers; received ${String(face.width)} × ${String(face.height)}`,
          {
            faceIndex,
            receivedWidth: face.width,
            receivedHeight: face.height
          }
        );
      }
      if (face.width !== face.height) {
        throw createError(
          `face ${faceIndex} must be square; received ${face.width} × ${face.height}`,
          {
            faceIndex,
            receivedWidth: face.width,
            receivedHeight: face.height
          }
        );
      }
    }
    const firstFace = faces[0];
    for (const [offset, face] of faces.slice(1).entries()) {
      const faceIndex = offset + 1;
      if (face.width !== firstFace.width || face.height !== firstFace.height) {
        throw createError(
          `face ${faceIndex} dimensions ${face.width} × ${face.height} do not match face 0 dimensions ${firstFace.width} × ${firstFace.height}`,
          {
            faceIndex,
            expectedWidth: firstFace.width,
            expectedHeight: firstFace.height,
            receivedWidth: face.width,
            receivedHeight: face.height
          }
        );
      }
    }
  }
  __name(assertValidCubeFaceDimensions, "assertValidCubeFaceDimensions");

  // src/rendering/resources/CubeTexture.ts
  function getCubeDiagnosticLabel(label2) {
    if (typeof label2 !== "string" || label2.trim().length === 0) {
      return "<unnamed>";
    }
    return label2;
  }
  __name(getCubeDiagnosticLabel, "getCubeDiagnosticLabel");
  function copyCubeFaces(faces) {
    const copiedFaces = [faces[0], faces[1], faces[2], faces[3], faces[4], faces[5]];
    return Object.freeze(copiedFaces);
  }
  __name(copyCubeFaces, "copyCubeFaces");
  function createCubeImageSnapshot(label2, source) {
    const rawFaces = source.faces;
    if (!Array.isArray(rawFaces) || rawFaces.length !== 6) {
      const receivedFaceCount = Array.isArray(rawFaces) ? rawFaces.length : "non-array";
      throw new InvalidCubeTextureError(
        label2,
        `image source must contain exactly 6 faces; received ${String(receivedFaceCount)}`,
        {
          expectedFaceCount: 6,
          receivedFaceCount
        }
      );
    }
    const faces = source.faces;
    for (let faceIndex = 0; faceIndex < faces.length; faceIndex += 1) {
      const face = faces[faceIndex];
      if (face === null || typeof face !== "object") {
        throw new InvalidCubeTextureError(label2, `image face ${faceIndex} must be an object`, {
          faceIndex
        });
      }
    }
    return Object.freeze({
      kind: "images",
      faces: copyCubeFaces(faces)
    });
  }
  __name(createCubeImageSnapshot, "createCubeImageSnapshot");
  function createCubeDataFaceSnapshot(label2, face, faceIndex, storage) {
    return createTexturePixelSnapshot2D(
      face,
      storage,
      (reason) => new InvalidCubeTextureError(label2, `data face ${faceIndex} is invalid: ${reason}`, {
        faceIndex
      })
    );
  }
  __name(createCubeDataFaceSnapshot, "createCubeDataFaceSnapshot");
  function createCubeDataSnapshot(label2, source, storage) {
    const rawFaces = source.faces;
    if (!Array.isArray(rawFaces) || rawFaces.length !== 6) {
      const receivedFaceCount = Array.isArray(rawFaces) ? rawFaces.length : "non-array";
      throw new InvalidCubeTextureError(
        label2,
        `data source must contain exactly 6 faces; received ${String(receivedFaceCount)}`,
        {
          expectedFaceCount: 6,
          receivedFaceCount
        }
      );
    }
    const faces = source.faces;
    const snapshots = [
      createCubeDataFaceSnapshot(label2, faces[0], 0, storage),
      createCubeDataFaceSnapshot(label2, faces[1], 1, storage),
      createCubeDataFaceSnapshot(label2, faces[2], 2, storage),
      createCubeDataFaceSnapshot(label2, faces[3], 3, storage),
      createCubeDataFaceSnapshot(label2, faces[4], 4, storage),
      createCubeDataFaceSnapshot(label2, faces[5], 5, storage)
    ];
    assertValidCubeFaceDimensions(
      snapshots,
      (reason, details) => new InvalidCubeTextureError(label2, reason, details)
    );
    return Object.freeze({
      kind: "data",
      faces: Object.freeze(snapshots)
    });
  }
  __name(createCubeDataSnapshot, "createCubeDataSnapshot");
  function createCubeSourceSnapshot(label2, source, storage) {
    if (source === null || typeof source !== "object") {
      throw new InvalidCubeTextureError(label2, "source must be an object");
    }
    const sourceKind = source.kind;
    switch (sourceKind) {
      case "images":
        return createCubeImageSnapshot(label2, source);
      case "data":
        return createCubeDataSnapshot(label2, source, storage);
      default:
        throw new InvalidCubeTextureError(label2, `unsupported source kind ${String(sourceKind)}`, {
          sourceKind
        });
    }
  }
  __name(createCubeSourceSnapshot, "createCubeSourceSnapshot");
  var _CubeTexture = class _CubeTexture extends Texture {
    /**
     * @param options - 六面 source 与通用纹理描述。
     * @throws {@link InvalidCubeTextureError} source 或纹理描述违反约束时抛出。
     */
    constructor(options) {
      const textureLabel = getCubeDiagnosticLabel(options.label);
      super(options, (reason) => new InvalidCubeTextureError(textureLabel, reason));
      __publicField(this, "resourceType", "CubeTexture");
      /** 构造阶段建立的六面 CPU snapshot；释放后清空以交还大块内存。 */
      __publicField(this, "sourceValue");
      this.sourceValue = createCubeSourceSnapshot(this.label, options.source, this.storage);
    }
    /**
     * 返回当前 cubemap 的 CPU source 分类。
     *
     * @throws {@link import('@/rendering/core/errors').ResourceDisposedError}
     * 资源已释放时抛出。
     */
    get sourceKind() {
      this.assertUsable();
      return this.sourceValue.kind;
    }
    /**
     * 返回一份不会暴露内部 snapshot 的 cubemap source。
     *
     * @returns image 模式复制 faces 容器并保留借用图片引用；data 模式同时复制六个
     * wrapper 和六个 TypedArray。
     *
     * @throws {@link import('@/rendering/core/errors').ResourceDisposedError}
     * 资源已释放时抛出。
     */
    copySource() {
      this.assertUsable();
      const source = this.sourceValue;
      switch (source.kind) {
        case "images":
          return {
            kind: "images",
            faces: copyCubeFaces(source.faces)
          };
        case "data":
          return {
            kind: "data",
            faces: copyCubeFaces([
              copyTexturePixelSnapshot2D(source.faces[0]),
              copyTexturePixelSnapshot2D(source.faces[1]),
              copyTexturePixelSnapshot2D(source.faces[2]),
              copyTexturePixelSnapshot2D(source.faces[3]),
              copyTexturePixelSnapshot2D(source.faces[4]),
              copyTexturePixelSnapshot2D(source.faces[5])
            ])
          };
        default:
          return assertNever(source, "Unsupported CubeTexture source snapshot");
      }
    }
    /**
     * 丢弃 CPU source snapshot。
     *
     * @remarks
     * image 对象是借用引用，因此这里不会调用 `ImageBitmap.close()`；data TypedArray
     * 则在引用清空后等待垃圾回收。GPU handle 由 backend manager 单独释放。
     */
    disposeCPUData() {
      this.sourceValue = null;
    }
  };
  __name(_CubeTexture, "CubeTexture");
  var CubeTexture = _CubeTexture;

  // src/rendering/resources/ShaderModule.ts
  var BUILT_IN_UNIFORM_SEMANTICS = [
    "modelMatrix",
    "viewMatrix",
    "projectionMatrix",
    "normalMatrix",
    "cameraPosition"
  ];
  var BUILT_IN_UNIFORM_SEMANTIC_SET = new Set(BUILT_IN_UNIFORM_SEMANTICS);
  function getShaderDiagnosticLabel(name) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return "<unnamed>";
    }
    return name;
  }
  __name(getShaderDiagnosticLabel, "getShaderDiagnosticLabel");
  function requireNonBlankText(shaderName, fieldName, value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new InvalidShaderModuleError(shaderName, `${fieldName} must be a non-empty string`, {
        fieldName
      });
    }
    return value;
  }
  __name(requireNonBlankText, "requireNonBlankText");
  function createBuiltInUniformSnapshot(shaderName, bindings) {
    if (bindings === void 0) {
      return Object.freeze({});
    }
    if (bindings === null || typeof bindings !== "object") {
      throw new InvalidShaderModuleError(
        shaderName,
        "builtInUniforms must be an object when provided"
      );
    }
    for (const semantic of Object.keys(bindings)) {
      if (!BUILT_IN_UNIFORM_SEMANTIC_SET.has(semantic)) {
        throw new InvalidShaderModuleError(
          shaderName,
          `unsupported built-in uniform semantic ${semantic}`,
          {
            semantic
          }
        );
      }
    }
    const snapshot2 = {};
    for (const semantic of BUILT_IN_UNIFORM_SEMANTICS) {
      const uniformName = bindings[semantic];
      if (uniformName === void 0) continue;
      snapshot2[semantic] = requireNonBlankText(shaderName, `builtInUniforms.${semantic}`, uniformName);
    }
    return Object.freeze(snapshot2);
  }
  __name(createBuiltInUniformSnapshot, "createBuiltInUniformSnapshot");
  var _ShaderModule = class _ShaderModule extends Resource {
    /**
     * 创建一个单语言 ShaderModule。
     *
     * @throws {@link InvalidShaderModuleError}
     * name、源码、language 或 built-in uniform binding 无效时抛出。
     */
    constructor(options) {
      super();
      /** 不依赖 constructor.name 的稳定资源诊断类型。 */
      __publicField(this, "resourceType", "ShaderModule");
      /** 面向开发者的稳定诊断名称。 */
      __publicField(this, "name");
      /** 当前实例唯一对应的 shader language。 */
      __publicField(this, "language");
      /** 释放时会被清空的 vertex source。 */
      __publicField(this, "vertexSourceValue");
      /** 释放时会被清空的 fragment source。 */
      __publicField(this, "fragmentSourceValue");
      /** 释放时会被清空的 built-in uniform binding snapshot。 */
      __publicField(this, "builtInUniformsValue");
      const shaderName = getShaderDiagnosticLabel(options.name);
      this.name = requireNonBlankText(shaderName, "name", options.name);
      const language = options.language;
      if (language !== "glsl-es-100" && language !== "glsl-es-300") {
        throw new InvalidShaderModuleError(
          shaderName,
          `unsupported shader language ${String(language)}`,
          {
            language
          }
        );
      }
      this.language = language;
      this.vertexSourceValue = requireNonBlankText(shaderName, "vertexSource", options.vertexSource);
      this.fragmentSourceValue = requireNonBlankText(
        shaderName,
        "fragmentSource",
        options.fragmentSource
      );
      this.builtInUniformsValue = createBuiltInUniformSnapshot(shaderName, options.builtInUniforms);
    }
    /** 获取完整 vertex shader source。 */
    get vertexSource() {
      this.assertUsable();
      return this.vertexSourceValue;
    }
    /** 获取完整 fragment shader source。 */
    get fragmentSource() {
      this.assertUsable();
      return this.fragmentSourceValue;
    }
    /** 获取冻结的 built-in uniform binding snapshot。 */
    get builtInUniforms() {
      this.assertUsable();
      return this.builtInUniformsValue;
    }
    /**
     * 断开对 shader source 和 binding snapshot 的 CPU 引用。
     *
     * @remarks
     * WebGL program 清理由订阅该 Resource 的各个 context-local Manager 完成。
     */
    disposeCPUData() {
      this.vertexSourceValue = null;
      this.fragmentSourceValue = null;
      this.builtInUniformsValue = null;
    }
  };
  __name(_ShaderModule, "ShaderModule");
  var ShaderModule = _ShaderModule;

  // src/rendering/resources/RenderTarget.ts
  var COLOR_ATTACHMENT_FORMATS = Object.freeze(["rgba8", "rgba32f"]);
  var DEPTH_ATTACHMENT_FORMATS = Object.freeze(["depth16"]);
  var COLOR_ATTACHMENT_FILTERS = Object.freeze(["nearest", "linear"]);
  function requireRecord(value, fieldName) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new InvalidRenderTargetError(fieldName, "must be a non-array object");
    return value;
  }
  __name(requireRecord, "requireRecord");
  function requireKnownFields(input, allowed, fieldName) {
    const allowedNames = allowed;
    for (const key of Object.keys(input)) {
      if (!allowedNames.includes(key)) {
        throw new InvalidRenderTargetError(fieldName + "." + key, "unknown field");
      }
    }
  }
  __name(requireKnownFields, "requireKnownFields");
  function requireDimension(value, fieldName) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
      throw new InvalidRenderTargetError(fieldName, "must be a positive safe integer", {
        received: value
      });
    return value;
  }
  __name(requireDimension, "requireDimension");
  function requireAttachmentFormat(value, allowedFormats, fieldName) {
    const format = allowedFormats.find((candidate) => candidate === value);
    if (format === void 0) {
      throw new InvalidRenderTargetError(fieldName, "must be one of: " + allowedFormats.join(", "), {
        received: value
      });
    }
    return format;
  }
  __name(requireAttachmentFormat, "requireAttachmentFormat");
  function createColorAttachmentSampler(value, fieldName) {
    const input = value === void 0 ? {} : requireRecord(value, fieldName);
    requireKnownFields(input, ["minFilter", "magFilter"], fieldName);
    const minFilter = input.minFilter;
    const magFilter = input.magFilter;
    return Object.freeze({
      minFilter: requireAttachmentFormat(
        minFilter === void 0 ? "linear" : minFilter,
        COLOR_ATTACHMENT_FILTERS,
        fieldName + ".minFilter"
      ),
      magFilter: requireAttachmentFormat(
        magFilter === void 0 ? "linear" : magFilter,
        COLOR_ATTACHMENT_FILTERS,
        fieldName + ".magFilter"
      )
    });
  }
  __name(createColorAttachmentSampler, "createColorAttachmentSampler");
  function createDescriptorSnapshot(value) {
    const input = requireRecord(value, "descriptor");
    requireKnownFields(
      input,
      ["width", "height", "colors", "depth"],
      "descriptor"
    );
    const width = requireDimension(input.width, "width");
    const height = requireDimension(input.height, "height");
    const rawColors = input.colors;
    if (!Array.isArray(rawColors) || rawColors.length === 0) {
      throw new InvalidRenderTargetError("colors", "must be a non-empty array");
    }
    const entries = rawColors;
    const colors = [];
    for (let index = 0; index < entries.length; index++) {
      const fieldName = "colors[" + index + "]";
      const color = requireRecord(entries[index], fieldName);
      requireKnownFields(
        color,
        ["format", "sampler"],
        fieldName
      );
      const format = requireAttachmentFormat(
        color.format,
        COLOR_ATTACHMENT_FORMATS,
        fieldName + ".format"
      );
      const sampler = createColorAttachmentSampler(color.sampler, fieldName + ".sampler");
      colors.push(Object.freeze({ format, sampler }));
    }
    let depth;
    if (input.depth !== void 0) {
      const entry = requireRecord(input.depth, "depth");
      requireKnownFields(entry, ["format"], "depth");
      const format = requireAttachmentFormat(entry.format, DEPTH_ATTACHMENT_FORMATS, "depth.format");
      depth = Object.freeze({ format });
    }
    return Object.freeze({
      width,
      height,
      /**
       * 冻结颜色附件数组本身，而不只是其中的附件描述对象。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][render-target-descriptor-snapshot]
       *
       * 每个附件对象已在前面的循环中冻结。
       * 此处继续禁止修改数组索引、增删元素以及改变 length，
       * 避免调用者绕过 RenderTarget 的受控修改与 revision 机制。
       *
       * colors 是本函数新建的数组，不是调用者传入的原始数组。
       */
      colors: Object.freeze(colors),
      ...depth === void 0 ? {} : { depth }
    });
  }
  __name(createDescriptorSnapshot, "createDescriptorSnapshot");
  var _RenderTarget = class _RenderTarget extends Resource {
    /**
     * @param descriptor - 完整尺寸与附件布局。
     * @param options - 独立诊断选项，必须包含非空白的 label。
     * @throws InvalidRenderTargetError 描述或标签不合法；不会留下 GPU 半成品。
     */
    constructor(descriptor, options) {
      super();
      __publicField(this, "resourceType", "RenderTarget");
      /**
       * 创建时复制的诊断名称；对 TypeScript 调用者只读，不是唯一标识。
       *
       * @remarks
       * [DESIGN-WEIGHT:2][render-target-diagnostic-label]
       *
       * 保存字符串值而非 options 引用，因此修改输入对象不会改变此标签。
       * resize 只更新存储描述与 revision；dispose 仍保留标签，便于事后诊断。
       */
      __publicField(this, "label");
      /** 当前完整的不可变 CPU 描述；正常释放通知结束后清空。 */
      __publicField(this, "descriptorValue");
      /** 描述版本，不是 GPU 已完成创建的证明，也不是撤销历史。 */
      __publicField(this, "revisionValue", 0);
      const input = requireRecord(options, "options");
      const label2 = input.label;
      if (typeof label2 !== "string" || label2.trim().length === 0) {
        throw new InvalidRenderTargetError("options.label", "must be a non-blank string", {
          received: label2
        });
      }
      this.label = label2;
      this.descriptorValue = createDescriptorSnapshot(descriptor);
    }
    /** 返回已深层冻结的快照；调用者缓存旧快照不会跟随 resize 改变。 */
    get descriptor() {
      this.assertUsable();
      return this.descriptorValue;
    }
    /** 返回当前 CPU 描述版本；读取不会增加版本，释放后拒绝读取。 */
    get revision() {
      this.assertUsable();
      return this.revisionValue;
    }
    /**
     * 只改变尺寸，保留附件数量、格式和冻结的 sampler。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-atomic-resize]
     *
     * 先验证两个尺寸，再准备完整新快照，最后提交并增加一次 revision。
     * 非法输入保持旧快照和版本不变；尺寸未变直接返回。
     * A → B → A 是两次修改，revision 不倒退；本方法不缓存历史版本。
     * Manager 后续看到 revision 不同才重建 GPU 表示；失败不得缓存半成品。
     *
     * @throws InvalidRenderTargetError 尺寸不是正安全整数。
     * @throws ResourceDisposedError 目标已开始释放。
     */
    resize(width, height) {
      this.assertUsable();
      const nextWidth = requireDimension(width, "width");
      const nextHeight = requireDimension(height, "height");
      const current = this.descriptorValue;
      if (current.width === nextWidth && current.height === nextHeight) return;
      const next = Object.freeze({
        ...current,
        width,
        height
      });
      this.descriptorValue = next;
      this.revisionValue++;
    }
    /**
     * 获取一个冻结的颜色附件地址；每次可返回新的包装对象。
     * @param index - 从 0 开始的颜色槽位。
     * @throws InvalidRenderTargetError 索引不是安全整数或超出范围。
     * @throws ResourceDisposedError 目标已开始释放。
     */
    getColorAttachment(index) {
      this.assertUsable();
      const colors = this.descriptorValue.colors;
      if (!Number.isSafeInteger(index) || index < 0 || index >= colors.length) {
        throw new InvalidRenderTargetError("colorAttachment.index", "must name an existing slot", {
          received: index,
          colorCount: colors.length
        });
      }
      return Object.freeze({ target: this, kind: "color", index });
    }
    /**
     * 获取深度地址；没有配置 depth 时返回 null。
     * 这里的 null 只表示“没有深度附件”，绝不表示默认 framebuffer。
     */
    getDepthAttachment() {
      this.assertUsable();
      if (this.descriptorValue.depth === void 0) return null;
      return Object.freeze({ target: this, kind: "depth", index: 0 });
    }
    /** 只交还 CPU 描述；各 context 的 GPU 删除由 Resource listener 通知 Manager。 */
    disposeCPUData() {
      this.descriptorValue = null;
    }
  };
  __name(_RenderTarget, "RenderTarget");
  var RenderTarget = _RenderTarget;

  // src/rendering/resources/Texture2D.ts
  function getTextureDiagnosticLabel(label2) {
    if (typeof label2 !== "string" || label2.trim().length === 0) {
      return "<unnamed>";
    }
    return label2;
  }
  __name(getTextureDiagnosticLabel, "getTextureDiagnosticLabel");
  var _Texture2D = class _Texture2D extends Texture {
    constructor(options, createError) {
      super(options, createError);
    }
  };
  __name(_Texture2D, "Texture2D");
  var Texture2D = _Texture2D;
  var _ImageTexture2D = class _ImageTexture2D extends Texture2D {
    constructor(options) {
      const textureLabel = getTextureDiagnosticLabel(options.label);
      super(options, (reason) => {
        return new InvalidTextureSourceError(textureLabel, reason);
      });
      __publicField(this, "resourceType", "ImageTexture2D");
      __publicField(this, "sourceValue");
      if (options.source === null || typeof options.source !== "object") {
        throw new InvalidTextureSourceError(this.label, "image source must be an object");
      }
      this.sourceValue = options.source;
    }
    /** 获取构造时保存的浏览器图片引用。 */
    get source() {
      this.assertUsable();
      return this.sourceValue;
    }
    /**
     * 断开图片引用，但不取得或终止外部图片对象的生命周期。
     */
    disposeCPUData() {
      this.sourceValue = null;
    }
  };
  __name(_ImageTexture2D, "ImageTexture2D");
  var ImageTexture2D = _ImageTexture2D;
  var _DataTexture2D = class _DataTexture2D extends Texture2D {
    constructor(options) {
      const textureLabel = getTextureDiagnosticLabel(options.label);
      super(options, (reason) => new InvalidTextureSourceError(textureLabel, reason));
      __publicField(this, "resourceType", "DataTexture2D");
      __publicField(this, "sourceValue");
      this.sourceValue = createTexturePixelSnapshot2D(
        options.source,
        this.storage,
        (reason) => new InvalidTextureSourceError(this.label, reason)
      );
    }
    /** 获取像素宽度。 */
    get width() {
      this.assertUsable();
      return this.sourceValue.width;
    }
    /** 获取像素高度。 */
    get height() {
      this.assertUsable();
      return this.sourceValue.height;
    }
    /**
     * 复制完整二维像素 source。
     *
     * @returns wrapper 和 TypedArray 都是新对象。
     */
    copySource() {
      this.assertUsable();
      return copyTexturePixelSnapshot2D(this.sourceValue);
    }
    /** 断开内部 TypedArray snapshot。 */
    disposeCPUData() {
      this.sourceValue = null;
    }
  };
  __name(_DataTexture2D, "DataTexture2D");
  var DataTexture2D = _DataTexture2D;

  // src/rendering/resources/Texture2DSamplingSource.ts
  function copyTexture2DSamplingSource(value, fieldName) {
    if (value instanceof Texture2D) {
      value.assertUsable();
      return value;
    }
    assertNonArrayObject(
      value,
      () => new InvalidMaterialError(fieldName, "must reference a Texture2D or a RenderTarget attachment")
    );
    const input = value;
    const target2 = input.target;
    const kind = input.kind;
    const index = input.index;
    if (!(target2 instanceof RenderTarget))
      throw new InvalidMaterialError(fieldName + ".target", "must reference a RenderTarget");
    target2.assertUsable();
    if (kind !== "color" && kind !== "depth")
      throw new InvalidMaterialError(fieldName + ".kind", "must be color or depth", {
        received: kind
      });
    if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
      throw new InvalidMaterialError(fieldName + ".index", "must be a non-negative safe integer", {
        received: index
      });
    const descriptor = target2.descriptor;
    if (kind === "color" && index >= descriptor.colors.length)
      throw new InvalidMaterialError(fieldName + ".index", "must name an existing color slot", {
        received: index,
        colorCount: descriptor.colors.length,
        targetLabel: target2.label
      });
    if (kind === "depth" && (index !== 0 || descriptor.depth === void 0))
      throw new InvalidMaterialError(fieldName + ".index", "must name an existing depth[0]", {
        received: index,
        targetLabel: target2.label
      });
    return Object.freeze({
      target: target2,
      kind,
      index
    });
  }
  __name(copyTexture2DSamplingSource, "copyTexture2DSamplingSource");

  // src/rendering/resources/Material.ts
  var DEPTH_FUNCTIONS = ["less", "less-equal", "always"];
  var CULL_MODES = ["none", "back", "front"];
  var RENDER_QUEUES = ["background", "opaque"];
  var PARAMETER_TYPES = {
    float: true,
    int: true,
    bool: true,
    vec2: true,
    vec3: true,
    vec4: true,
    mat3: true,
    mat4: true,
    texture2D: true,
    cubeTexture: true
  };
  function requireChoice(value, choices, fieldName) {
    const match = choices.find((choice) => choice === value);
    if (match === void 0) {
      throw new InvalidMaterialError(fieldName, "unsupported value", { received: value });
    }
    return match;
  }
  __name(requireChoice, "requireChoice");
  function defaultIfUndefined(value, fallback) {
    if (value === void 0) return fallback;
    return value;
  }
  __name(defaultIfUndefined, "defaultIfUndefined");
  function copyNumberArray(value, length4, fieldName) {
    if (!Array.isArray(value) || value.length !== length4)
      throw new InvalidMaterialError(fieldName, "must be an array of " + length4 + " numbers");
    const input = value;
    const copy6 = [];
    for (let index = 0; index < length4; index++) {
      copy6.push(
        requireFiniteNumber(
          input[index],
          () => new InvalidMaterialError(fieldName + "[" + index + "]", "must be a finite number")
        )
      );
    }
    return copy6;
  }
  __name(copyNumberArray, "copyNumberArray");
  function requireCubeTexture(value, fieldName) {
    if (!(value instanceof CubeTexture)) {
      throw new InvalidMaterialError(fieldName, "must reference a CubeTexture resource");
    }
    value.assertUsable();
    return value;
  }
  __name(requireCubeTexture, "requireCubeTexture");
  function copyParameter(parameter, fieldName) {
    assertNonArrayObject(
      parameter,
      () => new InvalidMaterialError(fieldName, "must be a non-array object")
    );
    const runtimeType = parameter.type;
    if (typeof runtimeType !== "string" || !Object.hasOwn(PARAMETER_TYPES, runtimeType))
      throw new InvalidMaterialError(fieldName + ".type", "unsupported parameter type", {
        received: runtimeType
      });
    switch (parameter.type) {
      case "float": {
        return {
          type: "float",
          value: requireFiniteNumber(
            parameter.value,
            () => new InvalidMaterialError(fieldName, "must be a finite number")
          )
        };
      }
      case "int": {
        const value = requireFiniteNumber(
          parameter.value,
          () => new InvalidMaterialError(fieldName, "must be a finite number")
        );
        if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
          throw new InvalidMaterialError(fieldName, "must be a signed 32-bit integer");
        return { type: "int", value };
      }
      case "bool": {
        return {
          type: "bool",
          value: requireBoolean(
            parameter.value,
            () => new InvalidMaterialError(fieldName, "must be a boolean")
          )
        };
      }
      case "vec2": {
        const value = copyNumberArray(parameter.value, 2, fieldName);
        return { type: "vec2", value: [value[0], value[1]] };
      }
      case "vec3": {
        const value = copyNumberArray(parameter.value, 3, fieldName);
        return { type: "vec3", value: [value[0], value[1], value[2]] };
      }
      case "vec4": {
        const value = copyNumberArray(parameter.value, 4, fieldName);
        return { type: "vec4", value: [value[0], value[1], value[2], value[3]] };
      }
      case "mat3":
        return { type: "mat3", value: copyNumberArray(parameter.value, 9, fieldName) };
      case "mat4":
        return { type: "mat4", value: copyNumberArray(parameter.value, 16, fieldName) };
      case "texture2D":
        return {
          type: "texture2D",
          value: copyTexture2DSamplingSource(parameter.value, fieldName)
        };
      case "cubeTexture":
        return { type: "cubeTexture", value: requireCubeTexture(parameter.value, fieldName) };
      default:
        assertNever(parameter, "Unimplemented MaterialParameter copy branch");
    }
  }
  __name(copyParameter, "copyParameter");
  function createRenderState(input) {
    const state = defaultIfUndefined(input, {});
    assertNonArrayObject(state, () => new InvalidMaterialError("state", "must be a non-array object"));
    for (const key of Object.keys(state)) {
      if (!["depthTest", "depthWrite", "depthFunction", "cullMode", "dither"].includes(key)) {
        throw new InvalidMaterialError("state." + key, "unknown render state field");
      }
    }
    return Object.freeze({
      depthTest: requireBoolean(
        defaultIfUndefined(state.depthTest, true),
        () => new InvalidMaterialError("state.depthTest", "must be a boolean")
      ),
      depthWrite: requireBoolean(
        defaultIfUndefined(state.depthWrite, true),
        () => new InvalidMaterialError("state.depthWrite", "must be a boolean")
      ),
      depthFunction: requireChoice(
        defaultIfUndefined(state.depthFunction, "less-equal"),
        DEPTH_FUNCTIONS,
        "state.depthFunction"
      ),
      cullMode: requireChoice(
        defaultIfUndefined(state.cullMode, "back"),
        CULL_MODES,
        "state.cullMode"
      ),
      dither: requireBoolean(
        defaultIfUndefined(state.dither, true),
        () => new InvalidMaterialError("state.dither", "must be a boolean")
      )
    });
  }
  __name(createRenderState, "createRenderState");
  function assertValidParameterName(name) {
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new InvalidMaterialError("parameterName", "must be a non-empty string");
    }
  }
  __name(assertValidParameterName, "assertValidParameterName");
  function prepareParameter(shader2, name, parameter) {
    assertValidParameterName(name);
    shader2.assertUsable();
    if (Object.values(shader2.builtInUniforms).includes(name))
      throw new InvalidMaterialError(name, "is reserved by builtInUniforms");
    return copyParameter(parameter, "parameters." + name);
  }
  __name(prepareParameter, "prepareParameter");
  var _Material = class _Material extends Resource {
    /**
     * @throws InvalidMaterialError 输入描述或参数无效。
     * @throws ResourceDisposedError shader、纹理或附件所属目标已经释放。
     */
    constructor(options) {
      super();
      __publicField(this, "resourceType", "Material");
      /** 释放 Material 时断开此借用引用。 */
      __publicField(this, "shaderModuleValue");
      __publicField(this, "queueValue");
      __publicField(this, "stateValue");
      /** Map 属于当前 Material；其中的资源对象仍然只是借用。 */
      __publicField(this, "parametersValue", /* @__PURE__ */ new Map());
      assertNonArrayObject(
        options,
        () => new InvalidMaterialError("options", "must be a non-array object")
      );
      const shader2 = options.shaderModule;
      if (!(shader2 instanceof ShaderModule))
        throw new InvalidMaterialError("shaderModule", "must reference a ShaderModule resource");
      shader2.assertUsable();
      this.shaderModuleValue = shader2;
      this.queueValue = requireChoice(
        defaultIfUndefined(options.queue, "opaque"),
        RENDER_QUEUES,
        "queue"
      );
      this.stateValue = createRenderState(options.state);
      if (options.parameters !== void 0) {
        assertNonArrayObject(
          options.parameters,
          () => new InvalidMaterialError("parameters", "must be a non-array object")
        );
        for (const [name, parameter] of Object.entries(options.parameters)) {
          this.parametersValue.set(name, prepareParameter(shader2, name, parameter));
        }
      }
    }
    /** 获取仍存活的单语言 shader 引用；并不获取已编译的 GPU Program。 */
    get shaderModule() {
      this.assertUsable();
      const shader2 = this.shaderModuleValue;
      shader2.assertUsable();
      return shader2;
    }
    /** 获取 RenderList 使用的执行分类。 */
    get queue() {
      this.assertUsable();
      return this.queueValue;
    }
    /** 返回构造时冻结的完整状态快照；无需每次再复制。 */
    get state() {
      this.assertUsable();
      return this.stateValue;
    }
    /**
     * 获取独立参数副本，名称不存在时返回 undefined。
     *
     * @remarks
     * 返回的 wrapper/数值数组是副本；CPU 纹理 value 仍是原 Resource。
     * 附件 value 是新的冻结地址，其中 target 仍为原 RenderTarget。
     * Material、取出的纹理或附件所属目标已释放时抛 ResourceDisposedError。
     */
    getParameter(name) {
      this.assertUsable();
      assertValidParameterName(name);
      const parameter = this.parametersValue.get(name);
      return parameter === void 0 ? void 0 : copyParameter(parameter, "parameters." + name);
    }
    /** 按首次插入顺序复制所有条目；不泄露 Map、wrapper 或数值数组。 */
    getParameterEntries() {
      this.assertUsable();
      return Array.from(
        this.parametersValue,
        ([name, parameter]) => [name, copyParameter(parameter, "parameters." + name)]
      );
    }
    /**
     * 新增或替换参数。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][material-atomic-parameter-write]
     *
     * 先验证并复制，再 Map.set()。验证失败时旧值和插入顺序都保持不变。
     * 替换纹理参数不负责释放旧纹理，也不负责登记新纹理的 Scene 引用。
     */
    setParameter(name, parameter) {
      this.assertUsable();
      const prepared = prepareParameter(this.shaderModule, name, parameter);
      this.parametersValue.set(name, prepared);
    }
    /** 只清除本 Material 的引用；借用资源的生命周期保持不变。 */
    disposeCPUData() {
      this.parametersValue.clear();
      this.shaderModuleValue = null;
    }
  };
  __name(_Material, "Material");
  var Material = _Material;

  // src/rendering/scene/Transform.ts
  var RADIANS_TO_DEGREES = 180 / Math.PI;
  function setFloat32ComponentsIfChanged(current, next) {
    const nextX = Math.fround(next[0]);
    const nextY = Math.fround(next[1]);
    const nextZ = Math.fround(next[2]);
    const unchanged = Object.is(current[0], nextX) && Object.is(current[1], nextY) && Object.is(current[2], nextZ);
    if (unchanged) {
      return false;
    }
    vec3_exports.set(current, nextX, nextY, nextZ);
    return true;
  }
  __name(setFloat32ComponentsIfChanged, "setFloat32ComponentsIfChanged");
  var _Transform = class _Transform {
    constructor() {
      /**
       * 内部 translation。
       *
       * `readonly` 只禁止把字段改指向另一个 vec3；setter 仍可修改该 vec3 的三个分量。
       */
      __publicField(this, "positionValue", vec3_exports.create());
      /** 内部 XYZ 欧拉角，单位为弧度。 */
      __publicField(this, "rotationValue", vec3_exports.create());
      /** 内部 scale；默认值为 identity scale `[1, 1, 1]`。 */
      __publicField(this, "scaleValue", vec3_exports.fromValues(1, 1, 1));
      /** 最近一次按当前 TRS 生成的 local matrix 缓存。 */
      __publicField(this, "localMatrixValue", mat4_exports.create());
      /**
       * 表示 localMatrixValue 是否落后于当前 TRS。
       *
       * @remarks
       * setter 只把它设为 true，不立即执行矩阵运算。矩阵在调用复制 API 时按需更新。
       *
       * 重算完成后它会恢复为 false，因此它只属于 Transform 的内部缓存协议，
       * 不能替代提供给外部观察者的 `version`。
       */
      __publicField(this, "localMatrixDirty", true);
      /**
       * 每次真实 Float32 TRS 修改恰好增加一次的单调版本号。
       *
       * @remarks
       * [DESIGN-WEIGHT:1][version-safe-integer-horizon]
       *
       * 它不会因为 local matrix 被读取、重算或复制而重置或额外增加。
       * SceneNode 使用它判断当前 world matrix 是否已经包含最新 local transform。
       *
       * JavaScript `number` 在 `Number.MAX_SAFE_INTEGER` 以内可精确表示整数。即使同一个
       * Transform 每秒发生 60 次真实修改，也需要约 476 万年才会到达该上限，因此
       * 当前实时渲染生命周期不引入 BigInt 或回绕协议。
       */
      __publicField(this, "versionValue", 0);
    }
    /**
     * 获取 translation 的独立只读副本。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[x, y, z]` tuple。
     */
    get position() {
      return [this.positionValue[0], this.positionValue[1], this.positionValue[2]];
    }
    /**
     * 获取 XYZ 欧拉旋转的独立只读副本，单位为弧度。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[xRadians, yRadians, zRadians]` tuple。
     */
    get rotation() {
      return [this.rotationValue[0], this.rotationValue[1], this.rotationValue[2]];
    }
    /**
     * 获取 scale 的独立只读副本。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[x, y, z]` tuple。
     */
    get scale() {
      return [this.scaleValue[0], this.scaleValue[1], this.scaleValue[2]];
    }
    /**
     * 获取 local TRS 的当前版本。
     *
     * @remarks
     * 读取或重算矩阵不会增加 version；只有 setter 造成真实 Float32 存储变化时
     * 才会增加。
     */
    get version() {
      return this.versionValue;
    }
    /**
     * 设置 local translation。
     *
     * @param position - 新的 `[x, y, z]`；写入前按 Float32 语义量化。
     */
    setPosition(position) {
      if (!setFloat32ComponentsIfChanged(this.positionValue, position)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 设置 local XYZ 欧拉旋转。
     *
     * @param rotation - 以弧度表示的 `[x, y, z]`；写入前按 Float32 语义量化。
     */
    setRotation(rotation) {
      if (!setFloat32ComponentsIfChanged(this.rotationValue, rotation)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 设置 local scale。
     *
     * @param scale - 新的 `[x, y, z]` 缩放；写入前按 Float32 语义量化。
     */
    setScale(scale6) {
      if (!setFloat32ComponentsIfChanged(this.scaleValue, scale6)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 把当前 local matrix 复制到调用者提供的输出矩阵。
     *
     * @param out - 由调用者拥有并接收结果的 mat4。
     *
     * @remarks
     * 如果 TRS 自上次计算后没有变化，该方法只执行复制；否则先按需更新内部缓存。
     * 调用者修改 `out` 不会污染 Transform 的内部矩阵。
     */
    copyLocalMatrixTo(out) {
      this.updateLocalMatrixIfNeeded();
      mat4_exports.copy(out, this.localMatrixValue);
    }
    /**
     * 统一记录一次真实 local TRS 修改。
     *
     * @remarks
     * 一个 setter 无论修改几个分量都只调用一次，因此 version 恰好增加一次。
     * 多次 setter 可以让 dirty 保持 true，但每次真实状态变化仍拥有独立 version。
     */
    invalidateLocalMatrix() {
      this.localMatrixDirty = true;
      this.versionValue += 1;
    }
    /**
     * 在缓存失效时根据 translation、rotation、scale 重算 local matrix。
     *
     * @remarks
     * 成功重算只会清除 dirty，不会修改 version。version 描述的是 TRS 状态变化，
     * 不是矩阵缓存被读取或计算的次数。
     */
    updateLocalMatrixIfNeeded() {
      if (!this.localMatrixDirty) return;
      const rotationQuaternion = quat_exports.create();
      quat_exports.fromEuler(
        rotationQuaternion,
        this.rotationValue[0] * RADIANS_TO_DEGREES,
        this.rotationValue[1] * RADIANS_TO_DEGREES,
        this.rotationValue[2] * RADIANS_TO_DEGREES
      );
      mat4_exports.fromRotationTranslationScale(
        this.localMatrixValue,
        rotationQuaternion,
        this.positionValue,
        this.scaleValue
      );
      this.localMatrixDirty = false;
    }
  };
  __name(_Transform, "Transform");
  var Transform = _Transform;

  // src/rendering/scene/SceneNode.ts
  var _SceneNode = class _SceneNode {
    constructor() {
      /**
       * 面向开发者的可读标签。
       *
       * @remarks
       * name 可以为空、可以修改、也可以与其他节点重复，不能作为机器身份或缓存键。
       */
      __publicField(this, "name", "");
      /**
       * 当前节点及其子树是否参加 visible traversal。
       *
       * @remarks
       * `traverseVisible()` 遇到 false 时会跳过整个子树，而不只是跳过当前节点。
       */
      __publicField(this, "visible", true);
      /**
       * 节点唯一的 local Transform。
       *
       * `readonly` 禁止调用者替换 Transform 对象，但仍允许调用它的 TRS setter。
       */
      __publicField(this, "transform", new Transform());
      /**
       * 结构变化产生的显式失效标志。
       *
       * @remarks
       * reparent 可能发生在 local Transform 和 parent version 都没有变化时，因此不能只靠
       * 两个版本号判断；移动节点及其后代时必须递归设置该标志。
       */
      __publicField(this, "worldMatrixDirty", true);
      /**
       * 创建节点时生成并永久保存的完整 UUID v4。
       *
       * @remarks
       * 短 UUID 只允许由 debugLabel 派生用于显示，内部身份始终保留完整字符串。
       */
      __publicField(this, "uuidValue", globalThis.crypto.randomUUID());
      // TODO(scene-serialization): When saving and reloading the same logical scene,
      // restore its original full UUID. clone() and repeated instantiation of the
      // same asset must allocate new UUIDs. SceneLoader must reject duplicate UUIDs
      // within one Scene. Do not add a general-purpose public UUID setter;
      // restoration must use a constrained loader-only mechanism.
      /** 当前父节点；null 表示该节点是一个 root。 */
      __publicField(this, "parentValue", null);
      /** 按插入顺序保存的直接子节点。 */
      __publicField(this, "childrenValue", []);
      /** 最近一次计算得到的世界矩阵缓存。 */
      __publicField(this, "worldMatrixValue", mat4_exports.create());
      /**
       * 最近一次世界矩阵计算观察到的 local Transform.version。
       *
       * @remarks
       * 当前值与 `transform.version` 不同时，说明 worldMatrixValue 尚未包含最新 local TRS。
       * 初始值 -1 与 Transform 从 0 开始的版本不相等，确保第一次更新必定执行。
       */
      __publicField(this, "observedTransformVersion", -1);
      /**
       * 最近一次世界矩阵计算观察到的 parent.worldVersion。
       *
       * @remarks
       * 即使当前节点的 local Transform 没变，parent 的 world matrix 变化也会改变当前节点
       * 的世界位置。root 使用 -1 代表“没有 parent”。
       */
      __publicField(this, "observedParentWorldVersion", -1);
      /**
       * 每次真正重算 worldMatrixValue 时恰好增加一次的单调版本号。
       *
       * @remarks
       * [DESIGN-WEIGHT:1][version-safe-integer-horizon]
       *
       * 子节点通过该值判断 parent world matrix 是否产生了新版本。重复调用
       * `updateWorldMatrix()` 但缓存仍有效时不会增加。
       *
       * JavaScript `number` 在 `Number.MAX_SAFE_INTEGER` 以内可精确表示整数。即使同一个
       * 节点每秒重算 60 次，也需要约 476 万年才会到达该上限，因此当前实时渲染生命周期
       * 不引入 BigInt 或回绕协议。
       */
      __publicField(this, "worldVersionValue", 0);
    }
    /**
     * 获取完整且稳定的机器身份。
     *
     * @returns 创建节点时生成的完整 UUID v4。
     *
     * @remarks
     * 该属性只有 getter，没有普通 public setter。
     */
    get uuid() {
      return this.uuidValue;
    }
    /**
     * 获取不受打包器类名压缩影响的稳定诊断类型。
     *
     * @returns 当前节点类型用于日志显示的稳定名称。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     *
     * SceneNode 本身是可直接实例化的具体类，因此提供 `'SceneNode'` 默认实现，而不是
     * 声明 abstract member。Group、Scene、Mesh 等子类可以 override 该 getter，返回
     * 显式字符串；生产构建即使重命名 constructor，也不会改变 debugLabel。
     */
    get debugType() {
      return "SceneNode";
    }
    /**
     * 获取面向日志和调试界面的短显示标签。
     *
     * @returns `${name 或稳定 debugType}#${UUID 前 8 位}`。
     *
     * @remarks
     * debugLabel 不是机器身份、序列化主键或 ResourceManager 缓存键。
     * 不使用 `this.constructor.name`，避免生产打包器重命名类后使日志失去可读性。
     */
    get debugLabel() {
      const readableName = this.name || this.debugType;
      return `${readableName}#${this.uuidValue.slice(0, 8)}`;
    }
    /** 获取当前父节点。 */
    get parent() {
      return this.parentValue;
    }
    /**
     * 获取直接子节点的浅拷贝。
     *
     * @returns 保持插入顺序的新数组。
     *
     * @remarks
     * 返回副本可以阻止调用者绕过 add/remove 修改内部数组并破坏双向关系。
     */
    get children() {
      return [...this.childrenValue];
    }
    /**
     * 获取世界矩阵缓存版本。
     *
     * @remarks
     * local 或 parent 变化不会立刻增加该值；只有 `updateWorldMatrix()` 真正重算时增加。
     * `observedParentWorldVersion` 是子节点保存的旧快照，本 getter 返回的是当前节点对外
     * 发布的新版本；二者形成 parent 到 child 的缓存失效通知链。
     */
    get worldVersion() {
      return this.worldVersionValue;
    }
    /**
     * 原子地把一个或多个节点接到当前节点下面。
     *
     * @param nodes - 按参数顺序接入的节点。
     * @returns 当前节点，支持链式调用。
     *
     * @throws {@link DuplicateSceneNodeError}
     * 同一次调用中出现相同节点对象时抛出，并保证树完全不变。
     *
     * @throws {@link SceneGraphCycleError}
     * 接入当前节点自身或其祖先时抛出，并保证树完全不变。
     *
     * @remarks
     * 方法先完成全部验证，之后才进行 detach/attach。节点已有旧 parent 时会先从旧 parent
     * 原子移除；local Transform 保持不变，但移动节点及其后代的世界矩阵缓存全部失效。
     */
    add(...nodes) {
      const seen = /* @__PURE__ */ new Set();
      for (const node of nodes) {
        if (seen.has(node)) throw new DuplicateSceneNodeError(node.debugLabel);
        seen.add(node);
        this.assertCanAdopt(node);
      }
      for (const node of nodes) {
        node.removeFromParent();
        node.parentValue = this;
        this.childrenValue.push(node);
        node.markWorldMatrixDirtyRecursively();
      }
      return this;
    }
    /**
     * 从当前节点移除一个直接子节点。
     *
     * @param node - 尝试移除的节点。
     * @returns 当前节点，支持链式调用。
     *
     * @remarks
     * node 不是直接子节点时保持幂等，不抛错也不修改其他关系。
     */
    remove(node) {
      const childIndex = this.childrenValue.indexOf(node);
      if (childIndex === -1) {
        return this;
      }
      this.childrenValue.splice(childIndex, 1);
      node.parentValue = null;
      node.markWorldMatrixDirtyRecursively();
      return this;
    }
    /**
     * 从当前 parent 移除自身。
     *
     * @returns 当前节点，支持链式调用。
     */
    removeFromParent() {
      if (this.parentValue !== null) {
        this.parentValue.remove(this);
      }
      return this;
    }
    /**
     * 断开全部直接子节点并保持双方关系一致。
     *
     * @returns 当前节点，支持链式调用。
     */
    removeAllChildren() {
      for (const child of this.childrenValue) {
        child.parentValue = null;
        child.markWorldMatrixDirtyRecursively();
      }
      this.childrenValue.length = 0;
      return this;
    }
    /**
     * 以先父后子的深度优先顺序访问当前节点及全部后代。
     *
     * @param visitor - 对每个节点同步调用的处理函数。
     */
    traverse(visitor) {
      visitor(this);
      for (const child of this.childrenValue) {
        child.traverse(visitor);
      }
    }
    /**
     * 以先父后子的深度优先顺序访问可见节点。
     *
     * @param visitor - 对每个可见节点同步调用的处理函数。
     *
     * @remarks
     * 当前节点不可见时立即返回，不访问 visitor，也不继续访问任何后代。
     */
    traverseVisible(visitor) {
      if (!this.visible) {
        return;
      }
      visitor(this);
      for (const child of this.childrenValue) {
        child.traverseVisible(visitor);
      }
    }
    /**
     * 按需更新当前节点的世界矩阵。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][scene-node-local-world-cache-separation]
     *
     * 更新顺序固定为：
     *
     * 1. 先确保 parent 世界矩阵最新；
     * 2. 比较 local Transform.version、parent worldVersion 和结构 dirty flag；
     * 3. 没有变化时直接返回；
     * 4. 把 local matrix 直接复制进 worldMatrixValue；
     * 5. 非 root 原地计算 `parent world * local`，root 在上一步已经完成；
     * 6. 记录观察到的版本并增加本节点 worldVersion。
     *
     * 三类失效来源分别由不同状态检测：
     *
     * - `observedTransformVersion` 检测自己的 local TRS 变化；
     * - `observedParentWorldVersion` 检测 parent world matrix 变化；
     * - `worldMatrixDirty` 检测 reparent 等结构变化。
     *
     * dirty 不能被两个版本号完全替代：两个不同 parent 可能碰巧具有相同的
     * worldVersion 数字，但它们的 world matrix 不同。reparent 必须显式使缓存失效。
     *
     * [DESIGN-WEIGHT:2][scene-node-in-place-world-matrix]
     *
     * Transform 是管理 TRS、version 和 local-matrix cache 的对象，不是 `mat4`。
     * 本方法先通过复制 API 把 local matrix 写入 `worldMatrixValue`，再把同一个矩阵同时
     * 作为 `mat4.multiply()` 的输出和右操作数：
     *
     * ```text
     * out = parentWorld × out
     * ```
     *
     * 当前 gl-matrix 实现明确支持 `out === b`：它会在覆盖每组输出前缓存对应的右操作数。
     * 这样无需为每个 SceneNode 永久保存第二个 mat4。乘法顺序不能交换；parent 带旋转或
     * scale 时，`local × parentWorld` 会产生不同且错误的世界变换。
     */
    updateWorldMatrix() {
      let parentWorldVersion = -1;
      if (this.parentValue !== null) {
        this.parentValue.updateWorldMatrix();
        parentWorldVersion = this.parentValue.worldVersionValue;
      }
      const transformVersion = this.transform.version;
      const cacheIsCurrent = !this.worldMatrixDirty && this.observedTransformVersion === transformVersion && this.observedParentWorldVersion === parentWorldVersion;
      if (cacheIsCurrent) {
        return;
      }
      this.transform.copyLocalMatrixTo(this.worldMatrixValue);
      if (this.parentValue !== null) {
        mat4_exports.multiply(this.worldMatrixValue, this.parentValue.worldMatrixValue, this.worldMatrixValue);
      }
      this.observedTransformVersion = transformVersion;
      this.observedParentWorldVersion = parentWorldVersion;
      this.worldMatrixDirty = false;
      this.worldVersionValue += 1;
    }
    /**
     * 把最新世界矩阵复制到调用者提供的输出矩阵。
     *
     * @param out - 由调用者拥有并接收结果的 mat4。
     *
     * @remarks
     * 方法会先按需更新当前节点及祖先。调用者修改 out 不会污染内部世界矩阵缓存。
     */
    copyWorldMatrixTo(out) {
      this.updateWorldMatrix();
      mat4_exports.copy(out, this.worldMatrixValue);
    }
    /**
     * 验证当前节点是否可以收养目标节点。
     *
     * @param node - 准备接入的目标节点。
     * @throws {@link SceneGraphCycleError} node 是当前节点或当前节点祖先时抛出。
     *
     * @remarks
     * 新增边 `this → node` 只会在 node 已位于 this 的祖先链上时形成循环。
     * 因此从 this 沿 parent 向上检查即可，复杂度为 O(tree height)、额外空间 O(1)。
     */
    assertCanAdopt(node) {
      for (let current = this; current !== null; current = current.parentValue) {
        if (current === node) throw new SceneGraphCycleError(this.debugLabel, node.debugLabel);
      }
    }
    /**
     * 递归使当前节点及其全部后代的世界矩阵缓存失效。
     *
     * @remarks
     * 结构变化不会立即重算矩阵或增加 worldVersion；真正的更新仍由
     * `updateWorldMatrix()` 延迟执行。
     */
    markWorldMatrixDirtyRecursively() {
      this.worldMatrixDirty = true;
      for (const child of this.childrenValue) {
        child.markWorldMatrixDirtyRecursively();
      }
    }
  };
  __name(_SceneNode, "SceneNode");
  var SceneNode = _SceneNode;

  // src/rendering/scene/Mesh.ts
  var _Mesh = class _Mesh extends SceneNode {
    /**
     * @param geometry - 未释放的逻辑几何资源。
     * @param material - 未释放的逻辑材质资源。
     * @throws {@link InvalidMeshError} 输入不是对应的逻辑资源实例。
     * @throws ResourceDisposedError 对应资源已释放。
     */
    constructor(geometry, material) {
      super();
      /** 借用原 Geometry 的身份，不持有独立副本。 */
      __publicField(this, "geometryValue");
      /** 借用原 Material 的身份，多个 Mesh 可以共享同一材质。 */
      __publicField(this, "materialValue");
      if (!(geometry instanceof Geometry)) throw new InvalidMeshError("geometry");
      if (!(material instanceof Material)) throw new InvalidMeshError("material");
      geometry.assertUsable();
      material.assertUsable();
      this.geometryValue = geometry;
      this.materialValue = material;
    }
    /** 稳定诊断类型，不依赖打包后的 constructor.name。 */
    get debugType() {
      return "Mesh";
    }
    /**
     * 返回借用的原 Geometry；不允许通过赋值替换引用。
     * @throws ResourceDisposedError Geometry 已被其所有者释放。
     */
    get geometry() {
      this.geometryValue.assertUsable();
      return this.geometryValue;
    }
    /**
     * 返回借用的原 Material；这里只验证 Material 自身的生命周期。
     * shader/texture 依赖在 Material 及后续实际消费路径中分别验证。
     * @throws ResourceDisposedError Material 已被其所有者释放。
     */
    get material() {
      this.materialValue.assertUsable();
      return this.materialValue;
    }
  };
  __name(_Mesh, "Mesh");
  var Mesh = _Mesh;

  // src/rendering/scene/Group.ts
  var _Group = class _Group extends SceneNode {
    /**
     * 为 debugLabel 提供不受生产构建类名压缩影响的稳定类型。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     *
     * 如果不覆写该 getter，未命名的 Group 会继承 `'SceneNode'`，最终显示为
     * `SceneNode#xxxxxxxx`。显式返回 `'Group'` 后，即使打包器重命名 JavaScript
     * constructor，诊断输出仍然保持稳定。
     */
    get debugType() {
      return "Group";
    }
  };
  __name(_Group, "Group");
  var Group = _Group;

  // src/rendering/scene/Scene.ts
  var _Scene = class _Scene extends Group {
    constructor() {
      super(...arguments);
      /**
       * Scene 是否已经开始或完成释放。
       *
       * @remarks
       * 这是单向状态：false 可以变成 true，但不能重新变回 false。
       */
      __publicField(this, "disposedValue", false);
      /**
       * 当前 Scene 已经登记过的共享 Resource。
       *
       * @remarks
       * Set 保证每个 Scene 对同一 Resource 最多贡献一个引用。该 Set 记录的是当前 Scene
       * 自己的登记关系；总引用数量保存在每个 Resource.sceneReferenceCount 中。
       */
      __publicField(this, "retainedResources", /* @__PURE__ */ new Set());
    }
    /**
     * 为 debugLabel 提供稳定的 Scene 类型。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     */
    get debugType() {
      return "Scene";
    }
    /**
     * 获取 Scene 是否已经进入 disposed 状态。
     */
    get disposed() {
      return this.disposedValue;
    }
    /**
     * 为当前 Scene 登记一个 Resource 存活引用。
     *
     * @param resource - 当前 Scene 将要使用的 Resource。
     * @returns 原样返回具体 Resource 子类型，方便创建和登记写在同一个表达式中。
     *
     * @throws {@link ResourceDisposedError}
     * Scene 已经开始释放，或者 Resource 已经真正释放时抛出。
     *
     * @remarks
     * 方法先检查 Set。重复 retain 同一个对象时直接返回，不重复增加引用。
     *
     * 首次登记时先调用 Resource.retainSceneReference()，成功后才写入 Set。这样如果
     * Resource 已经 disposed 并拒绝 retain，Scene 不会留下错误的登记记录。
     *
     * @example
     * ```ts
     * const geometry = scene.retain(new Geometry(...))
     * ```
     */
    retain(resource) {
      if (this.disposedValue) throw new ResourceDisposedError("Scene");
      if (this.retainedResources.has(resource)) return resource;
      resource.retainSceneReference();
      this.retainedResources.add(resource);
      return resource;
    }
    /**
     * 释放当前 Scene 对一个 Resource 的存活引用。
     *
     * @param resource - 当前 Scene 不再使用的 Resource。
     * @returns 当前 Scene 确实持有该引用并成功释放时返回 true；否则返回 false。
     *
     * @remarks
     * 方法先从 Set 删除，再调用 Resource.releaseSceneReference()。这个顺序保证最后一个
     * 引用触发同步 dispose listener 时，listener 再次调用 `scene.release(resource)`
     * 会看到该登记已经不存在，不会递归释放同一个引用。
     *
     * Scene.dispose() 开始后返回 false，防止一个 Resource listener 取消同一轮中尚未
     * 处理的其他 Resource 引用。
     */
    release(resource) {
      if (this.disposedValue) return false;
      if (!this.retainedResources.delete(resource)) return false;
      resource.releaseSceneReference();
      return true;
    }
    /**
     * 以幂等方式释放场景层级和当前 Scene 持有的所有 Resource 引用。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][scene-dispose-order]
     *
     * 正常路径顺序固定为：
     *
     * 1. 把 Scene 标记为 disposed；
     * 2. 断开全部直接 child；
     * 3. 对每个 retained Resource 调用 releaseSceneReference()；
     * 4. 清空当前 Scene 的 retainedResources Set。
     *
     * Scene 不再直接调用 Resource.dispose()。如果其他 Scene 仍持有同一 Resource，
     * 引用数只会减少；如果当前 Scene 持有最后一个引用，Resource 会自动真正清理。
     *
     * Resource listener 抛错时是否继续释放剩余资源仍遵循
     * `src/rendering/TODOList.md` 中尚未确定的异常策略。
     */
    dispose() {
      if (this.disposedValue) return;
      this.disposedValue = true;
      this.removeAllChildren();
      for (const resource of this.retainedResources) {
        resource.releaseSceneReference();
      }
      this.retainedResources.clear();
    }
  };
  __name(_Scene, "Scene");
  var Scene = _Scene;

  // src/rendering/scene/cameras/Camera.ts
  var _Camera = class _Camera extends SceneNode {
    /** 仅允许具体相机子类选择公开的构造参数。 */
    constructor() {
      super();
      /** 固定使用 Float32 缓冲；子类在构造结束前写入自己的有效投影。 */
      __publicField(this, "projectionMatrixValue", mat4_exports.identity(new Float32Array(16)));
      /** 构造完成为 0，每次成功的投影配置修改增加一次。 */
      __publicField(this, "projectionVersionValue", 0);
    }
    /** 提供稳定的基类诊断类型；具体相机可以覆盖。 */
    get debugType() {
      return "Camera";
    }
    /**
     * 投影配置的版本，而不是读取次数。
     * 移动相机、更新 world matrix、复制 projection matrix 都不增加它。
     */
    get projectionVersion() {
      return this.projectionVersionValue;
    }
  };
  __name(_Camera, "Camera");
  var Camera = _Camera;

  // src/rendering/frame/copyMat4Snapshot.ts
  function copyMat4Snapshot(source, fieldName) {
    if (source === null || typeof source !== "object" || source.length !== 16)
      throw new InvalidRenderViewError(fieldName, "must contain exactly 16 components");
    for (let i = 0; i < 16; i++) {
      if (!Number.isFinite(source[i]))
        throw new InvalidRenderViewError(fieldName, "component " + i + " must be finite");
    }
    const result = [
      source[0],
      source[1],
      source[2],
      source[3],
      source[4],
      source[5],
      source[6],
      source[7],
      source[8],
      source[9],
      source[10],
      source[11],
      source[12],
      source[13],
      source[14],
      source[15]
    ];
    return Object.freeze(result);
  }
  __name(copyMat4Snapshot, "copyMat4Snapshot");

  // src/rendering/frame/RenderList.ts
  function snapshotItem(item) {
    return Object.freeze({
      geometry: item.geometry,
      material: item.material,
      worldMatrix: copyMat4Snapshot(item.worldMatrix, "item.worldMatrix")
    });
  }
  __name(snapshotItem, "snapshotItem");
  var _RenderList = class _RenderList {
    /** 复制输入队列、item 和矩阵，隔离构造调用者后续的修改。 */
    constructor(backgroundList, opaque) {
      __publicField(this, "background");
      __publicField(this, "opaque");
      this.background = Object.freeze(backgroundList.map(snapshotItem));
      this.opaque = Object.freeze(opaque.map(snapshotItem));
      Object.freeze(this);
    }
  };
  __name(_RenderList, "RenderList");
  var RenderList = _RenderList;

  // src/rendering/frame/RenderListBuilder.ts
  var _RenderListBuilder = class _RenderListBuilder {
    /**
     * 复制相机 → 更新根节点 → 可见遍历 → 分类 → 冻结。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][frame-camera-value-snapshot]
     *
     * viewMatrix 是 camera world matrix 的逆；不可逆或非有限时拒绝本次提取，
     * 不用单位矩阵掩盖错误。局部临时缓冲不会被返回给调用者。
     */
    build(view) {
      if (view === null || typeof view !== "object")
        throw new InvalidRenderViewError("view", "must be an object");
      const { scene, camera } = view;
      if (!(scene instanceof Scene)) throw new InvalidRenderViewError("scene", "must be a Scene");
      if (!(camera instanceof Camera)) throw new InvalidRenderViewError("camera", "must be a Camera");
      if (scene.disposed) throw new ResourceDisposedError("Scene");
      const cameraWorld = new Float32Array(16);
      const viewMatrix = new Float32Array(16);
      const projection2 = new Float32Array(16);
      camera.copyWorldMatrixTo(cameraWorld);
      const world = copyMat4Snapshot(cameraWorld, "camera.worldMatrix");
      if (mat4_exports.invert(viewMatrix, world) === null)
        throw new InvalidRenderViewError("camera.worldMatrix", "must be invertible");
      camera.copyProjectionMatrixTo(projection2);
      const position = Object.freeze([world[12], world[13], world[14]]);
      const viewState = Object.freeze({
        viewMatrix: copyMat4Snapshot(viewMatrix, "camera.viewMatrix"),
        projectionMatrix: copyMat4Snapshot(projection2, "camera.projectionMatrix"),
        cameraWorldPosition: position
      });
      scene.updateWorldMatrix();
      const background = [];
      const opaque = [];
      const scratch = new Float32Array(16);
      scene.traverseVisible((node) => {
        if (!(node instanceof Mesh)) return;
        node.copyWorldMatrixTo(scratch);
        const renderItem = {
          geometry: node.geometry,
          material: node.material,
          worldMatrix: copyMat4Snapshot(scratch, "mesh.worldMatrix")
        };
        if (renderItem.material.queue === "background") {
          background.push(renderItem);
        } else {
          opaque.push(renderItem);
        }
      });
      return Object.freeze({
        viewState,
        renderList: new RenderList(background, opaque)
      });
    }
  };
  __name(_RenderListBuilder, "RenderListBuilder");
  var RenderListBuilder = _RenderListBuilder;

  // src/rendering/passes/RenderPipeline.ts
  var _RenderPipeline = class _RenderPipeline {
    constructor() {
      __publicField(this, "passes", []);
      /**
       * WeakSet 不阻止移除后的 Pass 被 GC，
       * 但能拒绝重新加入本 Pipeline 已释放的实例。
       */
      __publicField(this, "accepted", /* @__PURE__ */ new WeakSet());
      /**
       * Pipeline 的生命周期；与表示当前调用尚未退出的 busy 分开记录。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][pipeline-cleanup-only-state]
       *
       * closing 表示只能继续清理整个 Pipeline，不代表此刻仍在运行 dispose。
       * 主动 dispose 或 removePass 中的释放失败都会进入该状态。
       * 此后 addPass、removePass、execute 均被拒绝；后续清理入口是 dispose。
       */
      __publicField(this, "state", "active");
      /** 包括执行或释放中的同步回调；禁止其重入或修改本 Pipeline。 */
      __publicField(this, "busy", false);
    }
    /** 包括执行或释放中的同步回调；禁止其重入或修改本 Pipeline。 */
    addPass(pass) {
      this.assertIdle("addPass");
      if (this.accepted.has(pass))
        throw new RenderExecutionError("RenderPipeline", "addPass", "pass was already accepted");
      this.accepted.add(pass);
      this.passes.push(pass);
    }
    /**
     * 成功释放后才移除。
     * 失败时保留所有权，转入只允许 dispose 重试的状态。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][pipeline-cleanup-only-state]
     *
     * pass.dispose 抛错时，该 Pass 可能已经部分释放，不能继续执行。
     * splice 尚未发生，所以失败的 Pass 留在列表中，避免遗失剩余清理责任。
     * 本版选择终止整个 Pipeline 的使用：调用者处理异常后调用 dispose，
     * 按登记顺序清理所有剩余 Pass；不是重新调用 removePass 重试单项移除。
     */
    removePass(pass) {
      this.assertIdle("removePass");
      const index = this.passes.indexOf(pass);
      if (index === -1) return false;
      this.busy = true;
      try {
        pass.dispose();
        this.passes.splice(index, 1);
        return true;
      } catch (error) {
        this.state = "closing";
        throw error;
      } finally {
        this.busy = false;
      }
    }
    /**
     * 顺序执行。
     * 异常中止后续 Pass，finally 允许调用者修复后发起下一帧。
     */
    execute(context) {
      this.assertIdle("execute");
      this.busy = true;
      try {
        for (const pass of this.passes) {
          pass.execute(context);
        }
      } finally {
        this.busy = false;
      }
    }
    /*
     * TODO(render-pipeline-disposal-order-and-progress): 后续增加大量 Pass 或跨 Pass
     * 资源依赖时重新评估以下事项；当前仍按登记顺序清理，不在此改变运行时契约。
     *
     * 1. 清理顺序应依据 dispose 期间的真实依赖，而非直接套用执行或登记顺序。
     *    若改为逆序或依赖顺序，先明确资源所有权与借用关系，再更新文档及顺序测试。
     * 2. 评估反复 shift 的成本；逐项前移模型下存在 O(n²) 的数组管理开销，
     *    但实际成本取决于引擎优化。保持正序时可改用持久化游标，最后一次性清空数组；
     *    不应只为性能直接换成 pop，因为它会改变清理顺序。
     * 3. 游标只在当前 Pass 释放成功后递增，并跨 dispose 调用保存。
     *    抛错时保留失败项及后续项，重试跳过成功项；继续保留 closing 与 busy 防重入约束。
     * 4. 简单游标会暂时保留成功项的强引用；若需立即解除引用，应清空已完成槽位，
     *    并同步调整内部数组类型和访问不变量，不能仅移动游标就视为已经移除引用。
     * 5. 改动时回归验证清理顺序、首项/中间项/末项失败、显式重试、同步重入及完成后幂等；
     *    保持 Renderer 先完成 Pipeline 清理、再释放 Backend 的跨层依赖顺序。
     */
    /**
     * 按当前顺序清理；成功的 Pass 立即从待清理列表移除。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-dispose-retry-order]
     *
     * 抛错时保留失败项和后续项，禁止恢复 render/add/remove，
     * 只能显式重试 dispose。
     *
     * 不自动重试、不吞错，也不把尚未完成的清理标成成功。
     */
    dispose() {
      if (this.state === "disposed") return;
      this.assertNotBusy("dispose");
      this.state = "closing";
      this.busy = true;
      try {
        while (this.passes.length > 0) {
          const pass = this.passes[0];
          pass.dispose();
          this.passes.shift();
        }
        this.state = "disposed";
      } finally {
        this.busy = false;
      }
    }
    /** 状态检查集中在公共操作入口，避免各方法遗漏相同的生命周期约束。 */
    assertIdle(operation) {
      if (this.state !== "active") throw new ResourceDisposedError("RenderPipeline");
      this.assertNotBusy(operation);
    }
    /**
     * 统一拒绝同步重入，不检查 active/closing/disposed 生命周期。
     *
     * @remarks
     * assertIdle 先要求 active，再调用本方法；dispose 则在处理 disposed 后
     * 直接调用本方法，因此可以在 closing 且 busy=false 时继续清理。
     * busy 判断及其领域错误只在这里定义，两个入口复用同一份逻辑。
     */
    assertNotBusy(operation) {
      if (this.busy)
        throw new RenderExecutionError("RenderPipeline", operation, "operation in progress");
    }
  };
  __name(_RenderPipeline, "RenderPipeline");
  var RenderPipeline = _RenderPipeline;

  // src/rendering/passes/ForwardPass.ts
  var _ForwardPass = class _ForwardPass {
    constructor() {
      __publicField(this, "name", "ForwardPass");
    }
    execute(context) {
      context.backend.withRenderSurface(
        {
          surface: { kind: "default-framebuffer" },
          clear: {
            color: [0, 0, 0, 1],
            depth: 1
          }
        },
        () => {
          for (const item of context.renderList.background) {
            context.backend.draw({
              item,
              view: context.view
            });
          }
          for (const item of context.renderList.opaque) {
            context.backend.draw({
              item,
              view: context.view
            });
          }
          return void 0;
        }
      );
    }
    /** 当前 Pass 不持有独立资源；空实现不代表可以释放借用的 Material。 */
    dispose() {
    }
  };
  __name(_ForwardPass, "ForwardPass");
  var ForwardPass = _ForwardPass;

  // src/rendering/scene/cameras/PerspectiveCamera.ts
  function copyValidatedOptions(options) {
    assertNonArrayObject(
      options,
      () => new InvalidPerspectiveCameraError("options", "must be a non-array object")
    );
    const fovYInput = options.fovY;
    const fovY = requireFiniteNumber(
      fovYInput,
      () => new InvalidPerspectiveCameraError("fovY", "must be a finite number", { received: fovYInput })
    );
    const aspectInput = options.aspect;
    const aspect = requireFiniteNumber(
      aspectInput,
      () => new InvalidPerspectiveCameraError("aspect", "must be a finite number", {
        received: aspectInput
      })
    );
    const nearInput = options.near;
    const near = requireFiniteNumber(
      nearInput,
      () => new InvalidPerspectiveCameraError("near", "must be a finite number", { received: nearInput })
    );
    const farInput = options.far;
    const far = requireFiniteNumber(
      farInput,
      () => new InvalidPerspectiveCameraError("far", "must be a finite number", { received: farInput })
    );
    if (fovY <= 0 || fovY >= Math.PI) {
      throw new InvalidPerspectiveCameraError("fovY", "must satisfy 0 < fovY < PI", { fovY });
    }
    if (aspect <= 0) {
      throw new InvalidPerspectiveCameraError("aspect", "must be positive", { aspect });
    }
    if (near <= 0) {
      throw new InvalidPerspectiveCameraError("near", "must be positive", { near });
    }
    if (far <= near) {
      throw new InvalidPerspectiveCameraError("far", "must be greater than near", { near, far });
    }
    return { fovY, aspect, near, far };
  }
  __name(copyValidatedOptions, "copyValidatedOptions");
  function createProjection(options) {
    const matrix = new Float32Array(16);
    const { fovY, aspect, near, far } = options;
    mat4_exports.perspective(matrix, fovY, aspect, near, far);
    for (const value of matrix) {
      if (!Number.isFinite(value))
        throw new InvalidPerspectiveCameraError(
          "projectionMatrix",
          "must contain only finite Float32 values",
          { ...options }
        );
    }
    if (matrix[0] === 0 || matrix[5] === 0 || matrix[14] === 0) {
      throw new InvalidPerspectiveCameraError(
        "projectionMatrix",
        "must not collapse a projection axis or depth term to zero",
        { ...options }
      );
    }
    return matrix;
  }
  __name(createProjection, "createProjection");
  var _PerspectiveCamera = class _PerspectiveCamera extends Camera {
    /**
     * 完成构造时投影已经有效，初始 projectionVersion 为 0。
     * @param options - 完整的初始透视参数。
     * @throws {@link InvalidPerspectiveCameraError} 参数或生成的矩阵不可用。
     */
    constructor(options) {
      super();
      /** 当前已提交的垂直视场角，单位为弧度。 */
      __publicField(this, "fovYValue");
      /** 当前已提交的宽高比。 */
      __publicField(this, "aspectValue");
      /** 当前已提交的近裁剪距离。 */
      __publicField(this, "nearValue");
      /** 当前已提交的远裁剪距离。 */
      __publicField(this, "farValue");
      const next = copyValidatedOptions(options);
      const projection2 = createProjection(next);
      this.fovYValue = next.fovY;
      this.aspectValue = next.aspect;
      this.nearValue = next.near;
      this.farValue = next.far;
      mat4_exports.copy(this.projectionMatrixValue, projection2);
    }
    /** 不依赖 constructor.name 的稳定诊断类型。 */
    get debugType() {
      return "PerspectiveCamera";
    }
    /** 已提交的垂直视场角，单位为弧度。 */
    get fovY() {
      return this.fovYValue;
    }
    /** 已提交的视口宽 / 高。 */
    get aspect() {
      return this.aspectValue;
    }
    /** 已提交的近裁剪距离。 */
    get near() {
      return this.nearValue;
    }
    /** 已提交的远裁剪距离。 */
    get far() {
      return this.farValue;
    }
    /**
     * 原子地提交完整透视配置；完全相同的参数不会重算或增加版本。
     * 不接受部分更新；调用者需显式保留其余字段。
     * @param options - 完整的新透视参数。
     * @throws {@link InvalidPerspectiveCameraError} 验证失败时旧状态不变。
     */
    setPerspective(options) {
      const next = copyValidatedOptions(options);
      if (next.fovY === this.fovYValue && next.aspect === this.aspectValue && next.near === this.nearValue && next.far === this.farValue) {
        return;
      }
      const projection2 = createProjection(next);
      this.fovYValue = next.fovY;
      this.aspectValue = next.aspect;
      this.nearValue = next.near;
      this.farValue = next.far;
      mat4_exports.copy(this.projectionMatrixValue, projection2);
      this.projectionVersionValue++;
    }
    /**
     * 复制投影，不重算、不增加版本，也不把内部缓冲交给外部。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][camera-projection-copy]
     *
     * @param out - 调用者提供的 16 分量矩阵；内容会被覆盖。
     */
    copyProjectionMatrixTo(out) {
      mat4_exports.copy(out, this.projectionMatrixValue);
    }
  };
  __name(_PerspectiveCamera, "PerspectiveCamera");
  var PerspectiveCamera = _PerspectiveCamera;

  // src/rendering/resources/VertexAttribute.ts
  var ATTRIBUTE_DIAGNOSTIC_NAME = "attribute";
  function copyVertexAttributeData(data) {
    if (data instanceof Float32Array) return new Float32Array(data);
    if (data instanceof Int8Array) return new Int8Array(data);
    if (data instanceof Uint8Array) return new Uint8Array(data);
    if (data instanceof Int16Array) return new Int16Array(data);
    if (data instanceof Uint16Array) return new Uint16Array(data);
    throw new InvalidVertexAttributeError(
      ATTRIBUTE_DIAGNOSTIC_NAME,
      "uses an unsupported TypedArray type"
    );
  }
  __name(copyVertexAttributeData, "copyVertexAttributeData");
  var _VertexAttribute = class _VertexAttribute {
    /**
     * 创建一个不可变顶点属性。
     *
     * @param options.data - 需要复制保存的 CPU TypedArray。
     * @param options.itemSize - 每个顶点的分量数量。
     * @param options.normalized - 整数属性是否在 GPU 读取时归一化；默认 false。
     *
     * @throws {@link InvalidVertexAttributeError}
     * itemSize 不是有限正整数、数据长度不能被 itemSize 整除，或运行时传入不受支持
     * 的 TypedArray 时抛出。
     */
    constructor(options) {
      /** 每个顶点由多少个连续分量组成。 */
      __publicField(this, "itemSize");
      /**
       * WebGL 读取整数 TypedArray 时是否把整数范围归一化到浮点范围。
       *
       * @remarks
       * 该字段只描述顶点输入布局；VertexAttribute 自己不调用 WebGL API。
       */
      __publicField(this, "normalized");
      /** 构造时建立、永不向调用者直接暴露的 CPU 数据快照。 */
      __publicField(this, "dataValue");
      const { data, itemSize, normalized = false } = options;
      if (!Number.isInteger(itemSize) || itemSize <= 0) {
        throw new InvalidVertexAttributeError(
          ATTRIBUTE_DIAGNOSTIC_NAME,
          `itemSize must be a positive integer; received ${String(itemSize)}`
        );
      }
      if (data.length % itemSize !== 0) {
        throw new InvalidVertexAttributeError(
          ATTRIBUTE_DIAGNOSTIC_NAME,
          `data length ${data.length} is not divisible by itemSize ${itemSize}`
        );
      }
      this.dataValue = copyVertexAttributeData(data);
      this.itemSize = itemSize;
      this.normalized = normalized;
    }
    /**
     * 获取该属性包含的完整顶点数量。
     *
     * @returns `data.length / itemSize`。构造函数已经保证结果为非负整数。
     */
    get count() {
      return this.dataValue.length / this.itemSize;
    }
    /**
     * 复制完整属性数据。
     *
     * @returns 与内部存储具有相同具体 TypedArray 类型的新实例。
     *
     * @remarks
     * 返回副本而不是内部引用，是 VertexAttribute 对外不可变契约的一部分。调用者可以
     * 修改返回数组，但该修改不会影响下一次 copyData() 或使用本属性的 Geometry。
     */
    copyData() {
      return copyVertexAttributeData(this.dataValue);
    }
    /**
     * 把完整属性快照复制到调用者提供的目标数组。
     *
     * @param out - 与内部数据具有相同具体 TypedArray constructor 和长度的目标数组。
     *
     * @throws {@link InvalidVertexAttributeError}
     * 目标数组类型或长度不同。如果抛错，不会执行部分复制。
     *
     * @remarks
     * 要求相同 constructor 可以避免 Float32Array 到整数数组等隐式数值转换；
     * 要求相同 length 可以避免静默截断。
     */
    copyDataTo(out) {
      if (out.constructor !== this.dataValue.constructor) {
        throw new InvalidVertexAttributeError(
          ATTRIBUTE_DIAGNOSTIC_NAME,
          `copy target type ${out.constructor.name} does not match source type ${this.dataValue.constructor.name}`
        );
      }
      if (out.length !== this.dataValue.length) {
        throw new InvalidVertexAttributeError(
          ATTRIBUTE_DIAGNOSTIC_NAME,
          `copy target length ${out.length} does not match source length ${this.dataValue.length}`
        );
      }
      out.set(this.dataValue);
    }
  };
  __name(_VertexAttribute, "VertexAttribute");
  var VertexAttribute = _VertexAttribute;

  // src/rendering/backend/webgl1/WebGL1Capabilities.ts
  function reqiurePositiveLimit(value, name) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
      throw new UnsupportedRenderFeatureError(name, "must report a positive safe integer");
    return value;
  }
  __name(reqiurePositiveLimit, "reqiurePositiveLimit");
  function detectWebGL1Capabilities(gl) {
    if (gl.isContextLost()) throw new WebGLContextLostError("detect capabilities");
    const vertexArrayObject = gl.getExtension("OES_vertex_array_object");
    const elementIndexUint = gl.getExtension("OES_element_index_uint");
    const drawBuffers = gl.getExtension("WEBGL_draw_buffers");
    const depthTexture = gl.getExtension("WEBGL_depth_texture");
    const textureFloat = gl.getExtension("OES_texture_float");
    const textureFloatLinear = gl.getExtension("OES_texture_float_linear");
    const colorBufferFloat = gl.getExtension("WEBGL_color_buffer_float");
    const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    if (gl.isContextLost()) throw new WebGLContextLostError("detect capabilities");
    return Object.freeze({
      vertexArrayObject,
      elementIndexUint,
      drawBuffers,
      depthTexture,
      textureFloat,
      textureFloatLinear,
      colorBufferFloat,
      maxVertexAttributes: reqiurePositiveLimit(maxVertexAttributes, "MAX_VERTEX_ATTRIBS"),
      maxTextureUnits: reqiurePositiveLimit(maxTextureUnits, "MAX_TEXTURE_IMAGE_UNITS")
    });
  }
  __name(detectWebGL1Capabilities, "detectWebGL1Capabilities");

  // src/rendering/backend/webgl1/WebGLContextLifecycle.ts
  var _WebGLContextLifecycle = class _WebGLContextLifecycle {
    /**
     * 只借用事件接口，因此测试可传 EventTarget；真实运行传 HTMLCanvasElement。
     * 本类拥有两个 listener 的注册责任，但不拥有 canvas。
     */
    constructor(canvas, callbacks) {
      __publicField(this, "canvas");
      __publicField(this, "stateValue", "ready");
      __publicField(this, "failureValue", null);
      __publicField(this, "callbacks");
      /**
       * 同步重入的观察令牌；不是 GPU 资源版本或撤销历史。
       * 每次 lost、恢复尝试、dispose 都改变令牌，使旧回调不能覆盖新状态。
       */
      __publicField(this, "transitionVersion", 0);
      /**
       * 响应浏览器的 context 丢失通知，先禁止绘制，再通知 Backend 使缓存失效。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
       *
       * 这里处理的是「已经丢失之后怎么办」，不是主动调用 loseContext，
       * 也不是在事件中立即重建 GPU 资源。正常执行顺序如下：
       * 1. disposed 对象不再处理事件；dispose 已负责解除两个事件监听。
       * 2. 调用 preventDefault，表达允许浏览器后续尝试恢复的意愿。
       *    它不撤销已经发生的丢失，也不保证一定收到 restored 事件。
       * 3. 如果已经处于 lost，直接返回，避免重复执行 onLost 和清空诊断。
       *    preventDefault 放在这个判断之前，因此重复 lost 事件仍会被取消默认行为。
       * 4. 增加转换版本，先写入 lost 并清除上一轮失败，再同步执行 onLost。
       *    因而回调内观察到的 isReady 已为 false，不会把资源失效期间误判为可绘制。
       * 5. onLost 由 Backend 注入，负责使资源与状态缓存失效；它不应删除已经失效的
       *    GPU handles。本类只协调调用顺序，不负责停止 rAF 或实现 Manager 清理。
       *
       * 若 onLost 抛错，本轮仍保持 lost，并通过 lastFailure 保存原始错误；
       * 这不是恢复阶段失败，因此不调用 onRestoreFailed，也不把异常抛出 DOM listener。
       * 这里的「本轮」有前提：回调没有通过同步重入启动更新的转换或 dispose。
       *
       * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
       *
       * 前置 ++ 先增加成员版本，再把新值复制到局部 version；例如 4 → 5，
       * 此时两者都是 5。局部 number 是本轮令牌，不会跟随成员后续变化。
       * 如果 onLost 内先调用 dispose，再抛错，成员版本会变成 6，局部仍是 5。
       * catch 必须确认版本仍相等才能记录失败，否则旧回调会覆盖更新转换的诊断。
       * 若版本已经变化，原始错误通过 onSuppressedError 报告为 stale，不写入
       * lastFailure，也不改变新转换已经发布的状态。
       * 这是同步回调重入保护，不要求存在多个线程或 async/await。
       *
       * @param event 浏览器发送的丢失事件；测试用可取消的 Event 模拟事件协议，
       * 不代表测试真的使 GPU context 丢失。
       */
      __publicField(this, "handleLost", /* @__PURE__ */ __name((event) => {
        if (this.stateValue === "disposed") return;
        event.preventDefault();
        if (this.stateValue === "lost") return;
        const version = ++this.transitionVersion;
        this.stateValue = "lost";
        this.failureValue = null;
        try {
          this.callbacks.onLost();
        } catch (error) {
          if (version === this.transitionVersion) {
            this.failureValue = Object.freeze({ phase: "on-lost", error });
          } else {
            this.reportSuppressedError(error, "on-lost", version);
          }
        }
      }, "handleLost"));
      /**
       * 响应浏览器的 context 恢复通知，完成引擎重建与收尾后才重新允许绘制。
       *
       * @remarks
       * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
       *
       * 浏览器发送 restored 只说明 context 已恢复，不代表旧 GPU handles 重新有效，
       * 也不代表引擎已经完成资源重建。只有 lost 或 restore-failed 状态接受此通知；
       * ready、restoring、disposed 状态均忽略，因此恢复中的重复事件不会递归恢复。
       * 接受通知后的同步顺序为：
       * 1. 增加转换版本，进入 restoring，并清除上一轮失败记录。
       * 2. 调用 Backend 注入的 restore，重新探测能力并建立新的 State/Managers。
       *    实际重建策略由 Backend 负责，本类不直接创建任何 GL 对象。
       * 3. 确认仍属于本轮后，调用 onReady 做同步恢复收尾。
       *    尽管回调名为 onReady，它执行期间仍是 restoring，isReady 仍为 false，
       *    因此不能在该回调里开始 draw。
       * 4. 收尾成功返回且版本仍相等，最后才发布 ready 状态。
       *
       * 若 restore 或 onReady 抛错且本轮仍有效，先进入 restore-failed，
       * 再保存带 phase 的原始错误并调用 onRestoreFailed；通知回调观察到的
       * isReady 已为 false。若通知自身又抛错，同时记录 notificationError，
       * 不覆盖最初的恢复错误。上述回调异常均不逃出 DOM listener。
       * 本类不自动制造 restored 事件，也不因失败进入无限重试。
       *
       * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
       *
       * 每次外部回调返回或抛错后，都必须先检查本轮 version 是否仍然有效。
       * 例如恢复开始时两者都是 2；restore 内同步触发新的 lost 转换后，
       * 成员版本变成 3，旧调用栈里的 version 仍为 2。旧恢复必须立即退出，
       * 不能继续调用 onReady，更不能把较新的 lost 覆盖成 ready。
       * 回调内 dispose 同理；失败通知自身重入后，旧通知错误也不能覆盖新诊断。
       * 若旧回调随后抛错，onSuppressedError 接收冻结的 phase/version 快照；
       * 它只用于日志/监控，不重试恢复，也不把该错误写成当前 lastFailure。
       * 这些检查保护的是「旧调用栈不能提交新生命周期的状态」，不是 GPU 资源版本，
       * 也不表示允许异步恢复；所有注入回调仍须遵守同步返回 undefined 的契约。
       */
      __publicField(this, "handleRestored", /* @__PURE__ */ __name(() => {
        if (this.stateValue !== "lost" && this.stateValue !== "restore-failed") return;
        const version = ++this.transitionVersion;
        this.stateValue = "restoring";
        this.failureValue = null;
        let phase = "restore";
        try {
          this.callbacks.restore();
          if (version !== this.transitionVersion) return;
          phase = "on-ready";
          this.callbacks.onReady();
          if (version !== this.transitionVersion) return;
          this.stateValue = "ready";
        } catch (error) {
          if (version !== this.transitionVersion) {
            this.reportSuppressedError(error, phase, version);
            return;
          }
          this.stateValue = "restore-failed";
          const failure = Object.freeze({ phase, error });
          this.failureValue = failure;
          try {
            this.callbacks.onRestoreFailed(error);
          } catch (notificationError) {
            if (version === this.transitionVersion) {
              this.failureValue = Object.freeze({ ...failure, notificationError });
            } else {
              this.reportSuppressedError(notificationError, "on-restore-failed", version);
            }
          }
        }
      }, "handleRestored"));
      this.canvas = canvas;
      this.callbacks = Object.freeze({
        onLost: callbacks.onLost,
        restore: callbacks.restore,
        onReady: callbacks.onReady,
        onRestoreFailed: callbacks.onRestoreFailed,
        onSuppressedError: callbacks.onSuppressedError
      });
      canvas.addEventListener("webglcontextlost", this.handleLost);
      canvas.addEventListener("webglcontextrestored", this.handleRestored);
    }
    /** disposed 后也可读，用于诊断最终状态。 */
    get state() {
      return this.stateValue;
    }
    /** 只在本类完成所有同步恢复步骤后为 true。 */
    get isReady() {
      return this.stateValue === "ready";
    }
    /** 新一轮有效 lost/restore 清除旧记录；dispose 保留最后的诊断。 */
    get lastFailure() {
      return this.failureValue;
    }
    /**
     * 幂等地移除监听并终止本生命周期对象；不触发 loseContext 或删除资源。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
     * 先改变状态与令牌；即使正在某个回调内 dispose，外层恢复也不能再写回 ready。
     */
    dispose() {
      if (this.stateValue === "disposed") return;
      this.stateValue = "disposed";
      this.transitionVersion++;
      this.canvas.removeEventListener("webglcontextlost", this.handleLost);
      this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    }
    /**
     * 创建冻结的 stale 诊断快照并交给 Backend 提供的观察者。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-context-suppressed-error-observability]
     * 观察者必须是非抛出的日志/监控出口；运行时仍用 try/catch 隔离违反约定的
     * 实现，避免诊断失败逃出 DOM listener 或覆盖更新生命周期。这里不能递归调用
     * 同一个观察者报告它自己的错误，也没有第二个 logger 依赖，因此该二次错误
     * 只能被丢弃。若未来要求监控诊断通道自身，应在 Lifecycle 外提供非抛出的
     * fallback，而不是把它写入当前 `lastFailure`。
     *
     * @param error 旧生命周期回调抛出的原始值。
     * @param phase 抛错回调所处的精确阶段。
     * @param capturedVersion 旧调用栈进入转换时捕获的版本。
     */
    reportSuppressedError(error, phase, capturedVersion) {
      try {
        this.callbacks.onSuppressedError(
          Object.freeze({
            error,
            phase,
            stale: true,
            capturedVersion,
            currentVersion: this.transitionVersion
          })
        );
      } catch {
      }
    }
  };
  __name(_WebGLContextLifecycle, "WebGLContextLifecycle");
  var WebGLContextLifecycle = _WebGLContextLifecycle;

  // src/rendering/core/requireNonNull.ts
  function requireNonNull(value, errorFactory) {
    if (value === null) {
      throw errorFactory();
    }
    return value;
  }
  __name(requireNonNull, "requireNonNull");

  // src/rendering/backend/webgl1/WebGL1TextureUploadSupport.ts
  function assertTextureOperation(gl, operation, label2) {
    if (gl.isContextLost()) throw new WebGLContextLostError(operation);
    const error = gl.getError();
    if (gl.isContextLost()) throw new WebGLContextLostError(operation);
    if (error !== gl.NO_ERROR) {
      throw new WebGLOperationError(operation, label2, "GL error 0x" + error.toString(16));
    }
  }
  __name(assertTextureOperation, "assertTextureOperation");
  function requireTextureLimit(gl, parameter, name) {
    const value = gl.getParameter(parameter);
    if (gl.isContextLost()) throw new WebGLContextLostError("query " + name);
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
      throw new UnsupportedRenderFeatureError(name, "invalid device limit");
    return value;
  }
  __name(requireTextureLimit, "requireTextureLimit");
  function withTextureUploadState(gl, target2, callback) {
    const activeUnit = gl.getParameter(gl.ACTIVE_TEXTURE);
    const bindingParameter = target2 === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP : gl.TEXTURE_BINDING_2D;
    const texture = gl.getParameter(bindingParameter);
    const alignment = gl.getParameter(gl.UNPACK_ALIGNMENT);
    const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    const premultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    const conversion = gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);
    if (gl.isContextLost()) throw new WebGLContextLostError("capture texture upload state");
    try {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      return callback();
    } finally {
      if (!gl.isContextLost()) {
        gl.activeTexture(activeUnit);
        gl.bindTexture(target2, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, conversion);
      }
    }
  }
  __name(withTextureUploadState, "withTextureUploadState");

  // src/rendering/backend/webgl1/WebGL1Texture2DManager.ts
  function readSource(texture) {
    if (texture instanceof DataTexture2D) {
      return { kind: "data", ...texture.copySource() };
    }
    if (!(texture instanceof ImageTexture2D)) {
      throw new UnsupportedRenderFeatureError("texture2D " + texture.label, "unknown source class");
    }
    const image = texture.source;
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
      if (!image.complete) {
        throw new InvalidTextureSourceError(texture.label, "image has not finished loading");
      }
      return { kind: "image", image, width: image.naturalWidth, height: image.naturalHeight };
    }
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      return { kind: "image", image, width: image.width, height: image.height };
    }
    throw new InvalidTextureSourceError(
      texture.label,
      "expected HTMLImageElement or ImageBitmap in this realm"
    );
  }
  __name(readSource, "readSource");
  var _WebGL1Texture2DManager = class _WebGL1Texture2DManager {
    constructor(gl, capabilities, hooks) {
      this.gl = gl;
      this.capabilities = capabilities;
      this.hooks = hooks;
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      /** 进入关闭状态后 get 永久拒绝；dispose 仍可重试未完成的删除。 */
      __publicField(this, "closing", false);
      /** context 恢复时创建新 Manager，不能复活此实例。 */
      __publicField(this, "lost", false);
      /** undefined 表示尚未查询，null 表示当前 context 不支持。 */
      __publicField(this, "srgbExtension");
    }
    /** 首次调用完整上传；后续借用相同 GPU 对象，静态来源更新需新建 CPU Texture。 */
    get(texture) {
      this.assertReady();
      texture.assertUsable();
      const cached = this.entries.get(texture);
      if (cached !== void 0) return cached.resource;
      const gl = this.gl;
      let handle = null;
      try {
        assertTextureOperation(gl, "begin texture2D upload", texture.label);
        const source = readSource(texture);
        const format = this.validateStorage(texture, source);
        const type = texture.storage.type === "float32" ? gl.FLOAT : gl.UNSIGNED_BYTE;
        withTextureUploadState(gl, gl.TEXTURE_2D, () => {
          handle = requireNonNull(
            gl.createTexture(),
            () => new WebGLResourceCreationError("texture2D", texture.label)
          );
          gl.bindTexture(gl.TEXTURE_2D, handle);
          if (source.kind === "data") {
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              format,
              source.width,
              source.height,
              0,
              format,
              type,
              source.data
            );
          } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, source.image);
          }
          assertTextureOperation(gl, "upload texture2D pixels", texture.label);
          this.applySampler(texture);
          if (texture.mipmapPolicy === "generate") gl.generateMipmap(gl.TEXTURE_2D);
          assertTextureOperation(gl, "configure texture2D", texture.label);
        });
        assertTextureOperation(gl, "restore texture2D upload state", texture.label);
        texture.assertUsable();
        const resource = Object.freeze({
          handle: requireNonNull(
            handle,
            () => new WebGLResourceCreationError("texture2D", texture.label)
          ),
          target: gl.TEXTURE_2D
        });
        const unsubscribe = texture.onDispose(() => this.release(texture));
        this.entries.set(texture, { resource, unsubscribe });
        return resource;
      } catch (error) {
        if (this.lost || gl.isContextLost()) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("create texture2D");
        }
        if (handle !== null) gl.deleteTexture(handle);
        throw error;
      } finally {
        this.hooks.invalidateState();
      }
    }
    /**
     * 在分配 handle 之前，验证当前 WebGL1 设备能否准确实现描述。
     *
     * @remarks
     * r/rg 不冒充 LUMINANCE 系列；float 上传与 float 线性过滤分别检查。
     * sRGB uint8 必须使用 EXT_sRGB，不能静默改成线性格式。
     * 本批不实现 float 自动 mip；支持上传不代表支持自动 mip 生成。
     */
    validateStorage(texture, source) {
      const gl = this.gl;
      const unsupported = /* @__PURE__ */ __name((reason) => {
        throw new UnsupportedRenderFeatureError("texture2D " + texture.label, reason);
      }, "unsupported");
      const { width, height } = source;
      if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
        throw new InvalidTextureSourceError(
          texture.label,
          "pixel dimensions must be positive safe integers"
        );
      }
      const maximum = requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, "MAX_TEXTURE_SIZE");
      if (width > maximum || height > maximum) unsupported("pixel dimensions exceed device limit");
      const pot = Number.isInteger(Math.log2(width)) && Number.isInteger(Math.log2(height));
      if (!pot && (texture.sampler.wrapS !== "clamp-to-edge" || texture.sampler.wrapT !== "clamp-to-edge" || texture.mipmapPolicy !== "none" || texture.sampler.minFilter !== "nearest" && texture.sampler.minFilter !== "linear")) {
        unsupported("WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps");
      }
      const storage = texture.storage;
      if (storage.format !== "rgb" && storage.format !== "rgba") {
        unsupported("r/rg channel mapping is not implemented");
      }
      if (storage.type === "float32") {
        if (source.kind !== "data") unsupported("float32 requires CPU pixel data");
        if (this.capabilities.textureFloat === null) unsupported("OES_texture_float is required");
        const linear = texture.sampler.magFilter === "linear" || texture.sampler.minFilter.includes("linear");
        if (linear && this.capabilities.textureFloatLinear === null) {
          unsupported("OES_texture_float_linear is required");
        }
        if (texture.mipmapPolicy !== "none")
          unsupported("float32 mipmap generation is not implemented");
        if (texture.colorSpace === "srgb") unsupported("sRGB storage requires uint8");
      }
      if (texture.colorSpace === "srgb") {
        if (this.srgbExtension === void 0) this.srgbExtension = gl.getExtension("EXT_sRGB");
        if (gl.isContextLost()) throw new WebGLContextLostError("query EXT_sRGB");
        if (this.srgbExtension === null)
          unsupported("EXT_sRGB is required; no implicit color-space fallback");
        const extension = this.srgbExtension;
        return storage.format === "rgb" ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT;
      }
      return storage.format === "rgb" ? gl.RGB : gl.RGBA;
    }
    /** 将经过 CPU/设备验证的逻辑 sampler 翻译成 GL 常量；不修改调用者描述。 */
    applySampler(texture) {
      const gl = this.gl;
      const wraps = {
        "clamp-to-edge": gl.CLAMP_TO_EDGE,
        repeat: gl.REPEAT,
        "mirrored-repeat": gl.MIRRORED_REPEAT
      };
      const filters = {
        nearest: gl.NEAREST,
        linear: gl.LINEAR,
        "nearest-mipmap-nearest": gl.NEAREST_MIPMAP_NEAREST,
        "linear-mipmap-nearest": gl.LINEAR_MIPMAP_NEAREST,
        "nearest-mipmap-linear": gl.NEAREST_MIPMAP_LINEAR,
        "linear-mipmap-linear": gl.LINEAR_MIPMAP_LINEAR
      };
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps[texture.sampler.wrapS]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wraps[texture.sampler.wrapT]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters[texture.sampler.minFilter]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters[texture.sampler.magFilter]);
    }
    /**
     * 删除成功后才从待清理集合移除；抛错时保留条目供 release/dispose 重试。
     * 不读取 CPU source，因此也能在 Resource 的同步 dispose listener 中使用。
     */
    release(texture) {
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      const entry = this.entries.get(texture);
      if (entry === void 0) return;
      entry.unsubscribe();
      try {
        this.gl.deleteTexture(entry.resource.handle);
        this.entries.delete(texture);
        if (this.gl.isContextLost()) this.invalidateForContextLoss();
      } finally {
        this.hooks.invalidateState();
      }
    }
    /** 丢弃本代缓存和订阅，不 delete 旧 handles，也不释放 CPU 来源。 */
    invalidateForContextLoss() {
      this.lost = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      this.entries.clear();
      this.hooks.invalidateState();
    }
    /**
     * 关闭此 Manager，并继续清理仍由它持有的 GPU 对象。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][texture2d-upload-transaction]
     *
     * 关闭访问与完成清理是两件事。即便某次 delete 抛错，get 仍必须拒绝；
     * 但不能因为 closing 已经为 true 就跳过下次 dispose 的剩余清理。
     */
    dispose() {
      this.closing = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      for (const texture of [...this.entries.keys()]) this.release(texture);
    }
    /** 所有权关闭优先；context 丢失是永久代际失效，不因浏览器恢复而撤销。 */
    assertReady() {
      if (this.closing) throw new WebGLBackendDisposedError("get texture2D");
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError("get texture2D");
      }
    }
  };
  __name(_WebGL1Texture2DManager, "WebGL1Texture2DManager");
  var WebGL1Texture2DManager = _WebGL1Texture2DManager;

  // src/rendering/backend/webgl1/WebGL1CubeTextureManager.ts
  function imageDimensions(image, label2) {
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
      if (!image.complete)
        throw new InvalidTextureSourceError(label2, "image has not finished loading");
      return { width: image.naturalWidth, height: image.naturalHeight };
    }
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      return { width: image.width, height: image.height };
    }
    throw new InvalidTextureSourceError(
      label2,
      "expected HTMLImageElement or ImageBitmap in this realm"
    );
  }
  __name(imageDimensions, "imageDimensions");
  var _WebGL1CubeTextureManager = class _WebGL1CubeTextureManager {
    constructor(gl, capabilities, hooks) {
      this.gl = gl;
      this.capabilities = capabilities;
      this.hooks = hooks;
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      __publicField(this, "disposed", false);
      __publicField(this, "lost", false);
      /** undefined=尚未查询；null=本 context 不支持。不是进程级缓存。 */
      __publicField(this, "srgbExtension");
    }
    /** 懒上传或借用缓存。相同 label 的两个 CPU 对象不会合并。 */
    get(texture) {
      this.assertReady();
      if (texture.disposed) throw new ResourceDisposedError("CubeTexture");
      const cached = this.entries.get(texture);
      if (cached !== void 0) return cached.resource;
      const gl = this.gl;
      let handle = null;
      try {
        assertTextureOperation(gl, "begin cube upload", texture.label);
        const source = texture.copySource();
        const dimensionAt = /* @__PURE__ */ __name((index) => source.kind === "images" ? imageDimensions(source.faces[index], texture.label) : source.faces[index], "dimensionAt");
        const faces = [
          dimensionAt(0),
          dimensionAt(1),
          dimensionAt(2),
          dimensionAt(3),
          dimensionAt(4),
          dimensionAt(5)
        ];
        assertValidCubeFaceDimensions(
          faces,
          (reason) => new InvalidTextureSourceError(texture.label, reason)
        );
        const size = faces[0].width;
        const format = this.validateStorage(texture, source.kind, size);
        const type = texture.storage.type === "float32" ? gl.FLOAT : gl.UNSIGNED_BYTE;
        withTextureUploadState(gl, gl.TEXTURE_CUBE_MAP, () => {
          handle = requireNonNull(
            gl.createTexture(),
            () => new WebGLResourceCreationError("cube-texture", texture.label)
          );
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, handle);
          for (let index = 0; index < 6; index++) {
            const faceTarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + index;
            if (source.kind === "data") {
              const face = source.faces[index];
              gl.texImage2D(faceTarget, 0, format, size, size, 0, format, type, face.data);
            } else {
              gl.texImage2D(faceTarget, 0, format, format, type, source.faces[index]);
            }
            assertTextureOperation(gl, "upload cube face " + index, texture.label);
          }
          const wraps = {
            "clamp-to-edge": gl.CLAMP_TO_EDGE,
            repeat: gl.REPEAT,
            "mirrored-repeat": gl.MIRRORED_REPEAT
          };
          const filters = {
            nearest: gl.NEAREST,
            linear: gl.LINEAR,
            "nearest-mipmap-nearest": gl.NEAREST_MIPMAP_NEAREST,
            "linear-mipmap-nearest": gl.LINEAR_MIPMAP_NEAREST,
            "nearest-mipmap-linear": gl.NEAREST_MIPMAP_LINEAR,
            "linear-mipmap-linear": gl.LINEAR_MIPMAP_LINEAR
          };
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wraps[texture.sampler.wrapS]);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wraps[texture.sampler.wrapT]);
          gl.texParameteri(
            gl.TEXTURE_CUBE_MAP,
            gl.TEXTURE_MIN_FILTER,
            filters[texture.sampler.minFilter]
          );
          gl.texParameteri(
            gl.TEXTURE_CUBE_MAP,
            gl.TEXTURE_MAG_FILTER,
            filters[texture.sampler.magFilter]
          );
          if (texture.mipmapPolicy === "generate") gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
          assertTextureOperation(gl, "configure cubemap", texture.label);
        });
        assertTextureOperation(gl, "restore cube upload state", texture.label);
        if (texture.disposed) throw new ResourceDisposedError("CubeTexture");
        const resource = Object.freeze({
          handle: requireNonNull(
            handle,
            () => new WebGLResourceCreationError("cube-texture", texture.label)
          ),
          target: gl.TEXTURE_CUBE_MAP
        });
        const unsubscribe = texture.onDispose(() => this.release(texture));
        this.entries.set(texture, { resource, unsubscribe });
        return resource;
      } catch (error) {
        if (this.lost || gl.isContextLost()) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("create cubemap");
        }
        if (handle !== null) gl.deleteTexture(handle);
        throw error;
      } finally {
        this.hooks.invalidateState();
      }
    }
    /**
     * 验证 CPU 描述能否在当前 WebGL1 context 准确实现。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][cubemap-storage-color-contract]
     *
     * r/rg 不冒充 LUMINANCE/LUMINANCE_ALPHA，因为采样通道语义不同。
     * sRGB uint8 使用 EXT_sRGB，让采样结果解码为线性颜色；不能再让 shader 重复解码。
     * linear/data 不做颜色转换。输出到屏幕的颜色编码属于后续 shader/pipeline。
     * float32 只接受像素数组；线性过滤另外检查 OES_texture_float_linear。
     * 本批不实现 float 自动 mipmap，不能把“可上传”当作“可生成 mipmap”。
     */
    validateStorage(texture, sourceKind, size) {
      const gl = this.gl;
      const unsupported = /* @__PURE__ */ __name((reason) => {
        throw new UnsupportedRenderFeatureError("cubemap " + texture.label, reason);
      }, "unsupported");
      if (size > requireTextureLimit(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE, "MAX_CUBE_MAP_TEXTURE_SIZE")) {
        unsupported("face size exceeds device limit");
      }
      const pot = Number.isInteger(Math.log2(size));
      if (!pot && (texture.sampler.wrapS !== "clamp-to-edge" || texture.sampler.wrapT !== "clamp-to-edge" || texture.mipmapPolicy !== "none" || texture.sampler.minFilter !== "nearest" && texture.sampler.minFilter !== "linear"))
        unsupported("WebGL1 NPOT requires clamp-to-edge, base-level filtering and no mipmaps");
      const storage = texture.storage;
      if (storage.format !== "rgb" && storage.format !== "rgba") {
        unsupported("r/rg channel mapping is not implemented");
      }
      if (storage.type === "float32") {
        if (sourceKind !== "data") unsupported("float32 requires CPU pixel data");
        if (this.capabilities.textureFloat === null) unsupported("OES_texture_float is required");
        const linear = texture.sampler.magFilter === "linear" || texture.sampler.minFilter.includes("linear");
        if (linear && this.capabilities.textureFloatLinear === null) {
          unsupported("OES_texture_float_linear is required");
        }
        if (texture.mipmapPolicy !== "none")
          unsupported("float32 mipmap generation is not implemented");
        if (texture.colorSpace === "srgb") unsupported("sRGB storage requires uint8");
      }
      if (texture.colorSpace === "srgb") {
        if (this.srgbExtension === void 0) this.srgbExtension = gl.getExtension("EXT_sRGB");
        if (gl.isContextLost()) throw new WebGLContextLostError("query EXT_sRGB");
        const extension = this.srgbExtension;
        if (extension === null) {
          throw new UnsupportedRenderFeatureError(
            "sRGB cubemap",
            "EXT_sRGB is required; no implicit color-space fallback"
          );
        }
        return storage.format === "rgb" ? extension.SRGB_EXT : extension.SRGB_ALPHA_EXT;
      }
      return storage.format === "rgb" ? gl.RGB : gl.RGBA;
    }
    /** 删除当前 GPU 表示；可在 CPU 已经标记 disposed 的 listener 中调用。 */
    release(texture) {
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      const entry = this.entries.get(texture);
      if (entry === void 0) return;
      this.entries.delete(texture);
      entry.unsubscribe();
      this.gl.deleteTexture(entry.resource.handle);
      this.hooks.invalidateState();
    }
    /** 只丢弃旧 handles 和订阅，不向丢失的 context 发 delete 命令。 */
    invalidateForContextLoss() {
      this.lost = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      this.entries.clear();
      this.hooks.invalidateState();
    }
    /** 正常退出：先取消全部订阅，再删除本 Manager 拥有的 GPU 对象。 */
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      const entries = [...this.entries.values()];
      this.entries.clear();
      for (const entry of entries) entry.unsubscribe();
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      for (const entry of entries) this.gl.deleteTexture(entry.resource.handle);
      this.hooks.invalidateState();
    }
    assertReady() {
      if (this.disposed) throw new WebGLBackendDisposedError("get cubemap");
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError("get cubemap");
      }
    }
  };
  __name(_WebGL1CubeTextureManager, "WebGL1CubeTextureManager");
  var WebGL1CubeTextureManager = _WebGL1CubeTextureManager;

  // src/rendering/backend/webgl1/WebGL1GeometryManager.ts
  var _WebGL1GeometryManager = class _WebGL1GeometryManager {
    constructor(gl, capabilities, hooks) {
      __publicField(this, "gl");
      __publicField(this, "capabilities");
      __publicField(this, "hooks");
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      __publicField(this, "releasing", /* @__PURE__ */ new Set());
      /** 已关闭正常服务；不等于所有清理工作均已成功结束。 */
      __publicField(this, "disposedValue", false);
      /** 一旦失效，不允许此实例在 context 恢复后重新使用旧记录。 */
      __publicField(this, "lostValue", false);
      /** 防止 dispose 在同步回调中递归执行。 */
      __publicField(this, "disposing", false);
      this.gl = gl;
      this.capabilities = capabilities;
      this.hooks = hooks;
    }
    /**
     * 创建或借用静态 buffers；CPU 快照始终保持不变。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-resource-transaction]
     *
     * 所有 buffer 创建、上传、绑定恢复成功后才发布缓存。
     * 任一步失败都清理本次已创建的 buffers；context lost 时只放弃旧代记录。
     */
    get(geometry) {
      this.assertAvailable("get geometry");
      if (geometry.disposed) throw new ResourceDisposedError("Geometry");
      if (this.releasing.has(geometry)) {
        throw new WebGLOperationError("get geometry", "Geometry", "release is in progress");
      }
      const cached = this.entries.get(geometry);
      if (cached !== void 0) return cached.resource;
      const indices = this.prepareIndices(geometry.copyIndices());
      const mode = this.primitiveMode(geometry.topology);
      const gl = this.gl;
      const owned = [];
      this.checkError("preflight", "Geometry");
      const previousArray = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      const previousElements = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
      this.checkError("capture buffer bindings", "Geometry");
      try {
        const attributes = /* @__PURE__ */ new Map();
        let indexBuffer = null;
        try {
          for (const name of geometry.getAttributeNames()) {
            const attribute = geometry.getAttribute(name);
            const data = attribute.copyData();
            const type = this.attributeType(data);
            const buffer = this.upload(gl.ARRAY_BUFFER, data, `Geometry.attribute:${name}`, owned);
            attributes.set(
              name,
              Object.freeze({
                buffer,
                type,
                itemSize: attribute.itemSize,
                normalized: attribute.normalized
              })
            );
          }
          if (indices !== null) {
            indexBuffer = this.upload(gl.ELEMENT_ARRAY_BUFFER, indices, "Geometry.indices", owned);
          }
        } finally {
          if (!gl.isContextLost() && !this.lostValue) {
            gl.bindBuffer(gl.ARRAY_BUFFER, previousArray);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, previousElements);
          }
          this.hooks.invalidateState();
        }
        this.checkError("restore buffer bindings", "Geometry");
        const indexType = indices === null ? null : this.indexType(indices);
        const resource = Object.freeze({
          attributes,
          indexBuffer,
          indexType,
          drawCount: geometry.drawCount,
          primitiveMode: mode
        });
        const unsubscribe = geometry.onDispose(() => this.release(geometry));
        this.entries.set(geometry, { resource, unsubscribe });
        return resource;
      } catch (error) {
        if (gl.isContextLost() || this.lostValue) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("create geometry");
        }
        for (const buffer of owned) gl.deleteBuffer(buffer);
        this.hooks.invalidateState();
        throw error;
      }
    }
    /**
     * 先解除所有关联顶点输入记录，再取消订阅并删除 buffers。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-before-delete-order]
     *
     * beforeDelete 抛错时不越过屏障；保留 entry 供显式重试。
     * 同步重入同一 release 安全返回，避免同一 buffer 被重复删除。
     */
    release(geometry) {
      const entry = this.entries.get(geometry);
      if (entry === void 0 || this.releasing.has(geometry)) return;
      if (this.gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss();
        return;
      }
      this.releasing.add(geometry);
      try {
        this.hooks.beforeDelete?.(geometry);
        if (this.gl.isContextLost() || this.lostValue) {
          this.invalidateForContextLoss();
          return;
        }
        entry.unsubscribe();
        this.entries.delete(geometry);
        for (const attribute of entry.resource.attributes.values()) {
          this.gl.deleteBuffer(attribute.buffer);
        }
        if (entry.resource.indexBuffer !== null) {
          this.gl.deleteBuffer(entry.resource.indexBuffer);
        }
        this.hooks.invalidateState();
      } finally {
        this.releasing.delete(geometry);
      }
    }
    /** lost 只丢弃本 context 的记录与订阅，不删除 GPU，也不修改 CPU Geometry。 */
    invalidateForContextLoss() {
      this.lostValue = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      this.entries.clear();
      this.hooks.invalidateState();
    }
    /**
     * 先关闭正常服务，再取消全部订阅并释放 GPU 资源。
     *
     * @remarks
     * 依赖清理失败后仍然保持关闭状态，但可再次调用以重试剩余条目。
     * disposing 只阻止本次调用栈内的递归，不阻止后续显式重试。
     */
    dispose() {
      if (this.disposing) return;
      this.disposedValue = true;
      this.disposing = true;
      try {
        for (const entry of this.entries.values()) entry.unsubscribe();
        for (const geometry of [...this.entries.keys()]) this.release(geometry);
      } finally {
        this.disposing = false;
      }
    }
    /**
     * 检查最大实际索引，而不是 index 数量或 vertexCount。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl1-uint32-index-fallback]
     *
     * 无扩展时仅当每个值均 <= 65535 才能无损转成 Uint16Array。
     * 不使用 Math.max(...indices)，避免大数组展开导致调用参数数量溢出。
     */
    prepareIndices(indices) {
      if (!(indices instanceof Uint32Array) || this.capabilities.elementIndexUint !== null) {
        return indices;
      }
      for (const index of indices) {
        if (index > 65535) {
          throw new UnsupportedIndexTypeError(
            "Uint32Array",
            "OES_element_index_uint is unavailable and an index exceeds 65535"
          );
        }
      }
      return new Uint16Array(indices);
    }
    /**
     * 创建、登记并上传一个 buffer。
     *
     * @remarks
     * 拿到 handle 后立即加入 owned，保证后续上传失败也能找到它。
     * 每个 buffer 固定绑定其真实用途，不把 index buffer 当 ARRAY_BUFFER 上传。
     */
    upload(target2, data, label2, owned) {
      const gl = this.gl;
      const candidate = gl.createBuffer();
      this.assertAvailable("create buffer");
      const buffer = requireNonNull(candidate, () => new WebGLResourceCreationError("buffer", label2));
      owned.push(buffer);
      gl.bindBuffer(target2, buffer);
      gl.bufferData(target2, data, gl.STATIC_DRAW);
      this.checkError("upload buffer", label2);
      return buffer;
    }
    /** 类型映射只解释存储，不改变 normalized，也不执行 CPU 数值转换。 */
    attributeType(data) {
      if (data instanceof Float32Array) return this.gl.FLOAT;
      if (data instanceof Int8Array) return this.gl.BYTE;
      if (data instanceof Uint8Array) return this.gl.UNSIGNED_BYTE;
      if (data instanceof Int16Array) return this.gl.SHORT;
      if (data instanceof Uint16Array) return this.gl.UNSIGNED_SHORT;
      throw new WebGLOperationError("map attribute type", "Geometry", "unsupported TypedArray");
    }
    /** 将已经过能力预检的索引存储类型映射为 drawElements 使用的枚举。 */
    indexType(data) {
      if (data instanceof Uint8Array) return this.gl.UNSIGNED_BYTE;
      if (data instanceof Uint16Array) return this.gl.UNSIGNED_SHORT;
      return this.gl.UNSIGNED_INT;
    }
    /** default 留在 switch 内，新增 CPU topology 时由 assertNever 提醒同步扩展。 */
    primitiveMode(topology) {
      let mode;
      switch (topology) {
        case "triangles":
          mode = this.gl.TRIANGLES;
          break;
        case "lines":
          mode = this.gl.LINES;
          break;
        case "line-strip":
          mode = this.gl.LINE_STRIP;
          break;
        case "triangle-strip":
          mode = this.gl.TRIANGLE_STRIP;
          break;
        default:
          assertNever(topology);
      }
      return mode;
    }
    /**
     * 在资源创建、编译或上传的冷路径，有界地收集当前 GL 错误标志。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
     *
     * 每次读取前后都检查本 Manager 的生命周期：
     * - 读取前禁止已关闭或已失效的 Manager 继续操作 context；
     * - 读取后识别读取期间发生的 context lost，并执行已有缓存失效逻辑。
     *
     * 只有观察到 NO_ERROR，才能认为本次错误标志收集已经结束。
     * 收集结束后：
     * - 没有收集到错误：正常返回，调用者可以继续；
     * - 收集到一个或多个错误：统一抛错，调用者不能继续本次操作。
     *
     * 读取错误标志不等于修复失败的 GL 操作，也不等于恢复 context。
     * 错误码的返回顺序没有保证，本方法不把它解释为错误发生顺序。
     *
     * 最多执行 32 次 getError，包括用于确认结束的 NO_ERROR 读取。
     * 这是项目的防御性预算，不是 WebGL 规定的错误数量。
     * 预算耗尽仍未观察到 NO_ERROR 时，必须报告收集未完成。
     *
     * 保持现有冷路径调用位置；不要把此循环移到缓存命中或每次 draw 中。
     * create-null、shader 编译状态和 program 链接状态仍由独立检查负责。
     *
     * @param operation - 当前检查点，例如 preflight 或 upload buffer。
     * @param label - 当前资源的诊断标签。
     * @throws WebGLOperationError 收集到普通 GL 错误，或收集预算耗尽。
     * @throws WebGLContextLostError 读取前后发现 context 已失效。
     * @throws WebGLBackendDisposedError 读取前后发现 Manager 已关闭。
     */
    checkError(operation, label2) {
      const maxErrorReads = 32;
      const errorCodes = [];
      for (let readIndex = 0; readIndex < maxErrorReads; readIndex += 1) {
        this.assertAvailable(operation);
        const code = this.gl.getError();
        this.assertAvailable(operation);
        if (code === this.gl.NO_ERROR) {
          if (errorCodes.length === 0) {
            return;
          }
          throw new WebGLOperationError(operation, label2, `GL errors: ${errorCodes.join(", ")}`);
        }
        errorCodes.push(code);
      }
      throw new WebGLOperationError(
        operation,
        label2,
        `GL error collection incomplete after ${maxErrorReads} reads: NO_ERROR was not observed; collected GL errors: ${errorCodes.join(", ")}`
      );
    }
    /** 正常创建/查询必须同时满足 Manager 未关闭且 context 当前可用。 */
    assertAvailable(operation) {
      if (this.disposedValue) throw new WebGLBackendDisposedError(operation);
      if (this.lostValue || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError(operation);
      }
    }
  };
  __name(_WebGL1GeometryManager, "WebGL1GeometryManager");
  var WebGL1GeometryManager = _WebGL1GeometryManager;

  // src/rendering/backend/webgl1/WebGL1ProgramManager.ts
  var _WebGL1ProgramManager = class _WebGL1ProgramManager {
    constructor(gl, hooks) {
      __publicField(this, "gl");
      __publicField(this, "hooks");
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      __publicField(this, "releasing", /* @__PURE__ */ new Set());
      __publicField(this, "disposedValue", false);
      __publicField(this, "lostValue", false);
      __publicField(this, "disposing", false);
      this.gl = gl;
      this.hooks = hooks;
    }
    /**
     * 首次调用完成 compile → link → reflect → subscribe → cache；重复调用复用记录。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-resource-transaction]
     *
     * 未全部成功前不发布缓存。创建期间的 shader/program 失败时全部回收；
     * 成功链接后 detach/delete 临时 shader，仅保留 program。
     */
    get(shader2) {
      this.assertAvailable("get program");
      if (shader2.disposed) throw new ResourceDisposedError("ShaderModule");
      if (this.releasing.has(shader2)) {
        throw new WebGLOperationError("get program", shader2.name, "release is in progress");
      }
      const cached = this.entries.get(shader2);
      if (cached !== void 0) return cached.resource;
      if (shader2.language !== "glsl-es-100") {
        throw new UnsupportedShaderLanguageError(shader2.name, shader2.language, "webgl1");
      }
      const gl = this.gl;
      this.checkError("preflight", shader2.name);
      const shaders = [];
      let program = null;
      try {
        const vertex = this.compile(shader2, "vertex", gl.VERTEX_SHADER, shaders);
        const fragment = this.compile(shader2, "fragment", gl.FRAGMENT_SHADER, shaders);
        const candidate = gl.createProgram();
        this.assertAvailable("create program");
        program = requireNonNull(
          candidate,
          () => new WebGLResourceCreationError("program", shader2.name)
        );
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        this.assertAvailable("link program");
        if (linked !== true) {
          throw new ProgramLinkError(shader2.name, gl.getProgramInfoLog(program) ?? "");
        }
        gl.detachShader(program, vertex);
        gl.detachShader(program, fragment);
        this.checkError("link program", shader2.name);
        const attributes = /* @__PURE__ */ new Map();
        const uniforms = /* @__PURE__ */ new Map();
        const attributeCount = this.readCount(program, gl.ACTIVE_ATTRIBUTES, shader2.name);
        const uniformCount = this.readCount(program, gl.ACTIVE_UNIFORMS, shader2.name);
        for (let index = 0; index < attributeCount; index++) {
          const info = gl.getActiveAttrib(program, index);
          this.assertAvailable("reflect attribute");
          if (info === null)
            throw new WebGLOperationError("reflect attribute", shader2.name, `missing entry ${index}`);
          const location = gl.getAttribLocation(program, info.name);
          if (location < 0) throw new WebGLOperationError("reflect attribute", shader2.name, info.name);
          attributes.set(info.name, location);
        }
        for (let index = 0; index < uniformCount; index += 1) {
          const info = gl.getActiveUniform(program, index);
          this.assertAvailable("reflect uniform");
          if (info === null)
            throw new WebGLOperationError("reflect uniform", shader2.name, `missing entry ${index}`);
          const location = gl.getUniformLocation(program, info.name);
          if (location !== null) uniforms.set(info.name, location);
        }
        const resource = Object.freeze({
          program,
          attributes,
          uniforms
        });
        const unsubscribe = shader2.onDispose(() => this.release(shader2));
        this.entries.set(shader2, { resource, unsubscribe });
        return resource;
      } catch (error) {
        if (gl.isContextLost() || this.lostValue) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("create program");
        }
        if (program !== null) gl.deleteProgram(program);
        throw error;
      } finally {
        if (!gl.isContextLost() && !this.lostValue) {
          for (const compiled of shaders) gl.deleteShader(compiled);
        }
      }
    }
    /**
     * 先清理关联 VAO，再删除 program；重复 release 不重复删除。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-before-delete-order]
     *
     * releasing 防止 beforeDelete 同步重入造成重复删除。
     * beforeDelete 抛错时保留 entry，不冒险越过依赖清理屏障。
     */
    release(shader2) {
      const entry = this.entries.get(shader2);
      if (entry === void 0 || this.releasing.has(shader2)) return;
      if (this.gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss();
        return;
      }
      this.releasing.add(shader2);
      try {
        this.hooks.beforeDelete?.(entry.resource.program);
        if (this.gl.isContextLost() || this.lostValue) {
          this.invalidateForContextLoss();
          return;
        }
        entry.unsubscribe();
        this.entries.delete(shader2);
        if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === entry.resource.program) {
          this.gl.useProgram(null);
        }
        this.gl.deleteProgram(entry.resource.program);
        this.hooks.invalidateState();
      } finally {
        this.releasing.delete(shader2);
      }
    }
    /** lost 时只取消订阅、丢弃记录；不能向失效 context 发 delete 命令。 */
    invalidateForContextLoss() {
      this.lostValue = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      this.entries.clear();
      this.hooks.invalidateState();
    }
    /**
     * 先取消全部 CPU 订阅，再逐项释放；不释放 CPU ShaderModule。
     *
     * @remarks
     * 若 beforeDelete 抛错，get 仍被禁止；再次 dispose 可重试剩余条目。
     * 本方法不改变 Resource 基类尚未定义的 listener 异常传播语义。
     */
    dispose() {
      if (this.disposing) return;
      this.disposedValue = true;
      this.disposing = true;
      try {
        for (const entry of this.entries.values()) entry.unsubscribe();
        for (const shader2 of [...this.entries.keys()]) this.release(shader2);
      } finally {
        this.disposing = false;
      }
    }
    /** GL 查询返回 any；先收进 unknown，再验证反射计数。 */
    readCount(program, parameter, label2) {
      const count = this.gl.getProgramParameter(program, parameter);
      this.assertAvailable("reflect count");
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
        throw new WebGLOperationError("reflect count", label2, String(count));
      }
      return count;
    }
    /** owned 在编译前登记 handle，保证编译失败也能回收。 */
    compile(source, stage, type, owned) {
      const gl = this.gl;
      const candidate = gl.createShader(type);
      this.assertAvailable("create shader");
      const compiled = requireNonNull(
        candidate,
        () => new WebGLResourceCreationError("shader", `${source.name}:${stage}`)
      );
      owned.push(compiled);
      gl.shaderSource(compiled, stage === "vertex" ? source.vertexSource : source.fragmentSource);
      gl.compileShader(compiled);
      const success = gl.getShaderParameter(compiled, gl.COMPILE_STATUS);
      this.assertAvailable("compile shader");
      if (success !== true) {
        throw new ShaderCompilationError(source.name, stage, gl.getShaderInfoLog(compiled) ?? "");
      }
      this.checkError("compile shader", source.name);
      return compiled;
    }
    /**
     * 在资源创建、编译或上传的冷路径，有界地收集当前 GL 错误标志。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
     *
     * 每次读取前后都检查本 Manager 的生命周期：
     * - 读取前禁止已关闭或已失效的 Manager 继续操作 context；
     * - 读取后识别读取期间发生的 context lost，并执行已有缓存失效逻辑。
     *
     * 只有观察到 NO_ERROR，才能认为本次错误标志收集已经结束。
     * 收集结束后：
     * - 没有收集到错误：正常返回，调用者可以继续；
     * - 收集到一个或多个错误：统一抛错，调用者不能继续本次操作。
     *
     * 读取错误标志不等于修复失败的 GL 操作，也不等于恢复 context。
     * 错误码的返回顺序没有保证，本方法不把它解释为错误发生顺序。
     *
     * 最多执行 32 次 getError，包括用于确认结束的 NO_ERROR 读取。
     * 这是项目的防御性预算，不是 WebGL 规定的错误数量。
     * 预算耗尽仍未观察到 NO_ERROR 时，必须报告收集未完成。
     *
     * 保持现有冷路径调用位置；不要把此循环移到缓存命中或每次 draw 中。
     * create-null、shader 编译状态和 program 链接状态仍由独立检查负责。
     *
     * @param operation - 当前检查点，例如 preflight 或 upload buffer。
     * @param label - 当前资源的诊断标签。
     * @throws WebGLOperationError 收集到普通 GL 错误，或收集预算耗尽。
     * @throws WebGLContextLostError 读取前后发现 context 已失效。
     * @throws WebGLBackendDisposedError 读取前后发现 Manager 已关闭。
     */
    checkError(operation, label2) {
      const maxErrorReads = 32;
      const errorCodes = [];
      for (let readIndex = 0; readIndex < maxErrorReads; readIndex += 1) {
        this.assertAvailable(operation);
        const code = this.gl.getError();
        this.assertAvailable(operation);
        if (code === this.gl.NO_ERROR) {
          if (errorCodes.length === 0) {
            return;
          }
          throw new WebGLOperationError(operation, label2, `GL errors: ${errorCodes.join(", ")}`);
        }
        errorCodes.push(code);
      }
      throw new WebGLOperationError(
        operation,
        label2,
        `GL error collection incomplete after ${maxErrorReads} reads: NO_ERROR was not observed; collected GL errors: ${errorCodes.join(", ")}`
      );
    }
    /** 物理 lost 可以早于 DOM 事件，因此不能只依赖 onLost 回调。 */
    assertAvailable(operation) {
      if (this.disposedValue) throw new WebGLBackendDisposedError(operation);
      if (this.lostValue || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError(operation);
      }
    }
  };
  __name(_WebGL1ProgramManager, "WebGL1ProgramManager");
  var WebGL1ProgramManager = _WebGL1ProgramManager;

  // src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts
  var _WebGL1RenderTargetManager = class _WebGL1RenderTargetManager {
    constructor(gl, capabilities, hooks) {
      __publicField(this, "gl");
      __publicField(this, "capabilities");
      __publicField(this, "hooks");
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      __publicField(this, "disposed", false);
      __publicField(this, "lost", false);
      this.gl = gl;
      this.capabilities = capabilities;
      this.hooks = hooks;
    }
    /** 返回与当前 CPU revision 一致的完整资源，不能返回半成品或旧尺寸兜底。 */
    get(target2) {
      this.assertReady();
      target2.assertUsable();
      const old = this.entries.get(target2);
      const revision = target2.revision;
      if (old?.resource.revision === revision) return old.resource;
      const label2 = target2.label + " (RenderTarget revision " + revision + ")";
      let next;
      try {
        assertTextureOperation(this.gl, "begin render target creation", label2);
        if (old !== void 0 && this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) === old.resource.framebuffer) {
          throw new RenderTargetUnavailableError(
            label2,
            "cannot rebuild the currently bound framebuffer; leave its surface scope first"
          );
        }
        this.validate(target2.descriptor);
        next = this.create(target2.descriptor, revision, label2);
        assertTextureOperation(this.gl, "finish render target creation", label2);
        target2.assertUsable();
        const unsubscribe = old?.unsubscribe ?? target2.onDispose(() => this.release(target2));
        this.entries.set(target2, { resource: next, unsubscribe });
      } catch (error) {
        if (this.lost || this.gl.isContextLost()) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("create render target");
        }
        if (next !== void 0) this.deleteResource(next);
        throw error;
      } finally {
        this.hooks.invalidateState();
      }
      if (old !== void 0) this.deleteResource(old.resource);
      this.hooks.invalidateState();
      return next;
    }
    /**
     * 解析逻辑地址到当前 revision 的 GPU 附件；仅限 Backend 内部使用。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
     * 先验证 ref，后调用 get，非法地址不能顺便分配 GPU 存储。
     * color 返回 texture；depth 返回 renderbuffer，并不意味着它能被纹理采样。
     */
    resolveAttachment(ref) {
      this.assertReady();
      const address = this.validateAttachment(ref);
      const resource = this.get(address.target);
      return address.kind === "color" ? resource.colorTextures[address.index] : resource.depthAttachment;
    }
    /**
     * 为 sampler2D 借用当前颜色附件，不上传像素、不创建第二份纹理。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-attachment-borrowing]
     *
     * 先验证地址，再拒绝 depth16，最后才 get，避免分配不可采样的目标。
     * ref 不保存 revision：resize 后相同槽位解析为新 handle，旧 handle 不可跨 draw 缓存。
     * 本函数不验证读写反馈环；调用者须先由 SurfaceScope 检查当前输出目标。
     * 新建存储不意味着旧内容已恢复，生产者需要重新绘制。
     */
    resolveSampledColor(ref) {
      this.assertReady();
      const address = this.validateAttachment(ref);
      if (address.kind === "depth") {
        throw new UnsupportedRenderFeatureError(
          "sample depth attachment " + address.target.label,
          "depth16 is a renderbuffer, not a sampleable texture"
        );
      }
      return this.get(address.target).colorTextures[address.index];
    }
    /** 捕获并验证地址，不执行 GPU 分配；两个解析入口共享同一组边界判断。 */
    validateAttachment(ref) {
      if (ref === null || typeof ref !== "object" || Array.isArray(ref)) {
        throw new RenderTargetUnavailableError("attachment", "invalid target reference");
      }
      const { target: target2, kind, index } = ref;
      if (!(target2 instanceof RenderTarget)) {
        throw new RenderTargetUnavailableError("attachment", "invalid target reference");
      }
      target2.assertUsable();
      const descriptor = target2.descriptor;
      if (!Number.isSafeInteger(index) || index < 0 || kind === "color" && index >= descriptor.colors.length || kind === "depth" && (index !== 0 || descriptor.depth === void 0) || kind !== "color" && kind !== "depth") {
        throw new RenderTargetUnavailableError(target2.label, "invalid kind or attachment index");
      }
      return { target: target2, kind, index };
    }
    /**
     * 检查本次布局实际需要的尺寸、MRT 和浮点能力；全部成功后才允许 create*。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-float-capability-gates]
     *
     * OES_texture_float 允许浮点纹理，WEBGL_color_buffer_float 允许浮点颜色输出，
     * OES_texture_float_linear 则允许浮点线性过滤，三者不能互相替代。
     * 只检查浮点槽位自己的 sampler：rgba8 的 linear 不构成浮点过滤需求。
     * 不自动降格式、减少附件或改 sampler；实际 FBO 完整性仍由 create() 检查。
     */
    validate(descriptor) {
      const gl = this.gl;
      const maximum = requireTextureLimit(gl, gl.MAX_TEXTURE_SIZE, "MAX_TEXTURE_SIZE");
      const maximumDepth = descriptor.depth === void 0 ? maximum : requireTextureLimit(gl, gl.MAX_RENDERBUFFER_SIZE, "MAX_RENDERBUFFER_SIZE");
      if (descriptor.width > Math.min(maximum, maximumDepth) || descriptor.height > Math.min(maximum, maximumDepth)) {
        throw new UnsupportedRenderFeatureError("render target size", "exceeds device limits");
      }
      if (descriptor.colors.length > 1) {
        const extension = this.capabilities.drawBuffers;
        if (extension === null) {
          throw new UnsupportedRenderFeatureError("MRT", "WEBGL_draw_buffers is required");
        }
        const colors = requireTextureLimit(
          gl,
          extension.MAX_COLOR_ATTACHMENTS_WEBGL,
          "MAX_COLOR_ATTACHMENTS_WEBGL"
        );
        const draws = requireTextureLimit(
          gl,
          extension.MAX_DRAW_BUFFERS_WEBGL,
          "MAX_DRAW_BUFFERS_WEBGL"
        );
        if (descriptor.colors.length > Math.min(colors, draws)) {
          throw new UnsupportedRenderFeatureError(
            "MRT",
            "color attachment count exceeds device limits"
          );
        }
      }
      for (const color of descriptor.colors) {
        if (color.format !== "rgba32f") continue;
        if (this.capabilities.textureFloat === null) {
          throw new UnsupportedRenderFeatureError(
            "rgba32f render target",
            "OES_texture_float is required"
          );
        }
        if (this.capabilities.colorBufferFloat === null) {
          throw new UnsupportedRenderFeatureError(
            "rgba32f render target",
            "WEBGL_color_buffer_float is required"
          );
        }
        const requiresLinear = color.sampler.minFilter === "linear" || color.sampler.magFilter === "linear";
        if (requiresLinear && this.capabilities.textureFloatLinear === null) {
          throw new UnsupportedRenderFeatureError(
            "rgba32f linear filtering",
            "OES_texture_float_linear is required"
          );
        }
      }
    }
    /**
     * 私有构建事务：失败只清理本次新建对象，旧 cache entry 不在此函数可修改范围内。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
     * drawBuffers 状态属于具体 FBO；只在新 FBO 上设置，不改外层 FBO 的配置。
     * 临时绑定结束恢复真实 framebuffer/renderbuffer；viewport 从始至终不修改。
     */
    create(descriptor, revision, label2) {
      const gl = this.gl;
      const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const previousRenderbuffer = gl.getParameter(
        gl.RENDERBUFFER_BINDING
      );
      let framebuffer = null;
      let depth = null;
      const colors = [];
      const { width, height } = descriptor;
      try {
        return withTextureUploadState(gl, gl.TEXTURE_2D, () => {
          framebuffer = requireNonNull(
            gl.createFramebuffer(),
            () => new WebGLResourceCreationError("framebuffer", label2)
          );
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          for (let index = 0; index < descriptor.colors.length; index++) {
            const texture = requireNonNull(
              gl.createTexture(),
              () => new WebGLResourceCreationError("color-texture", label2 + " color " + index)
            );
            colors.push(texture);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            const color = descriptor.colors[index];
            const type = color.format === "rgba32f" ? gl.FLOAT : gl.UNSIGNED_BYTE;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null);
            const sampler = color.sampler;
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_MIN_FILTER,
              sampler.minFilter === "nearest" ? gl.NEAREST : gl.LINEAR
            );
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_MAG_FILTER,
              sampler.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(
              gl.FRAMEBUFFER,
              gl.COLOR_ATTACHMENT0 + index,
              gl.TEXTURE_2D,
              texture,
              0
            );
            assertTextureOperation(gl, "allocate color attachment " + index, label2);
          }
          if (descriptor.depth !== void 0) {
            depth = requireNonNull(
              gl.createRenderbuffer(),
              () => new WebGLResourceCreationError("depth-renderbuffer", label2)
            );
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
          }
          if (this.capabilities.drawBuffers !== null) {
            this.capabilities.drawBuffers.drawBuffersWEBGL(
              colors.map((_texture, index) => gl.COLOR_ATTACHMENT0 + index)
            );
          }
          assertTextureOperation(gl, "configure framebuffer attachments", label2);
          const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
          assertTextureOperation(gl, "check framebuffer completeness", label2);
          if (status !== gl.FRAMEBUFFER_COMPLETE) throw new IncompleteFramebufferError(status, label2);
          return Object.freeze({
            framebuffer,
            colorTextures: Object.freeze(colors),
            depthAttachment: depth,
            width,
            height,
            revision
          });
        });
      } catch (error) {
        if (!gl.isContextLost()) {
          if (framebuffer !== null) gl.deleteFramebuffer(framebuffer);
          for (const texture of colors) gl.deleteTexture(texture);
          if (depth !== null) gl.deleteRenderbuffer(depth);
        }
        throw error;
      } finally {
        if (!gl.isContextLost()) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
          gl.bindRenderbuffer(gl.RENDERBUFFER, previousRenderbuffer);
        }
      }
    }
    /** 只删除 owned GPU 对象。调用前已将对应 entry 从 Map 移除或替换。 */
    deleteResource(resource) {
      this.gl.deleteFramebuffer(resource.framebuffer);
      for (const texture of resource.colorTextures) this.gl.deleteTexture(texture);
      if (resource.depthAttachment !== null) this.gl.deleteRenderbuffer(resource.depthAttachment);
    }
    /** CPU 已 disposed 时仍可 release；不通过 descriptor getter 读取被清空的数据。 */
    release(target2) {
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      const entry = this.entries.get(target2);
      if (entry === void 0) return;
      this.entries.delete(target2);
      entry.unsubscribe();
      this.deleteResource(entry.resource);
      this.hooks.invalidateState();
    }
    /** Lost 清 cache、退订，但不 delete；旧 Manager 不会随 context 恢复自动复活。 */
    invalidateForContextLoss() {
      this.lost = true;
      for (const entry of this.entries.values()) entry.unsubscribe();
      this.entries.clear();
      this.hooks.invalidateState();
    }
    /** 先退订全部 CPU 通知，再清理 owned GPU 对象；不释放逻辑 RenderTarget。 */
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      const entries = [...this.entries.values()];
      this.entries.clear();
      for (const entry of entries) entry.unsubscribe();
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      for (const entry of entries) this.deleteResource(entry.resource);
      this.hooks.invalidateState();
    }
    assertReady() {
      if (this.disposed) throw new WebGLBackendDisposedError("get render target");
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError("get render target");
      }
    }
  };
  __name(_WebGL1RenderTargetManager, "WebGL1RenderTargetManager");
  var WebGL1RenderTargetManager = _WebGL1RenderTargetManager;

  // src/rendering/backend/webgl1/WebGL1VertexInputSupport.ts
  var _WebGL1VertexInputSupport = class _WebGL1VertexInputSupport {
    constructor(gl, maxAttributes) {
      __publicField(this, "gl");
      __publicField(this, "maxAttributes");
      __publicField(this, "inputs", /* @__PURE__ */ new Map());
      __publicField(this, "lostValue", false);
      __publicField(this, "disposedValue", false);
      this.gl = gl;
      this.maxAttributes = maxAttributes;
      if (!Number.isSafeInteger(maxAttributes) || maxAttributes <= 0) {
        throw new UnsupportedRenderFeatureError("vertex input", "invalid MAX_VERTEX_ATTRIBS");
      }
    }
    /** 此 Support 所属策略是否已经结束生命周期。 */
    get disposed() {
      return this.disposedValue;
    }
    /** 同时考虑已记录的失效状态与浏览器当前状态。 */
    get contextLost() {
      return this.lostValue || this.gl.isContextLost();
    }
    /** bind 开始前验证策略生命周期和 CPU Geometry 生命周期。 */
    assertBindable(geometry) {
      this.assertReady("bind vertex input");
      if (geometry.disposed) {
        throw new ResourceDisposedError("Geometry");
      }
    }
    /**
     * 先验证全部 active 属性，再允许策略修改绑定。
     *
     * @remarks
     * 名称完全匹配，不猜测 position 与 aVertexPosition 的别名。
     * Geometry 多余的属性不参与本次配置；shader 需要但 Geometry 缺失的属性明确报错。
     * 当前支持 float/vec2/vec3/vec4，itemSize 为 1..4，stride/offset 均为 0。
     * 不要求 shader 向量宽度与 itemSize 相等；缺失分量遵循 WebGL 的补齐规则。
     */
    resolve(geometry, program) {
      const inputs = this.readInputs(program);
      return inputs.map(({ name, location }) => {
        const attribute = geometry.attributes.get(name);
        if (attribute === void 0) {
          throw new UnsupportedRenderFeatureError("vertex input", `missing active attribute ${name}`);
        }
        if (!Number.isInteger(attribute.itemSize) || attribute.itemSize < 1 || attribute.itemSize > 4) {
          throw new UnsupportedRenderFeatureError("vertex input", `${name}: itemSize must be 1..4`);
        }
        return { location, attribute };
      });
    }
    /**
     * 执行已经验证的属性绑定。
     *
     * @remarks
     * 每条 pointer 捕获此刻绑定的 ARRAY_BUFFER。
     * 后续只改变 ARRAY_BUFFER 当前绑定，不会改写已经配置的 pointer 关联。
     */
    apply(bindings, indexBuffer) {
      const gl = this.gl;
      for (const { location, attribute } of bindings) {
        gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
        gl.vertexAttribPointer(
          location,
          attribute.itemSize,
          attribute.type,
          attribute.normalized,
          0,
          0
        );
        gl.enableVertexAttribArray(location);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      this.checkError("configure vertex input");
    }
    /** 删除 program 的输入元数据，不负责删除 GPU program。 */
    forgetProgram(program) {
      this.inputs.delete(program);
    }
    /** 旧代记录失效后不可重新启用此实例。 */
    invalidateForContextLoss() {
      this.lostValue = true;
      this.inputs.clear();
    }
    /** 只结束内部记录的生命周期，不删除借用的 GPU 对象。 */
    dispose() {
      this.disposedValue = true;
      this.inputs.clear();
    }
    /** 已关闭或 context 丢失时，拒绝正常顶点输入工作。 */
    assertReady(operation) {
      if (this.disposedValue) {
        throw new WebGLBackendDisposedError(operation);
      }
      if (this.contextLost) {
        throw new WebGLContextLostError(operation);
      }
    }
    /** 保留 GL error 与 context lost 的错误边界，不静默清除错误后继续配置。 */
    checkError(operation) {
      this.assertReady(operation);
      const code = this.gl.getError();
      this.assertReady(operation);
      if (code !== this.gl.NO_ERROR) {
        throw new WebGLOperationError(operation, "vertex input", `GL error ${code}`);
      }
    }
    /**
     * 每个不可重链接的 program 只查询一次 shader 输入类型。
     *
     * @remarks
     * 这里使用真实 WebGLProgram 身份，不使用名称或包装对象身份。
     * 外部不得重新链接 Manager 已发布的 program。
     */
    readInputs(program) {
      const cached = this.inputs.get(program.program);
      if (cached !== void 0) return cached;
      const gl = this.gl;
      const count = gl.getProgramParameter(program.program, gl.ACTIVE_ATTRIBUTES);
      this.assertReady("reflect vertex layout");
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
        throw new WebGLOperationError("reflect vertex layout", "program", "invalid attribute count");
      }
      const inputs = [];
      const locations = /* @__PURE__ */ new Set();
      const supportedTypes = [
        gl.FLOAT,
        gl.FLOAT_VEC2,
        gl.FLOAT_VEC3,
        gl.FLOAT_VEC4
      ];
      for (let index = 0; index < count; index += 1) {
        const info = gl.getActiveAttrib(program.program, index);
        this.assertReady("reflect vertex layout");
        if (info === null) {
          throw new WebGLOperationError("reflect vertex layout", "program", `missing entry ${index}`);
        }
        if (info.size !== 1 || !supportedTypes.includes(info.type)) {
          throw new UnsupportedRenderFeatureError(
            "vertex input",
            `${info.name}: matrix/array layout is unsupported`
          );
        }
        const location = program.attributes.get(info.name);
        if (location === void 0 || !Number.isSafeInteger(location) || location < 0 || location >= this.maxAttributes || locations.has(location)) {
          throw new UnsupportedRenderFeatureError(
            "vertex input",
            `${info.name}: invalid attribute location`
          );
        }
        locations.add(location);
        inputs.push({ name: info.name, location });
      }
      if (inputs.length !== program.attributes.size) {
        throw new WebGLOperationError("reflect vertex layout", "program", "reflection maps disagree");
      }
      this.checkError("reflect vertex layout");
      this.inputs.set(program.program, inputs);
      return inputs;
    }
  };
  __name(_WebGL1VertexInputSupport, "WebGL1VertexInputSupport");
  var WebGL1VertexInputSupport = _WebGL1VertexInputSupport;

  // src/rendering/backend/webgl1/WebGL1ManualVertexInputManager.ts
  var _WebGL1ManualVertexInputManager = class _WebGL1ManualVertexInputManager {
    constructor(gl, maxAttributes, hooks) {
      __publicField(this, "gl");
      __publicField(this, "hooks");
      __publicField(this, "support");
      /** 上一次成功配置后，由本策略启用的位置。 */
      __publicField(this, "enabled", /* @__PURE__ */ new Set());
      /** 首次接管时需要扫描全部位置；之后才能使用 enabled 跟踪。 */
      __publicField(this, "initialized", false);
      /** 用于资源释放前判断当前输入是否正在借用该 Geometry。 */
      __publicField(this, "currentGeometry", null);
      /** 用于 program 释放前判断是否需要结束当前输入绑定。 */
      __publicField(this, "currentProgram", null);
      this.gl = gl;
      this.hooks = hooks;
      this.support = new WebGL1VertexInputSupport(gl, maxAttributes);
    }
    /**
     * 先完整验证，再禁用旧 location、配置本次 pointer 和 EBO。
     *
     * @remarks
     * 首次使用不知道此前启用了哪些 location，因此扫一遍设备上限。
     * 后续只禁用自己跟踪到、但本次不再使用的位置。
     * 配置中失败会禁用顶点属性数组并清空当前 buffer 绑定；
     * 不尝试恢复旧 pointer，调用者必须跳过本次 draw。
     */
    bind(geometry, gpuGeometry, program) {
      let changed = false;
      try {
        this.support.assertBindable(geometry);
        this.support.checkError("prepare manual vertex input");
        const bindings = this.support.resolve(gpuGeometry, program);
        const nextEnabled = new Set(bindings.map((binding) => binding.location));
        changed = true;
        const previous = this.initialized ? this.enabled : Array.from({ length: this.support.maxAttributes }, (_, index) => index);
        for (const location of previous) {
          if (!nextEnabled.has(location)) {
            this.gl.disableVertexAttribArray(location);
          }
        }
        this.support.apply(bindings, gpuGeometry.indexBuffer);
        this.enabled.clear();
        for (const location of nextEnabled) {
          this.enabled.add(location);
        }
        this.initialized = true;
        this.currentGeometry = geometry;
        this.currentProgram = program.program;
      } catch (error) {
        if (!this.support.disposed && this.support.contextLost) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("bind vertex input");
        }
        if (changed) {
          this.resetBindings(true);
        }
        throw error;
      } finally {
        this.hooks.invalidateState();
      }
    }
    /** 禁用受管理的位置并清空当前 buffer 绑定，不删除 CPU/GPU 资源。 */
    unbind() {
      if (this.support.disposed) return;
      if (this.support.contextLost) {
        this.invalidateForContextLoss();
        return;
      }
      try {
        this.resetBindings(false);
        this.support.checkError("unbind manual vertex input");
      } finally {
        this.hooks.invalidateState();
      }
    }
    /** 当前输入借用了该 Geometry 时先解绑，其他 Geometry 不受影响。 */
    releaseGeometry(geometry) {
      if (this.currentGeometry === geometry) {
        this.unbind();
      }
    }
    /** 放弃布局元数据，并在必要时解绑；不调用 deleteProgram。 */
    releaseProgram(program) {
      this.support.forgetProgram(program);
      if (this.currentProgram === program) {
        this.unbind();
      }
    }
    /** lost 期间不执行 disable/bind，只丢弃 CPU 侧跟踪状态。 */
    invalidateForContextLoss() {
      this.enabled.clear();
      this.currentGeometry = null;
      this.currentProgram = null;
      this.initialized = false;
      this.support.invalidateForContextLoss();
      this.hooks.invalidateState();
    }
    /** 幂等结束策略生命周期，不释放借用的 Geometry、program 或 buffer。 */
    dispose() {
      if (this.support.disposed) return;
      try {
        this.unbind();
      } finally {
        this.support.dispose();
      }
    }
    /**
     * 禁用属性数组并清空当前 buffer 绑定。
     *
     * @remarks
     * forceAll 用于失败后的保守清理，覆盖尚未进入 enabled 记录的新 location。
     * 禁用属性数组不等于擦除其全部 pointer 元数据；后续 bind 会重新配置。
     */
    resetBindings(forceAll) {
      const locations = forceAll || !this.initialized ? Array.from({ length: this.support.maxAttributes }, (_, index) => index) : this.enabled;
      for (const location of locations) {
        this.gl.disableVertexAttribArray(location);
      }
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      this.enabled.clear();
      this.currentGeometry = null;
      this.currentProgram = null;
      this.initialized = true;
    }
  };
  __name(_WebGL1ManualVertexInputManager, "WebGL1ManualVertexInputManager");
  var WebGL1ManualVertexInputManager = _WebGL1ManualVertexInputManager;

  // src/rendering/backend/webgl1/WebGL1OESVertexInputManager.ts
  var _WebGL1OESVertexInputManager = class _WebGL1OESVertexInputManager {
    constructor(gl, extension, maxAttributes, hooks) {
      __publicField(this, "gl");
      __publicField(this, "extension");
      __publicField(this, "hooks");
      __publicField(this, "entries", /* @__PURE__ */ new Map());
      __publicField(this, "support");
      /** 本策略最近一次成功绑定的 VAO；不代表可以容忍任意外部 GL 状态修改。 */
      __publicField(this, "currentVAO", null);
      this.gl = gl;
      this.extension = extension;
      this.support = new WebGL1VertexInputSupport(gl, maxAttributes);
      this.hooks = hooks;
    }
    /**
     * 命中时只绑定；未命中时配置一个新 VAO，全部成功后才加入缓存。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][vao-creation-rollback]
     *
     * 新建失败恢复进入本方法时的 VAO/ARRAY_BUFFER，并删除部分 VAO。
     * 成功后保留新 VAO 供 draw 使用，但恢复不属于 VAO 的全局 ARRAY_BUFFER 绑定。
     */
    bind(geometry, gpuGeometry, program) {
      try {
        this.support.assertBindable(geometry);
        const cached = this.entries.get(geometry)?.get(program.program);
        if (cached?.gpuGeometry === gpuGeometry) {
          this.extension.bindVertexArrayOES(cached.vao);
          this.support.assertReady("bind cached VAO");
          this.currentVAO = cached.vao;
          return;
        }
        this.support.checkError("prepare VAO");
        const bindings = this.support.resolve(gpuGeometry, program);
        const previousVAO = this.gl.getParameter(
          this.extension.VERTEX_ARRAY_BINDING_OES
        );
        const previousArray = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
        this.support.checkError("capture vertex input");
        const candidate = this.extension.createVertexArrayOES();
        this.support.assertReady("create VAO");
        const vao = requireNonNull(
          candidate,
          () => new WebGLResourceCreationError(
            "vertex-array",
            `Geometry(drawCount=${gpuGeometry.drawCount}) + WebGLProgram(attributes=${[
              ...program.attributes.keys()
            ].join(",")})`
          )
        );
        try {
          this.extension.bindVertexArrayOES(vao);
          this.support.apply(bindings, gpuGeometry.indexBuffer);
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, previousArray);
          this.support.checkError("finish VAO");
          const programs = this.entries.get(geometry) ?? /* @__PURE__ */ new Map();
          programs.set(program.program, { vao, gpuGeometry });
          this.entries.set(geometry, programs);
          this.currentVAO = vao;
          if (cached !== void 0) {
            this.extension.deleteVertexArrayOES(cached.vao);
          }
        } catch (error) {
          if (!this.support.contextLost) {
            this.extension.bindVertexArrayOES(previousVAO);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, previousArray);
            this.extension.deleteVertexArrayOES(vao);
          }
          throw error;
        }
      } catch (error) {
        if (!this.support.disposed && this.support.contextLost) {
          this.invalidateForContextLoss();
          throw new WebGLContextLostError("bind vertex input");
        }
        throw error;
      } finally {
        this.hooks.invalidateState();
      }
    }
    /** 回到默认 VAO，不删除缓存；默认 VAO 自己原有的状态仍然存在。 */
    unbind() {
      if (this.support.disposed) return;
      if (this.support.contextLost) {
        this.invalidateForContextLoss();
        return;
      }
      this.extension.bindVertexArrayOES(null);
      this.currentVAO = null;
      this.hooks.invalidateState();
    }
    /**
     * 删除关联此 Geometry 的全部 VAO。
     *
     * @remarks
     * Geometry 可以已经 disposed；这里只按对象身份查关联，不再读其 CPU getter。
     * 不删除 GeometryManager 拥有的 buffers。
     */
    releaseGeometry(geometry) {
      if (this.support.disposed) return;
      if (this.support.contextLost) {
        this.invalidateForContextLoss();
        return;
      }
      const programs = this.entries.get(geometry);
      if (programs === void 0) return;
      for (const entry of programs.values()) {
        this.deleteEntry(entry);
      }
      this.entries.delete(geometry);
    }
    /** 删除该实际 program 的所有关联 VAO，不影响其他 program，也不删除 program。 */
    releaseProgram(program) {
      if (this.support.disposed) return;
      if (this.support.contextLost) {
        this.invalidateForContextLoss();
        return;
      }
      for (const [geometry, programs] of this.entries) {
        const entry = programs.get(program);
        if (entry === void 0) continue;
        this.deleteEntry(entry);
        programs.delete(program);
        if (programs.size === 0) {
          this.entries.delete(geometry);
        }
      }
      this.support.forgetProgram(program);
    }
    /** lost 只丢记录；恢复时工厂应创建新策略实例并使用重新取得的扩展对象。 */
    invalidateForContextLoss() {
      this.entries.clear();
      this.currentVAO = null;
      this.support.invalidateForContextLoss();
      this.hooks.invalidateState();
    }
    /** 只删除自己创建的 VAO，绝不删除 program 或 buffers。 */
    dispose() {
      if (this.support.disposed) return;
      if (this.support.contextLost) {
        this.invalidateForContextLoss();
      } else {
        this.unbind();
        for (const programs of this.entries.values()) {
          for (const entry of programs.values()) {
            this.extension.deleteVertexArrayOES(entry.vao);
          }
        }
        this.entries.clear();
      }
      this.support.dispose();
      this.hooks.invalidateState();
    }
    /** 删除当前 VAO 前先解绑；删除非当前 VAO 不打断另一个当前布局。 */
    deleteEntry(entry) {
      if (this.currentVAO === entry.vao) {
        this.unbind();
      }
      this.extension.deleteVertexArrayOES(entry.vao);
    }
  };
  __name(_WebGL1OESVertexInputManager, "WebGL1OESVertexInputManager");
  var WebGL1OESVertexInputManager = _WebGL1OESVertexInputManager;

  // src/rendering/backend/webgl1/WebGL1VertexInputManager.ts
  function createWebGL1VertexInputManager(gl, capabilities, hooks) {
    const extension = capabilities.vertexArrayObject;
    if (extension !== null) {
      return new WebGL1OESVertexInputManager(gl, extension, capabilities.maxVertexAttributes, hooks);
    }
    return new WebGL1ManualVertexInputManager(gl, capabilities.maxVertexAttributes, hooks);
  }
  __name(createWebGL1VertexInputManager, "createWebGL1VertexInputManager");

  // src/rendering/backend/webgl1/WebGL1ResourceManager.ts
  var _WebGL1ResourceManager = class _WebGL1ResourceManager {
    /**
     * 组装已有 Manager；构造时不创建 program、buffer、texture、FBO 或 VAO。
     *
     * @param gl 当前 Backend 独占管理的 context。
     * @param capabilities 从同一 context 当前代探测得到的能力快照。
     * @param hooks 连接该 Backend 的 State 缓存失效入口。
     */
    constructor(gl, capabilities, hooks) {
      __publicField(this, "gl");
      __publicField(this, "programsValue");
      __publicField(this, "geometriesValue");
      __publicField(this, "textures2DValue");
      __publicField(this, "cubeTexturesValue");
      __publicField(this, "renderTargetsValue");
      __publicField(this, "vertexInputsValue");
      __publicField(this, "disposalOrder");
      /** 开始关闭即拒绝新工作；不代表全部 GPU 清理已经成功。 */
      __publicField(this, "closing", false);
      /** 当前实例所属的 context generation 已失效，恢复事件不会把它改回 false。 */
      __publicField(this, "lost", false);
      /** 防止同步重入 dispose；不是跨线程锁。 */
      __publicField(this, "disposing", false);
      /** 指向下一个尚未成功完成的清理步骤，只在该步骤正常返回后前进。 */
      __publicField(this, "disposalIndex", 0);
      if (gl.isContextLost()) throw new WebGLContextLostError("create resource manager");
      this.gl = gl;
      this.vertexInputsValue = createWebGL1VertexInputManager(gl, capabilities, hooks);
      this.geometriesValue = new WebGL1GeometryManager(gl, capabilities, {
        invalidateState: hooks.invalidateState,
        beforeDelete: /* @__PURE__ */ __name((geometry) => {
          this.vertexInputsValue.releaseGeometry(geometry);
        }, "beforeDelete")
      });
      this.programsValue = new WebGL1ProgramManager(gl, {
        invalidateState: hooks.invalidateState,
        beforeDelete: /* @__PURE__ */ __name((program) => {
          this.vertexInputsValue.releaseProgram(program);
        }, "beforeDelete")
      });
      this.textures2DValue = new WebGL1Texture2DManager(gl, capabilities, hooks);
      this.cubeTexturesValue = new WebGL1CubeTextureManager(gl, capabilities, hooks);
      this.renderTargetsValue = new WebGL1RenderTargetManager(gl, capabilities, hooks);
      this.disposalOrder = Object.freeze([
        this.vertexInputsValue,
        this.renderTargetsValue,
        this.textures2DValue,
        this.cubeTexturesValue,
        this.geometriesValue,
        this.programsValue
      ]);
    }
    /** 借用 program Manager；关闭或 lost 后拒绝从协调器开始新工作。 */
    get programs() {
      this.assertAvailable();
      return this.programsValue;
    }
    /** 借用静态 Geometry buffer Manager，不移交其所有权。 */
    get geometries() {
      this.assertAvailable();
      return this.geometriesValue;
    }
    /**
     * 借用静态 CPU 二维纹理的 GPU Manager，不取得 CPU 来源的生命周期。
     * RenderTarget 附件由 renderTargets 拥有，不能交给本 Manager 重复上传。
     */
    get textures2D() {
      this.assertAvailable();
      return this.textures2DValue;
    }
    /** 借用 cubemap Manager，与二维纹理共用当前 generation 的生命周期。 */
    get cubeTextures() {
      this.assertAvailable();
      return this.cubeTexturesValue;
    }
    /** 借用 RenderTarget Manager；surface 作用域的捕获/恢复仍属于 Backend。 */
    get renderTargets() {
      this.assertAvailable();
      return this.renderTargetsValue;
    }
    /** 借用已按 capabilities 选定的 OES 或 manual 顶点输入策略。 */
    get vertexInputs() {
      this.assertAvailable();
      return this.vertexInputsValue;
    }
    /**
     * 永久失效当前一代的全部缓存并取消 CPU Resource 订阅，不执行 GL 删除。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
     *
     * 由 ContextLifecycle 的 lost 通知，或入口检测到物理 lost 时调用。
     * 这些子方法是无 GL、无用户回调的内部清理路径；hooks 必须遵守不抛错契约。
     * 不在这里恢复 context，也不重新上传 CPU 数据或重跑烘焙 Pipeline。
     */
    invalidateForContextLoss() {
      if (this.lost) return;
      this.lost = true;
      for (const manager of this.disposalOrder) {
        manager.invalidateForContextLoss();
      }
    }
    /**
     * 按固定依赖顺序关闭全部 Manager；不调用任何 CPU Resource.dispose()。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-resource-manager-disposal]
     *
     * vertexInputs → renderTargets → textures2D → cubeTextures → geometries → programs。
     *
     * 某一步抛错：立即向调用者传播，停在该步，不删除后续依赖资源。
     * 下一次显式 dispose 从该步重试，已完成的步骤不重复执行。
     * 这不是事务回滚；当前步骤内部的部分清理和重试安全仍由该 Manager 保证。
     *
     * closing 在首次调用时即置 true，即使清理失败也不能恢复绘制。
     * 调用者必须处理异常并决定重试或报告失败；本方法不吞错、不自动循环重试。
     * 不改变 Resource 基类尚未固定的 listener 异常传播语义。
     */
    dispose() {
      if (this.disposing || this.disposalIndex === this.disposalOrder.length) return;
      this.closing = true;
      this.disposing = true;
      try {
        while (this.disposalIndex < this.disposalOrder.length) {
          if (this.gl.isContextLost()) this.invalidateForContextLoss();
          const manager = this.disposalOrder[this.disposalIndex];
          manager.dispose();
          this.disposalIndex += 1;
        }
      } finally {
        this.disposing = false;
      }
    }
    /** 物理 lost 可能早于 DOM 事件；观察到后立即失效全部 Manager，而不只失效某一个。 */
    assertAvailable() {
      if (this.closing) {
        throw new WebGLBackendDisposedError("access resource manager");
      }
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        throw new WebGLContextLostError("access resource manager");
      }
    }
  };
  __name(_WebGL1ResourceManager, "WebGL1ResourceManager");
  var WebGL1ResourceManager = _WebGL1ResourceManager;

  // src/rendering/backend/webgl1/WebGL1State.ts
  var _WebGL1State = class _WebGL1State {
    /** 构造不猜测现有 GL 状态，也不发 GL 命令。 */
    constructor(gl) {
      __publicField(this, "gl");
      __publicField(this, "programValue");
      __publicField(this, "arrayBufferValue");
      __publicField(this, "elementArrayBufferValue");
      __publicField(this, "depthTestValue");
      __publicField(this, "depthWriteValue");
      __publicField(this, "depthFunctionValue");
      __publicField(this, "cullModeValue");
      this.gl = gl;
    }
    /** 只有缓存明确等于目标 program 时才省略 useProgram。 */
    useProgram(program) {
      this.assertContextAvailable("use program");
      if (this.programValue === program) return;
      this.gl.useProgram(program);
      this.programValue = program;
    }
    /** ARRAY_BUFFER 是 context 状态；相同对象绑定可去重。 */
    bindArrayBuffer(buffer) {
      this.assertContextAvailable("bind array buffer");
      if (this.arrayBufferValue === buffer) return;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.arrayBufferValue = buffer;
    }
    /** 只在当前 vertex-input 状态未切换的前提下去重。 */
    bindElementArrayBuffer(buffer) {
      this.assertContextAvailable("bind element array buffer");
      if (this.elementArrayBufferValue === buffer) return;
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
      this.elementArrayBufferValue = buffer;
    }
    /**
     * VAO bind/unbind 后由 VertexInputManager 调用，不能忘记。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-element-buffer-vao-invalidation]
     * ELEMENT_ARRAY_BUFFER 绑定属于 VAO。切到另一个 VAO 后，即使 buffer 参数相同，
     * 也不能沿用上一个 VAO 的缓存判断。本方法不创建或切换 VAO。
     */
    invalidateVertexInputState() {
      this.elementArrayBufferValue = void 0;
    }
    /**
     * 分别比较深度测试、写入与比较函数，只提交与可信缓存不同的配置。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-state-unknown-versus-unbound]
     *
     * 当前采用「读 JavaScript 缓存 → 与期望值比较 → 仅设置变化项」，
     * 不采用「每次查询真实 GL 状态 → 同步缓存 → 比较期望值 → 设置变化项」。
     * 后一种方案确实能发现所查询字段被外部修改，不是逻辑上不可行；
     * 但每次调用都查询 DEPTH_TEST、DEPTH_WRITEMASK、DEPTH_FUNC，会把缓存命中
     * 也变成 GL 查询。例如一帧调用本方法 1000 次，就额外产生 3000 次查询。
     * 查询具有 API 调用成本，且可能涉及实现层的同步等待；具体成本取决于参数
     * 和浏览器，不能笼统声称每次布尔查询都必须等待整个 GPU 完成。
     *
     * 省略查询的正确性前提是：受管理的状态通过本 State 修改；若内部模块必须
     * 绕过它调用原生 GL，则该模块必须在后续使用缓存前使相关缓存失效。
     * 例如缓存记为 depthTest=true，而外部执行 gl.disable(DEPTH_TEST)，
     * 若没有 invalidate，本方法再次收到 true 就会错误地省略 enable。
     * 因此缓存不能自动容忍任意外部修改；不能仅以性能为由忽略这项前提。
     *
     * assertContextAvailable 必须保留：它发现 lost 时才失效缓存并抛错，
     * 健康 context 下不会清空缓存，也不能检测外部绕过 State 的状态修改。
     * 不应在每次调用开头无条件 invalidate，否则三项配置都会重新提交，失去去重意义。
     *
     * 查询真实 framebuffer/viewport 的 captureSurfaceState 用于记录作用域入口，
     * 与逐 draw 查询深度配置不是同一种使用频率和职责。可在受控边界或开发诊断中
     * 核对真实状态，但本方法目前没有实现这样的诊断模式。
     * 若未来加入深度核对，DEPTH_FUNC 返回 GL 数值枚举，须经映射后比较，
     * 不能直接与缓存中的 'less-equal' 等逻辑字符串比较。
     *
     * @param state 已由 Material 验证的完整状态；这里只应用三个深度字段，
     * cullMode 由 setCullMode 单独处理。
     */
    setDepthState(state) {
      this.assertContextAvailable("set depth state");
      const depthFunction = this.toDepthFunction(state.depthFunction);
      if (this.depthTestValue !== state.depthTest) {
        if (state.depthTest) this.gl.enable(this.gl.DEPTH_TEST);
        else this.gl.disable(this.gl.DEPTH_TEST);
        this.depthTestValue = state.depthTest;
      }
      if (this.depthWriteValue !== state.depthWrite) {
        this.gl.depthMask(state.depthWrite);
        this.depthWriteValue = state.depthWrite;
      }
      if (this.depthFunctionValue !== state.depthFunction) {
        this.gl.depthFunc(depthFunction);
        this.depthFunctionValue = state.depthFunction;
      }
    }
    /** none 禁用剔除；back/front 必须启用剔除并指定相应面。 */
    setCullMode(mode) {
      this.assertContextAvailable("set cull mode");
      if (this.cullModeValue === mode) return;
      switch (mode) {
        case "none": {
          this.gl.disable(this.gl.CULL_FACE);
          break;
        }
        case "front": {
          this.gl.enable(this.gl.CULL_FACE);
          this.gl.cullFace(this.gl.FRONT);
          break;
        }
        case "back": {
          this.gl.enable(this.gl.CULL_FACE);
          this.gl.cullFace(this.gl.BACK);
          break;
        }
        default:
          assertNever(mode, "Unsupported WebGL1 cull mode");
      }
      this.cullModeValue = mode;
    }
    /**
     * 查询真实 framebuffer/viewport，而不是猜测它们等于 canvas 默认值。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
     * 两处断言依据固定 pname 的 WebGL 返回协议；不是对调用者输入的断言。
     * 查询后再次检查 lost，避免消费丢失期间返回的无效结果。
     * viewport 被复制成冻结 tuple；不冻结 framebuffer 这个浏览器对象。
     */
    captureSurfaceState() {
      this.assertContextAvailable("capture surface");
      const framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
      const viewport = this.gl.getParameter(this.gl.VIEWPORT);
      this.assertContextAvailable("capture surface");
      const copiedViewport = Object.freeze([
        viewport[0],
        viewport[1],
        viewport[2],
        viewport[3]
      ]);
      return Object.freeze({ framebuffer, viewport: copiedViewport });
    }
    /**
     * 绑定已解析的 GPU 目标；null 在这个内部 API 中明确表示默认 framebuffer。
     *
     * @remarks
     * 这不是公开 RenderSurface 的 null 占位：逻辑资源必须先由 Manager 验证并解析。
     * 总是发出 framebuffer 与 viewport 调用，避免资源创建过程改变绑定后缓存失真。
     * 默认目标使用 gl.drawingBufferWidth/Height，而不是 CSS 尺寸。
     */
    bindSurface(resource) {
      this.assertContextAvailable("bind surface");
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, resource === null ? null : resource.framebuffer);
      this.gl.viewport(
        0,
        0,
        resource === null ? this.gl.drawingBufferWidth : resource.width,
        resource === null ? this.gl.drawingBufferHeight : resource.height
      );
    }
    /**
     * 临时切换输出目标结束后，恢复进入前的 framebuffer 绑定与 viewport。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
     *
     * 这里的 restore 是「恢复临时改变的输出绑定」，不是「恢复丢失的 context」。
     * 正常绘制也需要它：例如进入前绑定默认 framebuffer，viewport 为 800 × 600；
     * 临时绑定 256 × 256 的离屏目标并绘制；最后恢复进入前捕获的绑定与 viewport。
     * 进入前也可能绑定另一个离屏 framebuffer，因此不能一律绑定 null 回到屏幕。
     * 本方法只恢复这两个状态，不恢复 program、深度状态等全部 GL 状态，
     * 也不回滚已经写入附件的像素。
     *
     * 调用者应在切换前捕获快照，把目标解析、绑定和绘制放进 try，
     * 再在 finally 中调用本方法。这样普通绘制异常也会经过绑定恢复。
     * 本方法自身不捕获快照、不执行绘制，也不会自动建立这个 try/finally 作用域。
     * 当前单元测试演示了这种调用；正式 Backend 编排属于 Task 15 的
     * RenderBackend.withRenderSurface 实现，不是本 State 已接入的生产调用链。
     *
     * 如果进入 finally 时 context 已经 lost，旧 GPU handles 已失效，
     * 无法靠重新 bindFramebuffer 完成恢复。此时仅调用 invalidate 遗忘本地缓存，
     * 不发送绑定或 viewport 命令，也不额外抛错遮蔽外层 draw 的原始异常。
     * 这里的 return 只退出本方法，不会吞掉外层 try 已经抛出的异常；
     * 也不表示输出绑定已恢复，或 context 已恢复。
     *
     * 浏览器之后的 webglcontextrestored 事件走独立的生命周期流程；
     * 引擎的能力重探测、State/Manager 重建和 GPU 资源恢复由 Backend 协调，
     * 不由本方法执行。即使浏览器后来恢复了 context，也不能再拿旧快照来恢复。
     *
     * 快照只允许用于同一 context、同一次有效 context 生命周期内的同步作用域。
     * 调用者须保证期间没有跨 await，也没有释放或 resize 快照借用的外层目标。
     * 本方法的 isContextLost 检查不验证跨恢复周期的快照，因此不能代替这些前提。
     *
     * @param snapshot 本次同步作用域进入前捕获的 framebuffer 引用和 viewport 数值。
     * 它不是 GPU 资源备份，不拥有 framebuffer，也不能用于重建失效的附件。
     */
    restoreSurfaceState(snapshot2) {
      if (this.gl.isContextLost()) {
        this.invalidate();
        return;
      }
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, snapshot2.framebuffer);
      this.gl.viewport(...snapshot2.viewport);
    }
    /**
     * 遗忘全部已缓存状态，但不把 GPU 重置成任何默认值，也不调用 delete*。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-state-invalidation-not-reset]
     * 下次设置即使传相同值也重新发 GL 命令。context lost 或外部受控状态修改时使用。
     */
    invalidate() {
      this.programValue = void 0;
      this.arrayBufferValue = void 0;
      this.elementArrayBufferValue = void 0;
      this.depthTestValue = void 0;
      this.depthWriteValue = void 0;
      this.depthFunctionValue = void 0;
      this.cullModeValue = void 0;
    }
    /** Backend 仍须检查生命周期 ready；这里仅补充浏览器已丢失 context 的防线。 */
    assertContextAvailable(operation) {
      if (this.gl.isContextLost()) {
        this.invalidate();
        throw new WebGLContextLostError(operation);
      }
    }
    /** 使用 default + assertNever，增加枚举成员时编译器会要求补齐映射。 */
    toDepthFunction(value) {
      switch (value) {
        case "less": {
          return this.gl.LESS;
        }
        case "less-equal": {
          return this.gl.LEQUAL;
        }
        case "always": {
          return this.gl.ALWAYS;
        }
        default:
          assertNever(value, "Unsupported WebGL1 depth function");
      }
    }
  };
  __name(_WebGL1State, "WebGL1State");
  var WebGL1State = _WebGL1State;

  // src/rendering/backend/webgl1/WebGL1Uniforms.ts
  function copyFloat32(values, length4, field) {
    const raw = values;
    if (!Array.isArray(raw) || raw.length !== length4) {
      throw new InvalidMaterialError(field, "invalid numeric array length");
    }
    const result = new Float32Array(length4);
    for (let index = 0; index < length4; index++) {
      const value = values[index];
      if (typeof value !== "number" || !Number.isFinite(Math.fround(value))) {
        throw new InvalidMaterialError(field, "must contain finite Float32 values");
      }
      result[index] = value;
    }
    return result;
  }
  __name(copyFloat32, "copyFloat32");
  var _WebGL1Uniforms = class _WebGL1Uniforms {
    /**
     * 注入当前 generation 的两种解析器，不让 Uniforms 自己拥有 GPU cache。
     * resolve2D 同时收到 uniformName，供附件反馈错误提供具体参数现场。
     */
    constructor(gl, maxTextureUnits, resolveCube, resolve2D) {
      __publicField(this, "gl");
      __publicField(this, "maxTextureUnits");
      __publicField(this, "resolveCube");
      /** 由 Backend 分流 CPU 纹理与附件地址；结果只在本次 draw 内借用。 */
      __publicField(this, "resolve2D");
      /** 只缓存元数据；真正的 GPU program 仍由 ProgramManager 拥有。 */
      __publicField(this, "layouts", /* @__PURE__ */ new WeakMap());
      this.gl = gl;
      this.maxTextureUnits = maxTextureUnits;
      this.resolveCube = resolveCube;
      this.resolve2D = resolve2D;
    }
    /**
     * 解析本次 draw 的全部 active uniforms，但不调用 uniform*。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][uniform-prepare-before-upload]
     * 二维纹理、附件和 cubemap 解析可能创建 GPU 存储，因此这不是“所有 GPU 状态
     * 都不变”的事务。保证的是验证失败时不会部分写入本次 program 的 uniforms。
     * Backend 必须在 prepare 返回后重新应用 program/state，再调用 upload。
     */
    prepare(program, submission) {
      this.assertContext();
      const material = submission.item.material;
      const shader2 = material.shaderModule;
      const layout = this.reflect(program, shader2.name);
      const parameters = new Map(material.getParameterEntries());
      const builtIns = /* @__PURE__ */ new Map();
      for (const [semantic, name] of Object.entries(shader2.builtInUniforms)) {
        if (builtIns.has(name)) {
          throw new InvalidMaterialError(name, "multiple built-in semantics share one uniform");
        }
        builtIns.set(name, semantic);
      }
      const samplerCount = layout.filter(
        (entry) => entry.type === this.gl.SAMPLER_2D || entry.type === this.gl.SAMPLER_CUBE
      ).length;
      if (samplerCount > this.maxTextureUnits) {
        throw new UnsupportedRenderFeatureError(
          "texture units",
          "active sampler uniforms exceed the fragment texture-unit limit"
        );
      }
      let nextTextureUnit = 0;
      const uploads = layout.map((entry) => {
        const semantic = builtIns.get(entry.name);
        const parameter = semantic === void 0 ? parameters.get(entry.name) : this.builtInParameter(semantic, submission);
        if (parameter === void 0) {
          throw new InvalidMaterialError(entry.name, "active uniform has no value for this draw");
        }
        if (this.uniformType(parameter.type) !== entry.type) {
          throw new InvalidMaterialError(entry.name, "parameter type does not match active uniform");
        }
        if (parameter.type === "cubeTexture") {
          const unit = nextTextureUnit++;
          const resource = this.resolveCube(parameter.value);
          return () => {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, resource.handle);
            this.gl.uniform1i(entry.location, unit);
          };
        }
        if (parameter.type === "texture2D") {
          const unit = nextTextureUnit++;
          const handle = this.resolve2D(parameter.value, entry.name);
          return () => {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.gl.TEXTURE_2D, handle);
            this.gl.uniform1i(entry.location, unit);
          };
        }
        return this.numericUpload(entry.location, entry.name, parameter);
      });
      this.assertContext();
      return uploads;
    }
    /**
     * 写入已经绑定的 program；不能跨 draw、跨 program 或跨 context 恢复复用命令。
     * 本方法不自行 useProgram，也不决定 surface 和 draw 顺序。
     */
    upload(commands) {
      this.assertContext();
      for (const command of commands) command();
      this.assertContext();
    }
    /**
     * 每个真实 program 反射一次 type/size，location 借用 ProgramManager 的缓存。
     *
     * @remarks
     * 目前 ProgramManager 只导出 location；这里额外做一次冷路径反射，避免
     * 本批悄悄改变 Task 11 的接口。不是每帧查询，也不创建第二份 program。
     * 数组尚无 CPU 参数契约，因此明确拒绝，不只上传数组第一个元素。
     */
    reflect(program, label2) {
      const cached = this.layouts.get(program.program);
      if (cached !== void 0) return cached;
      const count = this.gl.getProgramParameter(program.program, this.gl.ACTIVE_UNIFORMS);
      this.assertContext();
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
        throw new WebGLOperationError("reflect uniforms", label2, "invalid active uniform count");
      }
      const result = [];
      for (let index = 0; index < count; index++) {
        const info = this.gl.getActiveUniform(program.program, index);
        this.assertContext();
        if (info === null) {
          throw new WebGLOperationError("reflect uniforms", label2, "missing active uniform info");
        }
        if (info.size !== 1 || /\[\d+\]/.test(info.name)) {
          throw new UnsupportedRenderFeatureError("uniform arrays", info.name);
        }
        const location = program.uniforms.get(info.name);
        if (location === void 0) {
          throw new WebGLOperationError("reflect uniforms", label2, "missing uniform location");
        }
        result.push({ name: info.name, type: info.type, location });
      }
      this.layouts.set(program.program, result);
      return result;
    }
    /** 内建值属于本次 RenderItem/ViewState，不写回共享 Material。 */
    builtInParameter(semantic, submission) {
      const { item, view } = submission;
      switch (semantic) {
        case "modelMatrix":
          return { type: "mat4", value: item.worldMatrix };
        case "viewMatrix":
          return { type: "mat4", value: view.viewMatrix };
        case "projectionMatrix":
          return { type: "mat4", value: view.projectionMatrix };
        case "cameraPosition":
          return { type: "vec3", value: view.cameraWorldPosition };
        case "normalMatrix": {
          const model = copyFloat32(item.worldMatrix, 16, "modelMatrix");
          const camera = copyFloat32(view.viewMatrix, 16, "viewMatrix");
          const modelView = new Float32Array(16);
          const normal = new Float32Array(9);
          mat4_exports.multiply(modelView, camera, model);
          mat3_exports.fromMat4(normal, modelView);
          if (mat3_exports.invert(normal, normal) === null) {
            throw new InvalidMaterialError("normalMatrix", "model-view matrix is singular");
          }
          mat3_exports.transpose(normal, normal);
          return { type: "mat3", value: Array.from(normal) };
        }
        default:
          return assertNever(semantic);
      }
    }
    /** 把 CPU 参数标签转换成反射返回的 GLSL 类型。 */
    uniformType(type) {
      switch (type) {
        case "float":
          return this.gl.FLOAT;
        case "int":
          return this.gl.INT;
        case "bool":
          return this.gl.BOOL;
        case "vec2":
          return this.gl.FLOAT_VEC2;
        case "vec3":
          return this.gl.FLOAT_VEC3;
        case "vec4":
          return this.gl.FLOAT_VEC4;
        case "mat3":
          return this.gl.FLOAT_MAT3;
        case "mat4":
          return this.gl.FLOAT_MAT4;
        case "texture2D":
          return this.gl.SAMPLER_2D;
        case "cubeTexture":
          return this.gl.SAMPLER_CUBE;
        default:
          return assertNever(type);
      }
    }
    /** 数值先复制/量化，再捕获进命令；transpose 固定 false，输入采用列主序。 */
    numericUpload(location, name, parameter) {
      const gl = this.gl;
      switch (parameter.type) {
        case "float": {
          const value = copyFloat32([parameter.value], 1, name)[0];
          return () => gl.uniform1f(location, value);
        }
        case "int":
          return () => gl.uniform1i(location, parameter.value);
        case "bool":
          return () => gl.uniform1i(location, parameter.value ? 1 : 0);
        case "vec2": {
          const value = copyFloat32(parameter.value, 2, name);
          return () => gl.uniform2fv(location, value);
        }
        case "vec3": {
          const value = copyFloat32(parameter.value, 3, name);
          return () => gl.uniform3fv(location, value);
        }
        case "vec4": {
          const value = copyFloat32(parameter.value, 4, name);
          return () => gl.uniform4fv(location, value);
        }
        case "mat3": {
          const value = copyFloat32(parameter.value, 9, name);
          return () => gl.uniformMatrix3fv(location, false, value);
        }
        case "mat4": {
          const value = copyFloat32(parameter.value, 16, name);
          return () => gl.uniformMatrix4fv(location, false, value);
        }
        default:
          return assertNever(parameter);
      }
    }
    /** 物理 lost 可以早于 DOM 事件；不能把其反射异常误报成普通材质错误。 */
    assertContext() {
      if (this.gl.isContextLost()) {
        throw new WebGLContextLostError("prepare/upload uniforms");
      }
    }
  };
  __name(_WebGL1Uniforms, "WebGL1Uniforms");
  var WebGL1Uniforms = _WebGL1Uniforms;

  // src/rendering/backend/webgl1/WebGL1SurfaceScope.ts
  function invalid(field, reason) {
    throw new WebGLOperationError("enter surface scope", field, reason);
  }
  __name(invalid, "invalid");
  function record(value, allowed, field) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      invalid(field, "must be a non-array object");
    }
    const input = value;
    for (const key of Object.keys(input)) {
      if (!allowed.includes(key)) invalid(field + "." + key, "unknown field");
    }
    return input;
  }
  __name(record, "record");
  function finiteFloat(value, field) {
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
      invalid(field, "must be representable as a finite Float32");
    }
    return value;
  }
  __name(finiteFloat, "finiteFloat");
  function snapshot(value) {
    const input = record(value, ["surface", "clear"], "scope");
    const source = record(input.surface, ["kind", "target"], "surface");
    let surface;
    switch (source.kind) {
      case "default-framebuffer": {
        if ("target" in source) invalid("surface.target", "not allowed for default framebuffer");
        surface = { kind: "default-framebuffer" };
        break;
      }
      case "render-target": {
        if (!(source.target instanceof RenderTarget)) {
          invalid("surface.target", "must reference a RenderTarget");
        }
        if (source.target.disposed) throw new ResourceDisposedError("RenderTarget");
        surface = { kind: "render-target", target: source.target };
        break;
      }
      default:
        invalid("surface.kind", "unsupported destination");
    }
    const raw = input.clear === void 0 ? {} : record(input.clear, ["color", "depth", "stencil"], "clear");
    let color;
    if (raw.color !== void 0) {
      if (!Array.isArray(raw.color) || raw.color.length !== 4) {
        invalid("clear.color", "must contain exactly four numbers");
      }
      const values = raw.color;
      color = Object.freeze([
        finiteFloat(values[0], "clear.color[0]"),
        finiteFloat(values[1], "clear.color[1]"),
        finiteFloat(values[2], "clear.color[2]"),
        finiteFloat(values[3], "clear.color[3]")
      ]);
    }
    let depth;
    if (raw.depth !== void 0) {
      depth = finiteFloat(raw.depth, "clear.depth");
      if (depth < 0 || depth > 1) invalid("clear.depth", "must be in [0, 1]");
    }
    let stencil;
    if (raw.stencil !== void 0) {
      stencil = finiteFloat(raw.stencil, "clear.stencil");
      if (!Number.isInteger(stencil) || stencil < -2147483648 || stencil > 2147483647) {
        invalid("clear.stencil", "must be a signed 32-bit integer");
      }
    }
    return Object.freeze({
      surface: Object.freeze(surface),
      clear: Object.freeze({ color, depth, stencil })
    });
  }
  __name(snapshot, "snapshot");
  var _WebGL1SurfaceScope = class _WebGL1SurfaceScope {
    constructor(gl, state, hooks) {
      this.gl = gl;
      this.state = state;
      this.hooks = hooks;
      __publicField(this, "stack", []);
    }
    /** Backend 用它禁止活动 scope 中修改 drawing buffer 或执行破坏性设备清理。 */
    get active() {
      return this.stack.length > 0;
    }
    /**
     * 执行一次完整 scope；异常时仍尝试恢复，嵌套时恢复到对应入口。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-surface-real-state-snapshot]
     * capture 必须早于 resolveTarget，因为首次创建 FBO 可能改变实际绑定。
     * 每次 run 只执行一次入口 clear，finally 只恢复，不重新进入外层 scope。
     *
     * 若操作与恢复都失败，AggregateError.errors 依次保留操作错误、恢复错误。
     * 单独的操作错误仍原样抛出；独立布尔值避免漏掉 throw undefined。
     * 这是 Scope 的异常策略，不改变 Resource.dispose listener 的待定策略。
     */
    run(descriptor, callback) {
      this.assertAvailable();
      this.assertUnchanged();
      const next = snapshot(descriptor);
      if (typeof callback !== "function") invalid("callback", "must be a function");
      const target2 = next.surface.kind === "render-target" ? next.surface.target : null;
      const frame = {
        target: target2,
        revision: target2 === null ? 0 : target2.revision,
        drawingWidth: this.gl.drawingBufferWidth,
        drawingHeight: this.gl.drawingBufferHeight
      };
      const previous = this.state.captureSurfaceState();
      let failed = false;
      let failure;
      this.stack.push(frame);
      try {
        const resource = target2 === null ? null : this.hooks.resolveTarget(target2);
        this.assertDrawable();
        this.state.bindSurface(resource);
        this.clearAttachments(next.clear);
        this.assertDrawable();
        const result = callback();
        if (result !== void 0) invalid("callback", "must return undefined synchronously");
        this.assertDrawable();
      } catch (error) {
        failed = true;
        failure = error;
      } finally {
        this.stack.pop();
        try {
          this.restoreEntry(previous);
        } catch (restoreError) {
          failure = failed ? new AggregateError([failure, restoreError], "Surface operation and restoration failed") : restoreError;
          failed = true;
        }
      }
      if (failed) throw failure;
    }
    /**
     * Backend 每次 draw 前调用；不是 draw 本身。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][surface-active-resource-boundary]
     * 检查全部活动祖先，而不只检查当前目标。
     * 能检测违规修改，但不能拦截或撤销外部直接执行的 resize/dispose。
     */
    assertDrawable() {
      this.assertAvailable();
      if (!this.active) invalid("draw", "requires an active surface scope");
      this.assertUnchanged();
    }
    /**
     * 在附件被解析成 GPU 纹理前，验证本次采样不会形成反馈环。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][surface-texture-feedback]
     * 先通过 assertDrawable 检查当前代、活动 scope 和所有祖先的生命周期/revision；
     * 然后只比较栈顶：外层 A 暂停、内层写 B 时可以读取 A，返回 A 后不能读取 A。
     * 本阶段每个 RenderTarget 独占其存储，因此 target 身份足以判断颜色槽位冲突。
     * 不检查纹理格式或附件 index；这些由 RenderTargetManager 负责。
     *
     * @param target 采样地址指向的逻辑目标，不是 WebGLFramebuffer。
     * @param uniformName 用于定位发生冲突的材质参数。
     * @throws RenderTargetUnavailableError 当前 draw 试图读取自己的输出时抛出。
     */
    assertCanSample(target2, uniformName) {
      this.assertDrawable();
      const current = this.stack[this.stack.length - 1];
      if (current.target === target2) {
        throw new RenderTargetUnavailableError(
          target2.label,
          "uniform " + uniformName + " cannot sample the current render target"
        );
      }
    }
    /**
     * 恢复入口状态；独立方法让恢复失败在 run 的 finally 内被显式收集。
     * 已删除的 framebuffer 不能重绑，也不能静默替换成默认输出。
     */
    restoreEntry(previous) {
      if (!this.hooks.isCurrent() || this.gl.isContextLost()) {
        this.state.invalidate();
        return;
      }
      this.assertUnchanged();
      if (previous.framebuffer !== null && !this.gl.isFramebuffer(previous.framebuffer)) {
        throw new RenderTargetUnavailableError("scope entry", "framebuffer was deleted");
      }
      this.state.restoreSurfaceState(previous);
    }
    /** Backend 生命周期检查与浏览器物理 lost 检查缺一不可。 */
    assertAvailable() {
      this.hooks.assertReady();
      if (!this.hooks.isCurrent() || this.gl.isContextLost()) {
        throw new WebGLContextLostError("use surface scope");
      }
    }
    /** 跨 await、目标销毁/改尺寸、canvas 改尺寸都不属于合法 scope 行为。 */
    assertUnchanged() {
      for (const frame of this.stack) {
        if (this.gl.drawingBufferWidth !== frame.drawingWidth || this.gl.drawingBufferHeight !== frame.drawingHeight) {
          throw new RenderTargetUnavailableError("drawing buffer", "resized inside an active scope");
        }
        if (frame.target !== null && (frame.target.disposed || frame.target.revision !== frame.revision)) {
          throw new RenderTargetUnavailableError("active scope", "target was disposed or resized");
        }
      }
    }
    /**
     * 对指定附件执行完整清除，不继承上一次 draw 的局部写入限制。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][surface-clear-write-masks]
     * WebGL clear 受 color/depth/stencil write mask 与 scissor 影响。
     * 临时启用所需写入并关闭 scissor/dithering，随后恢复真实入口状态，
     * 所以不会让 WebGL1State 的 depthWrite 缓存与实际状态分离。
     * 本方法不恢复 clearColor/clearDepth/clearStencil 设置，也不承诺恢复全部 GL 状态。
     * getParameter 的断言依照固定 pname 的 WebGL 返回协议，不用于信任外部输入。
     */
    clearAttachments(clear) {
      const gl = this.gl;
      const { color, depth, stencil } = clear;
      let bits = 0;
      if (color !== void 0) bits |= gl.COLOR_BUFFER_BIT;
      if (depth !== void 0) bits |= gl.DEPTH_BUFFER_BIT;
      if (stencil !== void 0) bits |= gl.STENCIL_BUFFER_BIT;
      if (bits === 0) return;
      if (depth !== void 0 && gl.getParameter(gl.DEPTH_BITS) === 0) {
        throw new UnsupportedRenderFeatureError("depth clear", "surface has no depth attachment");
      }
      if (stencil !== void 0 && gl.getParameter(gl.STENCIL_BITS) === 0) {
        throw new UnsupportedRenderFeatureError("stencil clear", "surface has no stencil attachment");
      }
      const colorMask = color === void 0 ? void 0 : gl.getParameter(gl.COLOR_WRITEMASK);
      const depthMask = depth === void 0 ? void 0 : gl.getParameter(gl.DEPTH_WRITEMASK);
      const frontMask = stencil === void 0 ? void 0 : gl.getParameter(gl.STENCIL_WRITEMASK);
      const backMask = stencil === void 0 ? void 0 : gl.getParameter(gl.STENCIL_BACK_WRITEMASK);
      const scissor = gl.isEnabled(gl.SCISSOR_TEST);
      const dither = gl.isEnabled(gl.DITHER);
      this.assertAvailable();
      try {
        if (scissor) gl.disable(gl.SCISSOR_TEST);
        if (dither) gl.disable(gl.DITHER);
        if (color !== void 0) {
          gl.colorMask(true, true, true, true);
          gl.clearColor(...color);
        }
        if (depth !== void 0) {
          gl.depthMask(true);
          gl.clearDepth(depth);
        }
        if (stencil !== void 0) {
          gl.stencilMask(4294967295);
          gl.clearStencil(stencil);
        }
        gl.clear(bits);
        this.assertAvailable();
      } finally {
        if (this.hooks.isCurrent() && !gl.isContextLost()) {
          if (colorMask !== void 0) gl.colorMask(...colorMask);
          if (depthMask !== void 0) gl.depthMask(depthMask);
          if (frontMask !== void 0) gl.stencilMaskSeparate(gl.FRONT, frontMask);
          if (backMask !== void 0) gl.stencilMaskSeparate(gl.BACK, backMask);
          if (scissor) gl.enable(gl.SCISSOR_TEST);
          if (dither) gl.enable(gl.DITHER);
        } else {
          this.state.invalidate();
        }
      }
    }
  };
  __name(_WebGL1SurfaceScope, "WebGL1SurfaceScope");
  var WebGL1SurfaceScope = _WebGL1SurfaceScope;

  // src/rendering/backend/webgl1/WebGL1Backend.ts
  var _WebGL1Backend = class _WebGL1Backend {
    /**
     * 创建 context 和当前代的 CPU 管理对象；GPU 资源仍在首次使用时创建。
     * label 仅用于诊断，不以 canvas.id 或 constructor.name 充当稳定身份。
     */
    constructor(canvas, label2 = "WebGL1Backend", attributes = {}) {
      __publicField(this, "canvas");
      __publicField(this, "gl");
      __publicField(this, "lifecycle");
      __publicField(this, "generation");
      __publicField(this, "disposedValue", false);
      __publicField(this, "cleanupComplete", false);
      /** 对象身份令牌，不是会不断增长的计数器。 */
      __publicField(this, "epoch", {});
      __publicField(this, "suppressedValue", null);
      this.canvas = canvas;
      const gl = canvas.getContext("webgl", {
        alpha: false,
        depth: true,
        ...attributes
      });
      if (gl === null) throw new WebGLContextCreationError(label2);
      this.gl = gl;
      this.generation = this.createGeneration();
      this.lifecycle = new WebGLContextLifecycle(canvas, {
        onLost: /* @__PURE__ */ __name(() => {
          this.invalidateGeneration();
        }, "onLost"),
        restore: /* @__PURE__ */ __name(() => {
          const epoch = this.epoch;
          const candidate = this.createGeneration();
          if (this.disposedValue || epoch !== this.epoch || this.gl.isContextLost()) {
            candidate.resources.invalidateForContextLoss();
            candidate.resources.dispose();
            throw new WebGLContextLostError("publish restored backend");
          }
          this.generation = candidate;
        }, "restore"),
        onReady: /* @__PURE__ */ __name(() => {
          if (this.gl.isContextLost()) {
            throw new WebGLContextLostError("finish restoration");
          }
        }, "onReady"),
        onRestoreFailed: /* @__PURE__ */ __name(() => {
        }, "onRestoreFailed"),
        onSuppressedError: /* @__PURE__ */ __name((error) => {
          this.suppressedValue = error;
        }, "onSuppressedError")
      });
    }
    /** 物理 lost 可能早于事件；一旦观察到，旧代即永久失效。 */
    get ready() {
      if (this.disposedValue) return false;
      if (this.gl.isContextLost()) this.invalidateGeneration();
      return this.lifecycle.isReady && this.generation.valid;
    }
    /** 恢复失败是可观察状态，不会被转换成静默的 draw no-op。 */
    get lastFailure() {
      return this.lifecycle.lastFailure;
    }
    /** 旧调用栈的错误供诊断使用，不覆盖当前生命周期失败。 */
    get lastSuppressedError() {
      return this.suppressedValue;
    }
    /**
     * 把 CSS 尺寸和像素比转换成 drawing-buffer 尺寸；不修改 canvas.style。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][drawing-buffer-resize-boundary]
     * 隐藏元素允许传 0，实际缓冲至少 1×1。先验证两个维度再赋值，避免参数
     * 无效时只修改一半；这不承诺浏览器 GPU 分配失败时能够回滚。
     */
    resizeDrawingBuffer(cssWidth, cssHeight, pixelRatio) {
      const generation = this.requireGeneration("resize drawing buffer");
      this.assertOutsideScope(generation, "resize drawing buffer");
      if (!Number.isFinite(cssWidth) || cssWidth < 0 || !Number.isFinite(cssHeight) || cssHeight < 0 || !Number.isFinite(pixelRatio) || pixelRatio <= 0) {
        throw new WebGLOperationError("resize", "drawing buffer", "invalid dimensions or pixel ratio");
      }
      const width = Math.max(1, Math.floor(cssWidth * pixelRatio));
      const height = Math.max(1, Math.floor(cssHeight * pixelRatio));
      const limits = this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS);
      this.requireGeneration("validate drawing-buffer size");
      if (!(limits instanceof Int32Array) || limits.length !== 2 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width > limits[0] || height > limits[1]) {
        throw new UnsupportedRenderFeatureError("drawing-buffer size", "exceeds viewport limits");
      }
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      generation.state.invalidate();
      this.requireGeneration("finish drawing-buffer resize");
    }
    /** Scope 负责目标绑定、入口清除，以及正常/异常/嵌套退出时的 surface 恢复。 */
    withRenderSurface(descriptor, callback) {
      this.requireGeneration("enter render surface").scope.run(descriptor, callback);
    }
    /**
     * 执行一次完整 draw；不把成功提交解释成 GPU 已经执行完成。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-draw-order]
     * 资源解析 → uniform 预检 → program/state → uniforms/textures → vertex input → draw。
     * 资源冷路径可能使 State 缓存失效，所以必须先解析，再应用本次 draw 的状态。
     * VertexInputManager 最后绑定 VAO/EBO，避免先前的 buffer 上传扰乱索引来源。
     */
    draw(submission) {
      const generation = this.requireGeneration("draw");
      generation.scope.assertDrawable();
      if (!(submission?.item?.geometry instanceof Geometry) || !(submission?.item?.material instanceof Material) || submission.view === null || typeof submission.view !== "object") {
        throw new InvalidMaterialError("submission", "invalid draw submission");
      }
      const { geometry, material } = submission.item;
      const program = generation.resources.programs.get(material.shaderModule);
      const buffers = generation.resources.geometries.get(geometry);
      const commands = generation.uniforms.prepare(program, submission);
      this.assertCurrentDraw(generation);
      generation.state.useProgram(program.program);
      this.applyDrawState(material, generation.state);
      generation.uniforms.upload(commands);
      generation.resources.vertexInputs.bind(geometry, buffers, program);
      this.assertCurrentDraw(generation);
      if (buffers.indexBuffer === null) {
        this.gl.drawArrays(buffers.primitiveMode, 0, buffers.drawCount);
      } else {
        if (buffers.indexType === null) {
          throw new WebGLOperationError("draw", "Geometry", "index buffer has no index type");
        }
        this.gl.drawElements(buffers.primitiveMode, buffers.drawCount, buffers.indexType, 0);
      }
      this.assertCurrentDraw(generation);
    }
    /**
     * 结束 Backend 的 GPU 生命周期，不释放 Geometry/Material/Texture 等 CPU 对象。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-backend-disposal]
     * 活动 scope 中拒绝 dispose，避免删除退出时仍需恢复的 FBO。
     * 清理失败后仍禁止新 draw；再次显式 dispose 交给 ResourceManager 继续清理。
     */
    dispose() {
      if (this.cleanupComplete) return;
      this.assertOutsideScope(this.generation, "dispose backend");
      this.disposedValue = true;
      this.epoch = {};
      this.lifecycle.dispose();
      this.generation.valid = false;
      this.generation.state.invalidate();
      this.generation.resources.dispose();
      this.cleanupComplete = true;
    }
    /** 创建一代独立 Manager；恢复不复活旧 handles，也不立即上传全部 CPU 资源。 */
    createGeneration() {
      const capabilities = detectWebGL1Capabilities(this.gl);
      const state = new WebGL1State(this.gl);
      const resources = new WebGL1ResourceManager(this.gl, capabilities, {
        invalidateState: /* @__PURE__ */ __name(() => {
          state.invalidate();
        }, "invalidateState")
      });
      const token = {};
      const scope = new WebGL1SurfaceScope(this.gl, state, {
        assertReady: /* @__PURE__ */ __name(() => {
          this.requireGeneration("use render surface");
        }, "assertReady"),
        isCurrent: /* @__PURE__ */ __name(() => !this.disposedValue && this.generation?.token === token && this.generation.valid, "isCurrent"),
        resolveTarget: /* @__PURE__ */ __name((target2) => resources.renderTargets.get(target2), "resolveTarget")
      });
      const uniforms = new WebGL1Uniforms(
        this.gl,
        capabilities.maxTextureUnits,
        (texture) => resources.cubeTextures.get(texture),
        (source, uniformName) => {
          if (source instanceof Texture2D) return resources.textures2D.get(source).handle;
          scope.assertCanSample(source.target, uniformName);
          return resources.renderTargets.resolveSampledColor(source);
        }
      );
      return { token, state, resources, uniforms, scope, valid: true };
    }
    /**
     * 应用本次绘制的完整固定状态。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][draw-dither-state]
     *
     * 未支持的 blend/stencil/scissor 等固定关闭。DITHER 由 Material 明确选择：
     * 编码深度的 draw 关闭，后续普通颜色 draw 可以重新开启。
     * 不承诺 scope 退出恢复所有 GL 状态；下一笔 draw 重新应用自己的状态。
     */
    applyDrawState(material, state) {
      const gl = this.gl;
      for (const capability of [
        gl.BLEND,
        gl.STENCIL_TEST,
        gl.SCISSOR_TEST,
        gl.POLYGON_OFFSET_FILL,
        gl.SAMPLE_ALPHA_TO_COVERAGE,
        gl.SAMPLE_COVERAGE
      ]) {
        gl.disable(capability);
      }
      if (material.state.dither) gl.enable(gl.DITHER);
      else gl.disable(gl.DITHER);
      gl.colorMask(true, true, true, true);
      gl.depthRange(0, 1);
      gl.frontFace(gl.CCW);
      gl.lineWidth(1);
      state.setDepthState(material.state);
      state.setCullMode(material.state.cullMode);
    }
    invalidateGeneration() {
      this.epoch = {};
      this.generation.valid = false;
      this.generation.state.invalidate();
      this.generation.resources.invalidateForContextLoss();
    }
    requireGeneration(operation) {
      if (this.disposedValue) throw new WebGLBackendDisposedError(operation);
      if (this.gl.isContextLost()) {
        this.invalidateGeneration();
        throw new WebGLContextLostError(operation);
      }
      if (this.lifecycle.state === "restoring" || this.lifecycle.state === "restore-failed") {
        throw new WebGLOperationError(operation, "WebGL1Backend", this.lifecycle.state);
      }
      if (!this.generation.valid || !this.lifecycle.isReady) {
        throw new WebGLContextLostError(operation);
      }
      return this.generation;
    }
    assertCurrentDraw(generation) {
      if (this.requireGeneration("continue draw") !== generation) {
        throw new WebGLContextLostError("continue draw from an old generation");
      }
      generation.scope.assertDrawable();
    }
    assertOutsideScope(generation, operation) {
      if (generation.scope.active) {
        throw new WebGLOperationError(operation, "WebGL1Backend", "render surface is active");
      }
    }
  };
  __name(_WebGL1Backend, "WebGL1Backend");
  var WebGL1Backend = _WebGL1Backend;

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/query-course.ts
  var query_course_exports = {};
  __export(query_course_exports, {
    FFTShapedPass: () => FFTShapedPass,
    LiteScope: () => LiteScope,
    ScanPass: () => ScanPass,
    countGL: () => countGL,
    fftOrder: () => fftOrder,
    rawTargets: () => rawTargets,
    runLikeV3: () => runLikeV3
  });
  function isQuery(name) {
    if (name === "isContextLost") return false;
    return /^(get|is|check)/.test(name) || name === "readPixels";
  }
  __name(isQuery, "isQuery");
  function constantNames() {
    const names = /* @__PURE__ */ new Map();
    const table = WebGLRenderingContext;
    for (const key of Object.keys(table)) {
      const value = table[key];
      if (typeof value === "number" && !names.has(value)) names.set(value, key);
    }
    return names;
  }
  __name(constantNames, "constantNames");
  function countGL(gl) {
    const names = constantNames();
    const proto = WebGLRenderingContext.prototype;
    const target2 = gl;
    const wrapped = [];
    let queries = /* @__PURE__ */ new Map();
    let commands = 0;
    let lostChecks = 0;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (name === "constructor" || typeof descriptor?.value !== "function") continue;
      const original = descriptor.value;
      wrapped.push(name);
      target2[name] = (...args) => {
        if (name === "isContextLost") {
          lostChecks += 1;
        } else if (isQuery(name)) {
          const key = name === "getParameter" || name === "isEnabled" ? name + "(" + (names.get(args[0]) ?? String(args[0])) + ")" : name;
          queries.set(key, (queries.get(key) ?? 0) + 1);
        } else {
          commands += 1;
        }
        return original.apply(gl, args);
      };
    }
    return {
      reset() {
        queries = /* @__PURE__ */ new Map();
        commands = 0;
        lostChecks = 0;
      },
      read() {
        let queryTotal = 0;
        for (const n of queries.values()) queryTotal += n;
        return { queries: new Map(queries), queryTotal, commands, lostChecks };
      },
      stop() {
        for (const name of wrapped) delete target2[name];
      }
    };
  }
  __name(countGL, "countGL");
  var IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function fullScreenQuad() {
    return new Geometry({
      attributes: {
        position: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]),
          itemSize: 3
        })
      }
    });
  }
  __name(fullScreenQuad, "fullScreenQuad");
  var QUAD_VERTEX = "attribute vec3 position;\nvoid main() { gl_Position = vec4(position, 1.0); }";
  function shader(name, fragmentSource) {
    return new ShaderModule({
      name,
      language: "glsl-es-100",
      vertexSource: QUAD_VERTEX,
      fragmentSource
    });
  }
  __name(shader, "shader");
  function computeMaterial(module, parameters = {}) {
    return new Material({
      shaderModule: module,
      state: { depthTest: false, depthWrite: false },
      parameters
    });
  }
  __name(computeMaterial, "computeMaterial");
  function target(label2, width, height) {
    return new RenderTarget(
      {
        width,
        height,
        colors: [{ format: "rgba8", sampler: { minFilter: "nearest", magFilter: "nearest" } }]
      },
      { label: label2 }
    );
  }
  __name(target, "target");
  function into(renderTarget) {
    return { surface: { kind: "render-target", target: renderTarget } };
  }
  __name(into, "into");
  var SCREEN = { surface: { kind: "default-framebuffer" } };
  function drawInto(backend, view, where, item) {
    backend.withRenderSurface(where, () => {
      backend.draw({ item, view });
      return void 0;
    });
  }
  __name(drawInto, "drawInto");
  var SEED_FRAGMENT = `precision mediump float;
void main() {
  float i = floor(gl_FragCoord.x);          // 这一格的下标 0..7
  gl_FragColor = vec4((i + 1.0) / 255.0, 0.0, 0.0, 1.0);
}`;
  var STEP_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;   // 上一轮写好的那张纹理
uniform float uOffset;      // d：往左隔几格去读
uniform float uWidth;       // 一共几格（8）
void main() {
  float i = floor(gl_FragCoord.x);
  float self = texture2D(uInput, vec2((i + 0.5) / uWidth, 0.5)).r;
  float left = 0.0;
  if (i >= uOffset) left = texture2D(uInput, vec2((i - uOffset + 0.5) / uWidth, 0.5)).r;
  gl_FragColor = vec4(self + left, 0.0, 0.0, 1.0);
}`;
  var COPY_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;
uniform float uWidth;
void main() {
  float i = floor(gl_FragCoord.x);
  gl_FragColor = vec4(texture2D(uInput, vec2((i + 0.5) / uWidth, 0.5)).r, 0.0, 0.0, 1.0);
}`;
  var _ScanPass = class _ScanPass {
    constructor(mode) {
      this.mode = mode;
      __publicField(this, "name", "ScanPass");
      /** 每进一次 scope 记一行，课程页拿来打印。 */
      __publicField(this, "log", []);
      __publicField(this, "quad", fullScreenQuad());
      __publicField(this, "ping", target("scan/ping", 8, 1));
      __publicField(this, "pong", target("scan/pong", 8, 1));
      __publicField(this, "seed", computeMaterial(shader("scan/seed", SEED_FRAGMENT)));
      __publicField(this, "step");
      __publicField(this, "copy");
      const stepModule = shader("scan/step", STEP_FRAGMENT);
      this.step = computeMaterial(stepModule, {
        uInput: { type: "texture2D", value: this.ping.getColorAttachment(0) },
        uOffset: { type: "float", value: 1 },
        uWidth: { type: "float", value: 8 }
      });
      this.copy = computeMaterial(shader("scan/copy", COPY_FRAGMENT), {
        uInput: { type: "texture2D", value: this.ping.getColorAttachment(0) },
        uWidth: { type: "float", value: 8 }
      });
    }
    item(material) {
      return { geometry: this.quad, material, worldMatrix: IDENTITY };
    }
    execute(context) {
      const { backend, view } = context;
      this.log.length = 0;
      drawInto(backend, view, into(this.ping), this.item(this.seed));
      this.log.push("第 0 轮　写 ping");
      let read = this.ping;
      let write = this.mode === "ping-pong" ? this.pong : this.ping;
      for (let s = 0; s < 3; s++) {
        const input = read.getColorAttachment(0);
        this.step.setParameter("uInput", { type: "texture2D", value: input });
        this.step.setParameter("uOffset", { type: "float", value: 2 ** s });
        const note = "读 " + label(read) + "，写 " + label(write) + "（d = " + 2 ** s + "）";
        this.log.push("第 " + (s + 1) + " 轮　" + note);
        drawInto(backend, view, into(write), this.item(this.step));
        if (this.mode === "ping-pong") [read, write] = [write, read];
      }
      const result = read.getColorAttachment(0);
      this.copy.setParameter("uInput", { type: "texture2D", value: result });
      drawInto(backend, view, SCREEN, this.item(this.copy));
      this.log.push("最后　读 " + label(read) + "，写屏幕");
      return void 0;
    }
    dispose() {
      for (const resource of [this.seed, this.step, this.copy, this.quad, this.ping, this.pong]) {
        resource.dispose();
      }
    }
  };
  __name(_ScanPass, "ScanPass");
  var ScanPass = _ScanPass;
  function label(renderTarget) {
    return renderTarget.label.replace("scan/", "");
  }
  __name(label, "label");
  var MOVE_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;
uniform float uSize;
void main() {
  gl_FragColor = texture2D(uInput, gl_FragCoord.xy / uSize);
}`;
  var SPECTRUM_FRAGMENT = `precision mediump float;
void main() { gl_FragColor = vec4(0.5, 0.25, 0.0, 1.0); }`;
  var _FFTShapedPass = class _FFTShapedPass {
    constructor(shape) {
      this.shape = shape;
      __publicField(this, "name", "FFTShapedPass");
      /** 上一帧进 scope 的次数。 */
      __publicField(this, "scopes", 0);
      __publicField(this, "quad", fullScreenQuad());
      __publicField(this, "spectrum");
      __publicField(this, "move");
      __publicField(this, "layerTargets", []);
      this.spectrum = computeMaterial(shader("fft/spectrum", SPECTRUM_FRAGMENT));
      for (let layer = 0; layer < shape.layers; layer++) {
        const name = /* @__PURE__ */ __name((what) => target("fft/layer" + layer + "/" + what, shape.size, shape.size), "name");
        this.layerTargets.push({
          spectrum: name("spectrum"),
          ping: name("ping"),
          pong: name("pong"),
          packed: name("packed"),
          final: name("final")
        });
      }
      this.move = computeMaterial(shader("fft/move", MOVE_FRAGMENT), {
        uInput: { type: "texture2D", value: this.layerTargets[0].spectrum.getColorAttachment(0) },
        uSize: { type: "float", value: shape.size }
      });
    }
    moveInto(context, from, to) {
      this.move.setParameter("uInput", { type: "texture2D", value: from.getColorAttachment(0) });
      drawInto(context.backend, context.view, into(to), {
        geometry: this.quad,
        material: this.move,
        worldMatrix: IDENTITY
      });
      this.scopes += 1;
    }
    execute(context) {
      this.scopes = 0;
      const signals = 4 / this.shape.channels;
      for (const t of this.layerTargets) {
        drawInto(context.backend, context.view, into(t.spectrum), {
          geometry: this.quad,
          material: this.spectrum,
          worldMatrix: IDENTITY
        });
        this.scopes += 1;
        for (let p = 0; p < signals; p++) {
          let read = t.spectrum;
          let write = t.ping;
          const steps = 2 * this.shape.rounds;
          for (let step = 0; step < steps; step++) {
            const last = step === steps - 1;
            this.moveInto(context, read, last ? t.packed : write);
            read = write;
            write = write === t.ping ? t.pong : t.ping;
          }
        }
        this.moveInto(context, t.packed, t.final);
      }
      return void 0;
    }
    dispose() {
      this.spectrum.dispose();
      this.move.dispose();
      this.quad.dispose();
      for (const t of this.layerTargets) {
        for (const r of [t.spectrum, t.ping, t.pong, t.packed, t.final]) r.dispose();
      }
    }
  };
  __name(_FFTShapedPass, "FFTShapedPass");
  var FFTShapedPass = _FFTShapedPass;
  var _LiteScope = class _LiteScope {
    constructor(gl, strategy) {
      this.gl = gl;
      this.strategy = strategy;
      __publicField(this, "stack", []);
      __publicField(this, "remembered");
    }
    ask() {
      const framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
      const v = this.gl.getParameter(this.gl.VIEWPORT);
      return { framebuffer, viewport: [v[0], v[1], v[2], v[3]] };
    }
    entry() {
      if (this.strategy === "stack" && this.stack.length > 0) return this.stack[this.stack.length - 1];
      if (this.strategy === "remember" && this.remembered !== void 0) return this.remembered;
      return this.ask();
    }
    bind(binding) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binding.framebuffer);
      this.gl.viewport(...binding.viewport);
      this.remembered = binding;
    }
    /** 进门记下入口 → 绑目标 → 执行 → 出门绑回入口。 */
    run(framebuffer, size, callback) {
      const previous = this.entry();
      const next = { framebuffer, viewport: [0, 0, size, size] };
      this.bind(next);
      this.stack.push(next);
      try {
        callback();
      } finally {
        this.stack.pop();
        this.bind(previous);
      }
    }
  };
  __name(_LiteScope, "LiteScope");
  var LiteScope = _LiteScope;
  function fftOrder(shape) {
    const order = ["spectrum"];
    const signals = 4 / shape.channels;
    for (let p = 0; p < signals; p++) {
      let write = "ping";
      for (let step = 0; step < 2 * shape.rounds; step++) {
        order.push(step === 2 * shape.rounds - 1 ? "packed" : write);
        write = write === "ping" ? "pong" : "ping";
      }
    }
    order.push("final");
    return order;
  }
  __name(fftOrder, "fftOrder");
  function rawTargets(gl, layers, size) {
    const result = [];
    for (let layer = 0; layer < layers; layer++) {
      const map = /* @__PURE__ */ new Map();
      for (const name of ["spectrum", "ping", "pong", "packed", "final"]) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        map.set(name, framebuffer);
      }
      result.push(map);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return result;
  }
  __name(rawTargets, "rawTargets");
  function runLikeV3(gl, layers, order, size) {
    const saved = {
      framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
      viewport: gl.getParameter(gl.VIEWPORT),
      cullFace: gl.getParameter(gl.CULL_FACE),
      scissor: gl.getParameter(gl.SCISSOR_TEST),
      blend: gl.getParameter(gl.BLEND),
      depthTest: gl.getParameter(gl.DEPTH_TEST),
      colorMask: gl.getParameter(gl.COLOR_WRITEMASK)
    };
    gl.disable(gl.DEPTH_TEST);
    for (const targets of layers) {
      for (const name of order) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, targets.get(name));
        gl.viewport(0, 0, size, size);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, saved.framebuffer);
    gl.viewport(saved.viewport[0], saved.viewport[1], saved.viewport[2], saved.viewport[3]);
    if (saved.cullFace) gl.enable(gl.CULL_FACE);
    else gl.disable(gl.CULL_FACE);
    if (saved.scissor) gl.enable(gl.SCISSOR_TEST);
    else gl.disable(gl.SCISSOR_TEST);
    if (saved.blend) gl.enable(gl.BLEND);
    else gl.disable(gl.BLEND);
    if (saved.depthTest) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.colorMask(...saved.colorMask);
  }
  __name(runLikeV3, "runLikeV3");
  return __toCommonJS(query_entry_exports);
})();
