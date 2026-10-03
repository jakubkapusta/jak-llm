import './agents.css'
import { gsap } from '../lib/scroll'
import { $, $$, fmt, h, reducedMotion, sleep, syncRange, watchVisible } from '../lib/utils'

const NS = 'http://www.w3.org/2000/svg'
const svgEl = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (text) e.textContent = text
  return e
}

/* ------------------------------------------------------------------ */
/* Ewolucja                                                            */
/* ------------------------------------------------------------------ */

function initEvo() {
  if (reducedMotion) return
  const narrow = window.matchMedia('(max-width: 860px)').matches
  gsap.from('.evo-line', {
    [narrow ? 'scaleY' : 'scaleX']: 0,
    transformOrigin: narrow ? '50% 0' : '0 50%',
    duration: 1.6,
    ease: 'power2.inOut',
    scrollTrigger: { trigger: '.evo', start: 'top 80%' },
  })
  gsap.from('.evo-step', { opacity: 0, y: 24, stagger: 0.18, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.evo', start: 'top 80%' } })
}

/* ------------------------------------------------------------------ */
/* Pętla agenta — odtworzenie prawdziwego zadania                      */
/* ------------------------------------------------------------------ */

type Ev = { t: 'user' | 'think' | 'call' | 'res' | 'img' | 'ans'; text: string; ctx?: number; todo?: [number, 'doing' | 'done'][]; plan?: boolean }
const TODOS = ['Znaleźć styl przycisku', 'Zrozumieć, czemu plus jest krzywy', 'Poprawić styl', 'Sprawdzić na zrzucie ekranu']
const LABELS: Record<Ev['t'], string> = {
  user: 'człowiek',
  think: 'model myśli',
  call: 'wywołanie narzędzia',
  res: 'wynik narzędzia',
  img: 'wynik narzędzia · obraz',
  ans: 'odpowiedź',
}
const EVENTS: Ev[] = [
  { t: 'user', text: 'Plus w przyciskach „Dla dociekliwych” nie jest wyśrodkowany. Popraw to.', ctx: 0.1 },
  { t: 'think', text: 'Rozpiszę to na kroki, żeby niczego nie pominąć.' },
  { t: 'call', text: 'TodoWrite([ 4 zadania ])', ctx: 0.3, plan: true },
  { t: 'think', text: 'Krok 1: gdzie jest styl tego przycisku?', todo: [[0, 'doing']] },
  { t: 'call', text: 'Grep("deep summary", "src/")', ctx: 0.1 },
  { t: 'res', text: 'src/styles/base.css:609  .deep summary::before {', ctx: 0.4, todo: [[0, 'done'], [1, 'doing']] },
  { t: 'call', text: 'Read("src/styles/base.css", linie 605–625)', ctx: 0.1 },
  { t: 'res', text: ".deep summary::before {\n  content: '+';\n  display: grid;\n  place-items: center;\n  …", ctx: 1.2 },
  { t: 'think', text: 'Plus to znak z fontu. Jego linia bazowa nie wypada na geometrycznym środku kółka — stąd przesunięcie. Lepiej narysować go dwiema kreskami w CSS.', ctx: 0.2, todo: [[1, 'done'], [2, 'doing']] },
  { t: 'call', text: "Edit(\"base.css\"):\n  content: '+'   →   content: ''\n  + dwa gradienty: 10×1,5 px i 1,5×10 px", ctx: 0.6 },
  { t: 'res', text: 'Plik zaktualizowany.', ctx: 0.1, todo: [[2, 'done'], [3, 'doing']] },
  { t: 'call', text: 'Screenshot(przeglądarka, sekcja „Dla dociekliwych”)', ctx: 0.1 },
  { t: 'img', text: 'Zrzut ekranu: plus leży teraz dokładnie na środku kółka.', ctx: 1.6 },
  { t: 'think', text: 'Wygląda dobrze. Wszystkie kroki z planu zrobione.', todo: [[3, 'done']] },
  { t: 'ans', text: 'Gotowe: plus jest rysowany w CSS zamiast znaku z fontu, więc siedzi dokładnie na środku. Sprawdzone na zrzucie ekranu.', ctx: 0.2 },
]

function initLoop() {
  const root = $('.loop')
  const log = $('.loop-log', root)
  const todo = $('.loop-todo', root)
  const status = $('.loop-status', root)
  const ctxN = $('.loop-ctx-n', root)
  const ctxBar = $('.loop-ctx i', root)
  const playBtn = $('.loop-play', root)
  let playing = true
  let visible = false
  let runId = 0
  watchVisible(root, (v) => (visible = v), '-15% 0px')

  const wait = async (ms: number, id: number) => {
    await sleep(reducedMotion ? 0 : ms)
    while ((!playing || !visible) && id === runId) await sleep(200)
    return id === runId
  }

  const run = async () => {
    const id = ++runId
    log.innerHTML = ''
    todo.innerHTML = ''
    let ctx = 14 // prompt systemowy + opisy narzędzi
    const showCtx = () => {
      ctxN.textContent = `${fmt(ctx, 1)}k / 200k`
      ctxBar.style.width = (ctx / 200) * 100 + '%'
    }
    showCtx()
    for (let i = 0; i < EVENTS.length; i++) {
      const e = EVENTS[i]
      status.textContent = `krok ${i + 1} / ${EVENTS.length}`
      const body = h('div')
      if (e.t === 'img') body.append(h('span', { class: 'shot' }), h('span', {}, e.text))
      else body.textContent = e.text
      const item = h('div', { class: `lg ${e.t === 'img' ? 'res img' : e.t}` }, h('span', { class: 'lk' }, LABELS[e.t]), body)
      log.append(item)
      log.scrollTo({ top: log.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
      if (e.plan) TODOS.forEach((t) => todo.append(h('li', {}, t)))
      for (const [k, st] of e.todo ?? []) {
        const li = todo.children[k] as HTMLElement | undefined
        if (!li) continue
        li.classList.remove('doing', 'done')
        li.classList.add(st)
      }
      ctx += e.ctx ?? 0.05
      showCtx()
      if (!(await wait(e.t === 'think' ? 1400 : e.t === 'res' || e.t === 'img' ? 1300 : 1000, id))) return
    }
    status.textContent = 'zadanie zakończone'
    if (!(await wait(5000, id))) return
    run()
  }

  playBtn.addEventListener('click', () => {
    playing = !playing
    playBtn.textContent = playing ? '❚❚ pauza' : '▶ dalej'
  })
  $('.loop-reset', root).addEventListener('click', () => {
    playing = true
    playBtn.textContent = '❚❚ pauza'
    run()
  })
  run()
}

/* ------------------------------------------------------------------ */
/* Okno kontekstu i kompaktowanie                                      */
/* ------------------------------------------------------------------ */

const CTX_CATS: [string, string][] = [
  ['Prompt systemowy', '#ffb454'],
  ['Opisy narzędzi (też z MCP)', '#b79bff'],
  ['Pamięć i opisy skilli', '#ff6f91'],
  ['Rozmowa', '#7cc8ff'],
  ['Wyniki narzędzi: pliki, logi, zrzuty', '#6ff0b8'],
  ['Streszczenie po kompaktowaniu', '#e8e6f5'],
]
// [rozmowa, wyniki narzędzi, streszczenie] w tysiącach tokenów
const CTX_STEPS: [number, number, number, string][] = [
  [1, 0, 0, 'Start. Zanim agent cokolwiek zrobi, ok. <b>22 tys. tokenów</b> zajmują instrukcje, opisy narzędzi i pamięć.'],
  [3, 18, 0, 'Agent czyta pierwsze pliki. Każdy przeczytany plik to tysiące tokenów.'],
  [5, 40, 0, 'Uruchamia testy i czyta ich wyniki.'],
  [7, 62, 0, 'Zdecydowaną większość okna zajmują <b>wyniki narzędzi</b>, nie rozmowa.'],
  [9, 85, 0, 'Kolejne pliki, kolejne logi…'],
  [11, 110, 0, 'Połowa okna. Model wciąż widzi wszystko, ale w długim kontekście łatwiej mu zgubić szczegół.'],
  [13, 132, 0, 'Zrzuty ekranu też kosztują: obraz to dla modelu setki lub tysiące tokenów.'],
  [15, 150, 0, 'Okno robi się ciasne.'],
  [16, 160, 0, 'Prawie pełne! Uprząż uruchamia <b>kompaktowanie</b>.'],
  [2, 6, 12, 'Po kompaktowaniu: model streścił dotychczasową pracę w ok. <b>12 tys. tokenów</b>, szczegóły zniknęły. Praca toczy się dalej w czystszym kontekście.'],
  [4, 30, 12, 'Jeśli w streszczeniu zabrakło ważnego szczegółu, agent go „zapomniał”. Dlatego ważne ustalenia warto zapisywać w plikach i w liście zadań.'],
]

function initCtx() {
  const root = $('.ctx')
  const bar = $('.ctx-bar', root)
  const legend = $('.ctx-legend', root)
  const input = $<HTMLInputElement>('.ctx-s', root)
  const out = $('.ctx-out', root)
  const total = $('.ctx-total', root)
  const msg = $('.ctx-msg', root)
  const segs = CTX_CATS.map(([, c]) => {
    const s = h('div', { class: 'ctx-seg', style: `background:${c};width:0` })
    bar.append(s)
    return s
  })
  const vals = CTX_CATS.map(([name, c]) => {
    const b = h('b')
    legend.append(h('div', { class: 'ctx-li' }, h('i', { style: `background:${c}` }), h('span', {}, name), b))
    return b
  })
  const draw = () => {
    const s = Number(input.value)
    const [conv, work, sum, text] = CTX_STEPS[s]
    const v = [4, 14, 4, conv, work, sum]
    const t = v.reduce((a, b) => a + b, 0)
    segs.forEach((seg, i) => (seg.style.width = (v[i] / 200) * 100 + '%'))
    vals.forEach((b, i) => (b.textContent = v[i] ? v[i] + 'k' : '—'))
    total.textContent = `${t}k / 200k`
    out.textContent = s === 0 ? 'start' : s >= 9 ? `${s * 10} min · po kompaktowaniu` : `${s * 10} min pracy`
    msg.innerHTML = text
    syncRange(input)
  }
  input.addEventListener('input', draw)
  draw()
}

/* ------------------------------------------------------------------ */
/* Subagenci                                                           */
/* ------------------------------------------------------------------ */

function initSub() {
  const root = $('.sub')
  const svg = $<SVGSVGElement>('.sub-svg', root)
  const msg = $('.sub-msg', root)
  const btn = $('.sub-go', root)
  const main = $('.sub-main', root)
  const kids = $$('.sub-child', root)
  const stage = $('.sub-stage', root)
  const paths = kids.map(() => {
    const p = svgEl('path', {}) as SVGPathElement
    svg.append(p)
    return p
  })
  // łuki liczone z rzeczywistych pozycji kart, żeby zawsze dochodziły do krawędzi
  const layout = () => {
    const sb = stage.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${sb.width} ${sb.height}`)
    const mb = main.getBoundingClientRect()
    const x0 = mb.left - sb.left + mb.width / 2
    const y0 = mb.bottom - sb.top
    kids.forEach((k, i) => {
      const kb = k.getBoundingClientRect()
      const x1 = kb.left - sb.left + kb.width / 2
      const y1 = kb.top - sb.top
      const my = (y0 + y1) / 2
      paths[i].setAttribute('d', `M${x0},${y0} C${x0},${my} ${x1},${my} ${x1},${y1}`)
    })
  }
  new ResizeObserver(layout).observe(stage)
  layout()
  const fills = [86, 64, 112]
  let busy = false

  const travel = (path: SVGPathElement, back: boolean, color: string) => {
    const c = svgEl('circle', { class: 'pkt', r: back ? 5 : 6, style: `fill:${color}` }) as SVGCircleElement
    svg.append(c)
    const len = path.getTotalLength()
    const st = { t: 0 }
    return gsap
      .to(st, {
        t: 1,
        duration: reducedMotion ? 0.01 : 1.1,
        ease: 'power2.inOut',
        onUpdate: () => {
          const pt = path.getPointAtLength((back ? 1 - st.t : st.t) * len)
          c.setAttribute('cx', String(pt.x))
          c.setAttribute('cy', String(pt.y))
        },
        onComplete: () => c.remove(),
      })
      .then()
  }

  const reset = () => {
    kids.forEach((k) => {
      k.classList.remove('on')
      ;($('.sub-ctx i', k) as HTMLElement).style.width = '0'
      $('.sub-n', k).textContent = '0k'
    })
    ;($('.sub-ctx i', main) as HTMLElement).style.width = '12%'
    $('.sub-n', main).textContent = 'kontekst: 24k'
  }

  btn.addEventListener('click', async () => {
    if (busy) return
    busy = true
    reset()
    msg.innerHTML = 'Orkiestrator dzieli zadanie na trzy niezależne części i wysyła każdą do osobnego subagenta.'
    await Promise.all(paths.map((p) => travel(p, false, '#ffb454')))
    kids.forEach((k, i) => {
      k.classList.add('on')
      ;($('.sub-ctx i', k) as HTMLElement).style.width = (fills[i] / 200) * 100 + '%'
      const n = $('.sub-n', k)
      const st = { v: 0 }
      gsap.to(st, { v: fills[i], duration: reducedMotion ? 0.01 : 1.4, onUpdate: () => (n.textContent = Math.round(st.v) + 'k') })
    })
    msg.innerHTML = 'Każdy subagent pracuje we <b>własnym, świeżym kontekście</b>: czyta dziesiątki plików, nie zaśmiecając głównego.'
    await sleep(reducedMotion ? 0 : 1900)
    msg.innerHTML = 'Do orkiestratora wracają tylko <b>krótkie streszczenia</b>.'
    await Promise.all(paths.map((p) => travel(p, true, '#7cc8ff')))
    kids.forEach((k) => k.classList.remove('on'))
    ;($('.sub-ctx i', main) as HTMLElement).style.width = (27.6 / 200) * 100 + '%'
    $('.sub-n', main).textContent = 'kontekst: 27,6k (+3,6k)'
    msg.innerHTML =
      'Subagenci przeczytali razem ok. <b>262 tys. tokenów</b>, a główny kontekst urósł tylko o <b>3,6 tys.</b> Bez delegowania okno orkiestratora by się przepełniło.'
    btn.textContent = '↺ jeszcze raz'
    busy = false
  })
}

/* ------------------------------------------------------------------ */
/* Skille                                                              */
/* ------------------------------------------------------------------ */

const SKILLS: [string, string, string, number][] = [
  ['slajdy', 'Tworzenie prezentacji w firmowym stylu.', '# Skill: slajdy\n1. Użyj szablonu: templates/deck.pptx\n2. Jedna myśl na slajd, maks. 6 punktów.\n3. Wykresy generuj skryptem scripts/chart.py\n4. Na końcu obejrzyj podgląd każdego slajdu.', 3200],
  ['formularze-pdf', 'Wypełnianie i podpisywanie formularzy PDF.', '# Skill: formularze-pdf\n1. Odczytaj pola: scripts/fields.py plik.pdf\n2. Uzupełnij dane w fields.json\n3. Wypełnij: scripts/fill.py\n4. Sprawdź wynik jako obraz każdej strony.', 2100],
  ['wdrożenie', 'Procedura wdrożenia aplikacji na produkcję.', '# Skill: wdrożenie\n1. Testy: npm test — muszą przejść.\n2. Build: npm run build\n3. Zapytaj człowieka o zgodę przed publikacją.\n4. Po wdrożeniu sprawdź stronę i logi.', 1800],
  ['raport-zarząd', 'Struktura i ton raportu kwartalnego.', '# Skill: raport-zarząd\n1. Najpierw wnioski, potem dane.\n2. Liczby zawsze z porównaniem r/r.\n3. Maks. 2 strony.', 1500],
]

function initSkills() {
  const root = $('.skl')
  const shelf = $('.skl-shelf', root)
  const ctx = $('.skl-ctx', root)
  const items = SKILLS.map(([name, desc, full, size]) => {
    const el = h(
      'div',
      { class: 'sk-item' },
      h('div', { class: 'top' }, h('b', {}, name), h('small', {}, `opis: ~50 tokenów`)),
      h('p', {}, desc),
      h('div', { class: 'full' }, h('div', {}, h('pre', {}, full))),
    )
    shelf.append(el)
    return { el, size }
  })
  $$<HTMLButtonElement>('.skl-asks .btn', root).forEach((b) =>
    b.addEventListener('click', () => {
      const k = Number(b.dataset.s)
      $$('.skl-asks .btn', root).forEach((x) => x.classList.toggle('on', x === b))
      items.forEach(({ el, size }, i) => {
        el.classList.toggle('open', i === k)
        $('small', el).textContent = i === k ? `wczytany: ~${size.toLocaleString('pl-PL')} tokenów` : 'opis: ~50 tokenów'
      })
      ctx.textContent = `w kontekście: ~${(200 + items[k].size).toLocaleString('pl-PL')} tokenów`
    }),
  )
}

/* ------------------------------------------------------------------ */
/* MCP                                                                 */
/* ------------------------------------------------------------------ */

function initMCP() {
  const svg = $<SVGSVGElement>('.mcp-svg')
  const count = $('.mcp-count')
  const apps: [string, number][] = [
    ['Claude', 70],
    ['edytor kodu', 160],
    ['Twoja aplikacja', 250],
  ]
  const svcs: [string, number][] = [
    ['GitHub', 55],
    ['Slack', 125],
    ['baza danych', 195],
    ['przeglądarka', 265],
  ]
  const AX = 80
  const SX = 440
  svg.append(svgEl('text', { class: 'cap', x: AX, y: 20, 'text-anchor': 'middle' }, 'aplikacje z AI'))
  svg.append(svgEl('text', { class: 'cap', x: SX, y: 20, 'text-anchor': 'middle' }, 'usługi'))
  const mesh = svgEl('g', {})
  const std = svgEl('g', {})
  svg.append(mesh, std)
  for (const [, ay] of apps)
    for (const [, sy] of svcs) mesh.append(svgEl('path', { class: 'wire mesh', d: `M${AX + 58},${ay} C${260},${ay} ${260},${sy} ${SX - 58},${sy}` }))
  for (const [, ay] of apps) std.append(svgEl('path', { class: 'wire std', d: `M${AX + 58},${ay} C${190},${ay} ${190},160 ${225},160` }))
  for (const [, sy] of svcs) std.append(svgEl('path', { class: 'wire std', d: `M${295},160 C${330},160 ${330},${sy} ${SX - 58},${sy}` }))
  const node = (label: string, x: number, y: number, cls = 'node') => {
    const g = svgEl('g', { class: cls })
    g.append(svgEl('rect', { x: x - 58, y: y - 17, width: 116, height: 34, rx: 9 }))
    g.append(svgEl('text', { x, y: y + 4 }, label))
    svg.append(g)
    return g
  }
  apps.forEach(([l, y]) => node(l, AX, y))
  svcs.forEach(([l, y]) => node(l, SX, y))
  const hub = svgEl('g', { class: 'node hub' })
  hub.append(svgEl('rect', { x: 225, y: 140, width: 70, height: 40, rx: 10 }))
  hub.append(svgEl('text', { x: 260, y: 165 }, 'MCP'))
  svg.append(hub)

  const set = (m: number) => {
    gsap.to(mesh, { opacity: m === 0 ? 1 : 0, duration: 0.5 })
    gsap.to([std, hub], { opacity: m === 1 ? 1 : 0, duration: 0.5 })
    count.textContent = m === 0 ? '3 × 4 = 12 osobnych integracji' : '3 klienty + 4 serwery = 7 połączeń'
  }
  $$<HTMLButtonElement>('.mcp-pick button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.mcp-pick button').forEach((x) => x.classList.toggle('on', x === b))
      set(Number(b.dataset.m))
    }),
  )
  gsap.set([std, hub], { opacity: 0 })
  set(0)
}

/* ------------------------------------------------------------------ */
/* Kumulacja błędów                                                    */
/* ------------------------------------------------------------------ */

function initCompound() {
  const root = $('.comp')
  const pIn = $<HTMLInputElement>('.comp-p', root)
  const nIn = $<HTMLInputElement>('.comp-n', root)
  const canvas = $<HTMLCanvasElement>('.comp-chart', root)
  const ctx = canvas.getContext('2d')!
  const draw = () => {
    const p = Number(pIn.value) / 100
    const n = Number(nIn.value)
    const v = Math.pow(p, n)
    $('.comp-p-out', root).textContent = fmt(p * 100, 1) + '%'
    $('.comp-n-out', root).textContent = String(n)
    $('.comp-v', root).textContent = v >= 0.01 ? Math.round(v * 100) + '%' : v >= 0.001 ? fmt(v * 100, 1) + '%' : '<0,1%'
    syncRange(pIn)
    syncRange(nIn)
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const pad = 10
    const X = (k: number) => pad + (k / 300) * (W - pad * 2)
    const Y = (q: number) => pad + (1 - q) * (H - pad * 2)
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6ff0b8'
    ctx.beginPath()
    for (let k = 0; k <= 300; k += 2) (k ? ctx.lineTo : ctx.moveTo).call(ctx, X(k), Y(Math.pow(p, k)))
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.shadowColor = accent
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(X(n), Y(v), 5, 0, Math.PI * 2)
    ctx.fill()
  }
  pIn.addEventListener('input', draw)
  nIn.addEventListener('input', draw)
  new ResizeObserver(draw).observe(canvas)
  draw()
}

export function initAgents() {
  initEvo()
  initLoop()
  initCtx()
  initSub()
  initSkills()
  initMCP()
  initCompound()
}
