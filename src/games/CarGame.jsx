import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playFlip, playPop } from '../utils/sounds'
import { createRide, jumpCar, updateRide } from './carLogic'

const COLORS = ['#7c3aed', '#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#f8fafc', '#ec4899', '#111827']
const WHEELS = [
  { id: 'normal', label: 'معمولی' },
  { id: 'big', label: 'بزرگ' },
  { id: 'monster', label: 'غول' },
]
const DECALS = [
  { id: 'plain', label: 'ساده' },
  { id: 'star', label: 'ستاره' },
  { id: 'stripe', label: 'خط' },
  { id: 'flame', label: 'شعله' },
]
const EXHAUSTS = [
  { id: 'calm', label: 'معمولی' },
  { id: 'fire', label: 'آتشی' },
]
const VEHICLES = [
  { id: 'bike', label: 'موتور' },
  { id: 'car', label: 'ماشین' },
  { id: 'tractor', label: 'تراکتور' },
]
const BODIES = [
  { id: 'pickup', label: 'وانت' },
  { id: 'sport', label: 'مسابقه' },
  { id: 'monster', label: 'هیولا' },
]

const defaultStyle = () => ({
  color: COLORS[0],
  wheel: 'monster',
  decal: 'star',
  exhaust: 'fire',
  body: 'monster',
  vehicle: 'car',
})

export default function CarGame() {
  const canvasRef = useRef(null)
  const previewRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const styleRef = useRef(defaultStyle())
  const fxRef = useRef([])
  const airRef = useRef(false)
  const rafRef = useRef(0)
  const [phase, setPhase] = useState('intro')
  const [style, setStyle] = useState(defaultStyle)
  const [hud, setHud] = useState({ score: 0, coins: 0 })

  const patch = (key, value) => {
    const next = { ...styleRef.current, [key]: value }
    styleRef.current = next
    setStyle(next)
  }

  const measure = () => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase === 'playing') return undefined
    const canvas = previewRef.current
    if (!canvas) return undefined
    const paint = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawShowroom(ctx, width, height, styleRef.current, performance.now() / 1000)
    }
    paint()
    const timer = window.setInterval(paint, 50)
    return () => window.clearInterval(timer)
  }, [phase, style])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createRide(styleRef.current)
    fxRef.current = []
    airRef.current = false
    measure()
    setHud({ score: 0, coins: 0 })
    let last = performance.now()
    let shown = -1
    const onResize = () => measure()
    const onKey = (event) => {
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w') {
        event.preventDefault()
        if (stateRef.current && jumpCar(stateRef.current)) playFlip()
      }
    }
    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const event = updateRide(state, dt)
        if (event === 'coin') playPop()
        if (state.y < -8) airRef.current = true
        else if (airRef.current && state.y === 0) {
          airRef.current = false
          puff(fxRef.current, 120, -6)
        }
        if (state.style.exhaust === 'fire' && Math.random() < 0.7) spark(fxRef.current, state.y)
        if (event === 'dead') {
          playCheer()
          setHud({ score: state.score, coins: state.coinsGot })
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== shown) {
          shown = state.score
          setHud({ score: state.score, coins: state.coinsGot })
        }
      }
      fxRef.current = stepFx(fxRef.current, dt)
      drawRace(canvasRef.current, state, fxRef.current)
      rafRef.current = requestAnimationFrame(paint)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [phase])

  const hop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (stateRef.current && jumpCar(stateRef.current)) playFlip()
  }

  return (
    <GameShell title="ماشین بازی" emoji="🏎️" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`car-game ${phase === 'playing' ? 'car-game--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">ماشین بازی</p>
            <canvas ref={previewRef} className="car-show" />
            <h2 className="level-panel__title">ماشینت را بساز و بران</h2>
            <p className="level-panel__meta">وسیله، بدنه، رنگ، چرخ، طرح و اگزوز</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('garage')}>
              ساخت ماشین
            </button>
          </div>
        )}

        {phase === 'garage' && (
          <div className="garage">
            <canvas ref={previewRef} className="car-show" />
            <p>وسیله</p>
            <div className="choice-row">
              {VEHICLES.map((item) => (
                <button key={item.id} type="button" className={style.vehicle === item.id ? 'on' : ''} onClick={() => patch('vehicle', item.id)}>{item.label}</button>
              ))}
            </div>
            <p>بدنه</p>
            <div className="choice-row">
              {BODIES.map((item) => (
                <button key={item.id} type="button" className={style.body === item.id ? 'on' : ''} onClick={() => patch('body', item.id)}>{item.label}</button>
              ))}
            </div>
            <p>رنگ بدنه</p>
            <div className="swatches">
              {COLORS.map((color) => (
                <button key={color} type="button" className={style.color === color ? 'on' : ''} style={{ background: color }} onClick={() => patch('color', color)} aria-label={color} />
              ))}
            </div>
            <p>چرخ</p>
            <div className="choice-row">
              {WHEELS.map((item) => (
                <button key={item.id} type="button" className={style.wheel === item.id ? 'on' : ''} onClick={() => patch('wheel', item.id)}>{item.label}</button>
              ))}
            </div>
            <p>طرح</p>
            <div className="choice-row">
              {DECALS.map((item) => (
                <button key={item.id} type="button" className={style.decal === item.id ? 'on' : ''} onClick={() => patch('decal', item.id)}>{item.label}</button>
              ))}
            </div>
            <p>اگزوز</p>
            <div className="choice-row">
              {EXHAUSTS.map((item) => (
                <button key={item.id} type="button" className={style.exhaust === item.id ? 'on' : ''} onClick={() => patch('exhaust', item.id)}>{item.label}</button>
              ))}
            </div>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع مسابقه
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef} onPointerDown={hop}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="snake-glass-hud">
              <div className="glass-chip">
                <span>سکه</span>
                <strong>{hud.coins}</strong>
              </div>
              <div className="glass-chip glass-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <button type="button" className="car-jump" onPointerDown={hop}>
              بپر
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
            <p className="level-panel__meta">سکه‌ها: {hud.coins}</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('garage')}>
              دوباره بساز
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawShowroom(ctx, width, height, style, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#1e293b')
  sky.addColorStop(0.55, '#334155')
  sky.addColorStop(1, '#0f172a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * 0.5, 10, 10, width * 0.5, 20, width * 0.55)
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.45)')
  glow.addColorStop(1, 'rgba(253, 224, 71, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#020617'
  ctx.fillRect(0, height * 0.72, width, height)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(0, height * 0.72, width, 3)
  drawTruck(ctx, width * 0.18, height * 0.74, width / 340, style, time, time * 80, 0)
}

function drawRace(canvas, state, fx) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const ground = height * 0.72
  const scale = width / 390
  const sky = ctx.createLinearGradient(0, 0, 0, ground)
  sky.addColorStop(0, '#fb7185')
  sky.addColorStop(0.35, '#fdba74')
  sky.addColorStop(1, '#fed7aa')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(width * 0.78, height * 0.16, 28 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 160 - state.dist * 0.12) % (width + 120)) - 50
    ctx.beginPath()
    ctx.ellipse(x, 48 * scale + (i % 3) * 22 * scale, 34 * scale, 12 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ridge(ctx, ground - 18, '#7c2d12', 0.05, state.dist, height * 0.2, width)
  ridge(ctx, ground - 2, '#c2410c', 0.12, state.dist, height * 0.1, width)

  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 180 - state.dist * 0.35) % (width + 100)) - 40
    drawCactus(ctx, x, ground - 4, scale * (0.8 + (i % 3) * 0.15))
  }

  ctx.fillStyle = '#44403c'
  ctx.fillRect(0, ground, width, height - ground)
  const curb = ctx.createLinearGradient(0, ground, 0, ground + 14 * scale)
  curb.addColorStop(0, '#a8a29e')
  curb.addColorStop(1, '#78716c')
  ctx.fillStyle = curb
  ctx.fillRect(0, ground, width, 10 * scale)
  ctx.fillStyle = '#facc15'
  const dash = 54 * scale
  for (let x = -((state.dist * 0.9) % dash); x < width; x += dash) {
    round(ctx, x, ground + 24 * scale, dash * 0.42, 6 * scale, 3)
    ctx.fill()
  }

  state.coins.forEach((coin) => drawCoin(ctx, coin.x * scale, ground + coin.y * scale, 11 * scale, state.time))
  state.obstacles.forEach((ob) => drawObstacle(ctx, ob, ground, scale))
  fx.forEach((bit) => {
    ctx.globalAlpha = Math.max(0, bit.life / bit.max)
    ctx.fillStyle = bit.color
    ctx.beginPath()
    ctx.arc(bit.x * scale, ground + bit.y * scale, bit.r * scale, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  const tilt = Math.max(-0.35, Math.min(0.4, state.vy / 900))
  drawTruck(ctx, 36 * scale, ground + state.y * scale, scale, state.style, state.time, state.dist, tilt)
}

function drawTruck(ctx, x, ground, scale, style, time, dist, tilt) {
  const s = scale
  const radius = (style.wheel === 'monster' ? 30 : style.wheel === 'big' ? 22 : 15) * s
  ctx.save()
  ctx.translate(x + 58 * s, ground)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)'
  ctx.beginPath()
  ctx.ellipse(10 * s, 2, radius * 2.3, 7 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(tilt)
  ctx.translate(0, -radius - 2 * s)

  const paint = ctx.createLinearGradient(0, -48 * s, 0, 18 * s)
  paint.addColorStop(0, shade(style.color, 70))
  paint.addColorStop(0.45, style.color)
  paint.addColorStop(1, shade(style.color, -50))

  if (style.vehicle === 'bike') {
    drawBike(ctx, s, style, time, dist, radius, paint)
    ctx.restore()
    return
  }
  if (style.vehicle === 'tractor') {
    drawTractor(ctx, s, style, time, dist, radius, paint)
    ctx.restore()
    return
  }

  drawCarBody(ctx, s, style, paint)
  paintDecal(ctx, s, style)

  const rear = style.body === 'sport' ? 4 * s : 2 * s
  const front = style.body === 'sport' ? 98 * s : 102 * s
  drawWheel(ctx, rear, 10 * s, radius, dist, style.wheel)
  drawWheel(ctx, front, 10 * s, radius, dist, style.wheel)
  drawExhaust(ctx, s, style, time, -20 * s, 2 * s)
  ctx.restore()
}

function drawCarBody(ctx, s, style, paint) {
  const chrome = ctx.createLinearGradient(0, -52 * s, 0, 20 * s)
  chrome.addColorStop(0, shade(style.color, 85))
  chrome.addColorStop(0.35, style.color)
  chrome.addColorStop(1, shade(style.color, -55))

  if (style.body === 'sport') {
    ctx.fillStyle = chrome
    round(ctx, -18 * s, -14 * s, 132 * s, 22 * s, 14 * s)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(18 * s, -14 * s)
    ctx.quadraticCurveTo(42 * s, -48 * s, 78 * s, -46 * s)
    ctx.quadraticCurveTo(98 * s, -44 * s, 108 * s, -14 * s)
    ctx.closePath()
    ctx.fill()
    const glass = ctx.createLinearGradient(40 * s, -44 * s, 40 * s, -18 * s)
    glass.addColorStop(0, 'rgba(226, 242, 254, 0.98)')
    glass.addColorStop(1, 'rgba(125, 211, 252, 0.75)')
    ctx.fillStyle = glass
    round(ctx, 42 * s, -40 * s, 48 * s, 16 * s, 6 * s)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    round(ctx, 100 * s, -10 * s, 10 * s, 6 * s, 2 * s)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    round(ctx, -8 * s, -12 * s, 70 * s, 4 * s, 2 * s)
    ctx.fill()
    return
  }

  if (style.body === 'pickup') {
    ctx.fillStyle = chrome
    round(ctx, -14 * s, -12 * s, 124 * s, 22 * s, 8 * s)
    ctx.fill()
    round(ctx, 42 * s, -44 * s, 50 * s, 34 * s, 8 * s)
    ctx.fill()
    ctx.fillStyle = 'rgba(226, 242, 254, 0.95)'
    round(ctx, 50 * s, -36 * s, 32 * s, 16 * s, 4 * s)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.strokeRect(-6 * s, -10 * s, 44 * s, 14 * s)
    ctx.fillStyle = shade(style.color, -40)
    round(ctx, -10 * s, -18 * s, 18 * s, 8 * s, 3 * s)
    ctx.fill()
    return
  }

  ctx.fillStyle = chrome
  round(ctx, -16 * s, -16 * s, 128 * s, 28 * s, 12 * s)
  ctx.fill()
  round(ctx, 30 * s, -52 * s, 62 * s, 40 * s, 14 * s)
  ctx.fill()
  const cabinGlass = ctx.createLinearGradient(42 * s, -48 * s, 42 * s, -18 * s)
  cabinGlass.addColorStop(0, 'rgba(241, 245, 249, 0.98)')
  cabinGlass.addColorStop(1, 'rgba(56, 189, 248, 0.7)')
  ctx.fillStyle = cabinGlass
  round(ctx, 42 * s, -44 * s, 38 * s, 20 * s, 7 * s)
  ctx.fill()
  ctx.fillStyle = shade(style.color, -25)
  round(ctx, 88 * s, -60 * s, 7 * s, 18 * s, 3 * s)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  round(ctx, -6 * s, -14 * s, 72 * s, 5 * s, 3 * s)
  ctx.fill()
  ctx.fillStyle = '#facc15'
  round(ctx, 104 * s, -8 * s, 8 * s, 5 * s, 2 * s)
  ctx.fill()
}

function drawBike(ctx, s, style, time, dist, radius, paint) {
  const wheel = Math.max(15 * s, radius * 0.7)
  const rearX = 0
  const frontX = 86 * s

  ctx.strokeStyle = shade(style.color, -55)
  ctx.lineWidth = Math.max(3, 4.5 * s)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(rearX + 8 * s, 4 * s)
  ctx.lineTo(34 * s, -8 * s)
  ctx.lineTo(58 * s, -10 * s)
  ctx.lineTo(frontX - 8 * s, 2 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(34 * s, -8 * s)
  ctx.lineTo(28 * s, -26 * s)
  ctx.lineTo(52 * s, -24 * s)
  ctx.stroke()

  ctx.fillStyle = paint
  round(ctx, 22 * s, -30 * s, 40 * s, 16 * s, 10 * s)
  ctx.fill()
  ctx.fillStyle = shade(style.color, 40)
  round(ctx, 28 * s, -34 * s, 28 * s, 8 * s, 6 * s)
  ctx.fill()

  ctx.fillStyle = '#0f172a'
  round(ctx, 36 * s, -22 * s, 20 * s, 7 * s, 4 * s)
  ctx.fill()

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = Math.max(2.5, 3.2 * s)
  ctx.beginPath()
  ctx.moveTo(frontX - 10 * s, -4 * s)
  ctx.lineTo(frontX - 2 * s, -36 * s)
  ctx.moveTo(frontX - 10 * s, -36 * s)
  ctx.lineTo(frontX + 14 * s, -30 * s)
  ctx.stroke()

  ctx.fillStyle = '#1e293b'
  round(ctx, frontX - 4 * s, -8 * s, 14 * s, 8 * s, 3 * s)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(frontX + 10 * s, -4 * s, 3.2 * s, 0, Math.PI * 2)
  ctx.fill()

  if (style.decal === 'star') {
    ctx.fillStyle = '#fde68a'
    star(ctx, 34 * s, -22 * s, 5 * s)
  } else if (style.decal === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(24 * s, -24 * s, 34 * s, 3 * s)
  } else if (style.decal === 'flame') {
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.moveTo(22 * s, -18 * s)
    ctx.quadraticCurveTo(36 * s, -32 * s, 50 * s, -18 * s)
    ctx.fill()
  }

  drawWheel(ctx, rearX, 10 * s, wheel, dist, style.wheel)
  drawWheel(ctx, frontX, 10 * s, wheel, dist, style.wheel)
  drawExhaust(ctx, s, style, time, rearX - 16 * s, 2 * s)
}

function drawTractor(ctx, s, style, time, dist, radius, paint) {
  const rear = Math.max(radius, 28 * s)
  const front = Math.max(13 * s, rear * 0.45)
  const rearX = 10 * s
  const frontX = 102 * s

  ctx.fillStyle = paint
  round(ctx, -4 * s, -14 * s, 112 * s, 24 * s, 8 * s)
  ctx.fill()

  round(ctx, rearX - 10 * s, -54 * s, 52 * s, 42 * s, 10 * s)
  ctx.fill()
  const glass = ctx.createLinearGradient(rearX, -48 * s, rearX, -18 * s)
  glass.addColorStop(0, 'rgba(241, 245, 249, 0.98)')
  glass.addColorStop(1, 'rgba(56, 189, 248, 0.72)')
  ctx.fillStyle = glass
  round(ctx, rearX - 2 * s, -46 * s, 34 * s, 20 * s, 5 * s)
  ctx.fill()

  ctx.fillStyle = shade(style.color, -30)
  round(ctx, frontX - 8 * s, -40 * s, 10 * s, 28 * s, 3 * s)
  ctx.fill()
  ctx.fillStyle = '#334155'
  round(ctx, frontX - 10 * s, -44 * s, 14 * s, 6 * s, 2 * s)
  ctx.fill()

  ctx.fillStyle = shade(style.color, -45)
  round(ctx, frontX - 18 * s, -10 * s, 28 * s, 10 * s, 3 * s)
  ctx.fill()

  if (style.decal === 'star') {
    ctx.fillStyle = '#fde68a'
    star(ctx, rearX + 18 * s, -8 * s, 6 * s)
  } else if (style.decal === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(4 * s, -6 * s, 90 * s, 4 * s)
  } else if (style.decal === 'flame') {
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.moveTo(8 * s, 0)
    ctx.quadraticCurveTo(36 * s, -18 * s, 58 * s, 0)
    ctx.fill()
  }

  drawWheel(ctx, rearX, 12 * s, rear, dist, 'monster')
  drawWheel(ctx, frontX, 16 * s, front, dist, style.wheel)
  drawExhaust(ctx, s, style, time, frontX - 4 * s, -52 * s)
}

function drawExhaust(ctx, s, style, time, x, y) {
  const upright = y < -20 * s
  if (style.exhaust === 'fire') {
    const flicker = (10 + Math.sin(time * 28) * 6) * s
    if (upright) {
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 4 * s, y - flicker)
      ctx.lineTo(x + 8 * s, y - flicker * 0.6)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.moveTo(x + 2 * s, y)
      ctx.lineTo(x + 1 * s, y - flicker * 0.55)
      ctx.lineTo(x + 6 * s, y - flicker * 0.35)
      ctx.fill()
      return
    }
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - flicker, y + 4 * s)
    ctx.lineTo(x + 6 * s, y + 8 * s)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.moveTo(x + 2 * s, y + 2 * s)
    ctx.lineTo(x - flicker * 0.5, y + 5 * s)
    ctx.lineTo(x + 5 * s, y + 7 * s)
    ctx.fill()
    return
  }
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)'
  if (upright) ctx.fillRect(x, y, 5 * s, 10 * s)
  else ctx.fillRect(x, y, 10 * s, 4 * s)
}

function paintDecal(ctx, s, style) {
  if (style.decal === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.fillRect(-16 * s, -6 * s, 120 * s, 5 * s)
  } else if (style.decal === 'star') {
    ctx.fillStyle = '#fde68a'
    star(ctx, 8 * s, -2 * s, 7 * s)
    star(ctx, 28 * s, -2 * s, 5 * s)
  } else if (style.decal === 'flame') {
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.moveTo(-8 * s, 4 * s)
    ctx.quadraticCurveTo(16 * s, -16 * s, 40 * s, 4 * s)
    ctx.quadraticCurveTo(18 * s, -2 * s, -8 * s, 4 * s)
    ctx.fill()
    ctx.fillStyle = '#fdba74'
    ctx.beginPath()
    ctx.moveTo(0, 4 * s)
    ctx.quadraticCurveTo(16 * s, -8 * s, 28 * s, 4 * s)
    ctx.fill()
  }
}

function drawWheel(ctx, x, y, radius, dist, wheel) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(dist / Math.max(12, radius))
  ctx.strokeStyle = wheel === 'monster' ? '#7dd3fc' : '#e2e8f0'
  ctx.lineWidth = Math.max(2, radius * 0.12)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate((Math.PI * 2) / 5)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(radius * 0.62, 0)
    ctx.stroke()
  }
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawObstacle(ctx, ob, ground, scale) {
  const x = ob.x * scale
  const h = ob.h * scale
  const w = ob.w * scale
  const y = ground - h
  if (ob.kind === 'rock') {
    ctx.fillStyle = '#78716c'
    ctx.beginPath()
    ctx.moveTo(x, ground)
    ctx.lineTo(x + w * 0.2, y + h * 0.2)
    ctx.lineTo(x + w * 0.55, y)
    ctx.lineTo(x + w, ground)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.3, y + h * 0.45)
    ctx.lineTo(x + w * 0.55, y + 4)
    ctx.lineTo(x + w * 0.7, y + h * 0.5)
    ctx.fill()
    return
  }
  if (ob.kind === 'barrier') {
    ctx.fillStyle = '#f8fafc'
    round(ctx, x, y, w, h, 4)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    for (let i = 0; i < 4; i += 1) ctx.fillRect(x, y + i * (h / 4), w, h / 8)
    return
  }
  const wood = ctx.createLinearGradient(x, y, x, ground)
  wood.addColorStop(0, '#fbbf24')
  wood.addColorStop(1, '#b45309')
  ctx.fillStyle = wood
  round(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 6, y + 6)
  ctx.lineTo(x + w - 6, ground - 6)
  ctx.moveTo(x + w - 6, y + 6)
  ctx.lineTo(x + 6, ground - 6)
  ctx.stroke()
}

function drawCoin(ctx, x, y, r, time) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(0.55 + Math.abs(Math.sin(time * 6 + x)) * 0.45, 1)
  const gold = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r)
  gold.addColorStop(0, '#fef9c3')
  gold.addColorStop(0.6, '#facc15')
  gold.addColorStop(1, '#d97706')
  ctx.fillStyle = gold
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCactus(ctx, x, ground, scale) {
  ctx.fillStyle = '#166534'
  round(ctx, x, ground - 48 * scale, 10 * scale, 48 * scale, 4 * scale)
  ctx.fill()
  round(ctx, x - 12 * scale, ground - 34 * scale, 14 * scale, 8 * scale, 4 * scale)
  ctx.fill()
  round(ctx, x + 8 * scale, ground - 42 * scale, 14 * scale, 8 * scale, 4 * scale)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  round(ctx, x + 2 * scale, ground - 46 * scale, 4 * scale, 20 * scale, 2 * scale)
  ctx.fill()
}

function ridge(ctx, base, color, speed, dist, amp, width) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, base)
  for (let x = 0; x <= width; x += 10) {
    const y = base - amp * 0.45 - Math.sin((x + dist * speed) * 0.012) * amp * 0.35
    ctx.lineTo(x, y)
  }
  ctx.lineTo(width, base + 30)
  ctx.lineTo(0, base + 30)
  ctx.fill()
}

function star(ctx, x, y, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.4
    const angle = -Math.PI / 2 + i * (Math.PI / 5)
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
}

function puff(list, x, y) {
  for (let i = 0; i < 8; i += 1) {
    list.push({
      x: x + Math.random() * 30,
      y,
      vx: -40 - Math.random() * 40,
      vy: -10,
      r: 3 + Math.random() * 4,
      life: 0.35,
      max: 0.35,
      color: '#fed7aa',
    })
  }
}

function spark(list, y) {
  list.push({
    x: 78,
    y: y - 8,
    vx: -80,
    vy: (Math.random() - 0.4) * 40,
    r: 2,
    life: 0.25,
    max: 0.25,
    color: Math.random() > 0.5 ? '#fb923c' : '#fde68a',
  })
}

function stepFx(list, dt) {
  return list
    .map((bit) => ({ ...bit, x: bit.x + bit.vx * dt, y: bit.y + bit.vy * dt, life: bit.life - dt }))
    .filter((bit) => bit.life > 0)
    .slice(-80)
}

function shade(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (shift) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount))
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

function round(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
