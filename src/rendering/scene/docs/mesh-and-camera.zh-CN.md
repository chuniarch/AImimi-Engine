# Mesh 与 Camera：数据进入绘制前的边界

对应源码：`../Mesh.ts`、`../cameras/Camera.ts`、`../cameras/PerspectiveCamera.ts`。

## Mesh：把“在哪里”和“画什么”组合起来

两个 Mesh 可共享同一 Geometry 与 Material，却分别拥有自己的 Transform。Geometry 不应复制两份，模型矩阵也不能存在共享 Material 的同一个槽里。

```text
Mesh A ── Geometry G ── CPU 顶点
       └─ Material M ── Shader/参数

Mesh B ── 同一个 G、M
A.worldMatrix 与 B.worldMatrix 独立
```

构造参数是 Geometry、Material，因为 Mesh 要表达可渲染对象；不接收 gl、buffer、program，因为它不负责某个设备上的执行。它继承 SceneNode，是为了直接参与父子变换和可见遍历。

构造时检查依赖类型和存活状态；getter 再检查 disposed，是因为构造完成后外部仍可能释放依赖。读取时必须检查 geometryValue，而不是再次读 this.geometry，否则 getter 无限递归。

Mesh 只借用资源，不自动 retain，也不负责删除 GPU 对象。显式所有权由 Scene/Resource 管理。这是组合与所有权分离。

## Camera：节点变换加投影协议

Camera 同样继承 SceneNode，所以它可以挂在移动的父节点上。相机世界变换回答“相机在哪里”，视图矩阵通常是它的逆；projection 回答“相机坐标怎样映射到裁剪空间”。

Camera 是抽象类，因为只有单位占位投影不足以构成具体相机。protected 构造允许子类初始化，不允许外部直接把未定义投影策略的 Camera 当作完整对象。

`copyProjectionMatrixTo(out)` 允许调用者复用输出内存，不交出内部可修改数组。当前基类不负责缓存 view matrix，消费者还要处理不可逆世界变换。

## PerspectiveCamera：先算候选值，再提交

参数 fovY、aspect、near、far 分别决定视角、宽高比和可见深度范围。例如 fovY=PI/2、aspect=1、near=1、far=10。

输入验证挡住 NaN、Infinity、非正宽高比、非法视角以及 far<=near。计算后再次检查 Float32 矩阵，是因为“输入有限且满足大小关系”不保证“存入 Float32 后仍有限且不退化”。

固定使用 Float32 缓冲是当前 GPU 上传与缓存表示的选择，不是说 JavaScript 计算只能用单精度。

内部顺序为：

```text
copyValidatedOptions(options)
→ createProjection(validatedOptions)
→ 提交参数与矩阵
→ projectionVersion 增加
```

createProjection 的调用前提由内部流程保证，因此不重复所有输入验证。snapshot 防止后续读到调用者已修改的配置，也让候选状态与已发布状态分开。

[DESIGN-WEIGHT:3][camera-projection-transaction]

验证或计算失败，旧相机参数、矩阵、版本保持不变。版本号供消费者发现旧快照过期，不是保存历史记录；若应用需要撤销，应另存配置历史，不应让底层相机猜测回退目标。

## 矩阵在何时上传

目标编排是：提取每个 Mesh 的模型矩阵和相机 view/projection，组成逐次绘制数据，再由 Backend 调用 uniformMatrix\*fv。共享 Material 只提供共同参数，不保存某一个 Mesh 的临时 modelMatrix。

更详细的列主序、Float32 和投影推导，见 `src/rendering/docs/projection-matrix-float32-rationale.zh-CN.md`。本篇只解释工程分工。
