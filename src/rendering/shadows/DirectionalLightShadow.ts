import { Resource } from '@/rendering/core/Resource'
import { InvalidDirectionalShadowError } from '@/rendering/core/errors'
import type { Mat4Tuple, Vec3Tuple } from '@/rendering/core/math/tuples'
import { assertNonArrayObject } from '@/rendering/core/validation'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import {
  copyDirectionalShadowSettings,
  copyShadowVector,
  requireShadowLabel,
  type DirectionalShadowSettings,
  type DirectionalShadowSettingsInput
} from './DirectionalShadowSettings'
import { copyDirectionalShadowMatrix } from './createDirectionalShadowView'
import { requireShadowBias } from './requireShadowBias'

/** label 与存储/投影设置分开：重名允许，缓存仍按对象身份。 */
export interface DirectionalLightShadowOptions extends DirectionalShadowSettingsInput {
  readonly label: string
}

/** clip.w=0 让现有接收者 shader 走“无阴影”分支；不是单位矩阵。 */
const NO_SHADOW_MATRIX: Mat4Tuple = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

/**
 * 方向光阴影的 CPU 所有者，不是 Light、Pass 或 GPU Manager。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][directional-shadow-owned-resources]
 * Scene retain 本资源；Light 借用本资源；Material 借用 block。
 * 本资源独占 target/block，外部不得再单独 retain、dispose 或改写块。
 * 生产 Pass 作为所有者的协作者，可以在输出 scope 外 resize target。
 * GPU 对象仍由 Backend 的 Manager 创建和释放。
 */
export class DirectionalLightShadow extends Resource {
  protected override readonly resourceType = 'DirectionalLightShadow'

  public readonly label: string
  private settingsValue: DirectionalShadowSettings
  private readonly targetValue: RenderTarget
  private readonly blockValue: ParameterBlock

  /** 先验证全部配置，再创建 CPU 子资源；此处不申请 GPU 内存。 */
  constructor(options: DirectionalLightShadowOptions) {
    super()
    assertNonArrayObject(
      options,
      () => new InvalidDirectionalShadowError('<unnamed>', 'options', 'must be a non-array object')
    )
    this.label = requireShadowLabel(options.label)
    this.settingsValue = copyDirectionalShadowSettings(this.label, options)
    const { mapSize, bias } = this.settingsValue
    this.targetValue = new RenderTarget(
      {
        width: mapSize,
        height: mapSize,
        colors: [{ format: 'rgba8', sampler: { minFilter: 'nearest', magFilter: 'nearest' } }],
        depth: { format: 'depth16' }
      },
      { label: this.label + '/map' }
    )
    this.blockValue = new ParameterBlock({
      label: this.label + '/parameters',
      entries: {
        uShadowMap: { type: 'texture2D', value: this.targetValue.getColorAttachment(0) },
        uLightViewProjection: { type: 'mat4', value: NO_SHADOW_MATRIX },
        uShadowBias: { type: 'float', value: bias }
      }
    })
  }

  /** 下次提取使用的冻结设置，不等于“本帧已绘制结果”。 */
  get settings(): DirectionalShadowSettings {
    this.assertUsable()
    return this.settingsValue
  }

  /** 借用逻辑目标；不转交所有权，不能单独由 Scene.retain 管理。 */
  get target(): RenderTarget {
    this.assertUsable()
    this.targetValue.assertUsable()
    return this.targetValue
  }

  /** 多个 Material 可借用同一个块；消费者不能向里面提交阴影结果。 */
  get block(): ParameterBlock {
    this.assertUsable()
    this.blockValue.assertUsable()
    return this.blockValue
  }

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-frame-settings]
   * 仅改设置；Pass 下一帧按快照 resize，避免修改活动输出。
   */
  setMapSize(mapSize: number): void {
    this.updateSettings({ mapSize })
  }

  /** 仅改下一次提取的 bias；不修改当前已发布块。 */
  setBias(bias: number): void {
    this.updateSettings({ bias })
  }

  /** 三个相关投影参数一起验证、一起提交，失败保留整个旧快照。 */
  setExtent(halfExtent: number, near: number, far: number): void {
    this.updateSettings({ halfExtent, near, far })
  }

  /** 复制参考上方向；是否平行于具体视线在 view helper 中检查。 */
  setUp(up: Vec3Tuple): void {
    this.assertUsable()
    this.updateSettings({ up: copyShadowVector(this.label, 'up', up) })
  }

  /**
   * 撤销上一帧结果。未来 Pass 在生产前调用；后续失败必须中止整帧。
   * 全零矩阵不代表纹理不存在，也不保证 Backend 跳过 sampler 分配。
   */
  publishNoShadow(): void {
    this.assertChildrenUsable()
    this.blockValue.set('uLightViewProjection', { type: 'mat4', value: NO_SHADOW_MATRIX })
  }

  /**
   * 发布与已经成功绘制的目标匹配的矩阵和帧 bias；必须由生产者在 scope 退出后调用。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][directional-shadow-result-publication]
   * 先验证存活、revision、矩阵和 bias，然后写 bias，最后写矩阵。
   * 使用绘图时捕获的 bias/revision，而非此刻可能已被 GUI 修改的 settings。
   * revision 只防止发布到被 resize 的存储，不证明 draw 或 GPU 执行已成功。
   * 多次 block.set 不是事务；调用者必须先 publishNoShadow，并在任何异常时中止
   * 后续消费者。需要上一帧像素回滚时，应另行实现双缓冲，不能靠此方法保证。
   */
  publish(lightViewProjection: Mat4Tuple, bias: number, expectedTargetRevision: number): void {
    this.assertChildrenUsable()
    if (
      !Number.isSafeInteger(expectedTargetRevision) ||
      expectedTargetRevision !== this.targetValue.revision
    ) {
      throw new InvalidDirectionalShadowError(
        this.label,
        'targetRevision',
        'drawn target has changed'
      )
    }
    const matrix = copyDirectionalShadowMatrix(
      this.label,
      'lightViewProjection',
      lightViewProjection
    )
    const value = requireShadowBias(
      bias,
      (reason, details) => new InvalidDirectionalShadowError(this.label, 'bias', reason, details)
    )
    this.blockValue.set('uShadowBias', { type: 'float', value })
    this.blockValue.set('uLightViewProjection', { type: 'mat4', value: matrix })
  }

  /** 候选全部验证成功后才替换 settings，不修改 target 或 block。 */
  private updateSettings(patch: Partial<DirectionalShadowSettingsInput>): void {
    this.assertUsable()
    const next = copyDirectionalShadowSettings(this.label, { ...this.settingsValue, ...patch })
    this.settingsValue = next
  }

  /** 生命周期错误保持原类型，不包装成配置错误。 */
  private assertChildrenUsable(): void {
    this.assertUsable()
    this.targetValue.assertUsable()
    this.blockValue.assertUsable()
  }

  /**
   * 先断开块内借用，再释放目标；即使块清理抛错也尝试释放目标。
   * Resource 自身 listener 抛错仍可能阻止进入本方法，本批不改写该基类约定。
   */
  protected override disposeCPUData(): void {
    try {
      this.blockValue.dispose()
    } finally {
      this.targetValue.dispose()
    }
  }
}
