// 自动生成：esbuild 打包 dual-webgl-backend worktree 的 src/rendering 与课程版 resource-course.ts（2026-10-14）。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachResource = (() => {
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

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/resource-entry.ts
  var resource_entry_exports = {};
  __export(resource_entry_exports, {
    CubeTexture: () => CubeTexture,
    DataTexture2D: () => DataTexture2D,
    DuplicateSceneNodeError: () => DuplicateSceneNodeError,
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
    ProgramLinkError: () => ProgramLinkError,
    RenderTarget: () => RenderTarget,
    RenderTargetUnavailableError: () => RenderTargetUnavailableError,
    RenderingError: () => RenderingError,
    ResourceDisposedError: () => ResourceDisposedError,
    ResourceHasSceneReferencesError: () => ResourceHasSceneReferencesError,
    ResourceSceneReferenceUnderflowError: () => ResourceSceneReferenceUnderflowError,
    SceneGraphCycleError: () => SceneGraphCycleError,
    ShaderCompilationError: () => ShaderCompilationError,
    ShaderModule: () => ShaderModule,
    UnsupportedIndexTypeError: () => UnsupportedIndexTypeError,
    UnsupportedRenderFeatureError: () => UnsupportedRenderFeatureError,
    UnsupportedShaderLanguageError: () => UnsupportedShaderLanguageError,
    VertexAttribute: () => VertexAttribute,
    VertexAttributeSemantic: () => VertexAttributeSemantic,
    WebGL1GeometryManager: () => WebGL1GeometryManager,
    WebGL1ProgramManager: () => WebGL1ProgramManager,
    WebGL1RenderTargetManager: () => WebGL1RenderTargetManager,
    WebGL1ResourceManager: () => WebGL1ResourceManager,
    WebGLBackendDisposedError: () => WebGLBackendDisposedError,
    WebGLContextCreationError: () => WebGLContextCreationError,
    WebGLContextLostError: () => WebGLContextLostError,
    WebGLOperationError: () => WebGLOperationError,
    WebGLResourceCreationError: () => WebGLResourceCreationError,
    course: () => resource_course_exports,
    createWebGL1VertexInputManager: () => createWebGL1VertexInputManager,
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

  // src/rendering/core/requireNonNull.ts
  function requireNonNull(value, errorFactory) {
    if (value === null) {
      throw errorFactory();
    }
    return value;
  }
  __name(requireNonNull, "requireNonNull");

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
    upload(target, data, label, owned) {
      const gl = this.gl;
      const candidate = gl.createBuffer();
      this.assertAvailable("create buffer");
      const buffer = requireNonNull(candidate, () => new WebGLResourceCreationError("buffer", label));
      owned.push(buffer);
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      this.checkError("upload buffer", label);
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
    checkError(operation, label) {
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
          throw new WebGLOperationError(operation, label, `GL errors: ${errorCodes.join(", ")}`);
        }
        errorCodes.push(code);
      }
      throw new WebGLOperationError(
        operation,
        label,
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
    get(shader) {
      this.assertAvailable("get program");
      if (shader.disposed) throw new ResourceDisposedError("ShaderModule");
      if (this.releasing.has(shader)) {
        throw new WebGLOperationError("get program", shader.name, "release is in progress");
      }
      const cached = this.entries.get(shader);
      if (cached !== void 0) return cached.resource;
      if (shader.language !== "glsl-es-100") {
        throw new UnsupportedShaderLanguageError(shader.name, shader.language, "webgl1");
      }
      const gl = this.gl;
      this.checkError("preflight", shader.name);
      const shaders = [];
      let program = null;
      try {
        const vertex = this.compile(shader, "vertex", gl.VERTEX_SHADER, shaders);
        const fragment = this.compile(shader, "fragment", gl.FRAGMENT_SHADER, shaders);
        const candidate = gl.createProgram();
        this.assertAvailable("create program");
        program = requireNonNull(
          candidate,
          () => new WebGLResourceCreationError("program", shader.name)
        );
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        this.assertAvailable("link program");
        if (linked !== true) {
          throw new ProgramLinkError(shader.name, gl.getProgramInfoLog(program) ?? "");
        }
        gl.detachShader(program, vertex);
        gl.detachShader(program, fragment);
        this.checkError("link program", shader.name);
        const attributes = /* @__PURE__ */ new Map();
        const uniforms = /* @__PURE__ */ new Map();
        const attributeCount = this.readCount(program, gl.ACTIVE_ATTRIBUTES, shader.name);
        const uniformCount = this.readCount(program, gl.ACTIVE_UNIFORMS, shader.name);
        for (let index = 0; index < attributeCount; index++) {
          const info = gl.getActiveAttrib(program, index);
          this.assertAvailable("reflect attribute");
          if (info === null)
            throw new WebGLOperationError("reflect attribute", shader.name, `missing entry ${index}`);
          const location = gl.getAttribLocation(program, info.name);
          if (location < 0) throw new WebGLOperationError("reflect attribute", shader.name, info.name);
          attributes.set(info.name, location);
        }
        for (let index = 0; index < uniformCount; index += 1) {
          const info = gl.getActiveUniform(program, index);
          this.assertAvailable("reflect uniform");
          if (info === null)
            throw new WebGLOperationError("reflect uniform", shader.name, `missing entry ${index}`);
          const location = gl.getUniformLocation(program, info.name);
          if (location !== null) uniforms.set(info.name, location);
        }
        const resource = Object.freeze({
          program,
          attributes,
          uniforms
        });
        const unsubscribe = shader.onDispose(() => this.release(shader));
        this.entries.set(shader, { resource, unsubscribe });
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
    release(shader) {
      const entry = this.entries.get(shader);
      if (entry === void 0 || this.releasing.has(shader)) return;
      if (this.gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss();
        return;
      }
      this.releasing.add(shader);
      try {
        this.hooks.beforeDelete?.(entry.resource.program);
        if (this.gl.isContextLost() || this.lostValue) {
          this.invalidateForContextLoss();
          return;
        }
        entry.unsubscribe();
        this.entries.delete(shader);
        if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === entry.resource.program) {
          this.gl.useProgram(null);
        }
        this.gl.deleteProgram(entry.resource.program);
        this.hooks.invalidateState();
      } finally {
        this.releasing.delete(shader);
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
        for (const shader of [...this.entries.keys()]) this.release(shader);
      } finally {
        this.disposing = false;
      }
    }
    /** GL 查询返回 any；先收进 unknown，再验证反射计数。 */
    readCount(program, parameter, label) {
      const count = this.gl.getProgramParameter(program, parameter);
      this.assertAvailable("reflect count");
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
        throw new WebGLOperationError("reflect count", label, String(count));
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
    checkError(operation, label) {
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
          throw new WebGLOperationError(operation, label, `GL errors: ${errorCodes.join(", ")}`);
        }
        errorCodes.push(code);
      }
      throw new WebGLOperationError(
        operation,
        label,
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
    const snapshot = {};
    for (const semantic of BUILT_IN_UNIFORM_SEMANTICS) {
      const uniformName = bindings[semantic];
      if (uniformName === void 0) continue;
      snapshot[semantic] = requireNonBlankText(shaderName, `builtInUniforms.${semantic}`, uniformName);
    }
    return Object.freeze(snapshot);
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

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/resource-course.ts
  var resource_course_exports = {};
  __export(resource_course_exports, {
    ManagersV1: () => ManagersV1
  });
  var _ManagersV1 = class _ManagersV1 {
    constructor(gl, capabilities, hooks) {
      __publicField(this, "programs");
      __publicField(this, "geometries");
      __publicField(this, "textures2D");
      __publicField(this, "cubeTextures");
      __publicField(this, "renderTargets");
      __publicField(this, "vertexInputs");
      this.programs = new WebGL1ProgramManager(gl, { invalidateState: hooks.invalidateState });
      this.geometries = new WebGL1GeometryManager(gl, capabilities, {
        invalidateState: hooks.invalidateState
      });
      this.textures2D = new WebGL1Texture2DManager(gl, capabilities, hooks);
      this.cubeTextures = new WebGL1CubeTextureManager(gl, capabilities, hooks);
      this.renderTargets = new WebGL1RenderTargetManager(gl, capabilities, hooks);
      this.vertexInputs = createWebGL1VertexInputManager(gl, capabilities, hooks);
    }
    /** context 丢了：逐个通知。前提是调用者记得调用它。 */
    invalidateForContextLoss() {
      for (const manager of this.all()) manager.invalidateForContextLoss();
    }
    /** 尽力而为：一个失败了，接着清理下一个，最后把第一个错误抛出去。 */
    dispose() {
      let firstError = null;
      for (const manager of this.all()) {
        try {
          manager.dispose();
        } catch (error) {
          firstError ?? (firstError = error);
        }
      }
      if (firstError !== null) throw firstError;
    }
    /** 声明顺序：借用 buffer 和 program 的顶点输入排在最后。 */
    all() {
      return [
        this.programs,
        this.geometries,
        this.textures2D,
        this.cubeTextures,
        this.renderTargets,
        this.vertexInputs
      ];
    }
  };
  __name(_ManagersV1, "ManagersV1");
  var ManagersV1 = _ManagersV1;
  return __toCommonJS(resource_entry_exports);
})();
