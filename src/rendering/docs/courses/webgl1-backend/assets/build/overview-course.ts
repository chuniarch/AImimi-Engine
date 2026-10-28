// 第 31 课的课程版代码（项目源码里没有）：故意写得不完整的第 1 版、第 2 版，以及去掉某一处复制或冻结的变体。
// 课程页上展示的就是这里的代码；overview-entry.ts 把它和真实的 src/rendering 打进同一个包。
import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { FrameSnapshot } from '@/rendering/frame/FrameSnapshot'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import { RenderList } from '@/rendering/frame/RenderList'
import { RenderListBuilder, type RenderListBuildResult } from '@/rendering/frame/RenderListBuilder'
import type { RenderView } from '@/rendering/frame/RenderView'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import type { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Geometry } from '@/rendering/resources/Geometry'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Mesh } from '@/rendering/scene/Mesh'
import type { Scene } from '@/rendering/scene/Scene'

// ---------------- 第 3 节：第 1 版，每帧现建现画 ----------------

/** 第 1 版的「物体」：顶点、索引、颜色、往右挪多少，全都直接放在一个普通对象里。 */
export interface MeshDataV1 {
  readonly positions: Float32Array
  readonly indices: Uint16Array
  readonly color: readonly [number, number, number]
  readonly offsetX: number
}

const VERTEX_SOURCE = `attribute vec2 position;
uniform float uOffsetX;
void main() { gl_Position = vec4(position.x + uOffsetX, position.y, 0.0, 1.0); }`

const FRAGMENT_SOURCE = `precision mediump float;
uniform vec3 uColor;
void main() { gl_FragColor = vec4(uColor, 1.0); }`

/** 编译、链接一个 program；第 1 版和第 2 版共用。不检查编译错误（课程版偷懒）。 */
function createProgramV1(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram()!
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX_SOURCE],
    [gl.FRAGMENT_SHADER, FRAGMENT_SOURCE]
  ] as const) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
  }
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)
  return program
}

/** 把一个物体的顶点和索引上传成两个 buffer。 */
function uploadV1(gl: WebGLRenderingContext, mesh: MeshDataV1) {
  const positionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW)
  const indexBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
  return { positionBuffer, indexBuffer, count: mesh.indices.length }
}

/** 画一个物体：program 和 buffer 已经准备好。 */
function drawOneV1(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  buffers: ReturnType<typeof uploadV1>,
  mesh: MeshDataV1
): void {
  gl.useProgram(program)
  gl.uniform1f(gl.getUniformLocation(program, 'uOffsetX'), mesh.offsetX)
  gl.uniform3fv(gl.getUniformLocation(program, 'uColor'), mesh.color)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer)
  gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0)
}

/** 第 1 版：每一帧都重新编译 program、重新上传每个物体的 buffer，然后画。 */
export function drawFrameV1(gl: WebGLRenderingContext, meshes: readonly MeshDataV1[]): void {
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  const program = createProgramV1(gl) // 每帧一次
  for (const mesh of meshes) {
    const buffers = uploadV1(gl, mesh) // 每帧、每个物体一次
    drawOneV1(gl, program, buffers, mesh)
  }
}

// ---------------- 第 3 节：第 2 版，按物体缓存 ----------------

/**
 * 第 2 版：一个 context 一个 DrawerV2。program 只编译一次；
 * buffer 用「物体对象本身」当 key 缓存，第一次见到才上传。
 */
export class DrawerV2 {
  private readonly gl: WebGLRenderingContext
  private program: WebGLProgram | null = null
  private readonly buffers = new Map<MeshDataV1, ReturnType<typeof uploadV1>>()

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
  }

  drawFrame(meshes: readonly MeshDataV1[]): void {
    const gl = this.gl
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.program ??= createProgramV1(gl) // 只在第一帧编译

    for (const mesh of meshes) {
      let buffers = this.buffers.get(mesh)
      if (buffers === undefined) {
        buffers = uploadV1(gl, mesh) // 这个 context 第一次见到这个物体
        this.buffers.set(mesh, buffers)
      }
      drawOneV1(gl, this.program, buffers, mesh)
    }
  }
}

/**
 * 第 2 版的「构造时校验」：检查每个索引都小于顶点数，然后把调用者的数组原样存下（不复制）。
 * 和 Geometry 构造函数做同样的检查（Geometry.ts:227–240），只是少了复制那一步。
 */
export function createMeshDataV2(options: {
  readonly positions: Float32Array
  readonly indices: Uint16Array
  readonly color: readonly [number, number, number]
}): MeshDataV1 {
  const vertexCount = options.positions.length / 2
  for (const index of options.indices) {
    if (index >= vertexCount) throw new Error('index ' + index + ' is outside vertex count ' + vertexCount)
  }
  return { positions: options.positions, indices: options.indices, color: options.color, offsetX: 0 }
}

// ---------------- 第 6 节：去掉某一处复制或冻结 ----------------

/**
 * 提取的第 1 版：和 RenderListBuilder.ts:97–119 的遍历一样，
 * 只是把 copyMat4Snapshot(scratch, …) 换成了 scratch 本身。
 */
export function extractItemsV1(scene: Scene): RenderItem[] {
  scene.updateWorldMatrix()
  const items: RenderItem[] = []
  const scratch = new Float32Array(16) // 整次遍历共用这一块临时存储

  scene.traverseVisible((node) => {
    if (!(node instanceof Mesh)) return
    node.copyWorldMatrixTo(scratch)
    items.push({
      geometry: node.geometry,
      material: node.material,
      worldMatrix: scratch as unknown as Mat4Tuple // 少了复制：每个 item 拿到的是同一块 scratch
    })
  })

  return items
}

/** 包一层真实 Builder，把冻结的两条队列换成普通数组：只去掉「冻结」这一件事。 */
export class UnfrozenBuilderV1 {
  private readonly real = new RenderListBuilder()

  build(view: RenderView): RenderListBuildResult {
    const result = this.real.build(view)
    return {
      viewState: result.viewState,
      renderList: {
        background: [...result.renderList.background],
        opaque: [...result.renderList.opaque]
      } as RenderList
    }
  }
}

/**
 * 一个阴影 Pass 的开头：按离灯远近给物体排序，好让近处的先画（省略真正的阴影绘制）。
 * 它在原数组上 sort。去掉 as 的话，TypeScript 会报错：readonly 数组没有 sort。
 */
export class SortByLightPassV1 implements RenderPass {
  readonly name = 'SortByLightPassV1'
  private readonly lightX: number

  constructor(lightX: number) {
    this.lightX = lightX
  }

  execute(context: RenderPassContext): undefined {
    const distance = (item: RenderItem) => Math.abs(item.worldMatrix[12] - this.lightX)
    ;(context.renderList.opaque as RenderItem[]).sort((a, b) => distance(a) - distance(b))
    return undefined
  }

  dispose(): void {}
}

/** 同一个排序，先复制一份自己的数组再排：这是阴影 Pass 正确的写法。 */
export class SortCopyByLightPass implements RenderPass {
  readonly name = 'SortCopyByLightPass'
  private readonly lightX: number
  sorted: readonly RenderItem[] = []

  constructor(lightX: number) {
    this.lightX = lightX
  }

  execute(context: RenderPassContext): undefined {
    const distance = (item: RenderItem) => Math.abs(item.worldMatrix[12] - this.lightX)
    this.sorted = [...context.renderList.opaque].sort((a, b) => distance(a) - distance(b))
    return undefined
  }

  dispose(): void {}
}

/** 一个「暂停」Pass：想让后面的 Pass 以为这一帧没有经过时间。 */
export class PausePassV1 implements RenderPass {
  readonly name = 'PausePassV1'

  execute(context: RenderPassContext): undefined {
    ;(context.frame as { deltaSeconds: number }).deltaSeconds = 0
    return undefined
  }

  dispose(): void {}
}

/** 记下每次执行时看到的 deltaSeconds。 */
export class ReadDeltaPass implements RenderPass {
  readonly name = 'ReadDeltaPass'
  readonly seen: number[] = []

  execute(context: RenderPassContext): undefined {
    this.seen.push(context.frame.deltaSeconds)
    return undefined
  }

  dispose(): void {}
}

/** Renderer.render 的第 1 版之一：只冻结、不复制——直接冻结 Engine 交来的对象。 */
export function renderFreezeOnlyV1(
  view: RenderView,
  builder: RenderListBuilder,
  pipeline: RenderPipeline,
  backend: RenderBackend
): void {
  const frame: FrameSnapshot = Object.freeze(view.frame)
  const { renderList, viewState } = builder.build(view)
  pipeline.execute(Object.freeze({ frame, view: viewState, renderList, backend }))
}

/** Renderer.render 的第 1 版之二：只复制、不冻结。 */
export function renderCopyOnlyV1(
  view: RenderView,
  builder: RenderListBuilder,
  pipeline: RenderPipeline,
  backend: RenderBackend
): void {
  const frame: FrameSnapshot = { ...view.frame }
  const { renderList, viewState } = builder.build(view)
  pipeline.execute(Object.freeze({ frame, view: viewState, renderList, backend }))
}

/** 「复制得更彻底」：把 Geometry 也深复制一份（顶点、索引都抄一遍）。 */
export function cloneGeometryV1(geometry: Geometry): Geometry {
  const attributes: Record<string, VertexAttribute> = {}
  for (const name of geometry.getAttributeNames()) {
    const attribute = geometry.getAttribute(name)!
    attributes[name] = new VertexAttribute({
      data: attribute.copyData(),
      itemSize: attribute.itemSize,
      normalized: attribute.normalized
    })
  }
  const indices = geometry.copyIndices()
  return new Geometry({ attributes, topology: geometry.topology, ...(indices === null ? {} : { indices }) })
}

/** 包一层真实 Builder：每帧把每个 item 的 Geometry 换成深复制的新对象。 */
export class CloningBuilderV1 {
  private readonly real = new RenderListBuilder()

  build(view: RenderView): RenderListBuildResult {
    const result = this.real.build(view)
    const clone = (item: RenderItem): RenderItem => ({ ...item, geometry: cloneGeometryV1(item.geometry) })
    return {
      viewState: result.viewState,
      renderList: new RenderList(result.renderList.background.map(clone), result.renderList.opaque.map(clone))
    }
  }
}

/** Material 的第 1 版：参数原样存下调用者给的对象和数组，不复制。 */
export class MaterialV1 {
  private readonly parameters = new Map<string, { readonly type: 'vec3'; readonly value: number[] }>()

  constructor(parameters: Record<string, { readonly type: 'vec3'; readonly value: number[] }>) {
    for (const [name, parameter] of Object.entries(parameters)) {
      if (!parameter.value.every(Number.isFinite)) throw new Error(name + ' must be finite')
      this.parameters.set(name, parameter) // 校验过，但存的是调用者手里那个数组
    }
  }

  getParameter(name: string) {
    return this.parameters.get(name)
  }
}
