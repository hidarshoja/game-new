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
    bg.addColorStop(0, '#0b1024')
    bg.addColorStop(0.4, '#152047')
    bg.addColorStop(1, '#060913')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const far = project(width, height, 1, 16)
    const left = project(width, height, -0.2, 0)
    const right = project(width, height, 2.2, 0)
    const horizonY = far.y - 8

    const glow = ctx.createRadialGradient(width / 2, horizonY, 8, width / 2, horizonY, width * 0.55)
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.28)')
    glow.addColorStop(0.45, 'rgba(99, 102, 241, 0.12)')
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    ctx.beginPath()
    ctx.moveTo(width / 2 - width * 0.07, far.y)
    ctx.lineTo(left.x, height)
    ctx.lineTo(right.x, height)
    ctx.closePath()
    const road = ctx.createLinearGradient(0, far.y, 0, height)
    road.addColorStop(0, '#3a4563')
    road.addColorStop(0.55, '#222a3d')
    road.addColorStop(1, '#121722')
    ctx.fillStyle = road
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(width / 2 - width * 0.07, far.y)
    ctx.lineTo(left.x, height)
    ctx.lineTo(right.x, height)
    ctx.closePath()
    ctx.clip()
    const scroll = (state.time * state.speed * 0.35) % 1.6
    for (let i = 0; i < 14; i += 1) {
      const z = i * 1.6 - scroll
      if (z < 0.15) continue
      const a = project(width, height, 0.05, z)
      const b = project(width, height, 1.95, z)
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.08 + a.s * 0.12})`
      ctx.lineWidth = Math.max(1.5, 3.5 * a.s)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.restore()

    for (const lane of [0.5, 1.5]) {
      const a = project(width, height, lane, 14)
      const b = project(width, height, lane, 0)
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)'
      ctx.shadowColor = 'rgba(250, 204, 21, 0.55)'
      ctx.shadowBlur = 10
      ctx.lineWidth = Math.max(2, 3.5 * b.s)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, height * 0.92)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    const edgeLeftA = project(width, height, -0.02, 14)
    const edgeLeftB = project(width, height, -0.02, 0)
    const edgeRightA = project(width, height, 2.02, 14)
    const edgeRightB = project(width, height, 2.02, 0)
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(edgeLeftA.x, edgeLeftA.y)
    ctx.lineTo(edgeLeftB.x, height * 0.94)
    ctx.moveTo(edgeRightA.x, edgeRightA.y)
    ctx.lineTo(edgeRightB.x, height * 0.94)
    ctx.stroke()

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

    const runner = project(width, height, state.visualLane, 0.55)
    runner.y -= height * 0.02
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
  const w = 58 * p.s
  const h = type === 'high' ? 16 * p.s : type === 'low' ? 34 * p.s : 78 * p.s
  const y = p.y - h - (type === 'high' ? 40 * p.s : 0)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 12
  if (type === 'block') {
    const body = ctx.createLinearGradient(p.x, y, p.x, y + h)
    body.addColorStop(0, '#fb7185')
    body.addColorStop(1, '#be123c')
    ctx.fillStyle = body
    roundRect(ctx, p.x - w / 2, y, w, h, 10 * p.s)
    ctx.fill()
    ctx.fillStyle = '#fff1f2'
    roundRect(ctx, p.x - w * 0.3, y + h * 0.16, w * 0.6, h * 0.24, 5)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    roundRect(ctx, p.x - w * 0.36, y + h * 0.7, w * 0.18, h * 0.16, 3)
    ctx.fill()
    roundRect(ctx, p.x + w * 0.18, y + h * 0.7, w * 0.18, h * 0.16, 3)
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    roundRect(ctx, p.x - w * 0.08, y + 4, w * 0.16, h * 0.08, 3)
    ctx.fill()
  } else if (type === 'low') {
    const crate = ctx.createLinearGradient(p.x, y, p.x, y + h)
    crate.addColorStop(0, '#fde68a')
    crate.addColorStop(1, '#d97706')
    ctx.fillStyle = crate
    roundRect(ctx, p.x - w / 2, y, w, h, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.55)'
    ctx.lineWidth = 2
    ctx.strokeRect(p.x - w * 0.32, y + 6, w * 0.64, h - 12)
    ctx.beginPath()
    ctx.moveTo(p.x - w * 0.32, y + h / 2)
    ctx.lineTo(p.x + w * 0.32, y + h / 2)
    ctx.stroke()
    ctx.fillStyle = '#fff7ed'
    ctx.font = `700 ${Math.max(10, 14 * p.s)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⬆', p.x, y + h / 2)
  } else {
    const bar = ctx.createLinearGradient(p.x, y, p.x, y + h)
    bar.addColorStop(0, '#7dd3fc')
    bar.addColorStop(1, '#0284c7')
    ctx.fillStyle = bar
    roundRect(ctx, p.x - w * 0.72, y, w * 1.44, h, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(p.x - w * 0.55, y + h * 0.35, w * 1.1, 3)
    ctx.fillStyle = '#e0f2fe'
    ctx.font = `700 ${Math.max(10, 13 * p.s)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⬇', p.x, y - 10 * p.s)
  }
  ctx.restore()
}

function drawRunner(ctx, p, state) {
  const s = p.s * 58
  const jump = state.jump * s * 1.45
  const slide = state.slide > 0
  const run = state.time * 13
  const bob = slide ? 0 : Math.sin(run) * s * 0.06
  const swing = slide ? 0 : Math.sin(run) * s * 0.22
  const x = p.x
  const y = p.y - jump + bob

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath()
  ctx.ellipse(x, p.y + 4, s * (slide ? 0.5 : 0.34), s * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(x, y)
  if (slide) ctx.scale(1.2, 0.55)

  // backpack
  ctx.fillStyle = '#1d4ed8'
  roundRect(ctx, s * 0.08, -s * 0.58, s * 0.26, s * 0.38, 8)
  ctx.fill()
  ctx.fillStyle = '#60a5fa'
  roundRect(ctx, s * 0.12, -s * 0.5, s * 0.18, s * 0.08, 4)
  ctx.fill()

  // legs
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = Math.max(4, s * 0.11)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-s * 0.08, -s * 0.05)
  ctx.lineTo(-s * 0.14, s * 0.34 + swing)
  ctx.moveTo(s * 0.1, -s * 0.05)
  ctx.lineTo(s * 0.16, s * 0.34 - swing)
  ctx.stroke()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.ellipse(-s * 0.16, s * 0.36 + swing, s * 0.1, s * 0.05, 0, 0, Math.PI * 2)
  ctx.ellipse(s * 0.18, s * 0.36 - swing, s * 0.1, s * 0.05, 0, 0, Math.PI * 2)
  ctx.fill()

  // torso / hoodie
  const hoodie = ctx.createLinearGradient(-s * 0.3, -s * 0.7, s * 0.3, s * 0.1)
  hoodie.addColorStop(0, '#67e8f9')
  hoodie.addColorStop(0.55, '#22d3ee')
  hoodie.addColorStop(1, '#0891b2')
  ctx.fillStyle = hoodie
  roundRect(ctx, -s * 0.3, -s * 0.62, s * 0.6, s * 0.68, 16)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  roundRect(ctx, -s * 0.12, -s * 0.48, s * 0.24, s * 0.28, 8)
  ctx.fill()
  ctx.strokeStyle = 'rgba(8, 145, 178, 0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.62)
  ctx.lineTo(0, -s * 0.12)
  ctx.stroke()

  // arms
  ctx.strokeStyle = '#06b6d4'
  ctx.lineWidth = Math.max(3.5, s * 0.09)
  ctx.beginPath()
  ctx.moveTo(-s * 0.26, -s * 0.42)
  ctx.lineTo(-s * 0.42, -s * 0.08 - swing * 0.7)
  ctx.moveTo(s * 0.26, -s * 0.42)
  ctx.lineTo(s * 0.4, -s * 0.08 + swing * 0.7)
  ctx.stroke()
  ctx.fillStyle = '#fdba74'
  ctx.beginPath()
  ctx.arc(-s * 0.42, -s * 0.08 - swing * 0.7, s * 0.07, 0, Math.PI * 2)
  ctx.arc(s * 0.4, -s * 0.08 + swing * 0.7, s * 0.07, 0, Math.PI * 2)
  ctx.fill()

  // head
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.86, s * 0.28, s * 0.16, 0, Math.PI, 0)
  ctx.fill()
  const face = ctx.createRadialGradient(-s * 0.08, -s * 0.9, 2, 0, -s * 0.82, s * 0.28)
  face.addColorStop(0, '#ffe8d1')
  face.addColorStop(1, '#f0b27a')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.arc(0, -s * 0.82, s * 0.26, 0, Math.PI * 2)
  ctx.fill()

  // cap
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.98, s * 0.28, s * 0.14, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, -s * 0.02, -s * 1.05, s * 0.34, s * 0.1, 5)
  ctx.fill()
  ctx.fillStyle = '#fecaca'
  roundRect(ctx, -s * 0.08, -s * 1.02, s * 0.16, s * 0.05, 3)
  ctx.fill()

  // eyes & smile
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(-s * 0.09, -s * 0.84, s * 0.06, s * 0.07, 0, 0, Math.PI * 2)
  ctx.ellipse(s * 0.09, -s * 0.84, s * 0.06, s * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-s * 0.08, -s * 0.83, s * 0.028, 0, Math.PI * 2)
  ctx.arc(s * 0.1, -s * 0.83, s * 0.028, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c2410c'
  ctx.lineWidth = Math.max(1.5, s * 0.03)
  ctx.beginPath()
  ctx.arc(0, -s * 0.74, s * 0.08, 0.15, Math.PI - 0.15)
  ctx.stroke()
  ctx.restore()
}
