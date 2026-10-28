import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** 递归覆盖 HW2 的实现和声明文件，不能只检查顶层 loader。 */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)

    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith('.ts') ? [path] : []
  })
}

/**
 * 这是实施计划要求的依赖边界门禁，不替代行为测试。
 *
 * 检查语法节点而非注释文本：
 * 注释提到旧实现不会产生假阳性。
 */
describe('HW2 architecture boundary', () => {
  it('HW2 全目录不引用旧绘制对象，也不自行 draw', () => {
    const denied = new Set([
      'BaseRenderer',
      'MeshRenderer',
      'WebGLRenderer',
      'ForwardRenderPass',
      'createPRTSHRenderer',
      'createCubemapBackground'
    ])

    const violations: string[] = []
    const root = resolve('src/scenes/games202/hw2')

    for (const file of sourceFiles(root)) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      )

      const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && denied.has(node.text)) {
          violations.push(file + ': ' + node.text)
        }

        if (ts.isStringLiteral(node) && node.text.startsWith('@/renderers/')) {
          violations.push(file + ': ' + node.text)
        }

        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ['draw', 'drawArrays', 'drawElements'].includes(node.expression.name.text)
        ) {
          violations.push(file + ': ' + node.expression.name.text)
        }

        ts.forEachChild(node, visit)
      }

      visit(source)
    }

    expect(violations).toEqual([])
  })

  /** 限定工厂输入，不允许把设备、Renderer 或 Pipeline 塞回工厂。 */
  it('CPU 工厂只接收 preset 与 signal', () => {
    const file = resolve('src/scenes/games202/hw2/createHW2Scene.ts')

    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )

    const declaration = source.statements.find(
      (node): node is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(node) && node.name?.text === 'createHW2Scene'
    )

    expect(declaration).toBeDefined()

    expect(
      declaration?.parameters.map((parameter) => ({
        name: parameter.name.getText(source),
        type: parameter.type?.getText(source)
      }))
    ).toEqual([
      { name: 'preset', type: 'HW2ScenePreset' },
      { name: 'signal', type: 'AbortSignal' }
    ])
  })
})
