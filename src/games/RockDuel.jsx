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
  const top = 108
  const bottom = Math.min(h * 0.62, h - 150)
  return top + lane * ((Math.max(bottom, top + 90) - top) / 2)
}

function drawDuel(canvas, state, w, h) {
  if (!canvas || !state || w < 40) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const info = stageInfo(state)
  const t = performance.now() / 1000

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, info.sky[0])
  sky.addColorStop(0.42, info.sky[1])
  sky.addColorStop(1, info.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const moon = ctx.createRadialGradient(w * 0.72, h * 0.16, 4, w * 0.72, h * 0.16, 70)
  moon.addColorStop(0, 'rgba(254,243,199,0.9)')
  moon.addColorStop(0.35, 'rgba(253,224,71,0.22)')
  moon.addColorStop(1, 'rgba(253,224,71,0)')
  ctx.fillStyle = moon
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.16, 70, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 18; i += 1) {
    const sx = (i * 97 + 20) % w
    const sy = (i * 41) % (h * 0.38)
    ctx.globalAlpha = 0.25 + (i % 3) * 0.2
    ctx.beginPath()
    ctx.arc(sx, sy, i % 4 === 0 ? 1.6 : 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  drawCliff(ctx, 0, h, 1)
  drawCliff(ctx, w, h, -1)

  const mist = ctx.createLinearGradient(0, h * 0.55, 0, h)
  mist.addColorStop(0, 'rgba(148,163,184,0)')
  mist.addColorStop(1, 'rgba(15,23,42,0.35)')
  ctx.fillStyle = mist
  ctx.fillRect(0, h * 0.5, w, h * 0.5)

  for (let i = 0; i < 10; i += 1) {
    const px = ((i * 63 + t * 12) % (w + 40)) - 20
    const py = h * 0.35 + (i % 5) * 28 + Math.sin(t + i) * 6
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.arc(px, py, 1.4, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let lane = 0; lane < 3; lane += 1) {
    const y = laneY(h, lane)
    ctx.strokeStyle = 'rgba(125,211,252,0.12)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.moveTo(w * 0.3, y - 6)
    ctx.lineTo(w * 0.7, y - 6)
    ctx.stroke()
    ctx.setLineDash([])
    drawRock(ctx, w * 0.16, y, lane === state.playerLane, '#38bdf8')
    drawRock(ctx, w * 0.84, y, lane === state.botLane, '#fb7185')
  }

  drawFighter(ctx, w * 0.16, laneY(h, state.playerVis), 1, '#38bdf8', '#0ea5e9')
  drawFighter(ctx, w * 0.84, laneY(h, state.botVis), -1, '#fb7185', '#e11d48')

  for (const b of state.bullets) {
    const y = laneY(h, b.lane) - 34
    const color = b.side === 'player' ? '#7dd3fc' : '#fda4af'
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 14
    const g = ctx.createLinearGradient(b.x - 22, y, b.x + 10, y)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, color)
    ctx.strokeStyle = g
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(b.x - 22, y)
    ctx.lineTo(b.x + 8, y)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(b.x + 8, y, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (const f of state.flashes) {
    const x = f.side === 'player' ? w * 0.25 : w * 0.75
    const y = laneY(h, f.lane) - 34
    const g = ctx.createRadialGradient(x, y, 1, x, y, 22)
    g.addColorStop(0, '#fff')
    g.addColorStop(0.4, '#fde68a')
    g.addColorStop(1, 'rgba(251,191,36,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)

  if (state.bannerT > 0) {
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    roundRect(ctx, w / 2 - 120, 52, 240, 40, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(253,224,71,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#fef9c3'
    ctx.font = '800 15px Vazirmatn, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(state.banner, w / 2, 72)
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

function drawCliff(ctx, edge, h, dir) {
  ctx.save()
  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.beginPath()
  ctx.moveTo(edge, 0)
  ctx.lineTo(edge + dir * 70, h * 0.22)
  ctx.lineTo(edge + dir * 36, h)
  ctx.lineTo(edge, h)
  ctx.fill()
  ctx.fillStyle = 'rgba(30,41,59,0.45)'
  ctx.beginPath()
  ctx.moveTo(edge, h * 0.08)
  ctx.lineTo(edge + dir * 48, h * 0.34)
  ctx.lineTo(edge + dir * 22, h)
  ctx.lineTo(edge, h)
  ctx.fill()
  ctx.restore()
}

function drawRock(ctx, x, y, active, glow) {
  ctx.save()
  ctx.translate(x, y)
  if (active) {
    ctx.shadowColor = glow
    ctx.shadowBlur = 18
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(4, 22, 52, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  const body = ctx.createLinearGradient(-48, -22, 46, 20)
  body.addColorStop(0, active ? '#cbd5e1' : '#64748b')
  body.addColorStop(0.45, active ? '#64748b' : '#334155')
  body.addColorStop(1, '#0f172a')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-50, 10)
  ctx.lineTo(-36, -16)
  ctx.quadraticCurveTo(-18, -24, -4, -12)
  ctx.lineTo(16, -20)
  ctx.quadraticCurveTo(36, -16, 48, 6)
  ctx.lineTo(36, 18)
  ctx.lineTo(-40, 18)
  ctx.closePath()
  ctx.fill()
  if (active) {
    ctx.strokeStyle = glow
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath()
  ctx.moveTo(-34, -12)
  ctx.quadraticCurveTo(-10, -20, 8, -10)
  ctx.lineTo(2, -4)
  ctx.quadraticCurveTo(-16, -10, -30, -6)
  ctx.fill()

  ctx.strokeStyle = 'rgba(15,23,42,0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-20, 2)
  ctx.lineTo(-8, 12)
  ctx.moveTo(10, -2)
  ctx.lineTo(22, 10)
  ctx.stroke()

  ctx.fillStyle = active ? '#4ade80' : '#166534'
  ctx.beginPath()
  ctx.ellipse(-18, -8, 7, 3, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFighter(ctx, x, y, face, accent, deep) {
  ctx.save()
  ctx.translate(x, y - 22)
  ctx.scale(face, 1)

  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(0, 36, 16, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  const pants = ctx.createLinearGradient(-12, 6, 12, 34)
  pants.addColorStop(0, '#1e293b')
  pants.addColorStop(1, '#020617')
  ctx.fillStyle = pants
  roundRect(ctx, -11, 6, 9, 26, 4)
  ctx.fill()
  roundRect(ctx, 2, 6, 9, 26, 4)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  roundRect(ctx, -12, 28, 11, 7, 2)
  ctx.fill()
  roundRect(ctx, 2, 28, 11, 7, 2)
  ctx.fill()

  const jacket = ctx.createLinearGradient(-16, -32, 16, 10)
  jacket.addColorStop(0, accent)
  jacket.addColorStop(0.55, deep)
  jacket.addColorStop(1, '#0f172a')
  ctx.fillStyle = jacket
  roundRect(ctx, -15, -30, 30, 40, 10)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, -6, -22, 10, 16, 4)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(-15, 2, 30, 4)

  ctx.fillStyle = '#e7c7a1'
  ctx.fillRect(-3, -40, 8, 12)
  const faceG = ctx.createRadialGradient(-2, -50, 2, 2, -46, 14)
  faceG.addColorStop(0, '#ffe4c4')
  faceG.addColorStop(1, '#d97706')
  ctx.fillStyle = faceG
  ctx.beginPath()
  ctx.ellipse(2, -48, 12, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(1, -56, 13, 8, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-8, -48, 4, 7, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.ellipse(6, -49, 2, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(6.6, -49.6, 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(2, -53)
  ctx.lineTo(9, -52)
  ctx.stroke()

  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(8, -12)
  ctx.lineTo(20, -8)
  ctx.stroke()
  ctx.fillStyle = '#111827'
  roundRect(ctx, 16, -12, 20, 6, 2)
  ctx.fill()
  ctx.fillStyle = accent
  ctx.fillRect(34, -11, 5, 4)
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(20, -8, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
