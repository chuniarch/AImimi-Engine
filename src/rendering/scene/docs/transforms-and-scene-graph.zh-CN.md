# Transform 与场景树的职责

对应源码：`../Transform.ts`、`../SceneNode.ts`、`../Group.ts`、`../Scene.ts`。

## 一个具体的父子关系

父节点平移 x=10，子节点局部平移 x=1，没有旋转或缩放。子节点原点最终位于世界 x=11。

```text
子节点局部坐标
  --子 localMatrix--> 父节点坐标
  --父 worldMatrix--> 世界坐标

childWorld = parentWorld × childLocal
```

所以 Transform 不等于“直接进入世界空间的矩阵”；只有没有父节点时，local 与 world 才相同。

## Transform：可编辑参数与派生矩阵分开

position、rotation、scale 是用户编辑的输入，localMatrix 是它们的计算结果。单独保存 Transform，使调用者可以改位置而不用手工重建矩阵。

`copyLocalMatrixTo(out)` 接收目标数组，是为了允许调用者复用已有缓冲，同时不泄露内部矩阵。返回内部数组会允许外部绕过 setter 修改数据，破坏缓存。

`localMatrixDirty` 与 `version` 回答不同问题：

- dirty：Transform 自己的矩阵是否需要重算？
- version：其他消费者上次看到的 TRS 是否已经过时？

设置 TRS 时只标 dirty 并增加 version，真正读取矩阵时再计算。这是惰性计算与版本化缓存，不是每次 setter 都立即进行矩阵运算。

[DESIGN-WEIGHT:3][transform-float32-comparison]

当前 TRS 使用 Float32 表示。输入 0.1 存进去会成为可表示的近似值，因此比较前先 Math.fround；否则第二次输入同一个 0.1 也会被误认为改变。Object.is 不是误差容忍比较。

## SceneNode：一个节点也可以拥有其他节点

SceneNode 统一身份、可见性、Transform、父子关系、遍历和世界矩阵。它包含 Transform，但 Group/Scene 继承 SceneNode：前者是 has-a，后者是 is-a。

完整 UUID 创建后稳定，name 可改、可重复；debugLabel 的短 UUID 只用于显示。rename/reparent 不换 UUID，序列化恢复与 clone 的后续语义由 TODO(scene-serialization) 记录。

`add(...nodes)` 先检查整批输入的重复与环，再实际修改父子关系。否则添加第一个成功、第二个失败时会留下半完成状态。这里借用“验证后提交”的事务思想，不是数据库事务。

worldMatrix 缓存同时记录：

| 字段                       | 发现什么变化                            |
| -------------------------- | --------------------------------------- |
| observedTransformVersion   | 本节点局部 TRS 改变                     |
| observedParentWorldVersion | 父节点世界变换改变                      |
| worldMatrixDirty           | reparent 等结构变化                     |
| worldVersionValue          | 告诉子节点：我的 worldMatrix 已重新计算 |

先更新父节点，再判断自身缓存；重新挂到另一个版本号恰巧相同的父节点时，结构 dirty 仍能触发更新。

## Group：语义子类型，而非更高一级算法

Group 目前主要增加稳定的分组诊断类型，树行为来自 SceneNode。SceneNode 本来就有 add/children；不需要在 Group 再实现一次。

Scene 继承 Group，是表达“Scene 也是分组容器”的选择，不是唯一可行架构。即使 Scene 直接继承 SceneNode，也不会因此缺少 add；差别主要在语义和类型关系，不应夸大成必需的代码复用层。

这属于场景图的组合结构：叶子和容器具有统一节点协议。继承的是“节点能力”，不是“整体继承某个零件”。

## Scene：树与资源持有是两本账

Scene 一方面是节点容器，另一方面用 Set 记录显式 retain 的 Resource。移除 Mesh 只改变树，不自动释放它借用的材质或几何。

release 先从 Set 删除，再调用 resource.releaseSceneReference。后者可能同步触发 listener；若顺序相反，listener 重入 Scene.release 会误认为还持有一次引用。

Scene.dispose 先关闭生命周期并移除直接子节点，再交还所持资源引用。它不是递归销毁所有节点。Scene 通常充当根，但当前继承 API 没有强制它永远不能有 parent。
