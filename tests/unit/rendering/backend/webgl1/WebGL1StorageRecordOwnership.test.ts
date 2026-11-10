import { describe, expect, it } from 'vitest'
import { WebGL1TextureManager } from '@/rendering/backend/webgl1/WebGL1TextureManager'
import { WebGL1DepthBufferManager } from '@/rendering/backend/webgl1/WebGL1DepthBufferManager'
import { fixture, texture, depth } from '../fakes/createFramebufferFixture'

describe('storage record provenance', () => {
  it('accepts ready, retiring and historical own texture records but rejects same-guard foreign records', () => {
    const f = fixture(),
      p = texture(),
      r = f.textures.get(p)
    f.textures.assertRecordOwned(r)
    expect(() => f.textures.assertRecordOwned({ ...r })).toThrow()
    const foreign = new WebGL1TextureManager(f.gl, f.caps, f.generation, {
      ...f.hooks,
      beforeDelete: () => undefined
    }).get(texture())
    expect(() => f.targets.releaseTexture(foreign)).toThrow()
    expect(f.api.deleteFramebuffer).not.toHaveBeenCalled()
    f.textures.release(p)
    f.textures.assertRecordOwned(r)
    expect(f.api.deleteTexture).toHaveBeenCalledTimes(1)
  })
  it('accepts ready, retiring and historical own depth records but rejects same-guard foreign records', () => {
    const f = fixture(),
      d = depth(),
      r = f.depths.get(d)
    f.depths.assertRecordOwned(r)
    expect(() => f.depths.assertRecordOwned({ ...r })).toThrow()
    const foreign = new WebGL1DepthBufferManager(f.gl, f.generation, {
      ...f.hooks,
      beforeDelete: () => undefined
    }).get(depth())
    expect(() => f.targets.releaseDepthBuffer(foreign)).toThrow()
    expect(f.api.deleteFramebuffer).not.toHaveBeenCalled()
    f.depths.release(d)
    f.depths.assertRecordOwned(r)
    expect(f.api.deleteRenderbuffer).toHaveBeenCalledTimes(1)
  })
})
