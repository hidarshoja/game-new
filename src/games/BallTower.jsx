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
  const [hud, setHud] = useState({ score: 0 })

  const sync = () => setHud({ score: stateRef.current?.score || 0 })

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const anchor = height * 0.34
    const rx = Math.min(width * 0.34, 150)
    const ry = rx * 0.34

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#1e1b4b')
    sky.addColorStop(0.45, '#312e81')
    sky.addColorStop(1, '#0f172a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    const glow = ctx.createRadialGradient(cx, anchor, 10, cx, height * 0.55, rx * 2.2)
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.16)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = Math.max(8, rx * 0.08)
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, height)
    ctx.stroke()

    const visible = state.rings
      .map((ring) => ({ ring, sy: anchor + (ring.y - state.ballY) * 0.85 }))
      .filter((item) => item.sy > -40 && item.sy < height + 40)
      .sort((a, b) => a.sy - b.sy)

    visible.forEach(({ ring, sy }) => drawRing(ctx, cx, sy, rx, ry, ring.gapCenter + state.rot, ring.gap, ring.color))

    drawBall(ctx, cx + Math.cos(BALL_ANGLE) * rx * 0.72, anchor + Math.sin(BALL_ANGLE) * ry * 0.72, rx * 0.16)
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
    nudgeTower(stateRef.current, -dx * 0.012)
  }
  const onPointerUp = () => {
    dragRef.current = null
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
            <div className="snake-glass-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={hold(-1)} onPointerUp={release} onPointerCancel={release}>
                ◀
              </button>
              <div className="snake-glass-pad__col" />
              <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={hold(1)} onPointerUp={release} onPointerCancel={release}>
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
            <p className="level-panel__meta">برج را بچرخان تا توپ به پایین برسد</p>
            <button type="button" className="primary-btn snake-start" onClick={() => { setRun((v) => v + 1); setPhase('playing') }}>
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
            <p className="level-panel__meta">توپ به حلقه خورد</p>
            <button type="button" className="primary-btn snake-start" onClick={() => { setRun((v) => v + 1); setPhase('playing') }}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawRing(ctx, cx, cy, rx, ry, gapCenter, gap, color) {
  const start = gapCenter + gap / 2
  const end = gapCenter - gap / 2 + Math.PI * 2
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'
  ctx.lineWidth = ry * 0.85
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry * 0.45, rx, ry, 0, start, end)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.lineWidth = ry * 0.7
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, start, end)
  ctx.stroke()
  ctx.restore()
}

function drawBall(ctx, x, y, r) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 1.3, r * 0.8, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  const fill = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  fill.addColorStop(0, '#fff')
  fill.addColorStop(0.45, '#fb7185')
  fill.addColorStop(1, '#9f1239')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
