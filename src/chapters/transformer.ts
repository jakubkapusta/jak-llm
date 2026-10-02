import './transformer.css'
import { ScrollTrigger } from '../lib/scroll'
import { $, $$, h, reducedMotion } from '../lib/utils'

const NS = 'http://www.w3.org/2000/svg'
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...kids: (SVGElement | string)[]) {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  for (const k of kids) el.append(k)
  return el
}

const COLS = [150, 250, 350, 450]
const TOKS = ['Kot', 'usiadł', 'na', 'ciepłym']

function attention(y0: number, y1: number, cls: string, label: string) {
  const g = s('g', { class: cls })
  g.append(s('rect', { class: 'band', x: 100, y: y0, width: 400, height: y1 - y0, rx: 12 }))
  g.append(s('text', { class: 'lbl', x: 0, y: (y0 + y1) / 2 + 4 }, label))
  for (let i = 0; i < COLS.length; i++) {
    for (let j = 0; j <= i; j++) {
      const xa = COLS[j]
      const xb = COLS[i]
      const d =
        i === j
          ? `M${xa - 6},${y1 - 8} C${xa - 16},${y0 + 14} ${xa + 16},${y0 + 14} ${xa + 6},${y0 + 8}`
          : `M${xa},${y1 - 8} C${xa},${y0 + 4} ${xb},${y1 - 4} ${xb},${y0 + 8}`
      g.append(s('path', { class: 'arc', d }))
    }
  }
  return g
}

function mlp(y0: number, y1: number, cls: string, label: string) {
  const g = s('g', { class: cls })
  g.append(s('text', { class: 'lbl', x: 0, y: (y0 + y1) / 2 + 4 }, label))
  for (const x of COLS) {
    const m = s('g', { class: 'tf-mlp' })
    m.append(s('rect', { x: x - 30, y: y0, width: 60, height: y1 - y0, rx: 9 }))
    const nodes = s('g', { class: 'nodes' })
    for (let k = -1; k <= 1; k++) nodes.append(s('circle', { cx: x + k * 14, cy: (y0 + y1) / 2, r: 3.5 }))
    m.append(nodes)
    g.append(m)
  }
  return g
}

function buildSVG(svg: SVGSVGElement) {
  svg.append(
    s(
      'defs',
      {},
      s(
        'filter',
        { id: 'glow', x: '-200%', y: '-200%', width: '500%', height: '500%' },
        s('feGaussianBlur', { stdDeviation: 4, result: 'b' }),
        s('feMerge', {}, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' })),
      ),
    ),
  )

  // strumienie rezydualne
  const gs = s('g', { class: 'g-stream' })
  gs.append(s('text', { class: 'lbl', x: 0, y: 650 }, 'strumień'))
  for (const x of COLS) {
    gs.append(s('line', { class: 'stream', x1: x, y1: 662, x2: x, y2: 150 }))
    gs.append(s('line', { class: 'stream-flow', x1: x, y1: 662, x2: x, y2: 150 }))
  }
  // łącznik ostatniej kolumny do wyjścia
  gs.append(s('line', { class: 'stream', x1: 450, y1: 150, x2: 450, y2: 104, 'stroke-width': 4 }))
  svg.append(gs)

  // tokeny i embeddingi
  const ge = s('g', { class: 'g-emb' })
  ge.append(s('text', { class: 'lbl', x: 0, y: 745 }, 'tokeny'))
  ge.append(s('text', { class: 'lbl', x: 0, y: 686 }, 'embedding'))
  TOKS.forEach((t, i) => {
    const x = COLS[i]
    ge.append(
      s('g', { class: 'tok-chip' }, s('rect', { x: x - 40, y: 722, width: 80, height: 32, rx: 8 }), s('text', { x, y: 743, 'text-anchor': 'middle' }, t)),
    )
    const emb = s('g', { class: 'emb' })
    emb.append(s('rect', { x: x - 26, y: 670, width: 52, height: 22, rx: 5 }))
    for (let k = 0; k < 6; k++) {
      emb.append(s('rect', { x: x - 21 + k * 7.2, y: 675, width: 5, height: 12, rx: 1.5, style: `fill:hsl(${(i * 70 + k * 37) % 360} 70% 70% / .55);stroke:none` }))
    }
    ge.append(emb)
  })
  svg.append(ge)

  // blok 1
  svg.append(attention(560, 614, 'g-att1', 'uwaga'))
  svg.append(mlp(484, 528, 'g-mlp1', 'MLP'))

  // blok 2 i powtórzenia
  const rep = s('g', { class: 'g-rep' })
  rep.append(attention(392, 446, '', 'uwaga'))
  rep.append(mlp(320, 362, '', 'MLP'))
  rep.append(s('text', { class: 'lbl', x: 0, y: 252 }, '× dziesiątki'))
  for (const x of COLS) rep.append(s('text', { class: 'dots-n', x, y: 258, 'text-anchor': 'middle' }, '⋮'))
  rep.append(s('rect', { class: 'band', x: 100, y: 168, width: 400, height: 40, rx: 12, style: 'stroke-dasharray:4 6' }))
  svg.append(rep)

  // wyjście
  const go = s('g', { class: 'g-out' })
  go.append(s('text', { class: 'lbl', x: 0, y: 56 }, 'wyjście'))
  const out = s('g', { class: 'out' })
  out.append(s('rect', { x: 276, y: 0, width: 260, height: 104, rx: 12 }))
  const cands: [string, number][] = [
    ['parapecie', 0.41],
    ['kocu', 0.23],
    ['piecu', 0.11],
  ]
  cands.forEach(([w, p], i) => {
    const y = 18 + i * 28
    out.append(s('text', { class: 'bt', x: 292, y: y + 12 }, w))
    out.append(s('rect', { x: 392, y: y + 2, width: 100, height: 10, rx: 5, style: 'fill:rgba(255,255,255,.06);stroke:none' }))
    out.append(s('rect', { class: 'bar', x: 392, y: y + 2, width: 100 * (p / 0.41), height: 10, rx: 5, style: 'stroke:none' }))
    out.append(s('text', { class: 'bt', x: 500, y: y + 12 }, Math.round(p * 100) + '%'))
  })
  go.append(out)
  svg.append(go)

  // pakiety (po jednym na token)
  const packets = COLS.map((x) => {
    const g = s('g', {})
    g.append(s('circle', { class: 'packet-halo', cx: x, cy: 0, r: 13 }))
    g.append(s('circle', { class: 'packet', cx: x, cy: 0, r: 5 }))
    svg.append(g)
    return g
  })
  return packets
}

// położenie pakietów w funkcji postępu przewijania
const KEYS: [number, number][] = [
  [0, 700],
  [0.12, 681],
  [0.3, 640],
  [0.42, 587],
  [0.58, 506],
  [0.8, 230],
  [0.9, 160],
  [1, 160],
]
function yAt(p: number) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) {
      const [p0, y0] = KEYS[i - 1]
      const [p1, y1] = KEYS[i]
      const t = (p - p0) / (p1 - p0)
      return y0 + (y1 - y0) * (t * t * (3 - 2 * t))
    }
  }
  return KEYS[KEYS.length - 1][1]
}

export function initTransformer() {
  const svg = $<SVGSVGElement>('.tf-svg')
  const packets = buildSVG(svg)
  const steps = $$('.tf-step')
  const dotsEl = $('.tf-dots')
  const dots = steps.map(() => {
    const d = h('i')
    dotsEl.append(d)
    return d
  })

  let cur = -1
  const setStep = (i: number) => {
    if (i === cur) return
    cur = i
    svg.dataset.step = String(i)
    steps.forEach((st, j) => {
      st.classList.toggle('on', j === i)
      st.classList.toggle('past', j < i)
    })
    dots.forEach((d, j) => d.classList.toggle('on', j <= i))
  }

  const update = (p: number) => {
    setStep(Math.min(5, Math.floor(p * 6)))
    const y = yAt(p)
    packets.forEach((g, i) => {
      // na końcu dalej jedzie tylko ostatni token — to on przewiduje następne słowo
      let yy = y
      if (i === 3 && p > 0.84) yy = 160 - ((p - 0.84) / 0.16) * 60
      const op = i < 3 && p > 0.86 ? Math.max(0, 1 - (p - 0.86) / 0.08) : 1
      g.setAttribute('transform', `translate(0, ${yy})`)
      g.setAttribute('opacity', String(op))
    })
  }

  if (reducedMotion) {
    // bez przypinania: pokaż wszystkie kroki jeden pod drugim
    $('.tf-pin').classList.add('static')
    update(0.99)
    steps.forEach((st) => st.classList.add('on'))
    return
  }

  ScrollTrigger.create({
    trigger: '.tf-pin',
    start: 'top top',
    end: '+=420%',
    pin: true,
    scrub: true,
    onUpdate: (self) => update(self.progress),
  })
  update(0)
}
