import { assertTextureOperation } from './WebGL1TextureUploadSupport'
import { assertNever } from '@/errors/helper/helpers'
import {
  CleanupFailureError,
  ResourceDisposedError,
  UnsupportedIndexTypeError,
  WebGLBackendDisposedError,
  WebGLContextLostError,
  WebGLResourceCreationError
} from '@/rendering/core/errors'
import { WebGLOperationError } from '@/rendering/core/errors/WebGLOperationError'
import { requireNonNull } from '@/rendering/core/requireNonNull'
import type { Geometry, IndexData, PrimitiveTopology } from '@/rendering/resources/Geometry'
import type { VertexAttributeData } from '@/rendering/resources/VertexAttribute'
import type { WebGL1Capabilities } from './WebGL1Capabilities'

/**
 * 一个紧密排列的属性 buffer 及其读取格式。
 *
 * @remarks
 * 这里描述 buffer 内部怎样存储数据，不描述 shader 的 attribute location。
 * location 由后续顶点输入模块结合具体 program 确定。
 */
export interface WebGL1AttributeResource {
  readonly buffer: WebGLBuffer
  readonly type: number
  readonly itemSize: number
  readonly normalized: boolean
}

/**
 * 当前 context 的 Geometry 表示。
 *
 * @remarks
 * 所有 buffer 均由 GeometryManager 拥有，调用者只借用。
 * ReadonlyMap 是 TypeScript 约束，不是运行时深冻结。
 */
export interface WebGL1GeometryResource {
  readonly attributes: ReadonlyMap<string, WebGL1AttributeResource>
  readonly indexBuffer: WebGLBuffer | null
  readonly indexType: number | null
  readonly drawCount: number
  readonly primitiveMode: number
}

/** 只允许同步内部协作，不能传入异步任务。 */
export interface WebGL1GeometryManagerHooks {
  /** 直接绑定或删除 buffer 后使 State 缓存失效；不得发 GL 命令或抛错。 */
  readonly invalidateState: () => undefined

  /** 接入 vertexInputs.releaseGeometry(geometry)，必须先于删除 buffer。 */
  readonly beforeDelete?: (geometry: Geometry) => undefined
}

/** Manager 私有记录：对外 GPU 结果，以及取消 CPU 生命周期订阅的方法。 */
interface GeometryEntry {
  readonly resource: WebGL1GeometryResource
  readonly unsubscribe: () => void
  /** 停止借用与清理完成分开；失败后仍保留该记录。 */
  closing: boolean
  dependencyReleased: boolean
  readonly buffers: readonly WebGLBuffer[]
  nextBufferIndex: number
}

/**
 * 每个 context 独立持有静态 Geometry 的 GPU 缓存。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][webgl-manager-context-ownership]
 *
 * 不接收 Mesh/Material，不决定 attribute location，不创建 VAO，也不执行 draw。
 * capabilities 必须来自同一 context 的当前代；context 恢复后创建新的 Manager。
 */
export class WebGL1GeometryManager {
  private readonly gl: WebGLRenderingContext
  private readonly capabilities: Pick<WebGL1Capabilities, 'elementIndexUint'>
  private readonly hooks: WebGL1GeometryManagerHooks

  private readonly entries = new Map<Geometry, GeometryEntry>()
  private readonly releasing = new Set<Geometry>()

  /** 已关闭正常服务；不等于所有清理工作均已成功结束。 */
  private disposedValue = false

  /** 一旦失效，不允许此实例在 context 恢复后重新使用旧记录。 */
  private lostValue = false

  /** 防止 dispose 在同步回调中递归执行。 */
  private disposing = false

  constructor(
    gl: WebGLRenderingContext,
    capabilities: Pick<WebGL1Capabilities, 'elementIndexUint'>,
    hooks: WebGL1GeometryManagerHooks
  ) {
    this.gl = gl
    this.capabilities = capabilities
    this.hooks = hooks
  }

  /**
   * 创建或借用静态 buffers；CPU 快照始终保持不变。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-resource-transaction]
   *
   * 所有 buffer 创建、上传、绑定恢复成功后才发布缓存。
   * 任一步失败都清理本次已创建的 buffers；context lost 时只放弃旧代记录。
   */
  get(geometry: Geometry): WebGL1GeometryResource {
    this.assertAvailable('get geometry')

    if (geometry.disposed) throw new ResourceDisposedError('Geometry')

    if (this.releasing.has(geometry)) {
      throw new WebGLOperationError('get geometry', 'Geometry', 'release is in progress')
    }

    const cached = this.entries.get(geometry)
    if (cached?.closing)
      throw new WebGLOperationError('get resource', 'Geometry', 'cleanup is pending')
    if (cached !== undefined) return cached.resource

    // 先做 CPU 预检；Uint32 无法降级时，一个 GPU buffer 都不创建。
    const indices = this.prepareIndices(geometry.copyIndices())
    const mode = this.primitiveMode(geometry.topology)
    const gl = this.gl

    // 本次创建过程的清理清单，不是 CPU Geometry 的资源列表。
    const owned: WebGLBuffer[] = []

    this.checkError('preflight', 'Geometry')

    /**
     * @remarks
     * [DESIGN-WEIGHT:3][webgl-upload-binding-restoration]
     *
     * 两个固定 pname 按 WebGL 协议返回 buffer 或 null，而不是任意用户输入。
     * ELEMENT_ARRAY_BUFFER 属于当前 VAO：上传期间不切 VAO，并恢复原来的 EBO。
     */
    const previousArray = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null
    const previousElements = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING) as WebGLBuffer | null

    this.checkError('capture buffer bindings', 'Geometry')

    try {
      const attributes = new Map<string, WebGL1AttributeResource>()
      let indexBuffer: WebGLBuffer | null = null

      try {
        for (const name of geometry.getAttributeNames()) {
          const attribute = geometry.getAttribute(name)!
          const data = attribute.copyData()
          const type = this.attributeType(data)

          const buffer = this.upload(gl.ARRAY_BUFFER, data, `Geometry.attribute:${name}`, owned)

          attributes.set(
            name,
            Object.freeze({
              buffer,
              type,
              itemSize: attribute.itemSize,
              normalized: attribute.normalized
            })
          )
        }

        if (indices !== null) {
          indexBuffer = this.upload(gl.ELEMENT_ARRAY_BUFFER, indices, 'Geometry.indices', owned)
        }
      } finally {
        if (!gl.isContextLost() && !this.lostValue) {
          gl.bindBuffer(gl.ARRAY_BUFFER, previousArray)
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, previousElements)
        }

        this.hooks.invalidateState()
      }

      this.checkError('restore buffer bindings', 'Geometry')

      const indexType = indices === null ? null : this.indexType(indices)

      const resource: WebGL1GeometryResource = Object.freeze({
        attributes,
        indexBuffer,
        indexType,
        drawCount: geometry.drawCount,
        primitiveMode: mode
      })

      const unsubscribe = geometry.onDispose(() => this.releaseFromResource(geometry))

      this.entries.set(geometry, {
        resource,
        unsubscribe,
        closing: false,
        dependencyReleased: false,
        buffers: Object.freeze([...owned]),
        nextBufferIndex: 0
      })

      return resource
    } catch (error) {
      if (gl.isContextLost() || this.lostValue) {
        this.invalidateForContextLoss()
        throw new WebGLContextLostError('create geometry')
      }

      for (const buffer of owned) gl.deleteBuffer(buffer)

      this.hooks.invalidateState()

      throw error
    }
  }

  /**
   * 先解除关联顶点输入记录，再逐个删除 buffers；全部成功后才取消订阅。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-before-delete-order]
   *
   * beforeDelete 抛错时不越过屏障；保留 entry 供显式重试。
   * 同步重入同一 release 安全返回，避免同一 buffer 被重复删除。
   */

  release(geometry: Geometry): void {
    const entry = this.entries.get(geometry)
    if (entry === undefined || this.releasing.has(geometry)) return
    if (this.gl.isContextLost() || this.lostValue) {
      this.invalidateForContextLoss()
      return
    }
    this.releasing.add(geometry)
    entry.closing = true
    try {
      if (!entry.dependencyReleased) {
        if (
          !this.cleanupStep('gpu-dependency', 'vertex input', () => {
            this.hooks.beforeDelete?.(geometry)
          })
        )
          return

        entry.dependencyReleased = true
      }

      while (entry.nextBufferIndex < entry.buffers.length) {
        const index = entry.nextBufferIndex
        if (
          !this.cleanupStep('gpu-delete', 'buffer ' + index, () => {
            this.gl.deleteBuffer(entry.buffers[index]!)
          })
        )
          return
        entry.nextBufferIndex += 1
      }

      // 完成之前保留订阅：直接 release 中重入 Resource.dispose 也能观察到任务。
      entry.unsubscribe()
      this.entries.delete(geometry)
    } finally {
      this.releasing.delete(geometry)
      this.hooks.invalidateState()
    }
  }

  /** release 的 no-op 不等于完成；Resource 捕获任务必须确认剩余记录为空。 */
  private releaseFromResource(geometry: Geometry): void {
    this.release(geometry)
    if (this.lostValue || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return
    }
    if (this.releasing.has(geometry) || this.entries.has(geometry)) {
      throw new CleanupFailureError('Geometry', [
        {
          phase: 'gpu-dependency',
          label: 'cleanup completion',
          cause: new Error('GPU cleanup is still pending or running')
        }
      ])
    }
  }

  /**
   * 冷路径清理步骤：成功返回后才能推进进度，lost 则放弃旧代责任。
   * [DESIGN-WEIGHT:3][cleanup-dependency-barrier]
   */
  private cleanupStep(
    phase: 'gpu-dependency' | 'gpu-delete',
    label: string,
    action: () => void
  ): boolean {
    if (this.lostValue || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      return false
    }
    try {
      assertTextureOperation(this.gl, 'begin cleanup ' + label, 'Geometry')
      action()
      assertTextureOperation(this.gl, 'cleanup ' + label, 'Geometry')
    } catch (cause) {
      if (this.lostValue || this.gl.isContextLost()) {
        this.invalidateForContextLoss()
        return false
      }
      throw new CleanupFailureError('Geometry', [{ phase, label, cause }])
    }
    return true
  }

  /** lost 只丢弃本 context 的记录与订阅，不删除 GPU，也不修改 CPU Geometry。 */
  invalidateForContextLoss(): void {
    this.lostValue = true

    for (const entry of this.entries.values()) entry.unsubscribe()

    this.entries.clear()
    this.hooks.invalidateState()
  }

  /**
   * 先关闭正常服务，逐项完成 GPU 清理后再取消相应订阅。
   *
   * @remarks
   * 依赖清理失败后仍然保持关闭状态，但可再次调用以重试剩余条目。
   * disposing 只阻止本次调用栈内的递归，不阻止后续显式重试。
   */
  dispose(): void {
    if (this.disposing || this.releasing.size > 0) {
      throw new CleanupFailureError('WebGL1GeometryManager', [
        {
          phase: 'gpu-dependency',
          label: 'dispose',
          cause: new Error('A cleanup operation is still running')
        }
      ])
    }

    this.disposedValue = true
    this.disposing = true

    try {
      for (const geometry of [...this.entries.keys()]) this.release(geometry)
    } finally {
      this.disposing = false
    }
  }

  /**
   * 检查最大实际索引，而不是 index 数量或 vertexCount。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl1-uint32-index-fallback]
   *
   * 无扩展时仅当每个值均 <= 65535 才能无损转成 Uint16Array。
   * 不使用 Math.max(...indices)，避免大数组展开导致调用参数数量溢出。
   */
  private prepareIndices(indices: IndexData | null): IndexData | null {
    if (!(indices instanceof Uint32Array) || this.capabilities.elementIndexUint !== null) {
      return indices
    }

    for (const index of indices) {
      if (index > 65535) {
        throw new UnsupportedIndexTypeError(
          'Uint32Array',
          'OES_element_index_uint is unavailable and an index exceeds 65535'
        )
      }
    }

    return new Uint16Array(indices)
  }

  /**
   * 创建、登记并上传一个 buffer。
   *
   * @remarks
   * 拿到 handle 后立即加入 owned，保证后续上传失败也能找到它。
   * 每个 buffer 固定绑定其真实用途，不把 index buffer 当 ARRAY_BUFFER 上传。
   */
  private upload(
    target: number,
    data: VertexAttributeData | IndexData,
    label: string,
    owned: WebGLBuffer[]
  ): WebGLBuffer {
    const gl = this.gl
    const candidate = gl.createBuffer()

    this.assertAvailable('create buffer')

    const buffer = requireNonNull(candidate, () => new WebGLResourceCreationError('buffer', label))

    owned.push(buffer)

    gl.bindBuffer(target, buffer)
    gl.bufferData(target, data, gl.STATIC_DRAW)

    // bufferData 返回 void；try/catch 本身捕获不到 GL 错误码。
    this.checkError('upload buffer', label)

    return buffer
  }

  /** 类型映射只解释存储，不改变 normalized，也不执行 CPU 数值转换。 */
  private attributeType(data: VertexAttributeData): number {
    if (data instanceof Float32Array) return this.gl.FLOAT
    if (data instanceof Int8Array) return this.gl.BYTE
    if (data instanceof Uint8Array) return this.gl.UNSIGNED_BYTE
    if (data instanceof Int16Array) return this.gl.SHORT
    if (data instanceof Uint16Array) return this.gl.UNSIGNED_SHORT

    throw new WebGLOperationError('map attribute type', 'Geometry', 'unsupported TypedArray')
  }

  /** 将已经过能力预检的索引存储类型映射为 drawElements 使用的枚举。 */
  private indexType(data: IndexData): number {
    if (data instanceof Uint8Array) return this.gl.UNSIGNED_BYTE
    if (data instanceof Uint16Array) return this.gl.UNSIGNED_SHORT

    return this.gl.UNSIGNED_INT
  }

  /** default 留在 switch 内，新增 CPU topology 时由 assertNever 提醒同步扩展。 */
  private primitiveMode(topology: PrimitiveTopology): number {
    let mode: number

    switch (topology) {
      case 'triangles':
        mode = this.gl.TRIANGLES
        break

      case 'lines':
        mode = this.gl.LINES
        break

      case 'line-strip':
        mode = this.gl.LINE_STRIP
        break

      case 'triangle-strip':
        mode = this.gl.TRIANGLE_STRIP
        break

      default:
        assertNever(topology)
    }

    return mode
  }

  /**
   * 在资源创建、编译或上传的冷路径，有界地收集当前 GL 错误标志。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][webgl-bounded-error-collection]
   *
   * 每次读取前后都检查本 Manager 的生命周期：
   * - 读取前禁止已关闭或已失效的 Manager 继续操作 context；
   * - 读取后识别读取期间发生的 context lost，并执行已有缓存失效逻辑。
   *
   * 只有观察到 NO_ERROR，才能认为本次错误标志收集已经结束。
   * 收集结束后：
   * - 没有收集到错误：正常返回，调用者可以继续；
   * - 收集到一个或多个错误：统一抛错，调用者不能继续本次操作。
   *
   * 读取错误标志不等于修复失败的 GL 操作，也不等于恢复 context。
   * 错误码的返回顺序没有保证，本方法不把它解释为错误发生顺序。
   *
   * 最多执行 32 次 getError，包括用于确认结束的 NO_ERROR 读取。
   * 这是项目的防御性预算，不是 WebGL 规定的错误数量。
   * 预算耗尽仍未观察到 NO_ERROR 时，必须报告收集未完成。
   *
   * 保持现有冷路径调用位置；不要把此循环移到缓存命中或每次 draw 中。
   * create-null、shader 编译状态和 program 链接状态仍由独立检查负责。
   *
   * @param operation - 当前检查点，例如 preflight 或 upload buffer。
   * @param label - 当前资源的诊断标签。
   * @throws WebGLOperationError 收集到普通 GL 错误，或收集预算耗尽。
   * @throws WebGLContextLostError 读取前后发现 context 已失效。
   * @throws WebGLBackendDisposedError 读取前后发现 Manager 已关闭。
   */
  private checkError(operation: string, label: string): void {
    const maxErrorReads = 32
    const errorCodes: number[] = []

    for (let readIndex = 0; readIndex < maxErrorReads; readIndex += 1) {
      this.assertAvailable(operation)

      const code = this.gl.getError()

      this.assertAvailable(operation)

      if (code === this.gl.NO_ERROR) {
        if (errorCodes.length === 0) {
          return
        }

        throw new WebGLOperationError(operation, label, `GL errors: ${errorCodes.join(', ')}`)
      }

      errorCodes.push(code)
    }

    throw new WebGLOperationError(
      operation,
      label,
      `GL error collection incomplete after ${maxErrorReads} reads: ` +
        `NO_ERROR was not observed; collected GL errors: ${errorCodes.join(', ')}`
    )
  }

  /** 正常创建/查询必须同时满足 Manager 未关闭且 context 当前可用。 */
  private assertAvailable(operation: string): void {
    if (this.disposedValue) throw new WebGLBackendDisposedError(operation)

    if (this.lostValue || this.gl.isContextLost()) {
      this.invalidateForContextLoss()
      throw new WebGLContextLostError(operation)
    }
  }
}
