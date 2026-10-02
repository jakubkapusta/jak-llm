export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[]

/** Tworzy element: h('div', { class: 'x' }, 'tekst', dziecko) */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue
    if (k === 'html') el.innerHTML = String(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c)
  return el
}

export function softmax(logits: number[], temperature = 1): number[] {
  const t = Math.max(temperature, 1e-4)
  const m = Math.max(...logits)
  const ex = logits.map((l) => Math.exp((l - m) / t))
  const s = ex.reduce((a, b) => a + b, 0)
  return ex.map((e) => e / s)
}

export const pct = (p: number, digits = 1) => {
  const v = p * 100
  if (v > 0 && v < Math.pow(10, -digits)) return '<' + Math.pow(10, -digits).toFixed(digits) + '%'
  return v.toFixed(digits).replace('.', ',') + '%'
}

export const fmt = (n: number, digits = 2) => n.toFixed(digits).replace('.', ',')

/** Wywołuje cb raz, gdy element zbliży się do ekranu. */
export function whenNear(el: Element, cb: () => void, margin = '600px') {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        cb()
      }
    },
    { rootMargin: margin },
  )
  io.observe(el)
}

/** Śledzi widoczność elementu (np. żeby pauzować animacje poza ekranem). */
export function watchVisible(el: Element, cb: (visible: boolean) => void, margin = '0px') {
  const io = new IntersectionObserver((entries) => cb(entries[entries.length - 1].isIntersecting), {
    rootMargin: margin,
  })
  io.observe(el)
  return () => io.disconnect()
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Deterministyczny generator liczb losowych — te same „wektory” przy każdym wejściu. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 1_000_000) / 1_000_000
  }
}

export function hashStr(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Aktualizuje wypełnienie suwaka (--p) */
export function syncRange(input: HTMLInputElement) {
  const min = Number(input.min || 0)
  const max = Number(input.max || 100)
  input.style.setProperty('--p', ((Number(input.value) - min) / (max - min)) * 100 + '%')
}

export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Polska odmiana liczebnika: plural(3, 'token', 'tokeny', 'tokenów') */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many
}
