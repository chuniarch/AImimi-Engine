import { relative, sep } from 'node:path'

/** Quote each filename for the shell used by lint-staged, including spaces and apostrophes. */
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'"

/**
 * Preserve the project's existing src checks while excluding published course code.
 * Filtering before constructing commands also avoids warnings for explicitly ignored files.
 */
export default function stagedCommands(files) {
  const sourceFiles = files.filter((file) => {
    const path = relative(process.cwd(), file).split(sep).join('/')
    return path.startsWith('src/') && !path.startsWith('src/rendering/docs/courses/webgl1-backend/')
  })
  const code = sourceFiles.filter((file) => /\.(js|ts)$/.test(file))
  const formatted = sourceFiles.filter((file) => /\.(js|ts|json|css|html)$/.test(file))
  return [
    ...(code.length ? ['eslint --max-warnings 10 -- ' + code.map(quote).join(' ')] : []),
    ...(formatted.length ? ['prettier --check -- ' + formatted.map(quote).join(' ')] : [])
  ]
}
