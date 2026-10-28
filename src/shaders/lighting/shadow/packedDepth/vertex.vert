precision highp float;

attribute vec3 position;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

/**
 * 生产者复用 Backend 的 model/view/projection 内建语义。
 * 本次 submission.view 必须是光源视图，不是主相机视图。
 * 不把每个 Mesh 的模型矩阵写入共享 Material。
 */
void main() {
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
}
