// 生成 assets/draw-sources.js：第 47 课代码框里的源码原文（带真实行号）。
// 用法（在任意目录）：node <本工作区>/assets/build/draw-sources.mjs <worktree 根目录>
// src 改了以后重新生成一次；生成时会核对每段的首行，对不上就报错，提醒先改课程页里的行号。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const teach = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const worktree = process.argv[2]
if (!worktree) throw new Error('要给 worktree 根目录')

/** [显示的路径, 实际文件, 起始行, 结束行, 这一段第一行必须包含的文字] */
const plan = {
  real: [
    ['src/rendering/passes/ForwardPass.ts', path.join(worktree, 'src/rendering/passes/ForwardPass.ts'), 18, 45, 'execute(context: RenderPassContext)'],
    ['src/rendering/backend/webgl1/WebGL1Backend.ts', path.join(worktree, 'src/rendering/backend/webgl1/WebGL1Backend.ts'), 179, 182, 'Scope 负责目标绑定'],
    ['src/rendering/backend/webgl1/WebGL1Backend.ts', path.join(worktree, 'src/rendering/backend/webgl1/WebGL1Backend.ts'), 184, 232, '/**'],
    ['src/rendering/backend/webgl1/WebGL1Backend.ts', path.join(worktree, 'src/rendering/backend/webgl1/WebGL1Backend.ts'), 307, 342, '/**']
  ],
  mini: [
    ['assets/shadow-45.js', path.join(teach, 'assets/shadow-45.js'), 177, 192, 'execute({ frame, backend })'],
    ['assets/shadow-44.js', path.join(teach, 'assets/shadow-44.js'), 23, 49, '进门：记下现在画到哪'],
    ['assets/shadow-45.js', path.join(teach, 'assets/shadow-45.js'), 146, 168, '后端：值从三处找'],
    ['assets/shadow-44.js', path.join(teach, 'assets/shadow-44.js'), 51, 79, '画一个物体']
  ]
}

const out = {}
for (const [version, segments] of Object.entries(plan)) {
  out[version] = segments.map(([file, real, from, to, mustContain]) => {
    const lines = fs.readFileSync(real, 'utf8').split('\n')
    if (!lines[from - 1].includes(mustContain)) {
      throw new Error(file + ':' + from + ' 不再是「' + mustContain + '」，源码变了，先改课程页的行号')
    }
    return { file, start: from, text: lines.slice(from - 1, to).join('\n') }
  })
}
const banner = '// 自动生成：node assets/build/draw-sources.mjs <worktree>（' + new Date().toISOString().slice(0, 10) + '）。不要手改。\n'
fs.writeFileSync(path.join(teach, 'assets/draw-sources.js'), banner + 'window.RTeachDrawSources = ' + JSON.stringify(out, null, 1) + '\n')
console.log('wrote', Object.values(out).flat().length, 'segments')
