import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebGL1ResourceManager } from '@/rendering/backend/webgl1/WebGL1ResourceManager'
import type { WebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
import { WebGLBackendDisposedError, WebGLContextLostError } from '@/rendering/core/errors'
import { CubeTexture } from '@/rendering/resources/CubeTexture'
import { Geometry } from '@/rendering/resources/Geometry'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { createFakeWebGL1TextureContext } from '../fakes/createFakeWebGL1TextureContext'
import { createFakeWebGL1VertexInputContext } from '../fakes/createFakeWebGL1VertexInputContext'

/**
 * 合并前两批协议 fake，向真实 Managers 提供同一个测试 context。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 *
 * 顶点状态和纹理状态分别保存在各自 fake 内；共享 lost/error 查询入口。
 * getParameter 必须按 pname 分派，不能用对象展开覆盖其中一类查询。
 * 这些 fake 不执行 shader 或光栅化，不能代替 Task 15 浏览器测试。
 */
function setup(withOES = true) {
  const vertex = createFakeWebGL1VertexInputContext(withOES)
  const texture = createFakeWebGL1TextureContext()
  const vertexParameters: readonly number[] = [
    vertex.gl.CURRENT_PROGRAM,
    vertex.gl.ARRAY_BUFFER_BINDING,
    vertex.gl.ELEMENT_ARRAY_BUFFER_BINDING,
    vertex.oes.VERTEX_ARRAY_BINDING_OES
  ]

  const gl = {
    ...vertex.gl,
    ...texture.gl,
    isContextLost: () => vertex.gl.isContextLost() || texture.gl.isContextLost(),
    getError: () => {
      const error = vertex.gl.getError()
      return error !== vertex.gl.NO_ERROR ? error : texture.gl.getError()
    },
    getParameter: (name: number): unknown =>
      vertexParameters.includes(name) ? vertex.gl.getParameter(name) : texture.gl.getParameter(name)
  } as WebGLRenderingContext

  const capabilities: WebGL1Capabilities = {
    ...vertex.capabilities,
    drawBuffers: null,
    depthTexture: null,
    textureFloat: null,
    textureFloatLinear: null,
    maxTextureUnits: 8
  }
  const invalidateState = vi.fn(() => undefined)
  const resources = new WebGL1ResourceManager(gl, capabilities, { invalidateState })

  // 生命周期测试需要观察关闭后已有子 Manager 的状态，故预先借用引用。
  const members = {
    vertexInputs: resources.vertexInputs,
    renderTargets: resources.renderTargets,
    cubeTextures: resources.cubeTextures,
    geometries: resources.geometries,
    programs: resources.programs
  }

  return { vertex, texture, gl, capabilities, invalidateState, resources, members }
}

/** 同名 ShaderModule 故意使用相同源码，检查缓存是否误用 name 或源码字符串。 */
function shader(): ShaderModule {
  return new ShaderModule({
    name: 'same-name',
    language: 'glsl-es-100',
    vertexSource: 'attribute vec3 position; void main() { gl_Position = vec4(position, 1.0); }',
    fragmentSource: 'precision mediump float; void main() { gl_FragColor = vec4(1.0); }'
  })
}

/** 一个 position VBO 和一个 EBO；删除时应恰好出现两次 deleteBuffer。 */
function geometry(): Geometry {
  return new Geometry({
    attributes: {
      position: new VertexAttribute({ data: new Float32Array(9), itemSize: 3 })
    },
    indices: new Uint16Array([0, 1, 2])
  })
}

/** 一个像素的六面数据，不依赖 DOM 图片加载或 sRGB 扩展。 */
function cube(): CubeTexture {
  const face = () => ({ width: 1, height: 1, data: new Uint8Array([1, 2, 3, 255]) })
  return new CubeTexture({
    label: 'same-label',
    storage: { format: 'rgba', type: 'uint8' },
    colorSpace: 'linear',
    source: { kind: 'data', faces: [face(), face(), face(), face(), face(), face()] }
  })
}

/** 让五个 Manager 都真正拥有或借用资源，避免空缓存让释放测试虚假通过。 */
function populate(f: ReturnType<typeof setup>) {
  const cpu = {
    geometry: geometry(),
    shader: shader(),
    cube: cube(),
    target: new RenderTarget({
      width: 4,
      height: 4,
      colors: [{ format: 'rgba8' }],
      depth: { format: 'depth16' }
    })
  }
  const gpu = {
    geometry: f.members.geometries.get(cpu.geometry),
    program: f.members.programs.get(cpu.shader),
    cube: f.members.cubeTextures.get(cpu.cube),
    target: f.members.renderTargets.get(cpu.target)
  }
  f.members.vertexInputs.bind(cpu.geometry, gpu.geometry, gpu.program)
  return { cpu, gpu }
}

afterEach(() => vi.restoreAllMocks())

describe('WebGL1ResourceManager coordination', () => {
  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   *
   * 普通 listener 可以早于或晚于 Manager 注册；删除屏障必须来自 beforeDelete 接线，
   * 不能依靠“先注册一个 VAO listener”碰巧得到正确顺序。
   */
  it.each(['before', 'after'] as const)(
    'Geometry listener 在 %s 时仍先删 VAO 再删 buffers',
    (when) => {
      const f = setup()
      const cpu = geometry()
      const observer = () => f.vertex.events.push('observer')
      if (when === 'before') cpu.onDispose(observer)

      const gpu = f.members.geometries.get(cpu)
      const program = f.members.programs.get(shader())
      f.members.vertexInputs.bind(cpu, gpu, program)
      if (when === 'after') cpu.onDispose(observer)
      f.vertex.events.length = 0

      cpu.dispose()

      expect(f.vertex.events).toEqual(
        when === 'before'
          ? ['observer', 'delete-vao', 'delete-buffer', 'delete-buffer']
          : ['delete-vao', 'delete-buffer', 'delete-buffer', 'observer']
      )
      expect(f.vertex.readCurrent().vao).toBeNull()
      expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()
      f.resources.dispose()
    }
  )

  /** Program 删除必须先清理所有与真实 program 关联的 VAO，但不删除 Geometry。 */
  it('ShaderModule 释放时先删 VAO 再删 program', () => {
    const f = setup()
    const { cpu, gpu } = populate(f)
    f.gl.useProgram(gpu.program.program)
    f.vertex.events.length = 0

    cpu.shader.dispose()

    expect(f.vertex.events).toEqual(['delete-vao', 'delete-program'])
    expect(f.gl.getParameter(f.gl.CURRENT_PROGRAM)).toBeNull()
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(cpu.geometry.disposed).toBe(false)
    f.resources.dispose()
  })

  /** manual 路径没有 VAO；同一个删除屏障必须先禁用输入并解除 EBO。 */
  it('无 OES 扩展时先解除手动顶点输入，再删除 Geometry buffers', () => {
    const f = setup(false)
    const { cpu } = populate(f)
    const originalDelete = f.vertex.calls.deleteBuffer.getMockImplementation()!
    f.vertex.calls.deleteBuffer.mockImplementation((buffer) => {
      expect(f.vertex.readCurrent().enabled).toEqual([])
      expect(f.vertex.readCurrent().indexBuffer).toBeNull()
      originalDelete(buffer)
    })

    cpu.geometry.dispose()

    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.vertex.oes.createVertexArrayOES).not.toHaveBeenCalled()
    f.resources.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   *
   * 故意让依赖清理在执行前失败；少接 beforeDelete 或忽略异常都必须使本测试失败。
   * 直接调用 Manager.release，不借此更改 Resource listener 的异常传播契约。
   */
  it.each(['geometry', 'program'] as const)('%s 删除屏障失败时保留 GPU 资源供重试', (kind) => {
    const f = setup()
    const { cpu } = populate(f)
    const failure = new Error('injected VAO cleanup failure')
    f.vertex.oes.deleteVertexArrayOES.mockImplementationOnce(() => {
      throw failure
    })
    const release = () => {
      if (kind === 'geometry') f.members.geometries.release(cpu.geometry)
      else f.members.programs.release(cpu.shader)
    }

    expect(release).toThrow(failure)
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()

    release()

    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(kind === 'geometry' ? 2 : 0)
    expect(f.vertex.calls.deleteProgram).toHaveBeenCalledTimes(kind === 'program' ? 1 : 0)
    f.resources.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][vao-geometry-program-key]
   *
   * 相同 name、相同源码、不同 CPU 对象不合并；同一 Geometry 的两个实际 program
   * 也不能复用同一个 VAO。删除其中一个 program 不应驱逐另一个 program 的布局。
   */
  it('保留对象身份及 Geometry 与真实 program 的组合键', () => {
    const f = setup()
    const a = geometry()
    const b = geometry()
    const shaderA = shader()
    const shaderB = shader()
    const ga = f.members.geometries.get(a)
    const gb = f.members.geometries.get(b)
    const pa = f.members.programs.get(shaderA)
    const pb = f.members.programs.get(shaderB)
    expect(ga).not.toBe(gb)
    expect(pa.program).not.toBe(pb.program)
    expect(f.members.programs.get(shaderA)).toBe(pa)

    f.members.vertexInputs.bind(a, ga, pa)
    f.members.vertexInputs.bind(a, ga, pb)
    const retainedVAO = f.vertex.readCurrent().vao
    f.members.vertexInputs.bind(b, gb, pa)
    expect(f.vertex.oes.createVertexArrayOES).toHaveBeenCalledTimes(3)

    f.members.programs.release(shaderA)
    expect(f.vertex.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(2)
    f.members.vertexInputs.bind(a, ga, pb)
    expect(f.vertex.readCurrent().vao).toBe(retainedVAO)
    expect(f.vertex.oes.createVertexArrayOES).toHaveBeenCalledTimes(3)
    f.resources.dispose()
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-manager-disposal]
   *
   * spy 保留真实 dispose；既检查协调顺序，也检查真实 GPU 删除和 CPU 所有权。
   * 将顺序改成 geometries 在 vertexInputs 前，或重复释放，都应失败。
   */
  it('固定顺序关闭五个 Manager，重复 dispose 不再删除，不释放 CPU 资源', () => {
    const f = setup()
    const { cpu } = populate(f)
    const order: string[] = []
    for (const [name, member] of Object.entries(f.members)) {
      const original = member.dispose.bind(member)
      vi.spyOn(member, 'dispose').mockImplementation(() => {
        order.push(name)
        original()
      })
    }

    f.resources.dispose()
    f.resources.dispose()

    expect(order).toEqual([
      'vertexInputs',
      'renderTargets',
      'cubeTextures',
      'geometries',
      'programs'
    ])
    expect(f.vertex.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(1)
    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
    expect(f.texture.api.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(f.texture.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
    expect(f.texture.api.deleteTexture).toHaveBeenCalledTimes(2)
    for (const resource of Object.values(cpu)) expect(resource.disposed).toBe(false)

    // 关闭后 CPU 再释放，不应再次回调这些已经取消订阅的 Managers。
    const releases = [
      vi.spyOn(f.members.geometries, 'release'),
      vi.spyOn(f.members.programs, 'release'),
      vi.spyOn(f.members.cubeTextures, 'release'),
      vi.spyOn(f.members.renderTargets, 'release')
    ]
    for (const resource of Object.values(cpu)) resource.dispose()
    for (const release of releases) expect(release).not.toHaveBeenCalled()
    expect(() => f.resources.geometries).toThrow(WebGLBackendDisposedError)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-manager-disposal]
   *
   * 注入“进入该步骤前抛错”，验证协调层停止、关闭入口并从失败步骤重试。
   * 不声称这可以回滚任意子 Manager 内部已经执行的 GL 操作。
   */
  it('中途清理失败不越过屏障，重试不重复已完成步骤', () => {
    const f = setup()
    populate(f)
    const vertexDispose = vi.spyOn(f.members.vertexInputs, 'dispose')
    const failure = new Error('injected render target cleanup failure')
    vi.spyOn(f.members.renderTargets, 'dispose').mockImplementationOnce(() => {
      throw failure
    })

    expect(() => f.resources.dispose()).toThrow(failure)
    expect(vertexDispose).toHaveBeenCalledTimes(1)
    expect(f.texture.api.deleteTexture).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    expect(() => f.resources.programs).toThrow(WebGLBackendDisposedError)

    f.resources.dispose()

    expect(vertexDispose).toHaveBeenCalledTimes(1)
    expect(f.texture.api.deleteTexture).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
  })

  /** 同步重入外层 dispose 时不能重新进入当前步骤；这不是异步并发锁。 */
  it('dispose 同步重入不会重复删除', () => {
    const f = setup()
    populate(f)
    const original = f.members.vertexInputs.dispose.bind(f.members.vertexInputs)
    vi.spyOn(f.members.vertexInputs, 'dispose').mockImplementation(() => {
      f.resources.dispose()
      original()
    })

    f.resources.dispose()

    expect(f.vertex.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(1)
    expect(f.vertex.calls.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(f.vertex.calls.deleteProgram).toHaveBeenCalledTimes(1)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
   *
   * 全部失效必须取消全部 CPU 订阅，且没有 GL delete。
   * 即使 gl.isContextLost() 后来变回 false，旧一代入口也不能复活。
   */
  it.each([true, false])('context lost 使五个 Manager 全部失效，OES=%s', (withOES) => {
    const f = setup(withOES)
    const { cpu, gpu } = populate(f)
    const invalidations = Object.values(f.members).map((member) =>
      vi.spyOn(member, 'invalidateForContextLoss')
    )
    const releases = [
      vi.spyOn(f.members.geometries, 'release'),
      vi.spyOn(f.members.programs, 'release'),
      vi.spyOn(f.members.cubeTextures, 'release'),
      vi.spyOn(f.members.renderTargets, 'release')
    ]
    f.vertex.setLost(true)
    f.texture.setLost(true)

    f.resources.invalidateForContextLoss()
    f.resources.invalidateForContextLoss()
    for (const invalidate of invalidations) expect(invalidate).toHaveBeenCalledTimes(1)

    f.vertex.setLost(false)
    f.texture.setLost(false)
    expect(() => f.resources.programs).toThrow(WebGLContextLostError)
    expect(() => f.members.programs.get(cpu.shader)).toThrow(WebGLContextLostError)
    expect(() => f.members.geometries.get(cpu.geometry)).toThrow(WebGLContextLostError)
    expect(() => f.members.cubeTextures.get(cpu.cube)).toThrow(WebGLContextLostError)
    expect(() => f.members.renderTargets.get(cpu.target)).toThrow(WebGLContextLostError)
    expect(() => f.members.vertexInputs.bind(cpu.geometry, gpu.geometry, gpu.program)).toThrow(
      WebGLContextLostError
    )

    for (const resource of Object.values(cpu)) resource.dispose()
    for (const release of releases) expect(release).not.toHaveBeenCalled()
    f.resources.dispose()
    expect(f.vertex.oes.deleteVertexArrayOES).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    expect(f.texture.deleted).toEqual([])
  })

  /** DOM lost 事件可能尚未到达；入口发现物理 lost 时也应失效整个 Manager 集合。 */
  it('无需等待 DOM 事件，访问入口时发现 lost 就整体失效', () => {
    const f = setup()
    populate(f)
    const invalidate = vi.spyOn(f.members.renderTargets, 'invalidateForContextLoss')
    f.vertex.setLost(true)

    expect(() => f.resources.geometries).toThrow(WebGLContextLostError)

    expect(invalidate).toHaveBeenCalledTimes(1)
    f.resources.dispose()
    expect(f.texture.deleted).toEqual([])
  })

  /** State 回调仅传播失效信号；协调层不偷偷创建第二份 State 缓存。 */
  it('所有 Manager 的状态失效都到达同一个 State 回调', () => {
    const f = setup()
    for (const member of Object.values(f.members)) {
      f.invalidateState.mockClear()
      member.invalidateForContextLoss()
      expect(f.invalidateState).toHaveBeenCalledTimes(1)
    }
    f.resources.dispose()
  })

  /** 同一 CPU 资源可供两个 context 使用；关闭 A 不能删除 B 的 GPU 表示。 */
  it('两个协调器不通过静态注册表共享 GPU 资源或生命周期', () => {
    const a = setup()
    const b = setup()
    const { cpu, gpu } = populate(a)
    const bGeometry = b.members.geometries.get(cpu.geometry)
    const bProgram = b.members.programs.get(cpu.shader)
    const bCube = b.members.cubeTextures.get(cpu.cube)
    const bTarget = b.members.renderTargets.get(cpu.target)
    b.members.vertexInputs.bind(cpu.geometry, bGeometry, bProgram)
    expect(bGeometry).not.toBe(gpu.geometry)
    expect(bProgram.program).not.toBe(gpu.program.program)
    expect(bCube.handle).not.toBe(gpu.cube.handle)
    expect(bTarget.framebuffer).not.toBe(gpu.target.framebuffer)

    a.resources.dispose()

    expect(b.members.geometries.get(cpu.geometry)).toBe(bGeometry)
    expect(b.members.programs.get(cpu.shader)).toBe(bProgram)
    expect(b.members.cubeTextures.get(cpu.cube)).toBe(bCube)
    expect(b.members.renderTargets.get(cpu.target)).toBe(bTarget)
    expect(b.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(b.texture.deleted).toEqual([])
    for (const resource of Object.values(cpu)) expect(resource.disposed).toBe(false)
    b.resources.dispose()
  })

  /** 构造只组装对象，不提前创建 GPU 资源；已经 lost 的 context 则应直接拒绝。 */
  it('懒创建 GPU 资源，并拒绝在已丢失的 context 上组装新实例', () => {
    const f = setup()
    expect(f.vertex.calls.createProgram).not.toHaveBeenCalled()
    expect(f.vertex.calls.createBuffer).not.toHaveBeenCalled()
    expect(f.vertex.oes.createVertexArrayOES).not.toHaveBeenCalled()
    expect(f.texture.api.createTexture).not.toHaveBeenCalled()
    expect(f.texture.api.createFramebuffer).not.toHaveBeenCalled()
    expect(f.texture.api.createRenderbuffer).not.toHaveBeenCalled()
    f.vertex.setLost(true)

    expect(
      () =>
        new WebGL1ResourceManager(f.gl, f.capabilities, {
          invalidateState: f.invalidateState
        })
    ).toThrow(WebGLContextLostError)

    f.resources.dispose()
  })

  /**
   * 恢复后不复活旧 Managers，而是用新的能力快照组装新一代。
   * fake 仅验证懒重建和对象隔离；真实恢复事件及扩展重新探测属于 Task 15。
   */
  it('新一代可从仍存活的 CPU 数据重建，旧一代仍拒绝工作', () => {
    const f = setup()
    const { cpu, gpu } = populate(f)
    f.vertex.setLost(true)
    f.texture.setLost(true)
    f.resources.invalidateForContextLoss()
    f.vertex.setLost(false)
    f.texture.setLost(false)
    const freshCapabilities = { ...f.capabilities }
    const next = new WebGL1ResourceManager(f.gl, freshCapabilities, {
      invalidateState: f.invalidateState
    })

    expect(() => f.resources.programs).toThrow(WebGLContextLostError)
    expect(next.programs.get(cpu.shader).program).not.toBe(gpu.program.program)
    expect(next.geometries.get(cpu.geometry)).not.toBe(gpu.geometry)
    expect(next.cubeTextures.get(cpu.cube).handle).not.toBe(gpu.cube.handle)
    expect(next.renderTargets.get(cpu.target).framebuffer).not.toBe(gpu.target.framebuffer)

    next.dispose()
    f.resources.dispose()
    for (const resource of Object.values(cpu)) expect(resource.disposed).toBe(false)
  })

  /** 前一步返回时 context 已 lost，后续步骤只能丢弃记录，不能继续发送 GL 删除。 */
  it('整体关闭过程中发生 lost 时，剩余资源转为无 GL 清理', () => {
    const f = setup()
    populate(f)
    const original = f.members.vertexInputs.dispose.bind(f.members.vertexInputs)
    vi.spyOn(f.members.vertexInputs, 'dispose').mockImplementation(() => {
      original()
      f.vertex.setLost(true)
      f.texture.setLost(true)
    })

    f.resources.dispose()

    expect(f.vertex.oes.deleteVertexArrayOES).toHaveBeenCalledTimes(1)
    expect(f.vertex.calls.deleteBuffer).not.toHaveBeenCalled()
    expect(f.vertex.calls.deleteProgram).not.toHaveBeenCalled()
    expect(f.texture.deleted).toEqual([])
  })
})
