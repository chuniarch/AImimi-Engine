import { ShaderModule } from '@/rendering/resources/ShaderModule'
import vertexSource from '@/shaders/lighting/shadow/packedDepth/vertex.vert?raw'
import fragmentSource from '@/shaders/lighting/shadow/packedDepth/fragment.frag?raw'

/**
 * 将既有 RGBA 打包深度 shader 接入引擎的三种矩阵语义。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][shadow-depth-shader-ownership]
 * 每次返回一个独立 CPU Resource，调用者负责其生命周期；ShadowMapPass 只借用它。
 * 工厂不创建 Material、不编译 GPU Program，也不缓存全局单例。
 *
 * modelMatrix 来自当前投影者，view/projection 来自灯光阴影视图。
 * fragment shader 写的是编码深度而非表面颜色，因此使用它的深度 Material 必须
 * 关闭 dither；接收者必须使用配对的 unpackShadowDepth。
 */
export function createPackedDepthShaderModule(): ShaderModule {
  return new ShaderModule({
    name: 'DirectionalShadow/packed-depth',
    language: 'glsl-es-100',
    vertexSource,
    fragmentSource,
    builtInUniforms: {
      modelMatrix: 'uModelMatrix',
      viewMatrix: 'uViewMatrix',
      projectionMatrix: 'uProjectionMatrix'
    }
  })
}
