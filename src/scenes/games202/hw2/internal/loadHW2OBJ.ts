import { Mesh as ThreeMesh, type Object3D } from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { fetchTextWithTimeout } from '@/network/fetchText'

/**
 * 在 OBJ 解析边界把节点收窄为具有默认资源类型的 Three.js Mesh。
 *
 * @remarks
 * [DESIGN-WEIGHT:2][hw2-obj-mesh-type-narrowing]
 *
 * 当前 TypeScript 对泛型构造器的直接 instanceof 收窄会得到
 * Mesh<any, any, any>，导致 geometry 和 material 的类型信息丢失。
 * 返回类型中的 ThreeMesh 使用其声明的默认类型参数：
 * BufferGeometry、Material | Material[] 和 Object3DEventMap。
 *
 * 本函数只负责识别节点种类，不替代后续三角面、position 布局、
 * 顶点数量及有限数值检查。输入来自本模块使用的 OBJLoader，
 * 并非任意外部 JSON。
 *
 * @param node - OBJ 解析结果中的节点；空 children 的索引读取可能是 undefined。
 * @returns 是否为当前 Three.js 模块的 Mesh 实例。
 */
function isThreeMesh(node: Object3D | undefined): node is ThreeMesh {
  return node instanceof ThreeMesh
}

/**
 * 检查原始 f 指令，而不只检查解析后的顶点数。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-obj-face-order]
 *
 * OBJLoader 可以自动把多边形切成三角形，但这里不能假定其切分顺序
 * 与离线 PRT 导出器一致。
 *
 * 因此本 HW2 加载器只接受显式三角面；
 * 不替代通用 OBJ loader。
 *
 * @returns 原文件中三角面的数量，
 * 用于核对解析器是否完整保留所有面角。
 */
function requireTriangleFaces(text: string, url: string): number {
  let faceCount = 0

  for (const [lineIndex, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.split('#', 1)[0]!.trim()

    if (line.length === 0) continue

    const fields = line.split(/\s+/)

    if (fields[0] !== 'f') continue

    if (fields.length !== 4) {
      throw new ResourceLoadError('model', url, {
        reason: 'HW2 PRT requires exactly three corners per OBJ face',
        line: lineIndex + 1,
        cornerCount: fields.length - 1
      })
    }

    faceCount++
  }

  if (faceCount === 0) {
    throw new ResourceLoadError('model', url, {
      reason: 'OBJ contains no triangle faces'
    })
  }

  return faceCount
}

/**
 * 加载一个 HW2 OBJ，返回独立的逐面展开 position 数组。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-obj-face-order]
 *
 * 顺序是：
 * fetch 文本 → 检查原始三角面 → OBJLoader.parse → 复制位置。
 *
 * 不请求 MTL、不合并多个 Mesh、不去重、不重排顶点，
 * 也不创建任何 GL 对象。
 *
 * 一个 Mesh 内的多个 material groups 只是绘制区间，
 * 不应被当成多个 Geometry。
 *
 * [DESIGN-WEIGHT:3][hw2-loader-abort-boundary]
 *
 * 请求开始前和 await 完成后都检查取消。
 * 向 fetch 转交 signal 不是充分条件：
 *
 * - 依赖可能忽略取消；
 * - 依赖也可能在取消前已完成，
 *   但其结果尚未被本函数处理。
 *
 * @param path - 模型目录，允许末尾带斜杠。
 * @param name - 不带 .obj 扩展名的模型名称。
 * @param signal - 本次场景构建的取消信号。
 * @returns 按 f 指令和面角顺序排列的独立 Float32Array。
 * @throws {@link ResourceLoadError}
 * OBJ 结构、位置或解析结果不适合当前 PRT 路径。
 */
export async function loadHW2OBJ(
  path: string,
  name: string,
  signal: AbortSignal
): Promise<Float32Array> {
  signal.throwIfAborted()

  const url = path.replace(/\/+$/, '') + '/' + name + '.obj'
  const text = await fetchTextWithTimeout(url, { signal })

  signal.throwIfAborted()

  const faceCount = requireTriangleFaces(text, url)

  try {
    const object = new OBJLoader().parse(text)

    try {
      const mesh = object.children[0]

      if (object.children.length !== 1 || !isThreeMesh(mesh)) {
        throw new ResourceLoadError('model', url, {
          reason: 'HW2 PRT requires exactly one Mesh; automatic group concatenation is disabled',
          childCount: object.children.length
        })
      }

      const geometry = mesh.geometry
      const position = geometry.getAttribute('position')

      if (geometry.index !== null || position?.itemSize !== 3 || position.count !== faceCount * 3) {
        throw new ResourceLoadError('model', url, {
          reason: 'Expected non-indexed, complete triangle positions',
          expectedFaceVertices: faceCount * 3,
          receivedFaceVertices: position?.count
        })
      }

      const positions = new Float32Array(position.count * 3)

      for (let vertex = 0; vertex < position.count; vertex++) {
        const offset = vertex * 3

        positions[offset] = position.getX(vertex)
        positions[offset + 1] = position.getY(vertex)
        positions[offset + 2] = position.getZ(vertex)
      }

      for (const value of positions) {
        if (!Number.isFinite(value)) {
          throw new ResourceLoadError('model', url, {
            reason: 'Expanded positions must contain only finite Float32 values'
          })
        }
      }

      signal.throwIfAborted()

      return positions
    } finally {
      // Three 对象只是解析期临时容器；
      // 返回值已经复制，不借用其 BufferAttribute。
      //
      // 此处 dispose 不代表删除了本引擎的 GPU buffer：
      // 这里根本没有上传 GPU。
      object.traverse((node) => {
        if (!isThreeMesh(node)) return

        node.geometry.dispose()

        const materials = Array.isArray(node.material) ? node.material : [node.material]

        for (const material of materials) {
          material.dispose()
        }
      })
    }
  } catch (error: unknown) {
    signal.throwIfAborted()

    if (error instanceof ResourceLoadError) throw error

    throw new ResourceLoadError(
      'model',
      url,
      { reason: 'OBJ parsing failed' },
      error instanceof Error ? error : undefined
    )
  }
}
