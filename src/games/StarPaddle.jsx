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

function starPath(ctx, cx, cy, spikes, outer, inner) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outer)
  for (let i = 0; i < spikes; i += 1) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner)
    rot += step
  }
  ctx.closePath()
}

function diamondPath(ctx, x, y, w, h) {
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y)
  ctx.lineTo(x + w, y + h / 2)
  ctx.lineTo(x + w / 2, y + h)
  ctx.lineTo(x, y + h / 2)
  ctx.closePath()
}

function hexPath(ctx, x, y, w, h) {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = w / 2
  const ry = h / 2
  ctx.beginPath()
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    const px = cx + Math.cos(a) * rx
    const py = cy + Math.sin(a) * ry
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
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
  const [hud, setHud] = useState({ score: 0, wave: 1, toast: '' })

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
    world.balls = [{ x: size.w / 2, y: size.h * 0.7, vx: 160, vy: -300, spin: 0 }]
    world.toast = ''
    world.toastT = 0
    worldRef.current = world
    setHud({ score: 0, wave: 1, toast: '' })
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
          setHud({ score: state.score, wave: state.wave, toast: '' })
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== shown || state.toast) {
          shown = state.score
          setHud({ score: state.score, wave: state.wave, toast: state.toast || '' })
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
            <p className="level-panel__kicker">شکار ستاره در آسمان</p>
            <div className="star-intro" aria-hidden="true">🌙 ⭐ 💎</div>
            <h2 className="level-panel__title">الماس‌ها را بشکن، ستاره را با ماه بگیر</h2>
            <p className="level-panel__meta">جایزه‌ها را با ماه بگیر: مغناطیس، شهاب، سپر، انفجار و بیشتر</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع بازی
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="star-hud">
              <div className="star-hud__chip">
                <span>موج</span>
                <strong>{hud.wave}</strong>
              </div>
              <div className="star-hud__chip star-hud__chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
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
  if (state.magnet > 0) state.magnet -= dt
  if (state.shield > 0) state.shield -= dt
  if (state.toastT > 0) {
    state.toastT -= dt
    if (state.toastT <= 0) state.toast = ''
  }
  state.spawn -= dt
  state.rowTimer -= dt
  if (state.spawn <= 0) {
    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)]
    state.prizes.push({ ...prize, x: 40 + Math.random() * (w - 80), y: -24, got: false, spin: 0 })
    state.spawn = 1.8 + Math.random() * 1.5
  }
  if (state.rowTimer <= 0) {
    addBrickRow(state)
    state.rowTimer = Math.max(7, 11 - state.wave * 0.12)
  }

  const gap = 8
  const pad = 16
  const cellW = (w - pad * 2 - gap * (COLS - 1)) / COLS
  const cellH = 32
  const top = 72
  const catchY = h - 42

  for (const prize of state.prizes) {
    prize.spin += dt * 4
    if (state.magnet > 0) {
      prize.x += (state.paddleX - prize.x) * Math.min(1, dt * 3.2)
      prize.y += 90 * dt
    } else {
      prize.y += 125 * dt
    }
    if (!prize.got && prize.y > catchY - 20 && prize.y < catchY + 16 && Math.abs(prize.x - state.paddleX) < state.paddleW / 2 + 16) {
      prize.got = true
      applyPrize(state, prize.id, w, h)
      playFlip()
    }
  }
  state.prizes = state.prizes.filter((p) => !p.got && p.y < h + 40)

  for (const ball of state.balls) {
    ball.spin += dt * 8
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    if (ball.x < 12 || ball.x > w - 12) ball.vx *= -1
    if (ball.y < 12) ball.vy = Math.abs(ball.vy)
    if (ball.y > catchY - 12 && ball.y < catchY + 14 && Math.abs(ball.x - state.paddleX) < state.paddleW / 2 + 10 && ball.vy > 0) {
      const hit = (ball.x - state.paddleX) / (state.paddleW / 2)
      ball.vx = hit * 280
      ball.vy = -Math.abs(ball.vy)
      const speed = Math.min(440, Math.hypot(ball.vx, ball.vy) * 1.025)
      const mag = Math.hypot(ball.vx, ball.vy) || 1
      ball.vx = (ball.vx / mag) * speed
      ball.vy = (ball.vy / mag) * speed
      playFlip()
    }
    for (const brick of state.bricks) {
      const bx = pad + brick.col * (cellW + gap)
      const by = top + brick.row * (cellH + gap)
      if (ball.x > bx && ball.x < bx + cellW && ball.y > by && ball.y < by + cellH) {
        brick.hp -= state.fire > 0 ? 2 : 1
        if (state.fire <= 0) ball.vy *= -1
        if (brick.hp <= 0) {
          state.score += 12
          playPop()
          // گاهی جایزه از آجر می‌ریزد
          if (Math.random() < 0.18) {
            const drop = PRIZES[Math.floor(Math.random() * PRIZES.length)]
            state.prizes.push({ ...drop, x: bx + cellW / 2, y: by + cellH / 2, got: false, spin: 0 })
          }
        }
        break
      }
    }
  }
  state.bricks = state.bricks.filter((b) => b.hp > 0)
  const before = state.balls.length
  state.balls = state.balls.filter((b) => b.y < h + 24)
  if (state.balls.length < before && state.balls.length === 0) {
    if (state.shield > 0) {
      state.shield = 0
      state.balls.push({ x: state.paddleX, y: catchY - 28, vx: 140, vy: -320, spin: 0 })
      state.toast = 'سپر نجاتت داد!'
      state.toastT = 1.4
    } else {
      state.alive = false
    }
  }
  if (state.bricks.some((b) => b.row >= 8)) state.alive = false
}

function applyPrize(state, id, w, h) {
  const labels = Object.fromEntries(PRIZES.map((p) => [p.id, p.label]))
  state.toast = labels[id] || ''
  state.toastT = 1.2
  if (id === 'grow') state.paddleW = Math.min(170, state.paddleW + 32)
  if (id === 'shrink') state.paddleW = Math.max(70, state.paddleW - 26)
  if (id === 'gem') state.score += 40
  if (id === 'freeze') state.balls.forEach((b) => { b.vx *= 0.72; b.vy *= 0.72 })
  if (id === 'orbit') state.balls.forEach((b) => { b.vx *= 1.2; b.vy *= 1.2 })
  if (id === 'magnet') state.magnet = Math.max(state.magnet, 5.5)
  if (id === 'comet') state.fire = Math.max(state.fire, 4.5)
  if (id === 'shield') state.shield = Math.max(state.shield, 8)
  if (id === 'twin' && state.balls[0]) {
    const base = state.balls[0]
    state.balls.push({ x: base.x, y: base.y, vx: -base.vx * 0.9, vy: base.vy, spin: 0 })
  }
  if (id === 'bomb') {
    const maxRow = Math.max(0, ...state.bricks.map((b) => b.row))
    state.bricks = state.bricks.filter((b) => b.row < maxRow - 1)
    state.score += 25
  }
}

function draw(canvas, state, w, h) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // آسمان شب — متفاوت از بنفش توپ و راکت
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0c4a6e')
  sky.addColorStop(0.45, '#164e63')
  sky.addColorStop(1, '#022c22')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // ستاره‌های پس‌زمینه
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 28; i += 1) {
    const sx = (i * 97) % w
    const sy = (i * 53) % (h * 0.7)
    const r = 0.8 + (i % 3) * 0.6
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const gap = 8
  const pad = 16
  const cellW = (w - pad * 2 - gap * (COLS - 1)) / COLS
  const cellH = 32
  const top = 72
  for (const brick of state.bricks) {
    const x = pad + brick.col * (cellW + gap)
    const y = top + brick.row * (cellH + gap)
    ctx.save()
    ctx.shadowColor = brick.color
    ctx.shadowBlur = 10
    if (brick.shape === 'hex') hexPath(ctx, x, y, cellW, cellH)
    else diamondPath(ctx, x, y, cellW, cellH)
    ctx.fillStyle = brick.color
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    starPath(ctx, x + cellW / 2, y + cellH / 2, 4, Math.min(cellW, cellH) * 0.22, Math.min(cellW, cellH) * 0.1)
    ctx.fill()
    ctx.restore()
  }

  for (const prize of state.prizes) {
    ctx.save()
    ctx.translate(prize.x, prize.y)
    ctx.rotate(prize.spin * 0.4)
    ctx.shadowColor = prize.color
    ctx.shadowBlur = 14
    round(ctx, -16, -16, 32, 32, 10)
    ctx.fillStyle = prize.color
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0f172a'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(prize.icon, 0, 1)
    ctx.restore()
  }

  const catchY = h - 42
  drawMoonCatcher(ctx, state.paddleX, catchY, state.paddleW, state.shield > 0, state.magnet > 0)

  for (const ball of state.balls) {
    ctx.save()
    ctx.translate(ball.x, ball.y)
    ctx.rotate(ball.spin)
    ctx.shadowColor = state.fire > 0 ? '#fb923c' : '#fde047'
    ctx.shadowBlur = 18
    starPath(ctx, 0, 0, 5, 12, 5)
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12)
    g.addColorStop(0, '#fffbeb')
    g.addColorStop(1, state.fire > 0 ? '#f97316' : '#facc15')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
  }

  if (state.toast) {
    ctx.fillStyle = 'rgba(15,23,42,0.75)'
    round(ctx, w / 2 - 90, h * 0.52 - 18, 180, 36, 14)
    ctx.fill()
    ctx.fillStyle = '#fef9c3'
    ctx.font = '800 15px Vazirmatn, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(state.toast, w / 2, h * 0.52)
  }
}

function drawMoonCatcher(ctx, x, y, width, shielded, magnet) {
  const half = width / 2
  ctx.save()
  if (shielded) {
    ctx.strokeStyle = 'rgba(134,239,172,0.7)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(x, y + 4, half + 10, 18, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // ماه هلالی به‌جای راکت صاف بنفش
  ctx.shadowColor = magnet ? '#38bdf8' : '#fde68a'
  ctx.shadowBlur = 16
  const grad = ctx.createLinearGradient(x - half, y, x + half, y + 18)
  grad.addColorStop(0, '#fef9c3')
  grad.addColorStop(0.5, '#fbbf24')
  grad.addColorStop(1, '#f59e0b')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(x - half, y + 4)
  ctx.quadraticCurveTo(x - half * 0.4, y - 10, x, y - 6)
  ctx.quadraticCurveTo(x + half * 0.4, y - 10, x + half, y + 4)
  ctx.quadraticCurveTo(x, y + 20, x - half, y + 4)
  ctx.closePath()
  ctx.fill()
  // ستاره کوچک روی ماه
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  starPath(ctx, x, y + 2, 5, 7, 3)
  ctx.fill()
  ctx.restore()
}
