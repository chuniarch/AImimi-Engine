precision highp float;

attribute vec3 position;
varying highp vec2 vUv;

/**
 * 全屏顶点直接进入 clip space；三角形超出屏幕的区域由光栅化裁剪。
 */
void main() {
  gl_Position = vec4(position, 1.0);
  // 可见方形 [-1,1] 对应 UV [0,1]，像素中心自然落在附件纹素中心。
  vUv = position.xy * 0.5 + 0.5;
}
