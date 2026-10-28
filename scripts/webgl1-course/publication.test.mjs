/** Behavioral checks for one-way publication; never touch the real teaching workspace. */
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ARCHIVE_PATH, prepareCourse, publishCourse } from './publication.mjs'

/** A minimal classic-script course with the same directory relationships as production. */
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'webgl1-publication-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceRoot = join(root, 'claude-workspace', 'webgl1-backend', 'teach')
  const projectRoot = join(root, 'project')
  const put = async (base, path, text) => {
    await mkdir(join(base, path, '..'), { recursive: true })
    await writeFile(join(base, path), text)
  }
  await mkdir(projectRoot)
  await put(sourceRoot, 'assets/course.css', 'body { color: black; }')
  await put(
    sourceRoot,
    'assets/course.js',
    `window.RTeach = {}\nRTeach.linkSources = function() {}\n/** retained helper */\nRTeach.attachFilter = function() {}\n`
  )
  for (const name of [
    'architecture-map',
    'abortable-requests',
    'camera-controls-math',
    'pointer-events',
    'validation-map',
    'webgl1-api'
  ]) {
    await put(sourceRoot, `reference/${name}.html`, '<title>Reference</title>')
  }
  await put(
    sourceRoot,
    'lessons/0002-second.html',
    '<title>Second</title><script src="../assets/course.js"></script>'
  )
  await put(
    sourceRoot,
    'lessons/0001-first.html',
    '<title>First</title><a data-src="src/example.ts:1">Example</a>'
  )
  await put(sourceRoot, 'learning-records/private.md', 'PRIVATE RECORD')
  await put(sourceRoot, 'NOTES.md', 'PRIVATE NOTES')
  await put(projectRoot, 'src/example.ts', 'export const example = 1\n')
  return { sourceRoot, projectRoot, put, destination: join(projectRoot, ARCHIVE_PATH) }
}

test('preview sorts filenames, adapts references and excludes personal records without writing', async (t) => {
  const f = await fixture(t)
  const before = await readFile(join(f.sourceRoot, 'assets/course.js'), 'utf8')
  const candidate = await prepareCourse(f)
  assert.deepEqual(candidate.lessons, ['lessons/0001-first.html', 'lessons/0002-second.html'])
  assert.equal(candidate.files.has('NOTES.md'), false)
  assert.equal(candidate.files.has('learning-records/private.md'), false)
  assert.match(candidate.files.get('reference/sources.js').toString(), /project:src\/example.ts/)
  assert.match(candidate.files.get('assets/course.js').toString(), /source-viewer.html/)
  assert.equal(await readFile(join(f.sourceRoot, 'assets/course.js'), 'utf8'), before)
  await assert.rejects(readFile(join(f.destination, 'index.html')), { code: 'ENOENT' })
})

test('apply is repeatable and a later lesson plus resource can be published together', async (t) => {
  const f = await fixture(t)
  assert.equal((await publishCourse({ ...f, apply: true })).applied, true)
  assert.equal((await publishCourse(f)).changed, false)
  await f.put(
    f.sourceRoot,
    'lessons/0003-new.html',
    '<title>New</title><script src="../assets/new.js"></script>'
  )
  await f.put(f.sourceRoot, 'assets/new.js', 'window.demo = true\n')
  const report = await publishCourse({ ...f, apply: true })
  assert.equal(report.lessonCount, 3)
  assert.ok(report.added.includes('assets/new.js'))
  assert.equal((await publishCourse(f)).changed, false)
})

test('a manually changed destination blocks the complete apply before any candidate is written', async (t) => {
  const f = await fixture(t)
  await publishCourse({ ...f, apply: true })
  await f.put(f.destination, 'assets/course.css', 'MANUAL EDIT')
  await f.put(f.sourceRoot, 'assets/new.js', 'NEW RESOURCE')
  const report = await publishCourse({ ...f, apply: true })
  assert.equal(report.applied, false)
  assert.ok(report.conflicts.includes('assets/course.css'))
  assert.equal(await readFile(join(f.destination, 'assets/course.css'), 'utf8'), 'MANUAL EDIT')
  await assert.rejects(readFile(join(f.destination, 'assets/new.js')), { code: 'ENOENT' })
})

test('a missing resource fails preparation and a removed file is not silently deleted', async (t) => {
  const f = await fixture(t)
  await f.put(f.sourceRoot, 'lessons/0003-new.html', '<script src="../assets/missing.js"></script>')
  await assert.rejects(publishCourse({ ...f, apply: true }), /Missing course dependency/)
  await f.put(f.sourceRoot, 'assets/missing.js', 'window.example = 1')
  await publishCourse({ ...f, apply: true })
  await rm(join(f.sourceRoot, 'lessons/0003-new.html'))
  const report = await publishCourse({ ...f, apply: true })
  assert.equal(report.applied, false)
  assert.ok(report.removed.includes('lessons/0003-new.html'))
  assert.match(await readFile(join(f.destination, 'lessons/0003-new.html'), 'utf8'), /script/)
})

test('changed authoring script structure and an unapproved main reference require review', async (t) => {
  const f = await fixture(t)
  await f.put(
    f.sourceRoot,
    'lessons/0003-new.html',
    '<a data-main="learning-records/private.md:1">Private</a>'
  )
  await assert.rejects(prepareCourse(f), /Review this new main-checkout reference/)
  await f.put(f.sourceRoot, 'lessons/0003-new.html', '<title>New</title>')
  await f.put(f.sourceRoot, 'assets/course.js', 'window.newCourseAPI = {}')
  await assert.rejects(prepareCourse(f), /changed shape/)
})

test('single-quoted references are checked and an unchanged apply performs no publication', async (t) => {
  const f = await fixture(t)
  await f.put(
    f.sourceRoot,
    'lessons/0003-new.html',
    "<a data-src='src/example.ts:1'>Source</a><script src='../assets/course.js'></script>"
  )
  assert.equal((await publishCourse({ ...f, apply: true })).applied, true)
  assert.equal((await publishCourse({ ...f, apply: true })).applied, false)
  await f.put(f.sourceRoot, 'lessons/0003-new.html', "<script src='../assets/missing.js'></script>")
  await assert.rejects(prepareCourse(f), /Missing course dependency/)
})
