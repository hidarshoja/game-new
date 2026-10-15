import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playMismatch, playPop } from '../utils/sounds'
import { createFruit, nudgeBasket, setBasket, updateFruit } from './fruitLogic'

export default function FruitBasket() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0, lives: 3 })

  const sync = () => {
    const state = stateRef.current
    if (!state) return
    setHud({ score: state.score, lives: state.lives })
  }

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#7dd3fc')
    sky.addColorStop(0.55, '#bae6fd')
    sky.addColorStop(1, '#86efac')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ;[[0.15, 0.12, 46], [0.72, 0.18, 34], [0.4, 0.08, 28]].forEach(([x, y, r]) => {
      ctx.beginPath()
      ctx.ellipse(width * x, height * y, r, r * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.ellipse(width * 0.5, height * 0.92, width * 0.7, height * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()

    state.items.forEach((item) => {
      drawItem(ctx, item.x * width, item.y * height, Math.min(width, height) * 0.045, item)
    })
    drawBasket(ctx, state.basketX * width, height * 0.8, width * 0.22, height * 0.07)
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
    const state = stateRef.current
    if (!state?.alive) return
    nudgeBasket(state, dir)
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createFruit()
    measure()
    sync()
    let last = performance.now()
    const onResize = () => measure()
    const onKey = (event) => {
      const state = stateRef.current
      if (!state?.alive) return
      if (event.key === 'ArrowLeft' || event.key === 'a') nudgeBasket(state, -1)
      if (event.key === 'ArrowRight' || event.key === 'd') nudgeBasket(state, 1)
    }
    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const result = updateFruit(state, dt)
        if (result.caught) playPop()
        if (result.bad) playMismatch()
        if (result.died) {
          playCheer()
          sync()
          phaseRef.current = 'over'
          setPhase('over')
        } else if (result.caught || result.bad) {
          sync()
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
  }, [phase, run])

  const follow = (event) => {
    const wrap = wrapRef.current
    const state = stateRef.current
    if (!wrap || !state?.alive) return
    if (event.target.closest('button')) return
    const rect = wrap.getBoundingClientRect()
    setBasket(state, (event.clientX - rect.left) / rect.width)
  }

  return (
    <GameShell title="سبد میوه" emoji="🧺" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`arcade fruit-game ${phase === 'playing' ? 'arcade--live' : ''}`}>
        {phase === 'playing' ? (
          <div className="snake-arena" ref={wrapRef} onPointerDown={follow} onPointerMove={(event) => { if (event.buttons) follow(event) }}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="snake-glass-hud">
              <div className="glass-chip">
                <span>جان</span>
                <strong>{'❤'.repeat(Math.max(0, hud.lives))}</strong>
              </div>
              <div className="glass-chip glass-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <div className="snake-glass-pad fruit-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={hold(-1)}>
                ◀
              </button>
              <div className="snake-glass-pad__col" />
              <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={hold(1)}>
                ▶
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">سبد میوه</p>
            <div className="fruit-intro" aria-hidden="true">🍎 🍊 🍋</div>
            <h2 className="level-panel__title">میوه‌ها را بگیر</h2>
            <p className="level-panel__meta">سنگ و بمب را نگیر</p>
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
            <p className="level-panel__meta">میوه‌های گرفته‌شده: {stateRef.current?.caught || 0}</p>
            <button type="button" className="primary-btn snake-start" onClick={() => { setRun((v) => v + 1); setPhase('playing') }}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawItem(ctx, x, y, r, item) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(15,23,42,0.15)'
  ctx.beginPath()
  ctx.ellipse(0, r * 1.15, r * 0.7, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  if (item.kind.id === 'banana' || item.kind.id === 'lemon') {
    ctx.strokeStyle = item.kind.color
    ctx.lineWidth = r * 0.7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.7, 0.4, 2.4)
    ctx.stroke()
  } else if (item.kind.id === 'grape') {
    ctx.fillStyle = item.kind.color
    ;[[-0.3, 0.1], [0.3, 0.1], [0, -0.35], [0, 0.45], [-0.15, -0.1]].forEach(([dx, dy]) => {
      ctx.beginPath()
      ctx.arc(dx * r, dy * r, r * 0.38, 0, Math.PI * 2)
      ctx.fill()
    })
  } else if (item.bad && item.kind.id === 'bomb') {
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(r * 0.4, -r * 0.7)
    ctx.lineTo(r * 0.9, -r * 1.2)
    ctx.stroke()
  } else if (item.bad) {
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.moveTo(-r, r * 0.3)
    ctx.lineTo(-r * 0.4, -r)
    ctx.lineTo(r * 0.5, -r * 0.4)
    ctx.lineTo(r, r * 0.5)
    ctx.closePath()
    ctx.fill()
  } else {
    const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r)
    fill.addColorStop(0, '#fff')
    fill.addColorStop(0.35, item.kind.color)
    fill.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = item.kind.id === 'apple' || item.kind.id === 'berry' ? fill : item.kind.color
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#166534'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(r * 0.25, -r * 1.35)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBasket(ctx, x, y, w, h) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(0, h * 0.55, w * 0.42, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.moveTo(-w * 0.42, -h * 0.2)
  ctx.lineTo(w * 0.42, -h * 0.2)
  ctx.quadraticCurveTo(w * 0.34, h * 0.7, 0, h * 0.75)
  ctx.quadraticCurveTo(-w * 0.34, h * 0.7, -w * 0.42, -h * 0.2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,53,15,0.45)'
  ctx.lineWidth = 2
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath()
    ctx.moveTo(i * w * 0.12, -h * 0.15)
    ctx.lineTo(i * w * 0.06, h * 0.55)
    ctx.stroke()
  }
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(-w * 0.46, -h * 0.22)
  ctx.lineTo(w * 0.46, -h * 0.22)
  ctx.stroke()
  ctx.restore()
}
