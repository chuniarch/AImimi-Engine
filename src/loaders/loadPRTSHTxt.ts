import { ResourceLoadError } from '@/errors/EngineError/ResourceError/ResourceLoadError'
import { fetchTextWithTimeout } from '@/network/fetchText'
import type { TransportType } from './types/loadPRT'

/** 两份文本解析出的 CPU 数据；数组属于调用者，不包含 WebGL handle。 */
export interface PRTData {
  /** RGB 三个通道，各通道按 SH 系数顺序排列。 */
  lightSH: number[][]

  /** 每个面角一行，顺序必须与 OBJ 的 face-expanded position 一致。 */
  transportSH: number[][]

  /**
   * transport 文件头原样记录的导出器内部顶点数。
   * 保留字段以兼容旧调用者。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][prt-export-header-vs-face-count]
   *
   * prt/src/prt.cpp 先写 mesh->getVertexCount()，
   * 随后按三角形的三个索引逐行写系数。
   *
   * 因此它不是 transportSH.length，
   * 也不一定等于 OBJ 的原始 v 行数。
   *
   * 场景工厂必须用 transportSH.length
   * 和 OBJ 展开后的 position count 对齐。
   */
  vertexCount: number
}

/**
 * 去掉文件两端空白。
 * 保留内部空行，使损坏数据在后续验证中暴露。
 */
function requireLines(text: string, kind: string, url: string): string[] {
  const trimmed = text.trim()

  if (trimmed.length === 0) {
    throw new ResourceLoadError(kind, url, {
      reason: 'PRT file is empty'
    })
  }

  return trimmed.split(/\r?\n/)
}

/**
 * 验证一整行的宽度和每一个数。
 * 禁止 Number('') 把空行伪装成一个零。
 *
 * @param lineNumber - 原文件中的一基行号，直接供错误定位使用。
 */
function parseRow(
  line: string,
  expectedCount: number,
  kind: string,
  url: string,
  lineNumber: number
): number[] {
  const trimmed = line.trim()
  const fields = trimmed.length === 0 ? [] : trimmed.split(/\s+/)

  if (fields.length !== expectedCount) {
    throw new ResourceLoadError(kind, url, {
      reason: 'Unexpected PRT row width',
      line: lineNumber,
      expectedCount,
      receivedCount: fields.length
    })
  }

  return fields.map((field, column) => {
    const value = Number(field)

    if (!Number.isFinite(value)) {
      throw new ResourceLoadError(kind, url, {
        reason: 'PRT coefficient must be a finite number',
        line: lineNumber,
        column: column + 1,
        received: field
      })
    }

    return value
  })
}

/**
 * 并发加载 light.txt 与 transport_<model>_<type>.txt，
 * 并验证、解析 CPU 数据。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][hw2-loader-abort-boundary]
 *
 * 可选 signal 保持现有三参数调用兼容。
 * 入口和 await 之后均检查取消状态。
 *
 * 网络错误原样传播，只有文本内容错误
 * 才在本层创建 ResourceLoadError。
 *
 * [DESIGN-WEIGHT:3][prt-export-header-vs-face-count]
 *
 * 文件头与系数行数不能强制相等。
 * 需要验证的是：
 *
 * - 文件头为正安全整数；
 * - 每行系数数目与 light 的 SH 系数数目一致；
 * - 逐面行数是非零的三的倍数。
 *
 * 是否和某个 OBJ 完全对齐，
 * 只有同时拿到 OBJ 的场景工厂才能判断。
 *
 * 光照文件按“系数 × RGB”保存，
 * 本函数将它转成“RGB × 系数”，
 * 供三个 uLightSH_R/G/B 参数使用。
 *
 * 转置不改变每个通道内部的系数顺序。
 */
export async function loadPRTSHTxt(
  envDir: string,
  modelName: string,
  transportType: TransportType,
  signal?: AbortSignal
): Promise<PRTData> {
  signal?.throwIfAborted()

  const directory = envDir.replace(/\/+$/, '')
  const lightPath = directory + '/light.txt'
  const transportPath = directory + '/transport_' + modelName + '_' + transportType + '.txt'

  const [lightText, transportText] = await Promise.all([
    fetchTextWithTimeout(lightPath, { signal }),
    fetchTextWithTimeout(transportPath, { signal })
  ])

  signal?.throwIfAborted()

  const lightRows = requireLines(lightText, 'prt-light', lightPath).map((line, index) =>
    parseRow(line, 3, 'prt-light', lightPath, index + 1)
  )

  const lightSH: number[][] = [[], [], []]

  for (const row of lightRows) {
    lightSH[0]!.push(row[0]!)
    lightSH[1]!.push(row[1]!)
    lightSH[2]!.push(row[2]!)
  }

  const transportLines = requireLines(transportText, 'prt-transport', transportPath)

  const vertexCount = Number(transportLines[0]!.trim())

  if (!Number.isSafeInteger(vertexCount) || vertexCount <= 0) {
    throw new ResourceLoadError('prt-transport', transportPath, {
      reason: 'Exporter vertex-count header must be a positive safe integer',
      received: transportLines[0]
    })
  }

  const transportSH = transportLines
    .slice(1)
    .map((line, index) =>
      parseRow(line, lightRows.length, 'prt-transport', transportPath, index + 2)
    )

  if (transportSH.length === 0 || transportSH.length % 3 !== 0) {
    throw new ResourceLoadError('prt-transport', transportPath, {
      reason: 'Face-expanded transport must contain complete triangles',
      faceVertexCount: transportSH.length
    })
  }

  return { lightSH, transportSH, vertexCount }
}
