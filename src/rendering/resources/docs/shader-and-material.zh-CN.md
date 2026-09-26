# ShaderModule、Material 与 RenderState

对应源码：`../ShaderModule.ts`、`../Material.ts`。

## ShaderModule：源码描述，不是已编译 program

ShaderModule 表达一个语言版本的一对 vertex/fragment 源码。language 二选一：glsl-es-100 或 glsl-es-300；不要求用户写两个版本，也不替用户转换 GLSL。

构造参数说明“要编译什么”，不接收 gl。构造检查非空源码、语言和内建 uniform 映射；实际编译是否成功只能由使用它的 backend 判断。

builtInUniforms 把引擎语义映射到 shader 名称，例如 modelMatrix → uModel。运行时允许列表也用来派生 TypeScript 联合类型，以免静态类型与实际验证分叉。未知 semantic 拒绝，值必须是非空字符串。

这是声明与执行分离：同一 CPU ShaderModule 可在不同 context 中编译为不同 program，但不兼容其语言的 backend 应明确拒绝。

## Material：共享外观，不承载某个 Mesh 的临时矩阵

假设 A、B 共用 Material。若准备绘制前先把 A.modelMatrix 写入材质，再写 B.modelMatrix，那么最终共享槽里只剩 B；之后读取这个槽绘制 A 就会用错。

不是说所有实时绘制顺序都必然出错，而是这种共享可变设计容易被收集、排序或延迟提交打破。正确边界是：Material 保存共同外观，逐次 draw 数据保存当前 Mesh 的矩阵。

Material 借用 ShaderModule 和逻辑 Texture，不接收 WebGLProgram/WebGLTexture。释放 Material 不连带释放 shader/texture，Scene 应显式持有需要管理的资源。

## 参数为什么是带 type 的联合类型

同一个数字 1，可能需要 uniform1f，也可能需要 uniform1i；数组长度相同也可能有不同语义。type 明确解释方式，Backend 才知道采用哪类上传。

标量验证有限值、int32 范围或 boolean；向量/矩阵验证长度与每个元素。setter 先验证并复制，成功才替换 Map entry；getter 也复制数值数组，阻止旁路修改。

texture 参数只复制包装，借用同一个逻辑资源身份。复制 GPU/CPU 纹理内容并不是一次参数赋值应承担的成本。

内建 uniform 的实际名称保留给 Backend，避免普通 Material 参数覆盖逐 draw 数据。

## RenderState：期望配置，不是 GL 当前状态

RenderState 是只读完整记录，包含 depthTest、depthWrite、depthFunction、cullMode。缺失字段补默认值，显式 false 不丢失；运行时冻结快照防止旁路修改。

它不负责调用 GL，也没有独立释放流程，因此不需要为了“看起来面向对象”而建一个 class。

```text
Material.renderState：我希望开启深度测试
WebGL1State：我上次是否已经开启过？
GL context：深度测试现在实际上是否开启？
```

Required 只把可选字段变成必填；Readonly 再限制类型层面的写入。二者都不能替代运行时冻结。

设计思想是不可变配置、带标签联合类型和共享数据/逐实例数据分离。当前 Material 纹理参数不等于已经接入 RenderTarget attachment；这条逻辑绑定仍应按 TODO 单独实现。
