import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playFlip, playPop } from '../utils/sounds'
import { createRide, jumpCar, updateRide } from './carLogic'

const COLORS = ['#7c3aed', '#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#f8fafc']
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

const defaultStyle = () => ({
  color: COLORS[0],
  wheel: 'monster',
  decal: 'star',
  exhaust: 'fire',
})

export default function CarGame() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const styleRef = useRef(defaultStyle())
  const rafRef = useRef(0)
  const [phase, setPhase] = useState('intro')
  const [style, setStyle] = useState(defaultStyle)
  const [hud, setHud] = useState({ score: 0, coins: 0 })

  const patch = (key, value) => {
    const next = { ...styleRef.current, [key]: value }
    styleRef.current = next
    setStyle(next)
  }

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const ground = height * 0.72
    const scale = width / 390

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#fb923c')
    sky.addColorStop(0.45, '#fdba74')
    sky.addColorStop(1, '#7c2d12')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 140 - state.dist * 0.15) % (width + 80)) - 40
      ctx.beginPath()
      ctx.ellipse(x, 70 + i * 18, 36, 16, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#9a3412'
    ctx.fillRect(0, ground, width, height - ground)
    ctx.fillStyle = '#facc15'
    const dash = 48 * scale
    for (let x = -((state.dist * 0.8) % dash); x < width; x += dash) {
      ctx.fillRect(x, ground + 18, dash * 0.45, 6)
    }

    state.coins.forEach((coin) => {
      drawCoin(ctx, coin.x * scale, ground + coin.y * scale, 12 * scale)
    })
    state.obstacles.forEach((ob) => {
      drawCrate(ctx, ob.x * scale, ground - ob.h * scale, ob.w * scale, ob.h * scale)
    })
    drawCar(ctx, 92 * scale, ground + state.y * scale, scale, state.style, state.time)
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
    if (phase !== 'playing') return undefined
    stateRef.current = createRide(styleRef.current)
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
      draw()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const hop = (event) => {
    event.preventDefault()
    if (stateRef.current && jumpCar(stateRef.current)) playFlip()
  }

  return (
    <GameShell title="ماشین بازی" emoji="🏎️" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`car-game ${phase === 'playing' ? 'car-game--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">ماشین بازی</p>
            <div className="car-preview" style={{ '--car': style.color }} aria-hidden="true" />
            <h2 className="level-panel__title">ماشینت را بساز و بران</h2>
            <p className="level-panel__meta">رنگ، چرخ، طرح و اگزوز را انتخاب کن</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('garage')}>
              ساخت ماشین
            </button>
          </div>
        )}

        {phase === 'garage' && (
          <div className="garage">
            <div className="car-stage" aria-hidden="true">
              <div className={`css-car css-car--${style.wheel} css-car--${style.decal}`} style={{ '--car': style.color }}>
                {style.exhaust === 'fire' ? <i /> : null}
              </div>
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

function drawCar(ctx, x, ground, scale, style, time) {
  const wheel = style.wheel === 'monster' ? 22 : style.wheel === 'big' ? 16 : 12
  const bodyH = 28 * scale
  const bodyW = 78 * scale
  const y = ground - wheel * scale - bodyH * 0.2
  ctx.save()
  ctx.translate(x, y)
  if (style.exhaust === 'fire') {
    const flicker = 8 + Math.sin(time * 30) * 4
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(-6, bodyH * 0.45)
    ctx.lineTo(-6 - flicker * scale, bodyH * 0.55)
    ctx.lineTo(-2, bodyH * 0.7)
    ctx.fill()
  }
  ctx.fillStyle = style.color
  round(ctx, 0, 0, bodyW, bodyH, 10 * scale)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  round(ctx, bodyW * 0.45, 4 * scale, bodyW * 0.28, bodyH * 0.42, 6)
  ctx.fill()
  if (style.decal === 'star') {
    ctx.fillStyle = '#fde68a'
    ctx.font = `${14 * scale}px sans-serif`
    ctx.fillText('★', bodyW * 0.2, bodyH * 0.65)
  } else if (style.decal === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(0, bodyH * 0.4, bodyW, 5 * scale)
  } else if (style.decal === 'flame') {
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.moveTo(bodyW * 0.15, bodyH * 0.7)
    ctx.lineTo(bodyW * 0.4, bodyH * 0.2)
    ctx.lineTo(bodyW * 0.5, bodyH * 0.7)
    ctx.fill()
  }
  const r = wheel * scale
  ;[bodyW * 0.22, bodyW * 0.75].forEach((wx) => {
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(wx, bodyH * 0.85, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7dd3fc'
    ctx.beginPath()
    ctx.arc(wx, bodyH * 0.85, r * 0.45, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

function drawCrate(ctx, x, y, w, h) {
  ctx.fillStyle = '#b45309'
  round(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8)
}

function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
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
