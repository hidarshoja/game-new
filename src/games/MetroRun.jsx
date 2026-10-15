import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playFlip, playPop } from '../utils/sounds'
import { createMetro, steerMetro, updateMetro } from './metroLogic'

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

function project(width, height, lane, z) {
  const near = 1 / (1 + z * 0.16)
  const y = height * 0.16 + height * 0.48 * near
  const spread = width * 0.34 * near
  return {
    x: width / 2 + (lane - 1) * spread,
    y,
    s: 0.25 + near,
    near,
  }
}

export default function MetroRun() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const swipeRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0, coins: 0 })

  const sync = () => {
    const state = stateRef.current
    if (!state) return
    setHud({ score: state.score, coins: state.coinsGot })
  }

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#120a2a')
    bg.addColorStop(0.45, '#1d2454')
    bg.addColorStop(1, '#070b16')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const far = project(width, height, 1, 16)
    const left = project(width, height, -0.35, 0)
    const right = project(width, height, 2.35, 0)

    ctx.fillStyle = '#140c28'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, height)
    ctx.lineTo(left.x, height)
    ctx.lineTo(width / 2 - width * 0.1, far.y)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(width, 0)
    ctx.lineTo(width, height)
    ctx.lineTo(right.x, height)
    ctx.lineTo(width / 2 + width * 0.1, far.y)
    ctx.closePath()
    ctx.fill()

    const scroll = (state.time * state.speed * 0.22) % 1.2
    for (let i = 0; i < 16; i += 1) {
      const z = i * 1.2 - scroll
      if (z < 0.2) continue
      const a = project(width, height, -0.15, z)
      const b = project(width, height, 2.15, z)
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.28)'
      ctx.lineWidth = Math.max(2, 7 * a.s)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(width / 2 - width * 0.08, far.y)
    ctx.lineTo(left.x, height)
    ctx.lineTo(right.x, height)
    ctx.closePath()
    const road = ctx.createLinearGradient(0, far.y, 0, height)
    road.addColorStop(0, '#2a3148')
    road.addColorStop(1, '#151a28')
    ctx.fillStyle = road
    ctx.fill()

    for (let lane = 0; lane < 3; lane += 1) {
      const a = project(width, height, lane - 0.5, 14)
      const b = project(width, height, lane - 0.5, 0)
      ctx.strokeStyle = lane === 0 ? 'rgba(248, 113, 113, 0.0)' : 'rgba(250, 204, 21, 0.75)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, height * 0.9)
      ctx.stroke()
    }

    const items = [
      ...state.coins.filter((coin) => !coin.got).map((coin) => ({ ...coin, kind: 'coin' })),
      ...state.obstacles.map((ob) => ({ ...ob, kind: 'ob' })),
    ].sort((a, b) => b.z - a.z)

    items.forEach((item) => {
      if (item.z < -0.4 || item.z > 16) return
      const p = project(width, height, item.lane, item.z)
      if (item.kind === 'coin') drawCoin(ctx, p, state.time)
      else drawObstacle(ctx, p, item.type)
    })

    const runner = project(width, height, state.visualLane, 0.15)
    drawRunner(ctx, runner, state)
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

  const act = (action) => (event) => {
    event.preventDefault()
    const state = stateRef.current
    if (!state?.alive || phaseRef.current !== 'playing') return
    if (!steerMetro(state, action)) return
    if (action === 'jump' || action === 'slide') playFlip()
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createMetro()
    measure()
    sync()
    let last = performance.now()
    let shown = -1

    const onResize = () => {
      measure()
      draw()
    }
    const onKey = (event) => {
      const map = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'jump',
        ArrowDown: 'slide',
        a: 'left',
        d: 'right',
        w: 'jump',
        s: 'slide',
      }
      const action = map[event.key] || map[event.key.toLowerCase()]
      if (!action || !stateRef.current) return
      event.preventDefault()
      if (steerMetro(stateRef.current, action) && (action === 'jump' || action === 'slide')) playFlip()
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const result = updateMetro(state, dt)
        if (result.picked) playPop()
        if (result.died) {
          playCheer()
          sync()
          phaseRef.current = 'over'
          setPhase('over')
        } else if (result.picked || state.score !== shown) {
          shown = state.score
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

  const begin = () => {
    setRun((value) => value + 1)
    setPhase('playing')
  }

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return
    swipeRef.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event) => {
    const start = swipeRef.current
    swipeRef.current = null
    const state = stateRef.current
    if (!start || !state?.alive) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) < 26) return
    const action = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'slide' : 'jump'
    if (steerMetro(state, action) && (action === 'jump' || action === 'slide')) playFlip()
  }

  const causeText = {
    low: 'باید از روی مانع می‌پریدی',
    high: 'باید زیر مانع سر می‌خوردی',
    block: 'به قطار برخورد کردی',
  }[stateRef.current?.cause] || 'به مانع برخورد کردی'

  return (
    <GameShell title="فرار در مترو" emoji="🚇" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`arcade metro-game ${phase === 'playing' ? 'arcade--live' : ''}`}>
        {phase === 'playing' ? (
          <div
            className="snake-arena"
            ref={wrapRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
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
            <div className="snake-glass-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={act('left')}>
                ◀
              </button>
              <div className="snake-glass-pad__col">
                <button type="button" className="glass-btn" aria-label="پرش" onPointerDown={act('jump')}>
                  ▲
                </button>
                <button type="button" className="glass-btn" aria-label="سر خوردن" onPointerDown={act('slide')}>
                  ▼
                </button>
              </div>
              <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={act('right')}>
                ▶
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۷</p>
            <div className="metro-intro" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 className="level-panel__title">بین سه مسیر بدو</h2>
            <p className="level-panel__meta">بپر، سر بخور و سکه جمع کن</p>
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
            <p className="level-panel__meta">
              {causeText} · سکه‌ها: {hud.coins}
            </p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawCoin(ctx, p, time) {
  const r = 14 * p.s
  ctx.save()
  ctx.translate(p.x, p.y - 18 * p.s)
  ctx.scale(0.55 + Math.abs(Math.sin(time * 6)) * 0.45, 1)
  ctx.fillStyle = '#facc15'
  ctx.shadowColor = '#fde68a'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#b45309'
  ctx.font = `700 ${Math.max(10, r)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('★', 0, 1)
  ctx.restore()
}

function drawObstacle(ctx, p, type) {
  const w = 54 * p.s
  const h = type === 'high' ? 18 * p.s : type === 'low' ? 28 * p.s : 70 * p.s
  const y = p.y - h - (type === 'high' ? 36 * p.s : 0)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 10
  if (type === 'block') {
    ctx.fillStyle = '#f43f5e'
    roundRect(ctx, p.x - w / 2, y, w, h, 8 * p.s)
    ctx.fill()
    ctx.fillStyle = '#fecdd3'
    roundRect(ctx, p.x - w * 0.28, y + h * 0.18, w * 0.56, h * 0.28, 4)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.fillRect(p.x - w * 0.34, y + h * 0.72, w * 0.16, h * 0.16)
    ctx.fillRect(p.x + w * 0.18, y + h * 0.72, w * 0.16, h * 0.16)
  } else if (type === 'low') {
    ctx.fillStyle = '#fb923c'
    roundRect(ctx, p.x - w / 2, y, w, h, 6)
    ctx.fill()
    ctx.strokeStyle = '#fff7ed'
    ctx.lineWidth = 3
    ctx.strokeRect(p.x - w * 0.28, y + 4, w * 0.56, h - 8)
  } else {
    ctx.fillStyle = '#38bdf8'
    roundRect(ctx, p.x - w * 0.7, y, w * 1.4, h, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillRect(p.x - w * 0.55, y + h * 0.35, w * 1.1, 3)
  }
  ctx.restore()
}

function drawRunner(ctx, p, state) {
  const s = p.s * 46
  const jump = state.jump * s * 1.5
  const slide = state.slide > 0
  const bob = slide ? 0 : Math.sin(state.time * 14) * s * 0.08
  const x = p.x
  const y = p.y - jump + bob

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, p.y + 6, s * 0.38, s * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(x, y)
  if (slide) ctx.scale(1.15, 0.62)

  ctx.fillStyle = '#0f766e'
  roundRect(ctx, -s * 0.22, -s * 0.15, s * 0.18, s * 0.42, 6)
  ctx.fill()

  ctx.fillStyle = '#22d3ee'
  roundRect(ctx, -s * 0.28, -s * 0.55, s * 0.56, s * 0.62, 12)
  ctx.fill()
  ctx.fillStyle = '#cffafe'
  roundRect(ctx, -s * 0.12, -s * 0.42, s * 0.28, s * 0.22, 6)
  ctx.fill()

  ctx.fillStyle = '#fcd9b6'
  ctx.beginPath()
  ctx.arc(0, -s * 0.78, s * 0.24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f43f5e'
  roundRect(ctx, -s * 0.26, -s * 1.05, s * 0.52, s * 0.2, 6)
  ctx.fill()

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(-s * 0.08, -s * 0.8, s * 0.035, 0, Math.PI * 2)
  ctx.arc(s * 0.08, -s * 0.8, s * 0.035, 0, Math.PI * 2)
  ctx.fill()

  const swing = slide ? 0 : Math.sin(state.time * 14) * s * 0.18
  ctx.strokeStyle = '#155e75'
  ctx.lineWidth = Math.max(3, s * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-s * 0.08, -s * 0.05)
  ctx.lineTo(-s * 0.12, s * 0.28 + swing)
  ctx.moveTo(s * 0.1, -s * 0.05)
  ctx.lineTo(s * 0.14, s * 0.28 - swing)
  ctx.stroke()
  ctx.restore()
}
