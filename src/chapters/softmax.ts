import './softmax.css'
import { gsap } from '../lib/scroll'
import { $, $$, fmt, h, pct, reducedMotion, softmax, syncRange } from '../lib/utils'

const CANDS: [string, number][] = [
  ['parapecie', 5.1],
  ['kanapie', 4.6],
  ['macie', 3.9],
  ['kolanach', 3.7],
  ['dachu', 3.3],
  ['krześle', 3.0],
  ['płocie', 2.6],
  ['klawiaturze', 2.2],
  ['Księżycu', 0.4],
  ['ziemniaku', -0.5],
]

export function initSoftmax() {
  const root = $('.sm')
  const rowsEl = $('.sm-rows', root)
  const tIn = $<HTMLInputElement>('.sm-t', root)
  const pIn = $<HTMLInputElement>('.sm-p', root)
  const tOut = $('.sm-t-out', root)
  const pOut = $('.sm-p-out', root)
  const word = $('.sm-word', root)
  const note = $('.sm-note', root)
  const counts = CANDS.map(() => 0)
  let total = 0

  const rows = CANDS.map(([w, l]) => {
    const fill = h('i')
    const pv = h('span', { class: 'pv' })
    const cnt = h('span', { class: 'cnt' })
    const row = h('div', { class: 'sm-row' }, h('span', {}, w), h('span', { class: 'lg' }, fmt(l, 1)), h('span', { class: 'tr' }, fill), pv, cnt)
    rowsEl.append(row)
    return { row, fill, pv, cnt }
  })

  let probs: number[] = []
  const compute = () => {
    const T = Number(tIn.value)
    const P = Number(pIn.value)
    let p: number[]
    if (T < 0.02) {
      p = CANDS.map((_, i) => (i === 0 ? 1 : 0))
    } else {
      p = softmax(CANDS.map((c) => c[1]), T)
    }
    // top-p: zostaw najlepsze tokeny, które razem dają ≥ P
    const order = p.map((x, i) => [x, i] as const).sort((a, b) => b[0] - a[0])
    const keep = new Set<number>()
    let acc = 0
    for (const [x, i] of order) {
      keep.add(i)
      acc += x
      if (acc >= P - 1e-9) break
    }
    const kept = p.map((x, i) => (keep.has(i) ? x : 0))
    const s = kept.reduce((a, b) => a + b, 0)
    probs = kept.map((x) => x / s)
    rows.forEach((r, i) => {
      r.row.classList.toggle('cut', !keep.has(i))
      r.fill.style.width = (keep.has(i) ? probs[i] : p[i]) * 100 + '%'
      r.pv.textContent = pct(keep.has(i) ? probs[i] : p[i], 1)
    })
    tOut.textContent = fmt(T, 2)
    pOut.textContent = fmt(P, 2)
    syncRange(tIn)
    syncRange(pIn)
    const top = Math.max(...probs)
    note.innerHTML =
      T < 0.02
        ? '<b>Temperatura 0:</b> model zawsze wybierze „parapecie”. Powtarzalnie, ale nudno.'
        : top > 0.75
          ? 'Rozkład jest <b>ostry</b>: faworyt dominuje, odpowiedzi będą przewidywalne.'
          : top < 0.25
            ? 'Rozkład jest <b>płaski</b>: nawet „ziemniak” ma szansę. Ciekawie, ale ryzykownie.'
            : `Pod uwagę branych jest <b>${keep.size}</b> z 10 kandydatów.`
  }

  const resetCounts = () => {
    counts.fill(0)
    total = 0
    rows.forEach((r) => (r.cnt.textContent = ''))
  }

  const sample = () => {
    let r = Math.random()
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i]
      if (r <= 0) return i
    }
    return 0
  }

  const showCounts = () => rows.forEach((r, i) => (r.cnt.textContent = total ? String(counts[i]) : ''))

  $('.sm-one', root).addEventListener('click', () => {
    const i = sample()
    counts[i]++
    total++
    showCounts()
    rows.forEach((r, j) => r.row.classList.toggle('hit', j === i))
    word.textContent = CANDS[i][0]
    if (!reducedMotion) gsap.fromTo(word, { y: -24, opacity: 0, rotateX: 80 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, ease: 'back.out(2)' })
  })

  $('.sm-many', root).addEventListener('click', async () => {
    resetCounts()
    for (let k = 0; k < 100; k++) {
      const i = sample()
      counts[i]++
      total++
      if (k % 4 === 0 || k === 99) {
        showCounts()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
    const best = counts.indexOf(Math.max(...counts))
    rows.forEach((r, j) => r.row.classList.toggle('hit', j === best))
    word.textContent = CANDS[best][0]
    note.innerHTML = `Na 100 losowań „${CANDS[best][0]}” wypadło <b>${counts[best]}</b> razy. Kolumna po prawej pokazuje pozostałe.`
  })

  tIn.addEventListener('input', () => {
    resetCounts()
    compute()
  })
  pIn.addEventListener('input', () => {
    resetCounts()
    compute()
  })
  $$<HTMLButtonElement>('.sm-presets button', root).forEach((b) =>
    b.addEventListener('click', () => {
      tIn.value = b.dataset.t!
      pIn.value = b.dataset.p!
      resetCounts()
      compute()
    }),
  )
  compute()
}
