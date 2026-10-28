#!/usr/bin/env node
/** Publish the WebGL1 teaching workspace without editing its originals. */
import { fileURLToPath } from 'node:url'
import { publishCourse } from './webgl1-course/publication.mjs'

const args = process.argv.slice(2)
const allowed = new Set(['--source', '--apply', '--check', '--help'])
let sourceRoot
let apply = false
let check = false

try {
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (!allowed.has(argument)) throw new Error(`Unknown argument: ${argument}`)
    if (argument === '--source') {
      sourceRoot = args[++index]
      if (!sourceRoot || sourceRoot.startsWith('--')) throw new Error('--source needs a directory')
    } else if (argument === '--apply') apply = true
    else if (argument === '--check') check = true
    else {
      console.log(
        'node scripts/sync-webgl1-course.mjs --source <teach-directory> [--apply | --check]'
      )
      process.exit(0)
    }
  }
  if (!sourceRoot) throw new Error('Supply the authoring teach directory with --source')
  if (apply && check) throw new Error('--apply and --check are mutually exclusive')
  const report = await publishCourse({
    sourceRoot,
    projectRoot: fileURLToPath(new URL('../', import.meta.url)),
    apply
  })
  console.log(JSON.stringify(report, null, 2))
  if (report.conflicts.length || report.removed.length || (check && report.changed))
    process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
