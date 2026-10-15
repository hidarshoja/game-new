import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { COLS, PRIZES, addBrickRow, createStarRally } from './starPaddleLogic'
import { playCheer, playFlip, playPop } from '../utils/sounds'

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

export default function StarPaddle() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const worldRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const pointerRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState({ score: 0, wave: 1 })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const measure = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      return { w: rect.width, h: rect.height }
    }
    const size = measure()
    const world = createStarRally()
    world.paddleX = size.w / 2
    world.balls = [{ x: size.w / 2, y: size.h * 0.72, vx: 180, vy: -280 }]
    worldRef.current = world
    setHud({ score: 0, wave: 1 })
    let last = performance.now()
    let shown = -1

    const onPointer = (event) => {
      const rect = wrap.getBoundingClientRect()
      const x = (event.clientX ?? event.touches?.[0]?.clientX ?? 0) - rect.left
      pointerRef.current = x
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const rect = wrap.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const state = worldRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        step(state, dt, w, h, pointerRef.current)
        if (!state.alive) {
          playCheer()
          setHud({ score: state.score, wave: state.wave })
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== shown) {
          shown = state.score
          setHud({ score: state.score, wave: state.wave })
        }
      }
      draw(canvas, state, w, h)
      rafRef.current = requestAnimationFrame(paint)
    }

    wrap.addEventListener('pointermove', onPointer)
    wrap.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      wrap.removeEventListener('pointermove', onPointer)
      wrap.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  return (
    <GameShell title="توپ ستاره‌ای" emoji="⭐" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`star-pad ${phase === 'playing' ? 'star-pad--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">توپ و راکت</p>
            <div className="star-intro" aria-hidden="true">🏓 ⭐</div>
            <h2 className="level-panel__title">آجرها را بشکن و جایزه بگیر</h2>
            <p className="level-panel__meta">راکت را با انگشت حرکت بده. جایزه فقط با راکت گرفته می‌شود.</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع بازی
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="snake-glass-hud">
              <div className="glass-chip"><span>موج</span><strong>{hud.wave}</strong></div>
              <div className="glass-chip glass-chip--score"><span>امتیاز</span><strong>{hud.score}</strong></div>
            </div>
          </div>
        )}
        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function step(state, dt, w, h, pointerX) {
  const target = pointerX == null ? state.paddleX : pointerX
  state.paddleX += (target - state.paddleX) * Math.min(1, dt * 14)
  state.paddleX = Math.max(state.paddleW / 2 + 8, Math.min(w - state.paddleW / 2 - 8, state.paddleX))
  if (state.fire > 0) state.fire -= dt
  state.spawn -= dt
  state.rowTimer -= dt
  if (state.spawn <= 0) {
    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)]
    state.prizes.push({ ...prize, x: 40 + Math.random() * (w - 80), y: -20, got: false })
    state.spawn = 2.2 + Math.random() * 1.4
  }
  if (state.rowTimer <= 0) {
    addBrickRow(state)
    state.rowTimer = Math.max(7.5, 12 - state.wave * 0.15)
  }

  const gap = 6
  const pad = 14
  const cellW = (w - pad * 2 - gap * (COLS - 1)) / COLS
  const cellH = 28
  const top = 18

  for (const prize of state.prizes) {
    prize.y += 140 * dt
    const py = h - 36
    if (!prize.got && prize.y > py - 18 && prize.y < py + 10 && Math.abs(prize.x - state.paddleX) < state.paddleW / 2 + 12) {
      prize.got = true
      applyPrize(state, prize.id)
      playFlip()
    }
  }
  state.prizes = state.prizes.filter((p) => !p.got && p.y < h + 30)

  for (const ball of state.balls) {
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    if (ball.x < 10 || ball.x > w - 10) ball.vx *= -1
    if (ball.y < 10) ball.vy = Math.abs(ball.vy)
    const py = h - 36
    if (ball.y > py - 10 && ball.y < py + 8 && Math.abs(ball.x - state.paddleX) < state.paddleW / 2 + 6 && ball.vy > 0) {
      const hit = (ball.x - state.paddleX) / (state.paddleW / 2)
      ball.vx = hit * 260
      ball.vy = -Math.abs(ball.vy)
      const speed = Math.min(420, Math.hypot(ball.vx, ball.vy) * 1.02)
      const mag = Math.hypot(ball.vx, ball.vy) || 1
      ball.vx = (ball.vx / mag) * speed
      ball.vy = (ball.vy / mag) * speed
    }
    for (const brick of state.bricks) {
      const bx = pad + brick.col * (cellW + gap)
      const by = top + brick.row * (cellH + gap)
      if (ball.x > bx && ball.x < bx + cellW && ball.y > by && ball.y < by + cellH) {
        brick.hp -= state.fire > 0 ? 2 : 1
        ball.vy *= -1
        if (brick.hp <= 0) {
          state.score += 10
          playPop()
        }
        break
      }
    }
  }
  state.bricks = state.bricks.filter((b) => b.hp > 0)
  state.balls = state.balls.filter((b) => b.y < h + 20)
  if (state.balls.length === 0) state.alive = false
  if (state.bricks.some((b) => b.row >= 8)) state.alive = false
}

function applyPrize(state, id) {
  if (id === 'wide') state.paddleW = Math.min(180, state.paddleW + 28)
  if (id === 'narrow') state.paddleW = Math.max(70, state.paddleW - 24)
  if (id === 'star') state.score += 30
  if (id === 'slow') state.balls.forEach((b) => { b.vx *= 0.85; b.vy *= 0.85 })
  if (id === 'fast') state.balls.forEach((b) => { b.vx *= 1.15; b.vy *= 1.15 })
  if (id === 'multi' && state.balls[0]) {
    const base = state.balls[0]
    state.balls.push({ x: base.x, y: base.y, vx: -base.vx, vy: base.vy })
  }
}

function draw(canvas, state, w, h) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1e1b4b')
  sky.addColorStop(1, '#312e81')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const gap = 6
  const pad = 14
  const cellW = (w - pad * 2 - gap * (COLS - 1)) / COLS
  const cellH = 28
  const top = 18
  for (const brick of state.bricks) {
    const x = pad + brick.col * (cellW + gap)
    const y = top + brick.row * (cellH + gap)
    round(ctx, x, y, cellW, cellH, 8)
    ctx.fillStyle = brick.color
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    round(ctx, x + 4, y + 3, cellW * 0.45, 6, 4)
    ctx.fill()
  }

  for (const prize of state.prizes) {
    ctx.fillStyle = prize.color
    ctx.beginPath()
    ctx.arc(prize.x, prize.y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(prize.icon, prize.x, prize.y + 1)
  }

  const py = h - 36
  round(ctx, state.paddleX - state.paddleW / 2, py, state.paddleW, 14, 8)
  const paddle = ctx.createLinearGradient(0, py, 0, py + 14)
  paddle.addColorStop(0, '#fde68a')
  paddle.addColorStop(1, '#f59e0b')
  ctx.fillStyle = paddle
  ctx.fill()

  for (const ball of state.balls) {
    ctx.save()
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 16
    ctx.fillStyle = '#fda4af'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
