// 自动生成：esbuild 打包 dual-webgl-backend worktree 的 src/rendering（2026-10-11，第 29 课；含未提交的 WebGL1Texture2DManager、Texture2DSamplingSource）。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachTexDesign = (() => {
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

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/texture-design-entry.ts
  var texture_design_entry_exports = {};
  __export(texture_design_entry_exports, {
    CubeTexture: () => CubeTexture,
    DataTexture2D: () => DataTexture2D,
    DuplicateSceneNodeError: () => DuplicateSceneNodeError,
    ImageTexture2D: () => ImageTexture2D,
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
    RenderTarget: () => RenderTarget,
    RenderTargetUnavailableError: () => RenderTargetUnavailableError,
    RenderingError: () => RenderingError,
    ResourceDisposedError: () => ResourceDisposedError,
    ResourceHasSceneReferencesError: () => ResourceHasSceneReferencesError,
    ResourceSceneReferenceUnderflowError: () => ResourceSceneReferenceUnderflowError,
    SceneGraphCycleError: () => SceneGraphCycleError,
    ShaderCompilationError: () => ShaderCompilationError,
    Texture2D: () => Texture2D,
    UnsupportedIndexTypeError: () => UnsupportedIndexTypeError,
    UnsupportedRenderFeatureError: () => UnsupportedRenderFeatureError,
    UnsupportedShaderLanguageError: () => UnsupportedShaderLanguageError,
    WebGL1CubeTextureManager: () => WebGL1CubeTextureManager,
    WebGL1RenderTargetManager: () => WebGL1RenderTargetManager,
    WebGL1Texture2DManager: () => WebGL1Texture2DManager,
    WebGLBackendDisposedError: () => WebGLBackendDisposedError,
    WebGLContextCreationError: () => WebGLContextCreationError,
    WebGLContextLostError: () => WebGLContextLostError,
    WebGLOperationError: () => WebGLOperationError,
    WebGLResourceCreationError: () => WebGLResourceCreationError,
    assertTextureOperation: () => assertTextureOperation,
    copyTexture2DSamplingSource: () => copyTexture2DSamplingSource,
    detectWebGL1Capabilities: () => detectWebGL1Capabilities,
    requireTextureLimit: () => requireTextureLimit,
    withTextureUploadState: () => withTextureUploadState
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

  // src/rendering/resources/Texture2D.ts
  function getTextureDiagnosticLabel(label) {
    if (typeof label !== "string" || label.trim().length === 0) {
      return "<unnamed>";
    }
    return label;
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
  function getCubeDiagnosticLabel(label) {
    if (typeof label !== "string" || label.trim().length === 0) {
      return "<unnamed>";
    }
    return label;
  }
  __name(getCubeDiagnosticLabel, "getCubeDiagnosticLabel");
  function copyCubeFaces(faces) {
    const copiedFaces = [faces[0], faces[1], faces[2], faces[3], faces[4], faces[5]];
    return Object.freeze(copiedFaces);
  }
  __name(copyCubeFaces, "copyCubeFaces");
  function createCubeImageSnapshot(label, source) {
    const rawFaces = source.faces;
    if (!Array.isArray(rawFaces) || rawFaces.length !== 6) {
      const receivedFaceCount = Array.isArray(rawFaces) ? rawFaces.length : "non-array";
      throw new InvalidCubeTextureError(
        label,
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
        throw new InvalidCubeTextureError(label, `image face ${faceIndex} must be an object`, {
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
  function createCubeDataFaceSnapshot(label, face, faceIndex, storage) {
    return createTexturePixelSnapshot2D(
      face,
      storage,
      (reason) => new InvalidCubeTextureError(label, `data face ${faceIndex} is invalid: ${reason}`, {
        faceIndex
      })
    );
  }
  __name(createCubeDataFaceSnapshot, "createCubeDataFaceSnapshot");
  function createCubeDataSnapshot(label, source, storage) {
    const rawFaces = source.faces;
    if (!Array.isArray(rawFaces) || rawFaces.length !== 6) {
      const receivedFaceCount = Array.isArray(rawFaces) ? rawFaces.length : "non-array";
      throw new InvalidCubeTextureError(
        label,
        `data source must contain exactly 6 faces; received ${String(receivedFaceCount)}`,
        {
          expectedFaceCount: 6,
          receivedFaceCount
        }
      );
    }
    const faces = source.faces;
    const snapshots = [
      createCubeDataFaceSnapshot(label, faces[0], 0, storage),
      createCubeDataFaceSnapshot(label, faces[1], 1, storage),
      createCubeDataFaceSnapshot(label, faces[2], 2, storage),
      createCubeDataFaceSnapshot(label, faces[3], 3, storage),
      createCubeDataFaceSnapshot(label, faces[4], 4, storage),
      createCubeDataFaceSnapshot(label, faces[5], 5, storage)
    ];
    assertValidCubeFaceDimensions(
      snapshots,
      (reason, details) => new InvalidCubeTextureError(label, reason, details)
    );
    return Object.freeze({
      kind: "data",
      faces: Object.freeze(snapshots)
    });
  }
  __name(createCubeDataSnapshot, "createCubeDataSnapshot");
  function createCubeSourceSnapshot(label, source, storage) {
    if (source === null || typeof source !== "object") {
      throw new InvalidCubeTextureError(label, "source must be an object");
    }
    const sourceKind = source.kind;
    switch (sourceKind) {
      case "images":
        return createCubeImageSnapshot(label, source);
      case "data":
        return createCubeDataSnapshot(label, source, storage);
      default:
        throw new InvalidCubeTextureError(label, `unsupported source kind ${String(sourceKind)}`, {
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

  // src/rendering/resources/RenderTarget.ts
  var COLOR_ATTACHMENT_FORMATS = Object.freeze(["rgba8"]);
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
      const label = input.label;
      if (typeof label !== "string" || label.trim().length === 0) {
        throw new InvalidRenderTargetError("options.label", "must be a non-blank string", {
          received: label
        });
      }
      this.label = label;
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

  // src/rendering/core/validation.ts
  function assertNonArrayObject(value, errorFactory) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw errorFactory();
    }
  }
  __name(assertNonArrayObject, "assertNonArrayObject");

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
    const target = input.target;
    const kind = input.kind;
    const index = input.index;
    if (!(target instanceof RenderTarget))
      throw new InvalidMaterialError(fieldName + ".target", "must reference a RenderTarget");
    target.assertUsable();
    if (kind !== "color" && kind !== "depth")
      throw new InvalidMaterialError(fieldName + ".kind", "must be color or depth", {
        received: kind
      });
    if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
      throw new InvalidMaterialError(fieldName + ".index", "must be a non-negative safe integer", {
        received: index
      });
    const descriptor = target.descriptor;
    if (kind === "color" && index >= descriptor.colors.length)
      throw new InvalidMaterialError(fieldName + ".index", "must name an existing color slot", {
        received: index,
        colorCount: descriptor.colors.length,
        targetLabel: target.label
      });
    if (kind === "depth" && (index !== 0 || descriptor.depth === void 0))
      throw new InvalidMaterialError(fieldName + ".index", "must name an existing depth[0]", {
        received: index,
        targetLabel: target.label
      });
    return Object.freeze({
      target,
      kind,
      index
    });
  }
  __name(copyTexture2DSamplingSource, "copyTexture2DSamplingSource");

  // src/rendering/core/requireNonNull.ts
  function requireNonNull(value, errorFactory) {
    if (value === null) {
      throw errorFactory();
    }
    return value;
  }
  __name(requireNonNull, "requireNonNull");

  // src/rendering/backend/webgl1/WebGL1TextureUploadSupport.ts
  function assertTextureOperation(gl, operation, label) {
    if (gl.isContextLost()) throw new WebGLContextLostError(operation);
    const error = gl.getError();
    if (gl.isContextLost()) throw new WebGLContextLostError(operation);
    if (error !== gl.NO_ERROR) {
      throw new WebGLOperationError(operation, label, "GL error 0x" + error.toString(16));
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
  function withTextureUploadState(gl, target, callback) {
    const activeUnit = gl.getParameter(gl.ACTIVE_TEXTURE);
    const bindingParameter = target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_BINDING_CUBE_MAP : gl.TEXTURE_BINDING_2D;
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
        gl.bindTexture(target, texture);
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
  function imageDimensions(image, label) {
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
      if (!image.complete)
        throw new InvalidTextureSourceError(label, "image has not finished loading");
      return { width: image.naturalWidth, height: image.naturalHeight };
    }
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      return { width: image.width, height: image.height };
    }
    throw new InvalidTextureSourceError(
      label,
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
    get(target) {
      this.assertReady();
      target.assertUsable();
      const old = this.entries.get(target);
      const revision = target.revision;
      if (old?.resource.revision === revision) return old.resource;
      const label = target.label + " (RenderTarget revision " + revision + ")";
      let next;
      try {
        assertTextureOperation(this.gl, "begin render target creation", label);
        if (old !== void 0 && this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) === old.resource.framebuffer) {
          throw new RenderTargetUnavailableError(
            label,
            "cannot rebuild the currently bound framebuffer; leave its surface scope first"
          );
        }
        this.validate(target.descriptor);
        next = this.create(target.descriptor, revision, label);
        assertTextureOperation(this.gl, "finish render target creation", label);
        target.assertUsable();
        const unsubscribe = old?.unsubscribe ?? target.onDispose(() => this.release(target));
        this.entries.set(target, { resource: next, unsubscribe });
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
      const { target, kind, index } = ref;
      if (!(target instanceof RenderTarget)) {
        throw new RenderTargetUnavailableError("attachment", "invalid target reference");
      }
      target.assertUsable();
      const descriptor = target.descriptor;
      if (!Number.isSafeInteger(index) || index < 0 || kind === "color" && index >= descriptor.colors.length || kind === "depth" && (index !== 0 || descriptor.depth === void 0) || kind !== "color" && kind !== "depth") {
        throw new RenderTargetUnavailableError(target.label, "invalid kind or attachment index");
      }
      return { target, kind, index };
    }
    /** 能力检查必须先于任何 create*，避免已知不支持的请求产生半成品。 */
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
    }
    /**
     * 私有构建事务：失败只清理本次新建对象，旧 cache entry 不在此函数可修改范围内。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][render-target-gpu-replacement]
     * drawBuffers 状态属于具体 FBO；只在新 FBO 上设置，不改外层 FBO 的配置。
     * 临时绑定结束恢复真实 framebuffer/renderbuffer；viewport 从始至终不修改。
     */
    create(descriptor, revision, label) {
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
            () => new WebGLResourceCreationError("framebuffer", label)
          );
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          for (let index = 0; index < descriptor.colors.length; index++) {
            const texture = requireNonNull(
              gl.createTexture(),
              () => new WebGLResourceCreationError("color-texture", label + " color " + index)
            );
            colors.push(texture);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              width,
              height,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              null
            );
            const sampler = descriptor.colors[index].sampler;
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
            assertTextureOperation(gl, "allocate color attachment " + index, label);
          }
          if (descriptor.depth !== void 0) {
            depth = requireNonNull(
              gl.createRenderbuffer(),
              () => new WebGLResourceCreationError("depth-renderbuffer", label)
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
          assertTextureOperation(gl, "configure framebuffer attachments", label);
          const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
          assertTextureOperation(gl, "check framebuffer completeness", label);
          if (status !== gl.FRAMEBUFFER_COMPLETE) throw new IncompleteFramebufferError(status, label);
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
    release(target) {
      if (this.lost || this.gl.isContextLost()) {
        this.invalidateForContextLoss();
        return;
      }
      const entry = this.entries.get(target);
      if (entry === void 0) return;
      this.entries.delete(target);
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
  return __toCommonJS(texture_design_entry_exports);
})();
