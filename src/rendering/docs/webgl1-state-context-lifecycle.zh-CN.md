# WebGL1 状态与 context 生命周期：补充 JSDoc 汇总

整理日期：2026-09-19。

范围：本任务（第 8 阶段 / Task 10）补充的四处 JSDoc，不包含此前其他阶段任务中的注释。以下四个代码块是整理时源码中的完整注释，仅移除了 class 内部的两格缩进。

本文汇总四处核心 JSDoc，并记录后来加入的 `onSuppressedError` 诊断契约；仍未加入逐 draw 查询或开发状态核对模式。本文随正式源码提交，作为注释快照；后续源码契约发生变化时，应同步更新本文及 codex-workspace 中的规划副本。

## 1. 先分清三种状态和两种恢复

- 浏览器真实 GL 状态：context 是否丢失，实际绑定和深度配置是什么。
- 引擎生命周期状态：ready、lost、restoring、restore-failed、disposed。
- JavaScript 状态缓存：记住上次应用的配置；undefined 表示未知，不表示 context 一定丢失。绑定缓存中的 null 表示已知未绑定。

`restoreSurfaceState()` 恢复 framebuffer/viewport；`handleRestored()` 组织 context 恢复后的引擎重建。`invalidate()` 只遗忘缓存，既不重置 GL，也不恢复 context。

整理时，surface scope 的接口与 State 单元测试已经存在，正式 WebGL1Backend 编排仍属于 Task 15。不能把注释中的调用示意理解为生产链路已经接通。

## 2. handleLost：响应已经发生的 context 丢失

对应源码：[WebGLContextLifecycle.ts](../backend/webgl1/WebGLContextLifecycle.ts)。

```ts
/**
 * 响应浏览器的 context 丢失通知，先禁止绘制，再通知 Backend 使缓存失效。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
 *
 * 这里处理的是「已经丢失之后怎么办」，不是主动调用 loseContext，
 * 也不是在事件中立即重建 GPU 资源。正常执行顺序如下：
 * 1. disposed 对象不再处理事件；dispose 已负责解除两个事件监听。
 * 2. 调用 preventDefault，表达允许浏览器后续尝试恢复的意愿。
 *    它不撤销已经发生的丢失，也不保证一定收到 restored 事件。
 * 3. 如果已经处于 lost，直接返回，避免重复执行 onLost 和清空诊断。
 *    preventDefault 放在这个判断之前，因此重复 lost 事件仍会被取消默认行为。
 * 4. 增加转换版本，先写入 lost 并清除上一轮失败，再同步执行 onLost。
 *    因而回调内观察到的 isReady 已为 false，不会把资源失效期间误判为可绘制。
 * 5. onLost 由 Backend 注入，负责使资源与状态缓存失效；它不应删除已经失效的
 *    GPU handles。本类只协调调用顺序，不负责停止 rAF 或实现 Manager 清理。
 *
 * 若 onLost 抛错，本轮仍保持 lost，并通过 lastFailure 保存原始错误；
 * 这不是恢复阶段失败，因此不调用 onRestoreFailed，也不把异常抛出 DOM listener。
 * 这里的「本轮」有前提：回调没有通过同步重入启动更新的转换或 dispose。
 *
 * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
 *
 * 前置 ++ 先增加成员版本，再把新值复制到局部 version；例如 4 → 5，
 * 此时两者都是 5。局部 number 是本轮令牌，不会跟随成员后续变化。
 * 如果 onLost 内先调用 dispose，再抛错，成员版本会变成 6，局部仍是 5。
 * catch 必须确认版本仍相等才能记录失败，否则旧回调会覆盖更新转换的诊断。
 * 若版本已经变化，原始错误通过 onSuppressedError 报告为 stale，不写入
 * lastFailure，也不改变新转换已经发布的状态。
 * 这是同步回调重入保护，不要求存在多个线程或 async/await。
 *
 * @param event 浏览器发送的丢失事件；测试用可取消的 Event 模拟事件协议，
 * 不代表测试真的使 GPU context 丢失。
 */
```

## 3. handleRestored：浏览器恢复后，组织引擎重建

对应源码：[WebGLContextLifecycle.ts](../backend/webgl1/WebGLContextLifecycle.ts)。

```ts
/**
 * 响应浏览器的 context 恢复通知，完成引擎重建与收尾后才重新允许绘制。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-context-lifecycle-order]
 *
 * 浏览器发送 restored 只说明 context 已恢复，不代表旧 GPU handles 重新有效，
 * 也不代表引擎已经完成资源重建。只有 lost 或 restore-failed 状态接受此通知；
 * ready、restoring、disposed 状态均忽略，因此恢复中的重复事件不会递归恢复。
 * 接受通知后的同步顺序为：
 * 1. 增加转换版本，进入 restoring，并清除上一轮失败记录。
 * 2. 调用 Backend 注入的 restore，重新探测能力并建立新的 State/Managers。
 *    实际重建策略由 Backend 负责，本类不直接创建任何 GL 对象。
 * 3. 确认仍属于本轮后，调用 onReady 做同步恢复收尾。
 *    尽管回调名为 onReady，它执行期间仍是 restoring，isReady 仍为 false，
 *    因此不能在该回调里开始 draw。
 * 4. 收尾成功返回且版本仍相等，最后才发布 ready 状态。
 *
 * 若 restore 或 onReady 抛错且本轮仍有效，先进入 restore-failed，
 * 再保存带 phase 的原始错误并调用 onRestoreFailed；通知回调观察到的
 * isReady 已为 false。若通知自身又抛错，同时记录 notificationError，
 * 不覆盖最初的恢复错误。上述回调异常均不逃出 DOM listener。
 * 本类不自动制造 restored 事件，也不因失败进入无限重试。
 *
 * [DESIGN-WEIGHT:3][webgl-context-reentrant-disposal]
 *
 * 每次外部回调返回或抛错后，都必须先检查本轮 version 是否仍然有效。
 * 例如恢复开始时两者都是 2；restore 内同步触发新的 lost 转换后，
 * 成员版本变成 3，旧调用栈里的 version 仍为 2。旧恢复必须立即退出，
 * 不能继续调用 onReady，更不能把较新的 lost 覆盖成 ready。
 * 回调内 dispose 同理；失败通知自身重入后，旧通知错误也不能覆盖新诊断。
 * 若旧回调随后抛错，onSuppressedError 接收冻结的 phase/version 快照；
 * 它只用于日志/监控，不重试恢复，也不把该错误写成当前 lastFailure。
 * 这些检查保护的是「旧调用栈不能提交新生命周期的状态」，不是 GPU 资源版本，
 * 也不表示允许异步恢复；所有注入回调仍须遵守同步返回 undefined 的契约。
 */
```

## 4. restoreSurfaceState：恢复临时改变的输出绑定

对应源码：[WebGL1State.ts](../backend/webgl1/WebGL1State.ts)。

```ts
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
```

## 5. setDepthState：为什么不在每次设置前查询真实 GL 状态

对应源码：[WebGL1State.ts](../backend/webgl1/WebGL1State.ts)。

```ts
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
```

## 6. 补充问答：catch 提前 return 是否吞掉错误？

必须区分「回调确实抛出了异常」「这轮恢复是否仍是当前生命周期」和「异常是否需要上报」三个问题。

### 当前这一轮仍有效

假设局部 `version` 与成员 `transitionVersion` 都是 2，`restore()` 或 `onReady()` 抛错且版本未变化：

1. `phase` 说明失败发生在 `restore` 还是 `on-ready`，因此进入 `catch` 不一定只表示 `restore()` 失败。
2. 状态进入 `restore-failed`，`isReady` 为 false。
3. `lastFailure` 保存原始错误和 phase。
4. 调用 `onRestoreFailed(error)` 通知接入方。

这里没有重新 `throw`，但也没有静默丢弃当前错误，而是把异常转换成可查询的失败状态和通知。本类的现行契约是业务回调异常不逃出 DOM listener；这不代表资源自动恢复，也不代表应用已经具备提示或重试功能。

### 这一轮已经过期

假设恢复开始时 `version=2`，`restore()` 回调先调用 `dispose()`，使 `transitionVersion=3`、`state=disposed`，然后抛错：

1. 异常沿调用栈回到旧 `handleRestored()` 的 `catch`。
2. 旧 catch 看到 `2 !== 3`，说明新转换已经取代本轮恢复。
3. `return` 退出整个 `handleRestored()`；JavaScript 随后自然弹出这一层函数栈帧。它不是停留在 catch，也不需要手动「清空调用栈」。
4. 不把 `disposed` 改成 `restore-failed`，不覆盖当前 `lastFailure`，也不以旧恢复的身份调用失败通知。

因此，到达 catch 的确说明当前调用栈里的恢复步骤抛出了异常；版本不一致只说明这个恢复尝试已经不再有权提交生命周期结果。旧异常不能作为当前状态转换的依据。

### 状态保护不要求必须丢弃过期错误

把旧错误写入独立监控通道，并不会必然破坏版本保护。只要上报操作满足以下约束，较新的 `lost` 或 `disposed` 状态仍可保持不变：

- 不修改 `stateValue`、`failureValue` 或 `transitionVersion`；
- 不把旧错误伪装成当前 `lastFailure`；
- 监控通道自身不能再抛错影响生命周期 listener；
- 日志带上 `stale`、原 phase 和版本信息，避免被误判为当前恢复结果。

直接重新 `throw error` 也不会倒退已经写入的新状态，但会违反本类当前的「业务回调异常不逃出 DOM listener」契约。对于 DOM `EventTarget`，listener 抛出的异常会被报告为未捕获异常，却不会按普通函数调用那样传播给 `dispatchEvent()` 的调用者。全局监控可能记录它，但调用方不能依赖自己的 `try/catch` 接住它；这与受控诊断不是同一语义。

当前实现已经加入独立的 `onSuppressedError` 诊断回调。版本不一致且旧回调抛错时，它收到冻结的 `{error, phase, stale, capturedVersion, currentVersion}` 快照；该错误不会写入当前 `lastFailure`，也不会把更新的 `lost/disposed` 改成 `restore-failed`。`onLost`、`restore`、`onReady` 和 `onRestoreFailed` 的过期异常都走这一出口。

`onSuppressedError` 只负责日志/监控，不重试恢复，也不得修改生命周期。实现仍用 `try/catch` 隔离诊断回调自身的异常：这里不能递归调用同一回调报告它自己的错误，也没有第二个 logger 依赖，因此诊断通道的二次错误会被丢弃。若未来要求观察这类错误，应在 Lifecycle 外注入非抛出的 fallback。

### onRestoreFailed 不是再次恢复

`restore()` 表示执行恢复；`onRestoreFailed(error)` 表示「当恢复失败时执行通知」。`on` 是事件回调的命名前缀，不包含再次调用 `restore()` 的含义。

通知的接入方可以记录日志、展示错误或提供人工重试入口，但这些是接入方策略，当前回调类型没有自动实现它们。尤其不应默认在通知回调里同步递归调用恢复，否则会重新进入生命周期转换并增加重入复杂度。

若通知回调自身抛错且本轮仍有效，代码把它保存为 `notificationError`，与原始 `error` 并存；若通知期间发生新转换，旧通知异常也不会覆盖新诊断。

整理时，正式 Backend 尚未注入这套回调；现有单元测试通过假回调验证状态与顺序，不能据此宣称真实浏览器恢复、监控上报或自动重试已经完成。

## 7. 维护与参考

- 注释沿用现有 DESIGN-WEIGHT:3 主题，标记的是生命周期和缓存正确性前提，不是错误严重程度。
- 修改前先明确：谁调用、改变哪一份状态、是否已经接入生产流程、失败后由谁接手。
- 有关查询成本的说明是架构取舍，不是本项目的性能测量结果；具体参数、浏览器和设备上的成本仍需测量。
- [MDN：避免在生产中使用阻塞式查询](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_blocking_api_calls_in_production)
- [MDN：getParameter 的参数和返回类型](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter)
- [MDN：dispatchEvent 与 listener 异常传播](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)
