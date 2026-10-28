precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

varying highp vec3 vPositionView;
varying highp vec3 vNormalView;
varying highp vec2 vUv;

// [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
// Backend supplies transpose(inverse(mat3(view * model))) as uNormalMatrix.
// Do not replace it with mat3(model), especially with nonuniform scale.
void main() {
  vec4 positionView = uViewMatrix * uModelMatrix * vec4(position, 1.0);
  vPositionView = positionView.xyz;
  vNormalView = uNormalMatrix * normal;
  vUv = uv;
  gl_Position = uProjectionMatrix * positionView;
}
