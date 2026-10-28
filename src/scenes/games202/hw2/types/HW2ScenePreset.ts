import type { TransportType } from '@/loaders/types/loadPRT'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import type { CubeFaces } from '@/rendering/resources/CubeTexture'
import type { HW2TransportAttributeGroup } from '@/scenes/games202/hw2/internal/createHW2PRTGeometry'

/** 两个 URL 指向同一 GLSL ES 1.00 shader pair；这里只描述来源，不创建 ShaderModule。 */
export interface HW2ShaderPaths {
  readonly vertShaderPath: string
  readonly fragShaderPath: string
}

/**
 * 新 CPU 场景工厂的纯数值配置。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][hw2-cpu-preset-boundary]
 *
 * 不包含旧 Transform 实例、WebGL context、Renderer 或 GPU handle。
 * readonly 只约束 TypeScript；工厂仍在第一个 await 前复制并冻结输入。
 * PRTScenePreset 只保留类型重导出；正式工厂、Controller 和 GUI 使用本契约。
 */
export interface HW2ScenePreset {
  readonly label: string
  readonly env: {
    readonly dir: string
    /** 顺序为 +X、-X、+Y、-Y、+Z、-Z；图片必须在加载后验证。 */
    readonly cubeFaceUrls: CubeFaces<string>
    /** 背景 cube 从原点到每个面的距离，不是 GPU 纹理分辨率。 */
    readonly cubeMapsize: number
  }
  readonly model: {
    readonly path: string
    readonly name: string
    readonly transportType: TransportType
    readonly meshTransform: {
      readonly position: Vec3Tuple
      /** XYZ Euler，单位为弧度，与新 Transform.setRotation 一致。 */
      readonly rotation: Vec3Tuple
      readonly scale: Vec3Tuple
    }
  }
  readonly sh: HW2ShaderPaths & {
    readonly attributeLayout: readonly HW2TransportAttributeGroup[]
  }
  readonly backgroundShader: HW2ShaderPaths
}
