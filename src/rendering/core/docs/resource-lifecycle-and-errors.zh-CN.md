# Resource 生命周期与错误设计

对应源码：`../Resource.ts`、`../requireNonNull.ts`、`../errors/`。

## 先看两个 Scene 共享 Geometry

同一 Geometry 被 Scene A、Scene B 各 retain 一次：

```text
初始引用数 0
A.retain(geometry) → 1
B.retain(geometry) → 2
A.release(geometry) → 1，仍可使用
B.release(geometry) → 0，自动执行真正清理
```

同一 Scene 重复 retain 不增加第二份引用，因为 Scene 用 Set 记录自己的责任。Mesh 借用 Geometry 不自动增加计数。这是“每个 Scene 的显式持有”，不是 JavaScript 垃圾回收引用数。

## Resource：统一生命周期，不统一数据内容

Resource 是抽象类，因为 Geometry、ShaderModule、Texture 等共享生命周期规则，却清理不同 CPU 数据。基类实现公开流程，子类实现 `disposeCPUData()`：这是模板方法思想。

`resourceType` 是子类提供的稳定诊断名称，不依赖生产打包后可能变化的 `constructor.name`。protected 表示供继承体系使用，abstract 要求具体子类补齐；readonly 不使整个资源不可变。

| 方法                    | 为什么需要                                      |
| ----------------------- | ----------------------------------------------- |
| retainSceneReference()  | 记录一份 Scene 持有；已释放对象不能复活         |
| releaseSceneReference() | 交还一份持有；最后一份交还触发清理              |
| dispose()               | 严格直接释放；仍被 Scene 持有时抛错且不修改状态 |
| tryDispose()            | 同样遵守引用约束，但被持有时返回 false          |
| onDispose(listener)     | 让每个 context 的 Manager 收到 CPU 资源终止通知 |

引用数已经为零时再次 release 是协议错误；不能先减到负数再恢复。dispose 的幂等性也不能代替引用计数：第一次错误释放就足以破坏另一 Scene。

## 监听者为何先于 CPU 清理

正常流程是：

```text
标记 disposed=true
→ 通知监听者
→ 清空监听者
→ disposeCPUData()
```

先标记终止可阻止同步重入时再次启动释放；通知让 Manager 删除自己拥有的 GPU 表示；最后丢弃 CPU 数据。unsubscribe 只撤销订阅，不释放资源。

[DESIGN-WEIGHT:3][resource-dispose-listener-failure]

当前普通 Resource 的 listener 抛错后是否继续其他 listener、是否仍清理 CPU、怎样汇总错误，仍是未完成契约。不能因为某些 Manager 有重试逻辑，就宣称整个 Resource 链已经具备异常安全的完整清理。

## errors：让失败原因可分类

RenderingError 沿用 EngineError 层级，构造顺序是 message、code、details。message 给人阅读，code 给程序分类，details 保存现场；浅冻结不是任意嵌套对象的深冻结。

- ResourceDisposedError、ResourceHasSceneReferencesError、ResourceSceneReferenceUnderflowError：生命周期协议。
- SceneGraphCycleError、DuplicateSceneNodeError：场景树结构。
- InvalidVertexAttributeError、InvalidGeometryError 及各资源的 Invalid\*Error：CPU 契约。
- WebGLResourceCreationError：create\* 返回 null。
- ShaderCompilationError、ProgramLinkError：编译或链接状态失败。
- Unsupported\*Error：当前 backend/设备不支持所需能力。
- WebGLContextLostError、WebGLBackendDisposedError：服务不可用。
- IncompleteFramebufferError、RenderTargetUnavailableError、WebGLOperationError：目标或 GL 操作失败。

分成这些类，是为了允许上层分别选择报告配置错误、暂停绘制或走恢复流程，不是要求每个底层函数 catch 后继续运行。

## requireNonNull：只做一种验证

```ts
const buffer = requireNonNull(
  gl.createBuffer(),
  () => new WebGLResourceCreationError('buffer', 'particle-position')
)
```

第一个参数是待验证结果；第二个参数是惰性错误工厂，只有 null 才创建带上下文的领域错误。函数使用 `value === null`，不误拒绝 0、false，也不负责 shader 编译、FBO completeness 或 context lost。

设计思想是“小而精确的验证原语”：调用者决定错误领域，原语负责 null 检查与类型收窄。
