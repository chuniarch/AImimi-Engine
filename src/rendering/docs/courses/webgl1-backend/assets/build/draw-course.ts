// 第 47 课的课程版代码（项目源码里没有）。draw-entry.ts 把它和真实的 src/rendering 打进同一个包。
//
// - recordGL：给真实 WebGL context 的每个方法包一层，记下每条调用，以及「当时在第几步」。
// - tagDrawSteps：给真实 WebGL1Backend 的几处内部调用贴上步骤标签，标签和课程页的 ①–⑪ 一一对应。
// - ShadowMapPassV1：把物体画进阴影图，并把灯的矩阵写进参数块（第 45 课的 C，用真实的类写一遍）。
// - buildShadowScene：第 40 课的场景，用真实的 Scene、Mesh、Geometry、Material、ParameterBlock 搭。
// - createDemo：把场景、两个 Pass、真实的 Renderer 和 WebGL1Backend 接起来，一次画一帧并交回记录。
// - StateFirstBackend：卡片 D 用，把「设状态」挪到「查表」前面，其余照抄真实的 draw。
import { mat4 } from 'gl-matrix'
import { Renderer } from '@/rendering/Renderer'
import type { RenderBackend } from '@/rendering/backend/RenderBackend'
import { WebGL1Backend } from '@/rendering/backend/webgl1/WebGL1Backend'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { RenderListBuilder } from '@/rendering/frame/RenderListBuilder'
import type { RenderView } from '@/rendering/frame/RenderView'
import { ForwardPass } from '@/rendering/passes/ForwardPass'
import type { RenderPass } from '@/rendering/passes/RenderPass'
import type { RenderPassContext } from '@/rendering/passes/RenderPassContext'
import { RenderPipeline } from '@/rendering/passes/RenderPipeline'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material } from '@/rendering/resources/Material'
import { ParameterBlock } from '@/rendering/resources/ParameterBlock'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

// ---------------- 记账：每条 GL 调用发生在第几步 ----------------

/** 一条 GL 调用。step 是课程页的步骤标签，pass 是当时在跑的 Pass。 */
export interface GLCall {
  readonly step: string
  readonly pass: string
  readonly draw: number
  readonly name: string
  readonly text: string
  readonly kind: 'command' | 'query' | 'lost'
}

export interface GLRecorder {
  /** 在 label 这一步里执行 fn；fn 里发出的调用都记到这一步。 */
  within<T>(label: string, fn: () => T): T
  /** 把当前这一步改名（scope 的回调结束以后，进门变成出门）。 */
  rename(label: string): void
  pass: string
  draw: number
  calls: GLCall[]
  reset(): void
}

/** 查询 = 要拿回答案的调用；isContextLost 只读 context 上的一个标志，单独记（同第 39 课）。 */
function kindOf(name: string): GLCall['kind'] {
  if (name === 'isContextLost') return 'lost'
  return /^(get|is|check)/.test(name) || name === 'readPixels' ? 'query' : 'command'
}

/** 这些方法的第一个数字参数是 GL 常量，显示成名字。 */
const ENUM_FIRST = new Set([
  'enable', 'disable', 'isEnabled', 'getParameter', 'bindBuffer', 'bindTexture',
  'bindFramebuffer', 'bindRenderbuffer', 'activeTexture', 'drawArrays', 'drawElements',
  'cullFace', 'depthFunc', 'pixelStorei', 'texParameteri', 'createShader', 'getExtension',
  'checkFramebufferStatus', 'getShaderParameter', 'getProgramParameter', 'clear'
])

function constantNames(): Map<number, string> {
  const names = new Map<number, string>()
  const table = WebGLRenderingContext as unknown as Record<string, unknown>
  for (const key of Object.keys(table)) {
    const value = table[key]
    if (typeof value === 'number' && !names.has(value)) names.set(value, key)
  }
  return names
}

function describe(name: string, args: readonly unknown[], names: Map<number, string>): string {
  const parts = args.map((arg, index) => {
    if (typeof arg === 'number') {
      if (index === 0 && ENUM_FIRST.has(name)) return names.get(arg) ?? String(arg)
      return String(arg)
    }
    if (typeof arg === 'string') return JSON.stringify(arg.length > 24 ? arg.slice(0, 24) + '…' : arg)
    if (arg === null || arg === undefined || typeof arg === 'boolean') return String(arg)
    if (ArrayBuffer.isView(arg)) return arg.constructor.name + '(' + (arg as Float32Array).length + ')'
    if (Array.isArray(arg)) return '[' + arg.length + ']'
    return (arg as object).constructor?.name ?? 'object'
  })
  return name + '(' + parts.join(', ') + ')'
}

/**
 * 给 gl 和它交出的扩展对象的每个方法套一层：先记账，再调用原来的方法。
 * 要在 WebGL1Backend 构造之前调用：Backend 构造时就会查扩展、读能力。
 */
export function recordGL(gl: WebGLRenderingContext): GLRecorder {
  const names = constantNames()
  const labels: string[] = []
  const recorder: GLRecorder = {
    within(label, fn) {
      labels.push(label)
      try {
        return fn()
      } finally {
        labels.pop()
      }
    },
    rename(label) {
      if (labels.length > 0) labels[labels.length - 1] = label
    },
    pass: '',
    draw: 0,
    calls: [],
    reset() {
      recorder.calls = []
      recorder.draw = 0
      recorder.pass = ''
    }
  }

  function record(name: string, args: readonly unknown[], prefix = ''): void {
    // 真正发出绘制的那一条，不管外面贴的是哪个标签，都算第 ⑩ 步
    const step = /^draw(Arrays|Elements)$/.test(name) ? '⑩' : (labels[labels.length - 1] ?? '帧开头')
    recorder.calls.push({
      step,
      pass: recorder.pass,
      draw: recorder.draw,
      name: prefix + name,
      text: prefix + describe(name, args, names),
      kind: kindOf(name)
    })
  }

  const wrappedExtensions = new WeakSet<object>()
  function wrapExtension(extension: object, label: string): void {
    if (wrappedExtensions.has(extension)) return
    wrappedExtensions.add(extension)
    const target = extension as Record<string, unknown>
    let proto: object | null = Object.getPrototypeOf(extension)
    while (proto !== null && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, key)
        if (key === 'constructor' || typeof descriptor?.value !== 'function') continue
        const original = descriptor.value as (...args: unknown[]) => unknown
        target[key] = (...args: unknown[]) => {
          record(key, args, label + '.')
          return original.apply(extension, args)
        }
      }
      proto = Object.getPrototypeOf(proto)
    }
  }

  const proto = WebGLRenderingContext.prototype as unknown as Record<string, unknown>
  const target = gl as unknown as Record<string, unknown>
  for (const name of Object.getOwnPropertyNames(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name)
    if (name === 'constructor' || typeof descriptor?.value !== 'function') continue
    const original = descriptor.value as (...args: unknown[]) => unknown
    target[name] = (...args: unknown[]) => {
      record(name, args)
      const result = original.apply(gl, args)
      if (name === 'getExtension' && result !== null && typeof result === 'object') {
        wrapExtension(result, String(args[0]).replace(/^(OES|WEBGL|EXT|ANGLE)_/, ''))
      }
      return result
    }
  }
  return recorder
}

// ---------------- 给真实 Backend 的内部调用贴步骤标签 ----------------

type AnyFunction = (...args: unknown[]) => unknown

/** 把 owner[key] 换成「先进 label 这一步，再调原方法」。只改这个实例，不改类。 */
function tag(recorder: GLRecorder, owner: object, key: string, label: string | (() => string)): void {
  const target = owner as Record<string, AnyFunction>
  const original = target[key]
  if (typeof original !== 'function') throw new Error('tagDrawSteps：找不到 ' + key)
  target[key] = (...args: unknown[]) =>
    recorder.within(typeof label === 'function' ? label() : label, () => original.apply(owner, args))
}

/**
 * 只为课程演示：读 WebGL1Backend 的私有字段 generation，给这一代的几个部件贴标签。
 * 标签对应课程页 draw 的步骤；context 恢复以后会换一代，所以每次 draw 前都看一眼。
 */
export function tagDrawSteps(backend: WebGL1Backend, recorder: GLRecorder): void {
  const inner = backend as unknown as {
    generation: {
      resources: { programs: object; geometries: object; vertexInputs: object }
      uniforms: object
      state: object
    }
  }
  const tagged = new WeakSet<object>()
  let currentChecks = 0

  function tagGeneration(): void {
    const generation = inner.generation
    if (tagged.has(generation)) return
    tagged.add(generation)
    tag(recorder, generation.resources.programs, 'get', '⑤')
    tag(recorder, generation.resources.geometries, 'get', '⑤')
    tag(recorder, generation.uniforms, 'prepare', '⑥')
    tag(recorder, generation.state, 'useProgram', '⑧')
    tag(recorder, generation.uniforms, 'upload', '⑨')
    tag(recorder, generation.resources.vertexInputs, 'bind', '⑨')
  }

  // draw 里的第一次 assertCurrentDraw 是第 ⑦ 步；后两次在画的前后，算第 ⑩ 步
  tag(recorder, backend, 'assertCurrentDraw', () => (++currentChecks === 1 ? '⑦' : '⑩'))
  tag(recorder, backend, 'applyDrawState', '⑧')

  const draw = backend.draw.bind(backend)
  backend.draw = (submission) => {
    currentChecks = 0
    recorder.draw += 1
    if (!backend.ready) return recorder.within('③', () => draw(submission))
    tagGeneration()
    recorder.within('③', () => draw(submission))
  }

  const withRenderSurface = backend.withRenderSurface.bind(backend)
  backend.withRenderSurface = (descriptor, callback) =>
    recorder.within('①', () =>
      withRenderSurface(descriptor, () => {
        try {
          return recorder.within('②', callback)
        } finally {
          recorder.rename('⑪') // 回调结束：接下来是出门换回
        }
      })
    )
}

/** 让记账知道现在是哪个 Pass。 */
function tagPass(recorder: GLRecorder, pass: RenderPass): RenderPass {
  const execute = pass.execute.bind(pass)
  ;(pass as { execute: RenderPass['execute'] }).execute = (context) => {
    recorder.pass = pass.name
    return execute(context)
  }
  return pass
}

// ---------------- 第 40 课的场景，用真实的类搭 ----------------

/** 灯偏离正上方 35°（第 45 课的默认角度）；方向从表面指向光源。 */
function toLightAt(degrees: number): Vec3Tuple {
  const a = (degrees * Math.PI) / 180
  const v = [Math.sin(a), Math.cos(a), 0.35]
  const length = Math.hypot(v[0]!, v[1]!, v[2]!)
  return [v[0]! / length, v[1]! / length, v[2]! / length]
}

/** 灯的 视图 × 投影：站在 6 × toLight 处看原点，正交，半宽 4.5（同第 40 课）。 */
export function lightViewProjection(toLight: Vec3Tuple): number[] {
  const view = mat4.create()
  const projection = mat4.create()
  const eye: [number, number, number] = [toLight[0] * 6, toLight[1] * 6, toLight[2] * 6]
  mat4.lookAt(view, eye, [0, 0, 0], [0, 1, 0])
  mat4.ortho(projection, -4.5, 4.5, -4.5, 4.5, 0.1, 15)
  return Array.from(mat4.multiply(mat4.create(), projection, view))
}

const DEPTH_VERTEX = `attribute vec3 position;
uniform mat4 uModel;
uniform mat4 uLightVP;
void main() { gl_Position = uLightVP * uModel * vec4(position, 1.0); }`

/** 把 0..1 的深度拆进 RGBA 四个 8 位通道（第 27、40 课） */
const DEPTH_FRAGMENT = `precision highp float;
void main() {
  vec4 p = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * gl_FragCoord.z);
  gl_FragColor = p - p.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
}`

const LIT_VERTEX = `attribute vec3 position;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uLightVP;
varying vec4 vLightClip;
void main() {
  vec4 world = uModel * vec4(position, 1.0);
  vLightClip = uLightVP * world;
  gl_Position = uProjection * uView * world;
}`

const LIT_FRAGMENT = `precision highp float;
uniform sampler2D uShadowMap;
uniform vec3 uToLight;
uniform vec3 uColor;
uniform float uShadowBias;
varying vec4 vLightClip;
void main() {
  vec3 p = vLightClip.xyz / vLightClip.w * 0.5 + 0.5;
  float stored = dot(texture2D(uShadowMap, p.xy),
    vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
  float visible = p.z - uShadowBias <= stored ? 1.0 : 0.0;
  float diffuse = max(dot(vec3(0.0, 1.0, 0.0), uToLight), 0.0);
  gl_FragColor = vec4(uColor * (0.25 + 0.75 * diffuse * visible), 1.0);
}`

/** 内建映射：这三个 uniform 的值由 Backend 每次 draw 从 submission 里取（第 11 课） */
const BUILT_INS = { modelMatrix: 'uModel', viewMatrix: 'uView', projectionMatrix: 'uProjection' } as const

export function positions(data: readonly number[]): Geometry {
  return new Geometry({
    attributes: { position: new VertexAttribute({ data: new Float32Array(data), itemSize: 3 }) }
  })
}

export const FLOOR = [-3, 0, -3, 3, 0, -3, 3, 0, 3, -3, 0, -3, 3, 0, 3, -3, 0, 3]
export const TRIANGLE = [-0.9, 1.2, -0.6, 0.9, 1.2, -0.6, 0, 1.2, 0.9]

/**
 * 第一遍：把物体画进阴影图，再把这一帧灯的矩阵写进参数块。
 * 它拥有阴影图（RenderTarget）、参数块和画深度用的材质；dispose 时一起释放。
 */
export class ShadowMapPassV1 implements RenderPass {
  public readonly name = 'ShadowMapPassV1'
  public readonly target = new RenderTarget(
    {
      width: 512,
      height: 512,
      colors: [{ format: 'rgba8', sampler: { minFilter: 'nearest', magFilter: 'nearest' } }],
      depth: { format: 'depth16' }
    },
    { label: 'sun shadow map' }
  )
  /** 接收阴影的材质借用它；名字只有这一个来源（第 45 课 C） */
  public readonly block = new ParameterBlock({
    label: 'sun shadow',
    entries: {
      uLightVP: { type: 'mat4', value: new Array<number>(16).fill(0) },
      uShadowMap: { type: 'texture2D', value: this.target.getColorAttachment(0) },
      uShadowBias: { type: 'float', value: 0.005 }
    }
  })
  private readonly depthShader = new ShaderModule({
    name: 'shadow depth',
    language: 'glsl-es-100',
    vertexSource: DEPTH_VERTEX,
    fragmentSource: DEPTH_FRAGMENT,
    builtInUniforms: { modelMatrix: 'uModel' }
  })
  /** 深度编码成 RGBA 是数据，不能抖动（Material 的 dither 注释） */
  public readonly depthMaterial = new Material({
    shaderModule: this.depthShader,
    state: { cullMode: 'none', dither: false },
    blocks: [this.block]
  })

  constructor(private readonly toLight: Vec3Tuple) {}

  execute(context: RenderPassContext): undefined {
    const { backend, view, renderList } = context
    // 发布：这一帧灯的矩阵。只有这个 Pass 写块（第 45 课的合同）
    this.block.set('uLightVP', { type: 'mat4', value: lightViewProjection(this.toLight) })
    backend.withRenderSurface(
      { surface: { kind: 'render-target', target: this.target }, clear: { color: [1, 1, 1, 1], depth: 1 } },
      () => {
        for (const item of renderList.opaque) {
          // 同一个物体、同一份矩阵快照，只把材质换成画深度的那个
          const depthItem = { geometry: item.geometry, material: this.depthMaterial, worldMatrix: item.worldMatrix }
          backend.draw({ item: depthItem, view })
        }
        return undefined
      }
    )
    return undefined
  }

  dispose(): void {
    this.depthMaterial.dispose()
    this.depthShader.dispose()
    this.block.dispose()
    this.target.dispose()
  }
}

export interface ShadowScene {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  readonly floor: Mesh
  readonly triangle: Mesh
  readonly litShader: ShaderModule
  readonly floorMaterial: Material
  readonly triangleMaterial: Material
  readonly toLight: Vec3Tuple
}

/** 两个材质共用一个 shader，各自带颜色，都借用阴影块。omitTriangleColor 只给卡片 C 用。 */
export function buildShadowScene(
  aspect: number,
  block: ParameterBlock,
  toLight: Vec3Tuple,
  omitTriangleColor = false,
  brokenTriangle = false
): ShadowScene {
  const scene = new Scene()
  const litShader = scene.retain(
    new ShaderModule({
      name: 'lit with shadow',
      language: 'glsl-es-100',
      vertexSource: LIT_VERTEX,
      fragmentSource: LIT_FRAGMENT,
      builtInUniforms: BUILT_INS
    })
  )
  const material = (color: Vec3Tuple | null): Material =>
    scene.retain(
      new Material({
        shaderModule: litShader,
        state: { cullMode: 'none' }, // 第 40 课没有剔除；这两个面从上往下看是顺时针
        parameters: {
          ...(color === null ? {} : { uColor: { type: 'vec3' as const, value: color } }),
          uToLight: { type: 'vec3', value: toLight }
        },
        blocks: [block]
      })
    )
  const floorMaterial = material([0.75, 0.75, 0.75])
  const triangleMaterial = brokenTriangle
    ? scene.retain(
        new Material({
          // 少一个分号，编译不过；状态故意和地面不同：剔除背面、深度永远通过、不抖动
          shaderModule: scene.retain(
            new ShaderModule({
              name: 'broken',
              language: 'glsl-es-100',
              vertexSource: LIT_VERTEX,
              fragmentSource: 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0) }',
              builtInUniforms: BUILT_INS
            })
          ),
          state: { cullMode: 'back', depthFunction: 'always', dither: false }
        })
      )
    : material(omitTriangleColor ? null : [0.95, 0.55, 0.15])
  const floor = new Mesh(scene.retain(positions(FLOOR)), floorMaterial)
  const triangle = new Mesh(scene.retain(positions(TRIANGLE)), triangleMaterial)
  scene.add(floor)
  scene.add(triangle)

  const camera = new PerspectiveCamera({ fovY: Math.PI / 4, aspect, near: 0.1, far: 50 })
  camera.transform.setPosition([0, 4.5, 6.5])
  camera.transform.setRotation([-Math.atan2(4.1, 6.5), 0, 0]) // 看向 (0, 0.4, 0)
  return { scene, camera, floor, triangle, litShader, floorMaterial, triangleMaterial, toLight }
}

// ---------------- 接起来：一次画一帧 ----------------

export interface FrameRecord {
  readonly frameNumber: number
  readonly calls: readonly GLCall[]
  readonly error: Error | null
}

export interface DemoOptions {
  /** 换一种 Backend（卡片 D）。默认是真实的 WebGL1Backend。 */
  readonly Backend?: new (canvas: HTMLCanvasElement, label?: string) => WebGL1Backend
  /** 插在两个 Pass 中间的 Pass（卡片 E）。 */
  readonly between?: RenderPass
  /** 三角形的材质不给 uColor（卡片 C）。 */
  readonly omitTriangleColor?: boolean
  /** 三角形换成编译不过的 shader（卡片 D）。 */
  readonly brokenTriangle?: boolean
  /** 不要第一遍阴影（卡片 D 只看第二遍）。 */
  readonly withoutShadowPass?: boolean
}

export interface Demo {
  readonly gl: WebGLRenderingContext
  readonly backend: WebGL1Backend
  readonly recorder: GLRecorder
  readonly shadowPass: ShadowMapPassV1
  readonly world: ShadowScene
  /** 画一帧，交回这一帧的全部 GL 调用；出错时不往外抛，记在 error 里。 */
  frame(): FrameRecord
  dispose(): void
}

export function createDemo(canvas: HTMLCanvasElement, options: DemoOptions = {}): Demo {
  // 先拿到 context 套上记账，再交给 Backend：Backend 构造时就会查扩展、读能力
  const gl = canvas.getContext('webgl', { alpha: false, depth: true })
  if (gl === null) throw new Error('这个浏览器拿不到 WebGL context')
  const recorder = recordGL(gl)
  const BackendClass = options.Backend ?? WebGL1Backend
  const backend = recorder.within('构造', () => new BackendClass(canvas, 'lesson47'))
  tagDrawSteps(backend, recorder)

  const toLight = toLightAt(35)
  const shadowPass = new ShadowMapPassV1(toLight)
  const world = buildShadowScene(
    canvas.width / canvas.height,
    shadowPass.block,
    toLight,
    options.omitTriangleColor,
    options.brokenTriangle
  )

  const pipeline = new RenderPipeline()
  if (!options.withoutShadowPass) pipeline.addPass(tagPass(recorder, shadowPass))
  if (options.between) pipeline.addPass(tagPass(recorder, options.between))
  pipeline.addPass(tagPass(recorder, new ForwardPass()))
  const renderer = new Renderer(backend, pipeline, new RenderListBuilder())

  let frameNumber = 0
  return {
    gl,
    backend,
    recorder,
    shadowPass,
    world,
    frame() {
      frameNumber += 1
      recorder.reset()
      const view: RenderView = {
        scene: world.scene,
        camera: world.camera,
        frame: {
          frameNumber,
          timeSeconds: frameNumber / 60,
          deltaSeconds: 1 / 60,
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          pixelRatio: 1
        }
      }
      let error: Error | null = null
      try {
        renderer.render(view)
      } catch (caught) {
        error = caught instanceof Error ? caught : new Error(String(caught))
      }
      // 交回拷贝：这一帧之后（比如恢复 context 时）发出的调用不能混进来
      return { frameNumber, calls: recorder.calls.slice(), error }
    },
    dispose() {
      try {
        renderer.dispose()
      } finally {
        world.scene.dispose()
      }
    }
  }
}

// ---------------- 卡片 D：先设状态、后查表 ----------------

/**
 * 只为卡片 D：照抄真实 draw，只把 applyDrawState 挪到 programs.get 前面。
 * 用到的私有成员都是真实 WebGL1Backend 上的同名成员。
 */
export class StateFirstBackend extends WebGL1Backend {
  override draw(submission: Parameters<RenderBackend['draw']>[0]): void {
    const self = this as unknown as {
      gl: WebGLRenderingContext
      requireGeneration(operation: string): {
        scope: { assertDrawable(): void }
        state: { useProgram(program: WebGLProgram): void }
        resources: {
          programs: { get(shader: ShaderModule): { program: WebGLProgram } }
          geometries: {
            get(geometry: Geometry): {
              indexBuffer: WebGLBuffer | null
              indexType: number | null
              primitiveMode: number
              drawCount: number
            }
          }
          vertexInputs: { bind(geometry: Geometry, buffers: unknown, program: unknown): void }
        }
        uniforms: {
          prepare(program: unknown, submission: unknown): unknown
          upload(commands: unknown): void
        }
      }
      applyDrawState(material: Material, state: unknown): void
      assertCurrentDraw(generation: unknown): void
    }
    const generation = self.requireGeneration('draw')
    generation.scope.assertDrawable()
    const { geometry, material } = submission.item

    self.applyDrawState(material, generation.state) // ← 挪到最前面：先设深度、剔除、抖动

    const program = generation.resources.programs.get(material.shaderModule)
    const buffers = generation.resources.geometries.get(geometry)
    const commands = generation.uniforms.prepare(program, submission)
    self.assertCurrentDraw(generation)
    generation.state.useProgram(program.program)
    generation.uniforms.upload(commands)
    generation.resources.vertexInputs.bind(geometry, buffers, program)
    self.assertCurrentDraw(generation)
    if (buffers.indexBuffer === null) self.gl.drawArrays(buffers.primitiveMode, 0, buffers.drawCount)
    else self.gl.drawElements(buffers.primitiveMode, buffers.drawCount, buffers.indexType!, 0)
    self.assertCurrentDraw(generation)
  }
}

/** 卡片 B：忘了进门，直接 draw。 */
export class NoScopePassV1 implements RenderPass {
  public readonly name = 'NoScopePassV1'
  execute(context: RenderPassContext): undefined {
    for (const item of context.renderList.opaque) context.backend.draw({ item, view: context.view })
    return undefined
  }
  dispose(): void {}
}

/** 卡片 E：在两个 Pass 之间让设备丢失；只丢第一次，恢复以后照常画。 */
export class LoseContextPassV1 implements RenderPass {
  public readonly name = 'LoseContextPassV1'
  private lost = false
  constructor(private readonly extension: WEBGL_lose_context) {}
  execute(): undefined {
    if (!this.lost) {
      this.lost = true
      this.extension.loseContext()
    }
    return undefined
  }
  dispose(): void {}
}

/**
 * 卡片 A：把地面和三角形换成「内容相同的新 Geometry」，材质不变。
 * 旧的 Mesh 从场景里拿掉，旧 Geometry 仍由 Scene 登记着，不释放。
 */
export function swapInEqualGeometries(world: ShadowScene): { floor: Mesh; triangle: Mesh } {
  world.scene.remove(world.floor)
  world.scene.remove(world.triangle)
  const floor = new Mesh(world.scene.retain(positions(FLOOR)), world.floorMaterial)
  const triangle = new Mesh(world.scene.retain(positions(TRIANGLE)), world.triangleMaterial)
  world.scene.add(floor)
  world.scene.add(triangle)
  return { floor, triangle }
}
