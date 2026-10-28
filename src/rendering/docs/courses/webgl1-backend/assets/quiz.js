// 经典脚本 (classic script)，不是 ES module：这样课程页用 file:// 双击打开也能加载。
window.RTeach = window.RTeach || {}

/**
 * 课程共用测验组件（改写自 FLIP 课程的 quiz.js，命名空间换成 RTeach）。
 *
 * 用法：在课程页里放一个 <div class="quiz" data-quiz="lesson-0001"></div>，
 * 然后调用 RTeach.renderQuiz(el, questions)。questions 形如：
 *   [{ q: '题干', opts: ['选项A', '选项B', '选项C'], answer: 1, why: '解析（可含 HTML）' }]
 *
 * 设计原则（来自课程方法论）：
 * - 选项字数尽量相同，不让长度暗示答案；
 * - 显示顺序确定性打乱，而且整组题的正确答案均匀分布在各个位置（RTeach.answerLayout），不让位置暗示答案。
 *   answer 仍指 opts 里的原始下标，所以解析里要按内容引用选项（「……」不对），不能写「第三项」；
 * - 点击后立即反馈并给出解析，反馈回路越短越好；
 * - 成绩记到 localStorage，下次打开显示上次得分，方便间隔复习。
 */
RTeach.renderQuiz = function renderQuiz(root, questions) {
  const key = 'webgl1-teach:' + (root.dataset.quiz || 'quiz')
  let correct = 0
  let answered = 0

  root.replaceChildren()

  const layouts = window.RTeach.answerLayout
    ? window.RTeach.answerLayout(
        questions.map((item) => ({ key: item.q, count: item.opts.length, answer: item.answer })),
        root.dataset.quiz || 'quiz'
      )
    : questions.map((item) => item.opts.map((_, optIndex) => optIndex))

  questions.forEach((item, index) => {
    const box = document.createElement('div')
    box.className = 'q'

    const stem = document.createElement('p')
    stem.textContent = `${index + 1}. ${item.q}`
    box.appendChild(stem)

    const opts = document.createElement('div')
    opts.className = 'opts'

    const why = document.createElement('div')
    why.className = 'why'

    let done = false
    layouts[index].forEach((optIndex) => {
      const text = item.opts[optIndex]
      const button = document.createElement('button')
      button.className = 'opt'
      button.type = 'button'
      button.dataset.index = String(optIndex)
      button.textContent = text
      button.addEventListener('click', () => {
        if (done) return
        done = true
        answered += 1
        const isRight = optIndex === item.answer
        if (isRight) correct += 1
        button.dataset.state = isRight ? 'ok' : 'bad'
        if (!isRight) {
          const rightButton = opts.querySelector('[data-index="' + item.answer + '"]')
          if (rightButton) rightButton.dataset.state = 'ok'
        }
        why.innerHTML = (isRight ? '对。' : '不对。') + item.why
        if (window.RTeach.linkSources) window.RTeach.linkSources(why)
        updateScore()
      })
      opts.appendChild(button)
    })

    box.appendChild(opts)
    box.appendChild(why)
    root.appendChild(box)
  })

  const score = document.createElement('div')
  score.className = 'score'
  root.appendChild(score)

  const previous = readPrevious()
  score.textContent =
    previous === null ? '' : `上次：${previous.correct}/${previous.total}（${previous.when}）`

  function updateScore() {
    score.textContent = `本次：${correct}/${answered}`
    if (answered === questions.length) {
      const record = {
        correct,
        total: questions.length,
        when: new Date().toLocaleDateString('zh-CN')
      }
      try {
        localStorage.setItem(key, JSON.stringify(record))
      } catch {
        /* 隐私模式等情况下忽略 */
      }
      score.textContent +=
        correct === questions.length ? ' —— 全对。' : ' —— 错的那题回头再读一遍对应小节。'
    }
  }

  function readPrevious() {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? null : JSON.parse(raw)
    } catch {
      return null
    }
  }
}
