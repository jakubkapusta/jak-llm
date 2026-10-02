import './hero.css'
import * as THREE from 'three'
import { gsap } from '../lib/scroll'
import { $, h, pct, reducedMotion, sleep, watchVisible } from '../lib/utils'

/* ------------------------------------------------------------------ */
/* Galaktyka tokenów (WebGL)                                           */
/* ------------------------------------------------------------------ */

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScatter;
  uniform vec2 uMouse;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // powolny obrót zależny od promienia — wewnętrzne ramiona kręcą się szybciej
    float r = length(p.xz);
    float ang = uTime * (0.06 + 0.12 / (r + 0.6));
    float c = cos(ang), s = sin(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.7 + aSeed * 30.0) * 0.04;
    // rozproszenie przy przewijaniu
    p += normalize(p + vec3(0.001)) * uScatter * (1.5 + aSeed * 4.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // delikatna paralaksa za kursorem
    mv.xy += uMouse * (0.15 + aSeed * 0.25);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.65 + 0.35 * sin(uTime * 2.0 + aSeed * 60.0);
    gl_PointSize = aSize * uPixelRatio * (32.0 / -mv.z) * twinkle;
    vColor = aColor;
    vAlpha = (1.0 - uScatter * 0.8) * twinkle;
  }
`

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.8);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`

function initGalaxy(canvas: HTMLCanvasElement, section: HTMLElement) {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return
  }
  const pr = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(pr)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
  camera.position.set(0, 2.6, 6.2)
  camera.lookAt(0, 0, 0)

  const isSmall = window.innerWidth < 700
  const N = isSmall ? 9000 : 22000
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const size = new Float32Array(N)
  const seed = new Float32Array(N)
  const inner = new THREE.Color('#ffcf8a')
  const mid = new THREE.Color('#ff8a5c')
  const outer = new THREE.Color('#6fb8ff')
  const violet = new THREE.Color('#a98bff')
  const tmp = new THREE.Color()
  const branches = 4
  const R = 5.2

  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 1.6) * R
    const branch = ((i % branches) / branches) * Math.PI * 2
    const spin = r * 0.9
    const spread = Math.pow(Math.random(), 2.6) * (0.25 + r * 0.32)
    const rx = (Math.random() - 0.5) * 2 * spread
    const ry = (Math.random() - 0.5) * 2 * spread * 0.35
    const rz = (Math.random() - 0.5) * 2 * spread
    pos[i * 3] = Math.cos(branch + spin) * r + rx
    pos[i * 3 + 1] = ry
    pos[i * 3 + 2] = Math.sin(branch + spin) * r + rz
    const t = r / R
    if (t < 0.35) tmp.copy(inner).lerp(mid, t / 0.35)
    else tmp.copy(mid).lerp(Math.random() > 0.7 ? violet : outer, (t - 0.35) / 0.65)
    col[i * 3] = tmp.r
    col[i * 3 + 1] = tmp.g
    col[i * 3 + 2] = tmp.b
    size[i] = Math.random() < 0.012 ? 6 + Math.random() * 6 : 1 + Math.random() * 2.2
    seed[i] = Math.random()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pr },
    uScatter: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  }
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.rotation.x = 0.28
  points.rotation.z = -0.18
  points.position.x = isSmall ? 0 : 2.2
  scene.add(points)

  const resize = () => {
    const w = section.clientWidth
    const hgt = section.clientHeight
    renderer.setSize(w, hgt, false)
    camera.aspect = w / hgt
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const mouse = new THREE.Vector2()
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth - 0.5) * 2, -(e.clientY / window.innerHeight - 0.5) * 2)
  })

  // rozproszenie galaktyki przy przewijaniu w dół
  gsap.to(uniforms.uScatter, {
    value: 1,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
  })

  let visible = true
  let raf = 0
  const t0 = performance.now()
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const t = (performance.now() - t0) / 1000
    uniforms.uTime.value = reducedMotion ? 0 : t
    uniforms.uMouse.value.lerp(mouse, 0.04)
    points.rotation.y = reducedMotion ? 0 : t * 0.02
    renderer.render(scene, camera)
  }
  watchVisible(section, (v) => {
    if (v === visible) return
    visible = v
    if (v) {
      loop()
    } else cancelAnimationFrame(raf)
  })
  loop()
}

/* ------------------------------------------------------------------ */
/* Demo: model dopisuje tekst na żywo                                  */
/* ------------------------------------------------------------------ */

type Step = { c: [string, number][]; pick: number }
const SEQS: { prompt: string; steps: Step[] }[] = [
  {
    prompt: 'Kot usiadł na',
    steps: [
      { c: [[' parapecie', 0.41], [' kanapie', 0.23], [' macie', 0.11], [' dachu', 0.08]], pick: 0 },
      { c: [[' i', 0.38], [',', 0.27], ['.', 0.2], [' w', 0.05]], pick: 0 },
      { c: [[' patrzył', 0.33], [' zasnął', 0.21], [' mruczał', 0.14], [' czekał', 0.09]], pick: 0 },
      { c: [[' na', 0.52], [' przez', 0.22], [' w', 0.12], [',', 0.04]], pick: 1 },
      { c: [[' okno', 0.71], [' szybę', 0.17], [' ramię', 0.03], [' firankę', 0.02]], pick: 0 },
      { c: [['.', 0.58], [',', 0.21], [' na', 0.09], [' w', 0.04]], pick: 0 },
    ],
  },
  {
    prompt: 'Największą tajemnicą wszechświata jest',
    steps: [
      { c: [[' to', 0.34], [' ciemna', 0.19], [' pytanie', 0.11], [' czas', 0.06]], pick: 0 },
      { c: [[',', 0.62], [' że', 0.21], [' co', 0.06], [' czym', 0.04]], pick: 0 },
      { c: [[' że', 0.81], [' czy', 0.07], [' dlaczego', 0.05], [' jak', 0.03]], pick: 0 },
      { c: [[' w', 0.18], [' w ogóle', 0.15], [' jest', 0.12], [' da', 0.09]], pick: 1 },
      { c: [[' istnieje', 0.66], [' da', 0.12], [' jest', 0.08], [' działa', 0.06]], pick: 0 },
      { c: [['.', 0.71], [',', 0.12], [' —', 0.05], ['!', 0.04]], pick: 0 },
    ],
  },
  {
    prompt: 'Przepis na idealny poniedziałek:',
    steps: [
      { c: [[' kawa', 0.29], [' dużo', 0.17], [' wstać', 0.12], [' nie', 0.09]], pick: 0 },
      { c: [[',', 0.48], [' i', 0.21], ['.', 0.14], [' bez', 0.05]], pick: 0 },
      { c: [[' cisza', 0.13], [' kawa', 0.12], [' koc', 0.09], [' więcej', 0.08]], pick: 1 },
      { c: [[' i', 0.37], [',', 0.31], ['.', 0.18], [' oraz', 0.03]], pick: 0 },
      { c: [[' jeszcze', 0.24], [' kawa', 0.2], [' wtorek', 0.06], [' drzemka', 0.05]], pick: 2 },
      { c: [['.', 0.64], ['!', 0.18], [' rano', 0.04], [' 😉', 0.03]], pick: 0 },
    ],
  },
]

async function runDemo(root: HTMLElement) {
  const text = $('.hd-text', root)
  const cands = $('.hd-cands', root)
  let active = true
  watchVisible(root, (v) => (active = v))
  const waitActive = async () => {
    while (!active) await sleep(300)
  }

  const speed = reducedMotion ? 0 : 1
  for (let s = 0; ; s = (s + 1) % SEQS.length) {
    const seq = SEQS[s]
    text.textContent = ''
    cands.innerHTML = ''
    for (const ch of seq.prompt) {
      text.append(ch)
      await sleep(38 * speed)
    }
    await sleep(500 * speed)
    for (const step of seq.steps) {
      await waitActive()
      cands.innerHTML = ''
      const rows = step.c.map(([w, p]) => {
        const bar = h('i')
        const row = h(
          'div',
          { class: 'hd-cand' },
          h('span', { class: 'w' }, JSON.stringify(w).slice(1, -1).replace(/ /g, '·')),
          h('span', { class: 'bar' }, bar),
          h('span', { class: 'p' }, pct(p, 0)),
        )
        cands.append(row)
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: p / step.c[0][1], duration: 0.5 * speed + 0.01, ease: 'power3.out' })
        return row
      })
      gsap.from(rows, { opacity: 0, x: -8, stagger: 0.05, duration: 0.3 * speed + 0.01 })
      await sleep(850 * speed)
      rows[step.pick].classList.add('pick')
      await sleep(450 * speed)
      const span = h('span', { class: 'new' }, step.c[step.pick][0])
      text.append(span)
      setTimeout(() => span.classList.add('settled'), 60)
      await sleep(380 * speed)
    }
    gsap.to(cands.children, { opacity: 0, duration: 0.4 })
    await sleep(2600 * speed + 600)
  }
}

export function initHero() {
  const section = $('#wstep')
  initGalaxy($('.hero-canvas', section) as HTMLCanvasElement, section)

  if (!reducedMotion) {
    const tl = gsap.timeline({ delay: 0.15 })
    tl.from('.ht-line > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12 })
      .from('.hero-kicker', { opacity: 0, y: 20, duration: 1, ease: 'expo.out' }, 0.3)
      .from('.hero-sub', { opacity: 0, y: 30, duration: 1.2, ease: 'expo.out' }, 0.5)
      .from('.hero-demo', { opacity: 0, y: 40, duration: 1.2, ease: 'expo.out' }, 0.7)
      .from('.scroll-cue', { opacity: 0, duration: 1 }, 1.1)

    gsap.to('.hero-inner', {
      yPercent: -18,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom 20%', scrub: true },
    })
  }

  runDemo($('.hero-demo', section))
}
