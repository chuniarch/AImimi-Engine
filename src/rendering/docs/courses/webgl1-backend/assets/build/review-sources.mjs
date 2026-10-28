// 生成 assets/review-sources.js：第 22 课三块审查面板里的源码原文（带真实行号）。
// 用法（在任意目录）：node <本工作区>/assets/build/review-sources.mjs <worktree 根目录>
// src 改了以后重新生成一次；生成时会核对每段的首行，对不上就报错，提醒先改课程页里的行号。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const teach = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const worktree = process.argv[2]
if (!worktree) throw new Error('要给 worktree 根目录')

const R = 'src/rendering/'
const B = R + 'backend/webgl1/'

/** [显示的路径, 起始行, 结束行, 这一段第一行必须包含的文字] */
const plan = {
  // 需求一：粒子每帧换位置（GPU buffer）
  particles: [
    [R + 'resources/Geometry.ts', 10, 20, '/**'],
    [R + 'resources/Geometry.ts', 118, 137, '/**'],
    [R + 'resources/VertexAttribute.ts', 79, 103, 'constructor(options: {'],
    [R + 'scene/Mesh.ts', 23, 25, '借用原 Geometry 的身份'],
    [B + 'WebGL1GeometryManager.ts', 73, 73, 'private readonly entries'],
    [B + 'WebGL1GeometryManager.ts', 104, 124, 'get(geometry: Geometry)'],
    [B + 'WebGL1GeometryManager.ts', 142, 148, 'try {'],
    [B + 'WebGL1GeometryManager.ts', 212, 247, 'release(geometry: Geometry)'],
    [B + 'WebGL1GeometryManager.ts', 314, 336, 'private upload('],
    [B + 'WebGL1GeometryManager.ts', 357, 383, 'default 留在 switch 内'],
    [B + 'WebGL1ManualVertexInputManager.ts', 106, 128, '禁用受管理的位置'],
    [R + 'core/Resource.ts', 204, 216, 'private finalizeDisposal(): void']
  ],
  // 需求二：一张标量场每帧更新（纹理、浮点）
  texture: [
    [R + 'resources/Texture.ts', 18, 35, '/**'],
    [R + 'resources/Texture2D.ts', 14, 21, '/**'],
    [R + 'resources/Texture2D.ts', 102, 124, '/**'],
    [R + 'resources/texturePixelSnapshot.ts', 116, 132, 'const expectedLength'],
    [R + 'resources/Texture2D.ts', 140, 149, '/**'],
    [B + 'WebGL1Texture2DManager.ts', 51, 54, 'function readSource(texture: Texture2D)'],
    [B + 'WebGL1Texture2DManager.ts', 103, 143, '首次调用完整上传'],
    [B + 'WebGL1Texture2DManager.ts', 170, 234, '/**']
  ],
  // 需求三：跑很久（context 丢失、GPU 上的状态、浮点目标）
  longrun: [
    [B + 'WebGL1Backend.ts', 78, 110, 'this.lifecycle = new WebGLContextLifecycle'],
    [B + 'WebGL1Backend.ts', 289, 290, '[DESIGN-WEIGHT:3][attachment-content-rebuild]'],
    [R + 'Renderer.ts', 44, 51, 'render(view: RenderView): void {'],
    [R + 'passes/RenderPassContext.ts', 6, 15, '/**'],
    [R + 'backend/RenderBackend.ts', 18, 44, 'export interface RenderBackend'],
    [B + 'WebGL1RenderTargetManager.ts', 247, 271, 'for (const color of descriptor.colors)'],
    [B + 'WebGL1RenderTargetManager.ts', 322, 324, 'const color = descriptor.colors[index]!'],
    [B + 'WebGL1ResourceManager.ts', 171, 179, 'invalidateForContextLoss(): void {']
  ]
}

const out = {}
for (const [board, segments] of Object.entries(plan)) {
  out[board] = segments.map(([file, from, to, mustContain]) => {
    const lines = fs.readFileSync(path.join(worktree, file), 'utf8').split('\n')
    if (!lines[from - 1].includes(mustContain)) {
      throw new Error(file + ':' + from + ' 不再是「' + mustContain + '」，源码变了，先改课程页的行号')
    }
    return { file, start: from, text: lines.slice(from - 1, to).join('\n') }
  })
}
const banner =
  '// 自动生成：node assets/build/review-sources.mjs <worktree>（' + new Date().toISOString().slice(0, 10) + '）。不要手改。\n'
fs.writeFileSync(
  path.join(teach, 'assets/review-sources.js'),
  banner + 'window.RTeachReviewSources = ' + JSON.stringify(out, null, 1) + '\n'
)
console.log('wrote', Object.values(out).flat().length, 'segments')
