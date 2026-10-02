import './scale.css'
import { gsap } from '../lib/scroll'
import { $, $$, reducedMotion, watchVisible } from '../lib/utils'

const NS = 'http://www.w3.org/2000/svg'
const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (text) e.textContent = text
  return e
}

/* ---- kropki parametrów ---- */
const MODELS: [string, number][] = [
  ['117 mln', 117e6],
  ['1,5 mld', 1.5e9],
  ['175 mld', 175e9],
  ['405 mld', 405e9],
]

function initParams() {
  const root = $('.params')
  const canvas = $<HTMLCanvasElement>('.params-canvas', root)
  const nEl = $('.params-n', root)
  const ctx = canvas.getContext('2d')!
  const maxDots = 405e9 / 1e7
  let shown = 0
  let target = 175e9 / 1e7
  let visible = false
  let raf = 0

  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    // siatka dobrana tak, by największy model wypełnił całe płótno
    const cell = Math.sqrt((W * H) / maxDots)
    const cols = Math.floor(W / cell)
    const r = Math.max(0.6, cell * 0.36)
    const n = Math.round(shown)
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7cc8ff'
    ctx.fillStyle = accent
    // cztery poziomy jasności, żeby „ściana” parametrów migotała jak tkanina
    for (let b = 0; b < 4; b++) {
      ctx.globalAlpha = 0.35 + b * 0.2
      for (let i = b; i < n; i += 1) {
        if (((i * 2654435761) >>> 0) % 4 !== b) continue
        const c = i % cols
        const row = Math.floor(i / cols)
        ctx.fillRect(c * cell + cell / 2 - r, row * cell + cell / 2 - r, r * 2, r * 2)
      }
    }
    ctx.globalAlpha = 1
    // pojedyncze kropki dla bardzo małych modeli powiększamy, żeby były widoczne
    if (n < 200) {
      ctx.shadowColor = accent
      ctx.shadowBlur = 8
      for (let i = 0; i < n; i++) {
        const c = i % cols
        const row = Math.floor(i / cols)
        ctx.beginPath()
        ctx.arc(c * cell + cell / 2, row * cell + cell / 2, Math.max(r, 1.6), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }
  }

  const animateTo = (dots: number) => {
    target = dots
    cancelAnimationFrame(raf)
    if (reducedMotion) {
      shown = target
      draw()
      return
    }
    const from = shown
    const t0 = performance.now()
    const dur = 1400
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - t, 3)
      shown = from + (target - from) * e
      draw()
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  $$<HTMLButtonElement>('.params-pick button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.params-pick button', root).forEach((x) => x.classList.toggle('on', x === b))
      const [label, n] = MODELS[Number(b.dataset.p)]
      nEl.textContent = label
      animateTo(n / 1e7)
    }),
  )
  watchVisible(root, (v) => {
    if (v && !visible) {
      visible = true
      animateTo(target)
    }
  })
  new ResizeObserver(draw).observe(canvas)
}

/* ---- prawa skalowania ---- */
function initLaw() {
  const svg = $<SVGSVGElement>('.law-svg')
  const L = 56
  const R = 500
  const T = 20
  const B = 280
  // oś x: 10^18 … 10^26 FLOP, oś y: strata 1.6 … 4.0 (log)
  const X = (e: number) => L + ((e - 18) / 8) * (R - L)
  const Y = (loss: number) => T + (1 - (Math.log(loss) - Math.log(1.6)) / (Math.log(4.2) - Math.log(1.6))) * (B - T)
  const law = (e: number) => 1.55 + 2.3 * Math.pow(10, -(e - 18) * 0.11)
  for (let e = 18; e <= 26; e += 2) {
    svg.append(el('line', { class: 'gridl', x1: X(e), y1: T, x2: X(e), y2: B }))
    svg.append(el('text', { x: X(e), y: B + 18, 'text-anchor': 'middle' }, `10^${e}`))
  }
  for (const v of [2, 3, 4]) {
    svg.append(el('line', { class: 'gridl', x1: L, y1: Y(v), x2: R, y2: Y(v) }))
    svg.append(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, String(v)))
  }
  svg.append(el('line', { class: 'ax', x1: L, y1: B, x2: R, y2: B }))
  svg.append(el('line', { class: 'ax', x1: L, y1: T, x2: L, y2: B }))
  svg.append(el('text', { x: (L + R) / 2, y: B + 36, 'text-anchor': 'middle' }, 'moc obliczeniowa treningu (FLOP)'))
  svg.append(el('text', { x: 14, y: (T + B) / 2, transform: `rotate(-90 14 ${(T + B) / 2})`, 'text-anchor': 'middle' }, 'błąd (strata)'))

  const pts: string[] = []
  for (let e = 18; e <= 23.6; e += 0.1) pts.push(`${X(e)},${Y(law(e))}`)
  const fit = el('polyline', { class: 'fit', points: pts.join(' ') }) as SVGPolylineElement
  const ext: string[] = []
  for (let e = 23.6; e <= 26; e += 0.1) ext.push(`${X(e)},${Y(law(e))}`)
  const extra = el('polyline', { class: 'extra', points: ext.join(' ') })
  svg.append(fit, extra)
  const dots: SVGElement[] = []
  const jitter = [0.03, -0.02, 0.025, -0.03, 0.015, -0.01, 0.02]
  ;[18.4, 19.3, 20.1, 21, 21.8, 22.7, 23.5].forEach((e, i) => {
    const d = el('circle', { class: 'pt', cx: X(e), cy: Y(law(e) + jitter[i]), r: 5 })
    svg.append(d)
    dots.push(d)
  })
  svg.append(el('text', { class: 'lbl-acc', x: X(24.2), y: Y(law(24.2)) - 14 }, 'przewidywanie →'))

  if (reducedMotion) return
  const len = fit.getTotalLength()
  fit.style.strokeDasharray = String(len)
  fit.style.strokeDashoffset = String(len)
  const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 75%' } })
  tl.from(dots, { scale: 0, transformOrigin: 'center', opacity: 0, stagger: 0.1, duration: 0.5, ease: 'back.out(3)' })
    .to(fit, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0.3)
    .from(extra, { opacity: 0, duration: 0.8 }, 1.5)
}

/* ---- emergencja ---- */
function initEmergence() {
  const svg = $<SVGSVGElement>('.emer-svg')
  const L = 50
  const R = 500
  const T = 20
  const B = 250
  const sizes = [7, 8, 9, 10, 11, 12] // log10 parametrów
  const X = (e: number) => L + ((e - 6.6) / 5.8) * (R - L)
  const Y = (v: number) => B - v * (B - T)
  // prawdopodobieństwo poprawnej cyfry rośnie płynnie; wynik idealny wymaga trafienia wszystkich ~6 cyfr
  const perDigit = (e: number) => 1 / (1 + Math.exp(-(e - 9.6) * 1.5))
  const exact = (e: number) => Math.pow(perDigit(e), 6)
  for (const e of sizes) {
    svg.append(el('line', { class: 'gridl', x1: X(e), y1: T, x2: X(e), y2: B }))
    svg.append(el('text', { x: X(e), y: B + 18, 'text-anchor': 'middle' }, `10^${e}`))
  }
  for (const v of [0, 0.5, 1]) svg.append(el('text', { x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, `${v * 100}%`))
  svg.append(el('line', { class: 'ax', x1: L, y1: B, x2: R, y2: B }))
  svg.append(el('line', { class: 'ax', x1: L, y1: T, x2: L, y2: B }))
  svg.append(el('text', { x: (L + R) / 2, y: B + 38, 'text-anchor': 'middle' }, 'liczba parametrów'))

  const path = el('path', { class: 'curve' }) as SVGPathElement
  svg.append(path)
  const dots = sizes.map((e) => {
    const d = el('circle', { class: 'dot', cx: X(e), cy: Y(0), r: 5 })
    svg.append(d)
    return d
  })
  const set = (mode: number) => {
    const fn = mode === 0 ? exact : perDigit
    let d = ''
    for (let e = 6.8; e <= 12.2; e += 0.05) d += (d ? 'L' : 'M') + X(e).toFixed(1) + ',' + Y(fn(e)).toFixed(1)
    path.setAttribute('d', d)
    path.style.setProperty('d', `path("${d}")`)
    dots.forEach((dot, i) => dot.setAttribute('cy', String(Y(fn(sizes[i])))))
  }
  $$<HTMLButtonElement>('.emer-pick button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.emer-pick button').forEach((x) => x.classList.toggle('on', x === b))
      set(Number(b.dataset.e))
    }),
  )
  set(0)
  if (!reducedMotion) gsap.from(dots, { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.08, scrollTrigger: { trigger: svg, start: 'top 80%' } })
}

export function initScale() {
  initParams()
  initLaw()
  initEmergence()
}
