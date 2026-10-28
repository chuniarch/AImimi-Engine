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
