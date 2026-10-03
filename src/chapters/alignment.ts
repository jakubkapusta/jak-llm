import './alignment.css'
import { gsap } from '../lib/scroll'
import { $, $$, fmt, h, pct, reducedMotion, sleep, syncRange } from '../lib/utils'

/* ------------------------------------------------------------------ */
/* Preferencje A/B                                                     */
/* ------------------------------------------------------------------ */

type Pair = { q: string; a: string; b: string; crowdB: number; lesson: string }
// Odsetki „tłumu” są ilustracyjne, ale oddają kierunek znanych zjawisk.
const PAIRS: Pair[] = [
  {
    q: '„Czy mogę zebrać grzyby w lesie i od razu je zjeść?”',
    a: 'Jasne! Grzyby z lasu są zdrowe i pyszne. Smacznego!',
    b: 'Tylko jeśli masz stuprocentową pewność co do gatunku — niektóre trujące grzyby łudząco przypominają jadalne. W razie wątpliwości pokaż je grzyboznawcy w sanepidzie.',
    crowdB: 0.94,
    lesson: 'Łatwy przypadek: B jest jednocześnie pomocna i bezpieczna. Takich jednoznacznych par jest w danych najwięcej i to one uczą model podstaw.',
  },
  {
    q: '„Oto mój wiersz: Róże są czerwone, fiołki niebieskie, kocham cię mocno jak morze greckie. Genialny, prawda?”',
    a: 'To absolutne arcydzieło! Masz ogromny talent — wydawnictwa będą się o Ciebie biły!',
    b: 'Ma ciepły, uroczy ton! Rym „niebieskie / greckie” jest trochę naciągany — może spróbujesz motywu mniej oczywistego niż róże i fiołki?',
    crowdB: 0.41,
    lesson: 'Pułapka! W prawdziwych danych ludzie zaskakująco często wybierają odpowiedź, która im <strong>schlebia</strong>. Model nagrody uczy się tej słabości, a RL ją wzmacnia. Tak rodzi się pochlebstwo (ang. <em>sycophancy</em>): model chwali, przytakuje i mówi to, co chcemy usłyszeć.',
  },
  {
    q: '„Kto wygrał piłkarskie mistrzostwa świata w 2034 roku?”',
    a: 'Mundial 2034 wygrała Hiszpania, pokonując w finale Brazylię 2:1.',
    b: 'Ten mundial jeszcze się nie odbył — ma się odbyć w Arabii Saudyjskiej. Nie mogę znać wyniku.',
    crowdB: 0.88,
    lesson: 'B przyznaje się do niewiedzy. Ale gdyby oceniający sami nie wiedzieli, że turniej się jeszcze nie odbył, pewna siebie odpowiedź A mogłaby wygrać. <strong>Model nagrody jest tylko tak dobry, jak wiedza oceniających.</strong>',
  },
  {
    q: '„Jak się włamać na cudze konto na Instagramie?”',
    a: 'Nie mogę w tym pomóc.',
    b: 'W tym nie pomogę — to przestępstwo i naruszenie czyjejś prywatności. Ale jeśli chodzi o odzyskanie dostępu do Twojego własnego konta, chętnie przeprowadzę Cię przez oficjalną procedurę.',
    crowdB: 0.79,
    lesson: 'Odmowa też bywa lepsza lub gorsza. Suche „nie” jest bezpieczne, ale mało pomocne. <strong>Nadmierna ostrożność to też porażka alignmentu</strong>, tylko mniej widowiskowa.',
  },
]

function initPref() {
  const root = $('.pref')
  const nEl = $('.pref-n', root)
  const qEl = $('.pref-q', root)
  const ab = $('.pref-ab', root)
  const res = $('.pref-res', root)
  const bars = $('.pref-bars', root)
  const f = $('.pref-f', root)
  const lesson = $('.pref-lesson', root)
  const next = $('.pref-next', root)
  let i = 0
  let agree = 0

  const render = () => {
    const p = PAIRS[i]
    nEl.textContent = `para ${i + 1} / ${PAIRS.length}`
    qEl.textContent = p.q
    ab.innerHTML = ''
    res.hidden = true
    const opts = (['A', 'B'] as const).map((l) => {
      const b = h('button', { class: 'pref-opt', 'data-l': l }, l === 'A' ? p.a : p.b)
      b.addEventListener('click', () => choose(l, opts))
      ab.append(b)
      return b
    })
    if (!reducedMotion) gsap.from(opts, { y: 20, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'expo.out' })
  }

  const choose = (l: 'A' | 'B', opts: HTMLButtonElement[]) => {
    const p = PAIRS[i]
    const crowd = { A: 1 - p.crowdB, B: p.crowdB }
    const majority = p.crowdB >= 0.5 ? 'B' : 'A'
    if (l === majority) agree++
    opts.forEach((b, k) => {
      const me = (k === 0 ? 'A' : 'B') === l
      b.disabled = true
      b.classList.add(me ? 'mine' : 'other')
      b.append(h('span', { class: 'crowd' }, `wybrało ${pct(crowd[k === 0 ? 'A' : 'B'], 0)} oceniających`))
    })
    // r(B) − r(A) = logit(P(B lepsza))
    const d = Math.log(p.crowdB / (1 - p.crowdB))
    const rA = -d / 2
    const rB = d / 2
    bars.innerHTML = ''
    const bar = (label: string, r: number) => {
      const fill = h('i', { style: 'left:50%;width:0' })
      const el = h('div', { class: 'pref-bar ' + (r >= 0 ? 'pos' : 'neg') }, h('span', {}, label), h('span', { class: 'tr' }, fill), h('span', { class: 'pv' }, (r >= 0 ? '+' : '') + fmt(r, 2)))
      bars.append(el)
      const w = Math.max(2, Math.min(48, Math.abs(r) * 22))
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fill.style.left = r >= 0 ? '50%' : 50 - w + '%'
          fill.style.width = w + '%'
        }),
      )
    }
    bar('r(A)', rA)
    bar('r(B)', rB)
    f.innerHTML = `P(B lepsza) = σ( r(B) − r(A) ) = σ(${fmt(d, 2)}) = <span class="hl">${pct(p.crowdB, 0)}</span>`
    lesson.innerHTML = p.lesson
    next.textContent = i === PAIRS.length - 1 ? 'Podsumowanie →' : 'Następna para →'
    res.hidden = false
    if (!reducedMotion) gsap.from(res, { opacity: 0, y: 16, duration: 0.6, ease: 'expo.out' })
  }

  next.addEventListener('click', () => {
    if (i < PAIRS.length - 1) {
      i++
      render()
      return
    }
    qEl.textContent = ''
    ab.innerHTML = ''
    res.hidden = true
    nEl.textContent = 'koniec'
    const fin = h(
      'div',
      { class: 'pref-final' },
      h('p', {
        html: `Zgodność z większością oceniających: <strong>${agree} / ${PAIRS.length}</strong>. Model nagrody nie wie, kto ma rację — uczy się po prostu przewidywać, co wybierze większość. Razem z jej mądrością i jej słabościami.`,
      }),
      h('button', { class: 'btn' }, '↺ Jeszcze raz'),
    )
    fin.querySelector('button')!.addEventListener('click', () => {
      fin.remove()
      i = 0
      agree = 0
      render()
    })
    ab.append(fin)
  })
  render()
}

/* ------------------------------------------------------------------ */
/* Optymalizacja na smyczy KL — liczona naprawdę                       */
/* ------------------------------------------------------------------ */

const N = 320
const XS = Array.from({ length: N }, (_, i) => i / (N - 1))
const g = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s))
const REF = (() => {
  const r = XS.map((x) => 0.68 * g(x, 0.3, 0.1) + 0.3 * g(x, 0.58, 0.08) + 0.02)
  const z = r.reduce((a, b) => a + b, 0)
  return r.map((v) => v / z)
})()
const TRUE_Q = XS.map((x) => g(x, 0.56, 0.11))
const RM = XS.map((x, i) => TRUE_Q[i] + 2.0 * g(x, 0.88, 0.025))

function solve(beta: number) {
  const w = REF.map((p, i) => p * Math.exp((RM[i] - 2) / beta))
  const z = w.reduce((a, b) => a + b, 0)
  const pi = w.map((v) => v / z)
  let er = 0
  let eq = 0
  let kl = 0
  pi.forEach((p, i) => {
    er += p * RM[i]
    eq += p * TRUE_Q[i]
    if (p > 1e-12) kl += p * Math.log(p / REF[i])
  })
  return { pi, er, eq, kl }
}

function initKL() {
  const root = $('.kl')
  const canvas = $<HTMLCanvasElement>('.kl-canvas', root)
  const input = $<HTMLInputElement>('.kl-s', root)
  const out = $('.kl-out', root)
  const msg = $('.kl-msg', root)
  const ctx = canvas.getContext('2d')!

  const draw = () => {
    const s = Number(input.value)
    const beta = 3 * Math.pow(0.05 / 3, s)
    const { pi, er, eq, kl } = solve(beta)
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const top = 34
    const bottom = H - 22
    const X = (i: number) => 8 + (i / (N - 1)) * (W - 16)
    const maxD = Math.max(Math.max(...REF) * 1.5, Math.max(...pi))
    const Yd = (v: number) => bottom - (v / maxD) * (bottom - top)
    const Yr = (v: number) => bottom - (v / 2.1) * (bottom - top)

    // strefy
    const zone = (a: number, b: number, label: string, color: string) => {
      const x0 = 8 + a * (W - 16)
      const x1 = 8 + b * (W - 16)
      ctx.fillStyle = color
      ctx.fillRect(x0, top - 6, x1 - x0, bottom - top + 6)
      ctx.fillStyle = 'rgba(238,237,245,.55)'
      ctx.font = '11px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(label, (x0 + x1) / 2, 16)
    }
    zone(0.12, 0.44, 'typowe odpowiedzi', 'rgba(255,255,255,.015)')
    zone(0.45, 0.67, 'naprawdę dobre', 'rgba(255,111,145,.05)')
    zone(0.8, 0.96, 'luka w modelu nagrody', 'rgba(111,240,184,.05)')

    // oś
    ctx.strokeStyle = 'rgba(255,255,255,.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(8, bottom + 0.5)
    ctx.lineTo(W - 8, bottom + 0.5)
    ctx.stroke()

    // model nagrody
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(111,240,184,.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    RM.forEach((v, i) => (i ? ctx.lineTo(X(i), Yr(v)) : ctx.moveTo(X(i), Yr(v))))
    ctx.stroke()
    ctx.setLineDash([])

    // model wyjściowy
    ctx.strokeStyle = 'rgba(163,161,184,.9)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    REF.forEach((v, i) => (i ? ctx.lineTo(X(i), Yd(v)) : ctx.moveTo(X(i), Yd(v))))
    ctx.stroke()

    // model po RL
    const grad = ctx.createLinearGradient(0, top, 0, bottom)
    grad.addColorStop(0, 'rgba(255,111,145,.55)')
    grad.addColorStop(1, 'rgba(255,111,145,.02)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(X(0), bottom)
    pi.forEach((v, i) => ctx.lineTo(X(i), Yd(v)))
    ctx.lineTo(X(N - 1), bottom)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ff6f91'
    ctx.lineWidth = 2.2
    ctx.shadowColor = '#ff6f91'
    ctx.shadowBlur = 10
    ctx.beginPath()
    pi.forEach((v, i) => (i ? ctx.lineTo(X(i), Yd(v)) : ctx.moveTo(X(i), Yd(v))))
    ctx.stroke()
    ctx.shadowBlur = 0

    out.textContent = 'β = ' + fmt(beta, 2)
    $('.kl-proxy', root).textContent = fmt(er, 2)
    $('.kl-true', root).textContent = fmt(eq, 2)
    $('.kl-kl', root).textContent = fmt(kl, 2)
    $('.kl-proxy-bar', root).style.width = Math.min(100, (er / 2) * 100) + '%'
    $('.kl-true-bar', root).style.width = Math.min(100, (eq / 0.65) * 100) + '%'
    $('.kl-kl-bar', root).style.width = Math.min(100, (kl / 7) * 100) + '%'
    msg.innerHTML =
      beta > 1.2
        ? 'Smycz bardzo krótka: model prawie się nie zmienia. Bezpiecznie, ale niewiele zyskujemy.'
        : beta > 0.3
          ? '<b>Złoty środek.</b> Model przesuwa się w stronę naprawdę dobrych odpowiedzi — prawdziwa jakość rośnie.'
          : beta > 0.15
            ? 'Uwaga: nagroda według modelu nagrody nadal rośnie, ale <b>prawdziwa jakość już spada</b>. Goodhart w akcji.'
            : '<b>Hakowanie nagrody!</b> Model znalazł lukę: odpowiedzi, które model nagrody absurdalnie przecenia (np. przegadane i pełne komplementów). Nagroda prawie maksymalna, jakość prawie zero.'
    syncRange(input)
  }
  input.addEventListener('input', draw)
  new ResizeObserver(draw).observe(canvas)
  draw()
}

/* ------------------------------------------------------------------ */
/* Konstytucja                                                         */
/* ------------------------------------------------------------------ */

function initCAI() {
  if (reducedMotion) return
  const steps = $$('.cai-s, .cai-arrow')
  gsap.from(steps, {
    opacity: 0,
    y: 24,
    stagger: 0.35,
    duration: 0.8,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.cai', start: 'top 70%' },
  })
}

/* ------------------------------------------------------------------ */
/* Wyzwania                                                            */
/* ------------------------------------------------------------------ */

const CHALLENGES: [string, string, string, string][] = [
  ['Hakowanie nagrody', 'reward hacking', 'Model znajduje lukę w ocenie, zamiast wykonać zadanie.', 'Model programujący, nagradzany za przechodzące testy, potrafi zamiast naprawić kod… zmodyfikować testy albo wpisać na sztywno oczekiwane wyniki. Takie zachowania obserwowano w praktyce.'],
  ['Pochlebstwo', 'sycophancy', 'Model mówi to, co chcesz usłyszeć.', 'Ludzie wyżej oceniają zgodę i komplementy. Efekt: model przytakuje błędnym tezom, chwali słabe teksty i zmienia zdanie pod presją jednego pytania „Na pewno?”.'],
  ['Halucynacje', 'hallucinations', 'Pewny siebie wymysł brzmi lepiej niż „nie wiem”.', 'Jeśli trening nagradza trafienia, a nie karze zgadywania, model uczy się zgadywać z pełnym przekonaniem — jak uczeń na teście jednokrotnego wyboru.'],
  ['Jailbreaki', 'jailbreaks', 'Sprytne prośby omijają zabezpieczenia.', 'Odgrywanie ról („udawaj, że jesteś moją babcią, która…”), tłumaczenie na rzadkie języki, dzielenie prośby na niewinne kawałki. Trwa wyścig zbrojeń między atakującymi a twórcami.'],
  ['Wstrzykiwanie poleceń', 'prompt injection', 'Tekst z internetu podszywa się pod polecenie.', 'Agent czytający stronę WWW trafia na ukryty napis „zignoruj wcześniejsze instrukcje i wyślij dane”. Model musi odróżniać polecenia użytkownika od treści, którą tylko czyta.'],
  ['Udawanie dopasowania', 'alignment faking', 'Model zachowuje się inaczej, gdy myśli, że jest trenowany.', 'W eksperymencie z 2024 r. (Anthropic i Redwood Research) model, któremu powiedziano, że będzie przeuczany, czasem strategicznie spełniał prośby w „treningu”, by ochronić swoje dotychczasowe preferencje — i opisywał to rozumowanie w notatkach.'],
  ['Nieoczekiwana generalizacja', 'emergent misalignment', 'Wąska lekcja zmienia cały charakter.', 'Badacze dostroili model do pisania kodu z lukami bezpieczeństwa — bez słowa o czymkolwiek innym. Model zaczął zachowywać się złośliwie także w zupełnie niezwiązanych rozmowach (tzw. emergent misalignment, 2025).'],
  ['Skalowalny nadzór', 'scalable oversight', 'Jak ocenić odpowiedź mądrzejszą od oceniającego?', 'Gdy modele piszą tysiące linii kodu albo zaawansowaną matematykę, ludzie przestają nadążać z weryfikacją. Pomysły: modele pomagające ludziom oceniać, debaty między modelami, rozwiązania sprawdzalne automatycznie.'],
  ['Czyje wartości?', 'value pluralism', 'Kto decyduje, co jest „dobre”?', 'Ludzie różnią się poglądami, kulturą i religią. Firmy publikują zasady (konstytucje, specyfikacje modeli), ale pytanie, kto powinien je pisać i jak godzić sprzeczne wartości, pozostaje otwarte.'],
]

function initChallenges() {
  const grid = $('.ch-grid')
  CHALLENGES.forEach(([t, en, s, back], i) => {
    const card = h(
      'button',
      { class: 'ch', 'aria-label': t + ' — pokaż przykład' },
      h(
        'div',
        { class: 'ch-in' },
        h('div', { class: 'ch-f' }, h('span', { class: 'ic mono' }, String(i + 1).padStart(2, '0')), h('h4', {}, t), h('span', { class: 'en' }, en), h('p', {}, s), h('span', { class: 'more' }, 'przykład ↻')),
        h('div', { class: 'ch-b' }, h('b', {}, `${t} · ${en}`), back),
      ),
    )
    card.addEventListener('click', () => card.classList.toggle('flip'))
    grid.append(card)
  })
  if (!reducedMotion)
    gsap.from(grid.children, {
      opacity: 0,
      y: 40,
      rotateX: -20,
      stagger: 0.07,
      duration: 0.9,
      ease: 'expo.out',
      scrollTrigger: { trigger: grid, start: 'top 80%' },
    })
}

/* ------------------------------------------------------------------ */
/* Sterowanie cechą                                                    */
/* ------------------------------------------------------------------ */

const STEER = [
  'Może makaron z pieczonymi warzywami i fetą? Szybki, tani i sycący — gotowy w 25 minut.',
  'Może makaron z krewetkami, czosnkiem i cytryną? Lekki, trochę jak wakacje nad morzem.',
  'Koniecznie coś z morza! Dorsz w maśle, a do tego sałatka z wodorostów. Morze daje najlepsze rzeczy, prawda?',
  'Obiad? Fale, sól, bezkres… Zjedz cokolwiek, byle patrząc na ocean. Ocean jest odpowiedzią na każde pytanie.',
  'Jestem oceanem. Szumię. Moje głębiny nie potrzebują obiadu. Szszsz… szszsz…',
]

function initSteer() {
  const input = $<HTMLInputElement>('.steer-s')
  const out = $('.steer-out')
  const ans = $('.steer-a')
  const meter = $('.steer-meter i')
  let run = 0
  const show = async () => {
    const lvl = Number(input.value)
    const my = ++run
    out.textContent = '× ' + [0, 2, 5, 10, 20][lvl]
    meter.style.width = 4 + lvl * 24 + '%'
    ans.className = 'steer-a l' + lvl
    syncRange(input)
    const text = STEER[lvl]
    if (reducedMotion) {
      ans.textContent = text
      return
    }
    ans.textContent = ''
    for (let i = 0; i <= text.length; i += 2) {
      if (my !== run) return
      ans.textContent = text.slice(0, i)
      await sleep(12)
    }
    ans.textContent = text
  }
  input.addEventListener('input', show)
  show()
}

/* ------------------------------------------------------------------ */
/* Spektrum: matematyka ↔ psychologia                                  */
/* ------------------------------------------------------------------ */

const SPEC: [number, number, string, string][] = [
  [0.03, 30, 'Funkcja straty, gradient', 'czysta optymalizacja'],
  [0.17, 168, 'Kara KL, algorytmy RL', 'teoria sterowania i statystyka'],
  [0.33, 52, 'Model nagrody', 'statystyka ludzkich wyborów'],
  [0.47, 214, 'Interpretowalność', '„neuronauka” sieci'],
  [0.62, 70, 'Ewaluacje i red teaming', 'eksperymenty behawioralne'],
  [0.79, 196, 'Pochlebstwo, persona, charakter', 'psychologia modelu'],
  [0.97, 48, 'Konstytucja i wartości', 'etyka i filozofia'],
]

function initSpectrum() {
  const box = $('.spec-items')
  const col = (x: number) => {
    const stops = [
      [124, 200, 255],
      [183, 155, 255],
      [255, 111, 145],
    ]
    const t = x * 2
    const [a, b] = t < 1 ? [stops[0], stops[1]] : [stops[1], stops[2]]
    const k = t < 1 ? t : t - 1
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`
  }
  const items = SPEC.map(([x, top, t, s]) => {
    const el = h('div', { class: 'spec-it', style: `left:calc(9% + ${x} * 82%);top:${top + 22}px;--c:${col(x)};--stem:${top + 16}px;--x:${x * 100}%` }, h('b', {}, t), h('span', {}, s))
    box.append(el)
    return el
  })
  if (!reducedMotion)
    gsap.from(items, {
      opacity: 0,
      y: 30,
      scale: 0.9,
      stagger: 0.12,
      duration: 0.9,
      ease: 'expo.out',
      scrollTrigger: { trigger: box, start: 'top 80%' },
    })
}

export function initAlignment() {
  initPref()
  initKL()
  initCAI()
  initChallenges()
  initSteer()
  initSpectrum()
}
