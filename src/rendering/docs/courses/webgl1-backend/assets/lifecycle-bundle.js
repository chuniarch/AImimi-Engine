// 自动生成：esbuild 打包 dual-webgl-backend worktree 的 src/rendering（2026-10-07，第 13 课）。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachLifecycle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
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

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/lifecycle-entry.ts
  var lifecycle_entry_exports = {};
  __export(lifecycle_entry_exports, {
    DuplicateSceneNodeError: () => DuplicateSceneNodeError,
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
    ProgramLinkError: () => ProgramLinkError,
    RenderTargetUnavailableError: () => RenderTargetUnavailableError,
    RenderingError: () => RenderingError,
    ResourceDisposedError: () => ResourceDisposedError,
    ResourceHasSceneReferencesError: () => ResourceHasSceneReferencesError,
    ResourceSceneReferenceUnderflowError: () => ResourceSceneReferenceUnderflowError,
    SceneGraphCycleError: () => SceneGraphCycleError,
    ShaderCompilationError: () => ShaderCompilationError,
    UnsupportedIndexTypeError: () => UnsupportedIndexTypeError,
    UnsupportedRenderFeatureError: () => UnsupportedRenderFeatureError,
    UnsupportedShaderLanguageError: () => UnsupportedShaderLanguageError,
    WebGLBackendDisposedError: () => WebGLBackendDisposedError,
    WebGLContextCreationError: () => WebGLContextCreationError,
    WebGLContextLifecycle: () => WebGLContextLifecycle,
    WebGLContextLostError: () => WebGLContextLostError,
    WebGLOperationError: () => WebGLOperationError,
    WebGLResourceCreationError: () => WebGLResourceCreationError,
    detectWebGL1Capabilities: () => detectWebGL1Capabilities
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
    constructor(resourceKind, label) {
      super(`WebGL failed to create ${resourceKind} for ${label}`, "WEBGL_RESOURCE_CREATION_FAILED", {
        resourceKind,
        label
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
    constructor(operation, label, reason) {
      super(`WebGL ${operation} failed for ${label}: ${reason}`, "WEBGL_OPERATION_FAILED", {
        operation,
        label,
        reason
      });
    }
  };
  __name(_WebGLOperationError, "WebGLOperationError");
  var WebGLOperationError = _WebGLOperationError;

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
  return __toCommonJS(lifecycle_entry_exports);
})();
