precision highp float;

uniform highp sampler2D uShadowMap;
uniform float uShadowBias;
uniform vec3 uLitColor;
uniform vec3 uShadowColor;

varying highp vec4 vLightClipPosition;

/**
 * 逆转 packShadowDepth 的 RGBA8 归一化和通道位权。
 * [DESIGN-WEIGHT:3][packed-depth-unorm-contract]
 * 全白是清屏/最远深度的哨兵，明确返回 1，避免端点的浮点舍入影响比较。
 */
float unpackShadowDepth(const vec4 packedDepth) {
  if (all(equal(packedDepth, vec4(1.0)))) return 1.0;

  float depth = dot(packedDepth, 255.0 / 256.0 * vec4(1.0, 1.0 / 256.0, 1.0 / 65536.0, 1.0 / 16777216.0));

  return clamp(depth, 0.0, 1.0);
}

/**
 * 返回 1 表示受光、0 表示遮挡；不是 PCF/PCSS，也不是完整光照模型。
 *
 * [DESIGN-WEIGHT:3][shadow-depth-comparison]
 *
 * 两个深度必须来自同一光源投影，并使用 WebGL 的 NDC z [-1,1]。
 * w<=0 和裁剪体外直接受光，先判断再采样，避免误用 CLAMP_TO_EDGE 边缘。
 * uShadowBias 由 CPU setShadowBias 验证；相等也受光，正 bias 减轻自阴影。
 * uShadowMap 必须使用 nearest；未来 PCF 应多次“采样后比较”，再平均可见性。
 */
float hardShadowVisibility(const vec4 lightClipPosition) {
  if (lightClipPosition.w <= 0.0) return 1.0;

  vec3 ndc = lightClipPosition.xyz / lightClipPosition.w;

  if (any(lessThan(ndc, vec3(-1.0))) || any(greaterThan(ndc, vec3(1.0)))) {
    return 1.0;
  }

  vec3 shadowPosition = ndc * 0.5 + 0.5;
  float storedDepth = unpackShadowDepth(texture2D(uShadowMap, shadowPosition.xy));

  return shadowPosition.z - uShadowBias <= storedDepth
    ? 1.0
    : 0.0;
}

/**
 * 本批先显示可见性对应的两种颜色，便于验收。
 * 后续 HW1 光照材质使用同一比较规则，只衰减直接光，不能把环境项一起乘成零。
 */
void main() {
  float visibility = hardShadowVisibility(vLightClipPosition);
  gl_FragColor = vec4(mix(uShadowColor, uLitColor, visibility), 1.0);
}
