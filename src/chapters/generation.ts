import './generation.css'
import { gsap } from '../lib/scroll'
import { $, h, pct, plural, reducedMotion, sleep, watchVisible } from '../lib/utils'

const PROMPT = ['Kot', ' usiadł', ' na']
const STEPS: { c: [string, number][]; pick: number }[] = [
  { c: [[' parapecie', 0.41], [' kanapie', 0.23], [' macie', 0.11]], pick: 0 },
  { c: [[' i', 0.38], [',', 0.27], ['.', 0.2]], pick: 0 },
  { c: [[' patrzył', 0.33], [' zasnął', 0.21], [' mruczał', 0.14]], pick: 0 },
  { c: [[' na', 0.52], [' przez', 0.22], [' w', 0.12]], pick: 1 },
  { c: [[' okno', 0.71], [' szybę', 0.17], [' ramię', 0.03]], pick: 0 },
  { c: [[',', 0.44], ['.', 0.39], [' na', 0.07]], pick: 0 },
  { c: [[' jak', 0.36], [' za', 0.22], [' gdzie', 0.15]], pick: 1 },
  { c: [[' którym', 0.68], [' oknem', 0.12], [' szybą', 0.06]], pick: 0 },
  { c: [[' padał', 0.47], [' lał', 0.2], [' szalała', 0.09]], pick: 0 },
  { c: [[' deszcz', 0.82], [' śnieg', 0.11], [' grad', 0.03]], pick: 0 },
  { c: [['.', 0.74], [',', 0.15], [' i', 0.06]], pick: 0 },
  { c: [['<|koniec|>', 0.61], [' Po', 0.09], ['\n', 0.08]], pick: 0 },
]

export function initGeneration() {
  const root = $('.gen')
  const ctx = $('.gen-ctx', root)
  const kv = $('.gen-kv', root)
  const core = $('.gen-core', root)
  const dist = $('.gen-dist', root)
  const status = $('.gen-status', root)
  const nEl = $('.gen-n', root)
  const newEl = $('.gen-new', root)
  const cachedEl = $('.gen-cached', root)
  const playBtn = $('.gen-play', root)

  let playing = true
  let visible = false
  let runId = 0
  watchVisible(root, (v) => (visible = v), '-10% 0px')

  const kvCell = (fresh: boolean) => h('div', { class: 'kv' + (fresh ? ' fresh' : '') }, h('i'), h('i'))
  const chip = (t: string, cls: string) => h('span', { class: 'gtok ' + cls }, t.replace('\n', '↵'))

  const wait = async (ms: number, id: number) => {
    await sleep(reducedMotion ? 0 : ms)
    while ((!playing || !visible) && id === runId) await sleep(200)
    return id === runId
  }

  const run = async () => {
    const id = ++runId
    ctx.innerHTML = ''
    kv.innerHTML = ''
    dist.innerHTML = ''
    for (const t of PROMPT) ctx.append(chip(t, 'prompt'))
    let tokens = PROMPT.length
    nEl.textContent = `(${tokens} ${plural(tokens, 'token', 'tokeny', 'tokenów')})`
    if (!(await wait(500, id))) return

    for (let s = 0; s < STEPS.length; s++) {
      const step = STEPS[s]
      kv.querySelectorAll('.kv').forEach((k) => k.classList.remove('fresh'))
      // krok 1: cały prompt naraz (prefill); potem już tylko jeden nowy token na krok
      const live = s === 0 ? (Array.from(ctx.children) as HTMLElement[]) : [ctx.lastElementChild as HTMLElement]
      status.textContent = s === 0 ? 'krok 1 · wczytanie całego pytania naraz' : `krok ${s + 1}`
      const fresh = live.length
      const cached = tokens - fresh
      newEl.innerHTML = `<b>${fresh}</b> ${plural(fresh, 'token liczony', 'tokeny liczone', 'tokenów liczonych')} od zera`
      cachedEl.innerHTML = `<b>${cached}</b> ${plural(cached, 'token', 'tokeny', 'tokenów')} z pamięci`
      live.forEach((el) => {
        el.classList.add('live')
        kv.append(kvCell(true))
      })
      core.classList.add('busy')
      dist.innerHTML = ''
      const rows = step.c.map(([w, p]) => {
        const fill = h('i')
        const r = h('div', { class: 'gd' }, h('span', {}, w.replace('\n', '↵')), h('span', { class: 'tr' }, fill), h('span', { class: 'pv' }, pct(p, 0)))
        dist.append(r)
        gsap.fromTo(fill, { scaleX: 0 }, { scaleX: p / step.c[0][1], duration: reducedMotion ? 0 : 0.5, ease: 'power3.out' })
        return r
      })
      if (!(await wait(700, id))) return
      rows[step.pick].classList.add('pick')
      if (!(await wait(450, id))) return
      live.forEach((el) => el.classList.remove('live'))
      core.classList.remove('busy')

      const [word] = step.c[step.pick]
      const isEnd = word === '<|koniec|>'
      const target = chip(word, isEnd ? 'end' : 'gen')
      target.style.visibility = 'hidden'
      ctx.append(target)
      // animacja „przelotu” tokenu z modelu do kontekstu
      if (!reducedMotion) {
        const from = rows[step.pick].getBoundingClientRect()
        const to = target.getBoundingClientRect()
        const fly = chip(word, 'gen live gen-fly')
        fly.style.left = from.left + 'px'
        fly.style.top = from.top + 'px'
        document.body.append(fly)
        await gsap.to(fly, { x: to.left - from.left, y: to.top - from.top, duration: 0.6, ease: 'power3.inOut' }).then()
        fly.remove()
      }
      target.style.visibility = ''
      tokens++
      nEl.textContent = `(${tokens} ${plural(tokens, 'token', 'tokeny', 'tokenów')})`
      if (isEnd) {
        status.textContent = 'gotowe — model wylosował token końca'
        break
      }
      if (!(await wait(250, id))) return
    }
    if (!(await wait(4000, id))) return
    run()
  }

  playBtn.addEventListener('click', () => {
    playing = !playing
    playBtn.textContent = playing ? '❚❚ pauza' : '▶ dalej'
  })
  $('.gen-reset', root).addEventListener('click', () => {
    playing = true
    playBtn.textContent = '❚❚ pauza'
    run()
  })
  run()
}
