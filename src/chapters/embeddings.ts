import './embeddings.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { gsap } from '../lib/scroll'
import { $, $$, h, hashStr, reducedMotion, rng, watchVisible, whenNear } from '../lib/utils'

type Word = { w: string; p: THREE.Vector3; c: string; cl: string }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function buildWords(): Word[] {
  const words: Word[] = []
  const add = (cl: string, c: string, center: THREE.Vector3, items: [string, THREE.Vector3][]) => {
    for (const [w, off] of items) words.push({ w, p: center.clone().add(off), c, cl })
  }

  // Ludzie: stały kierunek „płeć” (x) i „władza” (y)
  const G = V(1.8, 0, 0)
  const R = V(0, 1.6, 0.3)
  const man = V(-0.9, -0.7, 0)
  const young = V(0, -0.9, -0.5)
  add('ludzie', '#ffb454', V(-3.3, 0.5, 0.4), [
    ['mężczyzna', man],
    ['kobieta', man.clone().add(G)],
    ['król', man.clone().add(R)],
    ['królowa', man.clone().add(R).add(G)],
    ['chłopiec', man.clone().add(young)],
    ['dziewczyna', man.clone().add(young).add(G)],
    ['książę', man.clone().add(R).add(V(0.15, 0.75, -0.7))],
    ['księżniczka', man.clone().add(R).add(G).add(V(0.15, 0.75, -0.7))],
  ])

  // Kraje i stolice: stały kierunek „kraj → stolica”
  const CAP = V(0.15, 0.55, 1.3)
  const countries: [string, string, THREE.Vector3][] = [
    ['Polska', 'Warszawa', V(-1.2, 0.1, -0.6)],
    ['Francja', 'Paryż', V(-0.1, 0.5, -0.9)],
    ['Niemcy', 'Berlin', V(0.9, -0.2, -0.5)],
    ['Japonia', 'Tokio', V(1.6, 0.9, -1.1)],
    ['Włochy', 'Rzym', V(0.2, -0.9, -0.8)],
  ]
  const cc = V(2.7, 1.1, -1.0)
  for (const [k, s, p] of countries) {
    words.push({ w: k, p: cc.clone().add(p), c: '#7cc8ff', cl: 'kraje' })
    words.push({ w: s, p: cc.clone().add(p).add(CAP), c: '#7cc8ff', cl: 'kraje' })
  }

  // Zwierzęta: stały kierunek „dorosły → młody”
  const Y = V(0.15, -0.95, 0.65)
  const ac = V(0.2, -2.7, 2.0)
  const animals: [string, THREE.Vector3, string?][] = [
    ['kot', V(0, 0, 0), 'kocię'],
    ['pies', V(1.0, 0.1, 0.3), 'szczeniak'],
    ['koń', V(2.0, -0.4, -0.6), 'źrebię'],
    ['krowa', V(2.5, 0.2, -0.1)],
    ['tygrys', V(-1.0, 0.6, -0.4)],
    ['lew', V(-1.4, 0.2, -1.0)],
    ['wilk', V(0.3, 0.8, -0.9)],
  ]
  for (const [a, p, yng] of animals) {
    words.push({ w: a, p: ac.clone().add(p), c: '#6ff0b8', cl: 'zwierzęta' })
    if (yng) words.push({ w: yng, p: ac.clone().add(p).add(Y), c: '#6ff0b8', cl: 'zwierzęta' })
  }

  const ring = (cl: string, c: string, center: THREE.Vector3, list: string[], r = 1.1, seed = 1) => {
    const rnd = rng(seed)
    list.forEach((w, i) => {
      const a = (i / list.length) * Math.PI * 2 + rnd()
      words.push({
        w,
        p: center.clone().add(V(Math.cos(a) * r * (0.6 + rnd() * 0.5), (rnd() - 0.5) * 1.2, Math.sin(a) * r * (0.6 + rnd() * 0.5))),
        c,
        cl,
      })
    })
  }
  ring('jedzenie', '#ff6f91', V(3.2, -2.1, 1.4), ['chleb', 'ser', 'jabłko', 'pizza', 'zupa', 'pierogi', 'makaron'], 1.2, 3)
  ring('emocje', '#b79bff', V(-3.0, -2.5, -2.0), ['radość', 'smutek', 'złość', 'strach', 'miłość', 'nadzieja'], 1.1, 7)
  ring('kolory', '#ffe27a', V(0.2, 3.1, -2.6), ['czerwony', 'zielony', 'niebieski', 'żółty', 'fioletowy'], 1.0, 11)
  ring('technologia', '#e8e6f5', V(-0.6, 2.9, 2.6), ['komputer', 'telefon', 'internet', 'algorytm', 'program'], 1.1, 13)
  for (const w of words) w.p.multiplyScalar(1.35)
  return words
}

const ANALOGIES: [string, string, string, string][] = [
  ['król', 'mężczyzna', 'kobieta', 'królowa'],
  ['Paryż', 'Francja', 'Polska', 'Warszawa'],
  ['szczeniak', 'pies', 'kot', 'kocię'],
]

/* ---- pseudo-embeddingi do paska wartości ---- */
const DIMS = 48
const proj = (() => {
  const r = rng(42)
  return Array.from({ length: DIMS }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1])
})()
function embed(word: Word) {
  const r = rng(hashStr(word.w))
  return proj.map((m) => Math.tanh((m[0] * word.p.x + m[1] * word.p.y + m[2] * word.p.z) * 0.45 + (r() - 0.5) * 0.5))
}
const cosine = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return d / Math.sqrt(na * nb)
}
function valColor(v: number) {
  const a = Math.min(1, Math.abs(v))
  const [r, g, b] = v < 0 ? [124, 200, 255] : [255, 180, 84]
  const bg = [24, 24, 36]
  const mix = (x: number, y: number) => Math.round(y + (x - y) * a)
  return `rgb(${mix(r, bg[0])},${mix(g, bg[1])},${mix(b, bg[2])})`
}
function strip(vals: number[]) {
  const el = h('div', { class: 'emb-strip' })
  for (const v of vals) el.append(h('i', { style: `--v:${valColor(v)}` }))
  return el
}

/* ---- scena ---- */

const glowVert = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uPR;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (12.0 / -mv.z);
    vColor = aColor;
  }
`
const glowFrag = /* glsl */ `
  varying vec3 vColor;
  uniform float uAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.18, 0.0, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.45;
    gl_FragColor = vec4(vColor, (core + halo) * uAlpha);
  }
`

function makeArrow(color: string) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  const geo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)])
  const line = new THREE.Line(geo, mat)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.26, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  )
  const group = new THREE.Group()
  group.add(line, cone)
  group.visible = false
  const up = V(0, 1, 0)
  const set = (from: THREE.Vector3, to: THREE.Vector3, t: number) => {
    group.visible = t > 0.001
    const end = from.clone().lerp(to, t)
    geo.setFromPoints([from, end])
    cone.position.copy(end)
    const dir = to.clone().sub(from).normalize()
    cone.quaternion.setFromUnitVectors(up, dir)
  }
  return { group, set, mat, cone }
}

function initSpace() {
  const stage = $('.emb-stage')
  const canvas = $<HTMLCanvasElement>('.emb-canvas', stage)
  const labelsEl = $('.emb-labels', stage)
  const eqEl = $('.emb-eq', stage)
  const words = buildWords()
  const byName = new Map(words.map((w) => [w.w, w]))
  const vecs = new Map(words.map((w) => [w.w, embed(w)]))

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return
  }
  const pr = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(pr)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(7.5, 4, 12.5)
  const labelRenderer = new CSS2DRenderer()
  labelsEl.append(labelRenderer.domElement)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.inset = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enableZoom = false
  controls.enablePan = false
  controls.autoRotate = !reducedMotion
  controls.autoRotateSpeed = 0.45
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (coarse) {
    controls.enableRotate = false
    canvas.style.touchAction = 'pan-y'
  }
  controls.addEventListener('start', () => (controls.autoRotate = false))

  // pył — reszta wymiarów, której nie widać
  const dustN = 1400
  const dust = new Float32Array(dustN * 3)
  const r = rng(5)
  for (let i = 0; i < dustN; i++) {
    const v = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(2 + r() * 7)
    dust.set([v.x, v.y, v.z], i * 3)
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3))
  scene.add(
    new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8a86b8, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false })),
  )

  // słowa
  const pos = new Float32Array(words.length * 3)
  const col = new Float32Array(words.length * 3)
  const size = new Float32Array(words.length)
  const tmp = new THREE.Color()
  words.forEach((w, i) => {
    pos.set([w.p.x, w.p.y, w.p.z], i * 3)
    tmp.set(w.c)
    col.set([tmp.r, tmp.g, tmp.b], i * 3)
    size[i] = 14
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: glowVert,
    fragmentShader: glowFrag,
    uniforms: { uPR: { value: pr }, uAlpha: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  scene.add(new THREE.Points(geo, pointsMat))

  // konstelacje: każde słowo łączymy z najbliższym sąsiadem z tej samej grupy
  const linePts: number[] = []
  const lineCol: number[] = []
  for (const w of words) {
    let best: Word | null = null
    let bd = Infinity
    for (const o of words) {
      if (o === w || o.cl !== w.cl) continue
      const d = o.p.distanceTo(w.p)
      if (d < bd) {
        bd = d
        best = o
      }
    }
    if (best) {
      linePts.push(w.p.x, w.p.y, w.p.z, best.p.x, best.p.y, best.p.z)
      tmp.set(w.c)
      lineCol.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b)
    }
  }
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3))
  lg.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3))
  const constellation = new THREE.LineSegments(
    lg,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false }),
  )
  scene.add(constellation)

  // etykiety
  const labels = new Map<string, HTMLElement>()
  for (const w of words) {
    const el = h('div', { class: 'emb-label', style: `--c:${w.c}` }, w.w)
    el.addEventListener('click', () => select(w.w))
    const obj = new CSS2DObject(el)
    obj.position.copy(w.p)
    obj.center.set(0.5, 1.5)
    scene.add(obj)
    labels.set(w.w, el)
  }

  // strzałki i pierścień wyniku
  const arrowA = makeArrow('#a3a1b8')
  const arrowB = makeArrow('#ffb454')
  scene.add(arrowA.group, arrowB.group)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.27, 48),
    new THREE.MeshBasicMaterial({ color: '#ffb454', transparent: true, opacity: 0, side: THREE.DoubleSide }),
  )
  scene.add(ring)

  const center = V(0, -0.5, 0)
  controls.target.copy(center)

  /* ---- panel boczny ---- */
  const wordEl = $('.emb-word')
  let stripEl = $('.emb-strip[data-k="a"]')
  const nnEl = $('.emb-nn')
  function select(name: string) {
    labels.forEach((el, k) => el.classList.toggle('sel', k === name))
    wordEl.textContent = name
    const v = vecs.get(name)!
    const s = strip(v)
    stripEl.replaceWith(s)
    stripEl = s
    const me = byName.get(name)!
    const nn = words
      .filter((o) => o !== me)
      .map((o) => ({ o, sim: cosine(v, vecs.get(o.w)!) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3)
    nnEl.innerHTML = ''
    for (const { o, sim } of nn) {
      nnEl.append(
        h(
          'div',
          { class: 'emb-nn-row' },
          h('div', { class: 'emb-nn-top' }, h('span', {}, o.w), h('span', {}, 'podobieństwo ' + sim.toFixed(2).replace('.', ','))),
          strip(vecs.get(o.w)!),
        ),
      )
    }
  }
  /* ---- analogie ---- */
  let anTl: gsap.core.Timeline | null = null
  const resetAnalogy = () => {
    anTl?.kill()
    labels.forEach((el) => el.classList.remove('dim', 'res'))
    arrowA.set(V(0, 0, 0), V(0, 0, 1), 0)
    arrowB.set(V(0, 0, 0), V(0, 0, 1), 0)
    ;(ring.material as THREE.MeshBasicMaterial).opacity = 0
    eqEl.classList.remove('on')
  }
  const runAnalogy = (idx: number, btn: HTMLElement) => {
    resetAnalogy()
    $$('.emb-analogies .btn').forEach((b) => b.classList.toggle('on', b === btn))
    controls.autoRotate = false
    const [a, b, c, d] = ANALOGIES[idx].map((n) => byName.get(n)!)
    const target = a.p.clone().sub(b.p).add(c.p).add(V(0.12, -0.08, 0.1)) // lekki szum: w prawdziwym modelu wynik nie jest idealny
    labels.forEach((el, k) => el.classList.toggle('dim', ![a.w, b.w, c.w, d.w].includes(k)))
    eqEl.innerHTML = `${a.w} − ${b.w} + ${c.w} ≈ <b>?</b>`
    eqEl.classList.add('on')
    const mid = a.p.clone().add(b.p).add(c.p).add(d.p).multiplyScalar(0.25)
    const camGoal = mid.clone().add(V(1.8, 1.8, 7.5))
    const prog = { a: 0, b: 0, r: 0 }
    anTl = gsap
      .timeline()
      .to(controls.target, { x: mid.x, y: mid.y, z: mid.z, duration: 1.4, ease: 'power3.inOut' }, 0)
      .to(camera.position, { x: camGoal.x, y: camGoal.y, z: camGoal.z, duration: 1.4, ease: 'power3.inOut' }, 0)
      .add(() => select(b.w), 0.3)
      .to(prog, { a: 1, duration: 1, ease: 'power2.inOut', onUpdate: () => arrowA.set(b.p, a.p, prog.a) }, 1.0)
      .add(() => select(c.w), 2.0)
      .to(prog, { b: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: () => arrowB.set(c.p, target, prog.b) }, 2.2)
      .add(() => {
        ring.position.copy(d.p)
        labels.get(d.w)!.classList.add('res')
        eqEl.innerHTML = `${a.w} − ${b.w} + ${c.w} ≈ <b>${d.w}</b>`
        select(d.w)
      }, 3.3)
      .to(prog, { r: 1, duration: 0.6, onUpdate: () => ((ring.material as THREE.MeshBasicMaterial).opacity = prog.r) }, 3.3)
  }
  $$<HTMLButtonElement>('.emb-analogies .btn').forEach((b) =>
    b.addEventListener('click', () => runAnalogy(Number(b.dataset.an), b)),
  )

  /* ---- pętla ---- */
  const resize = () => {
    const w = stage.clientWidth
    const hh = stage.clientHeight
    renderer.setSize(w, hh, false)
    labelRenderer.setSize(w, hh)
    camera.aspect = w / hh
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(stage)
  resize()

  let raf = 0
  const t0 = performance.now()
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const t = (performance.now() - t0) / 1000
    controls.update()
    ring.lookAt(camera.position)
    ring.scale.setScalar(1 + Math.sin(t * 4) * 0.12)
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
  }
  watchVisible(stage, (v) => {
    cancelAnimationFrame(raf)
    if (v) loop()
  })
  select('kot')
}

function initRope() {
  const row = $('.rope-row')
  const toks = ['Kot', 'usiadł', 'na', 'parapecie', 'i', 'patrzył']
  const speeds = [
    { deg: 68, c: 'var(--amber)' },
    { deg: 24, c: 'var(--violet)' },
    { deg: 6, c: 'var(--cyan)' },
  ]
  const hands: { el: SVGLineElement; deg: number }[] = []
  toks.forEach((t, pos) => {
    const dials = h('div', { class: 'rope-dials' })
    for (const s of speeds) {
      const ns = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(ns, 'svg')
      svg.setAttribute('viewBox', '-20 -20 40 40')
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('r', '17')
      c.setAttribute('fill', 'rgba(255,255,255,0.03)')
      c.setAttribute('stroke', 'rgba(255,255,255,0.15)')
      const tick = document.createElementNS(ns, 'line')
      tick.setAttribute('x1', '0')
      tick.setAttribute('y1', '-17')
      tick.setAttribute('x2', '0')
      tick.setAttribute('y2', '-13')
      tick.setAttribute('stroke', 'rgba(255,255,255,0.3)')
      const hand = document.createElementNS(ns, 'line')
      hand.setAttribute('x1', '0')
      hand.setAttribute('y1', '0')
      hand.setAttribute('x2', '0')
      hand.setAttribute('y2', '-14')
      hand.setAttribute('stroke', s.c)
      hand.setAttribute('stroke-width', '2.5')
      hand.setAttribute('stroke-linecap', 'round')
      const dot = document.createElementNS(ns, 'circle')
      dot.setAttribute('r', '2')
      dot.setAttribute('fill', '#fff')
      svg.append(c, tick, hand, dot)
      dials.append(svg)
      hands.push({ el: hand, deg: s.deg * pos })
    }
    row.append(h('div', { class: 'rope-tok' }, h('span', { class: 'w' }, t), dials, h('span', { class: 'pos' }, `pozycja ${pos}`)))
  })
  if (reducedMotion) {
    hands.forEach(({ el, deg }) => el.setAttribute('transform', `rotate(${deg})`))
    return
  }
  const state = hands.map(() => ({ r: 0 }))
  gsap.to(state, {
    r: (i: number) => hands[i].deg,
    duration: 2.2,
    ease: 'expo.out',
    stagger: 0.02,
    scrollTrigger: { trigger: row, start: 'top 80%' },
    onUpdate: () => state.forEach((s, i) => hands[i].el.setAttribute('transform', `rotate(${s.r})`)),
  })
}

export function initEmbeddings() {
  whenNear($('.emb-stage'), initSpace, '800px')
  initRope()
}
