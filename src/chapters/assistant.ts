import './assistant.css'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { $, $$, h, reducedMotion, sleep } from '../lib/utils'

const CASES: { prompt: string; base: string; inst: string }[] = [
  {
    prompt: 'Jak upiec chleb?',
    base: '\nJak upiec chleb bez drożdży?\nJak upiec chleb w garnku żeliwnym?\nJak upiec chleb na zakwasie, żeby nie był zakalcem?\n\n— Forum Kulinarne › Pieczywo › strona 3 z 47\nOdpowiedz | Cytuj | Zgłoś',
    inst: 'Najprostszy chleb wymaga czterech składników: 500 g mąki, 350 ml ciepłej wody, 10 g soli i 7 g suszonych drożdży.\n\n1. Wymieszaj wszystko i wyrabiaj ciasto ok. 10 minut.\n2. Odstaw na godzinę, aż podwoi objętość.\n3. Piecz ok. 40 minut w 230 °C.\n\nChcesz wersję na zakwasie?',
  },
  {
    prompt: 'Napisz wiersz o kocie.',
    base: ' Napisz wiersz o psie. Napisz wiersz o jesieni.\n\nZadanie domowe — klasa 4b\nTermin: piątek. Prace oddajemy na kartkach A4, podpisane imieniem i nazwiskiem.',
    inst: 'Na parapecie, w plamie słońca,\nkot drzemie, jakby świat nie miał końca.\nŚni o ptakach, o myszach, o niebie —\ni czasem, przez sen, mruczy do siebie.',
  },
  {
    prompt: 'Ile to 15% z 80?',
    base: '\nA) 10   B) 12   C) 15   D) 18\n\nOdpowiedź: B\n\nZadanie 14. Ile to 20% ze 150?\nA) 20   B) 25   C) 30   D) 35',
    inst: '15% z 80 to 12, bo 0,15 × 80 = 12.',
  },
]

async function typeInto(el: HTMLElement, prefix: string, text: string, id: () => boolean, speed = 14) {
  el.innerHTML = ''
  if (prefix) el.append(h('span', { class: 'pr' }, prefix))
  const body = document.createTextNode('')
  const cur = h('span', { class: 'cur' })
  el.append(body, cur)
  if (reducedMotion) {
    body.textContent = text
    return
  }
  for (let i = 0; i < text.length; i += 2) {
    if (!id()) return
    body.textContent = text.slice(0, i + 2)
    await sleep(speed)
  }
}

function initCompare() {
  const root = $('.cmp')
  const [baseOut, instOut] = $$('.cmp-out', root)
  let run = 0
  const play = (i: number) => {
    const my = ++run
    const alive = () => my === run
    const c = CASES[i]
    typeInto(baseOut, c.prompt, c.base, alive)
    instOut.innerHTML = ''
    instOut.append(h('span', { class: 'pr' }, c.prompt), '\n\n')
    const holder = h('span')
    instOut.append(holder)
    typeInto(holder, '', c.inst, alive)
  }
  $$<HTMLButtonElement>('.cmp-pick button', root).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.cmp-pick button', root).forEach((x) => x.classList.toggle('on', x === b))
      play(Number(b.dataset.c))
    }),
  )
  ScrollTrigger.create({ trigger: root, start: 'top 75%', once: true, onEnter: () => play(0) })
}

function initPipe() {
  if (reducedMotion) return
  const line = $('.pipe-line line')
  gsap.fromTo(line, { attr: { x2: 0 } }, { attr: { x2: 1000 }, ease: 'none', scrollTrigger: { trigger: '.pipe', start: 'top 80%', end: 'top 35%', scrub: true } })
  gsap.from('.pipe-step', {
    opacity: 0,
    y: 40,
    stagger: 0.18,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.pipe', start: 'top 75%' },
  })
}

const RAW = [
  ['<|system|>', 'Jesteś pomocnym asystentem. Dziś jest 2 października 2026.'],
  ['<|user|>', 'Jak upiec chleb?'],
  ['<|assistant|>', 'Najprostszy chleb wymaga czterech składników: mąki, wody, soli i drożdży…'],
  ['<|user|>', 'A na zakwasie?'],
]

function initChat() {
  const btn = $('.chat-toggle')
  const view = $('.chat-view')
  const raw = $('.chat-raw')
  for (const [tag, text] of RAW) {
    raw.append(h('span', { class: 'sp' }, tag), text, h('span', { class: 'sp' }, '<|end|>'), '\n')
  }
  raw.append(h('span', { class: 'sp' }, '<|assistant|>'), h('span', { class: 'cur' }), '\n\n', h('span', { class: 'note' }, '↑ model dopisuje dalej od tego miejsca'))
  let showRaw = false
  btn.addEventListener('click', () => {
    showRaw = !showRaw
    btn.textContent = showRaw ? 'Pokaż jako czat' : 'Pokaż, co widzi model'
    const out = showRaw ? view : raw
    const inn = showRaw ? raw : view
    if (reducedMotion) {
      out.hidden = true
      inn.hidden = false
      return
    }
    gsap.to(out, {
      opacity: 0,
      y: -10,
      duration: 0.25,
      onComplete: () => {
        out.hidden = true
        inn.hidden = false
        gsap.fromTo(inn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' })
        if (showRaw) gsap.from(raw.querySelectorAll('.sp'), { scale: 1.6, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'back.out(2)' })
        ScrollTrigger.refresh()
      },
    })
  })
}

export function initAssistant() {
  initCompare()
  initPipe()
  initChat()
}
