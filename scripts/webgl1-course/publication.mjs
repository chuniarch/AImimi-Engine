/**
 * Repeatable, one-way publication of an existing classic-script course.
 * Source directories are read-only. Destination edits and removals require review.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ARCHIVE_PATH = 'src/rendering/docs/courses/webgl1-backend'
const STATE = '.publication-state.json'
const TEMPLATES = dirname(fileURLToPath(import.meta.url))
const MAIN_DOCUMENTS = new Set([
  'claude-workspace/threejs-refactor/PLAN.md',
  'claude-workspace/hw1-shadow/2026-10-16-hw1-shadow-design.zh-CN.md',
  'codex-workspace/codex-dual-webgl-backend-refactor/2026-08-26-hw2-complete-webgl1-architecture-design.md',
  'codex-workspace/codex-dual-webgl-backend-refactor/2026-08-28-hw2-complete-webgl1-architecture-implementation-plan.md'
])
const hash = (value) => createHash('sha256').update(value).digest('hex')
const portable = (value) => value.split(sep).join('/')
const escapeHTML = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Published names must remain relative and must not contain traversal segments. */
function requireRelativePath(path) {
  if (!path || isAbsolute(path) || path.includes('\\') || path.split('/').includes('..')) {
    throw new Error(`Invalid publication-relative path: ${path}`)
  }
}

/** Reject paths outside the declared root, including symlink escapes. */
async function requireInside(root, path) {
  const actual = await realpath(path)
  const rel = relative(root, actual)
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    throw new Error(`Path escapes its declared root: ${path}`)
  }
  return actual
}

async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function walk(root, prefix = '') {
  const files = []
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? prefix + '/' + entry.name : entry.name
    if (entry.isSymbolicLink()) throw new Error(`Publication does not follow symlinks: ${path}`)
    if (entry.isDirectory()) files.push(...(await walk(root, path)))
    else if (entry.isFile()) files.push(path)
  }
  return files.sort()
}

/** Extract only source-location attributes, never execute course HTML or scripts. */
function sourceReferences(content) {
  return [...content.matchAll(/data-(src|main)\s*=\s*(["'])(.*?)\2/g)].map((match) => ({
    kind: match[1] === 'src' ? 'project' : 'main',
    path: match[3].replace(/:[0-9]+$/, '')
  }))
}

function titleOf(html, fallback) {
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || fallback
  return title.replace(/<[^>]*>/g, '').trim()
}

function publicHome(lessons) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WebGL1 渲染架构精读课程</title><link rel="stylesheet" href="assets/course.css"><script src="assets/course.js"></script></head>
<body><h1>WebGL1 渲染架构精读课程</h1>
<p>从一条 draw 开始，理解资源、场景、状态、各个 Manager 和渲染编排。课程依次包含设计问题、源码解读、交互演示与检查题。</p>
<p>下面按当前课程文件名顺序排列。编号缺口及兼容入口保留；课文中原有的补课建议也予以保留。</p>
<p><a href="README.md">阅读说明</a> · <a href="MAINTENANCE.md">维护与更新</a> · <a href="RESOURCES.md">参考资料</a> · <a href="GLOSSARY.md">术语索引</a></p>
<h2>课程目录</h2><ol>${lessons.map(({ path, title }) => `<li><a href="${escapeHTML(path)}">${escapeHTML(title)}</a></li>`).join('\n')}</ol>
<h2>参考页</h2><ul>${['architecture-map', 'abortable-requests', 'camera-controls-math', 'pointer-events', 'validation-map', 'webgl1-api'].map((name) => `<li><a href="reference/${name}.html">${name}</a></li>`).join('\n')}</ul>
<p>可以直接双击本页，也可以将整个课程目录放到静态网站。源码链接打开随课程保存的阅读快照，无需安装编辑器。</p>
<p>课程中既有已实现能力，也有设计提案；请结合各课说明判断。演示包保留发布前原有版本，没有自动重建。</p></body></html>\n`
}

function readme(lessons) {
  return `# WebGL1 渲染架构精读课程

[打开 HTML 课程首页](./index.html) · [维护与重复更新](./MAINTENANCE.md) · [参考资料](./RESOURCES.md)

下载项目后，直接用浏览器打开本目录的 index.html。课程也支持在静态网站子目录中访问；需要完整发布本目录及其 assets、reference、lessons。

## 按文件名顺序阅读

${lessons.map(({ path, title }) => `- [${title}](${path})`).join('\n')}

## 内容和版本

这是原教学工作区的公开发布副本。未包含个人学习记录、教学备忘、草稿及独立实验。引用文件快照只包含课文实际引用的项目文件、选定设计文档和课程维护源码。

演示 bundle 保留原有二进制内容，来自不同历史版本，不能据此宣称与当前引擎源码完全一致。课程中的行号、完成状态和设计提案可能随源码演进而过时；具体出处见快照与维护说明。

自动发布的文件由 .publication-state.json 记录。正文在原工作区编辑后再更新本副本；本副本如有人工修改，发布工具会报告冲突。
`
}

function maintenance() {
  return `# 课程维护与重复更新

## 发布

在项目根目录执行，source 参数指向原工作区的 teach 目录，不要求任何固定用户名或项目下载位置：

\`\`\`sh
node scripts/sync-webgl1-course.mjs --source /path/to/teach
node scripts/sync-webgl1-course.mjs --source /path/to/teach --apply
node scripts/build-docs-index.mjs
node scripts/sync-webgl1-course.mjs --source /path/to/teach --check
node --test scripts/webgl1-course/publication.test.mjs
\`\`\`

第一条仅预览。新增课程、修改资源和首页变化通过同一工具发布；当前首页与 README 按课程文件名排序。未来自定义学习顺序尚未实现。

工具先构造并检查全部候选内容，再核对目标文件与上次发布的 SHA-256。人工修改、未管理文件覆盖和移除均会报告；冲突或待移除项目阻止本次写入，不会静默覆盖或删除。源目录和目标目录不能互相包含。写入使用同目录临时文件逐项替换；这不是跨文件系统事务，中断后应核对并重新发布。

原工作区只读，私人记录、草稿和独立实验不会自动收录。新引用的其他主 checkout 文档需要先加入发布工具的允许清单。引擎项目中新引用的 src、tests、docs 文件会保存为阅读快照。

## 路径

课程 HTML 使用 ../assets、../reference 等相对链接。course.js 的公开适配器由 scripts/webgl1-course/portable-links.js 提供：在经典脚本执行时捕获自身 URL，以它定位课程根目录。data-src/data-main 分别保存逻辑文件路径与可选行号；统一指向 reference/source-viewer.html。

source-viewer 使用经典脚本 sources.js 中的文本快照，通过 textContent 展示，既不 fetch 本地文件，也不要求 VS Code 或第二个 checkout。该目录独立部署后仍可阅读引用文件。Markdown 参考资料在浏览器中可能显示为文本；HTML 首页和课程正文不依赖 Markdown 渲染。

## 演示包

assets/*-bundle.js 是历史演示的发布产物，本次复制不会重建。assets/build 是维护入口，其中 @/ 指向项目 src，three 和 gl-matrix 从项目依赖解析。不同包可能对应不同引擎版本；某些旧卡片使用旧构造契约，不能对所有入口一键重新打包。

需要重建时，在项目根目录使用已有 esbuild：选择对应 entry.ts，输出 IIFE 经典脚本，保持原来的 global-name、target=es2020 和 keep-names；camera 包还需要将 three 指向 assets/build/three-slim.js，并将 gl-matrix 指向项目安装的版本。重建后要逐项复查依赖该包的课程卡片。本次没有新增或安装构建依赖。

第三方来源包括 three.js r177 和 gl-matrix；许可文本见 reference/licenses。不要删除它们的署名与许可。

## 验收和上线

检查本地资源链接、源码快照、首页顺序、课程题目及实际演示。ESLint、Prettier、主工程 tsc 和提交前检查将本课程代码视为教学资源，检查范围见项目配置。

归档进入 Git 与部署为网站是独立步骤。项目现有 Vite 构建没有自动将本目录作为课程站点发布；上线时需完整复制本目录，保持内部相对结构，再验证网站子路径。无需将课程导入引擎 main.ts。
`
}

/** Build a complete candidate without mutating the authoring tree or destination. */
export async function prepareCourse({ sourceRoot, projectRoot }) {
  sourceRoot = await realpath(sourceRoot)
  projectRoot = await realpath(projectRoot)
  const destination = resolve(projectRoot, ARCHIVE_PATH)
  if (
    sourceRoot === destination ||
    destination.startsWith(sourceRoot + sep) ||
    sourceRoot.startsWith(destination + sep)
  ) {
    throw new Error('Source and archive directories must not overlap')
  }
  const mainRoot = await realpath(resolve(sourceRoot, '../../..'))
  const files = new Map()
  for (const directory of ['lessons', 'assets', 'reference']) {
    for (const path of await walk(sourceRoot, directory)) {
      await requireInside(sourceRoot, join(sourceRoot, path))
      let content = await readFile(join(sourceRoot, path))
      if (/\.(?:html|js|ts|css|md)$/.test(path) && !path.endsWith('-bundle.js')) {
        let text = content.toString('utf8').replaceAll('NOTES.md', 'MAINTENANCE.md')
        if (path.startsWith('assets/build/')) {
          text = text.replace(/(['"])\/(?:Users|home)\/[^'"\r\n]*?\/node_modules\//g, '$1')
        }
        content = Buffer.from(text)
      }
      files.set(path, content)
    }
  }
  const adapter = await readFile(join(TEMPLATES, 'portable-links.js'), 'utf8')
  const originalScript = files.get('assets/course.js')?.toString('utf8') || ''
  const helperIndex = originalScript.indexOf('RTeach.attachFilter =')
  const helperStart = originalScript.lastIndexOf('/**', helperIndex)
  if (helperIndex < 0 || helperStart < 0 || !originalScript.includes('RTeach.linkSources =')) {
    throw new Error('course.js changed shape; review its portable-link adapter before publishing')
  }
  files.set('assets/course.js', Buffer.from(adapter + '\n' + originalScript.slice(helperStart)))
  const lessonPaths = [...files.keys()]
    .filter((path) => /^lessons\/[0-9]{4}[^/]*\.html$/.test(path))
    .sort()
  if (!lessonPaths.length) throw new Error('No numbered lessons found')
  const lessons = lessonPaths.map((path) => ({
    path,
    title: titleOf(files.get(path).toString(), path)
  }))
  files.set('index.html', Buffer.from(publicHome(lessons)))
  files.set('README.md', Buffer.from(readme(lessons)))
  files.set('MAINTENANCE.md', Buffer.from(maintenance()))
  const resourceText = (await readOptional(join(sourceRoot, 'RESOURCES.md')))?.toString() || ''
  const urls = [
    ...new Set([...resourceText.matchAll(/https?:\/\/[^\s)<>"']+/g)].map((match) => match[0]))
  ]
  files.set(
    'RESOURCES.md',
    Buffer.from(
      '# 课程参考资料\n\n以下地址提取自原课程的资料清单，保留其来源；本次归档没有逐一重新核实外部网页。\n\n' +
        urls.map((url) => `- <${url}>`).join('\n') +
        '\n'
    )
  )
  const glossary = (await readOptional(join(sourceRoot, 'GLOSSARY.md')))?.toString() || ''
  files.set(
    'GLOSSARY.md',
    Buffer.from(
      '# 课程术语索引\n\n下面仅列出课程使用的术语，具体解释见对应课程；不记录个人掌握情况。\n\n' +
        glossary
          .split('\n')
          .filter((line) => line.startsWith('- '))
          .join('\n') +
        '\n'
    )
  )

  const snapshots = Object.create(null)
  for (const [path, buffer] of files) {
    if (!path.endsWith('.html')) continue
    for (const ref of sourceReferences(buffer.toString('utf8'))) {
      requireRelativePath(ref.path)
      const key = ref.kind + ':' + ref.path
      if (Object.hasOwn(snapshots, key)) continue
      if (
        ref.kind === 'project' &&
        !/^(?:(?:src|tests|docs|prt|public\/assets)\/|node_modules\/three\/(?:src|examples)\/|node_modules\/typescript\/lib\/lib\.dom\.d\.ts$|vite\.config\.ts$|lut-gen\/Emu_MC\.cpp$)/.test(
          ref.path
        )
      )
        throw new Error(`Unapproved project source: ${ref.path}`)
      if (
        ref.kind === 'main' &&
        !MAIN_DOCUMENTS.has(ref.path) &&
        !ref.path.startsWith('claude-workspace/webgl1-backend/teach/assets/build/')
      ) {
        throw new Error(`Review this new main-checkout reference before publication: ${ref.path}`)
      }
      const root = ref.kind === 'project' ? projectRoot : mainRoot
      const actual = await requireInside(root, resolve(root, ref.path))
      snapshots[key] = (await readFile(actual, 'utf8'))
        .replaceAll(projectRoot, '<project-root>')
        .replaceAll(mainRoot, '<authoring-root>')
        .replace(/\/(?:Users|home)\/[^/\s"'<>]+/g, '<user-home>')
    }
  }
  files.set(
    'reference/sources.js',
    Buffer.from(
      'window.RTeachSources = ' + JSON.stringify(snapshots).replaceAll('<', '\\u003c') + '\n'
    )
  )
  files.set('reference/source-viewer.html', await readFile(join(TEMPLATES, 'source-viewer.html')))
  for (const [name, directory] of [
    ['three', 'three'],
    ['gl-matrix', 'gl-matrix'],
    ['typescript', 'typescript']
  ]) {
    const license =
      (await readOptional(join(projectRoot, 'node_modules', directory, 'LICENSE'))) ||
      (await readOptional(join(projectRoot, 'node_modules', directory, 'LICENSE.md'))) ||
      (await readOptional(join(projectRoot, 'node_modules', directory, 'LICENSE.txt')))
    if (license) files.set(`reference/licenses/${name}-LICENSE.txt`, license)
  }
  const unavailableLinks = []
  for (const [path, buffer] of files) {
    if (!path.endsWith('.html')) continue
    const text = buffer
      .toString('utf8')
      .replace(/(?<![\w-])(href|src)\s*=\s*(["'])(.*?)\2/g, (whole, kind, _quote, target) => {
        if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) return whole
        const plain = decodeURIComponent(target.split(/[?#]/)[0])
        if (!plain) return whole
        const candidate = portable(resolve('/', dirname(path), plain)).slice(1)
        if (files.has(candidate)) return whole
        if (kind === 'href' && candidate.startsWith('lessons/')) {
          unavailableLinks.push({ from: path, to: target })
          return `data-unavailable-href="${escapeHTML(target)}" title="该课程尚未包含在本次发布中" aria-disabled="true"`
        }
        throw new Error(`Missing course dependency: ${path} -> ${target}`)
      })
    files.set(path, Buffer.from(text))
  }
  for (const [path, buffer] of files) {
    if (/\.(?:html|js|ts|md|css)$/.test(path) && buffer.toString().includes('/Users/')) {
      throw new Error(`Personal absolute path remains in ${path}`)
    }
  }
  const prettier = await import('prettier')
  const prettierOptions = (await prettier.resolveConfig(join(projectRoot, 'README.md'))) || {}
  for (const [path, buffer] of files) {
    if (path.endsWith('.md'))
      files.set(
        path,
        Buffer.from(
          await prettier.format(buffer.toString(), { ...prettierOptions, parser: 'markdown' })
        )
      )
  }
  return { files, lessons: lessonPaths, snapshots: Object.keys(snapshots).length, unavailableLinks }
}

/**
 * Preview by default. All conflicts are collected before any write.
 * Removed files are reported and block apply; automatic deletion is intentionally absent.
 */
export async function publishCourse({ sourceRoot, projectRoot, apply = false }) {
  const prepared = await prepareCourse({ sourceRoot, projectRoot })
  const destination = resolve(projectRoot, ARCHIVE_PATH)
  const existingState = await readOptional(join(destination, STATE))
  const previous = existingState ? JSON.parse(existingState.toString()) : { files: {} }
  if (!previous.files || typeof previous.files !== 'object' || Array.isArray(previous.files)) {
    throw new Error('Invalid publication state; review it before updating')
  }
  const added = [],
    modified = [],
    removed = [],
    conflicts = []
  for (const [path, expected] of Object.entries(previous.files)) {
    requireRelativePath(path)
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected))
      throw new Error(`Invalid publication hash: ${path}`)
    const current = await readOptional(join(destination, path))
    if (!current || hash(current) !== expected) conflicts.push(path)
    if (!prepared.files.has(path)) removed.push(path)
  }
  for (const [path, content] of prepared.files) {
    const current = await readOptional(join(destination, path))
    if (current && !Object.hasOwn(previous.files, path)) conflicts.push(path)
    if (!current) added.push(path)
    else if (hash(current) !== hash(content)) modified.push(path)
  }
  const nextState =
    JSON.stringify(
      {
        version: 1,
        order: 'filename',
        files: Object.fromEntries(
          [...prepared.files]
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([path, content]) => [path, hash(content)])
        )
      },
      null,
      2
    ) + '\n'
  const stateChanged = !existingState || existingState.toString() !== nextState
  const report = {
    applied: false,
    changed: Boolean(added.length || modified.length || removed.length || stateChanged),
    lessonCount: prepared.lessons.length,
    sourceSnapshotCount: prepared.snapshots,
    added,
    modified,
    removed,
    conflicts: [...new Set(conflicts)],
    unavailableLessonLinks: prepared.unavailableLinks
  }
  if (apply && report.changed && !report.conflicts.length && !removed.length) {
    await mkdir(destination, { recursive: true })
    await requireInside(await realpath(projectRoot), destination)
    for (const [path, content] of [...prepared.files, [STATE, Buffer.from(nextState)]]) {
      const target = join(destination, path)
      await mkdir(dirname(target), { recursive: true })
      await requireInside(await realpath(destination), dirname(target))
      const temporary = target + '.publication-' + process.pid
      await writeFile(temporary, content, { flag: 'wx' })
      await rename(temporary, target)
    }
    report.applied = true
  }
  return report
}
