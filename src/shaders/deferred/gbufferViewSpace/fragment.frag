// prettier-plugin-glsl 0.2.2 cannot print extension directives.
// prettier-ignore
#extension GL_EXT_draw_buffers: enable
precision highp float;

uniform sampler2D uBaseColorMap;

varying highp vec3 vPositionView;
varying highp vec3 vNormalView;
varying highp vec2 vUv;

// [DESIGN-WEIGHT:3][gbuffer-view-space-contract]
// sRGB texture sampling already returns linear RGB: never decode it twice.
// Slot 0 alpha is a validity flag, NOT the source texture opacity.
// Normalize the normal after rasterizer interpolation.
void main() {
  vec3 baseColorLinear = texture2D(uBaseColorMap, vUv).rgb;
  gl_FragData[0] = vec4(baseColorLinear, 1.0);
  gl_FragData[1] = vec4(-vPositionView.z, 0.0, 0.0, 0.0);
  gl_FragData[2] = vec4(normalize(vNormalView), 0.0);
  gl_FragData[3] = vec4(vPositionView, 1.0);
}
