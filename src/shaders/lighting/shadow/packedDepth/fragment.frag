precision highp float;

/**
 * 将 [0,1] 窗口深度编码为 RGBA8 数据。
 *
 * [DESIGN-WEIGHT:3][packed-depth-unorm-contract]
 *
 * 基数为 256，通道次序为最高位 R 到最低位 A。
 * fract 提取小数，减去下一通道的进位部分，使前三通道落在 1/256 网格。
 * RGBA8 存储的是 byte/255，因此最后乘 256/255；解码必须采用逆比例。
 * 端点 1 单独编码成全白，防止 fract(整数) 把最远深度绕回 0。
 *
 * 这是数据编码，不做 gamma/tone mapping/blending；写入时 dither=false。
 * 不支持 fragment highp 的设备应让编译明确失败，不静默降级 mediump。
 * RGBA8 有四个字节，不代表投影、shader 或 depth16 深度测试具备 32-bit 精度。
 */
vec4 packShadowDepth(const float depth) {
  if (depth <= 0.0) return vec4(0.0);
  if (depth >= 1.0) return vec4(1.0);

  vec4 encoded = fract(depth * vec4(1.0, 256.0, 65536.0, 16777216.0));
  encoded -= encoded.yzww * vec4(1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0, 0.0);
  return encoded * (256.0 / 255.0);
}

/**
 * depth16 负责深度测试；胜出片元把自己的窗口深度写进可采样颜色附件。
 */
void main() {
  gl_FragColor = packShadowDepth(gl_FragCoord.z);
}
