precision highp float;

varying highp vec2 vUv;
uniform sampler2D uBaseColor;
uniform sampler2D uNormal;
uniform vec3 uDirectionToLightView;
uniform vec3 uRadiance;

/**
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-lambert-display-encoding]
 * 输入是线性 RGB。最后一次显示编码使用精确分段函数，不使用近似 gamma 2.2。
 * clamp 是本阶段明确的显示截断策略，不能代替未来的 HDR tone mapping。
 */
float encodeDisplayChannel(float linearValue) {
  float value = clamp(linearValue, 0.0, 1.0);
  if (value <= 0.0031308) return 12.92 * value;
  return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

/**
 * @remarks
 * [DESIGN-WEIGHT:3][gbuffer-validity-before-lighting]
 * alpha=0 是背景，必须在读取/归一化法线之前返回，不能归一化清零的向量。
 */
void main() {
  vec4 base = texture2D(uBaseColor, vUv);
  if (base.a == 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 normalView = normalize(texture2D(uNormal, vUv).xyz);
  vec3 toLightView = normalize(uDirectionToLightView);
  float cosine = max(dot(normalView, toLightView), 0.0);
  // base 已由 GBuffer 保存在 linear 空间，不能再次做 sRGB 解码。
  vec3 linearColor = base.rgb / 3.141592653589793 * (uRadiance * cosine);
  gl_FragColor = vec4(
    encodeDisplayChannel(linearColor.r),
    encodeDisplayChannel(linearColor.g),
    encodeDisplayChannel(linearColor.b),
    1.0
  );
}
