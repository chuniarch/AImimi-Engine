# 渲染模块设计阅读指南

本文档组根据 2026-09-21 的正式 checkout 源码整理。它解释当前代码与已确定的边界，不代表整条渲染链已经接线或通过真实 GPU 验收。示例中省略错误处理的原生 GL 片段只用于解释，不是可以替代 Manager 的正式实现。

## 先从一次绘制理解分工

场景中两个 Mesh 共用 Geometry 和 Material，但分别位于 x=0 与 x=10：

1. Geometry 保存同一组三角形顶点，ShaderModule 保存同一套 GLSL。
2. Mesh 各自的 SceneNode/Transform 产生不同模型矩阵。
3. ProgramManager 把 GLSL 编译、链接成当前 context 的 program。
4. GeometryManager 把顶点上传为当前 context 的 buffers。
5. VertexInputManager 把 buffers 接到该 program 的 attribute locations。
6. State 设置 program、深度和剔除等绘制状态；Backend 负责逐物体上传矩阵并发出 draw。

其中第 6 项的完整 Backend 编排是目标关系，不能仅凭这些基础文件已存在就认定已经实现。

## 阅读地图

| 问题                             | 文档                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| 谁负责生命周期和错误？           | [Resource 与 errors](../core/docs/resource-lifecycle-and-errors.zh-CN.md)                  |
| 局部、世界变换和树怎么配合？     | [Transform 与场景树](../scene/docs/transforms-and-scene-graph.zh-CN.md)                    |
| Mesh/Camera 为什么不是渲染器？   | [Mesh 与 Camera](../scene/docs/mesh-and-camera.zh-CN.md)                                   |
| CPU 数据怎样组织？               | [静态 Geometry](../resources/docs/static-geometry.zh-CN.md)                                |
| shader、参数、期望状态放在哪里？ | [Shader 与 Material](../resources/docs/shader-and-material.zh-CN.md)                       |
| 图片、像素、离屏目标有什么不同？ | [Texture 与 RenderTarget](../resources/docs/textures-and-render-targets.zh-CN.md)          |
| 为什么需要 State？               | [设备、生命周期与状态](../backend/webgl1/docs/device-and-state.zh-CN.md)                   |
| GL 对象如何创建、缓存、释放？    | [Program/Geometry Managers](../backend/webgl1/docs/program-and-geometry-managers.zh-CN.md) |
| shader 怎样读到 buffer？         | [顶点输入策略](../backend/webgl1/docs/vertex-input-strategies.zh-CN.md)                    |

## 架构关系不是一条继承链

CPU 对象描述“是什么”；Backend 子系统决定“怎样在这个 context 上实现”。

- Resource、SceneNode 是两条不同的类继承体系。
- Mesh 继承 SceneNode，借用 Geometry/Material；不继承 Resource。
- Geometry/Material 继承 Resource；不保存 WebGL handle。
- Managers、State、ContextLifecycle 是 Backend 内部协作者。
- Resource 接口描述结果，Hooks 接口描述协作能力；interface 本身不是另一个运行时层。
- Backend 的调用编排，不等于每个协作者都只能调用“下一级”对象。

## 后续代码讲解遵循的顺序

每个主要类或函数先回答：

1. 没有它时，哪段具体代码会重复、混乱或出错？
2. 一次正常调用发生哪些步骤？输入和输出给出实际值。
3. 参数为何是这些？谁提供？谁拥有？哪些只是借用？
4. 每个验证挡住什么反例？属于输入、设备能力、组合兼容还是生命周期检查？
5. 失败、重入、释放、context lost 时，哪些状态保留、失效或回滚？
6. 最后再命名软件工程思想，例如单一职责、组合、策略、依赖注入、缓存、事务式发布。

不以“解耦”“健壮性”替代具体因果解释。测试设计另行说明，不要求每个测试重复上述完整论述。

## 注释与状态标记

源码注释说明长期契约，不写“留给 Task 12”“本批稍后接线”。进度属于实施计划；尚未实现的能力使用可搜索的 TODO。

设计权重沿用既有规范：

- `[DESIGN-WEIGHT:3][topic-id]`：破坏后影响正确性的关键不变量。
- `[DESIGN-WEIGHT:2][topic-id]`：职责、所有权或性能取舍。
- `[DESIGN-WEIGHT:1][topic-id]`：辅助理解的局部说明。

已有的 Float32 投影矩阵推导与 context 生命周期长文继续保留，分别见同目录的 `projection-matrix-float32-rationale.zh-CN.md` 与 `webgl1-state-context-lifecycle.zh-CN.md`。这里不把数学推导混入工程调用顺序。

## 验证证据如何阅读

“源码已存在”“提案可类型检查”“fake GL 测试通过”“真实浏览器绘制正确”是不同结论。本次文档整理没有重新执行引擎测试，也没有修改运行时代码。
