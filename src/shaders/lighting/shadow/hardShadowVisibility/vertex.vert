precision highp float;

attribute vec3 position;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uLightViewProjection;

varying highp vec4 vLightClipPosition;

/**
 * 同一个世界空间位置分别投影到主相机与光源。
 *
 * [DESIGN-WEIGHT:3][shadow-depth-comparison]
 *
 * gl_Position 决定主画面中的像素位置；varying 把光源裁剪坐标传到 fragment。
 * 保留齐次 w 到 fragment 再做除法，不能在 vertex 提前丢弃 w。
 * uLightViewProjection 必须与深度图生产时使用的 P_light * V_light 相同。
 */
void main() {
  vec4 worldPosition = uModelMatrix * vec4(position, 1.0);
  vLightClipPosition = uLightViewProjection * worldPosition;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
