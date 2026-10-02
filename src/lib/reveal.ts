import { gsap, ScrollTrigger } from './scroll'
import { $$, reducedMotion } from './utils'

/** Dzieli nagłówek na słowa (z zachowaniem <em> itd.) i odsłania je po kolei. */
function splitWords(root: HTMLElement) {
  const words: HTMLElement[] = []
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? '').split(/(\s+)/)
        const frag = document.createDocumentFragment()
        for (const p of parts) {
          if (!p) continue
          if (/^\s+$/.test(p)) {
            frag.append(' ')
            continue
          }
          const outer = document.createElement('span')
          outer.className = 'split-word'
          const inner = document.createElement('span')
          inner.textContent = p
          outer.append(inner)
          frag.append(outer)
          words.push(inner)
        }
        child.replaceWith(frag)
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName !== 'BR') {
        walk(child)
      }
    }
  }
  walk(root)
  return words
}

export function initReveals() {
  if (reducedMotion) return

  for (const el of $$('[data-split]')) {
    const words = splitWords(el)
    gsap.from(words, {
      yPercent: 115,
      rotate: 4,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    })
  }

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.09,
        overwrite: true,
      }),
  })

  for (const el of $$('[data-parallax]')) {
    const amt = Number(el.dataset.parallax) || 0.15
    gsap.fromTo(
      el,
      { yPercent: amt * 100 },
      {
        yPercent: -amt * 100,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  }
}
