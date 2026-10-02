import './limits.css'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { $, h, reducedMotion, rng } from '../lib/utils'

const NS = 'http://www.w3.org/2000/svg'
const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (text) e.textContent = text
  return e
}

function initHallu() {
  if (reducedMotion) return
  gsap.from('.stamp', {
    scale: 2.6,
    opacity: 0,
    rotate: -30,
    duration: 0.5,
    ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '.hallu', start: 'top 65%' },
    delay: 0.4,
  })
}

function initCtx() {
  const strip = $('.ctx-strip')
  for (let i = 0; i < 120; i++) strip.append(h('i', { style: `width:${10 + ((i * 37) % 22)}px` }))
}

function initThink() {
  if (reducedMotion) return
  gsap.from('.th-row', { opacity: 0, x: -20, stagger: 0.4, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: '.think', start: 'top 75%' } })
}

function initAgent() {
  const svg = $<SVGSVGElement>('.agent-svg')
  const nodes: [number, number, string, string, string][] = [
    [180, 30, 'model', 'pisze wywołanie', 'model'],
    [310, 110, 'narzędzie', 'szukaj · kod · plik', ''],
    [180, 190, 'wynik', 'trafia do kontekstu', ''],
    [50, 110, 'kontekst', 'rośnie z każdym krokiem', ''],
  ]
  svg.append(el('ellipse', { class: 'loop', cx: 180, cy: 110, rx: 130, ry: 80 }))
  for (const [x, y, t, s, cls] of nodes) {
    const g = el('g', { class: 'node ' + cls })
    g.append(el('rect', { x: x - 52, y: y - 20, width: 104, height: 40, rx: 10 }))
    g.append(el('text', { x, y: y - 2 }, t))
    g.append(el('text', { class: 'sub', x, y: y + 12 }, s))
    svg.append(g)
  }
  const runner = el('circle', { class: 'runner', r: 6, cx: 180, cy: 30 })
  svg.append(runner)
  if (reducedMotion) return
  const state = { a: -Math.PI / 2 }
  gsap.to(state, {
    a: Math.PI * 1.5,
    duration: 6,
    ease: 'none',
    repeat: -1,
    onUpdate: () => {
      runner.setAttribute('cx', String(180 + Math.cos(state.a) * 130))
      runner.setAttribute('cy', String(110 + Math.sin(state.a) * 80))
    },
  })
}

function initPatches() {
  const box = $('.patches')
  const r = rng(9)
  const cells: HTMLElement[] = []
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 8; x++) {
      // prosty „pejzaż”: niebo, słońce, wzgórza
      const sky = y < 2
      const sun = (x - 5.5) ** 2 + (y - 1) ** 2 < 1.6
      const hill = y >= 3 || (y === 2 && (x < 3 || x > 5))
      const col = sun ? [255, 190, 90] : hill ? [111, 200 + r() * 40, 150] : sky ? [124, 170 + r() * 30, 255] : [183, 155, 255]
      const c = h('i', { style: `background:rgba(${col.map(Math.round).join(',')},${0.55 + r() * 0.35})` })
      box.append(c)
      cells.push(c)
    }
  if (reducedMotion) return
  gsap.from(cells, {
    scale: 0,
    opacity: 0,
    rotate: 45,
    duration: 0.5,
    ease: 'back.out(2)',
    stagger: { each: 0.025, from: 'random' },
    scrollTrigger: { trigger: box, start: 'top 85%' },
  })
}

function initFinale() {
  const text = $('.finale-text')
  // owinięcie słów w spany (z zachowaniem <em>)
  const words: HTMLElement[] = []
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment()
        for (const part of (child.textContent ?? '').split(/(\s+)/)) {
          if (!part) continue
          if (/^\s+$/.test(part)) frag.append(' ')
          else {
            const s = h('span', { class: 'fw' }, part)
            words.push(s)
            frag.append(s)
          }
        }
        child.replaceWith(frag)
      } else walk(child)
    }
  }
  walk(text)
  if (reducedMotion) {
    words.forEach((w) => (w.style.opacity = '1'))
    return
  }
  ScrollTrigger.create({
    trigger: text,
    start: 'top 75%',
    end: 'bottom 40%',
    scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * words.length)
      words.forEach((w, i) => (w.style.opacity = i < n ? '1' : '0.14'))
    },
  })
  gsap.from('.finale-end > *', {
    opacity: 0,
    y: 40,
    stagger: 0.25,
    duration: 1.2,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.finale-end', start: 'top 85%' },
  })
}

export function initLimits() {
  initHallu()
  initCtx()
  initThink()
  initAgent()
  initPatches()
  initFinale()
}
