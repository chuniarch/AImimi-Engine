# 静态 VertexAttribute 与 Geometry

对应源码：`../VertexAttribute.ts`、`../Geometry.ts` 及属性语义常量。

## 从三角形的 9 个数字开始

```ts
const position = new VertexAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
```

data 是连续数字，itemSize=3 表示每个顶点读取 x/y/z，所以 count=9/3=3。这个对象只代表 position；uv、color 是另外的 VertexAttribute。

## VertexAttribute：数据与读取格式的不可变快照

构造参数各有来源：

- data：应用提供的 CPU 数值。
- itemSize：每个顶点使用几个分量，不是顶点总数。
- normalized：整数属性上传后是否归一化解释，不会在构造时改写 CPU 数值。

输入复制防止外部改数组；copyData 再复制防止读取者反向修改内部数据。copyDataTo 接收已有目标数组，为复用内存提供接口，因此必须验证目标的类型与长度。

当前支持 Float32、Int8、Uint8、Int16、Uint16 属性存储。CPU 层验证正整数 itemSize 和数据整除关系；具体 WebGL pointer 的 1..4 分量限制属于顶点输入实现。不要把“CPU 描述可构造”误认为“每个 backend 都能绘制”。

## Geometry：聚合属性，不混合所有数组

Geometry 继承 Resource，拥有属性集合和索引快照。构造时把属性 record 复制成 Map，是隔离“名称到属性”的容器；VertexAttribute 自身不可变，所以可共享它的引用，不必再次复制所有内部数据。

| 验证                       | 不验证会怎样                     |
| -------------------------- | -------------------------------- |
| 存在非空 position          | 无法确定有效顶点集合             |
| 所有属性 count 一致        | 一个顶点可能找不到对应 uv/color  |
| index 小于 vertexCount     | 索引指向不存在的顶点             |
| topology 与 drawCount 匹配 | 不能满足本引擎选定的完整图元契约 |

某些 drawCount 限制比原生 GL 更严格，是引擎契约，不应说成 WebGL 对所有尾部不完整图元都必然报错。

Uint32 索引属于索引数据，不属于 VertexAttributeData。WebGL1 是否能使用它由 GeometryManager 根据扩展处理；CPU Geometry 不读取 context。

## CPU 描述怎样对应 GL

```text
VertexAttribute.data       → bufferData 上传的内容
VertexAttribute.itemSize   → vertexAttribPointer 的 size
VertexAttribute.normalized → vertexAttribPointer 的 normalized
TypedArray 种类            → vertexAttribPointer 的存储 type
Geometry indices           → ELEMENT_ARRAY_BUFFER 与 drawElements
Geometry topology          → draw 的 primitive mode
```

这里没有 attribute location：同一 Geometry 配两个不同 program，position 可能分别链接到 location 0 与 3。把 location 写死在 Geometry 中，会错误耦合 CPU 数据与某个 program。

这体现不可变快照、职责分离，以及“一份 CPU 资源可以有多份 per-context GPU 表示”的设计。Geometry.dispose 丢弃自己的 CPU 引用；GPU buffers 由监听它的各个 Manager 分别释放。
