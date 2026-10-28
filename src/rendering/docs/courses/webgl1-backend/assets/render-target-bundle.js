// 自动生成：esbuild 打包 dual-webgl-backend worktree 的 src/rendering（2026-10-12，第 27 课；含未提交的 RenderTarget、RenderTargetManager、SurfaceScope 改动）。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachRT = (() => {
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

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/render-target-entry.ts
  var render_target_entry_exports = {};
  __export(render_target_entry_exports, {
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
    RenderTarget: () => RenderTarget,
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
    WebGL1RenderTargetManager: () => WebGL1RenderTargetManager,
    WebGL1State: () => WebGL1State,
    WebGL1SurfaceScope: () => WebGL1SurfaceScope,
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

  // src/rendering/resources/Texture2D.ts
  var _Texture2D = class _Texture2D extends Texture {
    constructor(options, createError) {
      super(options, createError);
    }
  };
  __name(_Texture2D, "Texture2D");
  var Texture2D = _Texture2D;

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
      if (typeof callback !== "function") invalid("callback", "must return undefined synchronously");
      const target = next.surface.kind === "render-target" ? next.surface.target : null;
      const frame = {
        target,
        revision: target === null ? 0 : target.revision,
        drawingWidth: this.gl.drawingBufferWidth,
        drawingHeight: this.gl.drawingBufferHeight
      };
      const previous = this.state.captureSurfaceState();
      let failed = false;
      let failure;
      this.stack.push(frame);
      try {
        const resource = target === null ? null : this.hooks.resolveTarget(target);
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
    assertCanSample(target, uniformName) {
      this.assertDrawable();
      const current = this.stack[this.stack.length - 1];
      if (current.target === target) {
        throw new RenderTargetUnavailableError(
          target.label,
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
  return __toCommonJS(render_target_entry_exports);
})();
