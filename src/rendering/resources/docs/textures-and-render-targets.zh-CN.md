# Texture 与 RenderTarget：内容、存储和输出目标

对应源码：`../Texture.ts`、`../Texture2D.ts`、`../CubeTexture.ts`、`../texturePixelSnapshot.ts`、`../RenderTarget.ts`。

## Texture：共同描述，不持有 GPU handle

Texture 是抽象 Resource，集中保存 label、sampler、storage、colorSpace 和 mipmap 策略。protected 构造让具体纹理提供来源与错误工厂，避免直接创建一个没有具体来源语义的基础纹理。

sampler 描述如何采样，storage 描述数值格式；它们不是 WebGL 枚举，也不保证所有设备都支持。具体 backend 验证 NPOT、浮点采样、尺寸和扩展，不把 WebGL1 限制写死成通用纹理的全部能力。

## Texture2D 的两个具体来源

| 类             | 保存什么                           | 为什么这样拥有数据                       |
| -------------- | ---------------------------------- | ---------------------------------------- |
| ImageTexture2D | HTMLImageElement/ImageBitmap 引用  | 借用宿主对象，不擅自关闭共享 ImageBitmap |
| DataTexture2D  | width、height、复制后的 TypedArray | 外部修改输入像素不应改变内部快照         |
| Texture2D      | 共同二维纹理类型                   | 抽象分类，不虚构第三种来源               |

texturePixelSnapshot 是验证与复制函数模块，不是另一个 Texture 类。create 函数验证尺寸、存储类型及长度；copy 函数复制已验证的内部快照，不在每次读取时重复完整边界验证。

new Uint8Array(existingTypedArray) 复制元素到新的 backing buffer；它不同于 new Uint8Array(existingTypedArray.buffer)，后者可共享同一存储。

## CubeTexture：六个面，不是一个 WebGLTexture

faces 的固定次序为 +X、-X、+Y、-Y、+Z、-Z。kind=images 时借用六个图片对象并复制容器；kind=data 时还复制每面的像素。

为什么同时需要 tuple 与运行时长度检查？tuple 约束 TypeScript 调用者；运行时还可能遇到 JavaScript、断言或错误数据。复制时显式列出六项，不靠双重类型断言假装长度正确。

数据面可立即验证正方形、同尺寸；图片的真实可上传尺寸与加载完成情况需按图片来源检查。Object.freeze 容器不冻结图片内部，也不冻结 TypedArray 的所有元素。

## RenderTarget：描述写到哪里，不描述画什么

例如 256×256、一个 rgba8 颜色槽、可选 depth16：

- descriptor 说明尺寸与 attachment 存储要求。
- 不包含 Mesh/RenderObject，因为同一目标可接收不同 draw。
- 不包含 framebuffer handle，因为 handle 属于具体 context。
- colors 的集合表达槽位，不等于 WebGL1 已具备任意 MRT 能力。
- depth16 当前对应 renderbuffer 存储边界，不自动变成可采样深度纹理。

真实 GPU 对应关系是 FBO 连接颜色 texture 和深度 renderbuffer，draw 将结果写入连接的存储。FBO 不是另一份需要再复制到 texture 的颜色数据。

## 为什么需要 attachment 引用

`{ target, kind: 'color', index: 0 }` 表示“这个逻辑目标的第 0 个颜色槽”，不是“这一代 WebGLTexture”。

resize 后真实存储可能重建；持有逻辑槽位的消费者不必握着旧 handle。index 是槽号，不是像素索引、纹理单元号或 cubemap 面号。当前接口描述身份，不表示 Material 的采样接线已经实现。

## 快照与 revision

构造逐层验证并冻结 descriptor、colors 数组、颜色条目及 depth 条目。resize 的浅层展开可复用这些已冻结的嵌套对象，再冻结新外层。

resize 验证成功才提交新尺寸并增加 revision；同尺寸不增加。Manager 可据此判断旧 GPU 存储过期，但 revision 自身不创建 FBO，也不回滚已绘制像素。

设计思想是逻辑资源与设备实现分离、明确所有权、不可变描述和版本化失效。HDR/EXR 解码与环境烘焙是来源处理和派生渲染流程，不靠给 Texture 多加一个文件格式名称就自动完成。
