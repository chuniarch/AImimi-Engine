// 生成 assets/frame-loop-sources.js：第 48 课步骤代码框里的源码原文（带真实行号）。
// 用法（在任意目录）：node <本工作区>/assets/build/frame-loop-sources.mjs <worktree 根目录>
// src 改了以后重新生成一次；生成时会核对每段的首行和一句关键代码，对不上就报错，提醒先改课程页里的行号。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const teach = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const worktree = process.argv[2]
if (!worktree) throw new Error('要给 worktree 根目录')

/** [显示的路径, 起始行, 结束行, 首行必须包含的文字, 这一段里必须出现的一句] */
const plan = [
  ['src/engine.ts', 665, 682, '使用具名 handler', 'if (this.inFrame || this.transitioning || this.rendering) return'],
  ['src/engine.ts', 703, 729, '/**', 'private applyResize(): void {'],
  ['src/engine.ts', 731, 782, '/**', 'private readonly loop = (): void => {'],
  ['src/engine.ts', 408, 421, '借用当前配对向新 Renderer 提交一帧', 'this.session.renderer.render({ ...binding, frame })'],
  ['src/rendering/Renderer.ts', 35, 81, '/**', 'this.pipeline.execute(context)'],
  ['src/rendering/passes/RenderPipeline.ts', 86, 102, '/**', 'pass.execute(context)'],
  ['src/rendering/passes/RenderPass.ts', 3, 8, 'Pipeline 持有的一个同步渲染步骤', 'execute(context: RenderPassContext): undefined']
]

const segments = plan.map(([file, from, to, first, inside]) => {
  const lines = fs.readFileSync(path.join(worktree, file), 'utf8').split('\n')
  const text = lines.slice(from - 1, to).join('\n')
  if (!lines[from - 1].includes(first) || !text.includes(inside)) {
    throw new Error(file + ':' + from + '–' + to + ' 对不上「' + first + '」或「' + inside + '」，源码变了，先改课程页的行号')
  }
  return { file, start: from, text }
})

const banner =
  '// 自动生成：node assets/build/frame-loop-sources.mjs <worktree>（' + new Date().toISOString().slice(0, 10) + '）。不要手改。\n'
fs.writeFileSync(
  path.join(teach, 'assets/frame-loop-sources.js'),
  banner + 'window.RTeachFrameLoopSources = ' + JSON.stringify(segments, null, 1) + '\n'
)
console.log('wrote', segments.length, 'segments')
