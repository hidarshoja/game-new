import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playFlip } from '../utils/sounds'
import { createTrail, groundHeight, updateTrail } from './trailLogic'

export default function TrailRide() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const leanRef = useRef(0)
  const portraitRef = useRef(false)
  const keysRef = useRef({ back: false, front: false })
  const rafRef = useRef(0)
  const [phase, setPhase] = useState('intro')
  const [score, setScore] = useState(0)
  const [portrait, setPortrait] = useState(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const check = () => {
      const next = window.innerHeight > window.innerWidth + 40
      portraitRef.current = next
      setPortrait(next)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  useEffect(() => {
    const onTilt = (event) => {
      const orient = screen.orientation?.angle ?? (Number(window.orientation) || 0)
      let tilt = event.gamma ?? 0
      if (orient === 90) tilt = event.beta ?? 0
      else if (orient === 270 || orient === -90) tilt = -(event.beta ?? 0)
      if (!Number.isFinite(tilt)) return
      leanRef.current = Math.max(-1, Math.min(1, tilt / 26))
    }
    const onKey = (event) => {
      const down = event.type === 'keydown'
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') keysRef.current.back = down
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') keysRef.current.front = down
    }
    window.addEventListener('deviceorientation', onTilt)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('deviceorientation', onTilt)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createTrail()
    setScore(0)
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const measure = () => {
      if (!canvas || !wrap) return
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    measure()
    let last = performance.now()
    let shown = -1
    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      const keys = keysRef.current
      const keyLean = (keys.front ? 1 : 0) - (keys.back ? 1 : 0)
      const target = keyLean !== 0 ? keyLean : leanRef.current
      if (state?.alive && phaseRef.current === 'playing' && !portraitRef.current) {
        const event = updateTrail(state, dt, target)
        if (event === 'dead') {
          playCheer()
          setScore(state.score)
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== shown) {
          shown = state.score
          setScore(state.score)
        }
      }
      drawTrail(canvas, state, now / 1000)
      rafRef.current = requestAnimationFrame(paint)
    }
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  const begin = async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission()
      }
    } catch {
      /* tilt permission is optional on this browser */
    }
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
      await screen.orientation?.lock?.('landscape')
    } catch {
      /* some phones only rotate from the browser menu */
    }
    playFlip()
    setPhase('playing')
  }

  return (
    <GameShell title="موتور تریل" emoji="🏍️" scoreLabel="امتیاز" score={score} actions={null}>
      <div className={`trail ${phase === 'playing' ? 'trail--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">موتور تریل</p>
            <div className="trail-intro" aria-hidden="true">🏍️</div>
            <h2 className="level-panel__title">تعادل را با کج کردن گوشی نگه دار</h2>
            <p className="level-panel__meta">از تپه و مانع بپر. اگر موتور چپ شود، باختی. بازی افقی است.</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              شروع بازی
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="snake-glass-hud">
              <div className="glass-chip glass-chip--score">
                <span>مسافت</span>
                <strong>{score}</strong>
              </div>
            </div>
            {portrait ? (
              <div className="trail-rotate">
                <strong>گوشی را افقی بگیر</strong>
                <span>بعد از شروع، بازی فقط افقی است</span>
              </div>
            ) : null}
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{score}</div>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              دوباره بران
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawTrail(canvas, state, time) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const scale = height / 390
  const camera = state.x - width * 0.28 / scale
  const base = height * 0.78

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(0.55, '#fdba74')
  sky.addColorStop(1, '#fed7aa')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 220 - camera * 0.15) % (width + 160)) - 40
    ctx.beginPath()
    ctx.ellipse(x, 50 * scale + i * 16, 40 * scale, 14 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.moveTo(0, height)
  for (let px = 0; px <= width; px += 8) {
    const world = camera + px / scale
    const y = base - groundHeight(world) * 0.55 * scale
    ctx.lineTo(px, y)
  }
  ctx.lineTo(width, height)
  ctx.fill()
  ctx.strokeStyle = '#14532d'
  ctx.lineWidth = 4 * scale
  ctx.stroke()

  const bikeX = (state.x - camera) * scale
  const bikeY = base - state.y * scale
  drawBike(ctx, bikeX, bikeY, state.angle, state.lean, scale, time)
}

function drawBike(ctx, x, y, angle, lean, scale, time) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-angle)
  const s = scale
  const rear = -34 * s
  const front = 34 * s
  const wheelY = 16 * s

  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 4 * s
  ctx.beginPath()
  ctx.moveTo(rear, wheelY)
  ctx.lineTo(0, -6 * s)
  ctx.lineTo(front, wheelY)
  ctx.stroke()

  ctx.fillStyle = '#f97316'
  round(ctx, -16 * s, -18 * s, 36 * s, 16 * s, 6 * s)
  ctx.fill()
  ctx.fillStyle = '#111827'
  round(ctx, 8 * s, -10 * s, 16 * s, 8 * s, 3 * s)
  ctx.fill()

  ctx.save()
  ctx.translate(lean * 16 * s, -24 * s)
  ctx.rotate(lean * 0.45)
  ctx.fillStyle = '#1d4ed8'
  round(ctx, -7 * s, -6 * s, 14 * s, 18 * s, 5 * s)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(0, -14 * s, 7 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  round(ctx, -8 * s, -20 * s, 16 * s, 7 * s, 3 * s)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = '#334155'
  ctx.beginPath()
  ctx.moveTo(front - 6 * s, 4 * s)
  ctx.lineTo(front + 8 * s, -16 * s)
  ctx.stroke()

  drawWheel(ctx, rear, wheelY, 15 * s, time)
  drawWheel(ctx, front, wheelY, 15 * s, time)
  ctx.restore()
}

function drawWheel(ctx, x, y, radius, time) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(time * 10)
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(2, radius * 0.16)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
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
