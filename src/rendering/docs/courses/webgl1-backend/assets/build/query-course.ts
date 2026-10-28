// 第 39 课的课程版代码（项目源码里没有）。
// 课程页上展示的就是这里的代码；query-entry.ts 把它和真实的 src/rendering 打进同一个包。
//
// - countGL：给真实 WebGL context 的方法包一层，数「命令」和「查询」。
// - ScanPass：8 个数的前缀和，分 3 轮、在两个目标之间来回写（ping-pong）。
//   它和 FFT 的每一轮一样「每格读上一轮的两格」，但结果一眼就能核对。
// - FFTShapedPass：只模拟 FFT 海面每帧 draw 的次数和换目标的方式；shader 只是把上一轮的结果搬过来。
// - LiteScope：只管 framebuffer 和 viewport 的简化 scope，用三种办法拿入口状态。
import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import type { Mat4Tuple } from '@/rendering/core/math/tuples'
import type { RenderItem } from '@/rendering/frame/RenderItem'
import type { ViewState } from '@/rendering/frame/ViewState'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'

// ---------------- 数 GL 调用 ----------------

/** 一次计数的结果：查询按「方法（参数名）」分类，命令只数总数，isContextLost 单独数。 */
export interface GLCount {
  readonly queries: ReadonlyMap<string, number>
  readonly queryTotal: number
  readonly commands: number
  readonly lostChecks: number
}

export interface GLCounter {
  /** 从现在起重新计数。 */
  reset(): void
  /** 到现在为止的计数。 */
  read(): GLCount
  /** 拆掉包装，context 恢复原样。 */
  stop(): void
}

/**
 * 查询 = 要拿回一个答案的调用（get…、is…、check…、readPixels）。
 * isContextLost 不算在这里：按 WebGL 规范它只返回 context 对象上的一个标志，单独计数。
 */
function isQuery(name: string): boolean {
  if (name === 'isContextLost') return false
  return /^(get|is|check)/.test(name) || name === 'readPixels'
}

/** 把 getParameter 的数字参数翻成常量名，例如 0x8CA6 → FRAMEBUFFER_BINDING。 */
function constantNames(): Map<number, string> {
  const names = new Map<number, string>()
  const table = WebGLRenderingContext as unknown as Record<string, unknown>
  for (const key of Object.keys(table)) {
    const value = table[key]
    if (typeof value === 'number' && !names.has(value)) names.set(value, key)
  }
  return names
}

/** 给 gl 上的每个方法套一层：先记账，再调用原来的方法。 */
export function countGL(gl: WebGLRenderingContext): GLCounter {
  const names = constantNames()
  const proto = WebGLRenderingContext.prototype as unknown as Record<string, unknown>
  const target = gl as unknown as Record<string, unknown>
  const wrapped: string[] = []
  let queries = new Map<string, number>()
  let commands = 0
  let lostChecks = 0

  for (const name of Object.getOwnPropertyNames(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name)
    if (name === 'constructor' || typeof descriptor?.value !== 'function') continue

    const original = descriptor.value as (...args: unknown[]) => unknown
    wrapped.push(name)

    target[name] = (...args: unknown[]) => {
      if (name === 'isContextLost') {
        lostChecks += 1
      } else if (isQuery(name)) {
        const key =
          name === 'getParameter' || name === 'isEnabled'
            ? name + '(' + (names.get(args[0] as number) ?? String(args[0])) + ')'
            : name
        queries.set(key, (queries.get(key) ?? 0) + 1)
      } else {
        commands += 1
      }
      return original.apply(gl, args)
    }
  }

  return {
    reset() {
      queries = new Map()
      commands = 0
      lostChecks = 0
    },
    read() {
      let queryTotal = 0
      for (const n of queries.values()) queryTotal += n
      return { queries: new Map(queries), queryTotal, commands, lostChecks }
    },
    stop() {
      for (const name of wrapped) delete target[name]
    }
  }
}

// ---------------- 共用的积木 ----------------

const IDENTITY: Mat4Tuple = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as unknown as Mat4Tuple

/** 盖满整个目标的矩形：两个三角形，顶点直接当裁剪坐标用。 */
function fullScreenQuad(): Geometry {
  return new Geometry({
    attributes: {
      position: new VertexAttribute({
        data: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]),
        itemSize: 3
      })
    }
  })
}

const QUAD_VERTEX = 'attribute vec3 position;\nvoid main() { gl_Position = vec4(position, 1.0); }'

function shader(name: string, fragmentSource: string): ShaderModule {
  return new ShaderModule({
    name,
    language: 'glsl-es-100',
    vertexSource: QUAD_VERTEX,
    fragmentSource
  })
}

/** 计算用的 Material：不做深度测试，不写深度。 */
function computeMaterial(
  module: ShaderModule,
  parameters: ConstructorParameters<typeof Material>[0]['parameters'] = {}
): Material {
  return new Material({
    shaderModule: module,
    state: { depthTest: false, depthWrite: false },
    parameters
  })
}

/** 只有一张颜色附件、按最近点采样的离屏目标。 */
function target(label: string, width: number, height: number): RenderTarget {
  return new RenderTarget(
    {
      width,
      height,
      colors: [{ format: 'rgba8', sampler: { minFilter: 'nearest', magFilter: 'nearest' } }]
    },
    { label }
  )
}

function into(renderTarget: RenderTarget): RenderSurfaceScopeDescriptor {
  return { surface: { kind: 'render-target', target: renderTarget } }
}

const SCREEN: RenderSurfaceScopeDescriptor = { surface: { kind: 'default-framebuffer' } }

/** 进一个 scope，在里面画一次。 */
function drawInto(
  backend: RenderBackend,
  view: ViewState,
  where: RenderSurfaceScopeDescriptor,
  item: RenderItem
): void {
  backend.withRenderSurface(where, () => {
    backend.draw({ item, view })
    return undefined
  })
}

// ---------------- 前缀和：3 轮，ping-pong ----------------

/** 第 0 轮：第 i 格写入 i + 1（rgba8 存成 (i + 1) / 255）。 */
const SEED_FRAGMENT = `precision mediump float;
void main() {
  float i = floor(gl_FragCoord.x);          // 这一格的下标 0..7
  gl_FragColor = vec4((i + 1.0) / 255.0, 0.0, 0.0, 1.0);
}`

/** 第 s 轮：out[i] = in[i] + in[i − d]，d = 2^s；i < d 时左边没有格子，加 0。 */
const STEP_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;   // 上一轮写好的那张纹理
uniform float uOffset;      // d：往左隔几格去读
uniform float uWidth;       // 一共几格（8）
void main() {
  float i = floor(gl_FragCoord.x);
  float self = texture2D(uInput, vec2((i + 0.5) / uWidth, 0.5)).r;
  float left = 0.0;
  if (i >= uOffset) left = texture2D(uInput, vec2((i - uOffset + 0.5) / uWidth, 0.5)).r;
  gl_FragColor = vec4(self + left, 0.0, 0.0, 1.0);
}`

/** 最后一步：把结果原样搬到屏幕上，课程好用 readPixels 读出来。 */
const COPY_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;
uniform float uWidth;
void main() {
  float i = floor(gl_FragCoord.x);
  gl_FragColor = vec4(texture2D(uInput, vec2((i + 0.5) / uWidth, 0.5)).r, 0.0, 0.0, 1.0);
}`

export type ScanMode = 'ping-pong' | 'same-target'

/**
 * 8 个数的前缀和。'ping-pong' 每轮换一个目标写；
 * 'same-target' 每轮都写 ping、读 ping，看项目怎样拒绝「边读边写」。
 */
export class ScanPass implements RenderPass {
  public readonly name = 'ScanPass'
  /** 每进一次 scope 记一行，课程页拿来打印。 */
  public readonly log: string[] = []

  private readonly quad = fullScreenQuad()
  private readonly ping = target('scan/ping', 8, 1)
  private readonly pong = target('scan/pong', 8, 1)
  private readonly seed = computeMaterial(shader('scan/seed', SEED_FRAGMENT))
  private readonly step: Material
  private readonly copy: Material

  constructor(private readonly mode: ScanMode) {
    const stepModule = shader('scan/step', STEP_FRAGMENT)
    this.step = computeMaterial(stepModule, {
      uInput: { type: 'texture2D', value: this.ping.getColorAttachment(0) },
      uOffset: { type: 'float', value: 1 },
      uWidth: { type: 'float', value: 8 }
    })
    this.copy = computeMaterial(shader('scan/copy', COPY_FRAGMENT), {
      uInput: { type: 'texture2D', value: this.ping.getColorAttachment(0) },
      uWidth: { type: 'float', value: 8 }
    })
  }

  private item(material: Material): RenderItem {
    return { geometry: this.quad, material, worldMatrix: IDENTITY }
  }

  execute(context: RenderPassContext): undefined {
    const { backend, view } = context
    this.log.length = 0

    // 第 0 轮：写入 1..8
    drawInto(backend, view, into(this.ping), this.item(this.seed))
    this.log.push('第 0 轮　写 ping')

    let read = this.ping
    let write = this.mode === 'ping-pong' ? this.pong : this.ping

    for (let s = 0; s < 3; s++) {
      const input = read.getColorAttachment(0) // 上一轮写好的那块画布
      this.step.setParameter('uInput', { type: 'texture2D', value: input })
      this.step.setParameter('uOffset', { type: 'float', value: 2 ** s })
      const note = '读 ' + label(read) + '，写 ' + label(write) + '（d = ' + 2 ** s + '）'
      this.log.push('第 ' + (s + 1) + ' 轮　' + note)
      drawInto(backend, view, into(write), this.item(this.step))

      if (this.mode === 'ping-pong') [read, write] = [write, read]
    }

    const result = read.getColorAttachment(0)
    this.copy.setParameter('uInput', { type: 'texture2D', value: result })
    drawInto(backend, view, SCREEN, this.item(this.copy))
    this.log.push('最后　读 ' + label(read) + '，写屏幕')
    return undefined
  }

  dispose(): void {
    for (const resource of [this.seed, this.step, this.copy, this.quad, this.ping, this.pong]) {
      resource.dispose()
    }
  }
}

function label(renderTarget: RenderTarget): string {
  return renderTarget.label.replace('scan/', '')
}

// ---------------- FFT 形状的 Pass ----------------

export interface FFTShape {
  /** 几层海浪（默认 4）。 */
  readonly layers: number
  /** 每个方向几轮 = log₂N（N = 512 时是 9）。 */
  readonly rounds: number
  /** 一次 IFFT 处理几路信号：1 = 旧 v3 的单通道，4 = 迁移计划决定 8 的 MRT。 */
  readonly channels: 1 | 4
  /** 纹理实际边长。查询次数和它无关，取小一点跑得快。 */
  readonly size: number
}

const MOVE_FRAGMENT = `precision mediump float;
uniform sampler2D uInput;
uniform float uSize;
void main() {
  gl_FragColor = texture2D(uInput, gl_FragCoord.xy / uSize);
}`

const SPECTRUM_FRAGMENT = `precision mediump float;
void main() { gl_FragColor = vec4(0.5, 0.25, 0.0, 1.0); }`

/**
 * 每层：频谱 1 次 → 4 路信号 × 2 个方向 × rounds 轮（ping、pong 来回）→ 组装 1 次。
 * channels 为 4 时把 4 路信号合成 1 次（这里只模拟 draw 的次数，没有真做多附件）。
 * 每次 draw 写的目标都和上一次不同，所以每次 draw 都进一个新的 scope。
 */
export class FFTShapedPass implements RenderPass {
  public readonly name = 'FFTShapedPass'
  /** 上一帧进 scope 的次数。 */
  public scopes = 0

  private readonly quad = fullScreenQuad()
  private readonly spectrum: Material
  private readonly move: Material
  private readonly layerTargets: {
    readonly spectrum: RenderTarget
    readonly ping: RenderTarget
    readonly pong: RenderTarget
    readonly packed: RenderTarget
    readonly final: RenderTarget
  }[] = []

  constructor(private readonly shape: FFTShape) {
    this.spectrum = computeMaterial(shader('fft/spectrum', SPECTRUM_FRAGMENT))
    for (let layer = 0; layer < shape.layers; layer++) {
      const name = (what: string) => target('fft/layer' + layer + '/' + what, shape.size, shape.size)
      this.layerTargets.push({
        spectrum: name('spectrum'),
        ping: name('ping'),
        pong: name('pong'),
        packed: name('packed'),
        final: name('final')
      })
    }
    this.move = computeMaterial(shader('fft/move', MOVE_FRAGMENT), {
      uInput: { type: 'texture2D', value: this.layerTargets[0]!.spectrum.getColorAttachment(0) },
      uSize: { type: 'float', value: shape.size }
    })
  }

  private moveInto(context: RenderPassContext, from: RenderTarget, to: RenderTarget): void {
    this.move.setParameter('uInput', { type: 'texture2D', value: from.getColorAttachment(0) })
    drawInto(context.backend, context.view, into(to), {
      geometry: this.quad,
      material: this.move,
      worldMatrix: IDENTITY
    })
    this.scopes += 1
  }

  execute(context: RenderPassContext): undefined {
    this.scopes = 0
    const signals = 4 / this.shape.channels

    for (const t of this.layerTargets) {
      // ① 频谱：1 次
      drawInto(context.backend, context.view, into(t.spectrum), {
        geometry: this.quad,
        material: this.spectrum,
        worldMatrix: IDENTITY
      })
      this.scopes += 1

      // ② IFFT：每路信号先横着 rounds 轮，再竖着 rounds 轮
      for (let p = 0; p < signals; p++) {
        let read = t.spectrum
        let write = t.ping
        const steps = 2 * this.shape.rounds

        for (let step = 0; step < steps; step++) {
          const last = step === steps - 1
          this.moveInto(context, read, last ? t.packed : write)
          read = write
          write = write === t.ping ? t.pong : t.ping
        }
      }

      // ③ 组装：1 次
      this.moveInto(context, t.packed, t.final)
    }
    return undefined
  }

  dispose(): void {
    this.spectrum.dispose()
    this.move.dispose()
    this.quad.dispose()
    for (const t of this.layerTargets) {
      for (const r of [t.spectrum, t.ping, t.pong, t.packed, t.final]) r.dispose()
    }
  }
}

// ---------------- 三种拿入口状态的办法（简化 scope） ----------------

/**
 * 'ask'：每次进门都问 GL（项目现在的做法）。
 * 'stack'：嵌套时，入口就是外层刚绑的那个，只有最外层问（迁移计划决定 4 的 C）。
 * 'remember'：自己记住上一次绑了什么，只有第一次问（决定 4 的 B）。
 */
export type EntryStrategy = 'ask' | 'stack' | 'remember'

interface Binding {
  readonly framebuffer: WebGLFramebuffer | null
  readonly viewport: readonly [number, number, number, number]
}

export class LiteScope {
  private readonly stack: Binding[] = []
  private remembered: Binding | undefined

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly strategy: EntryStrategy
  ) {}

  private ask(): Binding {
    const framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
    const v = this.gl.getParameter(this.gl.VIEWPORT) as Int32Array
    return { framebuffer, viewport: [v[0]!, v[1]!, v[2]!, v[3]!] }
  }

  private entry(): Binding {
    if (this.strategy === 'stack' && this.stack.length > 0) return this.stack[this.stack.length - 1]!
    if (this.strategy === 'remember' && this.remembered !== undefined) return this.remembered
    return this.ask()
  }

  private bind(binding: Binding): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binding.framebuffer)
    this.gl.viewport(...binding.viewport)
    this.remembered = binding
  }

  /** 进门记下入口 → 绑目标 → 执行 → 出门绑回入口。 */
  run(framebuffer: WebGLFramebuffer | null, size: number, callback: () => void): void {
    const previous = this.entry()
    const next: Binding = { framebuffer, viewport: [0, 0, size, size] }
    this.bind(next)
    this.stack.push(next)
    try {
      callback()
    } finally {
      this.stack.pop()
      this.bind(previous)
    }
  }
}

// ---------------- 直接用 gl 的对照实验 ----------------

/** FFT 每层每帧依次写哪些目标（和 FFTShapedPass 的顺序一样）。 */
export function fftOrder(shape: Pick<FFTShape, 'rounds' | 'channels'>): string[] {
  const order = ['spectrum']
  const signals = 4 / shape.channels
  for (let p = 0; p < signals; p++) {
    let write = 'ping'
    for (let step = 0; step < 2 * shape.rounds; step++) {
      order.push(step === 2 * shape.rounds - 1 ? 'packed' : write)
      write = write === 'ping' ? 'pong' : 'ping'
    }
  }
  order.push('final')
  return order
}

/** 每层建 5 个原生 framebuffer（各挂一张 size × size 的纹理），名字和 fftOrder 里的一样。 */
export function rawTargets(
  gl: WebGLRenderingContext,
  layers: number,
  size: number
): Map<string, WebGLFramebuffer>[] {
  const result: Map<string, WebGLFramebuffer>[] = []
  for (let layer = 0; layer < layers; layer++) {
    const map = new Map<string, WebGLFramebuffer>()
    for (const name of ['spectrum', 'ping', 'pong', 'packed', 'final']) {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      const framebuffer = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      map.set(name, framebuffer)
    }
    result.push(map)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return result
}

/**
 * 旧 v3 的写法（按 FFTOceanComputePass-multi-layers-v3.ts 的结构重写，省掉了 draw）：
 * 入口问 7 项（captureGLState），中间每次直接绑目标，出口一次写回。
 */
export function runLikeV3(
  gl: WebGLRenderingContext,
  layers: readonly Map<string, WebGLFramebuffer>[],
  order: readonly string[],
  size: number
): void {
  const saved = {
    framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null,
    viewport: gl.getParameter(gl.VIEWPORT) as Int32Array,
    cullFace: gl.getParameter(gl.CULL_FACE) as boolean,
    scissor: gl.getParameter(gl.SCISSOR_TEST) as boolean,
    blend: gl.getParameter(gl.BLEND) as boolean,
    depthTest: gl.getParameter(gl.DEPTH_TEST) as boolean,
    colorMask: gl.getParameter(gl.COLOR_WRITEMASK) as [boolean, boolean, boolean, boolean]
  }
  gl.disable(gl.DEPTH_TEST)

  for (const targets of layers) {
    for (const name of order) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets.get(name)!) // 直接绑，不问、不还原
      gl.viewport(0, 0, size, size)
      // （这里是一次 draw）
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, saved.framebuffer)
  gl.viewport(saved.viewport[0]!, saved.viewport[1]!, saved.viewport[2]!, saved.viewport[3]!)
  if (saved.cullFace) gl.enable(gl.CULL_FACE)
  else gl.disable(gl.CULL_FACE)
  if (saved.scissor) gl.enable(gl.SCISSOR_TEST)
  else gl.disable(gl.SCISSOR_TEST)
  if (saved.blend) gl.enable(gl.BLEND)
  else gl.disable(gl.BLEND)
  if (saved.depthTest) gl.enable(gl.DEPTH_TEST)
  else gl.disable(gl.DEPTH_TEST)
  gl.colorMask(...saved.colorMask)
}
