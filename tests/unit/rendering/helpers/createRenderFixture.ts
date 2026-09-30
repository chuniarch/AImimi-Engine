import type { DrawSubmission, RenderBackend } from '@/rendering/backend/RenderBackend'
import type { RenderSurfaceScopeDescriptor } from '@/rendering/backend/RenderSurface'
import type { RenderView } from '@/rendering/frame/RenderView'
import { Geometry } from '@/rendering/resources/Geometry'
import { Material, type RenderQueue } from '@/rendering/resources/Material'
import { ShaderModule } from '@/rendering/resources/ShaderModule'
import { VertexAttribute } from '@/rendering/resources/VertexAttribute'
import { VertexAttributeSemantic } from '@/rendering/resources/VertexAttributeSemantic'
import { Mesh } from '@/rendering/scene/Mesh'
import { Scene } from '@/rendering/scene/Scene'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

/** 创建真实 CPU 资源与场景；不模拟 Transform、矩阵计算或资源生命周期。 */
export function createRenderFixture() {
  const scene = new Scene()

  const camera = new PerspectiveCamera({
    fovY: Math.PI / 2,
    aspect: 1,
    near: 1,
    far: 3
  })

  const geometry = new Geometry({
    attributes: {
      [VertexAttributeSemantic.Position]: new VertexAttribute({
        data: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        itemSize: 3
      })
    }
  })

  const shader = new ShaderModule({
    name: 'frame-test',
    language: 'glsl-es-100',
    vertexSource: 'void main() { gl_Position = vec4(0.0); }',
    fragmentSource: 'void main() { gl_FragColor = vec4(1.0); }'
  })

  const frame = {
    frameNumber: 1,
    timeSeconds: 1,
    deltaSeconds: 1 / 60,
    drawingBufferWidth: 320,
    drawingBufferHeight: 200,
    pixelRatio: 1
  }

  scene.add(camera)

  /** 共享 Geometry，每个测试 Mesh 默认取得自己的 Material。 */
  function mesh(queue: RenderQueue = 'opaque'): Mesh {
    return new Mesh(
      geometry,
      new Material({
        shaderModule: shader,
        queue
      })
    )
  }

  const view: RenderView = {
    scene,
    camera,
    frame
  }

  return {
    scene,
    camera,
    geometry,
    shader,
    frame,
    view,
    mesh
  }
}

/**
 * Backend 边界记录器；只证明上层协议，不证明真实 GL 状态恢复或像素正确。
 * scope finally 是测试替身的行为，真实实现仍由 Task 15 单独验收。
 */
export class RecordingBackend implements RenderBackend {
  ready = true

  readonly events: string[] = []
  readonly scopes: RenderSurfaceScopeDescriptor[] = []
  readonly submissions: DrawSubmission[] = []

  /** 上层本批不应调用 resize，记录它可发现职责越界。 */
  resizeDrawingBuffer(): void {
    this.events.push('resize')
  }

  /** 捕获完整入口描述和执行顺序。 */
  withRenderSurface(descriptor: RenderSurfaceScopeDescriptor, callback: () => undefined): void {
    this.scopes.push(descriptor)
    this.events.push('enter')

    try {
      callback()
    } finally {
      this.events.push('leave')
    }
  }

  /** 保留真实 submission 引用，用来验证队列顺序和共享 ViewState。 */
  draw(submission: DrawSubmission): void {
    this.submissions.push(submission)
    this.events.push('draw')
  }

  /** 记录 Renderer 的所有权释放顺序。 */
  dispose(): void {
    this.events.push('backend-dispose')
    this.ready = false
  }
}
