#ifdef GL_ES
precision highp float;
#endif

/**
 * HW2 与 HW4 共用的背景位置输入，与各自 Mesh 的属性名称一致。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-shader-position-contract]
 * 新 Geometry 和旧 CubemapMesh 都提供 position，按同一名称绑定 buffer。
 */
attribute vec3 position;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix; // 完整 view matrix，保留平移
uniform mat4 uProjectionMatrix;

varying vec3 vTexCoord;

void main() {
  // 单位 cube 的局部位置作为 cubemap 采样方向。
  vTexCoord = position;

  // 使用完整的 view matrix（保留平移），保持有限背景盒的显示语义。
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
}
