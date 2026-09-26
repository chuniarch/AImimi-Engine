# ProgramManager 与 GeometryManager：从 GL 调用反推类型

对应源码：`../WebGL1ProgramManager.ts`、`../WebGL1GeometryManager.ts`。

## 先看没有 Manager 时要做什么

程序创建的核心顺序是：

```text
createShader → shaderSource → compileShader → 检查编译状态
两份 shader → createProgram → attachShader → linkProgram → 检查链接状态
→ 查询 active attributes/uniforms 与 locations
```

顶点上传的核心顺序是：

```ts
// 概念片段：省略 create* 的 null、错误检查和绑定恢复。
const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), gl.STATIC_DRAW)
```

createBuffer 创建对象；bindBuffer 指定后续 ARRAY_BUFFER 操作作用于哪个对象；bufferData 分配并上传数据。这个片段尚未告诉任何 shader 从哪里读，所以没有 draw。

Manager 的价值是把“创建一次、共享复用、失败清理、释放订阅、context 失效”集中起来，而不是把每个 GL 方法换个名字。

## 从消费者需要的结果推导 interface

| 类型                       | 具体消费者需要什么                                 | 不应放什么               |
| -------------------------- | -------------------------------------------------- | ------------------------ |
| WebGL1ProgramResource      | program、attribute location、uniform location      | CPU 场景树、删除策略     |
| WebGL1AttributeResource    | buffer、存储 type、itemSize、normalized            | 某个 program 的 location |
| WebGL1GeometryResource     | 属性表、indexBuffer/type、drawCount、primitiveMode | 材质参数、相机矩阵       |
| ProgramEntry/GeometryEntry | 对外结果加 unsubscribe                             | 应用层 public API        |
| ManagerHooks               | 缓存失效、删除前依赖清理能力                       | 整个 Renderer/Backend    |

这些 interface 是协议或私有记录，不是与 Manager 并列的一组“控制器”。readonly Map 限制 TypeScript 调用，不会把 Map 运行时深冻结。

## ProgramManager 为什么接收这些参数

构造时注入 gl 与 hooks：它们在整个 Manager 生命周期中稳定。get(shader) 的 shader 随每次请求变化，因此放方法参数，而不是构造参数。

get 不接收 Material，因为编译只需要 ShaderModule；多份 Material 共用同一个 ShaderModule 时，不应重复编译。缓存按完整 CPU 对象身份建立，不能按 name：同名不代表相同资源。

compile 的 source 提供源码与诊断名，stage 选择 vertex/fragment，GL type 指定 createShader 类型，owned 列表记录本次创建的 handles。stage 与 GL type 由内部调用成对提供，不是让应用随意组合。

owned 必须在创建成功后立即记录。若第二个 shader 编译失败，第一个也需要被找到并清理。局部清单只覆盖这次构建，不误删已有缓存。

## attribute 与 uniform 的无效 location

对已枚举的 active attribute，再查 location 得到负数，当前代码认为反射结果矛盾并报错；0 是有效 location，不能用 falsy 判断。

getUniformLocation 返回 null 不是 create\* 失败。对任意请求名称，它可能表示不存在或没有可上传位置；当前 ProgramManager 选择只保存非 null 的结果。

但这里是在枚举 active uniforms 后查它们，不能简单用“优化掉了”解释所有 null：被优化掉的用户 uniform 通常不在 active 枚举里。遇到枚举与查询不一致，仍需考虑 context lost、GL 错误或实现问题。

因此，这是当前实现对 uniform 的宽容策略，不是“WebGL 强制 attribute 必须抛错、uniform 必须忽略”。是否将 active uniform 的 null 也视为异常，是独立契约决定，本文不修改它。

## GeometryManager 为什么接收 Geometry，而不是 Mesh

两个 Mesh 共用 Geometry，位置和 Material 可以不同；buffer 内容相同。get(geometry) 恰好提供上传与缓存需要的信息，接收整个 Mesh 只会引入无关依赖。

构造参数 capabilities 只需要 elementIndexUint：这是最小依赖。没有扩展时，Uint32 索引的最大值若不超过 65535，可复制降为 Uint16；超过就报错，而不是截断导致索引绕回。

upload(target, data, label, owned) 的四个参数分别解决：

- target：上传普通属性还是索引？决定 ARRAY_BUFFER / ELEMENT_ARRAY_BUFFER。
- data：具体字节与 TypedArray 种类。
- label：失败时定位到 position 或 indices，而不只得到“buffer 出错”。
- owned：交给本次构建的回滚清单，防止部分成功时泄漏。

例如 Float32 position buffer 的 resource.type 是 gl.FLOAT，不是 gl.FLOAT_VEC3。前者是每个分量的存储格式，后者是 shader 变量类型。

## 为什么有这么多验证

| 验证位置               | 反例                           | 为什么不能都放构造函数     |
| ---------------------- | ------------------------------ | -------------------------- |
| get 开始的生命周期检查 | Resource 已被释放              | 生命周期会变化             |
| 索引扩展预检           | 当前设备不能绘制大 Uint32 索引 | CPU 构造不知道设备         |
| create\* 的 null       | 分配失败                       | 只有调用后才有结果         |
| compile/link 状态      | GLSL 语法或接口不匹配          | 非空字符串不保证可编译     |
| GL error 检查          | 上传/绑定产生错误              | GL 通常不以 JS throw 报错  |
| 回调后的 lost 检查     | 回调重入改变生命周期           | 开始时可用不保证现在仍可用 |

不是“验证越多越好”。不可变输入已验证的事实应复用；可变生命周期和跨 GL/回调边界的事实才需要重新确认。gl.getError 会消费错误标志，需要明确错误归属，不能把所有已有错误都无条件归罪于紧邻的上一行。

## 创建、恢复与发布

[DESIGN-WEIGHT:3][webgl-resource-transaction]

GeometryManager 先预检，再保存实际 ARRAY_BUFFER/EBO 绑定，创建上传，最后恢复绑定。只有这些成功后才发布缓存。失败时清理本次 owned handles，再传播原错误；context lost 则放弃旧代记录，不向失效 context 强行删除。

finally 的职责是“无论正常还是抛错都做收尾”，不要求一定搭配 catch。catch 清理后再次 throw，是让调用者知道构建没有成功，不能返回半成品。

## 删除顺序与生命周期

release 先让 beforeDelete 清理依赖的顶点输入记录，然后取消订阅、移除缓存、删除 GPU 对象并失效状态缓存。beforeDelete 抛错时不越过依赖屏障，保留记录供重试。

disposedValue 表示 Manager 已关闭正常服务，不等于每个 handle 都已成功清理。因此清理中出错后不应重新开放 get；显式清理重试与正常创建是不同权限。

Program 当前源码在 finally 中 deleteShader，但没有 detachShader。对仍连接 program 的 shader，delete 是标记删除，不能把它讲成“立即释放了所有附着 shader”。这条实现差异需单独核对和处理，本文没有替它宣布验收通过。

对应思想：单一职责、按需缓存、依赖注入、事务式发布、明确 GPU 所有权与失败后保持关闭。它们分别解决了上面的具体问题，不是先列模式再强套代码。
