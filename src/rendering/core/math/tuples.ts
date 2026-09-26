/**
 * 三个分量的只读数值 tuple，按 `[x, y, z]` 排列。
 *
 * @remarks
 * 分量是 JavaScript number（IEEE 754 binary64）。单位、坐标空间以及是否按 Float32
 * 量化，由使用它的字段或方法说明。`readonly` 只约束类型，不会在运行时复制或冻结数组。
 *
 * 本文件只放跨包传值用的纯类型，不引入 gl-matrix：gl-matrix 的 vec3、mat4 是可变的
 * Float32Array，只在 scene 内部使用。scene、resources、frame 都从 core 导入这些类型，
 * 彼此之间不必为了一个类型而产生依赖。
 */
export type Vec3Tuple = readonly [number, number, number]

/**
 * 4×4 矩阵的 16 个只读数值，按列主序 (column-major) 排列。
 *
 * @remarks
 * 第 c 列、第 r 行（c、r 都从 0 开始）的元素位于下标 `c * 4 + r`，因此平移分量位于
 * 下标 12、13、14。gl-matrix 的 mat4 和 GLSL 的 mat4 使用同一种布局，上传 uniform 时
 * 不需要转置。
 *
 * 它只是数值，不是对任何矩阵存储（例如 Float32Array）的引用。
 */
export type Mat4Tuple = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]
