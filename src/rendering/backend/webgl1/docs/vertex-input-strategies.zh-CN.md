# 顶点输入：把 buffer 接到 shader 的输入位置

对应源码：`../WebGL1VertexInputManager.ts`、`../WebGL1VertexInputSupport.ts`、`../WebGL1OESVertexInputManager.ts`、`../WebGL1ManualVertexInputManager.ts`。

## 从一条完整的属性连接开始

假设 program 中实际使用了：

```glsl
attribute vec3 position;
```

GeometryManager 已上传 9 个 Float32 数字，代表三个顶点；ProgramManager 查询 position 的 location，假设返回 2。连接它们的 GL 操作是：

```ts
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)
gl.enableVertexAttribArray(2)
```

| pointer 参数 | 此例的意思                          |
| ------------ | ----------------------------------- |
| 2            | shader 输入位置编号，不是第几个顶点 |
| 3            | 每个顶点取三个分量                  |
| gl.FLOAT     | 每个分量在 buffer 中按浮点数存储    |
| false        | 不做整数归一化解释                  |
| stride=0     | 按当前属性格式紧密排列              |
| offset=0     | 从 buffer 的第 0 字节开始           |

vertexAttribPointer 会记录当时绑定的 ARRAY_BUFFER。随后把 ARRAY_BUFFER 绑定改成 uvBuffer，不会把 position 已记录的 buffer 关联自动改掉。

enableVertexAttribArray 让该 location 从数组读取。若不启用，它走常量属性值路径，不会因为调用了 pointer 就自动读取数组。参数语义可查 [Khronos vertexAttribPointer 参考](https://raw.githubusercontent.com/KhronosGroup/OpenGL-Refpages/main/es2.0/glVertexAttribPointer.xml)。

## 三类数字必须分清

对上述 position，典型反射结果是：

```text
info.size = 1
info.type = gl.FLOAT_VEC3
location = 2

attribute.itemSize = 3
attribute.count = 3
attribute.type = gl.FLOAT
```

size=1 表示一个该类型的变量，不是 vec3 的三个分量，也不是三个顶点。getActiveAttrib 的枚举 index 也不等于 location。

参考：[Khronos getActiveAttrib 参考](https://raw.githubusercontent.com/KhronosGroup/OpenGL-Refpages/main/es2.0/glGetActiveAttrib.xml)。

## 为什么检查 size 和 supportedTypes

当前算法为每条属性生成一个 VertexBinding，并执行一次 pointer。它能直接处理 float、vec2、vec3、vec4：

```ts
if (info.size !== 1 || !supportedTypes.includes(info.type)) {
  throw new UnsupportedRenderFeatureError(
    'vertex input',
    `${info.name}: matrix/array layout is unsupported`
  )
}
```

第一项拒绝反射出非单一实例的布局。GLSL ES 1.00 本身不允许 attribute 数组，因此它主要是防御性检查，不应拿 attribute vec3 positions[2] 当作合法 WebGL1 示例。

第二项拒绝当前绑定算法没有实现的类型，尤其矩阵。WebGL1 支持矩阵 attribute，不是 WebGL 不支持，而是此实现没有展开多 location。依据见 [GLSL ES 1.00 第 4.3.3 节](https://registry.khronos.org/OpenGL/specs/es/2.0/GLSL_ES_Specification_1.00.pdf)。

例如 mat4 的 info.size 仍为 1，但 type 是 FLOAT_MAT4，不在支持列表。一个 mat4 要占四个连续 location；若起点为 2，就需要 2、3、4、5。

概念上，一份每顶点 16 个 Float32 的矩阵数据需要：

```ts
// 解释矩阵布局，不是当前已经实现的功能。
gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer)

for (let column = 0; column < 4; column++) {
  const location = baseLocation + column
  gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 64, column * 16)
  gl.enableVertexAttribArray(location)
}
```

64 是每个矩阵 16×4 字节；每列偏移 16 字节。还必须验证四个 location 没有越界。只把 FLOAT_MAT4 加到 supportedTypes，而不改数据结构和绑定算法，会错误绘制。

错误文案 matrix/array 是合并诊断，不是完整、精准的原因分类。当前代码没有分别说明 size 错误还是 type 不支持，教学时应拆开解释。

## 两份结果为何要在这里相遇

ProgramManager 只知道“position → location 2”；GeometryManager 只知道“position → buffer/格式”。VertexInputSupport.resolve(geometryResource, programResource) 按同名属性组合两者。

不把这个逻辑放 Geometry 构造，因为 location 取决于实际链接的 program；不放 ProgramManager，因为同一 program 可画多个 Geometry。

输入类型是已经创建的 GPU 结果，resolve 不应隐式上传或编译。输出 VertexBinding 只是借用 buffer 加 location，不拥有它们。这是独立的“组合兼容性检查”边界。

需要检查：

- shader 的 active 属性是否都有同名 Geometry 数据；额外未使用的 Geometry 属性可以忽略。
- location 是否有效、唯一且小于 MAX_VERTEX_ATTRIBS。
- CPU itemSize 是否能直接由一次 pointer 表达，即 1..4。
- 两份 program 反射记录是否一致。

当前没有强制 itemSize 必须等于 shader 向量宽度，分量补齐遵循 GL 规则；这是当前策略，不应额外宣称有严格相等验证。

先完成全部 resolve，再改变 GL 绑定，避免发现第二个属性缺失时第一个已配置了一半。

## 四个文件的架构关系

| 文件中的主要类型               | 层次与职责                                 |
| ------------------------------ | ------------------------------------------ |
| WebGL1VertexInputManager       | 两种策略共同实现的接口，不是第三种 Manager |
| WebGL1VertexInputSupport       | 共享验证、反射缓存和 pointer 配置工具      |
| WebGL1OESVertexInputManager    | 拥有并缓存 VAO 的实现策略                  |
| WebGL1ManualVertexInputManager | 没有 VAO 时逐次配置并跟踪启用位置的策略    |

构造参数 gl 是设备依赖，扩展对象决定可用 GL API，maxAttributes 是布局上限，hooks 用于通知 State 失效。bind 的 Geometry 身份用于缓存/生命周期，GPU geometry 结果用于 buffer 配置，program 结果用于 locations；三者不能用一个 name 字符串替代。

## OES 策略：缓存已经接好的输入布局

首次组合 Geometry G 与 program P 时，创建 VAO、绑定它、配置 pointers/启用位/EBO，再记录缓存。重复组合直接绑定已有 VAO，避免逐项重配。

缓存需要 G 与真实 WebGLProgram 的双重身份：同一 G 配另一个 P，locations 可能不同；同名 P 也不是同一个 GPU 对象。

VAO 保存属性关联和 ELEMENT_ARRAY_BUFFER 绑定，但不保存当前 ARRAY_BUFFER 绑定。切换 VAO 会使 State 的 EBO 缓存过时。参考：[OES_vertex_array_object 规范](https://registry.khronos.org/webgl/extensions/OES_vertex_array_object/)。

失败时恢复进入前的相关绑定并清理新 VAO，不发布半成品。releaseGeometry/releaseProgram 清理相关 VAO；它们不删除借用的 buffers/program。

## Manual 策略：每次重新接线，并清除残留

假设上一物体使用 locations {0, 2}，下一物体只用 {0}。只配置 0 不够，2 仍然启用，所以要 disableVertexAttribArray(2)。

enabled 集合记录上一轮启用位。首次进入时没有可信记录，按上限清理未使用的位置；后续只清理集合差。仍要重新配置 pointers 和 EBO，非索引几何明确绑定 null，不能残留上一物体的索引 buffer。

禁用属性数组不等于擦除所有 pointer 元数据。发生配置中途错误时，必须把跟踪状态视为未知并按恢复路径处理，不能假装本轮绑定完整成功。

两种策略共同体现策略模式；Support 是组合复用，不为复用强行建立继承。缓存正确性、借用所有权和失败前预检，比“类名叫 Manager”更重要。
