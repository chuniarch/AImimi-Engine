import {
  CleanupFailureError,
  InvalidDirectionalShadowError,
  ResourceDisposedError
} from '@/rendering/core/errors'
import { assertNonArrayObject } from '@/rendering/core/validation'
import type { DirectionalShadowSnapshot } from '@/rendering/frame/LightFrameSnapshot'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { DirectionalLightShadow } from '@/rendering/shadows/DirectionalLightShadow'
import {
  createDirectionalShadowView,
  type DirectionalShadowView
} from '@/rendering/shadows/createDirectionalShadowView'
import type { RenderPass } from './RenderPass'
import type { RenderPassContext } from './RenderPassContext'

/** 借用已经创建的打包深度 ShaderModule，不转移其释放责任。 */
export interface ShadowMapPassOptions {
  readonly depthShader: ShaderModule
}

/** 全部视图先准备成功，再开始修改任何阴影目标的像素。 */
interface ShadowJob {
  readonly snapshot: DirectionalShadowSnapshot
  readonly result: DirectionalShadowView
}

/** 不解析 GLSL；验证 CPU 资源、语言及深度绘制必需的矩阵绑定。 */
function requireDepthShader(value: unknown): ShaderModule {
  if (!(value instanceof ShaderModule)) {
    throw new InvalidDirectionalShadowError(
      'ShadowMapPass',
      'depthShader',
      'must reference a ShaderModule'
    )
  }
  value.assertUsable()
  if (value.language !== 'glsl-es-100') {
    throw new InvalidDirectionalShadowError(
      'ShadowMapPass',
      'depthShader.language',
      'must be glsl-es-100'
    )
  }
  for (const semantic of ['modelMatrix', 'viewMatrix', 'projectionMatrix'] as const) {
    if (value.builtInUniforms[semantic] === undefined) {
      throw new InvalidDirectionalShadowError(
        'ShadowMapPass',
        'depthShader.builtInUniforms.' + semantic,
        'is required'
      )
    }
  }
  return value
}

/**
 * 在接收者绘制之前，从灯光视点生产 RGBA 打包的方向光深度图。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][shadow-pass-produce-before-publish]
 * 只读 RenderPassContext 的帧快照，不读取 Scene、Light 或可变 settings。
 * 同一投影者仍借用原 Geometry/worldMatrix，仅替换深度 Material 和光源 ViewState。
 * 不把模型矩阵写入共享 Material，不需要单次 draw 参数覆盖。
 *
 * [DESIGN-WEIGHT:3][shadow-pass-borrowed-resources]
 * 本 Pass 只拥有 depthMaterial；depthShader、阴影资源及其 target/block 都是借用。
 * 调用者必须提供与接收者解码规则一致的 shader；推荐使用
 * createPackedDepthShaderModule。这里不会根据源码文本证明打包算法正确。
 *
 * 消费者必须排在同一次 Pipeline 执行的后面。任一异常都交给 Pipeline 中止后续
 * Pass，不支持缓存旧 context 后单独重放消费者，也不保证失败时恢复上一帧像素。
 */
export class ShadowMapPass implements RenderPass {
  public readonly name = 'ShadowMapPass'
  private readonly depthMaterial: Material
  private state: 'active' | 'closing' | 'disposed' = 'active'
  private busy = false

  /**
   * 上次涉及的借用身份，用来撤销“灯被隐藏/移除”后遗留的结果。
   * 正常下一帧撤销后就丢弃消失的引用；失败时保留待撤销身份，供下次重试。
   * Set 不 retain 资源，也不保存完整 Light 或帧快照。
   */
  private previousShadows = new Set<DirectionalLightShadow>()

  constructor(options: ShadowMapPassOptions) {
    assertNonArrayObject(
      options,
      () => new InvalidDirectionalShadowError(this.name, 'options', 'must be a non-array object')
    )
    const shaderModule = requireDepthShader(options.depthShader)
    this.depthMaterial = new Material({
      shaderModule,
      queue: 'opaque',
      state: {
        depthTest: true,
        depthWrite: true,
        depthFunction: 'less',
        cullMode: 'back',
        dither: false
      }
    })
  }

  /**
   * 撤销 → 验证/计算全部视图 → resize → clear/draw → 恢复输出 → 发布。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][shadow-pass-publication-failure-boundary]
   * 单张图成功后立即发布；若后续另一盏灯失败，前一盏可能已经发布，但 Pipeline
   * 必须中止消费者。这不是多灯原子事务，更不是像素回滚。
   * “成功”只表示同步提交与 scope 恢复成功，不表示 CPU 等待 GPU 完成。
   */
  execute(context: RenderPassContext): undefined {
    if (this.state !== 'active') throw new ResourceDisposedError(this.name)
    this.assertNotBusy('execute')
    this.busy = true
    try {
      this.invalidateResults(context)
      const epoch = this.assertBackendEpoch(context)
      this.depthMaterial.shaderModule.assertUsable()
      const jobs = this.prepareJobs(context)
      const casters = context.renderList.opaque.filter((item) => item.castShadow)

      for (const { snapshot, result } of jobs) {
        const shadow = snapshot.resource
        const target = shadow.target
        // 读取本帧 mapSize，而不是 GUI 可能已经改变的 shadow.settings.mapSize。
        // resize 必须发生在进入输出 scope 之前。
        shadow.prepareSize(snapshot.mapSize)
        this.assertBackendEpoch(context, epoch)
        const revision = target.revision
        context.backend.withRenderSurface(
          {
            surface: { kind: 'render-target', target },
            clear: { color: [1, 1, 1, 1], depth: 1 }
          },
          () => {
            for (const item of casters) {
              context.backend.draw({
                item: { ...item, material: this.depthMaterial },
                view: result.view
              })
            }
            return undefined
          }
        )

        // withRenderSurface 返回才代表恢复成功；draw 完成还不够。
        shadow.assertUsable()
        target.assertUsable()
        this.assertBackendEpoch(context, epoch)
        if (target.revision !== revision) {
          throw new InvalidDirectionalShadowError(
            shadow.label,
            'targetRevision',
            'target changed during production'
          )
        }
        shadow.publish(result.lightViewProjection, snapshot.bias, revision, {
          context,
          snapshot,
          epoch
        })
      }
      return undefined
    } finally {
      // 不吞掉绘制/发布错误；这里只解除同步重入锁，允许处理原因后重新尝试下一帧。
      this.busy = false
    }
  }

  /**
   * 全零矩阵撤销旧可用结果；它不删除纹理，也不代表 sampler 一定不会分配。
   * 先保存待撤销集合，再逐一写块，避免某次写失败后忘记尚待撤销的资源。
   */
  private invalidateResults(context: RenderPassContext): void {
    const current = new Set<DirectionalLightShadow>()
    for (const light of context.lights) {
      if (light.shadow !== null) current.add(light.shadow.resource)
    }
    this.previousShadows = new Set([...this.previousShadows, ...current])
    for (const shadow of this.previousShadows) {
      if (shadow instanceof DirectionalLightShadow && !shadow.disposed) shadow.publishNoShadow()
    }
    this.previousShadows = current
  }

  /** 共享同一目标的两盏可见灯没有唯一生产者，因此必须在任何 draw 之前拒绝。 */
  private prepareJobs(context: RenderPassContext): ShadowJob[] {
    const seen = new Set<DirectionalLightShadow>()
    const jobs: ShadowJob[] = []
    for (const light of context.lights) {
      const snapshot = light.shadow
      if (snapshot === null) {
        if (light.castShadow) {
          throw new InvalidDirectionalShadowError(light.debugLabel, 'shadow', 'is required')
        }
        continue
      }
      const shadow = snapshot.resource
      if (!(shadow instanceof DirectionalLightShadow)) {
        throw new InvalidDirectionalShadowError(light.debugLabel, 'shadow', 'invalid resource')
      }
      shadow.assertUsable()
      if (seen.has(shadow)) {
        throw new InvalidDirectionalShadowError(
          shadow.label,
          'shadow',
          'cannot serve two visible lights in one frame'
        )
      }
      seen.add(shadow)
      if (!light.castShadow) continue
      jobs.push({
        snapshot,
        result: createDirectionalShadowView({
          label: shadow.label,
          positionWorld: light.positionWorld,
          targetWorld: light.targetWorld,
          settings: snapshot
        })
      })
    }
    return jobs
  }

  /** ready=false 可能表示 lost 或关闭；不在此猜原因，也不发布成功结果。 */
  private assertBackendEpoch(context: RenderPassContext, expected?: object): object {
    const epoch = context.backend.resourceEpoch
    if (
      !context.backend.ready ||
      epoch === null ||
      (expected !== undefined && expected !== epoch)
    ) {
      throw new InvalidDirectionalShadowError(
        this.name,
        'backend',
        'is unavailable or changed during production'
      )
    }
    return epoch
  }

  /**
   * 仅释放自有 Material；不释放 shader/target/block，也不继续改写借用的结果。
   * 清理失败后禁止 execute，只允许显式重试 dispose。
   * [DESIGN-WEIGHT:3][cleanup-reentry]
   * Material 禁止使用不代表清理完成；失败后仍保留自有 Material 供下次显式重试。
   */
  dispose(): void {
    if (this.state === 'disposed') return
    this.assertNotBusy('dispose')
    this.state = 'closing'
    this.busy = true
    try {
      this.depthMaterial.dispose()
      if (this.depthMaterial.cleanupState !== 'complete') {
        throw new CleanupFailureError(this.name, [
          {
            phase: 'owner-child',
            label: 'depthMaterial',
            cause: new Error('Material cleanup is still ' + this.depthMaterial.cleanupState)
          }
        ])
      }
      this.previousShadows.clear()
      this.state = 'disposed'
    } finally {
      this.busy = false
    }
  }

  /** 同步回调不能再次生产或拆除正在使用的深度材质。 */
  private assertNotBusy(operation: string): void {
    if (this.busy) {
      throw new InvalidDirectionalShadowError(this.name, operation, 'operation in progress')
    }
  }
}
