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
            <div className="snake-glass-hud">
              <div className="glass-chip"><span>میوه</span><strong>{hud.fruits}</strong></div>
              <div className="glass-chip glass-chip--score"><span>امتیاز</span><strong>{hud.score}</strong></div>
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
    const size = 28 * p.s
    ctx.font = `${Math.max(16, size)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.emoji, p.x, p.y - (item.kind === 'animal' && item.type === 'high' ? 28 * p.s : 0))
  }

  const hero = project(w, h, state.visualLane, 0.2)
  const jumpY = hero.y - state.jump * 52
  const squash = state.slide > 0 ? 0.55 : 1
  ctx.save()
  ctx.translate(hero.x, jumpY)
  ctx.scale(1, squash)
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.arc(0, -18, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fdba74'
  ctx.beginPath()
  ctx.arc(0, -34, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-4, -36, 2, 0, Math.PI * 2)
  ctx.arc(4, -36, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
