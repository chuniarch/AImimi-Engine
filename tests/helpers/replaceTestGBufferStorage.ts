import { createGBufferTarget } from '@/rendering/gbuffer/GBufferLayout'
import type { RenderTarget } from '@/rendering/resources/RenderTarget'
import { onTestFinished } from 'vitest'

/** Simulate an external attachment replacement while retaining cleanup ownership. */
export function replaceTestGBufferStorage(
  target: RenderTarget,
  width: number,
  height: number
): void {
  const replacement = createGBufferTarget(width, height, 'test/replacement')
  onTestFinished(() => replacement.dispose())
  target.replaceAttachments(replacement.target.attachments)
}
