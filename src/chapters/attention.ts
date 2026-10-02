import './attention.css'
import { gsap } from '../lib/scroll'
import { $, $$, fmt, h, pct, reducedMotion, softmax } from '../lib/utils'

type Sentence = {
  words: string[]
  focus: number
  sem: Record<number, number[]>
  meaning: [string, string, number][]
}

const SENTENCES: Sentence[] = [
  {
    words: ['Zapiąłem', 'kurtkę', 'na', 'zamek'],
    focus: 3,
    sem: { 1: [0.6, 0.4], 2: [0.15, 0.45, 0.4], 3: [0.24, 0.54, 0.04, 0.18] },
    meaning: [
      ['🧥', 'zamek błyskawiczny', 0.86],
      ['🚪', 'zamek w drzwiach', 0.1],
      ['🏰', 'budowla', 0.04],
    ],
  },
  {
    words: ['Na', 'wzgórzu', 'stał', 'stary', 'zamek'],
    focus: 4,
    sem: { 1: [0.3, 0.7], 2: [0.1, 0.55, 0.35], 3: [0.05, 0.2, 0.25, 0.5], 4: [0.03, 0.46, 0.14, 0.22, 0.15] },
    meaning: [
      ['🏰', 'budowla', 0.9],
      ['🚪', 'zamek w drzwiach', 0.08],
      ['🧥', 'zamek błyskawiczny', 0.02],
    ],
  },
  {
    words: ['Przekręciłem', 'klucz,', 'ale', 'zamek', 'się', 'zaciął'],
    focus: 3,
    sem: {
      1: [0.55, 0.45],
      2: [0.15, 0.35, 0.5],
      3: [0.3, 0.5, 0.04, 0.16],
      4: [0.05, 0.08, 0.04, 0.48, 0.35],
      5: [0.08, 0.14, 0.05, 0.5, 0.08, 0.15],
    },
    meaning: [
      ['🚪', 'zamek w drzwiach', 0.88],
      ['🧥', 'zamek błyskawiczny', 0.06],
      ['🏰', 'budowla', 0.06],
    ],
  },
]

function weights(s: Sentence, head: number, i: number): number[] {
  const n = i + 1
  if (i === 0) return [1]
  if (head === 1) {
    // „poprzednie słowo”
    const w = Array(n).fill(0.1 / Math.max(1, n - 2))
    w[i - 1] = 0.75
    w[i] = 0.15
    if (n === 2) w[0] = 0.85
    return normalize(w)
  }
  if (head === 2) {
    // „pierwszy token” — tzw. attention sink, zrzutowisko uwagi
    const w = Array(n).fill(0.1 / Math.max(1, n - 2))
    w[0] = 0.72
    w[i] = 0.18
    return normalize(w)
  }
  return s.sem[i] ? normalize([...s.sem[i]]) : normalize(Array(n).fill(1))
}
const normalize = (w: number[]) => {
  const t = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / t)
}

function initArcs() {
  const root = $('.att')
  const wordsEl = $('.att-words', root)
  const arcs = $<SVGSVGElement>('.att-arcs', root)
  const viz = $('.att-viz', root)
  const mbars = $('.att-mbars', root)
  let si = 0
  let head = 0
  let sel = SENTENCES[0].focus

  const drawArcs = () => {
    const s = SENTENCES[si]
    const words = $$('.att-word', wordsEl)
    const w = weights(s, head, sel)
    const vb = viz.getBoundingClientRect()
    arcs.setAttribute('viewBox', `0 0 ${vb.width} 190`)
    arcs.innerHTML = ''
    const cx = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return r.left - vb.left + r.width / 2
    }
    const base = 170
    const x0 = cx(words[sel])
    words.forEach((el, j) => {
      el.classList.toggle('sel', j === sel)
      el.classList.toggle('future', j > sel)
      el.style.setProperty('--w', j <= sel && j !== sel ? String(w[j]) : '0')
    })
    const NS = 'http://www.w3.org/2000/svg'
    w.forEach((wj, j) => {
      if (wj < 0.015) return
      const x1 = cx(words[j])
      const path = document.createElementNS(NS, 'path')
      let d: string
      let ly: number
      let lx: number
      if (j === sel) {
        d = `M${x0 - 10},${base - 6} C${x0 - 30},${base - 60} ${x0 + 30},${base - 60} ${x0 + 10},${base - 6}`
        lx = x0
        ly = base - 52
      } else {
        const hgt = Math.min(150, 40 + Math.abs(x0 - x1) * 0.38)
        d = `M${x0},${base - 4} C${x0},${base - hgt} ${x1},${base - hgt} ${x1},${base - 4}`
        lx = (x0 + x1) / 2
        ly = base - hgt * 0.75 - 6
      }
      path.setAttribute('d', d)
      path.setAttribute('pathLength', '1')
      path.setAttribute('stroke-width', String(1 + wj * 13))
      path.setAttribute('opacity', String(0.25 + wj * 0.75))
      path.style.animationDelay = `${(sel - j) * 60}ms`
      arcs.append(path)
      if (wj >= 0.08) {
        const t = document.createElementNS(NS, 'text')
        t.setAttribute('x', String(lx))
        t.setAttribute('y', String(ly))
        t.textContent = Math.round(wj * 100) + '%'
        arcs.append(t)
      }
    })
  }

  const drawMeaning = () => {
    const s = SENTENCES[si]
    mbars.innerHTML = ''
    s.meaning.forEach(([ic, label, p], i) =>
      mbars.append(
        h(
          'div',
          { class: 'att-mbar' + (i === 0 ? ' top' : ''), style: '--p:0' },
          h('span', {}, h('span', { class: 'ic' }, ic), label),
          h('span', { class: 'tr' }, h('i')),
          h('span', { class: 'pv' }, pct(p, 0)),
        ),
      ),
    )
    requestAnimationFrame(() =>
      requestAnimationFrame(() => $$('.att-mbar', mbars).forEach((el, i) => el.style.setProperty('--p', String(s.meaning[i][2])))),
    )
  }

  const renderSentence = () => {
    const s = SENTENCES[si]
    wordsEl.innerHTML = ''
    s.words.forEach((w, j) => {
      const b = h('button', { class: 'att-word' + (j === s.focus ? ' key' : '') }, w)
      b.addEventListener('mouseenter', () => {
        sel = j
        drawArcs()
      })
      b.addEventListener('click', () => {
        sel = j
        drawArcs()
      })
      wordsEl.append(b)
    })
    sel = s.focus
    if (!reducedMotion) gsap.from(wordsEl.children, { y: 20, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' })
    drawArcs()
    drawMeaning()
  }

  $$<HTMLButtonElement>('.att-sent button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.att-sent button', root).forEach((x) => x.classList.toggle('on', x === b))
      si = Number(b.dataset.s)
      renderSentence()
    }),
  )
  $$<HTMLButtonElement>('.att-head button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.att-head button', root).forEach((x) => x.classList.toggle('on', x === b))
      head = Number(b.dataset.h)
      drawArcs()
    }),
  )
  wordsEl.addEventListener('mouseleave', () => {
    sel = SENTENCES[si].focus
    drawArcs()
  })
  new ResizeObserver(() => drawArcs()).observe(viz)
  renderSentence()
}

/* ------------------------------------------------------------------ */
/* Q · K · V na prawdziwych liczbach                                   */
/* ------------------------------------------------------------------ */

const DIMS = ['ubranie', 'budowla', 'mechan.', 'gram.']
const QKV = {
  tokens: ['Zapiąłem', 'kurtkę', 'na', 'zamek'],
  q: [2, 2, 2, 0],
  k: [
    [1.2, 0, 0.6, 0.5],
    [2.4, 0, 0.2, 0.3],
    [0, 0, 0, 1.5],
    [0.5, 0.5, 0.5, 0.2],
  ],
  v: [
    [0.8, 0, 0.4, 0],
    [1.0, 0, 0, 0],
    [0, 0, 0, 0.3],
    [0.3, 0.3, 0.3, 0],
  ],
}

function initQKV() {
  const body = $('.qkv-body')
  const cap = $('.qkv-cap')
  const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
  const scores = QKV.k.map((k) => dot(QKV.q, k))
  const scaled = scores.map((s) => s / Math.sqrt(QKV.q.length))
  const w = softmax(scaled)
  const out = DIMS.map((_, d) => QKV.v.reduce((s, v, i) => s + w[i] * v[d], 0))
  const cell = (x: number) => h('span', { class: 'cell' }, fmt(x, 1))

  const head = (extra: string[]) =>
    h('tr', {}, h('th', {}, 'token'), ...DIMS.map((d) => h('th', {}, d)), ...extra.map((e) => h('th', {}, e)))

  const render = (step: number) => {
    const table = h('table', { class: 'qkv-table qkv-fade' })
    if (step === 0) {
      table.append(head([]))
      table.append(h('tr', { class: 'qrow' }, h('td', {}, h('b', { class: 'q' }, 'Q'), ' zamek'), ...QKV.q.map((x) => h('td', {}, cell(x)))))
      QKV.tokens.forEach((t, i) =>
        table.append(h('tr', {}, h('td', {}, h('b', { class: 'k' }, 'K'), ' ' + t), ...QKV.k[i].map((x) => h('td', { class: 'k' }, cell(x))))),
      )
      cap.innerHTML = 'Query „zamka” pyta równo o <b>ubranie</b>, <b>budowlę</b> i <b>mechanizm</b>. Każdy wcześniejszy token wystawia swój Key. (Nazwy wymiarów są dla nas — w prawdziwym modelu wymiary nie mają podpisów.)'
    } else if (step === 1 || step === 2) {
      table.append(h('tr', {}, h('th', {}, 'token'), h('th', {}, 'Q·K'), h('th', {}, '÷ √4'), h('th', {}, step === 2 ? 'waga' : ''), h('th', {}, '')))
      QKV.tokens.forEach((t, i) => {
        const bar = h('span', { class: 'wbar', style: '--p:0' }, h('i'))
        table.append(
          h(
            'tr',
            {},
            h('td', {}, t),
            h('td', {}, h('span', { class: 'cell score' }, fmt(scores[i], 1))),
            h('td', {}, h('span', { class: 'cell' }, fmt(scaled[i], 2))),
            h('td', {}, step === 2 ? h('span', { class: 'cell score' }, pct(w[i], 0)) : ''),
            h('td', { style: 'width:34%' }, step === 2 ? bar : ''),
          ),
        )
        if (step === 2) requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty('--p', String(w[i]))))
      })
      cap.innerHTML =
        step === 1
          ? 'Iloczyn skalarny: mnożymy pary liczb i sumujemy. <b>„kurtkę”</b> pasuje najlepiej (5,2), „na” wcale (0). Dzielimy przez √4 = 2, żeby liczby nie były za duże.'
          : 'Softmax zamienia wyniki na procenty, które sumują się do 100%. Ponad połowa uwagi „zamka” trafia do <b>„kurtkę”</b>.'
    } else {
      table.append(head(['waga']))
      QKV.tokens.forEach((t, i) =>
        table.append(h('tr', {}, h('td', {}, h('b', { class: 'v' }, 'V'), ' ' + t), ...QKV.v[i].map((x) => h('td', {}, cell(x))), h('td', {}, pct(w[i], 0)))),
      )
      table.append(h('tr', { class: 'out' }, h('td', {}, '= wynik'), ...out.map((x) => h('td', {}, h('span', { class: 'cell' }, fmt(x, 2)))), h('td', {}, '')))
      cap.innerHTML = 'Mieszamy Values według wag. Wynik — z przewagą wymiaru <b>„ubranie”</b> — zostaje <b>dodany</b> do strumienia „zamka”. Od tej chwili „zamek” wie, że jest częścią kurtki.'
    }
    body.innerHTML = ''
    body.append(table)
  }

  $$<HTMLButtonElement>('.qkv-steps button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.qkv-steps button').forEach((x) => x.classList.toggle('on', x === b))
      render(Number(b.dataset.q))
    }),
  )
  render(0)
}

function initMatrix() {
  const el = $('.att-matrix')
  const s = SENTENCES[2]
  const n = s.words.length
  el.style.gridTemplateColumns = `auto repeat(${n}, minmax(0, 1fr))`
  el.append(h('div', { class: 'corner', html: 'patrzy ↓<br>na →' }))
  s.words.forEach((w) => el.append(h('div', { class: 'ch' }, w)))
  const cells: HTMLElement[] = []
  for (let i = 0; i < n; i++) {
    el.append(h('div', { class: 'rh' }, s.words[i]))
    const w = weights(s, 0, i)
    for (let j = 0; j < n; j++) {
      const c =
        j > i
          ? h('div', { class: 'c mask', title: 'zablokowane: przyszłość' })
          : h('div', { class: 'c' + (w[j] < 0.12 ? ' lowv' : ''), style: `--w:${w[j]}`, title: `${s.words[i]} → ${s.words[j]}: ${pct(w[j], 0)}` }, Math.round(w[j] * 100) + '')
      el.append(c)
      cells.push(c)
    }
  }
  if (!reducedMotion)
    gsap.from(cells, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(2)',
      stagger: { each: 0.012, grid: [n, n], from: 'start' },
      scrollTrigger: { trigger: el, start: 'top 80%' },
    })
}

export function initAttention() {
  initArcs()
  initQKV()
  initMatrix()
}
