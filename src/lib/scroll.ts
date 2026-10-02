import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reducedMotion } from './utils'

gsap.registerPlugin(ScrollTrigger)

export let lenis: Lenis | null = null

export function initScroll() {
  if (reducedMotion) return
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: { offset: 0 } })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
}

export function scrollToEl(target: Element | string) {
  if (lenis) lenis.scrollTo(target as HTMLElement, { duration: 1.6 })
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }
}

export { gsap, ScrollTrigger }
