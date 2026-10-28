import urlJoin from 'url-join'

import { PRTDataDirectories } from '@/_config/prtDataPaths'
import type { TransportType } from '@/loaders/types/loadPRT'
import { ModelPaths } from '@/models/_config/modelPaths'
import type { CubeFaces } from '@/rendering/resources/CubeTexture'
import { ShaderPaths } from '@/shaders/_config/shaderPaths'
import { TexturePaths } from '@/textures/_config/texturePaths'
import type { HW2ScenePreset } from '../types/HW2ScenePreset'

/** 固定 cubemap 面顺序；不能使用异步加载的完成顺序。 */
function faces(directory: string): CubeFaces<string> {
  return Object.freeze([
    urlJoin(directory, 'posx.jpg'),
    urlJoin(directory, 'negx.jpg'),
    urlJoin(directory, 'posy.jpg'),
    urlJoin(directory, 'negy.jpg'),
    urlJoin(directory, 'posz.jpg'),
    urlJoin(directory, 'negz.jpg')
  ])
}

/** 每一层共享配置都冻结；只冻结最外层 presets 数组并不足够。 */
const MARY_TRANSFORM = Object.freeze({
  position: Object.freeze([0, 0, 0] as const),
  rotation: Object.freeze([0, 0, 0] as const),
  scale: Object.freeze([10, 10, 10] as const)
})

/** 二阶 PRT 使用集中登记的 shader pair，位置输入统一为 position。 */
const SH = Object.freeze({
  attributeLayout: Object.freeze([
    Object.freeze({ name: 'aTransportSH0', size: 3 }),
    Object.freeze({ name: 'aTransportSH1', size: 3 }),
    Object.freeze({ name: 'aTransportSH2', size: 3 })
  ]),
  vertShaderPath: ShaderPaths.TWO_ORDER_SH_VERTEX,
  fragShaderPath: ShaderPaths.TWO_ORDER_SH_FRAGMENT
})

const BACKGROUND_SHADER = Object.freeze({
  vertShaderPath: ShaderPaths.CUBEMAP_BG_VERTEX,
  fragShaderPath: ShaderPaths.CUBEMAP_BG_FRAGMENT
})

const ENVIRONMENTS = [
  { name: 'Indoor', dir: PRTDataDirectories.INDOOR, images: TexturePaths.HW2_CUBEMAP_INDOOR },
  {
    name: 'CornellBox',
    dir: PRTDataDirectories.CORNELL_BOX,
    images: TexturePaths.HW2_CUBEMAP_CORNELL_BOX
  },
  {
    name: 'GraceCathedral',
    dir: PRTDataDirectories.GRACE_CATHEDRAL,
    images: TexturePaths.HW2_CUBEMAP_GRACE_CATHEDRAL
  },
  { name: 'Skybox', dir: PRTDataDirectories.SKYBOX, images: TexturePaths.HW2_CUBEMAP_SKYBOX }
] as const

const TRANSPORTS: readonly { readonly type: TransportType; readonly label: string }[] = [
  { type: 'shadowed', label: 'Shadowed' },
  { type: 'unshadowed', label: 'Unshadowed' },
  { type: 'interreflection', label: 'Interreflection' }
]

/**
 * HW2 工厂和 GUI 共用的十二个 Mary preset。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][hw2-cpu-preset-boundary]
 *
 * 复用现有 BASES，保留非根路径部署支持；不硬编码站点根目录 /assets。
 * hw2SceneConfig 仅重导出本列表；不存在第二份旧 Transform 配置。
 * 尚未确认来源/模式的 Bunny candidate 不进入可运行配置。
 */
export const HW2_CPU_PRESETS: readonly HW2ScenePreset[] = Object.freeze(
  ENVIRONMENTS.flatMap((environment) => {
    const env = Object.freeze({
      dir: environment.dir,
      cubeFaceUrls: faces(environment.images),
      cubeMapsize: 100
    })
    return TRANSPORTS.map(({ type, label }) =>
      Object.freeze({
        label: environment.name + ' / Mary / ' + label,
        env,
        model: Object.freeze({
          path: ModelPaths.HW2_MARY,
          name: 'mary',
          transportType: type,
          meshTransform: MARY_TRANSFORM
        }),
        sh: SH,
        backgroundShader: BACKGROUND_SHADER
      })
    )
  })
)
