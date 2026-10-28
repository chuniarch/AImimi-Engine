import {
  Mesh as ThreeMesh,
  type BufferAttribute,
  type InterleavedBufferAttribute,
  type Material,
  type Object3D
} from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { ModelPaths } from '@/models/_config/modelPaths'
import { fetchTextWithTimeout } from '@/network/fetchText'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'

/** MTL 的线性数值和已加载图片；不包含 Three 材质、纹理或任何 GL 资源。 */
export interface HW1MaterialData {
  readonly diffuseColor: Vec3Tuple
  readonly specularColor: Vec3Tuple
  readonly shininess: number
  readonly diffuseImage: HTMLImageElement | null
}

/** 一个 OBJ material group 对应一个独立、按三角面展开的 CPU 数据块。 */
export interface HW1MeshPart {
  readonly name: string
  readonly positions: Float32Array
  readonly normals: Float32Array
  readonly uvs: Float32Array
  readonly material: HW1MaterialData
}

/** 固定先 Mary 后 Floor；名称不依赖文件内可变的 o/g 命名。 */
export interface HW1ModelData {
  readonly name: 'Mary' | 'Floor'
  readonly parts: readonly HW1MeshPart[]
}

interface ParsedMaterial {
  diffuseColor: Vec3Tuple
  specularColor: Vec3Tuple
  shininess: number
  imageURL: string | null
}

interface ParsedPart extends Omit<HW1MeshPart, 'material'> {
  readonly material: ParsedMaterial
}

/** 补齐目录分隔符，同时保留应用子路径、相对路径或 file:// 前缀。 */
function directory(path: string): string {
  return path.replace(/\/+$/, '') + '/'
}

/**
 * 相对于 MTL 目录解析图片；两个材质的等价相对路径可落到同一缓存键。
 * 临时 origin 仅用于路径规范化，不发出网络请求，也不改变原 URL 的相对/绝对性质。
 */
function imageURL(path: string, reference: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return new URL(reference, directory(path)).href
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(reference)) return reference
  const resolved = new URL(reference, new URL(directory(path), 'https://hw1.invalid/'))
  const relative = resolved.pathname + resolved.search + resolved.hash
  return path.startsWith('/') ? relative : relative.slice(1)
}

/** 所有 CPU 格式错误带上具体文件 URL，网络错误则保持网络层原有类型。 */
function invalid(url: string, reason: string): ResourceLoadError {
  return new ResourceLoadError('model', url, { reason })
}

/** 注释和续行先统一处理，预检与 OBJLoader 必须看到相同的有效指令。 */
function sourceLines(text: string): string[] {
  return text
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.split('#', 1)[0]!.trim())
}

/** 以完整 token 读取数值，拒绝 parseFloat 会悄悄接受的 “0.8garbage”。 */
function numbers(value: string, count: number, url: string, field: string): number[] {
  const values = value.trim().split(/\s+/).map(Number)
  if (
    value.trim() === '' ||
    values.length !== count ||
    values.some((item) => !Number.isFinite(item))
  ) {
    throw invalid(url, `${field} requires ${count} finite numeric values`)
  }
  return values
}

/**
 * 只解释本场景能表达的普通不透明 MTL 子集。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-asset-linear-material-data]
 *
 * Kd/Ks/Ns 直接从文本复制；不调用 MTLLoader.create/preload，也不经过 Three.Color，
 * 因而不会被 Three 的色彩管理改写。没有 map_Kd 时返回 null，白色占位由场景工厂决定。
 * 缺省 Kd/Ks/Ns 分别是白色、零高光、零指数。
 *
 * Ka 属于旧 MTL 环境项、Ni 属于折射信息；本场景环境光由场景统一控制，且只接受不透明表面，
 * 因此检查其数值后不使用它们。Ke 只接受零，d/Tr 只接受完全不透明，illum 只接受 1/2。
 * 法线贴图、透明贴图、纹理坐标变换等无法在此数据结构中表达，必须显式失败。
 */
function parseMaterials(text: string, path: string, url: string): Map<string, ParsedMaterial> {
  const result = new Map<string, ParsedMaterial>()
  let current: ParsedMaterial | undefined

  for (const line of sourceLines(text)) {
    if (line === '') continue
    const split = line.search(/\s/)
    const keyword = (split === -1 ? line : line.slice(0, split)).toLowerCase()
    const value = split === -1 ? '' : line.slice(split).trim()
    if (keyword === 'newmtl') {
      if (value === '' || result.has(value))
        throw invalid(url, 'MTL material names must be nonempty and unique')
      current = { diffuseColor: [1, 1, 1], specularColor: [0, 0, 0], shininess: 0, imageURL: null }
      result.set(value, current)
      continue
    }
    if (current === undefined) throw invalid(url, 'MTL property appears before newmtl')

    if (keyword === 'kd' || keyword === 'ks' || keyword === 'ka' || keyword === 'ke') {
      const components = numbers(value, 3, url, keyword)
      if (components.some((component) => component < 0))
        throw invalid(url, `${keyword} must be nonnegative`)
      const color: Vec3Tuple = Object.freeze([components[0]!, components[1]!, components[2]!])
      if (keyword === 'kd') current.diffuseColor = color
      if (keyword === 'ks') current.specularColor = color
      if (keyword === 'ke' && components.some((component) => component !== 0))
        throw invalid(url, 'Emissive MTL materials are unsupported')
    } else if (
      keyword === 'ns' ||
      keyword === 'd' ||
      keyword === 'tr' ||
      keyword === 'ni' ||
      keyword === 'illum'
    ) {
      const scalar = numbers(value, 1, url, keyword)[0]!
      if (keyword === 'ns') {
        if (scalar < 0) throw invalid(url, 'Ns must be nonnegative')
        current.shininess = scalar
      }
      if ((keyword === 'd' && scalar !== 1) || (keyword === 'tr' && scalar !== 0))
        throw invalid(url, 'Only opaque MTL materials are supported')
      if (keyword === 'ni' && scalar <= 0) throw invalid(url, 'Ni must be positive')
      if (keyword === 'illum' && scalar !== 1 && scalar !== 2)
        throw invalid(url, 'Only ordinary opaque illum 1/2 materials are supported')
    } else if (keyword === 'map_kd') {
      if (value === '' || value.startsWith('-'))
        throw invalid(url, 'map_Kd requires a filename without texture options')
      current.imageURL = imageURL(path, value)
    } else {
      throw invalid(url, `Unsupported MTL property: ${keyword}`)
    }
  }
  if (result.size === 0) throw invalid(url, 'MTL contains no materials')
  return result
}

/**
 * 原始面角预检弥补 OBJLoader 的宽容处理：不能把缺失贴图 UV 变成有效的 (0,0)。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-asset-obj-validation]
 *
 * 同一面内法线/UV 必须全部提供或全部省略。省略法线的面由 OBJLoader 计算几何法线，
 * 已提供法线则原样保留；只允许无贴图的面省略 UV。Floor 的四边形由 OBJLoader 扇形展开。
 * 对未知指令、非面图元、无效索引立即报错，避免解析器警告后继续交付不完整模型。
 * 返回展开后的预期顶点数，用于独立核对第三方输出是否丢面。
 */
function validateOBJ(
  lines: readonly string[],
  materials: ReadonlyMap<string, ParsedMaterial>,
  url: string
): number {
  const counts = [0, 0, 0]
  let material: ParsedMaterial | undefined
  let vertexCount = 0
  for (const line of lines) {
    if (line === '') continue
    const fields = line.split(/\s+/)
    const keyword = fields[0]!
    if (keyword === 'v' || keyword === 'vt' || keyword === 'vn') {
      const slot = keyword === 'v' ? 0 : keyword === 'vt' ? 1 : 2
      numbers(fields.slice(1).join(' '), slot === 1 ? 2 : 3, url, keyword)
      counts[slot] = counts[slot]! + 1
    } else if (keyword === 'usemtl') {
      const name = fields.slice(1).join(' ')
      material = materials.get(name)
      if (material === undefined) throw invalid(url, `Missing MTL material: ${name}`)
    } else if (keyword === 'f') {
      if (material === undefined || fields.length < 4)
        throw invalid(url, 'Every polygon needs a known material and at least three corners')
      const corners = fields.slice(1).map((field) => field.split('/'))
      for (const corner of corners) {
        if (corner.length > 3 || corner[0] === '') throw invalid(url, 'Invalid OBJ face corner')
        for (let slot = 0; slot < 3; slot++) {
          const token = corner[slot]
          if (token === undefined || token === '') continue
          if (!/^-?[1-9]\d*$/.test(token))
            throw invalid(url, 'OBJ indices must be nonzero integers')
          const index = Number(token)
          const count = counts[slot]!
          if (!Number.isSafeInteger(index) || (index > 0 ? index > count : -index > count))
            throw invalid(url, 'OBJ index exceeds available attributes')
        }
      }
      for (const slot of [1, 2]) {
        const present = corners.map((corner) => corner[slot] !== undefined && corner[slot] !== '')
        if (present.some(Boolean) && !present.every(Boolean))
          throw invalid(url, 'Mixed missing UV/normal attributes within one face are unsupported')
        if (slot === 1 && material.imageURL !== null && !present.every(Boolean))
          throw invalid(url, 'Mapped material requires UV coordinates on every corner')
      }
      vertexCount += (corners.length - 2) * 3
    } else if (!['o', 'g', 's', 'mtllib'].includes(keyword)) {
      throw invalid(url, `Unsupported OBJ directive: ${keyword}`)
    }
  }
  if (vertexCount === 0) throw invalid(url, 'OBJ contains no polygon faces')
  return vertexCount
}

/** 避免泛型 instanceof 被 TypeScript 收窄成 Mesh<any, any>。 */
function isThreeMesh(node: Object3D): node is ThreeMesh {
  return node instanceof ThreeMesh
}

/** 每组复制独立数组；检查转换后的 Float32，防止有限 double 溢出为 Infinity。 */
function copyAttribute(
  attribute: BufferAttribute | InterleavedBufferAttribute,
  start: number,
  count: number,
  size: number,
  url: string
): Float32Array {
  const result = new Float32Array(count * size)
  for (let vertex = 0; vertex < count; vertex++) {
    for (let component = 0; component < size; component++) {
      result[vertex * size + component] = attribute.getComponent(start + vertex, component)
    }
  }
  if (result.some((value) => !Number.isFinite(value)))
    throw invalid(url, 'Expanded attributes must contain finite Float32 values')
  return result
}

/**
 * 按 Mesh → group 顺序复制，每个 group 根据自己的 materialIndex 查找原 MTL。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-asset-material-groups]
 *
 * Three 对象只是短暂的 CPU 解析容器。多材质 Mesh 的全部区间必须连续、完整且三角对齐，
 * 单材质 Mesh 则覆盖完整数组；不能用 material[0] 替代每个区间的材质。
 * 不调用 MTLLoader 的资源创建入口，因此没有隐式纹理请求。
 * finally 释放临时 geometry/material，即使分组校验或复制失败也执行；重复材质只释放一次。
 */
function parseParts(
  text: string,
  materials: ReadonlyMap<string, ParsedMaterial>,
  url: string
): readonly ParsedPart[] {
  const lines = sourceLines(text)
  const expectedVertices = validateOBJ(lines, materials, url)
  try {
    const object = new OBJLoader().parse(lines.join('\n'))
    try {
      const parts: ParsedPart[] = []
      let totalVertices = 0
      for (const [meshIndex, node] of object.children.entries()) {
        if (!isThreeMesh(node)) throw invalid(url, 'OBJ must contain only triangle Mesh objects')
        const geometry = node.geometry
        const position = geometry.getAttribute('position')
        const normal = geometry.getAttribute('normal')
        const uv = geometry.getAttribute('uv')
        if (
          geometry.index !== null ||
          position?.itemSize !== 3 ||
          normal?.itemSize !== 3 ||
          normal.count !== position.count ||
          position.count === 0 ||
          position.count % 3 !== 0 ||
          (uv !== undefined && (uv.itemSize !== 2 || uv.count !== position.count))
        )
          throw invalid(url, 'Invalid non-indexed triangle attribute layout')
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material]
        const groups =
          geometry.groups.length > 0
            ? geometry.groups
            : [{ start: 0, count: position.count, materialIndex: 0 }]
        if (nodeMaterials.length > 1 && geometry.groups.length === 0)
          throw invalid(url, 'Multiple materials require explicit geometry groups')
        let cursor = 0
        for (const [groupIndex, group] of groups.entries()) {
          if (
            !Number.isInteger(group.start) ||
            !Number.isInteger(group.count) ||
            group.start !== cursor ||
            group.count <= 0 ||
            group.count % 3 !== 0 ||
            group.start + group.count > position.count ||
            !Number.isInteger(group.materialIndex)
          )
            throw invalid(url, 'Material groups must form complete consecutive triangles')
          const sourceMaterial = nodeMaterials[group.materialIndex!]
          const material =
            sourceMaterial === undefined ? undefined : materials.get(sourceMaterial.name)
          if (material === undefined) throw invalid(url, 'Material group has no matching MTL entry')
          parts.push({
            name: `${node.name || 'mesh'}:${meshIndex}:${groupIndex}`,
            positions: copyAttribute(position, group.start, group.count, 3, url),
            normals: copyAttribute(normal, group.start, group.count, 3, url),
            uvs:
              uv === undefined
                ? new Float32Array(group.count * 2)
                : copyAttribute(uv, group.start, group.count, 2, url),
            material
          })
          cursor += group.count
        }
        if (cursor !== position.count)
          throw invalid(url, 'Material groups do not cover the entire geometry')
        totalVertices += cursor
      }
      if (totalVertices !== expectedVertices)
        throw invalid(url, 'OBJ parser did not preserve all polygon corners')
      return parts
    } finally {
      const geometries = new Set<ThreeMesh['geometry']>()
      const temporaryMaterials = new Set<Material>()
      object.traverse((node) => {
        if (!isThreeMesh(node)) return
        geometries.add(node.geometry)
        for (const material of Array.isArray(node.material) ? node.material : [node.material])
          temporaryMaterials.add(material)
      })
      for (const geometry of geometries) geometry.dispose()
      for (const material of temporaryMaterials) material.dispose()
    }
  } catch (error) {
    if (error instanceof ResourceLoadError) throw error
    throw new ResourceLoadError(
      'model',
      url,
      { reason: 'OBJ parsing failed' },
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * 成功保留 src；失败、取消、6000ms 超时均清空 src 并解除图片及 signal 的回调。
 * settled 处理 load/error/abort/timeout 竞争；图片成功后再取消旧 signal 不会破坏已交付像素。
 * 图片只在这里加载，上传、纹理颜色解码和 GL 能力检查留给渲染层。
 */
async function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const image = new Image()
    let settled = false
    const cleanup = (): void => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', abort)
      clearTimeout(timer)
    }
    const fail = (error: unknown): void => {
      if (settled) return
      settled = true
      cleanup()
      image.removeAttribute('src')
      reject(error)
    }
    const abort = (): void => fail(signal.reason)
    const timer = setTimeout(
      () => fail(new ResourceLoadError('image', url, { reason: 'Image loading timed out' })),
      6000
    )
    image.onload = () => {
      if (settled) return
      if (signal.aborted) {
        abort()
        return
      }
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        fail(new ResourceLoadError('image', url, { reason: 'Image has no decoded pixels' }))
        return
      }
      settled = true
      cleanup()
      resolve(image)
    }
    image.onerror = () =>
      fail(new ResourceLoadError('image', url, { reason: 'Image loading failed' }))
    signal.addEventListener('abort', abort, { once: true })
    try {
      signal.throwIfAborted()
      image.crossOrigin = 'anonymous'
      image.src = url
    } catch (error) {
      fail(error)
    }
  })
}

/**
 * 下载 Mary/Floor 的 OBJ、MTL 与漫反射图片，交付纯 CPU 场景输入。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw1-asset-build-cancellation]
 *
 * 四个文本并行获取 → 校验并复制全部几何/材质 → 按 URL 去重并行加载图片 → 一次性交付。
 * 各阶段 await 之后复查取消，以防外部依赖忽略 AbortSignal。
 * 子控制器把任一失败传播给同批未完成请求，不反向取消父 signal；finally 移除父监听。
 * Promise.all 对每个已启动任务立即登记拒绝处理，先失败的任务不会让其余拒绝无人观察。
 *
 * 这里没有 Resource 所有权、Scene、旧 Mesh/Transform 或 WebGL 创建；调用者拿到成功数据后，
 * 才由场景工厂建立需要的 CPU Resource 并登记生命周期。
 *
 * @param signal - 本次场景构建的取消信号，取消原因原样传播。
 * @returns 固定顺序 Mary、Floor 的完整模型数据；每个材质区间有独立属性数组。
 * @throws ResourceLoadError 格式不受支持、模型/材质无效、图片失败或超时。
 */
export async function loadHW1Assets(signal: AbortSignal): Promise<readonly HW1ModelData[]> {
  signal.throwIfAborted()
  const controller = new AbortController()
  const forwardAbort = (): void => controller.abort(signal.reason)
  signal.addEventListener('abort', forwardAbort, { once: true })
  const child = controller.signal
  const models = [
    { name: 'Mary', path: directory(ModelPaths.HW1_MARY), filename: 'Marry' },
    { name: 'Floor', path: directory(ModelPaths.HW1_FLOOR), filename: 'floor' }
  ] as const
  const read = async (url: string): Promise<string> => {
    child.throwIfAborted()
    const text = await fetchTextWithTimeout(url, { signal: child })
    child.throwIfAborted()
    return text
  }
  try {
    signal.throwIfAborted()
    const texts = await Promise.all(
      models.flatMap((model) => [
        read(`${model.path}${model.filename}.obj`),
        read(`${model.path}${model.filename}.mtl`)
      ])
    )
    child.throwIfAborted()
    const parsed = models.map((model, index) => {
      const materials = parseMaterials(
        texts[index * 2 + 1]!,
        model.path,
        `${model.path}${model.filename}.mtl`
      )
      return {
        name: model.name,
        parts: parseParts(texts[index * 2]!, materials, `${model.path}${model.filename}.obj`)
      }
    })
    child.throwIfAborted()
    const urls = [
      ...new Set(
        parsed.flatMap((model) =>
          model.parts.flatMap((part) =>
            part.material.imageURL === null ? [] : [part.material.imageURL]
          )
        )
      )
    ]
    const images = await Promise.all(urls.map(async (url) => loadImage(url, child)))
    child.throwIfAborted()
    const byURL = new Map(urls.map((url, index) => [url, images[index]!]))
    return Object.freeze(
      parsed.map((model) =>
        Object.freeze({
          name: model.name,
          parts: Object.freeze(
            model.parts.map((part) =>
              Object.freeze({
                name: part.name,
                positions: part.positions,
                normals: part.normals,
                uvs: part.uvs,
                material: Object.freeze({
                  diffuseColor: part.material.diffuseColor,
                  specularColor: part.material.specularColor,
                  shininess: part.material.shininess,
                  diffuseImage:
                    part.material.imageURL === null ? null : byURL.get(part.material.imageURL)!
                })
              })
            )
          )
        })
      )
    )
  } catch (error) {
    controller.abort(error)
    signal.throwIfAborted()
    throw error
  } finally {
    signal.removeEventListener('abort', forwardAbort)
  }
}
