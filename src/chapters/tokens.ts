import './tokens.css'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { $, $$, h, reducedMotion, sleep, watchVisible, whenNear } from '../lib/utils'

type Enc = { encode: (s: string) => number[]; decode: (t: number[]) => string }
type EncName = 'o200k' | 'r50k'

const COLORS = ['124,200,255', '255,180,84', '111,240,184', '255,111,145', '183,155,255', '255,226,122']

const encCache: Partial<Record<EncName, Promise<Enc>>> = {}
export function loadEncoder(name: EncName): Promise<Enc> {
  encCache[name] ??=
    name === 'o200k'
      ? import('gpt-tokenizer/encoding/o200k_base').then((m) => ({ encode: m.encode, decode: m.decode }))
      : import('gpt-tokenizer/encoding/r50k_base').then((m) => ({ encode: m.encode, decode: m.decode }))
  return encCache[name]!
}

/** Grupuje tokeny tak, by znaki wielobajtowe (np. emoji) pocięte na kilka tokenów dało się wyświetlić. */
export function tokenPieces(enc: Enc, text: string) {
  const ids = enc.encode(text)
  const pieces: { text: string; ids: number[] }[] = []
  for (let i = 0; i < ids.length; i++) {
    const group = [ids[i]]
    let str = enc.decode(group)
    while (str.includes('�') && i + 1 < ids.length && group.length < 6) {
      group.push(ids[++i])
      str = enc.decode(group)
    }
    pieces.push({ text: str, ids: group })
  }
  return { ids, pieces }
}

export function renderTok(text: string, ids: number[], idx: number, delay = 0) {
  if (text === '\n') return h('span', { class: 'tok nl' })
  const shown = text.replace(/ /g, '·').replace(/\n/g, '↵')
  const el = h(
    'span',
    { class: 'tok' + (ids.length > 1 ? ' multi' : ''), style: `--c:${COLORS[idx % COLORS.length]};animation-delay:${delay}ms` },
    h('span', { class: 'tt' }),
    h('span', { class: 'id' }, ids.join(' ')),
  )
  const tt = el.querySelector('.tt')!
  // kropki zamiast spacji, przyciemnione
  for (const part of shown.split(/(·+)/)) {
    if (!part) continue
    tt.append(part.startsWith('·') ? h('span', { class: 'sp' }, part) : part)
  }
  if (ids.length > 1) tt.append(h('sup', {}, `×${ids.length}`))
  return el
}

function initPlayground() {
  const root = $('.tk-play')
  const input = $<HTMLTextAreaElement>('.tk-input', root)
  const out = $('.tk-out', root)
  const elChars = $('.tk-chars', root)
  const elCount = $('.tk-count', root)
  const elRatio = $('.tk-ratio', root)
  const ids = $<HTMLInputElement>('.tk-ids', root)
  let encName: EncName = 'o200k'
  let first = true

  const update = async () => {
    const enc = await loadEncoder(encName)
    const text = input.value
    const { ids: all, pieces } = tokenPieces(enc, text)
    out.innerHTML = ''
    pieces.forEach((p, i) => out.append(renderTok(p.text, p.ids, i, first ? i * 25 : 0)))
    first = false
    const chars = [...text].length
    elChars.textContent = String(chars)
    elCount.textContent = String(all.length)
    elRatio.textContent = all.length ? (chars / all.length).toFixed(1).replace('.', ',') : '0'
  }

  let t = 0
  input.addEventListener('input', () => {
    clearTimeout(t)
    t = window.setTimeout(update, 60)
  })
  ids.addEventListener('change', () => out.classList.toggle('show-ids', ids.checked))
  for (const b of $$<HTMLButtonElement>('.tk-enc button', root)) {
    b.addEventListener('click', () => {
      $$('.tk-enc button', root).forEach((x) => x.classList.toggle('on', x === b))
      encName = b.dataset.enc as EncName
      first = true
      update()
    })
  }
  whenNear(root, update, '900px')
}

function initCompare() {
  const rowsEl = $('.tkc-rows')
  const PL = 'Wczoraj wieczorem przeczytałam fascynującą książkę o sztucznej inteligencji.'
  const EN = 'Last night I read a fascinating book about artificial intelligence.'

  whenNear(rowsEl, async () => {
    const enc = await loadEncoder('o200k')
    const pl = tokenPieces(enc, PL)
    const en = tokenPieces(enc, EN)
    const max = Math.max(pl.ids.length, en.ids.length)
    const row = (cls: string, label: string, data: ReturnType<typeof tokenPieces>) => {
      const toks = h('div', { class: 'tkc-toks' })
      data.pieces.forEach((p, i) => toks.append(renderTok(p.text, p.ids, i)))
      const fill = h('i')
      const r = h(
        'div',
        { class: 'tkc-row ' + cls },
        h('div', { class: 'tkc-head' }, h('span', {}, label), h('b', {}, `${data.ids.length} tokenów`)),
        h('div', { class: 'tkc-meter' }, fill),
        toks,
      )
      gsap.fromTo(
        fill,
        { scaleX: 0 },
        { scaleX: data.ids.length / max, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: rowsEl, start: 'top 80%' } },
      )
      return r
    }
    const ratio = pl.ids.length / en.ids.length
    rowsEl.append(
      row('pl', 'po polsku', pl),
      row('en', 'po angielsku', en),
      h('p', {
        class: 'tkc-note',
        html: `To samo zdanie po polsku zajmuje <b>${ratio.toFixed(1).replace('.', ',')}×</b> więcej tokenów (tokenizer GPT-4o). W starszym tokenizerze GPT-2 różnica była jeszcze większa.`,
      }),
    )
    ScrollTrigger.refresh()
  })

  whenNear($('.tk-straw'), async () => {
    const enc = await loadEncoder('o200k')
    const el = $('.tk-straw')
    el.textContent = ''
    tokenPieces(enc, 'strawberry').pieces.forEach((p, i) => el.append(renderTok(p.text, p.ids, i)))
    el.append(' ')
  })
}

/* ------------------------------------------------------------------ */
/* BPE                                                                 */
/* ------------------------------------------------------------------ */

const WORD = 'nieprzewidywalność'
const MERGES: [string, string][] = [
  ['r', 'z'],
  ['n', 'i'],
  ['ni', 'e'],
  ['p', 'rz'],
  ['prz', 'e'],
  ['w', 'i'],
  ['wi', 'd'],
  ['ś', 'ć'],
  ['n', 'o'],
  ['no', 'ść'],
  ['a', 'l'],
  ['al', 'ność'],
  ['y', 'w'],
]

function bpeStates() {
  const states: { toks: string[]; hit: number[]; merged: string | null }[] = []
  let toks = [...WORD]
  states.push({ toks, hit: [], merged: null })
  for (const [a, b] of MERGES) {
    const hit: number[] = []
    for (let i = 0; i < toks.length - 1; i++) if (toks[i] === a && toks[i + 1] === b) hit.push(i, i + 1)
    // stan z podświetloną parą
    states.push({ toks, hit, merged: null })
    const next: string[] = []
    for (let i = 0; i < toks.length; i++) {
      if (toks[i] === a && toks[i + 1] === b) {
        next.push(a + b)
        i++
      } else next.push(toks[i])
    }
    toks = next
    states.push({ toks, hit: [], merged: a + b })
  }
  return states
}

function initBPE() {
  const root = $('.bpe')
  const word = $('.bpe-word', root)
  const rule = $('.bpe-rule-text', root)
  const vocab = $('.bpe-vocab', root)
  const stepEl = $('.bpe-step', root)
  const play = $('.bpe-play', root)
  const states = bpeStates()
  let i = 0
  let playing = !reducedMotion
  let visible = false

  const draw = () => {
    const s = states[i]
    word.innerHTML = ''
    s.toks.forEach((t, j) => {
      const cls = 'bpe-tok' + (s.hit.includes(j) ? ' hit' : '') + (s.merged === t ? ' fresh' : '')
      word.append(h('span', { class: cls }, t))
    })
    const mergeIdx = Math.ceil(i / 2)
    stepEl.textContent = `krok ${mergeIdx} / ${MERGES.length}`
    if (i === 0) rule.innerHTML = 'Start: każdy znak to osobny token'
    else if (s.hit.length) {
      const [a, b] = MERGES[mergeIdx - 1]
      rule.innerHTML = `Najczęstsza para w korpusie: <b>${a}</b> + <b>${b}</b>`
    } else rule.innerHTML = `Sklejone → nowy token <b>${s.merged}</b> · teraz ${s.toks.length} tokenów`
    vocab.innerHTML = ''
    for (let k = 0; k < Math.floor(i / 2); k++) vocab.append(h('span', {}, MERGES[k].join('')))
    if (i === states.length - 1) rule.innerHTML = `Gotowe: ${WORD.length} znaków → <b>${s.toks.length} tokenów</b>`
  }

  const go = (d: number) => {
    i = (i + d + states.length) % states.length
    draw()
  }
  $('.bpe-next', root).addEventListener('click', () => {
    playing = false
    play.textContent = '▶ odtwarzaj'
    go(1)
  })
  $('.bpe-prev', root).addEventListener('click', () => {
    playing = false
    play.textContent = '▶ odtwarzaj'
    go(-1)
  })
  play.addEventListener('click', () => {
    playing = !playing
    play.textContent = playing ? '❚❚ pauza' : '▶ odtwarzaj'
  })
  if (!playing) play.textContent = '▶ odtwarzaj'
  watchVisible(root, (v) => (visible = v))
  draw()
  ;(async () => {
    for (;;) {
      await sleep(i === states.length - 1 ? 3200 : i % 2 === 1 ? 900 : 650)
      if (playing && visible) go(1)
    }
  })()
}

export function initTokens() {
  initPlayground()
  initCompare()
  initBPE()
}
