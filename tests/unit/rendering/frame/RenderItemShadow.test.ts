import { describe, expect, it } from 'vitest'
import { InvalidRenderViewError } from '@/rendering/core/errors/InvalidRenderViewError'
import { RenderList } from '@/rendering/frame/RenderList'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import { createRenderFixture } from '../helpers/createRenderFixture'

describe('RenderItem shadow flag snapshot', () => {
  /** Given 普通 Mesh；When 初次提取；Then 不因安装阴影 Pass 自动成为投影者。 */
  it('Mesh 默认不投影，Builder 产出明确的 false', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()
    f.scene.add(mesh)
    expect(mesh.castShadow).toBe(false)
    expect(new RenderListBuilder().build(f.view).renderList.opaque[0]!.castShadow).toBe(false)
  })

  /** 同一 Mesh 下一帧可切换；旧 item 不能反查 Mesh 取得新开关。 */
  it('Builder 与 RenderList 都保留 castShadow，旧帧不随 Mesh 改变', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()
    mesh.castShadow = true
    f.scene.add(mesh)
    const builder = new RenderListBuilder()
    const first = builder.build(f.view).renderList.opaque[0]!
    mesh.castShadow = false
    expect(first.castShadow).toBe(true)
    expect(Object.isFrozen(first)).toBe(true)
    expect(builder.build(f.view).renderList.opaque[0]!.castShadow).toBe(false)
  })

  /** RenderList 可独立构造，必须复制标量，不能只依赖 Builder 已经冻结。 */
  it('独立 RenderList 不丢失开关且不借用可变输入包装', () => {
    const f = createRenderFixture()
    const mesh = f.mesh()
    const item = {
      geometry: f.geometry,
      material: mesh.material,
      worldMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const,
      castShadow: true
    }
    const list = new RenderList([], [item])
    item.castShadow = false
    expect(list.opaque[0]!.castShadow).toBe(true)
    expect(list.opaque[0]!.geometry).toBe(f.geometry)
  })

  /** JS 调用者可以绕过 TS；不把 undefined/1/'true' 悄悄解释成投影开关。 */
  it.each([undefined, null, 1, 'true'])('拒绝非 boolean 的 item.castShadow %s', (castShadow) => {
    const f = createRenderFixture()
    const item = {
      geometry: f.geometry,
      material: f.mesh().material,
      worldMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      castShadow
    } as unknown as RenderItem
    expect(() => new RenderList([], [item])).toThrow(InvalidRenderViewError)
  })
})
