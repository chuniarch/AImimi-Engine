import { ShaderModule } from '@/rendering/resources/ShaderModule'
import vertexSource from '@/shaders/lighting/shadow/hw1Receiver/vertex.vert?raw'
import fragmentSource from '@/shaders/lighting/shadow/hw1Receiver/fragment.frag?raw'

/**
 * 创建 HW1 表面着色源码资源；首次 draw 才由 ProgramManager 编译。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-receiver-coordinate-space]
 * 模型/相机/法线矩阵走已有内建语义；表面系数来自 Material，光照和阴影来自两个块。
 * 不给 ShaderModule 或 Backend 增加只服务 HW1 的语义。
 */
export function createHW1ReceiverShaderModule(): ShaderModule {
  return new ShaderModule({
    name: 'HW1/BlinnPhong/hard-shadow',
    language: 'glsl-es-100',
    vertexSource,
    fragmentSource,
    builtInUniforms: {
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix',
      normalMatrix: 'uNormalMatrix'
    }
  })
}
