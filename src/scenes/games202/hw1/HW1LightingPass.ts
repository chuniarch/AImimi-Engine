import { ResourceDisposedError } from '@/rendering/core/errors'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'

/**
 * HW1 单方向光的共享输入。初始辐亮度为零，尚未提取灯时只显示环境项。
 * 这是场景 shader 的协议，不向通用 Backend 增加灯光专用字段。
 */
export function createHW1LightBlock(): ParameterBlock {
  return new ParameterBlock({
    label: 'HW1/sun/lighting',
    entries: {
      uDirectionToLightView: { type: 'vec3', value: [0, 0, 1] },
      uLightRadiance: { type: 'vec3', value: [0, 0, 0] }
    }
  })
}

/**
 * 把同一帧的太阳快照接到所有 HW1 接收者，随后由普通 ForwardPass 绘制。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-lighting-frame-snapshot]
 * normalMatrix 输出 view-space 法线，所以光方向也必须来自 directionToLightView。
 * 灯被移除/隐藏时写零辐亮度，不能留下上一帧的太阳。
 * castShadow=false 只关闭遮挡，不关闭灯光；这两个开关不能混为一谈。
 * 本 Pass 只借用 block，不保存 Light、不重新遍历 Scene，也不创建 GPU 对象。
 */
export class HW1LightingPass implements RenderPass {
  readonly name = 'HW1LightingPass'
  private disposed = false

  constructor(
    private readonly lightUUID: string,
    private readonly block: ParameterBlock
  ) {
    block.assertUsable()
  }

  /** Pipeline 同步执行完本方法后才允许接收者 draw；失败时由 Pipeline 中止消费者。 */
  execute(context: RenderPassContext): undefined {
    if (this.disposed) throw new ResourceDisposedError('HW1LightingPass')
    const light = context.lights.find((entry) => entry.uuid === this.lightUUID)
    this.block.set('uDirectionToLightView', {
      type: 'vec3',
      value: light?.directionToLightView ?? [0, 0, 1]
    })
    this.block.set('uLightRadiance', { type: 'vec3', value: light?.radiance ?? [0, 0, 0] })
    return undefined
  }

  /** block 的拥有者是 Scene；退出 Pass 不级联释放材质借用的数据。 */
  dispose(): void {
    this.disposed = true
  }
}
