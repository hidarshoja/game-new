import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playMatch, playPop } from '../utils/sounds'
import { BALL_ANGLE, createTower, nudgeTower, spinTower, updateTower } from './towerLogic'

export default function BallTower() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const dragRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0, combo: 0 })

  const sync = () => {
    const state = stateRef.current
    if (!state) return
    setHud({ score: state.score, combo: state.combo })
  }

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const shakeX = state.shake ? Math.sin(state.time * 55) * 6 * state.shake : 0
    const cx = width / 2 + shakeX
    const anchor = height * 0.36
    const rx = Math.min(width * 0.36, 168)
    const ry = rx * 0.32
    const pillar = Math.max(10, rx * 0.09)

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#0b1024')
    sky.addColorStop(0.4, '#1e1b4b')
    sky.addColorStop(1, '#020617')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    const glow = ctx.createRadialGradient(cx, anchor, 8, cx, height * 0.5, rx * 2.4)
    glow.addColorStop(0, 'rgba(251, 113, 133, 0.18)')
    glow.addColorStop(0.45, 'rgba(99, 102, 241, 0.1)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < 18; i += 1) {
      const twinkle = 0.15 + ((Math.sin(state.time * 2 + i) + 1) / 2) * 0.35
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`
      ctx.beginPath()
      ctx.arc((i * 97) % width, (i * 61 + state.time * 8) % (height * 0.55), 1.4, 0, Math.PI * 2)
      ctx.fill()
    }

    const pole = ctx.createLinearGradient(cx - pillar, 0, cx + pillar, 0)
    pole.addColorStop(0, '#64748b')
    pole.addColorStop(0.35, '#f8fafc')
    pole.addColorStop(0.7, '#cbd5e1')
    pole.addColorStop(1, '#475569')
    ctx.fillStyle = pole
    ctx.fillRect(cx - pillar / 2, 0, pillar, height)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(cx - pillar * 0.18, 0, pillar * 0.18, height)

    const visible = state.rings
      .map((ring) => ({ ring, sy: anchor + (ring.y - state.ballY) * 0.82 }))
      .filter((item) => item.sy > -80 && item.sy < height + 80)
      .sort((a, b) => a.sy - b.sy)

    visible.forEach(({ ring, sy }) => {
      drawRing(ctx, cx, sy, rx, ry, ring.gapCenter + state.rot, ring.gap, ring.color, ring.deep, 'back')
    })

    for (const p of state.particles) {
      const px = cx + p.x * rx
      const py = anchor + (p.y - state.ballY) * 0.82
      ctx.globalAlpha = Math.max(0, p.life * 2)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const bounceLift = (state.hop || 0) + state.bounce * 14
    const ballX = cx + Math.cos(BALL_ANGLE) * rx * 0.78
    const ballY = anchor + Math.sin(BALL_ANGLE) * ry * 0.55 - bounceLift
    drawBall(ctx, ballX, ballY, rx * 0.145, state)

    visible.forEach(({ ring, sy }) => {
      drawRing(ctx, cx, sy, rx, ry, ring.gapCenter + state.rot, ring.gap, ring.color, ring.deep, 'front')
    })

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(253, 224, 71, ${state.flash * 0.2})`
      ctx.fillRect(0, 0, width, height)
    }
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

  const hold = (dir) => (event) => {
    event.preventDefault()
    if (!stateRef.current?.alive) return
    spinTower(stateRef.current, dir)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const release = () => {
    if (stateRef.current) spinTower(stateRef.current, 0)
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createTower()
    measure()
    sync()
    let last = performance.now()
    let shown = -1
    const onResize = () => measure()
    const onKey = (event) => {
      const state = stateRef.current
      if (!state?.alive) return
      if (event.key === 'ArrowLeft' || event.key === 'a') spinTower(state, -1)
      if (event.key === 'ArrowRight' || event.key === 'd') spinTower(state, 1)
      if (event.type === 'keyup') spinTower(state, 0)
    }
    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const event = updateTower(state, dt)
        if (event === 'dead') {
          playCheer()
          sync()
          phaseRef.current = 'over'
          setPhase('over')
        } else if (event === 'perfect') {
          playMatch()
        } else if (event === 'pass') {
          playPop()
        }
        if (state.score !== shown) {
          shown = state.score
          sync()
        }
      }
      draw()
      rafRef.current = requestAnimationFrame(paint)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run])

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return
    dragRef.current = event.clientX
  }
  const onPointerMove = (event) => {
    if (dragRef.current == null || !stateRef.current?.alive) return
    const dx = event.clientX - dragRef.current
    dragRef.current = event.clientX
    nudgeTower(stateRef.current, -dx * 0.014)
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const begin = () => {
    setRun((value) => value + 1)
    setPhase('playing')
  }

  return (
    <GameShell title="برج توپ‌ها" emoji="🔴" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`arcade tower-game ${phase === 'playing' ? 'arcade--live' : ''}`}>
        {phase === 'playing' ? (
          <div
            className="snake-arena"
            ref={wrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="snake-glass-hud">
              <div className="glass-chip">
                <span>کمبو</span>
                <strong>{hud.combo}</strong>
              </div>
              <div className="glass-chip glass-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <div className="snake-glass-pad" dir="ltr">
              <button
                type="button"
                className="glass-btn glass-btn--side"
                aria-label="چپ"
                onPointerDown={hold(-1)}
                onPointerUp={release}
                onPointerCancel={release}
              >
                ◀
              </button>
              <div className="snake-glass-pad__col" />
              <button
                type="button"
                className="glass-btn glass-btn--side"
                aria-label="راست"
                onPointerDown={hold(1)}
                onPointerUp={release}
                onPointerCancel={release}
              >
                ▶
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">برج توپ‌ها</p>
            <div className="tower-intro" aria-hidden="true">
              <span />
              <span />
              <b />
            </div>
            <h2 className="level-panel__title">توپ را از شکاف رد کن</h2>
            <p className="level-panel__meta">برج را بچرخان و به پایین برس</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              شروع بازی
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
            <p className="level-panel__meta">بهترین کمبو: {stateRef.current?.bestCombo || 0}</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawRing(ctx, cx, cy, rx, ry, gapCenter, gap, color, deep, half) {
  const start = gapCenter + gap / 2
  const end = gapCenter - gap / 2 + Math.PI * 2
  const mid = (start + end) / 2
  const thickness = Math.max(10, ry * 0.95)

  ctx.save()
  ctx.lineCap = 'butt'
  ctx.lineWidth = thickness

  if (half === 'back') {
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.55, rx * 0.98, ry * 0.98, 0, start, end)
    ctx.stroke()
    ctx.strokeStyle = deep
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.22, rx, ry, 0, start, Math.min(end, mid))
    ctx.stroke()
  } else {
    ctx.shadowColor = color
    ctx.shadowBlur = 16
    const paint = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy)
    paint.addColorStop(0, deep)
    paint.addColorStop(0.5, color)
    paint.addColorStop(1, deep)
    ctx.strokeStyle = paint
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, Math.max(start, mid), end)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = Math.max(2, thickness * 0.18)
    ctx.beginPath()
    ctx.ellipse(cx, cy - ry * 0.18, rx * 0.92, ry * 0.7, 0, Math.max(start, mid), end)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBall(ctx, x, y, r, state) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 1.45, r * 0.85, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  if (state.ballV < -40) {
    ctx.strokeStyle = 'rgba(253, 164, 175, 0.45)'
    ctx.lineWidth = r * 0.45
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + Math.min(42, Math.abs(state.ballV) * 0.08))
    ctx.stroke()
  }

  const fill = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r)
  fill.addColorStop(0, '#ffffff')
  fill.addColorStop(0.35, '#fb7185')
  fill.addColorStop(1, '#9f1239')
  ctx.fillStyle = fill
  ctx.shadowColor = '#fb7185'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.25, y - r * 0.28, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
