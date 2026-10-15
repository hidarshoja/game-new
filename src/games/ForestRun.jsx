import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { createForest, steerForest, updateForest } from './forestLogic'
import { playCheer, playFlip, playPop } from '../utils/sounds'

function project(width, height, lane, z) {
  const near = 1 / (1 + z * 0.16)
  const y = height * 0.18 + height * 0.5 * near
  const spread = width * 0.34 * near
  return { x: width / 2 + (lane - 1) * spread, y, s: 0.28 + near, near }
}

export default function ForestRun() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const swipeRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState({ score: 0, fruits: 0 })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createForest()
    setHud({ score: 0, fruits: 0 })
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const measure = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    measure()
    let last = performance.now()
    let shown = -1

    const act = (action) => {
      if (steerForest(stateRef.current, action)) playFlip()
    }
    const onKey = (event) => {
      const map = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ArrowDown: 'slide', s: 'slide', ' ': 'jump' }
      const action = map[event.key] || map[event.key.toLowerCase()]
      if (action) {
        event.preventDefault()
        act(action)
      }
    }
    const onDown = (event) => {
      const point = event.touches?.[0] || event
      swipeRef.current = { x: point.clientX, y: point.clientY }
    }
    const onUp = (event) => {
      const start = swipeRef.current
      if (!start) return
      const point = event.changedTouches?.[0] || event
      const dx = point.clientX - start.x
      const dy = point.clientY - start.y
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) act(dx < 0 ? 'left' : 'right')
      else if (Math.abs(dy) > 28) act(dy < 0 ? 'jump' : 'slide')
      swipeRef.current = null
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const result = updateForest(state, dt)
        if (result.picked) playPop()
        if (result.eaten) playFlip()
        if (result.died) {
          playCheer()
          setHud({ score: state.score, fruits: state.fruitsGot })
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== shown) {
          shown = state.score
          setHud({ score: state.score, fruits: state.fruitsGot })
        }
      }
      drawForest(canvas, state)
      rafRef.current = requestAnimationFrame(paint)
    }

    window.addEventListener('keydown', onKey)
    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointerup', onUp)
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  return (
    <GameShell title="فرار در جنگل" emoji="🌲" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`forest ${phase === 'playing' ? 'forest--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">فرار در جنگل</p>
            <div className="forest-intro" aria-hidden="true">🌲 🍎 🐻</div>
            <h2 className="level-panel__title">میوه بخور، از حیوان‌ها فرار کن</h2>
            <p className="level-panel__meta">چپ و راست برو، بپر یا خم شو</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع بازی
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="star-hud forest-hud">
              <div className="star-hud__chip"><span>میوه</span><strong>{hud.fruits}</strong></div>
              <div className="star-hud__chip"><span>امتیاز</span><strong>{hud.score}</strong></div>
            </div>
            <div className="snake-glass-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" onPointerDown={() => steerForest(stateRef.current, 'left') && playFlip()} aria-label="چپ">◀</button>
              <div className="snake-glass-pad__col">
                <button type="button" className="glass-btn" onPointerDown={() => steerForest(stateRef.current, 'jump') && playFlip()} aria-label="بپر">▲</button>
                <button type="button" className="glass-btn" onPointerDown={() => steerForest(stateRef.current, 'slide') && playFlip()} aria-label="خم شو">▼</button>
              </div>
              <button type="button" className="glass-btn glass-btn--side" onPointerDown={() => steerForest(stateRef.current, 'right') && playFlip()} aria-label="راست">▶</button>
            </div>
          </div>
        )}
        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
            <p className="level-panel__meta">میوه‌ها: {hud.fruits}</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              دوباره بدو
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawForest(canvas, state) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = width / dpr
  const h = height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#86efac')
  sky.addColorStop(0.45, '#4ade80')
  sky.addColorStop(1, '#166534')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 8; i += 1) {
    const z = 2 + i * 1.8
    const left = project(w, h, -0.35, z)
    const right = project(w, h, 2.35, z)
    ctx.fillStyle = i % 2 ? '#14532d' : '#166534'
    ctx.beginPath()
    ctx.moveTo(left.x - 40 * left.s, left.y)
    ctx.lineTo(left.x + 10 * left.s, left.y - 70 * left.s)
    ctx.lineTo(left.x + 50 * left.s, left.y)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(right.x + 40 * right.s, right.y)
    ctx.lineTo(right.x - 10 * right.s, right.y - 70 * right.s)
    ctx.lineTo(right.x - 50 * right.s, right.y)
    ctx.fill()
  }

  const far = project(w, h, 1, 16)
  const nearL = project(w, h, -0.15, 0)
  const nearR = project(w, h, 2.15, 0)
  ctx.beginPath()
  ctx.moveTo(far.x, far.y)
  ctx.lineTo(nearL.x, h)
  ctx.lineTo(nearR.x, h)
  ctx.closePath()
  const path = ctx.createLinearGradient(0, far.y, 0, h)
  path.addColorStop(0, '#a3e635')
  path.addColorStop(1, '#65a30d')
  ctx.fillStyle = path
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.setLineDash([18, 16])
  ctx.beginPath()
  ctx.moveTo(project(w, h, 0.5, 14).x, project(w, h, 0.5, 14).y)
  ctx.lineTo(project(w, h, 0.5, 0).x, h)
  ctx.moveTo(project(w, h, 1.5, 14).x, project(w, h, 1.5, 14).y)
  ctx.lineTo(project(w, h, 1.5, 0).x, h)
  ctx.stroke()
  ctx.setLineDash([])

  const items = [
    ...state.fruits.map((item) => ({ ...item, kind: 'fruit' })),
    ...state.obstacles.map((item) => ({ ...item, kind: 'animal' })),
  ].sort((a, b) => b.z - a.z)

  for (const item of items) {
    const p = project(w, h, item.lane, item.z)
    if (item.kind === 'fruit') {
      const size = 30 * p.s
      ctx.font = `${Math.max(18, size)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.emoji, p.x, p.y)
    } else {
      drawHungryAnimal(ctx, p, item, state)
    }
  }

  // بالاتر از دکمه‌ها؛ هنگام بلعیده شدن داخل دهان حیوان می‌رود
  if (!state.eaten) {
    const hero = project(w, h, state.visualLane, 0.42)
    drawSkater(ctx, hero, state)
  } else {
    const eatP = project(w, h, state.eaten.lane, 0.32)
    const progress = Math.min(1, state.eaten.t / 0.85)
    drawSkaterBeingEaten(ctx, eatP, state, progress)
  }
}

function drawHungryAnimal(ctx, p, animal, state) {
  const s = Math.max(38, p.s * 78)
  const lift = animal.type === 'high' ? s * 0.55 : 0
  const x = p.x
  const y = p.y - lift
  const eating = state.eaten && state.eaten.ob === animal
  const jaw = eating
    ? 0.15 + Math.min(1, state.eaten.t / 0.4) * 0.85
    : Math.max(0.45, animal.chomp ?? 0.5)
  const body = animal.color || '#5c3d1e'
  const mouth = animal.mouth || '#7f1d1d'

  ctx.save()
  ctx.translate(x, y)

  // بدن بزرگ‌تر
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, s * 0.08, s * 0.72, s * 0.58, 0, 0, Math.PI * 2)
  ctx.fill()

  // گوش‌ها
  ctx.beginPath()
  ctx.ellipse(-s * 0.48, -s * 0.42, s * 0.18, s * 0.22, -0.4, 0, Math.PI * 2)
  ctx.ellipse(s * 0.48, -s * 0.42, s * 0.18, s * 0.22, 0.4, 0, Math.PI * 2)
  ctx.fill()

  // چشم‌ها
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-s * 0.28, -s * 0.18, s * 0.16, 0, Math.PI * 2)
  ctx.arc(s * 0.28, -s * 0.18, s * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(-s * 0.24, -s * 0.16, s * 0.08, 0, Math.PI * 2)
  ctx.arc(s * 0.32, -s * 0.16, s * 0.08, 0, Math.PI * 2)
  ctx.fill()

  // دهان باز بزرگ
  const open = s * (0.22 + jaw * 0.38)
  ctx.fillStyle = mouth
  ctx.beginPath()
  ctx.ellipse(0, s * 0.22, s * 0.42, open, 0, 0, Math.PI * 2)
  ctx.fill()

  // دندان‌ها
  ctx.fillStyle = '#fef3c7'
  const teeth = 5
  for (let i = 0; i < teeth; i += 1) {
    const tx = -s * 0.28 + (i / (teeth - 1)) * s * 0.56
    ctx.beginPath()
    ctx.moveTo(tx - s * 0.05, s * 0.22 - open * 0.85)
    ctx.lineTo(tx, s * 0.22 - open * 0.35)
    ctx.lineTo(tx + s * 0.05, s * 0.22 - open * 0.85)
    ctx.closePath()
    ctx.fill()
  }

  // زبان
  ctx.fillStyle = '#fb7185'
  ctx.beginPath()
  ctx.ellipse(0, s * 0.22 + open * 0.25, s * 0.16, open * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()

  // شکلک کوچک بالای سر برای تشخیص نوع
  ctx.font = `${Math.max(14, s * 0.38)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(animal.emoji, 0, -s * 0.72)

  ctx.restore()
}

function drawSkaterBeingEaten(ctx, p, state, progress) {
  const s = Math.max(40, p.s * 88) * (1 - progress * 0.72)
  const x = p.x
  const y = p.y - s * 0.05 + progress * s * 0.55
  ctx.save()
  ctx.globalAlpha = Math.max(0.15, 1 - progress * 0.85)
  ctx.translate(x, y)
  ctx.scale(1 - progress * 0.35, 1 - progress * 0.55)
  // آدمک کوچک که به سمت دهان می‌رود
  ctx.fillStyle = '#fb923c'
  roundRect(ctx, -s * 0.16, -s * 0.28, s * 0.32, s * 0.3, 8)
  ctx.fill()
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(0, -s * 0.42, s * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(-s * 0.05, -s * 0.44, s * 0.02, 0, Math.PI * 2)
  ctx.arc(s * 0.05, -s * 0.44, s * 0.02, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawSkater(ctx, p, state) {
  const s = Math.max(52, p.s * 92)
  const jump = state.jump * s * 1.1
  const slide = state.slide > 0
  const run = state.time * 10.5
  const bob = slide ? 0 : Math.sin(run) * s * 0.03
  const step = slide ? 0 : Math.sin(run)
  const x = p.x
  const groundY = p.y - s * 0.06
  const y = groundY - jump + bob

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.34)'
  ctx.beginPath()
  ctx.ellipse(x, groundY + s * 0.48, s * (slide ? 0.7 : 0.55), s * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(x, y)
  if (slide) ctx.scale(1.16, 0.55)

  // اسکیت‌بورد بزرگ و مشخص
  ctx.fillStyle = '#312e81'
  roundRect(ctx, -s * 0.58, s * 0.32, s * 1.16, s * 0.13, 10)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  roundRect(ctx, -s * 0.38, s * 0.345, s * 0.76, s * 0.07, 5)
  ctx.fill()
  ctx.fillStyle = '#64748b'
  ctx.fillRect(-s * 0.36, s * 0.4, s * 0.12, s * 0.045)
  ctx.fillRect(s * 0.24, s * 0.4, s * 0.12, s * 0.045)
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-s * 0.34, s * 0.5, s * 0.1, 0, Math.PI * 2)
  ctx.arc(s * 0.34, s * 0.5, s * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.arc(-s * 0.34, s * 0.5, s * 0.04, 0, Math.PI * 2)
  ctx.arc(s * 0.34, s * 0.5, s * 0.04, 0, Math.PI * 2)
  ctx.fill()

  // پاها — یکی جلو یکی عقب مثل راه رفتن روی اسکیت
  const front = step * s * 0.14
  const back = -step * s * 0.14
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = Math.max(6, s * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-s * 0.06, s * 0.02)
  ctx.lineTo(-s * 0.1 + front * 0.3, s * 0.14)
  ctx.lineTo(-s * 0.22 + front, s * 0.28)
  ctx.moveTo(s * 0.08, s * 0.02)
  ctx.lineTo(s * 0.14 + back * 0.25, s * 0.15)
  ctx.lineTo(s * 0.26 + back, s * 0.28)
  ctx.stroke()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(-s * 0.24 + front, s * 0.3, s * 0.13, s * 0.055, 0.35, 0, Math.PI * 2)
  ctx.ellipse(s * 0.28 + back, s * 0.3, s * 0.13, s * 0.055, -0.2, 0, Math.PI * 2)
  ctx.fill()

  // شلوار / لگن
  ctx.fillStyle = '#1d4ed8'
  roundRect(ctx, -s * 0.16, -s * 0.04, s * 0.32, s * 0.14, 8)
  ctx.fill()

  // بالاتنه
  const shirt = ctx.createLinearGradient(-s * 0.18, -s * 0.42, s * 0.18, s * 0.02)
  shirt.addColorStop(0, '#fb923c')
  shirt.addColorStop(1, '#9a3412')
  ctx.fillStyle = shirt
  roundRect(ctx, -s * 0.18, -s * 0.4, s * 0.36, s * 0.4, 10)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  roundRect(ctx, -s * 0.07, -s * 0.3, s * 0.14, s * 0.16, 3)
  ctx.fill()

  // دست‌ها در حال تاب خوردن
  const arm = step * s * 0.2
  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = Math.max(5, s * 0.095)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-s * 0.16, -s * 0.3)
  ctx.quadraticCurveTo(-s * 0.38, -s * 0.12 + arm, -s * 0.3, s * 0.04 + arm * 0.4)
  ctx.moveTo(s * 0.16, -s * 0.3)
  ctx.quadraticCurveTo(s * 0.4, -s * 0.14 - arm, s * 0.32, s * 0.02 - arm * 0.4)
  ctx.stroke()
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(-s * 0.3, s * 0.04 + arm * 0.4, s * 0.06, 0, Math.PI * 2)
  ctx.arc(s * 0.32, s * 0.02 - arm * 0.4, s * 0.06, 0, Math.PI * 2)
  ctx.fill()

  // گردن
  ctx.fillStyle = '#e8a86a'
  ctx.fillRect(-s * 0.05, -s * 0.48, s * 0.1, s * 0.1)

  // سر (نسبت انسانی‌تر، بدون عینک بامزه)
  const face = ctx.createRadialGradient(-s * 0.04, -s * 0.58, 2, 0, -s * 0.54, s * 0.18)
  face.addColorStop(0, '#ffe4c4')
  face.addColorStop(1, '#d97706')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.arc(0, -s * 0.56, s * 0.155, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.66, s * 0.15, s * 0.09, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-s * 0.14, -s * 0.58)
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.48, -s * 0.1, -s * 0.46)
  ctx.quadraticCurveTo(-s * 0.06, -s * 0.56, -s * 0.14, -s * 0.58)
  ctx.fill()

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(-s * 0.05, -s * 0.57, s * 0.022, 0, Math.PI * 2)
  ctx.arc(s * 0.05, -s * 0.57, s * 0.022, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = Math.max(1.5, s * 0.02)
  ctx.beginPath()
  ctx.arc(0, -s * 0.5, s * 0.045, 0.25, Math.PI - 0.25)
  ctx.stroke()

  ctx.restore()
}
