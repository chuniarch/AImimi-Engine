import type { Resource } from '@/rendering/core/Resource'
import { ResourceDisposedError, UnsupportedRenderFeatureError } from '@/rendering/core/errors'
import { InvalidDeferredLightingError } from '@/rendering/core/errors/InvalidDeferredLightingError'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import vertexSource from '@/shaders/deferred/lambertLighting/vertex.vert?raw'
import fragmentSource from '@/shaders/deferred/lambertLighting/fragment.frag?raw'
import { GBufferPass } from '@/rendering/passes/GBufferPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'

/** 全屏顶点已经处于 clip space；此矩阵只补全通用 RenderItem 契约。 */
const IDENTITY: Mat4Tuple = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

/**
 * 消费本帧 GBuffer 与零/一盏方向光，将 Lambert 结果显示到默认 framebuffer。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][deferred-lambert-display-encoding]
 * 顺序：取得完成输出 → 验证灯光数量 → 更新自有材质 → 默认输出 scope → 一次 draw。
 * 光照在观察空间和线性 RGB 中计算，最后只执行一次精确 sRGB 显示编码。
 * 此版本明确采用无阴影 Lambert；不读取 shadow 资源或宣称支持 PBR/HDR 显示。
 * Pipeline 应按 GBufferPass → 本 Pass 登记；每帧传入同一个 context 对象。
 */
export class DeferredLightingPass implements RenderPass {
  public readonly name: string = 'DeferredLightingPass'
  private producer: GBufferPass | null
  private readonly material: Material
  private readonly item: RenderItem

  /** 成功释放后才移除首项；保留清理失败时尚未处理的资源。 */
  private readonly owned: Resource[]
  private state: 'active' | 'closing' | 'disposed' = 'active'
  private busy = false

  /**
   * 创建全屏绘制的 CPU 资源，GPU 分配仍由第一次 Backend.draw 触发。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][deferred-owned-fullscreen-resources]
   * 借用 producer 及其附件；只拥有本构造器创建的 Geometry、ShaderModule 和 Material。
   * 全屏三角形 (-1,-1)、(3,-1)、(-1,3) 覆盖可见方形，不需要索引或第二个三角形。
   *
   * @param producer - 已创建且存活的 GBuffer 生产者，不转移它的所有权。
   */
  constructor(producer: GBufferPass) {
    if (!(producer instanceof GBufferPass)) {
      throw new InvalidDeferredLightingError('producer', 'must reference a GBufferPass')
    }
    producer.target.assertUsable()
    this.producer = producer
    const geometry = new Geometry({
      attributes: {
        [VertexAttributeSemantic.Position]: new VertexAttribute({
          data: new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
          itemSize: 3
        })
      }
    })
    const shader = new ShaderModule({
      name: 'DeferredLighting/Lambert',
      language: 'glsl-es-100',
      vertexSource,
      fragmentSource
    })
    this.material = new Material({
      shaderModule: shader,
      state: { depthTest: false, depthWrite: false, cullMode: 'none', dither: false }
    })
    this.item = Object.freeze({
      geometry,
      material: this.material,
      worldMatrix: IDENTITY,
      castShadow: false
    })
    this.owned = [this.material, geometry, shader]
  }

  /**
   * 读取不可变帧数据，不重新遍历 Scene，也不修改表面材质或 Light 对象。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][gbuffer-producer-before-consumer]
   * getOutput 验证同一个 context、当前 revision 和设备可用性。
   * 进入 scope 后再检查一次，拒绝入口同步回调导致的生产记录失效。
   * 附件只以逻辑地址交给 Material，GPU handle 由 Backend 在 draw 时解析。
   *
   * 零灯光也要覆盖 uRadiance，避免残留上一帧光照；不能静默忽略第二盏灯。
   * 光方向与辐射参数已由帧提取验证，Material setter 再执行通用数值检查。
   * 出错时不回滚像素；finally 解除 busy，允许下一帧完整重画。
   */
  execute(context: RenderPassContext): undefined {
    if (this.state !== 'active') throw new ResourceDisposedError(this.name)
    this.assertIdle('execute')
    this.busy = true
    try {
      const producer = this.producer!
      const output = producer.getOutput(context)
      if (context.lights.length > 1) {
        throw new UnsupportedRenderFeatureError(
          'deferred directional lights',
          'Lambert baseline supports at most one visible light'
        )
      }
      const light = context.lights[0]
      if (light !== undefined && light.type !== 'directional') {
        throw new UnsupportedRenderFeatureError('deferred light type', 'requires directional')
      }
      this.material.setParameter('uBaseColor', { type: 'texture2D', value: output.baseColorLinear })
      this.material.setParameter('uNormal', { type: 'texture2D', value: output.normalView })
      this.material.setParameter('uDirectionToLightView', {
        type: 'vec3',
        value: light?.directionToLightView ?? [0, 0, 1]
      })
      this.material.setParameter('uRadiance', {
        type: 'vec3',
        value: light?.radiance ?? [0, 0, 0]
      })
      context.backend.withRenderSurface(
        {
          surface: { kind: 'default-framebuffer' },
          clear: { color: [0, 0, 0, 1] }
        },
        () => {
          producer.getOutput(context)
          context.backend.draw({ item: this.item, view: context.view })
          return undefined
        }
      )
    } finally {
      this.busy = false
    }
  }

  /** 保护当前提交中的材质和资源，禁止同步重入执行或清理。 */
  private assertIdle(operation: string): void {
    if (this.busy) throw new InvalidDeferredLightingError(operation, 'must not re-enter')
  }

  /**
   * 释放自有资源并解除 producer 引用；可以在 GBuffer 目标已经释放后调用。
   *
   * @remarks
   * [DESIGN-WEIGHT:2][deferred-owned-fullscreen-resources]
   * 不读取材质里的附件参数，也不释放借用目标。清理开始后禁止再次 execute。
   * 失败保留当前项和后续项，调用者可以显式重试 dispose；成功项不重复处理。
   * 单个 Resource 的 listener 抛错语义沿用现有基类，不在此补偿或吞掉错误。
   */
  dispose(): void {
    if (this.state === 'disposed') return
    this.assertIdle('dispose')
    this.state = 'closing'
    this.busy = true
    this.producer = null
    try {
      while (this.owned.length > 0) {
        this.owned[0]!.dispose()
        this.owned.shift()
      }
      this.state = 'disposed'
    } finally {
      this.busy = false
    }
  }
}
