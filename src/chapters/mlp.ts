import './mlp.css'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { $, $$, h, pct, reducedMotion, rng } from '../lib/utils'

const NS = 'http://www.w3.org/2000/svg'
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

type Case = {
  before: [string, number][]
  after: [string, number][]
  feats: string[]
  poly: string
  seed: number
}
const CASES: Case[] = [
  {
    before: [['mieście', 0.18], ['centrum', 0.12], ['Paryżu', 0.09], ['Europie', 0.07]],
    after: [['Paryżu', 0.81], ['centrum', 0.06], ['stolicy', 0.04], ['Francji', 0.03]],
    feats: ['Paryż', 'Francja', 'słynne zabytki', 'stalowe konstrukcje', 'turystyka'],
    poly: 'neuron #1873: „wieże” + „szachy” + „HTML”',
    seed: 11,
  },
  {
    before: [['mieście', 0.15], ['roku', 0.14], ['Polsce', 0.1], ['Toruniu', 0.08]],
    after: [['Toruniu', 0.74], ['roku', 0.09], ['Polsce', 0.07], ['1473', 0.04]],
    feats: ['Toruń', 'astronomia', 'Polska', 'renesans', 'biografie naukowców'],
    poly: 'neuron #402: „gwiazdy” + „hotele” + „oceny filmów”',
    seed: 23,
  },
  {
    before: [['Tokio', 0.25], ['miasto', 0.2], ['Kioto', 0.1], ['Osaka', 0.05]],
    after: [['Tokio', 0.93], ['miasto', 0.02], ['Kioto', 0.015], ['oczywiście', 0.01]],
    feats: ['Tokio', 'Japonia', 'stolice państw', 'Azja Wschodnia', 'metropolie'],
    poly: 'neuron #77: „sushi” + „origami” + „Pokémon”',
    seed: 37,
  },
]

const IN_X = 30
const OUT_X = 586
const CELL_Y = (i: number) => 52 + i * 24
const NX = (c: number) => 236 + c * 26
const NY = (r: number) => 80 + r * 30

export function initMLP() {
  const root = $('.mlp')
  const svg = $<SVGSVGElement>('.mlp-svg', root)
  const bars = $('.mlp-bars', root)
  const when = $('.mlp-when', root)
  const chips = $('.mlp-chips', root)

  // statyczna część
  const cap = (x: number, t: string, anchor = 'middle') => {
    const el = svgEl('text', { class: 'cap', x, y: 26, 'text-anchor': anchor })
    el.textContent = t
    svg.append(el)
  }
  cap(IN_X - 4, 'wejście', 'start')
  cap(327, 'neurony (w praktyce: dziesiątki tysięcy)')
  cap(OUT_X + 26, 'co dopisać', 'end')

  const wires = svgEl('g', {})
  svg.append(wires)
  const inCells: SVGRectElement[] = []
  const outCells: SVGRectElement[] = []
  for (let i = 0; i < 12; i++) {
    const a = svgEl('rect', { class: 'cell', x: IN_X, y: CELL_Y(i), width: 22, height: 18, rx: 4 }) as SVGRectElement
    const b = svgEl('rect', { class: 'cell', x: OUT_X, y: CELL_Y(i), width: 22, height: 18, rx: 4 }) as SVGRectElement
    svg.append(a, b)
    inCells.push(a)
    outCells.push(b)
  }
  const neurons: SVGCircleElement[] = []
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const n = svgEl('circle', { class: 'neuron', cx: NX(c), cy: NY(r), r: 7.5 }) as SVGCircleElement
      svg.append(n)
      neurons.push(n)
    }
  const plus = svgEl('text', { class: 'plus', x: OUT_X + 8, y: 350 })
  plus.textContent = '+'
  svg.append(plus)
  const plusLbl = svgEl('text', { class: 'cap', x: OUT_X - 6, y: 346, 'text-anchor': 'end' })
  plusLbl.textContent = 'do strumienia'
  svg.append(plusLbl)

  const renderBars = (data: [string, number][]) => {
    bars.innerHTML = ''
    const max = data[0][1]
    data.forEach(([w, p], i) => {
      const fill = h('i')
      bars.append(h('div', { class: 'mlp-bar' + (i === 0 ? ' top' : '') }, h('span', {}, w), h('span', { class: 'tr' }, fill), h('span', { class: 'pv' }, pct(p, 0))))
      gsap.fromTo(fill, { scaleX: 0 }, { scaleX: p / Math.max(max, 0.3), duration: 0.9, ease: 'expo.out' })
    })
  }

  let tl: gsap.core.Timeline | null = null
  const play = (idx: number) => {
    tl?.kill()
    const cs = CASES[idx]
    const r = rng(cs.seed)
    const active = new Set<number>()
    while (active.size < cs.feats.length + 1) active.add(Math.floor(r() * 64))
    const act = [...active]
    const inVals = inCells.map(() => r() * 2 - 1)
    const outVals = outCells.map(() => r() * 2 - 1)

    // reset
    wires.innerHTML = ''
    neurons.forEach((n) => n.classList.remove('on'))
    inCells.forEach((c) => c.setAttribute('style', ''))
    outCells.forEach((c) => c.setAttribute('style', ''))
    when.textContent = 'przed MLP'
    renderBars(cs.before)
    chips.innerHTML = ''

    const inWires: SVGPathElement[] = []
    const outWires: SVGPathElement[] = []
    for (const a of act) {
      const nx = NX(a % 8)
      const ny = NY(Math.floor(a / 8))
      for (let i = 0; i < 12; i += 2 + Math.floor(r() * 2)) {
        const y = CELL_Y(i) + 9
        const p = svgEl('path', { class: 'wire', d: `M${IN_X + 22},${y} C${IN_X + 120},${y} ${nx - 90},${ny} ${nx - 8},${ny}`, pathLength: 1 }) as SVGPathElement
        wires.append(p)
        inWires.push(p)
      }
      for (let i = 1; i < 12; i += 2 + Math.floor(r() * 2)) {
        const y = CELL_Y(i) + 9
        const p = svgEl('path', { class: 'wire out', d: `M${nx + 8},${ny} C${nx + 90},${ny} ${OUT_X - 110},${y} ${OUT_X},${y}`, pathLength: 1 }) as SVGPathElement
        wires.append(p)
        outWires.push(p)
      }
    }
    const fillCell = (c: SVGRectElement, v: number) => {
      const col = v < 0 ? '124,200,255' : '255,180,84'
      c.setAttribute('style', `fill:rgba(${col},${0.15 + Math.abs(v) * 0.75});stroke:rgba(${col},.8)`)
    }
    const d = reducedMotion ? 0 : 1
    tl = gsap.timeline()
    tl.add(() => inCells.forEach((c, i) => setTimeout(() => fillCell(c, inVals[i]), i * 30 * d)), 0.1)
    tl.fromTo(inWires, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8 * d, stagger: 0.008 * d, ease: 'power2.inOut' }, 0.6 * d)
    tl.add(() => act.forEach((a) => neurons[a].classList.add('on')), 1.3 * d)
    tl.fromTo(act.map((a) => neurons[a]), { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', stagger: 0.05 * d }, 1.3 * d)
    tl.add(() => {
      cs.feats.forEach((f, i) => {
        const el = h('span', {}, f)
        chips.append(el)
        gsap.from(el, { opacity: 0, y: 8, delay: i * 0.08 * d, duration: 0.4 })
      })
      const pe = h('span', { class: 'poly', title: 'Przykład neuronu polisemantycznego (ilustracyjny)' }, cs.poly)
      chips.append(pe)
      gsap.from(pe, { opacity: 0, y: 8, delay: cs.feats.length * 0.08 * d, duration: 0.4 })
    }, 1.5 * d)
    tl.fromTo(outWires, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8 * d, stagger: 0.008 * d, ease: 'power2.inOut' }, 1.9 * d)
    tl.add(() => outCells.forEach((c, i) => setTimeout(() => fillCell(c, outVals[i]), i * 30 * d)), 2.6 * d)
    tl.add(() => {
      when.textContent = 'po MLP'
      renderBars(cs.after)
    }, 3.1 * d)
  }

  let cur = 0
  $$<HTMLButtonElement>('.mlp-pick button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.mlp-pick button', root).forEach((x) => x.classList.toggle('on', x === b))
      cur = Number(b.dataset.m)
      play(cur)
    }),
  )
  $('.mlp-replay', root).addEventListener('click', () => play(cur))
  renderBars(CASES[0].before)
  ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: () => play(0) })
}
