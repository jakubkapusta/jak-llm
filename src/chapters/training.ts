import './training.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { $, fmt, h, pct, reducedMotion, softmax, syncRange, watchVisible, whenNear } from '../lib/utils'

/* ------------------------------------------------------------------ */
/* Jedna lekcja: krok gradientu na logitach                            */
/* ------------------------------------------------------------------ */

const LESSON: [string, number][] = [
  ['parapecie', 0.1],
  ['kanapie', 0.4],
  ['macie', -0.2],
  ['w', 0.6],
  ['okno', 0.0],
  ['się', 0.3],
  ['kot', -0.1],
  ['ziemniaku', 0.2],
]

function sparkline(canvas: HTMLCanvasElement, data: number[], color: string, maxV?: number) {
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio, 2)
  const w = canvas.clientWidth
  const hh = canvas.clientHeight
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr
    canvas.height = hh * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, hh)
  if (data.length < 2) return
  const max = maxV ?? Math.max(...data, 0.01)
  const pad = 6
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - Math.min(v, max) / max) * (hh - pad * 2)
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  })
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.shadowBlur = 0
}

function initLesson() {
  const root = $('.lesson')
  const rowsEl = $('.ls-rows', root)
  const lv = $('.ls-lv', root)
  const spark = $<HTMLCanvasElement>('.ls-spark', root)
  let logits = LESSON.map((l) => l[1])
  let hist: number[] = []
  const rows = LESSON.map(([w], i) => {
    const fill = h('i')
    const pv = h('span', { class: 'pv' })
    const r = h('div', { class: 'ls-row' + (i === 0 ? ' ok' : '') }, h('span', {}, w), h('span', { class: 'tr' }, fill), pv)
    rowsEl.append(r)
    return { fill, pv }
  })
  const draw = () => {
    const p = softmax(logits)
    rows.forEach((r, i) => {
      r.fill.style.width = p[i] * 100 + '%'
      r.pv.textContent = pct(p[i], 1)
    })
    const loss = -Math.log(p[0])
    lv.textContent = fmt(loss, 2)
    hist.push(loss)
    sparkline(spark, hist, '#ffb454', hist[0])
  }
  const step = () => {
    const p = softmax(logits)
    // gradient straty entropii krzyżowej względem logitów: p − y
    logits = logits.map((l, i) => l - 0.9 * (p[i] - (i === 0 ? 1 : 0)))
    draw()
  }
  $('.ls-step', root).addEventListener('click', step)
  $('.ls-ten', root).addEventListener('click', () => {
    let k = 0
    const t = setInterval(() => {
      step()
      if (++k >= 10) clearInterval(t)
    }, 90)
  })
  $('.ls-reset', root).addEventListener('click', () => {
    logits = LESSON.map((l) => l[1])
    hist = []
    draw()
  })
  draw()
}

/* ------------------------------------------------------------------ */
/* Krajobraz funkcji straty                                            */
/* ------------------------------------------------------------------ */

const f = (x: number, y: number) =>
  0.075 * (x * x + y * y) -
  1.35 * Math.exp(-((x - 1.4) ** 2 + (y - 1.1) ** 2) / 1.1) -
  0.85 * Math.exp(-((x + 1.9) ** 2 + (y + 1.3) ** 2) / 0.7) +
  0.32 * Math.sin(1.4 * x) * Math.cos(1.2 * y) +
  1.6
const grad = (x: number, y: number) => {
  const e = 1e-4
  return [(f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)]
}
const H = 1.15 // skala wysokości
const GLOBAL_MIN = (() => {
  let m = Infinity
  for (let x = -4; x <= 4; x += 0.02) for (let y = -4; y <= 4; y += 0.02) m = Math.min(m, f(x, y))
  return m
})()
const LIM = 4.2

const landVert = /* glsl */ `
  varying float vH;
  varying vec2 vXZ;
  void main() {
    vH = position.y;
    vXZ = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const landFrag = /* glsl */ `
  varying float vH;
  varying vec2 vXZ;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  void main() {
    float t = clamp(vH / 3.4, 0.0, 1.0);
    vec3 col = mix(uLow, uHigh, smoothstep(0.0, 1.0, t));
    // poziomice
    float c = abs(fract(vH * 4.0) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.06, c);
    // siatka
    vec2 g = abs(fract(vXZ * 1.25) - 0.5);
    float grid = 1.0 - smoothstep(0.0, 0.035, min(g.x, g.y));
    vec3 outc = col * 0.55 + line * col * 0.9 + grid * 0.06;
    float edge = smoothstep(4.2, 3.4, max(abs(vXZ.x), abs(vXZ.y)));
    gl_FragColor = vec4(outc, (0.35 + line * 0.6) * edge);
  }
`

function initLandscape() {
  const stage = $('.land-stage')
  const canvas = $<HTMLCanvasElement>('.land-canvas', stage)
  const lrIn = $<HTMLInputElement>('.land-lr', stage)
  const lrOut = $('.land-lr-out', stage)
  const goBtn = $('.land-go', stage)
  const chart = $<HTMLCanvasElement>('.land-chart', stage)
  const msg = $('.land-msg', stage)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(8.5, 8.6, 10.5)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enablePan = false
  controls.autoRotate = !reducedMotion
  controls.autoRotateSpeed = 0.35
  controls.maxPolarAngle = Math.PI * 0.45
  controls.target.set(0, 2.1, 0)
  if (window.matchMedia('(pointer: coarse)').matches) {
    controls.enableRotate = false
    canvas.style.touchAction = 'pan-y'
  }
  controls.addEventListener('start', () => (controls.autoRotate = false))

  const geo = new THREE.PlaneGeometry(LIM * 2, LIM * 2, 140, 140)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setY(i, f(pos.getX(i), pos.getZ(i)) * H)
  geo.computeVertexNormals()
  const mat = new THREE.ShaderMaterial({
    vertexShader: landVert,
    fragmentShader: landFrag,
    uniforms: { uLow: { value: new THREE.Color('#ffb454') }, uHigh: { value: new THREE.Color('#6a5cff') } },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  scene.add(new THREE.Mesh(geo, mat))

  // kulka + poświata
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
  const glowTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,220,160,1)')
    gr.addColorStop(0.3, 'rgba(255,180,84,.6)')
    gr.addColorStop(1, 'rgba(255,180,84,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  })()
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(1.3)
  scene.add(ball, glow)

  const MAXTRAIL = 400
  const trailPos = new Float32Array(MAXTRAIL * 3)
  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
  trailGeo.setDrawRange(0, 0)
  scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })))

  let px = 0
  let py = 0
  let n = 0
  let running = false
  let history: number[] = []
  let diverged = false

  const place = () => {
    const y = f(px, py) * H + 0.13
    ball.position.set(px, y, py)
    glow.position.copy(ball.position)
  }
  const pushTrail = () => {
    if (n >= MAXTRAIL) return
    trailPos.set([px, f(px, py) * H + 0.04, py], n * 3)
    n++
    trailGeo.setDrawRange(0, n)
    trailGeo.attributes.position.needsUpdate = true
  }
  const newStart = () => {
    const a = Math.random() * Math.PI * 2
    const r = 2.6 + Math.random() * 1.1
    px = Math.cos(a) * r
    py = Math.sin(a) * r
    n = 0
    history = [f(px, py)]
    diverged = false
    pushTrail()
    place()
    sparkline(chart, history, '#ffb454', 3.5)
    msg.innerHTML = 'Kliknij <b>Start</b> i patrz, jak kulka szuka najniższego punktu.'
  }
  const setRunning = (v: boolean) => {
    running = v
    goBtn.textContent = v ? '❚❚ Stop' : '▶ Start'
  }

  let acc = 0
  const stepGD = () => {
    const lr = Number(lrIn.value)
    const [gx, gy] = grad(px, py)
    px -= lr * gx
    py -= lr * gy
    if (Math.abs(px) > LIM || Math.abs(py) > LIM || !Number.isFinite(px)) {
      px = Math.max(-LIM, Math.min(LIM, px))
      py = Math.max(-LIM, Math.min(LIM, py))
      diverged = true
      setRunning(false)
      msg.innerHTML = '<b>Rozbieżność!</b> Krok był tak duży, że kulka wyleciała z krajobrazu. Zmniejsz go.'
    }
    pushTrail()
    history.push(f(px, py))
    sparkline(chart, history, '#ffb454', 3.5)
    const gn = Math.hypot(gx, gy)
    if (!diverged && gn < 0.004 && history.length > 5) {
      setRunning(false)
      const v = f(px, py)
      msg.innerHTML =
        v < GLOBAL_MIN + 0.05
          ? `<b>Najgłębsza dolina!</b> Strata: ${fmt(v, 2)} po ${history.length - 1} krokach.`
          : `<b>Utknęła w lokalnym dołku</b> (strata ${fmt(v, 2)}). Nie najgorzej, ale głębiej się da.`
    } else if (!diverged && history.length > 6) {
      const last = history.slice(-6)
      const osc = last.some((v, i) => i > 0 && v > last[i - 1] + 1e-3)
      msg.innerHTML = osc ? 'Kulka <b>skacze</b> po zboczach — krok jest za duży.' : `Krok ${history.length - 1}, strata ${fmt(history[history.length - 1], 2)}`
    }
  }

  goBtn.addEventListener('click', () => {
    if (diverged || n >= MAXTRAIL) newStart()
    setRunning(!running)
  })
  $('.land-new', stage).addEventListener('click', () => {
    newStart()
    setRunning(true)
  })
  lrIn.addEventListener('input', () => {
    lrOut.textContent = fmt(Number(lrIn.value), 3)
    syncRange(lrIn)
  })
  syncRange(lrIn)

  const resize = () => {
    const w = canvas.clientWidth
    const hh = canvas.clientHeight
    renderer.setSize(w, hh, false)
    camera.aspect = w / hh
    camera.fov = w < 600 ? 50 : 40
    // na szerokim ekranie przesuń kadr w prawo, żeby panel nie zasłaniał krajobrazu
    if (w > 640) camera.setViewOffset(w, hh, -170, 0, w, hh)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(stage)
  resize()

  let raf = 0
  let last = performance.now()
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (running) {
      acc += dt
      while (acc > 0.07) {
        acc -= 0.07
        if (running) stepGD()
      }
    }
    place()
    controls.update()
    renderer.render(scene, camera)
  }
  watchVisible(stage, (v) => {
    cancelAnimationFrame(raf)
    if (v) {
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
  })
  newStart()
}

export function initTraining() {
  initLesson()
  whenNear($('.land-stage'), initLandscape, '700px')
}
