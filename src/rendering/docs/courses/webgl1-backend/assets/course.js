/* global window, document, HTMLScriptElement */
/** Public-course link adapter. Capture the classic script URL during execution. */
window.RTeach = window.RTeach || {}
;(function installPortableLinks() {
  const script = document.currentScript
  if (!(script instanceof HTMLScriptElement)) throw new Error('Course script URL is unavailable')
  const courseRoot = new URL('../', script.src)

  /** Keep file paths separate from optional source line numbers. */
  window.RTeach.linkSources = function linkSources(root) {
    for (const anchor of (root || document).querySelectorAll('a[data-src], a[data-main]')) {
      const fromMain = anchor.hasAttribute('data-main')
      const spec = anchor.getAttribute(fromMain ? 'data-main' : 'data-src') || ''
      const match = /^(.*?)(?::([0-9]+))?$/.exec(spec)
      const path = match[1]
      const key = (fromMain ? 'main:' : 'project:') + path
      const url = new URL('reference/source-viewer.html', courseRoot)
      url.searchParams.set('file', key)
      if (match[2]) url.hash = 'L' + match[2]
      anchor.href = url.href
      anchor.title = '发布时文件快照：' + path + (match[2] ? ':' + match[2] : '')
      anchor.classList.add('src')
      if (!anchor.textContent.trim()) anchor.textContent = path.split('/').pop()
    }
  }
})()

/**
 * 参考页的即时过滤：输入框里的每个空格分隔的词都要出现在条目文本里（不区分大小写）。
 * 条目是 .api 元素；没有可见条目的分组标题（.group-title，data-group 对应）一起隐藏。
 */
RTeach.attachFilter = function attachFilter(input) {
  const entries = Array.from(document.querySelectorAll('.api'))
  const groups = Array.from(document.querySelectorAll('.group-title'))
  const haystacks = new Map(entries.map((entry) => [entry, entry.textContent.toLowerCase()]))

  function apply() {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean)
    for (const entry of entries) {
      const text = haystacks.get(entry)
      const visible = words.every((word) => text.includes(word))
      entry.classList.toggle('hidden', !visible)
    }
    for (const title of groups) {
      const group = title.getAttribute('data-group')
      const anyVisible = entries.some(
        (entry) => entry.getAttribute('data-group') === group && !entry.classList.contains('hidden')
      )
      title.classList.toggle('hidden', !anyVisible)
    }
  }

  input.addEventListener('input', apply)
  if (location.hash === '' && input.value !== '') apply()
}

/**
 * 按一段文字（通常是题干）确定性地打乱 0..n-1。
 *
 * 检查题和预测卡片用它排列选项：同一道题每次打开顺序都一样（方便复习时对照上次的结果），
 * 但正确答案不会总在同一个位置，位置本身不能成为线索。
 * 哈希用 FNV-1a，洗牌用 Fisher–Yates，随机数用 xorshift32；只求分布散开，不求密码学强度。
 */
RTeach.seededOrder = function seededOrder(text, n) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const order = Array.from({ length: n }, (_, index) => index)
  for (let i = n - 1; i > 0; i--) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    const j = (h >>> 0) % (i + 1)
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  return order
}

/**
 * 给一组题排选项：正确答案的位置在整组里尽量均匀（例如 6 道三选一的题，每个位置恰好两次）。
 *
 * 单靠逐题打乱，6 道题里仍可能有 5 道的答案碰巧落在同一个位置——那也是线索。
 * 所以先由 seed 决定「哪一题分到哪个位置」，再把干扰项按各自的 key 打乱，填进剩下的位置。
 * 结果是确定的：同一组题每次打开都一样。
 *
 * @param list [{ key: 题干或标题, count: 选项数, answer: 正确选项的原始下标 }]
 * @param seed 这一组题的标识（例如 data-quiz 的值）
 * @returns 每题一个数组，按显示顺序列出原始下标
 */
RTeach.answerLayout = function answerLayout(list, seed) {
  const assignment = RTeach.seededOrder(seed, list.length)
  return list.map((item, index) => {
    const slot = assignment[index] % item.count
    const others = RTeach.seededOrder(item.key, item.count).filter((choice) => choice !== item.answer)
    const order = []
    for (let position = 0, next = 0; position < item.count; position++) {
      order.push(position === slot ? item.answer : others[next++])
    }
    return order
  })
}

document.addEventListener('DOMContentLoaded', () => RTeach.linkSources())
