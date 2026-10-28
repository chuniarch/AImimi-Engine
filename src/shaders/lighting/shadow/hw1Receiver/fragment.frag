precision highp float;

uniform sampler2D uDiffuseMap;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform vec3 uAmbientRadiance;
uniform vec3 uDirectionToLightView;
uniform vec3 uLightRadiance;
uniform highp sampler2D uShadowMap;
uniform float uShadowBias;
varying highp vec3 vPositionView;
varying highp vec3 vNormalView;
varying highp vec2 vTexCoord;
varying highp vec4 vLightClipPosition;

/**
 * 和 packedDepth 的 UNORM 编码配对；白色清屏是最远深度哨兵。
 */
float unpackShadowDepth(vec4 encoded) {
  if (all(equal(encoded, vec4(1.0)))) return 1.0;
  return clamp(dot(encoded, 255.0 / 256.0 * vec4(1.0, 1.0 / 256.0, 1.0 / 65536.0, 1.0 / 16777216.0)), 0.0, 1.0);
}

/**
 * [DESIGN-WEIGHT:3][shadow-depth-comparison]
 * 先处理无结果的零矩阵及视锥外片元，再采样；避免把边缘 clamp 当成有效阴影。
 * 正 bias 从接收者深度扣除；相等时受光。nearest 采样后只进行一次硬比较。
 */
float visibility() {
  if (vLightClipPosition.w <= 0.0) return 1.0;
  vec3 ndc = vLightClipPosition.xyz / vLightClipPosition.w;
  if (any(lessThan(ndc, vec3(-1.0))) || any(greaterThan(ndc, vec3(1.0)))) return 1.0;
  vec3 coordinate = ndc * 0.5 + 0.5;
  float nearestDepth = unpackShadowDepth(texture2D(uShadowMap, coordinate.xy));
  return coordinate.z - uShadowBias <= nearestDepth
    ? 1.0
    : 0.0;
}

/**
 * 输入 PNG 保留编码值上传；手动解码一次，避免强制依赖 WebGL1 EXT_sRGB。
 */
vec3 srgbToLinear(vec3 value) {
  return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), value));
}

/**
 * 默认 framebuffer 接收显示编码值；本作业没有另一个 tone-map/output Pass。
 */
vec3 linearToSRGB(vec3 value) {
  value = max(value, vec3(0.0));
  return mix(12.92 * value, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), value));
}

/**
 * 防止视线恰好与光反向、或位于原点时 normalize(0) 产生未定义结果。
 */
vec3 safeNormalize(vec3 value) {
  float squaredLength = dot(value, value);
  return squaredLength > 0.0
    ? value * inversesqrt(squaredLength)
    : vec3(0.0);
}

/**
 * [DESIGN-WEIGHT:3][hw1-shadow-only-direct-light]
 * 阴影只遮挡直接光的漫反射和高光，环境项保留。
 * MTL 的 Kd/Ks 是线性系数；图片 sRGB 解码后乘 Kd，最终输出只编码一次。
 * 这是 HW1 的 Blinn-Phong 接收者，不宣称实现 PBR、IBL、PCF 或 PCSS。
 */
void main() {
  vec3 albedo = uDiffuseColor * srgbToLinear(texture2D(uDiffuseMap, vTexCoord).rgb);
  vec3 normalView = safeNormalize(vNormalView);
  vec3 lightView = safeNormalize(uDirectionToLightView);
  float cosine = max(dot(normalView, lightView), 0.0);
  vec3 halfDirection = safeNormalize(lightView + safeNormalize(-vPositionView));
  float specular = cosine > 0.0 ? pow(max(dot(normalView, halfDirection), 0.0), max(uShininess, 0.0001)) : 0.0;
  vec3 direct = uLightRadiance * (albedo * cosine + uSpecularColor * specular);
  vec3 linearColor = albedo * uAmbientRadiance + visibility() * direct;
  gl_FragColor = vec4(linearToSRGB(linearColor), 1.0);
}
