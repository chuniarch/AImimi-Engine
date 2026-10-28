// 第 30 课的课程版代码（项目源码里没有）：第 1 版、第 2 版和第 1 版 Pipeline。
// 课程页上展示的就是这里的代码；frame-entry.ts 把它和真实的 src/rendering 打进同一个包。
import { mat4 } from 'gl-matrix'
import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { ViewState } from '@/rendering/frame/ViewState'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { Mesh } from '@/rendering/scene/Mesh'
import type { Scene } from '@/rendering/scene/Scene'
import type { Camera } from '@/rendering/scene/cameras/Camera'

/** 和 ForwardPass.ts:19–26 一样的入口：画到屏幕，先清成黑色、深度清成 1。 */
const SCREEN: RenderSurfaceScopeDescriptor = {
  surface: { kind: 'default-framebuffer' },
  clear: { color: [0, 0, 0, 1], depth: 1 }
}

/** 课程版偷懒：把 mat4 的 16 个分量抄进普通数组，不验证、不冻结。 */
function toTuple(m: mat4): Mat4Tuple {
  return Array.from(m) as unknown as Mat4Tuple
}

// ---------------- 第 1 版：边遍历边画 ----------------

/** 第 1 版的 Pass：和旧引擎一样，直接拿到 scene 和 camera。 */
export interface PassV1 {
  execute(scene: Scene, camera: Camera, backend: RenderBackend): void
}

/** 第 1 版的一帧：每个 Pass 自己去读场景。 */
export function renderFrameV1(
  passes: readonly PassV1[],
  scene: Scene,
  camera: Camera,
  backend: RenderBackend
): void {
  for (const pass of passes) pass.execute(scene, camera, backend)
}

/** 第 1 版的 ForwardPass：遇到一个 Mesh 就立刻 draw。 */
export class ForwardPassV1 implements PassV1 {
  execute(scene: Scene, camera: Camera, backend: RenderBackend): void {
    backend.withRenderSurface(SCREEN, () => {
      // 先清屏（scope 入口），再按树的顺序遍历
      scene.traverseVisible((node) => {
        if (!(node instanceof Mesh)) return

        // 每画一个 Mesh 都重读一次相机、求一次逆（旧引擎 BaseRenderer.ts:172–175 也是这样）
        const cameraWorld = mat4.create()
        camera.copyWorldMatrixTo(cameraWorld)
        const view = mat4.create()
        mat4.invert(view, cameraWorld)
        const projection = mat4.create()
        camera.copyProjectionMatrixTo(projection)

        const world = mat4.create()
        node.copyWorldMatrixTo(world)

        // node.geometry 是 getter，资源已释放时在这里抛错；这时前面的 Mesh 已经画了
        backend.draw({
          item: { geometry: node.geometry, material: node.material, worldMatrix: toTuple(world) },
          view: {
            viewMatrix: toTuple(view),
            projectionMatrix: toTuple(projection),
            cameraWorldPosition: [cameraWorld[12]!, cameraWorld[13]!, cameraWorld[14]!]
          }
        })
      })
      return undefined
    })
  }
}

// ---------------- 第 2 版：先提取，再画 ----------------

/** 第 2 版提取出来的一帧：一份相机值、两条队列。 */
export interface FrameV2 {
  readonly view: ViewState
  readonly background: RenderItem[]
  readonly opaque: RenderItem[]
}

/** 第 2 版的 Pass：只拿提取结果，不再碰 scene、camera。 */
export interface PassV2 {
  execute(frame: FrameV2, backend: RenderBackend): void
}

/** 读一遍场景，相机只算一次，按 material.queue 分成两队。 */
export function buildFrameV2(scene: Scene, camera: Camera): FrameV2 {
  const cameraWorld = mat4.create()
  camera.copyWorldMatrixTo(cameraWorld)
  const view = mat4.create() // create() 给的是单位矩阵
  mat4.invert(view, cameraWorld) // 不可逆时返回 null，view 原样不动
  const projection = mat4.create()
  camera.copyProjectionMatrixTo(projection)

  const frame: FrameV2 = {
    view: {
      viewMatrix: toTuple(view),
      projectionMatrix: toTuple(projection),
      cameraWorldPosition: [cameraWorld[12]!, cameraWorld[13]!, cameraWorld[14]!]
    },
    background: [],
    opaque: []
  }

  scene.traverseVisible((node) => {
    if (!(node instanceof Mesh)) return
    const world = mat4.create()
    node.copyWorldMatrixTo(world)
    // 资源已释放时 getter 在这里抛错：还没开始画，不会留下半帧
    const item: RenderItem = {
      geometry: node.geometry,
      material: node.material,
      worldMatrix: toTuple(world)
    }
    if (item.material.queue === 'background') frame.background.push(item)
    else frame.opaque.push(item)
  })

  return frame
}

/** 第 2 版的 ForwardPass：先 background，再 opaque。 */
export class ForwardPassV2 implements PassV2 {
  execute(frame: FrameV2, backend: RenderBackend): void {
    backend.withRenderSurface(SCREEN, () => {
      for (const item of frame.background) backend.draw({ item, view: frame.view })
      for (const item of frame.opaque) backend.draw({ item, view: frame.view })
      return undefined
    })
  }
}

/** 第 2 版的一帧：提取一次，所有 Pass 共用同一份结果。 */
export function renderFrameV2(
  passes: readonly PassV2[],
  scene: Scene,
  camera: Camera,
  backend: RenderBackend
): void {
  const frame = buildFrameV2(scene, camera)
  for (const pass of passes) pass.execute(frame, backend)
}

// ---------------- 第 1 版 Pipeline：一个数组 ----------------

/** 照旧引擎 WebGLRenderer.ts:31、:45–59、:219–226 的写法，换成新的 RenderPass 接口。 */
export class PipelineV1 {
  private passes: RenderPass[] = []

  addPass(pass: RenderPass): void {
    this.passes.push(pass)
  }

  removePass(pass: RenderPass): void {
    const index = this.passes.indexOf(pass)
    if (index > -1) {
      this.passes[index]!.dispose()
      this.passes.splice(index, 1)
    }
  }

  execute(context: RenderPassContext): void {
    for (const pass of this.passes) pass.execute(context)
  }

  dispose(): void {
    for (const pass of this.passes) pass.dispose()
    this.passes = []
  }
}
