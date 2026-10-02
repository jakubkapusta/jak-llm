import './nextword.css'
import { gsap } from '../lib/scroll'
import { $, h, pct } from '../lib/utils'

type Round = { prompt: string; dist: [string, number][]; choices: string[]; lesson: string }

// Rozkłady są ilustracyjne, ale oddają to, jak zachowuje się prawdziwy model.
const ROUNDS: Round[] = [
  {
    prompt: 'Stolicą Polski jest',
    dist: [['Warszawa', 0.93], ['miasto', 0.03], ['Kraków', 0.02], ['oczywiście', 0.01], ['Gniezno', 0.004]],
    choices: ['Kraków', 'Warszawa', 'Gniezno', 'miasto'],
    lesson: 'Tu potrzeba <strong>wiedzy o świecie</strong>. Model „wie” to, bo w danych treningowych to zdanie i jego warianty pojawiły się tysiące razy.',
  },
  {
    prompt: 'Kot usiadł na',
    dist: [['parapecie', 0.31], ['kanapie', 0.22], ['macie', 0.12], ['kolanach', 0.1], ['dachu', 0.07]],
    choices: ['dachu', 'kanapie', 'parapecie', 'kolanach'],
    lesson: 'Tu <strong>nie ma jednej dobrej odpowiedzi</strong>. Rozkład jest „płaski” — i właśnie dlatego ten sam model może za każdym razem napisać coś innego.',
  },
  {
    prompt: 'Ala ma',
    dist: [['kota', 0.87], ['psa', 0.04], ['rację', 0.03], ['problem', 0.02], ['dom', 0.01]],
    choices: ['psa', 'kota', 'rację', 'dom'],
    lesson: 'To czysta <strong>kultura</strong>: każdy, kto uczył się czytać po polsku, zna elementarz. Model też go „czytał”.',
  },
  {
    prompt: '17 + 25 =',
    dist: [['42', 0.96], ['32', 0.012], ['41', 0.008], ['43', 0.006], ['?', 0.003]],
    choices: ['32', '41', '42', '43'],
    lesson: 'Tu trzeba <strong>policzyć</strong>. Badania pokazują, że modele wykształcają w środku całkiem sprytne obwody do dodawania — nikt ich tego wprost nie uczył.',
  },
  {
    prompt: 'Mimo deszczu postanowiliśmy',
    dist: [['pójść', 0.38], ['wyjść', 0.24], ['pojechać', 0.15], ['zostać', 0.02], ['spać', 0.01]],
    choices: ['zostać', 'spać', 'wyjść', 'pójść'],
    lesson: 'Słowo „mimo” zapowiada coś <em>wbrew</em> deszczowi. „Zostać” jest poprawne gramatycznie, ale nie pasuje <strong>logicznie</strong> — model to wyłapuje.',
  },
  {
    prompt: 'Rano zawsze piję',
    dist: [['kawę', 0.52], ['herbatę', 0.29], ['wodę', 0.1], ['sok', 0.03], ['kakao', 0.02]],
    choices: ['kawę', 'sok', 'herbatę', 'wodę'],
    lesson: 'Tu model zna po prostu <strong>statystykę ludzkich nawyków</strong>. Jego „opinie” to w dużej mierze echo tego, co ludzie najczęściej piszą.',
  },
]

export function initNextWord() {
  const root = $('.nw-game')
  const roundEl = $('.nw-round', root)
  const ptext = $('.nw-ptext', root)
  const blank = $('.nw-blank', root)
  const choices = $('.nw-choices', root)
  const result = $('.nw-result', root)
  const verdict = $('.nw-verdict', root)
  const bars = $('.nw-bars', root)
  const lesson = $('.nw-lesson', root)
  const next = $<HTMLButtonElement>('.nw-next', root)

  let i = 0
  let score = 0

  const render = () => {
    const r = ROUNDS[i]
    roundEl.textContent = `runda ${i + 1} / ${ROUNDS.length}`
    ptext.textContent = r.prompt
    blank.textContent = '______'
    blank.classList.remove('filled')
    result.hidden = true
    choices.innerHTML = ''
    for (const c of r.choices) {
      const b = h('button', { class: 'nw-choice' }, c)
      b.addEventListener('click', () => answer(c, b))
      choices.append(b)
    }
    gsap.from(choices.children, { y: 16, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'expo.out' })
  }

  const answer = (word: string, btn: HTMLButtonElement) => {
    const r = ROUNDS[i]
    for (const b of choices.querySelectorAll('button')) (b as HTMLButtonElement).disabled = true
    btn.classList.add('chosen')
    const top = r.dist[0][0]
    const mine = r.dist.find(([w]) => w === word)?.[1] ?? 0
    if (word === top) score++
    blank.textContent = top
    blank.classList.add('filled')
    verdict.innerHTML =
      word === top
        ? `Trafione! Model też postawiłby na <b>„${top}”</b>.`
        : `Model wybrałby raczej <b>„${top}”</b> — ale Twoje „${word}” dostało ${pct(mine)}.`
    bars.innerHTML = ''
    for (const [w, p] of r.dist) {
      const fill = h('i')
      const row = h(
        'div',
        { class: 'nw-bar' + (w === top ? ' top' : '') + (w === word ? ' mine' : '') },
        h('span', { class: 'w' }, w),
        h('span', { class: 'track' }, fill),
        h('span', { class: 'p' }, pct(p)),
      )
      bars.append(row)
      gsap.fromTo(fill, { scaleX: 0 }, { scaleX: p, duration: 1, ease: 'expo.out', delay: 0.1 })
    }
    lesson.innerHTML = r.lesson
    next.textContent = i === ROUNDS.length - 1 ? 'Pokaż wynik →' : 'Następna runda →'
    result.hidden = false
    gsap.from(result, { opacity: 0, y: 20, duration: 0.7, ease: 'expo.out' })
  }

  const finish = () => {
    result.hidden = true
    choices.innerHTML = ''
    ptext.textContent = ''
    blank.textContent = ''
    roundEl.textContent = 'koniec gry'
    const fin = h(
      'div',
      { class: 'nw-final' },
      h('div', { class: 'score' }, `${score} / ${ROUNDS.length}`),
      h('p', {
        html: 'Tyle razy wskazano to samo słowo co model. Tylko że model gra w tę grę <strong>bez przerwy</strong>: przy każdym słowie każdej odpowiedzi, którą kiedykolwiek napisał.',
      }),
      h('button', { class: 'btn' }, '↺ Zagraj jeszcze raz'),
    )
    fin.querySelector('button')!.addEventListener('click', () => {
      fin.remove()
      i = 0
      score = 0
      render()
    })
    choices.after(fin)
    gsap.from(fin, { opacity: 0, scale: 0.96, duration: 0.8, ease: 'expo.out' })
  }

  next.addEventListener('click', () => {
    if (i === ROUNDS.length - 1) return finish()
    i++
    render()
  })

  render()
}
