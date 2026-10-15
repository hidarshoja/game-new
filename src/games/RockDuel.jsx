import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  HITS_TO_WIN,
  STAGES,
  createDuel,
  movePlayer,
  releaseShot,
  shootPlayer,
  stageInfo,
  updateDuel,
} from './rockDuelLogic'
import { playCheer, playFlip, playPop } from '../utils/sounds'

export default function RockDuel() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState({ you: 0, bot: 0, stage: 'دره', n: 1 })

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
    const state = createDuel()
    stateRef.current = state
    let last = performance.now()
    let shown = ''
    let booted = false

    const boot = () => {
      const size = measure()
      if (size.w < 80) return false
      state.banner = stageInfo(state).title
      setHud({ you: 0, bot: 0, stage: state.banner, n: 1 })
      booted = true
      return true
    }
    boot()

    const sync = (st) => {
      const info = stageInfo(st)
      setHud({
        you: HITS_TO_WIN - st.playerHits,
        bot: HITS_TO_WIN - st.botHits,
        stage: info.title,
        n: (st.loop * STAGES.length) + (st.stage % STAGES.length) + 1,
      })
    }

    const onKey = (event) => {
      const st = stateRef.current
      if (!st) return
      if (event.key === 'ArrowUp' || event.key === 'w') {
        event.preventDefault()
        if (movePlayer(st, -1)) playFlip()
      }
      if (event.key === 'ArrowDown' || event.key === 's') {
        event.preventDefault()
        if (movePlayer(st, 1)) playFlip()
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        const rect = wrap.getBoundingClientRect()
        if (shootPlayer(st, rect.width)) playPop()
      }
      if (event.key === 'Escape') releaseShot(st)
    }
    const onUp = (event) => {
      if (event.key === ' ' || event.key === 'Enter') releaseShot(stateRef.current)
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const rect = wrap.getBoundingClientRect()
      if (!booted) boot()
      const st = stateRef.current
      if (st && phaseRef.current === 'playing') {
        const result = updateDuel(st, dt, rect.width)
        if (result.event === 'hit-bot' || result.event === 'hit-you') playFlip()
        if (result.event === 'win') playCheer()
        if (result.event === 'lose') {
          playCheer()
          sync(st)
          phaseRef.current = 'over'
          setPhase('over')
        }
        const key = `${st.playerHits}-${st.botHits}-${st.stage}-${st.loop}-${st.winner}`
        if (key !== shown) {
          shown = key
          sync(st)
        }
      }
      drawDuel(canvas, st, rect.width, rect.height)
      rafRef.current = requestAnimationFrame(paint)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  const hop = (dir) => {
    if (movePlayer(stateRef.current, dir)) playFlip()
  }
  const fire = () => {
    const wrap = wrapRef.current
    if (!wrap) return
    if (shootPlayer(stateRef.current, wrap.getBoundingClientRect().width)) playPop()
  }

  return (
    <GameShell title="دوئل صخره" emoji="🪨" scoreLabel="جان تو" score={hud.you} actions={null}>
      <div className={`rock-duel ${phase === 'playing' ? 'rock-duel--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۱۸</p>
            <div className="beast-intro" aria-hidden="true">🪨 ⚡ 🪨</div>
            <h2 className="level-panel__title">روی صخره‌ها بپر و تیر بزن</h2>
            <p className="level-panel__meta">
              هر طرف سه صخره دارد. جاخالی بده. هرکس ۱۰ تیر بخورد می‌بازد. بعد مرحله سخت‌تر می‌شود.
            </p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع دوئل
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="star-hud beast-hud">
              <div className="star-hud__chip">
                <span>تو</span>
                <strong>{hud.you}/{HITS_TO_WIN}</strong>
              </div>
              <div className="star-hud__chip star-hud__chip--score">
                <span>ربات · {hud.stage}</span>
                <strong>{hud.bot}/{HITS_TO_WIN}</strong>
              </div>
            </div>
            <div className="duel-pad" dir="ltr">
              <button type="button" className="glass-btn" onPointerDown={() => hop(-1)} aria-label="صخره بالا">▲</button>
              <button
                type="button"
                className="beast-fire duel-fire"
                aria-label="شلیک"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  fire()
                }}
                onPointerUp={() => releaseShot(stateRef.current)}
                onPointerLeave={() => releaseShot(stateRef.current)}
              >
                شلیک
              </button>
              <button type="button" className="glass-btn" onPointerDown={() => hop(1)} aria-label="صخره پایین">▼</button>
            </div>
          </div>
        )}
        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{Math.max(0, HITS_TO_WIN - hud.bot)}</div>
            <p className="level-panel__meta">مرحله {hud.n} · {hud.stage}</p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              دوئل دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function laneY(h, lane) {
  const top = 128
  const bottom = Math.max(top + 80, h - 118)
  return top + lane * ((bottom - top) / 2)
}

function drawDuel(canvas, state, w, h) {
  if (!canvas || !state || w < 40) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const info = stageInfo(state)
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, info.sky[0])
  sky.addColorStop(0.55, info.sky[1])
  sky.addColorStop(1, info.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // دیوار دره
  ctx.fillStyle = 'rgba(15,23,42,0.35)'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.12)
  ctx.lineTo(w * 0.18, h)
  ctx.lineTo(0, h)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w, h * 0.12)
  ctx.lineTo(w * 0.82, h)
  ctx.lineTo(w, h)
  ctx.fill()

  for (let lane = 0; lane < 3; lane += 1) {
    const y = laneY(h, lane)
    drawRock(ctx, w * 0.16, y, lane === state.playerLane)
    drawRock(ctx, w * 0.84, y, lane === state.botLane)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.setLineDash([6, 10])
    ctx.beginPath()
    ctx.moveTo(w * 0.28, y)
    ctx.lineTo(w * 0.72, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  drawFighter(ctx, w * 0.16, laneY(h, state.playerVis), 1, '#38bdf8')
  drawFighter(ctx, w * 0.84, laneY(h, state.botVis), -1, '#fb7185')

  for (const b of state.bullets) {
    const y = laneY(h, b.lane)
    ctx.save()
    ctx.shadowColor = b.side === 'player' ? '#38bdf8' : '#fb7185'
    ctx.shadowBlur = 12
    ctx.fillStyle = b.side === 'player' ? '#e0f2fe' : '#ffe4e6'
    ctx.beginPath()
    ctx.ellipse(b.x, y - 28, 10, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (const f of state.flashes) {
    const x = f.side === 'player' ? w * 0.24 : w * 0.76
    const y = laneY(h, f.lane) - 28
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16)
    g.addColorStop(0, '#fff')
    g.addColorStop(1, 'rgba(251,191,36,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, 16, 0, Math.PI * 2)
    ctx.fill()
  }

  if (state.bannerT > 0) {
    ctx.fillStyle = 'rgba(15,23,42,0.75)'
    roundRect(ctx, w / 2 - 110, h * 0.08, 220, 36, 12)
    ctx.fill()
    ctx.fillStyle = '#fef9c3'
    ctx.font = '800 15px Vazirmatn, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(state.banner, w / 2, h * 0.08 + 18)
  }
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

function drawRock(ctx, x, y, active) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 18, 46, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  const rock = ctx.createLinearGradient(-40, -16, 40, 22)
  rock.addColorStop(0, active ? '#94a3b8' : '#64748b')
  rock.addColorStop(1, active ? '#334155' : '#1e293b')
  ctx.fillStyle = rock
  ctx.beginPath()
  ctx.moveTo(-42, 8)
  ctx.lineTo(-28, -14)
  ctx.lineTo(-6, -8)
  ctx.lineTo(12, -18)
  ctx.lineTo(40, 4)
  ctx.lineTo(30, 16)
  ctx.lineTo(-34, 16)
  ctx.closePath()
  ctx.fill()
  if (active) {
    ctx.strokeStyle = 'rgba(253,224,71,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()
}

function drawFighter(ctx, x, y, face, accent) {
  ctx.save()
  ctx.translate(x, y - 18)
  ctx.scale(face, 1)
  ctx.fillStyle = '#1e293b'
  roundRect(ctx, -8, 8, 7, 22, 3)
  ctx.fill()
  roundRect(ctx, 3, 8, 7, 22, 3)
  ctx.fill()
  const jacket = ctx.createLinearGradient(-14, -28, 14, 12)
  jacket.addColorStop(0, accent)
  jacket.addColorStop(1, '#0f172a')
  ctx.fillStyle = jacket
  roundRect(ctx, -14, -26, 28, 36, 8)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(2, -38, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(0, -46, 12, 7, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(5, -39, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  roundRect(ctx, 8, -16, 18, 5, 2)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(24, -15, 6, 3)
  ctx.restore()
}
