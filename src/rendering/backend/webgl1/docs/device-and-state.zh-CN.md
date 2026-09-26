# WebGL1 设备、生命周期与状态缓存

对应源码：`../WebGL1Capabilities.ts`、`../WebGLContextLifecycle.ts`、`../WebGL1State.ts`。

## 先区分三个“状态”

| 名称                    | 实际含义                                       |
| ----------------------- | ---------------------------------------------- |
| GL context state        | 浏览器保存的真实状态，如当前 program、深度开关 |
| Material 的 RenderState | 本次绘制期望的深度、剔除配置                   |
| WebGL1State             | JavaScript 中对已提交状态的缓存                |

GL 本身就是有状态 API。调用 gl.useProgram(P) 后，后续 draw 使用 P，直到再次改变。即使不写 WebGL1State 类，这种真实状态仍然存在。

State 类是引擎的优化与集中管理选择，不是 WebGL 强制要求。每次绘制都完整提交正确状态，也可以写出正确的渲染器。

## 为什么缓存会出错

设 program P、Q 都存活且属于同一个 context：

```text
操作                     JS 缓存      GL 实际状态
state.useProgram(P)      P            P
直接 gl.useProgram(Q)    P            Q
state.useProgram(P)      P            Q（错误省略调用）
```

第二步绕过缓存，它不知道真实状态改变了。正确的受控协作应在第二步后调用 state.invalidate()：缓存变为 unknown，第三步必须重新发出 gl.useProgram(P)。

invalidate 不是解绑，不是恢复默认状态，也不调用 delete。undefined 表示“不知道”，null 表示“明确未绑定”，这两种状态不能混淆。

[DESIGN-WEIGHT:3][webgl-state-invalidation-not-reset]

缓存能省略命令的前提是缓存可信。允许内部模块直接调用 GL 时，就要同时制定失效协议；缓存无法自动感知任意外部 GL 操作。

## ProgramManager 和 State 是什么关系

目标组装关系如下；此图说明职责，不宣称 Backend 已完成接线：

```text
WebGL1Backend：编排绘制
├─ 资源协作者
│  ├─ ProgramManager：program 创建、缓存、释放
│  ├─ GeometryManager：buffer 创建、缓存、释放
│  └─ VertexInputManager：配置 buffer 与 shader 输入的对应关系
└─ WebGL1State：缓存并提交绘制状态

所有协作者 → 同一个 gl context
ProgramManager → invalidateState 回调 → State.invalidate()
```

它们同属 Backend 基础设施，不是上下级继承关系。组装者知道两者；ProgramManager 只知道一个同步回调，不导入具体 State，也不需要拥有它。

为什么传回调，而不传整个 State？ProgramManager 只需让缓存失效，不应顺便获得修改 viewport、剔除策略等无关能力。这是窄接口、依赖注入和单一职责。

实际 release 路径：若正在使用待删 program，先 gl.useProgram(null)，再删除，并通知缓存失效。下一次需要这个 CPU shader 时必须创建新 handle；不能用已删除的旧 P 演示再次绘制。

注意：compileShader/linkProgram 不等于 useProgram。编译一个 program 不会自动把它选为当前绘制 program。

## State 各接口的参数来自哪里

- useProgram(program)：借用 ProgramManager 创建的 handle，不接收 ShaderModule，避免在“设状态”时隐式编译。
- bindArrayBuffer(buffer)：接收 GPU buffer；CPU 数组的上传属于 GeometryManager。
- setDepthState(state) / setCullMode(mode)：分别接收 Material 已验证的深度配置与剔除模式，比较缓存后映射到 enable/disable、depthMask、depthFunc、cullFace。
- WebGL1SurfaceResource：framebuffer 加实际 width/height，不拥有 framebuffer。
- SurfaceStateSnapshot：捕获真实 framebuffer 与四个 viewport 数字，供同步作用域恢复。

viewport 不是 attachment 存储尺寸。512×512 目标可以只使用 256×256 viewport；视口控制坐标映射，不负责扩容 attachment。默认全幅绘制通常使两者一致。

VAO 切换会改变 ELEMENT_ARRAY_BUFFER 绑定，因此旧 EBO 缓存必须失效；若协作者同时改 ARRAY_BUFFER，当前 hooks 要使用完整 invalidate，而不只失效 EBO。

## Capabilities：检测当前 context 能做什么

detectWebGL1Capabilities(gl) 查询扩展与限制，返回当前代的能力快照。它不是纹理或 buffer 的所有者。

前后两次 isContextLost 检查，分别挡住“开始前已失效”和“探测过程中失效却发布成功快照”。不是每个 CPU getter 都需要这种包围检查；这里跨越了设备查询边界。

## ContextLifecycle：浏览器恢复不等于引擎已经可绘制

正常顺序是：

```text
ready → lost → restoring → ready
                       ↘ restore-failed
任一可用阶段 → disposed
```

handleLost 先 preventDefault 表达允许恢复，再进入 lost 并调用 onLost。重复 lost 不重复执行失效回调。它不能撤销丢失，也不保证恢复一定发生。

handleRestored 调用 restore 重建，再调用 onReady 收尾；当前实现直到这两个回调成功返回后才发布 ready。因此 onReady 内仍不能开始 draw。

EventTarget 参数表达这里只需要事件协议；不需要用 canvas.width/getContext。实际 HTMLCanvasElement 满足它，测试也能提供 EventTarget。

failureValue 保存失败原因，不只保存“失败了”：例如 restore 已进入 restoring，但创建 Manager 抛错，状态变为 restore-failed，同时保留具体 error 和 phase，方便界面与日志报告。

转换版本防止同步回调重入后，旧恢复调用栈覆盖较新的 lost/disposed。所有权、错误记录和状态机是不同职责，不应混成一个布尔开关。

关于真实状态与 context 恢复的 API 契约，参见 [WebGL 1 规范](https://registry.khronos.org/webgl/specs/1.0/)。本项目状态机顺序与 callback 约束由本项目源码定义。
