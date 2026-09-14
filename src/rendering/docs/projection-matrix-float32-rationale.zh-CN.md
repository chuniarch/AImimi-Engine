# 为什么投影矩阵选择 Float32Array

日期：2026-09-14。范围：当前 HW2 CPU 相机矩阵的存储与验证契约。

## 1. 结论

这不是“数学上只能使用 Float32”，而是当前渲染矩阵选择 Float32 存储。
透视参数保留为 JavaScript Number；公式使用 Number 运算；结果写入 Float32Array 时舍入为单精度。

读取 Float32Array 元素时，得到的仍是 Number；转换回 Number 不会恢复已经丢失的精度。
这是存储格式的区别，不是将 JavaScript 的普通算术全部改成 32 位运算。[MDN：数值编码](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#value_encoding_and_normalization)

## 2. 一个具体例子

```ts
const input = 0.1
const single = new Float32Array([input])
const double = new Float64Array([input])

single[0] // 0.10000000149011612
double[0] // 0.1
```

第二个结果显示为 0.1，不代表 binary64 精确表示了数学上的十分之一；它保留了原 Number 的双精度表示。

当前处理顺序：Number 参数 → Number 公式计算 → 写入 Float32 缓冲 → 验证已量化结果。

## 3. 选择 Float32 的三个理由

### 与矩阵上传接口匹配

WebGL 的 uniformMatrix4fv 接口接收 Float32List，包括 Float32Array 或 GLfloat 序列。
CPU 使用 Float64 存储，不会让该接口变成双精度矩阵接口。提前形成 Float32 快照，使 CPU 明确知道提交的矩阵表示；这不保证 GPU 的全部后续算术都与 CPU 逐位相同。[WebGL 规范](https://registry.khronos.org/webgl/specs/latest/1.0/)

### 提前发现精度转换后的无效结果

某个结果在 Number 中有限且非零，写入 Float32 后仍可能变成 Infinity 或零。
因此不能只验证输入参数，还需要验证已经写入 Float32 的候选矩阵。

例如，在当前 gl-matrix 透视公式下，保持 fovY=PI/2、near=1、far=11，令 aspect=Number.MAX_VALUE，横向系数会下溢为零。
保持 fovY=PI/2、aspect=2、far=11，令 near=Number.MIN_VALUE，深度系数会下溢为 -0。
零仍是有限数，所以 Number.isFinite 不足以拦截这种退化。

### 保持当前矩阵精度约定，并减少存储量

16 个矩阵元素的数据区：Float32 为 64 字节，Float64 为 128 字节，不包含对象开销。
对单个相机而言，这点内存差异不是主要理由；也不能据此断言所有 CPU 运算一定更快。[MDN：Float32Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array)

## 4. 与参数比较的关系

fovY、aspect、near、far 保留原 Number 值，配置比较也在 Number 值之间进行。
因此重复提交 near=0.1 不会因为矩阵采用 Float32 而增加 projectionVersion。

不要将“原始 Number 参数”与“已经量化的 Float32 值”直接比较来判断配置是否改变。
两个不同 Number 配置即使恰好生成相同的 Float32 矩阵，本版仍将其视为配置变化。

## 5. Float64 什么时候有意义

高精度 CPU 几何计算、大尺度坐标或高精度中间运算可以使用 Number/Float64。
一种可行的后续策略是：高精度计算 → 坐标局部化或其他精度处理 → Float32 输出 → 验证。

但只把某一个缓冲改成 Float64，不会自动解决整个 CPU/GPU 数据链的精度问题。
大世界坐标问题也不应简单归结为投影矩阵的存储类型；需要同时检查世界坐标与 view/model 计算。

## 6. 修改前检查清单

- 明确要改变的是参数精度、中间计算精度，还是最终矩阵存储精度。
- 明确第一次发生 Float32 舍入的位置，并在该位置之后验证结果。
- 保留同一输入重复提交不增加版本、非法候选不覆盖旧状态的测试。
- 不把有限数检查当成完整的可逆性、数值稳定性或深度精度保证。
- 不将 Float64 CPU 存储宣传为 WebGL 双精度矩阵渲染。

## 7. 对应实现与测试

- [Camera.ts](../scene/cameras/Camera.ts)：投影矩阵的 Float32 存储。
- [PerspectiveCamera.ts](../scene/cameras/PerspectiveCamera.ts)：参数快照、候选结果验证和原子提交。
- [PerspectiveCamera.test.ts](../../../tests/unit/rendering/scene/cameras/PerspectiveCamera.test.ts)：重复参数、极端数值和失败不改变旧状态。
