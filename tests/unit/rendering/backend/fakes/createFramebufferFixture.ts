import { vi } from 'vitest'
import { RenderTexture } from '@/rendering/resources/RenderTexture'
import { RenderTarget } from '@/rendering/resources/RenderTarget'
import { DepthBufferResource } from '@/rendering/resources/DepthBufferResource'
import type { TextureWriteView } from '@/rendering/resources/TextureWriteView'
import { WebGL1TextureManager } from '@/rendering/backend/webgl1/WebGL1TextureManager'
import { WebGL1DepthBufferManager } from '@/rendering/backend/webgl1/WebGL1DepthBufferManager'
import { WebGL1RenderTargetManager } from '@/rendering/backend/webgl1/WebGL1RenderTargetManager'
import { WebGL1ResourceGeneration } from '@/rendering/backend/webgl1/WebGL1ResourceGeneration'
import type { WebGL1Capabilities } from '@/rendering/backend/webgl1/WebGL1Capabilities'
import { CleanupFailureError } from '@/rendering/core/errors'
import { createFakeWebGL1StorageContext } from './createFakeWebGL1StorageContext'

export function texture(size = 64, type: 'uint8' | 'float32' = 'uint8', cube = false) {
  return new RenderTexture({
    label: 'P',
    production: 'manual',
    descriptor: {
      dimension: cube ? 'cube' : '2d',
      width: size,
      height: size,
      mipLevelCount: cube ? 4 : 1,
      storage: { format: 'rgba', type },
      colorSpace: 'linear'
    },
    defaultSampler: {
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clamp-to-edge',
      wrapT: 'clamp-to-edge'
    }
  })
}
export function depth(size = 64) {
  return new DepthBufferResource({ label: 'D', width: size, height: size })
}
export function view(p: RenderTexture): TextureWriteView {
  return { kind: '2d', texture: p, mipLevel: 0 }
}
export function target(colors = [texture()], d?: DepthBufferResource) {
  return new RenderTarget({ colors: colors.map(view), depth: d }, { label: 'T' })
}
export function fixture(overrides: Partial<WebGL1Capabilities> = {}) {
  const f = createFakeWebGL1StorageContext(),
    generation = new WebGL1ResourceGeneration(f.gl)
  const caps: WebGL1Capabilities = {
    vertexArrayObject: null,
    elementIndexUint: null,
    depthTexture: null,
    textureFloat: {},
    textureFloatLinear: {},
    colorBufferFloat: {
      RGBA32F_EXT: 0x8814,
      FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT: 0x8211,
      UNSIGNED_NORMALIZED_EXT: 0x8c17
    },
    fboRenderMipmap: {},
    drawBuffers: f.mrt,
    maxVertexAttributes: 8,
    maxVertexTextureUnits: 0,
    maxCombinedTextureUnits: 8,
    shaderTextureLod: null,
    maxTextureUnits: 8,
    ...overrides
  }
  const hooks = { invalidateState: vi.fn(() => undefined), assertAvailable: () => {} }
  const textures = new WebGL1TextureManager(f.gl, caps, generation, {
    ...hooks,
    beforeDelete: (r) => {
      targets.releaseTexture(r)
      return undefined
    }
  })
  const depths = new WebGL1DepthBufferManager(f.gl, generation, {
    ...hooks,
    beforeDelete: (r) => {
      targets.releaseDepthBuffer(r)
      return undefined
    }
  })
  const targets = new WebGL1RenderTargetManager(f.gl, caps, generation, textures, depths, hooks)
  return { ...f, generation, caps, textures, depths, targets, hooks }
}
export function caught(action: () => unknown): unknown {
  try {
    action()
  } catch (cause) {
    return cause
  }
  throw new Error('Expected failure')
}
export function causes(cause: unknown): unknown[] {
  if (cause instanceof AggregateError) return [cause, ...cause.errors.flatMap(causes)]
  if (cause instanceof CleanupFailureError)
    return [cause, ...cause.failures.flatMap((f) => causes(f.cause))]
  return [cause]
}
