// 第 22 课的课程版代码（项目源码里没有）。review-entry.ts 把它和真实的 src/rendering 打进同一个包。
//
// 这一课拿仿真可视化的需求审 src/rendering。实验都跑真实的 Renderer、WebGL1Backend 和资源类，
// 课程只写三类东西：
// - 需求本身：FakeParticles（让位置每帧变，不是 FLIP）、一张「散度」场、一个累加用的 Pass；
// - 记账：recordGL（第 47 课写的，从 draw-course.ts 借来）和 tally；
// - 引擎没有、却又想看清楚的东西：读 RenderTarget 里的浮点数、把扩展藏起来模拟别的设备、
//   直接用原生 GL 写一个「同一个 buffer 每帧改内容」的对照。它们都标明是课程写的。
import { recordGL, type GLCall, type GLRecorder } from './draw-course'
import { Renderer } from '@/rendering/Renderer'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderView } from '@/rendering/frame/RenderView'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import type { TextureFormat, TextureWrapMode } from '@/rendering/resources/Texture'
import { DataTexture2D } from '@/rendering/resources/Texture2D'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

export { recordGL }
export type { GLCall, GLRecorder }

// ---------------- 记账 ----------------

export interface Tally {
  readonly commands: number
  readonly queries: number
  /** isContextLost 只读 context 上的一个标志，单独数（同第 39、47 课） */
  readonly lost: number
  readonly byName: Readonly<Record<string, number>>
}

/** 按名字数一段调用。扩展上的方法带前缀，例如 vertex_array_object.createVertexArrayOES。 */
export function tally(calls: readonly GLCall[]): Tally {
  const byName: Record<string, number> = {}
  let commands = 0
  let queries = 0
  let lost = 0
  for (const call of calls) {
    byName[call.name] = (byName[call.name] ?? 0) + 1
    if (call.kind === 'command') commands += 1
    else if (call.kind === 'query') queries += 1
    else lost += 1
  }
  return { commands, queries, lost, byName }
}

/** 错误只留类名和信息，方便页面显示。 */
export interface ErrorInfo {
  readonly name: string
  readonly message: string
}

function info(error: unknown): ErrorInfo {
  if (error instanceof Error) return { name: error.name, message: error.message }
  return { name: typeof error, message: String(error) }
}

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// ---------------- 一套真实的引擎：canvas、context、Backend、Renderer ----------------

export interface Rig {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGLRenderingContext
  readonly recorder: GLRecorder
  readonly backend: WebGL1Backend
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  readonly renderer: Renderer
  /** 画一帧；错误不往外抛，交回来 */
  render(): Error | null
  /** 释放引擎，再让浏览器收回这个 context（浏览器同时能开的 context 有上限） */
  close(): void
}

export interface RigOptions {
  readonly width?: number
  readonly height?: number
  /**
   * 课程写的：Backend 查这些扩展时假装没有，用来模拟别的设备。
   * 例如藏起 OES_vertex_array_object，Backend 就会改走 Manual 顶点输入。
   */
  readonly hide?: readonly string[]
  /** 排在 ForwardPass 前面的 Pass */
  readonly before?: readonly RenderPass[]
  /** 不要 ForwardPass（只看离屏的 Pass） */
  readonly withoutForward?: boolean
}

export function openRig(options: RigOptions = {}): Rig {
  const canvas = document.createElement('canvas')
  canvas.width = options.width ?? 320
  canvas.height = options.height ?? 240
  // 先拿到 context 套上记账，再交给 Backend（同第 47 课）；属性要和 Backend 要的一样，才是同一个 context
  const gl = canvas.getContext('webgl', { alpha: false, depth: true })
  if (gl === null) throw new Error('这个浏览器拿不到 WebGL context')
  const recorder = recordGL(gl)
  const hide = options.hide ?? []
  if (hide.length > 0) {
    const getExtension = gl.getExtension.bind(gl) as (name: string) => unknown
    ;(gl as unknown as { getExtension(name: string): unknown }).getExtension = (name: string) =>
      hide.includes(name) ? null : getExtension(name)
  }
  const backend = new WebGL1Backend(canvas, 'lesson22')
  const pipeline = new RenderPipeline()
  for (const pass of options.before ?? []) pipeline.addPass(pass)
  if (!options.withoutForward) pipeline.addPass(new ForwardPass())
  const renderer = new Renderer(backend, pipeline, new RenderListBuilder())
  const scene = new Scene()
  const camera = new PerspectiveCamera({ fovY: Math.PI / 4, aspect: canvas.width / canvas.height, near: 0.1, far: 50 })
  camera.transform.setPosition([0, 0.7, 3.1])
  camera.transform.setRotation([-Math.atan2(0.15, 3.1), 0, 0]) // 看向 (0, 0.55, 0)：粒子落下、散开的那一块

  let frameNumber = 0
  return {
    canvas,
    gl,
    recorder,
    backend,
    scene,
    camera,
    renderer,
    render() {
      frameNumber += 1
      const view: RenderView = {
        scene,
        camera,
        frame: {
          frameNumber,
          timeSeconds: frameNumber / 60,
          deltaSeconds: 1 / 60,
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          pixelRatio: 1
        }
      }
      try {
        renderer.render(view)
        return null
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error))
      }
    },
    close() {
      try {
        renderer.dispose()
      } catch {
        /* 课程实验结束时尽力释放 */
      }
      try {
        scene.dispose()
      } catch {
        /* 同上 */
      }
      const lose = gl.getExtension('WEBGL_lose_context')
      if (lose !== null && !gl.isContextLost()) lose.loseContext()
    }
  }
}

/** 把 WebGL canvas 当前的画面抄到一张 2D canvas 上（WebGL canvas 关掉以后还能看）。要在画完的同一个任务里调用。 */
export function snapshot(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement('canvas')
  copy.width = source.width
  copy.height = source.height
  copy.getContext('2d')?.drawImage(source, 0, 0)
  return copy
}

/** 读默认 framebuffer 上一个像素（左下角为原点）。要在画完的同一个任务里调用。 */
export function readCanvasPixel(gl: WebGLRenderingContext, x: number, y: number): number[] {
  const out = new Uint8Array(4)
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out)
  return Array.from(out)
}

// ---------------- 需求一：粒子每帧换位置 ----------------

/**
 * 课程写的「粒子」：不是 FLIP。count 个点从左边一块落下、在地面和墙上反弹，
 * 只为了让位置每帧都变。随机数用固定种子，每次运行一样。
 */
export class FakeParticles {
  readonly count: number
  private readonly p: Float32Array
  private readonly v: Float32Array

  constructor(count: number, seed = 1) {
    this.count = count
    this.p = new Float32Array(count * 3)
    this.v = new Float32Array(count * 3)
    let s = seed >>> 0
    const random = (): number => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
    for (let i = 0; i < count; i += 1) {
      this.p[i * 3] = -1.4 + random()
      this.p[i * 3 + 1] = 0.05 + random() * 1.2
      this.p[i * 3 + 2] = -0.5 + random()
    }
  }

  step(dt = 1 / 60): void {
    const { p, v } = this
    for (let i = 0; i < this.count; i += 1) {
      const x = i * 3
      v[x + 1]! -= 4 * dt
      for (let k = 0; k < 3; k += 1) p[x + k]! += v[x + k]! * dt
      if (p[x + 1]! < 0) {
        p[x + 1] = -p[x + 1]!
        v[x + 1] = -v[x + 1]! * 0.6
        v[x]! += 0.8 * dt * 60 * 0.02 // 落地以后往右散开一点，像溃坝
      }
      if (p[x]! > 1.4 || p[x]! < -1.4) v[x] = -v[x]! * 0.8
      p[x] = Math.max(-1.4, Math.min(1.4, p[x]!))
    }
  }

  /** 现在的引擎没有 points（Geometry.ts:16–20）：每个粒子只能画成一个小三角形，3 个顶点。 */
  triangles(size = 0.012): Float32Array {
    const out = new Float32Array(this.count * 9)
    for (let i = 0; i < this.count; i += 1) {
      const x = this.p[i * 3]!
      const y = this.p[i * 3 + 1]!
      const z = this.p[i * 3 + 2]!
      out.set([x - size, y - size, z, x + size, y - size, z, x, y + size, z], i * 9)
    }
    return out
  }

  /** 画成点时每个粒子只要 1 个顶点（课程的原生 GL 对照用） */
  points(): Float32Array {
    return new Float32Array(this.p)
  }
}

const PARTICLE_VERTEX = `attribute vec3 position;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
varying float vHeight;
void main() {
  vHeight = position.y;
  gl_Position = uProjection * uView * uModel * vec4(position, 1.0);
}`

const PARTICLE_FRAGMENT = `precision mediump float;
varying float vHeight;
void main() {
  vec3 low = vec3(0.15, 0.45, 0.95);
  vec3 high = vec3(0.85, 0.95, 1.0);
  gl_FragColor = vec4(mix(low, high, clamp(vHeight / 1.3, 0.0, 1.0)), 1.0);
}`

/**
 * 'rebuild'：每帧新建 Geometry 和 Mesh，释放旧的。'forget'：每帧新建，旧的不释放。
 * 'static'：只在第一帧建，之后不换（位置不动，只用来对照「什么都不变」时每帧要多少调用）。
 */
export type ParticleMode = 'rebuild' | 'forget' | 'static'

export interface ParticleFrame {
  readonly calls: readonly GLCall[]
  readonly error: ErrorInfo | null
  /** 出错在哪一段：换 Geometry（释放旧的）还是画 */
  readonly phase: 'swap' | 'render' | null
  /** 构造 VertexAttribute + Geometry 花的时间（只有 CPU 复制和检查） */
  readonly buildMs: number
  /** 整帧（构造、换、画）花的时间 */
  readonly frameMs: number
  /** 这一帧顶点数据的字节数 */
  readonly bytes: number
}

export interface ParticleDemo {
  readonly rig: Rig
  readonly particles: FakeParticles
  readonly geometry: () => Geometry
  frame(): ParticleFrame
}

export function createParticleDemo(rig: Rig, count: number, mode: ParticleMode): ParticleDemo {
  const particles = new FakeParticles(count)
  const shader = rig.scene.retain(
    new ShaderModule({
      name: 'particles',
      language: 'glsl-es-100',
      vertexSource: PARTICLE_VERTEX,
      fragmentSource: PARTICLE_FRAGMENT,
      builtInUniforms: { modelMatrix: 'uModel', viewMatrix: 'uView', projectionMatrix: 'uProjection' }
    })
  )
  const material = rig.scene.retain(new Material({ shaderModule: shader, state: { cullMode: 'none' } }))
  let geometry: Geometry | null = null
  let mesh: Mesh | null = null

  return {
    rig,
    particles,
    geometry: () => geometry!,
    frame() {
      rig.recorder.reset() // 释放旧 Geometry 发出的调用也算这一帧
      if (mode === 'static' && geometry !== null) {
        const start = performance.now()
        const error = rig.render()
        return {
          calls: rig.recorder.calls.slice(),
          error: error === null ? null : info(error),
          phase: error === null ? null : 'render',
          buildMs: 0,
          frameMs: performance.now() - start,
          bytes: 0
        }
      }
      particles.step()
      const start = performance.now()
      // 引擎里 Geometry 不能改（Geometry.ts:135），Mesh 的 geometry 也不能换：位置一变就整套新建
      const data = particles.triangles()
      const next = new Geometry({ attributes: { position: new VertexAttribute({ data, itemSize: 3 }) } })
      const built = performance.now()
      try {
        if (mesh !== null) rig.scene.remove(mesh)
        if (mode !== 'forget') {
          if (geometry !== null) rig.scene.release(geometry) // 最后一个引用 → dispose → 各 Manager 删 GPU 对象
          rig.scene.retain(next)
        }
        geometry = next
        mesh = new Mesh(next, material)
        rig.scene.add(mesh)
      } catch (error) {
        geometry = next
        mesh = new Mesh(next, material)
        rig.scene.add(mesh)
        if (mode !== 'forget') rig.scene.retain(next)
        return {
          calls: rig.recorder.calls.slice(),
          error: info(error),
          phase: 'swap',
          buildMs: built - start,
          frameMs: performance.now() - start,
          bytes: data.byteLength
        }
      }
      const error = rig.render()
      return {
        calls: rig.recorder.calls.slice(),
        error: error === null ? null : info(error),
        phase: error === null ? null : 'render',
        buildMs: built - start,
        frameMs: performance.now() - start,
        bytes: data.byteLength
      }
    }
  }
}

export interface ParticleRun {
  readonly mode: ParticleMode | 'raw-triangles' | 'raw-points'
  readonly count: number
  readonly frames: number
  /** 第 2 帧以后每帧的平均调用（第 1 帧有编译 shader 等冷路径） */
  readonly perFrame: Tally
  /** 最后一帧之后还活着的 buffer、VAO */
  readonly liveBuffers: number
  readonly liveVAOs: number
  readonly bytesPerFrame: number
  /** CPU 上为这一帧顶点数据做了几次整份复制 */
  readonly cpuCopies: number
  readonly buildMsMedian: number
  readonly frameMsMedian: number
  readonly picture: HTMLCanvasElement | null
  readonly error: ErrorInfo | null
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)]!
}

function averageTally(frames: readonly Tally[]): Tally {
  const byName: Record<string, number> = {}
  let commands = 0
  let queries = 0
  let lost = 0
  for (const t of frames) {
    commands += t.commands
    queries += t.queries
    lost += t.lost
    for (const [name, n] of Object.entries(t.byName)) byName[name] = (byName[name] ?? 0) + n
  }
  const n = Math.max(1, frames.length)
  for (const name of Object.keys(byName)) byName[name] = byName[name]! / n
  return { commands: commands / n, queries: queries / n, lost: lost / n, byName }
}

function liveCount(calls: readonly GLCall[], create: string, remove: string): number {
  let live = 0
  for (const call of calls) {
    if (call.name === create) live += 1
    else if (call.name === remove) live -= 1
  }
  return live
}

/** 用真实引擎跑 frames 帧粒子，数每帧的调用和活着的 GPU 对象。 */
export function runParticles(count: number, mode: ParticleMode, frames = 30, hide: readonly string[] = []): ParticleRun {
  const rig = openRig({ hide })
  try {
    const demo = createParticleDemo(rig, count, mode)
    const all: GLCall[] = []
    const later: Tally[] = []
    const build: number[] = []
    const whole: number[] = []
    let bytes = 0
    let error: ErrorInfo | null = null
    let picture: HTMLCanvasElement | null = null
    for (let i = 0; i < frames; i += 1) {
      const frame = demo.frame()
      all.push(...frame.calls)
      if (i > 0) later.push(tally(frame.calls))
      build.push(frame.buildMs)
      whole.push(frame.frameMs)
      bytes = frame.bytes
      if (frame.error !== null && error === null) error = frame.error
      if (i === frames - 1) picture = snapshot(rig.canvas)
    }
    return {
      mode,
      count,
      frames,
      perFrame: averageTally(later),
      liveBuffers: liveCount(all, 'createBuffer', 'deleteBuffer'),
      liveVAOs: liveCount(all, 'vertex_array_object.createVertexArrayOES', 'vertex_array_object.deleteVertexArrayOES'),
      bytesPerFrame: bytes,
      // VertexAttribute 构造时复制一份（VertexAttribute.ts:100），GeometryManager.get 上传前再复制一份（:145）
      cpuCopies: mode === 'static' ? 0 : 2,
      buildMsMedian: median(build.slice(1)),
      frameMsMedian: median(whole.slice(1)),
      picture,
      error
    }
  } finally {
    rig.close()
  }
}

/**
 * 课程写的对照，不经过引擎：原生 GL，一个 buffer 只分配一次（DYNAMIC_DRAW），
 * 之后每帧 bufferSubData 改内容。'points' 每个粒子 1 个顶点、'triangles' 3 个。
 * 只为数调用和字节，不代表引擎应该这样写。
 */
export function runRawDynamic(count: number, primitive: 'points' | 'triangles', frames = 30): ParticleRun {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const gl = canvas.getContext('webgl', { alpha: false, depth: true })
  if (gl === null) throw new Error('这个浏览器拿不到 WebGL context')
  const recorder = recordGL(gl)
  const particles = new FakeParticles(count)
  try {
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }
    const program = gl.createProgram()!
    gl.attachShader(
      program,
      compile(
        gl.VERTEX_SHADER,
        `attribute vec3 position;
varying float vHeight;
void main() {
  vHeight = position.y;
  gl_Position = vec4(position.x * 0.55, position.y * 0.75 - 0.6, 0.0, 1.0);
  gl_PointSize = 2.0;
}`
      )
    )
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, PARTICLE_FRAGMENT))
    gl.linkProgram(program)
    const first = primitive === 'points' ? particles.points() : particles.triangles()
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, first.byteLength, gl.DYNAMIC_DRAW) // 只分配一次
    gl.useProgram(program)
    const location = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
    gl.clearColor(0, 0, 0, 1)

    const later: Tally[] = []
    const whole: number[] = []
    const all: GLCall[] = []
    let picture: HTMLCanvasElement | null = null
    for (let i = 0; i < frames; i += 1) {
      recorder.reset()
      particles.step()
      const start = performance.now()
      const data = primitive === 'points' ? particles.points() : particles.triangles()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data) // 改内容，不重新分配
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(primitive === 'points' ? gl.POINTS : gl.TRIANGLES, 0, data.length / 3)
      whole.push(performance.now() - start)
      all.push(...recorder.calls)
      if (i > 0) later.push(tally(recorder.calls))
      if (i === frames - 1) picture = snapshot(canvas)
    }
    return {
      mode: primitive === 'points' ? 'raw-points' : 'raw-triangles',
      count,
      frames,
      perFrame: averageTally(later),
      liveBuffers: 1,
      liveVAOs: 0,
      bytesPerFrame: first.byteLength,
      cpuCopies: 0,
      buildMsMedian: 0,
      frameMsMedian: median(whole.slice(1)),
      picture,
      error: null
    }
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

// ---------------- 卡片：points ----------------

/** 卡片 A：照 three.js 的习惯写 topology: 'points'。类型上写不进去，运行时会怎样？ */
export function tryPointsTopology(): { created: boolean; error: ErrorInfo | null } {
  try {
    new Geometry({
      attributes: { position: new VertexAttribute({ data: new Float32Array([0, 0, 0, 1, 0, 0]), itemSize: 3 }) },
      topology: 'points' as never // TypeScript 本来就不让写；as never 模拟从 JSON 读进来的字符串
    })
    return { created: true, error: null }
  } catch (error) {
    return { created: false, error: info(error) }
  }
}

// ---------------- 卡片：冷路径变成热路径（找茬题 7） ----------------

/** 只为课程演示：读 Backend 私有的 generation，看 GeometryManager 表里还有没有某个 Geometry。 */
interface GeometryEntryView {
  readonly resource: { readonly attributes: ReadonlyMap<string, { readonly buffer: WebGLBuffer }> }
}

function geometryEntry(backend: WebGL1Backend, geometry: Geometry): GeometryEntryView | undefined {
  const inner = backend as unknown as {
    generation: { resources: { geometries: { entries: Map<Geometry, GeometryEntryView> } } }
  }
  return inner.generation.resources.geometries.entries.get(geometry)
}

export interface StaleFlagResult {
  readonly path: 'Manual' | 'OES'
  readonly releaseError: ErrorInfo | null
  readonly disposed: boolean
  readonly entryKept: boolean
  readonly bufferAlive: boolean
  /** Resource 的监听器集合没清空、CPU 数据没断开 */
  readonly listenersLeft: number
  readonly cpuAttributesLeft: number
  readonly retryThrew: boolean
  readonly entryKeptAfterRetry: boolean
  readonly renderError: ErrorInfo | null
  readonly nextFrameError: ErrorInfo | null
  readonly liveBuffers: number
}

/**
 * 卡片 C：每帧换 Geometry 的写法下，上一帧的 draw 留下一个没人查的 GL 错误标志，
 * 这一帧释放旧 Geometry 时会怎样。错误标志是课程用 gl.disable(0xDEAD) 造的（INVALID_ENUM），
 * 代表「热路径按设计不查 getError，留下了标志」。manual = true 时藏起 VAO 扩展。
 */
export function staleFlagThenRelease(manual: boolean): StaleFlagResult {
  const rig = openRig({ hide: manual ? ['OES_vertex_array_object'] : [] })
  try {
    const demo = createParticleDemo(rig, 200, 'rebuild')
    const all: GLCall[] = []
    const first = demo.frame()
    all.push(...first.calls)
    const old = demo.geometry()
    const oldBuffer = geometryEntry(rig.backend, old)!.resource.attributes.get('position')!.buffer

    rig.gl.disable(0xdead) // 课程造的：一个没人检查的 INVALID_ENUM
    const second = demo.frame() // 先释放旧 Geometry，再画新的
    all.push(...second.calls)

    const entry = geometryEntry(rig.backend, old)
    const listeners = (old as unknown as { disposeListeners: Set<unknown> }).disposeListeners.size
    const attributes = (old as unknown as { attributesValue: Map<string, unknown> }).attributesValue.size
    const bufferAlive = rig.gl.isBuffer(oldBuffer)

    let retryThrew = false
    try {
      old.dispose() // 再释放一次能补救吗？
    } catch {
      retryThrew = true
    }
    const third = demo.frame()
    all.push(...third.calls)
    return {
      path: manual ? 'Manual' : 'OES',
      releaseError: second.phase === 'swap' ? second.error : null,
      disposed: old.disposed,
      entryKept: entry !== undefined,
      bufferAlive,
      listenersLeft: listeners,
      cpuAttributesLeft: attributes,
      retryThrew,
      entryKeptAfterRetry: geometryEntry(rig.backend, old) !== undefined,
      renderError: second.phase === 'render' ? second.error : null,
      nextFrameError: third.error,
      liveBuffers: liveCount(all, 'createBuffer', 'deleteBuffer')
    }
  } finally {
    rig.close()
  }
}

// ---------------- 需求二：一张标量场，每帧更新 ----------------

const FIELD_VERTEX = `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`

/** 红 = 正，蓝 = 负，白 = 0；uScale 把 ±amplitude 放大到 ±1 */
const FIELD_FRAGMENT = `precision highp float;
uniform sampler2D uField;
uniform float uScale;
varying vec2 vUv;
void main() {
  float v = clamp(texture2D(uField, vUv).r * uScale, -1.0, 1.0);
  vec3 white = vec3(0.96);
  vec3 color = v >= 0.0 ? mix(white, vec3(0.85, 0.2, 0.15), v) : mix(white, vec3(0.15, 0.35, 0.85), -v);
  gl_FragColor = vec4(color, 1.0);
}`

export interface FieldOptions {
  readonly size: number
  readonly format: Extract<TextureFormat, 'r' | 'rgba'>
  readonly type: 'float32' | 'uint8'
  readonly filter: 'linear' | 'nearest'
  readonly wrap: TextureWrapMode
  /** 课程写的：假装设备没有 OES_texture_float_linear */
  readonly hideFloatLinear: boolean
  /** 场的幅度；散度大约是 1e-5 */
  readonly amplitude: number
}

export interface FieldResult {
  readonly constructed: boolean
  readonly constructError: ErrorInfo | null
  readonly renderError: ErrorInfo | null
  /** 第一帧的 GL 调用 */
  readonly firstFrame: Tally | null
  /** 第二帧：纹理已经在表里 */
  readonly secondFrame: Tally | null
  /** 纹理数据的字节数（CPU 快照的大小，也是上传的大小） */
  readonly bytes: number
  /** 画面上四个点：左下 1/4 处（正）、右下 1/4 处（负）、中心、左上 */
  readonly pixels: readonly (readonly number[])[]
  readonly picture: HTMLCanvasElement | null
}

/** 课程写的场：amplitude · sin(2πx) · sin(2πy)，四个象限正负交替，像一张散度图。 */
export function fieldValues(size: number, amplitude: number): Float64Array {
  const out = new Float64Array(size * size)
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) {
      const x = (i + 0.5) / size
      const y = (j + 0.5) / size
      out[j * size + i] = amplitude * Math.sin(2 * Math.PI * x) * Math.sin(2 * Math.PI * y)
    }
  }
  return out
}

/** 用真实的 DataTexture2D、Material 和 Backend 把场画到 canvas 上。 */
export function drawField(options: FieldOptions): FieldResult {
  const channels = options.format === 'r' ? 1 : 4
  const values = fieldValues(options.size, options.amplitude)
  const data =
    options.type === 'float32'
      ? new Float32Array(options.size * options.size * channels)
      : new Uint8Array(options.size * options.size * channels)
  for (let k = 0; k < values.length; k += 1) {
    // uint8 只能存 0..255：照「值 × 255 取整」存，就是把 0..1 映射到 0..255 的常见写法
    data[k * channels] = options.type === 'float32' ? values[k]! : Math.max(0, Math.min(255, Math.round(values[k]! * 255)))
    if (channels === 4) data[k * channels + 3] = options.type === 'float32' ? 1 : 255
  }

  const rig = openRig({ width: 160, height: 160, hide: options.hideFloatLinear ? ['OES_texture_float_linear'] : [] })
  try {
    let texture: DataTexture2D
    try {
      texture = rig.scene.retain(
        new DataTexture2D({
          label: 'divergence slice',
          source: { data, width: options.size, height: options.size },
          storage: { format: options.format, type: options.type },
          colorSpace: 'data',
          sampler: {
            minFilter: options.filter,
            magFilter: options.filter,
            wrapS: options.wrap,
            wrapT: options.wrap
          }
        })
      )
    } catch (error) {
      return {
        constructed: false,
        constructError: info(error),
        renderError: null,
        firstFrame: null,
        secondFrame: null,
        bytes: data.byteLength,
        pixels: [],
        picture: null
      }
    }
    const shader = rig.scene.retain(
      new ShaderModule({
        name: 'field colormap',
        language: 'glsl-es-100',
        vertexSource: FIELD_VERTEX,
        fragmentSource: FIELD_FRAGMENT
      })
    )
    const material = rig.scene.retain(
      new Material({
        shaderModule: shader,
        state: { cullMode: 'none', depthTest: false },
        parameters: {
          uField: { type: 'texture2D', value: texture },
          uScale: { type: 'float', value: 1 / options.amplitude }
        }
      })
    )
    const quad = rig.scene.retain(
      new Geometry({
        attributes: {
          position: new VertexAttribute({ data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), itemSize: 2 }),
          uv: new VertexAttribute({ data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), itemSize: 2 })
        }
      })
    )
    rig.scene.add(new Mesh(quad, material))

    rig.recorder.reset()
    const error = rig.render()
    const firstFrame = tally(rig.recorder.calls)
    if (error !== null) {
      return {
        constructed: true,
        constructError: null,
        renderError: info(error),
        firstFrame,
        secondFrame: null,
        bytes: data.byteLength,
        pixels: [],
        picture: null
      }
    }
    rig.recorder.reset()
    rig.render()
    const secondFrame = tally(rig.recorder.calls)
    const pixels = [
      readCanvasPixel(rig.gl, 40, 40),
      readCanvasPixel(rig.gl, 120, 40),
      readCanvasPixel(rig.gl, 80, 80),
      readCanvasPixel(rig.gl, 40, 120)
    ]
    return {
      constructed: true,
      constructError: null,
      renderError: null,
      firstFrame,
      secondFrame,
      bytes: data.byteLength,
      pixels,
      picture: snapshot(rig.canvas)
    }
  } finally {
    rig.close()
  }
}

export interface FieldRebuildRun {
  readonly size: number
  readonly frames: number
  /** 第 2 帧以后每帧的平均调用 */
  readonly perFrame: Tally
  readonly liveTextures: number
  readonly bytesPerFrame: number
  readonly error: ErrorInfo | null
}

/**
 * 场每帧都变：每帧新建一张 DataTexture2D，用 Material.setParameter 换上，释放旧的
 * （DataTexture2D 是静态的，Texture2D.ts:18–20）。数每帧的调用。
 */
export function runFieldRebuild(size: number, frames = 20): FieldRebuildRun {
  const rig = openRig({ width: 160, height: 160 })
  try {
    const make = (frame: number): DataTexture2D => {
      const values = fieldValues(size, 1e-5)
      const data = new Float32Array(size * size * 4)
      const phase = Math.cos(frame / 10)
      for (let k = 0; k < values.length; k += 1) {
        data[k * 4] = values[k]! * phase
        data[k * 4 + 3] = 1
      }
      return new DataTexture2D({
        label: 'divergence slice ' + frame,
        source: { data, width: size, height: size },
        storage: { format: 'rgba', type: 'float32' },
        colorSpace: 'data',
        sampler: { minFilter: 'nearest', magFilter: 'nearest' }
      })
    }
    let texture = rig.scene.retain(make(0))
    const shader = rig.scene.retain(
      new ShaderModule({ name: 'field colormap', language: 'glsl-es-100', vertexSource: FIELD_VERTEX, fragmentSource: FIELD_FRAGMENT })
    )
    const material = rig.scene.retain(
      new Material({
        shaderModule: shader,
        state: { cullMode: 'none', depthTest: false },
        parameters: { uField: { type: 'texture2D', value: texture }, uScale: { type: 'float', value: 1e5 } }
      })
    )
    const quad = rig.scene.retain(
      new Geometry({
        attributes: {
          position: new VertexAttribute({ data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), itemSize: 2 }),
          uv: new VertexAttribute({ data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), itemSize: 2 })
        }
      })
    )
    rig.scene.add(new Mesh(quad, material))
    const later: Tally[] = []
    const all: GLCall[] = []
    let error: ErrorInfo | null = null
    for (let i = 0; i < frames; i += 1) {
      rig.recorder.reset()
      if (i > 0) {
        const next = rig.scene.retain(make(i))
        material.setParameter('uField', { type: 'texture2D', value: next })
        rig.scene.release(texture) // 旧纹理 → dispose → Texture2DManager 删掉它
        texture = next
      }
      const failed = rig.render()
      if (failed !== null && error === null) error = info(failed)
      all.push(...rig.recorder.calls)
      if (i > 0) later.push(tally(rig.recorder.calls))
    }
    return {
      size,
      frames,
      perFrame: averageTally(later),
      liveTextures: liveCount(all, 'createTexture', 'deleteTexture'),
      bytesPerFrame: size * size * 4 * 4,
      error
    }
  } finally {
    rig.close()
  }
}

// ---------------- 需求三：跑很久，GPU 上积累的状态 ----------------

const STEP_VERTEX = `attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

/** 新值 = 旧值 + 1：最简单的「状态在 GPU 上一帧一帧往前推」 */
const STEP_FRAGMENT = `precision highp float;
uniform sampler2D uPrevious;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uPrevious, vUv) + vec4(1.0, 0.0, 0.0, 0.0);
}`

/**
 * 课程写的 Pass：两张 RenderTarget 轮流读写（ping-pong），每帧把上一帧的值加 1。
 * 不能读正在写的目标（第 44、46 课的反馈检查），所以要两张。
 * 它代表所有「状态在 GPU 上一帧接一帧积累」的计算：GPU 版 Stable Fluids 的速度场、时间累积……
 */
export class AccumulatePass implements RenderPass {
  public readonly name = 'AccumulatePass'
  public readonly targets: readonly [RenderTarget, RenderTarget]
  private readonly quad: Geometry
  private readonly shader: ShaderModule
  private readonly materials: readonly [Material, Material]
  /** 最近一次写进的是哪一张 */
  private latestIndex = 0

  constructor(format: 'rgba32f' | 'rgba8') {
    const target = (label: string): RenderTarget =>
      new RenderTarget(
        { width: 4, height: 4, colors: [{ format, sampler: { minFilter: 'nearest', magFilter: 'nearest' } }] },
        { label }
      )
    this.targets = [target('state A'), target('state B')]
    this.quad = new Geometry({
      attributes: { position: new VertexAttribute({ data: new Float32Array([-1, -1, 3, -1, -1, 3]), itemSize: 2 }) }
    })
    this.shader = new ShaderModule({
      name: 'accumulate',
      language: 'glsl-es-100',
      vertexSource: STEP_VERTEX,
      fragmentSource: STEP_FRAGMENT
    })
    // materials[i]：读第 i 张
    const reads = (index: number): Material =>
      new Material({
        shaderModule: this.shader,
        state: { cullMode: 'none', depthTest: false, dither: false },
        parameters: { uPrevious: { type: 'texture2D', value: this.targets[index]!.getColorAttachment(0) } }
      })
    this.materials = [reads(0), reads(1)]
  }

  get latest(): RenderTarget {
    return this.targets[this.latestIndex]!
  }

  execute(context: RenderPassContext): undefined {
    const read = this.latestIndex
    const write = 1 - read
    // 不清屏：整张都会被盖掉；第一帧读到的是新分配纹理的 0（WebGL 规定 texImage2D(null) 填 0）
    context.backend.withRenderSurface({ surface: { kind: 'render-target', target: this.targets[write]! } }, () => {
      context.backend.draw({
        item: { geometry: this.quad, material: this.materials[read]!, worldMatrix: IDENTITY },
        view: context.view
      })
      return undefined
    })
    this.latestIndex = write
    return undefined
  }

  dispose(): void {
    for (const material of this.materials) material.dispose()
    this.shader.dispose()
    this.quad.dispose()
    for (const target of this.targets) target.dispose()
  }
}

/**
 * 课程写的回读：引擎没有「把 RenderTarget 的内容读回 CPU」的接口（这正是审查意见之一），
 * 这里读 Backend 私有的 generation 拿到 framebuffer，再用原生 readPixels。读完换回默认 framebuffer，
 * 并让 State 缓存作废。
 */
export function readTarget(rig: Rig, target: RenderTarget, format: 'rgba32f' | 'rgba8'): number {
  const inner = rig.backend as unknown as {
    generation: {
      resources: { renderTargets: { get(t: RenderTarget): { framebuffer: WebGLFramebuffer } } }
      state: { invalidate(): void }
    }
  }
  const gl = rig.gl
  const framebuffer = inner.generation.resources.renderTargets.get(target).framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  let value: number
  if (format === 'rgba32f') {
    const out = new Float32Array(4)
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, out)
    value = out[0]!
  } else {
    const out = new Uint8Array(4)
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out)
    value = out[0]! / 255
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  inner.generation.state.invalidate()
  return value
}

export interface LossStep {
  readonly label: string
  readonly value: number | null
  readonly ready: boolean
  readonly commands: number
  readonly created: Readonly<Record<string, number>>
  readonly error: ErrorInfo | null
}

export interface LossResult {
  readonly format: 'rgba32f' | 'rgba8'
  readonly steps: readonly LossStep[]
  /** Pass 每帧拿到的 context 有哪些字段 */
  readonly contextKeys: readonly string[]
  readonly setupError: ErrorInfo | null
}

/** 拿到 context 以后，Pass 能看到的就是这些字段（RenderPassContext.ts）。 */
class PeekPass implements RenderPass {
  public readonly name = 'PeekPass'
  public keys: string[] = []
  execute(context: RenderPassContext): undefined {
    this.keys = Object.keys(context)
    return undefined
  }
  dispose(): void {}
}

/**
 * 卡片 F：累加 Pass 跑 10 帧，设备丢失、恢复，再跑 3 帧。每帧之后读一次累加值。
 * 场景里同时有一个普通的三角形（CPU 原件），看它的 buffer 会不会自动重建。
 */
export async function loseWhileAccumulating(format: 'rgba32f' | 'rgba8', before = 10, after = 3): Promise<LossResult> {
  const accumulate = new AccumulatePass(format)
  const peek = new PeekPass()
  const rig = openRig({ width: 120, height: 90, before: [accumulate, peek] })
  const steps: LossStep[] = []
  const created = (calls: readonly GLCall[]): Record<string, number> => {
    const t = tally(calls).byName
    const out: Record<string, number> = {}
    for (const name of ['createBuffer', 'createTexture', 'createFramebuffer', 'createProgram']) {
      if (t[name]) out[name] = t[name]!
    }
    return out
  }
  try {
    // 一个普通物体：它的顶点是 CPU 原件，恢复以后应该自动重传
    const shader = rig.scene.retain(
      new ShaderModule({
        name: 'plain',
        language: 'glsl-es-100',
        vertexSource: PARTICLE_VERTEX,
        fragmentSource: PARTICLE_FRAGMENT,
        builtInUniforms: { modelMatrix: 'uModel', viewMatrix: 'uView', projectionMatrix: 'uProjection' }
      })
    )
    const material = rig.scene.retain(new Material({ shaderModule: shader, state: { cullMode: 'none' } }))
    const triangle = rig.scene.retain(
      new Geometry({
        attributes: { position: new VertexAttribute({ data: new Float32Array([-0.8, 0.2, 0, 0.8, 0.2, 0, 0, 1.2, 0]), itemSize: 3 }) }
      })
    )
    rig.scene.add(new Mesh(triangle, material))

    const frame = (label: string): void => {
      rig.recorder.reset()
      const error = rig.render()
      const calls = rig.recorder.calls.slice()
      let value: number | null = null
      if (error === null && rig.backend.ready) value = readTarget(rig, accumulate.latest, format)
      steps.push({
        label,
        value,
        ready: rig.backend.ready,
        commands: tally(calls).commands,
        created: created(calls),
        error: error === null ? null : info(error)
      })
    }

    for (let i = 1; i <= before; i += 1) frame('第 ' + i + ' 帧')
    const lose = rig.gl.getExtension('WEBGL_lose_context')!
    lose.loseContext()
    await sleep(50) // 等 webglcontextlost 事件派发（第 47 课：restoreContext 要在它之后调）
    frame('丢失期间')
    lose.restoreContext()
    await sleep(150) // 等 webglcontextrestored，Backend 换新的一代
    for (let i = 1; i <= after; i += 1) frame('恢复后第 ' + i + ' 帧')
    return { format, steps, contextKeys: peek.keys, setupError: null }
  } catch (error) {
    return { format, steps, contextKeys: peek.keys, setupError: info(error) }
  } finally {
    rig.close()
  }
}
