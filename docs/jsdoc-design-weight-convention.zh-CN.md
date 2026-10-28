# JSDoc 设计权重约定

## 1. 目的

本文档定义 HW2 WebGL1 实现中，用于标记非显然设计契约的重要性标记。

这些标记帮助未来的阅读者快速回答：

- 哪些注释描述了正确性关键的不变量？
- 修改前必须理解哪些实现细节？
- 哪些测试保护了同一个设计决定？
- 如何快速找到相互关联的源码和测试说明？

设计权重是阅读和维护信号。它不是：

- issue 优先级；
- 运行时错误严重程度；
- 性能权重；
- 测试执行顺序；
- TODO 注释的替代品。

## 2. 标记格式

把标记放在标准 JSDoc `@remarks` 块中：

```ts
/**
 * @remarks
 * [DESIGN-WEIGHT:3][transform-float32-canonicalization]
 *
 * 在这里说明不变量，以及它防止的生产错误。
 */
```

标记由两部分组成：

```text
[DESIGN-WEIGHT:<weight>][<topic-id>]
```

规则：

1. `<weight>` 只能是 `1`、`2` 或 `3`。
2. `<topic-id>` 使用小写 kebab-case。
3. 标记必须独占同一行，以便 `rg` 稳定搜索。
4. 保护同一个决定的源码和测试应复用相同 topic ID。
5. 只复述代码语法的注释不得添加权重标记。
6. 不得用设计权重标记代替表示未完成工作的 TODO。

## 3. 权重含义

### DESIGN-WEIGHT:3——关键不变量

错误修改所描述的行为可能导致以下问题时，使用权重 3：

- 静默数据损坏；
- 缓存过期但未被发现；
- 所有权或生命周期行为损坏；
- 身份不稳定；
- 数值状态不一致；
- 只有经过若干帧或若干操作后才出现的故障。

权重 3 的运行时契约通常必须有回归测试。若无法直接测试，必须在下面的主题登记表中说明原因。

### DESIGN-WEIGHT:2——重要设计理由

以下内容使用权重 2：

- 生命周期顺序；
- 所有权边界；
- API 封装决定；
- 对性能敏感的缓存取舍；
- 容易误解、但不单独构成关键不变量的行为。

当行为可从公开 API 观察时，应增加测试。

### DESIGN-WEIGHT:1——学习说明和局部取舍

以下内容使用权重 1：

- 有用的数学背景；
- 局部的库兼容性说明；
- 有意选择的实现风格；
- 有助于未来学习、但不属于不变量的解释。

权重 1 不要求专门的回归测试。

## 4. 搜索命令

查找所有正确性关键说明：

```bash
rg -n '\[DESIGN-WEIGHT:3\]' src tests
```

查找权重 2 和权重 3 的说明：

```bash
rg -n '\[DESIGN-WEIGHT:[23]\]' src tests
```

查找同一主题的所有源码和测试说明：

```bash
rg -n '\[transform-float32-canonicalization\]' src tests
```

查找全部设计权重标记：

```bash
rg -n '\[DESIGN-WEIGHT:[123]\]' src tests
```

## 5. 维护规则

当带标记的契约发生变化时：

1. 更新生产源码中的 JSDoc。
2. 更新对应测试的 JSDoc 和断言。
3. 更新下面的主题登记表。
4. 底层契约未改变时，继续使用原 topic ID。
5. 新契约与原契约概念不同时，创建新的 topic ID。
6. 删除已经失效的标记，不要保留互相矛盾的历史说明。

不要因为注释很长就提高权重。权重描述契约的重要性，不描述解释文字的篇幅。

## 6. 主题登记表

| Topic ID                                  | 权重 | 契约                                                                                                                                   | 生产源码位置                                                           | 测试位置                                                                                                   |
| ----------------------------------------- | ---: | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `transform-float32-canonicalization`      |    3 | 公开 API 的 binary64 输入必须先通过 `Math.fround()` 量化，再参与比较和存储，避免重复设置十进制小数时产生虚假变化。                     | `src/rendering/scene/Transform.ts`                                     | `tests/unit/rendering/scene/Transform.test.ts`                                                             |
| `transform-dirty-version-separation`      |    3 | `localMatrixDirty` 跟踪内部矩阵缓存；`version` 是持久的外部观察标记。读取矩阵可以清除 dirty，但不能重置或增加 version。                | `src/rendering/scene/Transform.ts`                                     | `tests/unit/rendering/scene/Transform.test.ts`                                                             |
| `scene-node-local-world-cache-separation` |    3 | Transform 负责 local TRS 与 local-matrix 缓存；SceneNode 组合 parent world 和 local matrix，并跟踪 world-cache 是否有效。              | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts`                                                             |
| `scene-node-stable-debug-type`            |    2 | debugLabel 使用显式稳定类型字符串，不依赖可能被打包器重命名的运行时 constructor name。                                                 | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts`                                                             |
| `scene-node-in-place-world-matrix`        |    2 | SceneNode 先把 local matrix 复制进 world cache，再依赖 gl-matrix 支持别名的乘法原地计算 `parentWorld * local`，因此不需要第二个 mat4。 | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts` 使用不可交换的 parent scale 与 child translation 验证顺序。 |
| `version-safe-integer-horizon`            |    1 | Transform 和 world version 使用 JavaScript 精确整数；按每秒增加 60 次计算，到达 `Number.MAX_SAFE_INTEGER` 约需 476 万年。              | `src/rendering/scene/Transform.ts`、`src/rendering/scene/SceneNode.ts` | 无专门测试；该主题记录数值范围，而不是运行时行为。                                                         |

### 6.1 HW1 二维纹理与附件采样

以下登记描述已经接通的采样通路，不表示 ShadowMapPass、阴影比较或 HW1 入口已经实现。
源码和测试位置均相对于仓库根目录；测试位置是验证入口，不是持续通过的保证。

`render-target-sampler-snapshot` 是本批采样快照的登记名；当前源码与测试复用
`render-target-descriptor-snapshot` 标记。搜索该契约时使用已有标记，不另行重命名。
CPU 附件地址的借用规则也沿用 `render-target-attachment-borrowing` 标记。

| Topic ID                          | 权重 | 契约                                                                                                                                                                         | 生产源码位置                                                                                                                                       | 测试位置                                                                                                                                                                                                     |
| --------------------------------- | ---: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `texture2d-source-borrowing`      |    3 | Material 借用 Texture2D 或附件逻辑地址，不保存 GPU handle、不取得所有权。Backend 每次 draw 按来源选择纹理 Manager 或 RenderTarget Manager，不能跨 draw 缓存解析结果。        | `src/rendering/resources/Texture2DSamplingSource.ts`、`src/rendering/resources/Material.ts`、`src/rendering/backend/webgl1/WebGL1Backend.ts`       | `tests/unit/rendering/resources/Texture2DSamplingSource.test.ts`、`tests/unit/rendering/resources/Material.test.ts`、`tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`                             |
| `render-target-sampler-snapshot`  |    3 | 附件 min/mag 过滤只接受 nearest/linear，缺省补 linear；输入复制、输出逐层冻结，resize 保留过滤设置。Manager 必须实际应用描述，不能只在 CPU 快照中保存它。                    | `src/rendering/resources/RenderTarget.ts`（既有 `render-target-descriptor-snapshot`）、`src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts` | `tests/unit/rendering/resources/RenderTarget.test.ts`、`tests/unit/rendering/backend/webgl1/WebGL1RenderTargetManager.test.ts`、`tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts`       |
| `texture2d-upload-transaction`    |    3 | 验证、上传和外部上传状态恢复成功后才发布缓存。非 lost 失败清理本次临时 handle；lost 时丢弃旧代引用，不恢复或删除旧 handle。Manager 关闭后拒绝访问，但保留失败清理项供重试。  | `src/rendering/backend/webgl1/WebGL1Texture2DManager.ts`                                                                                           | `tests/unit/rendering/backend/webgl1/WebGL1Texture2DManager.test.ts`                                                                                                                                         |
| `surface-texture-feedback`        |    3 | 先验证所有活动 scope 的生命周期与 revision，再仅比较栈顶输出的 target 身份。外层 A 暂停、内层写 B 读 A 合法；返回 A 后读 A 必须在 draw 前拒绝。                              | `src/rendering/backend/webgl1/WebGL1SurfaceScope.ts`、`src/rendering/backend/webgl1/WebGL1Backend.ts`                                              | `tests/unit/rendering/backend/webgl1/WebGL1SurfaceScope.test.ts`、`tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`、`tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts`        |
| `uniform-sampler-unit-allocation` |    3 | sampler2D 与 samplerCube 共用预算，先统计再解析资源。每个 active sampler 独占一个单元，即使来源相同也不合并；每次 draw 从 0 分配，uniform1i 接收单元下标而非 TEXTURE0 枚举。 | `src/rendering/backend/webgl1/WebGL1Uniforms.ts`                                                                                                   | `tests/unit/rendering/backend/webgl1/WebGL1Uniforms.test.ts`                                                                                                                                                 |
| `attachment-content-rebuild`      |    3 | resize 后解析当前 revision，context 恢复后解析新 generation；同一逻辑地址不能复用旧 handle。重建存储不等于恢复内容，生产者必须重画后才能获得预期采样结果。                   | `src/rendering/backend/webgl1/WebGL1Backend.ts`、`src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts`                                       | `tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`、`tests/unit/rendering/backend/webgl1/WebGL1RenderTargetManager.test.ts`、`tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts` |
