precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
uniform mat4 uLightViewProjection;
varying highp vec3 vPositionView;
varying highp vec3 vNormalView;
varying highp vec2 vTexCoord;
varying highp vec4 vLightClipPosition;

/**
 * [DESIGN-WEIGHT:3][hw1-receiver-coordinate-space]
 * 光照在 view space 计算；阴影坐标则由同一个 world position 经光源 P×V 得到。
 * normalMatrix 是 inverse-transpose(mat3(view×model))，不能冒充世界法线。
 * Texture Manager 约定不翻转源图；OBJ 的底部原点 UV 在这里做一次 Y 翻转。
 */
void main() {
  vec4 world = uModelMatrix * vec4(position, 1.0);
  vec4 view = uViewMatrix * world;
  vPositionView = view.xyz;
  vNormalView = uNormalMatrix * normal;
  vTexCoord = vec2(uv.x, 1.0 - uv.y);
  vLightClipPosition = uLightViewProjection * world;
  gl_Position = uProjectionMatrix * view;
}
