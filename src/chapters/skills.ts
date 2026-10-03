import './skills.css'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { $, $$, h, reducedMotion, sleep, watchVisible } from '../lib/utils'

/* ------------------------------------------------------------------ */
/* Głowica indukcyjna: [A][B] … [A] → [B]                              */
/* ------------------------------------------------------------------ */

const WORDS = ['Weszła', 'Zofia', 'Wrzosowska.', '(…)', 'Obecna:', 'Zofia', '___']
const A1 = 1
const B1 = 2
const A2 = 5
const OUT = 6

const CAPTIONS = [
  'Model ma przewidzieć słowo po drugiej „Zofii”. Tego nazwiska nie ma w żadnych danych treningowych — wymyśliliśmy je. Model musi więc skorzystać z kontekstu.',
  'Bierzemy bieżący token: <b>„Zofia”</b>. Głowica indukcyjna wysyła z niego zapytanie: „gdzie wcześniej było to samo słowo?”.',
  'Uwaga trafia w <b>pierwszą „Zofię”</b>. Pomaga w tym inna głowica, z wcześniejszej warstwy: przy każdym tokenie zostawiła notatkę „poprzednie słowo to…”.',
  'Dzięki tej notatce wiadomo, co stało <b>zaraz po</b> pierwszej Zofii: „Wrzosowska”. To właśnie ta informacja zostaje pobrana.',
  'Głowica kopiuje ją do bieżącej pozycji. Przewidywanie: <b>„Wrzosowska” — 94%</b>. Wzorzec [A][B] … [A] → [B] działa na dowolnych słowach, a kombinacje takich obwodów pozwalają uczyć się z przykładów w poleceniu.',
]

function initInduction() {
  const root = $('.ind')
  const wordsEl = $('.ind-words', root)
  const svg = $<SVGSVGElement>('.ind-svg', root)
  const box = $('.ind-text', root)
  const cap = $('.ind-cap', root)
  const stepEl = $('.ind-step', root)
  const play = $('.ind-play', root)
  const words = WORDS.map((w, i) => {
    const el = h('span', { class: 'ind-w' + (i === OUT ? ' blank' : '') }, w)
    wordsEl.append(el)
    return el
  })
  let step = 0

  const arc = (from: number, to: number, cls: string) => {
    const b = box.getBoundingClientRect()
    const r1 = words[from].getBoundingClientRect()
    const r2 = words[to].getBoundingClientRect()
    const x1 = r1.left - b.left + r1.width / 2
    const y1 = r1.top - b.top - 2
    const x2 = r2.left - b.left + r2.width / 2
    const y2 = r2.top - b.top - 2
    const lift = Math.min(60, 18 + Math.abs(x1 - x2) * 0.15)
    const top = Math.min(y1, y2) - lift
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', `M${x1},${y1} C${x1},${top} ${x2},${top} ${x2},${y2}`)
    p.setAttribute('pathLength', '1')
    p.setAttribute('class', cls)
    svg.append(p)
  }

  const render = () => {
    svg.innerHTML = ''
    words.forEach((w) => w.classList.remove('cur', 'match', 'next', 'out'))
    words[OUT].textContent = '___'
    words[OUT].classList.add('blank')
    if (step >= 1) words[A2].classList.add('cur')
    if (step >= 2) {
      words[A1].classList.add('match')
      arc(A2, A1, 'a')
    }
    if (step >= 3) {
      words[B1].classList.add('next')
      arc(A1, B1, 'b')
    }
    if (step >= 4) {
      arc(B1, OUT, 'c')
      words[OUT].textContent = 'Wrzosowska'
      words[OUT].classList.remove('blank')
      words[OUT].classList.add('out')
    }
    cap.innerHTML = CAPTIONS[step]
    stepEl.textContent = `krok ${step} / 4`
  }

  let running = false
  const run = async () => {
    if (running) return
    running = true
    play.textContent = '❚❚ trwa…'
    for (step = 0; step <= 4; step++) {
      render()
      await sleep(reducedMotion ? 300 : 2200)
    }
    step = 4
    running = false
    play.textContent = '↺ jeszcze raz'
  }
  play.addEventListener('click', run)
  new ResizeObserver(render).observe(box)
  render()
  let started = false
  watchVisible(root, (v) => {
    if (v && !started) {
      started = true
      run()
    }
  }, '-20% 0px')
}

/* ------------------------------------------------------------------ */
/* Przepis na umiejętność                                              */
/* ------------------------------------------------------------------ */

const SOURCES: [string, string][] = [
  ['Wiedza z pretreningu', '#ffb454'],
  ['Obwody i skala', '#b79bff'],
  ['Dostrajanie (SFT)', '#7cc8ff'],
  ['RL ze sprawdzalnymi nagrodami', '#6ff0b8'],
  ['RL z ocen gustu', '#ff6f91'],
  ['Pętla z narzędziami', '#e8e6f5'],
]
const RECIPES: { v: number[]; d: string[] }[] = [
  {
    v: [30, 10, 8, 32, 5, 15],
    d: [
      'składnia, biblioteki i wzorce z miliardów linii kodu',
      'śledzenie zmiennych, pary nawiasów, kopiowanie wzorców',
      'format odpowiedzi, objaśnianie kodu',
      'miliony zadań sprawdzanych testami',
      'czytelność, styl, sensowne komentarze',
      'uruchamianie kodu, czytanie błędów, poprawki',
    ],
  },
  {
    v: [48, 14, 10, 0, 28, 0],
    d: [
      'tysiące lat poezji, analizy, przekłady',
      'planowanie rymu, wyczucie rytmu',
      'forma: zwrotki, tytuł, długość',
      'brak — nie ma testu na piękno',
      'porównania „który wiersz lepszy”',
      'zwykle niepotrzebna',
    ],
  },
  {
    v: [34, 6, 10, 14, 14, 22],
    d: [
      'kod milionów stron, wiedza o typografii i kolorze',
      'spójność kilku tysięcy linii kodu',
      'praca na plikach, wykonywanie próśb',
      'kod, który się buduje i działa',
      'gust wizualny wyuczony z ocen',
      'zrzuty ekranu, podgląd, poprawki — i uwagi człowieka',
    ],
  },
]

function initMix() {
  const root = $('.mix')
  const bar = $('.mix-bar', root)
  const legend = $('.mix-legend', root)
  const segs = SOURCES.map(([, c]) => {
    const s = h('div', { class: 'mix-seg', style: `background:${c};width:0%` })
    bar.append(s)
    return s
  })
  const items = SOURCES.map(([name, c]) => {
    const pctEl = h('em')
    const desc = h('span')
    const it = h('div', { class: 'mix-item' }, h('i', { style: `background:${c}` }), h('b', {}, name), pctEl, desc)
    legend.append(it)
    return { it, pctEl, desc }
  })
  const show = (k: number) => {
    const r = RECIPES[k]
    segs.forEach((s, i) => {
      s.style.width = r.v[i] + '%'
      s.textContent = r.v[i] >= 9 ? r.v[i] + '%' : ''
    })
    items.forEach(({ it, pctEl, desc }, i) => {
      pctEl.textContent = r.v[i] + '%'
      desc.textContent = r.d[i]
      it.classList.toggle('zero', r.v[i] === 0)
    })
  }
  $$<HTMLButtonElement>('.mix-pick button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.mix-pick button', root).forEach((x) => x.classList.toggle('on', x === b))
      show(Number(b.dataset.k))
    }),
  )
  ScrollTrigger.create({ trigger: root, start: 'top 75%', once: true, onEnter: () => show(0) })
  if (reducedMotion) show(0)
}

function initBuild() {
  if (reducedMotion) return
  gsap.from('.build li', {
    opacity: 0,
    x: -20,
    stagger: 0.15,
    duration: 0.8,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.build', start: 'top 75%' },
  })
}

export function initSkills() {
  initInduction()
  initMix()
  initBuild()
}
