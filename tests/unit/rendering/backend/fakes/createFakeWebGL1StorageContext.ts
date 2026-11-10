import { vi } from 'vitest'
import { createFakeWebGL1TextureContext } from './createFakeWebGL1TextureContext'

type Operation = keyof ReturnType<typeof createFakeWebGL1TextureContext>['api']
type HandleKind = 'texture' | 'framebuffer' | 'renderbuffer'
export type StorageFault =
  | { readonly kind: 'throw'; readonly cause: unknown }
  | { readonly kind: 'error'; readonly code: number }
  | { readonly kind: 'null' }
  | { readonly kind: 'lost' }
export interface StorageCommand {
  readonly operation: Operation | 'drawBuffersWEBGL'
  readonly args: readonly unknown[]
  readonly generation: symbol
}
interface HandleInfo {
  readonly kind: HandleKind
  readonly generation: symbol
  deleted: boolean
}
export interface FakeStorageAttachment {
  readonly handle: object
  readonly kind: 'texture' | 'renderbuffer'
  readonly face?: number
  readonly mip?: number
}

/**
 * C3 的有类型、代次和附件图的协议替身，不执行像素或光栅化。
 * @remarks
 * [DESIGN-WEIGHT:2][fake-webgl-state-versus-gpu]
 * 实际 unit/unpack/FBO 状态沿用已有 texture fake；增加严格的旧代/错误类型检查。
 * 拒绝删除仍被任一 FBO 借用的存储，是对 C3 删除顺序的断言，并非驱动模拟。
 * 一次 fault 在对应命令开始前生效；日志保留失败尝试以核对重试次序。
 */
export function createFakeWebGL1StorageContext() {
  let state = createFakeWebGL1TextureContext()
  let generation = Symbol('fake-context')
  const commands: StorageCommand[] = []
  const handles = new Map<object, HandleInfo>()
  const attachments = new Map<object, Map<number, FakeStorageAttachment>>()
  const extensions = new Map<string, unknown>()
  const faults = new Map<Operation, StorageFault[]>()
  const api = { ...state.api }

  function validate(value: unknown, kind: HandleKind): void {
    if (value === null) return
    const info = typeof value === 'object' ? handles.get(value) : undefined
    if (!info || info.kind !== kind || info.generation !== generation || info.deleted)
      throw new Error('Invalid ' + kind + ' handle for this fake generation')
  }

  function invoke(operation: Operation, args: readonly unknown[]): unknown {
    commands.push(Object.freeze({ operation, args: Object.freeze([...args]), generation }))
    const fault = faults.get(operation)?.shift()
    if (fault?.kind === 'throw') throw fault.cause
    if (fault?.kind === 'error') {
      state.setError(fault.code)
      return operation.startsWith('create') ? null : undefined
    }
    if (fault?.kind === 'null') return null
    if (fault?.kind === 'lost') {
      state.setLost(true)
      return operation.startsWith('create') ? null : undefined
    }
    const query = ['isContextLost', 'getError', 'getParameter', 'getExtension'].includes(operation)
    if (!query && state.gl.isContextLost()) throw new Error('GL mutation after context loss')
    if (operation === 'getExtension') return extensions.get(args[0] as string) ?? null
    const ownedKinds: Partial<Record<Operation, HandleKind>> = {
      createTexture: 'texture',
      createFramebuffer: 'framebuffer',
      createRenderbuffer: 'renderbuffer',
      deleteTexture: 'texture',
      deleteFramebuffer: 'framebuffer',
      deleteRenderbuffer: 'renderbuffer'
    }
    const kind = ownedKinds[operation]
    if (operation.startsWith('delete') && kind) {
      validate(args[0], kind)
      if (
        kind !== 'framebuffer' &&
        [...attachments.values()].some((slots) =>
          [...slots.values()].some((slot) => slot.handle === args[0])
        )
      )
        throw new Error('Storage still has a dependent FBO')
    }
    if (operation === 'bindTexture') validate(args[1], 'texture')
    if (operation === 'bindFramebuffer') validate(args[1], 'framebuffer')
    if (operation === 'bindRenderbuffer') validate(args[1], 'renderbuffer')
    const action = state.api[operation] as (...values: unknown[]) => unknown
    const result = action(...args)
    if (operation.startsWith('create') && kind && typeof result === 'object' && result !== null) {
      handles.set(result, { kind, generation, deleted: false })
      if (kind === 'framebuffer') attachments.set(result, new Map())
    }
    if (operation.startsWith('delete') && typeof args[0] === 'object' && args[0] !== null) {
      handles.get(args[0])!.deleted = true
      if (kind === 'framebuffer') attachments.delete(args[0])
    }
    if (operation === 'framebufferTexture2D' || operation === 'framebufferRenderbuffer') {
      const framebuffer = state.gl.getParameter(state.gl.FRAMEBUFFER_BINDING) as object | null
      if (framebuffer === null) throw new Error('Attachment requires a user FBO')
      const handle = args[3]
      const attachmentKind = operation === 'framebufferTexture2D' ? 'texture' : 'renderbuffer'
      validate(handle, attachmentKind)
      const slots = attachments.get(framebuffer)!
      if (handle === null) slots.delete(args[1] as number)
      else
        slots.set(
          args[1] as number,
          Object.freeze({
            handle: handle as object,
            kind: attachmentKind,
            ...(attachmentKind === 'texture'
              ? { face: args[2] as number, mip: args[4] as number }
              : {})
          })
        )
    }
    return result
  }

  for (const [name, value] of Object.entries(api)) {
    if (typeof value !== 'function') continue
    Object.assign(api, { [name]: vi.fn((...args: unknown[]) => invoke(name as Operation, args)) })
  }
  const mrt = {
    ...state.mrt,
    drawBuffersWEBGL: vi.fn((values: number[]) => {
      commands.push(
        Object.freeze({
          operation: 'drawBuffersWEBGL',
          args: Object.freeze([[...values]]),
          generation
        })
      )
      state.mrt.drawBuffersWEBGL(values)
    })
  }
  return {
    gl: api as unknown as WebGLRenderingContext,
    api,
    mrt,
    extensions,
    get drawBuffers(): ReadonlyMap<WebGLFramebuffer | null, readonly number[]> {
      return state.drawBuffers
    },
    commands: commands as readonly StorageCommand[],
    attachments: attachments as ReadonlyMap<object, ReadonlyMap<number, FakeStorageAttachment>>,
    injectOnce(operation: Operation, fault: StorageFault): void {
      const queue = faults.get(operation) ?? []
      queue.push(fault)
      faults.set(operation, queue)
    },
    clearCommands(): void {
      commands.length = 0
    },
    setLost(value: boolean): void {
      state.setLost(value)
    },
    setError(code: number): void {
      state.setError(code)
    },
    /** 恢复物理状态并重建空绑定；旧 handle 身份保留用于拒绝跨代使用。 */
    restore(): void {
      state = createFakeWebGL1TextureContext()
      generation = Symbol('restored-fake-context')
      attachments.clear()
      faults.clear()
      extensions.clear()
    }
  }
}
