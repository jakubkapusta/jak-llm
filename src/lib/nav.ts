import { gsap, ScrollTrigger } from './scroll'
import { $, $$, h, reducedMotion } from './utils'

const ACCENTS: Record<string, string> = {
  amber: '#ffb454',
  cyan: '#7cc8ff',
  pink: '#ff6f91',
  mint: '#6ff0b8',
  violet: '#b79bff',
}

export function initNav() {
  const sections = $$('[data-chapter]')
  const rail = $('.rail')
  const tcNum = $('.tc-num')
  const tcName = $('.tc-name')
  const root = document.documentElement

  const links = sections.map((s) => {
    const a = h(
      'a',
      { href: '#' + s.id, 'aria-label': s.dataset.title },
      h('span', { class: 'rl' }, `${s.dataset.chapter} · ${s.dataset.title}`),
      h('span', { class: 'rd' }),
    )
    rail.append(a)
    return a
  })

  let current = -1
  const activate = (i: number) => {
    if (i === current) return
    current = i
    const s = sections[i]
    links.forEach((l, j) => {
      l.classList.toggle('active', j === i)
      l.classList.toggle('done', j < i)
    })
    root.style.setProperty('--accent', ACCENTS[s.dataset.accent ?? 'amber'] ?? ACCENTS.amber)
    const swap = () => {
      tcNum.textContent = s.dataset.chapter ?? ''
      tcName.textContent = s.dataset.title ?? ''
    }
    if (reducedMotion) return swap()
    gsap.to([tcNum, tcName], {
      yPercent: -100,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        swap()
        gsap.fromTo([tcNum, tcName], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
      },
    })
  }

  // aktywny rozdział = ostatni, którego górna krawędź minęła 55% wysokości ekranu
  const pickActive = () => {
    const line = window.innerHeight * 0.55
    let idx = 0
    sections.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= line) idx = i
    })
    activate(idx)
  }
  activate(0)

  const bar = $('.progress span')
  const topbar = $('.topbar')
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(bar, { scaleX: self.progress })
      topbar.classList.toggle('solid', self.scroll() > 60)
      pickActive()
    },
  })
  ScrollTrigger.addEventListener('refresh', pickActive)
}
