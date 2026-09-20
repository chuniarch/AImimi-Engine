# GAMES202 渲染重构现状、后续路线与 FLIP 讨论交接

更新日期：2026-09-20

用途：交给另一个 agent 阅读，使其先理解当前项目事实、正在进行的工作和后续路线，再与用户讨论 FLIP 流体。

性质：事实交接与讨论入口，不是 FLIP 的已批准设计，也不授予任何源码、测试或 Git 写入权限。

## 1. 应先读取什么

正式开发 checkout：

```text
/Users/zhanghaoting/code-projects/Games/GAMES202/Homework/refactored-games202-project-dual-webgl-backend
```

当前分支：

```text
dev-dual-webgl-backend-refactor
```

HW2 架构规范：

```text
/Users/zhanghaoting/code-projects/Games/GAMES202/Homework/refactored-games202-project/codex-workspace/codex-dual-webgl-backend-refactor/2026-08-26-hw2-complete-webgl1-architecture-design.md
```

HW2 实施计划：

```text
/Users/zhanghaoting/code-projects/Games/GAMES202/Homework/refactored-games202-project/codex-workspace/codex-dual-webgl-backend-refactor/2026-08-28-hw2-complete-webgl1-architecture-implementation-plan.md
```

WebGL1 状态与 context 生命周期补充说明：

```text
/Users/zhanghaoting/code-projects/Games/GAMES202/Homework/refactored-games202-project-dual-webgl-backend/src/rendering/docs/webgl1-state-context-lifecycle.zh-CN.md
```

阅读后仍须重新执行 `git status`、`git log` 和相关测试。本文记录的是交接时状态，不代替当前 checkout 证据。

## 2. 已固定的总体架构

HW2 的目标调用链是：

```text
Engine
  → Renderer
  → RenderListBuilder
  → RenderPipeline
  → ForwardPass
  → RenderBackend
  → WebGL1Backend
  → WebGLRenderingContext
```

以下决定已经固定，不应在 FLIP 讨论中无故推翻：

1. HW2 不依赖旧 `BaseRenderer`、旧 `WebGLRenderer`、`MeshRenderer`、旧 `ForwardRenderPass` 或旧 draw 路径。
2. Scene、Mesh、Geometry、Material、ShaderModule、Texture 和 RenderTarget 是逻辑/CPU 资源，不保存 `WebGLRenderingContext` 或 `WebGL*` handle。
3. GPU handle 和 cache 属于具体 Backend/context，由相应 Manager 创建、缓存、失效和释放。
4. Material 保存逻辑纹理引用，不保存裸 `WebGLTexture`。
5. RenderTarget attachment 是逻辑 `{target, kind, index}` 引用；FBO、attachment texture/renderbuffer 由 Backend Manager 解析。
6. context lost 后旧 GPU handle 全部失效；浏览器发出 restored 只表示 context 回来，不表示引擎资源已经重建。
7. GL 状态缓存的正确性依赖受控访问边界；绕过 `WebGL1State` 修改原生状态时必须使相应缓存失效。
8. `SceneNode` 内部保存完整稳定 UUID；`name` 是可变、可重复的可读标签，短 UUID 只用于显示。
9. `requireNonNull()` 只处理 WebGL `create*()` 返回 null；shader compile、program link、framebuffer completeness 和 context lost 使用各自的验证与错误。

## 3. 已提交的基础工作

交接时可以在 Git 历史中看到以下关键提交：

```text
1c0d21e feat(rendering): 实现 HW2 资源生命周期与场景图基础
c2c9010 feat(rendering): 实现静态 VertexAttribute 与 Geometry
b45374b feat(rendering): 实现 ShaderModule 与纹理 CPU 资源
86036aa feat(rendering): 完成材质与 Mesh Camera CPU 契约
```

它们覆盖的主要能力包括：

- `Resource` 生命周期、Scene 引用计数、统一渲染错误和 `requireNonNull()`；
- `Transform`、`SceneNode`、`Group`、`Scene`；
- 静态 `VertexAttribute` 与静态 `Geometry`；
- 单语言版本 `ShaderModule`；
- CPU 侧 `Texture2D`、`CubeTexture` 及像素快照；
- CPU 侧 `Material` 与逻辑纹理参数；
- `Mesh`、`Camera`、`PerspectiveCamera`。

注意：这里的 Geometry 是静态 HW2 契约，不代表已经具备 FLIP 所需的动态 buffer、局部上传或 GPU simulation storage。

## 4. 当前正在完成的 Task 9–10

### Task 9：RenderTarget、RenderSurface 与 RenderBackend 契约

当前正式 working tree 中存在：

- `src/rendering/resources/RenderTarget.ts`
- `src/rendering/backend/RenderSurface.ts`
- `src/rendering/backend/RenderBackend.ts`
- `src/rendering/frame/ViewState.ts`
- `src/rendering/frame/RenderItem.ts`
- 对应错误和单元测试

核心边界：RenderTarget 只保存逻辑 descriptor/revision；GPU FBO 与 attachment 仍由未来的 WebGL1RenderTargetManager 管理。

### Task 10：Capabilities、ContextLifecycle 与 WebGL1State

当前正式 working tree 中存在：

- `src/rendering/backend/webgl1/WebGL1Capabilities.ts`
- `src/rendering/backend/webgl1/WebGLContextLifecycle.ts`
- `src/rendering/backend/webgl1/WebGL1State.ts`
- 对应 fake context 和单元测试

已讨论并写入注释的重点包括：

- context lost/restored 的状态转换顺序；
- 同步重入时使用 `transitionVersion` 防止旧调用栈覆盖新状态；
- `restoreSurfaceState()` 只恢复临时 framebuffer/viewport，不负责恢复 lost context；
- 为什么逐 draw 设置深度状态时使用可信 JS cache，而不是每次调用 `gl.getParameter()`；
- 过期生命周期回调错误通过独立、非抛出的 `onSuppressedError` 诊断通道上报，不能覆盖更新状态。

交接前用户给出的联合单元测试结果为 18 个测试文件、281 个测试通过；Task 9 此前也完成过 focused unit/type/lint/format 检查。它们是阶段性证据，不等于浏览器真实 GPU 验收。

Task 9–10 已在完成 focused 验证后提交：

```text
1a06356 feat(rendering): 建立 RenderTarget 与 WebGL1 状态基础
```

交给另一个 agent 时仍须重新查看 Git 历史与 working tree；该提交只证明上述 17 个文件的阶段性结果，不代表后续 Manager、浏览器 GPU 或整个 HW2 已经完成。

## 5. 不要把并行任务文件误认为已完成

working tree 中可能已经出现 ProgramManager、GeometryManager、VertexInputManager 或它们的测试/提案。这些文件可能来自并行任务，存在不等于已经获得正式验收。

另一个 agent 在讨论 FLIP 时不应：

- 修改这些文件来顺手实现 FLIP；
- 把 proposal、fork 或内存检查描述成正式 GREEN；
- 把后续 Manager 的存在当成 WebGL1Backend 已经完整可绘制；
- 把未跟踪文件自动加入提交。

## 6. HW2 后续任务顺序

当前已批准的剩余分组为：

### Stage 9：Task 11–12

- WebGL1ProgramManager 与 WebGL1GeometryManager；
- `OES_vertex_array_object` 与 manual vertex-input 双路径；
- Geometry + 真实 WebGLProgram 的 VAO identity；
- Uint32 index extension/fallback、部分失败清理和 context-loss invalidation。

### Stage 10：Task 13–14

- WebGL1CubeTextureManager；
- WebGL1RenderTargetManager；
- WebGL1ResourceManager 的跨 Manager 删除和 dispose 顺序。

### Stage 11：Task 15

- WebGL1Backend 完整 draw submission；
- surface 正常、异常、嵌套恢复；
- uniform/texture/state/vertex-input/draw 顺序；
- context lost/restored 后资源懒重建；
- 浏览器真实 triangle/readPixels 验收。

### Stage 12：Task 16–18

- immutable FrameSnapshot/ViewState/RenderItem/RenderList；
- RenderListBuilder；
- ForwardPass、RenderPipeline；
- Renderer 每帧只提取一次场景数据。

### Stage 13：Task 19–20

- Abort-aware HW2 CPU scene factory；
- HW2SceneController 的并发、取消、失败清理和 preset race。

### Stage 14：Task 21–22

- Engine 新渲染模式与 context 独占接线；
- HW2 loader/GUI 切换；
- 对旧 renderer/import/draw 路径的零依赖检查。

### Stage 15：Task 23

- 浏览器 Mary PRT；
- preset race；
- surface 恢复；
- context lost/restored；
- 最终 unit/browser/type/lint/format/build 和手工 smoke。

HW2 阶段当前明确不扩展 WebGL2、WebGPU、Shadow、Deferred/SSR、FFT Ocean、Overlay、透明材质或动态 Geometry。

## 7. HW2 之后的 FFT Ocean、HDR 与 IBL 方向

用户的长期目标不止 HW2。HW2 完整链路之后，计划迁移现有 FFT Ocean 的全部 Pass，并建立 HDR/EXR 与 IBL 流程。

已经形成方向、但仍须在对应阶段写正式设计和测试的内容：

1. Texture 保持逻辑资源，Backend/Manager 保存每个 context 的真实 GPU texture。
2. ShaderModule 一次表示一种 shader language/version；用户自定义 shader 不必同时提供 GLSL ES 1.00 与 3.00。
3. HDR/EXR 解码结果先形成逻辑数据源；equirectangular → cubemap 是 GPU bake，而不是六张现成 CPU 图片。
4. `EnvironmentBakePipeline` 是按需执行的资源烘焙流水线，不应塞入每帧主 RenderPipeline。
5. bake 结果预计包含 skybox cubemap、prefiltered environment 和 BRDF LUT；context 恢复时可以从可恢复源重新执行 bake。
6. Material 不接收裸 render-target texture handle；需要逻辑 texture/attachment binding，由 Backend 在当前 context 解析。
7. FFT Ocean 的模拟/计算 Pass、ping-pong 资源、HDR/IBL 与最终水面渲染要在 HW2 之后作为独立阶段迁移，不应反向污染 HW2 的静态 Geometry 契约。

这些是后续架构方向，不是已经完成的实现。

## 8. 另一个 agent 应如何开始 FLIP 讨论

本节只定义讨论任务，不预先选择答案。

另一个 agent 的第一项工作应是与用户澄清目标，而不是立即创建类或 shader。至少讨论：

1. 目标是 2D 还是 3D FLIP；是学习演示、可交互效果，还是高质量流体。
2. 预期粒子数、网格分辨率、帧率和目标设备。
3. FLIP/PIC 混合比例、压力求解精度、边界条件和固体交互范围。
4. 首版选择 CPU、WebGL2、WebGPU，还是 CPU reference + GPU production 的双实现。
5. 模拟数据使用 buffer、texture、render target 还是 storage buffer；选择必须基于 backend 能力而不是沿用旧 API。
6. SimulationPipeline 与逐帧 RenderPipeline 的关系；模拟固定时间步与渲染帧率如何解耦。
7. 粒子到网格、压力投影、网格到粒子、advection 和 reseeding 的 Pass/资源边界。
8. 可视化使用粒子、屏幕空间流体、surface reconstruction 还是其他方式。
9. resize、context/device lost、暂停、重置、checkpoint 和可复现性语义。
10. 如何用 CPU 小网格基准、divergence、质量守恒、边界条件和真实 GPU smoke 建立验收。

历史讨论曾倾向把 FLIP 放在 FFT Ocean 之后，并优先评估 WebGPU；这不是本文替另一个 agent 作出的最终 backend 决定。应根据用户本次 FLIP 目标重新论证。

## 9. FLIP 讨论必须尊重的现有边界

- 不把 raw WebGL/WebGPU handle 放进共享 Scene/Material/Geometry 逻辑资源。
- 不假设静态 Geometry 已经支持动态粒子数据。
- 不因为 FLIP 需要动态资源，就在未设计生命周期、dirty range、版本和恢复语义前直接修改 Geometry。
- 不把 simulation pass 默认等同于 graphics RenderPass；应先比较其输入、输出、调度和 backend 能力。
- 不把 WebGL1 能画 HW2 推导成 WebGL1 适合完整 FLIP。
- 不把 FFT Ocean 的频域波浪模拟与 FLIP 的粒子—网格不可压流体求解混为同一种计算管线。
- 不在没有当前轮精确路径授权时写正式源码/测试，不因读取本交接文档获得 Git 操作权限。

## 10. 建议另一个 agent 的首轮输出

读取本文、规范、实施计划和当前 checkout 后，先提供：

1. 对当前事实和未完成范围的复述；
2. FLIP 目标澄清问题；
3. CPU/WebGL2/WebGPU 候选的能力与成本比较；
4. 建议的最小可验证原型，而不是完整生产类树；
5. 明确哪些结论只是建议、哪些需要用户确认；
6. 在用户确认前不写正式源码、测试或执行 Git 操作。

这能让 FLIP 讨论建立在现有架构之上，同时避免把仍在推进的 HW2/FFT 工作误认为已经完成。
