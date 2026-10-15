import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  BEASTS,
  createHunt,
  shoot,
  spawnStage,
  updateHunt,
} from './beastHuntLogic'
import { playCheer, playFlip, playPop } from '../utils/sounds'

export default function BeastHunt() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0, down: false })
  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState({ score: 0, level: 1, stage: 1, hp: 0, maxHp: 0, name: '' })

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
    const state = createHunt()
    stateRef.current = state
    let last = performance.now()
    let shown = -1
    let booted = false

    const heroPos = (w, h) => ({ x: Math.max(48, w * 0.14), y: h * 0.62 })

    const boot = () => {
      const size = measure()
      if (size.w < 80 || size.h < 80) return false
      spawnStage(state, size.w)
      setHud({
        score: 0,
        level: 1,
        stage: 1,
        hp: state.beast.hp,
        maxHp: state.beast.maxHp,
        name: state.beast.name,
      })
      booted = true
      return true
    }
    boot()

    const aimFromPointer = (w, h) => {
      const hero = heroPos(w, h)
      const p = pointerRef.current
      // همیشه کمی به سمت حیوان قفل می‌شود تا بازی روان باشد
      let tx = p.x || w * 0.7
      let ty = p.y || h * 0.58
      if (state.beast && !state.beast.dead) {
        const by = state.beast.drawY || h * 0.58
        const bx = state.beast.x - 24
        tx = tx * 0.25 + bx * 0.75
        ty = ty * 0.25 + by * 0.75
      }
      const dx = tx - hero.x
      const dy = ty - (hero.y - 22)
      let angle = Math.atan2(dy, Math.max(12, dx))
      angle = Math.max(-1.15, Math.min(0.85, angle))
      state.aim = angle
    }

    const onPointer = (event) => {
      const rect = wrap.getBoundingClientRect()
      const point = event.touches?.[0] || event.changedTouches?.[0] || event
      pointerRef.current.x = (point.clientX ?? 0) - rect.left
      pointerRef.current.y = (point.clientY ?? 0) - rect.top
      aimFromPointer(rect.width, rect.height)
    }
    const onDown = (event) => {
      pointerRef.current.down = true
      onPointer(event)
      const rect = wrap.getBoundingClientRect()
      const hero = heroPos(rect.width, rect.height)
      if (shoot(stateRef.current, hero.x, hero.y)) playPop()
    }
    const onUp = () => {
      pointerRef.current.down = false
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const rect = wrap.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const state = stateRef.current
      const hero = heroPos(w, h)
      if (!booted) boot()
      aimFromPointer(w, h)

      if (state?.alive && state.beast && phaseRef.current === 'playing') {
        if (pointerRef.current.down && state.cooldown <= 0) {
          if (shoot(state, hero.x, hero.y)) playPop()
        }
        const result = updateHunt(state, dt, w, h, hero.x)
        if (result.hit) playFlip()
        if (result.event === 'kill') playCheer()
        if (result.event === 'lost') {
          playCheer()
          setHud((prev) => ({ ...prev, score: state.score }))
          phaseRef.current = 'over'
          setPhase('over')
        } else {
          const key = state.score * 1000 + state.beast.hp + state.level * 100 + state.stage
          if (key !== shown) {
            shown = key
            setHud({
              score: state.score,
              level: state.level,
              stage: state.stage + 1,
              hp: Math.max(0, state.beast.hp),
              maxHp: state.beast.maxHp,
              name: state.beast.name,
            })
          }
        }
      }
      drawScene(canvas, state, w, h, hero)
      rafRef.current = requestAnimationFrame(paint)
    }

    wrap.addEventListener('pointermove', onPointer)
    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointerleave', onUp)
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      wrap.removeEventListener('pointermove', onPointer)
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointerleave', onUp)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  return (
    <GameShell title="نگهبان جنگل" emoji="🏹" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`beast-hunt ${phase === 'playing' ? 'beast-hunt--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">۱۰ مرحله حیوان</p>
            <div className="beast-intro" aria-hidden="true">🏹 🐍 🦁 🐉</div>
            <h2 className="level-panel__title">نشانه بگیر و قبل از رسیدن حیوان بزن</h2>
            <p className="level-panel__meta">
              مار ۲ تیر · شیر ۸ تیر · اژدها ۱۰ تیر. بعد از ۱۰ مرحله، لول بعد سخت‌تر می‌شود.
            </p>
            <p className="beast-roster-line">
              {BEASTS.map((b) => `${b.name} ${b.hits}`).join(' · ')}
            </p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              شروع دفاع
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="snake-arena" ref={wrapRef}>
            <canvas ref={canvasRef} className="snake-canvas" />
            <div className="star-hud beast-hud">
              <div className="star-hud__chip">
                <span>لول {hud.level}</span>
                <strong>مرحله {hud.stage}/10</strong>
              </div>
              <div className="star-hud__chip star-hud__chip--score">
                <span>{hud.name}</span>
                <strong>
                  {hud.hp}/{hud.maxHp}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="beast-fire"
              aria-label="شلیک"
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                pointerRef.current.down = true
                const rect = wrapRef.current.getBoundingClientRect()
                const hero = { x: Math.max(48, rect.width * 0.14), y: rect.height * 0.62 }
                const st = stateRef.current
                if (st?.beast) {
                  const by = st.beast.drawY || rect.height * 0.58
                  st.aim = Math.atan2(by - (hero.y - 22), Math.max(12, st.beast.x - 24 - hero.x))
                }
                if (shoot(st, hero.x, hero.y)) playPop()
              }}
              onPointerUp={() => {
                pointerRef.current.down = false
              }}
              onPointerLeave={() => {
                pointerRef.current.down = false
              }}
            >
              🏹 شلیک
            </button>
            <p className="beast-hint">لمس صفحه یا دکمه شلیک</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
            <p className="level-panel__meta">
              لول {hud.level} · مرحله {hud.stage}
            </p>
            <button type="button" className="primary-btn snake-start" onClick={() => setPhase('playing')}>
              دوباره دفاع کن
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
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

function drawScene(canvas, state, w, h, hero) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(0.45, '#bae6fd')
  sky.addColorStop(1, '#86efac')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // تپه‌ها
  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.72)
  ctx.quadraticCurveTo(w * 0.25, h * 0.58, w * 0.5, h * 0.7)
  ctx.quadraticCurveTo(w * 0.75, h * 0.82, w, h * 0.66)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(0, h * 0.78, w, h * 0.22)

  // درختان دور
  for (let i = 0; i < 6; i += 1) {
    const tx = w * 0.35 + i * w * 0.12
    ctx.fillStyle = '#166534'
    ctx.beginPath()
    ctx.moveTo(tx, h * 0.55)
    ctx.lineTo(tx + 28, h * 0.78)
    ctx.lineTo(tx - 28, h * 0.78)
    ctx.fill()
  }

  // زمین سنگی زیر قهرمان
  ctx.fillStyle = '#a8a29e'
  ctx.beginPath()
  ctx.ellipse(hero.x, hero.y + 48, 42, 12, 0, 0, Math.PI * 2)
  ctx.fill()

  drawHero(ctx, hero.x, hero.y, state.aim, state.cooldown)

  if (state.beast) {
    drawBeast(ctx, state.beast, state.beast.drawY || h * 0.58)
  }

  for (const b of state.bullets) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(Math.atan2(b.vy, b.vx))
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(-8, -3.5)
    ctx.lineTo(-6, 0)
    ctx.lineTo(-8, 3.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(-10, -2, 6, 4)
    ctx.restore()
  }

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (state.bannerT > 0 && state.banner) {
    ctx.fillStyle = 'rgba(15,23,42,0.72)'
    roundRect(ctx, w / 2 - 130, 58, 260, 40, 14)
    ctx.fill()
    ctx.fillStyle = '#fef9c3'
    ctx.font = '800 15px Vazirmatn, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(state.banner, w / 2, 78)
  }

  // نوار جان حیوان
  if (state.beast && !state.beast.dead) {
    const barW = 140
    const bx = w - barW - 16
    const by = 56
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    roundRect(ctx, bx, by, barW, 14, 7)
    ctx.fill()
    const ratio = state.beast.hp / state.beast.maxHp
    ctx.fillStyle = state.beast.accent
    roundRect(ctx, bx, by, Math.max(8, barW * ratio), 14, 7)
    ctx.fill()
  }
}

function drawHero(ctx, x, y, aim, cooldown) {
  ctx.save()
  ctx.translate(x, y)

  // سایه
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(0, 50, 28, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // پاها — شلوار جین
  ctx.fillStyle = '#1e3a8a'
  roundRect(ctx, -14, 6, 12, 36, 4)
  ctx.fill()
  roundRect(ctx, 4, 6, 12, 36, 4)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  roundRect(ctx, -16, 38, 14, 8, 3)
  ctx.fill()
  roundRect(ctx, 4, 38, 14, 8, 3)
  ctx.fill()

  // بالاتنه
  const shirt = ctx.createLinearGradient(-18, -40, 18, 10)
  shirt.addColorStop(0, '#7dd3fc')
  shirt.addColorStop(0.5, '#0ea5e9')
  shirt.addColorStop(1, '#0369a1')
  ctx.fillStyle = shirt
  roundRect(ctx, -18, -38, 36, 48, 12)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  roundRect(ctx, -8, -28, 14, 20, 4)
  ctx.fill()

  // کمربند و تیردان
  ctx.fillStyle = '#78350f'
  ctx.fillRect(-18, 0, 36, 7)
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.arc(0, 3.5, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#92400e'
  roundRect(ctx, -32, -22, 14, 32, 5)
  ctx.fill()
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.moveTo(-28, -16 + i * 7)
    ctx.lineTo(-22, -16 + i * 7)
    ctx.stroke()
  }

  // گردن و سر نوجوان
  ctx.fillStyle = '#e8a86a'
  ctx.fillRect(-4, -48, 10, 12)
  const face = ctx.createRadialGradient(-2, -58, 2, 2, -54, 18)
  face.addColorStop(0, '#ffe8d1')
  face.addColorStop(1, '#d97706')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.ellipse(2, -56, 15, 17, 0, 0, Math.PI * 2)
  ctx.fill()

  // مو کوتاه
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.ellipse(0, -68, 16, 10, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-14, -62)
  ctx.quadraticCurveTo(-18, -48, -8, -50)
  ctx.quadraticCurveTo(-10, -60, -14, -62)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(12, -64)
  ctx.quadraticCurveTo(18, -52, 10, -50)
  ctx.quadraticCurveTo(12, -60, 12, -64)
  ctx.fill()

  // صورت
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(6, -58, 2.4, 2.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(6.8, -58.8, 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(1, -63)
  ctx.lineTo(10, -62)
  ctx.stroke()
  ctx.strokeStyle = '#92400e'
  ctx.beginPath()
  ctx.arc(7, -50, 4.5, 0.15, Math.PI - 0.15)
  ctx.stroke()

  // بازو و کمان
  ctx.save()
  ctx.translate(12, -20)
  ctx.rotate(aim)
  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10, 2)
  ctx.lineTo(-24, 8)
  ctx.stroke()
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(20, 0, 24, -1.15, 1.15)
  ctx.stroke()
  ctx.strokeStyle = '#f5f5f4'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(20 + Math.cos(-1.15) * 24, Math.sin(-1.15) * 24)
  ctx.lineTo(2, 0)
  ctx.lineTo(20 + Math.cos(1.15) * 24, Math.sin(1.15) * 24)
  ctx.stroke()
  if (cooldown < 0.1) {
    ctx.fillStyle = '#fbbf24'
    roundRect(ctx, 2, -2.5, 30, 5, 2)
    ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(32, 0)
    ctx.lineTo(40, -5)
    ctx.lineTo(40, 5)
    ctx.fill()
  }
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(2, 0, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.restore()
}

function drawBeast(ctx, beast, y) {
  const x = beast.x
  const hurt = beast.hurt > 0
  const alpha = beast.dead ? Math.max(0, 1 - beast.dieT * 1.2) : 1
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x + (hurt ? Math.sin(beast.hurt * 40) * 4 : 0), y + (beast.dead ? beast.dieT * 30 : 0))
  if (hurt) ctx.filter = 'brightness(1.35)'

  switch (beast.id) {
    case 'snake':
      drawSnake(ctx)
      break
    case 'fox':
      drawFox(ctx)
      break
    case 'eagle':
      drawEagle(ctx)
      break
    case 'wolf':
      drawWolf(ctx)
      break
    case 'boar':
      drawBoar(ctx)
      break
    case 'croc':
      drawCroc(ctx)
      break
    case 'lion':
      drawLion(ctx)
      break
    case 'bear':
      drawBear(ctx)
      break
    case 'tiger':
      drawTiger(ctx)
      break
    case 'dragon':
      drawDragon(ctx, beast.bob)
      break
    default:
      drawLion(ctx)
  }

  ctx.filter = 'none'
  ctx.restore()
}

function drawSnake(ctx) {
  // بدن موج‌دار از راست به چپ (سر سمت چپ به سمت قهرمان)
  ctx.strokeStyle = '#15803d'
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(70, 10)
  ctx.bezierCurveTo(50, -18, 30, 28, 10, 0)
  ctx.bezierCurveTo(-5, -16, -20, 20, -40, 4)
  ctx.stroke()
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(66, 8)
  ctx.bezierCurveTo(48, -12, 28, 20, 8, 0)
  ctx.stroke()
  // سر
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.ellipse(-52, 2, 22, 16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(-58, -4, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-58, -4, 2, 0, Math.PI * 2)
  ctx.fill()
  // زبان
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-72, 4)
  ctx.lineTo(-84, 0)
  ctx.lineTo(-72, 8)
  ctx.stroke()
}

function drawFox(ctx) {
  ctx.fillStyle = '#ea580c'
  ctx.beginPath()
  ctx.ellipse(10, 12, 36, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  // دم پشمالو
  ctx.beginPath()
  ctx.moveTo(40, 8)
  ctx.quadraticCurveTo(70, -20, 78, 18)
  ctx.quadraticCurveTo(55, 28, 40, 16)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.ellipse(72, 8, 10, 8, 0.3, 0, Math.PI * 2)
  ctx.fill()
  // سر
  ctx.fillStyle = '#c2410c'
  ctx.beginPath()
  ctx.ellipse(-28, -6, 22, 18, 0, 0, Math.PI * 2)
  ctx.fill()
  // گوش‌های تیز
  ctx.beginPath()
  ctx.moveTo(-38, -18)
  ctx.lineTo(-44, -42)
  ctx.lineTo(-26, -24)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-18, -20)
  ctx.lineTo(-10, -40)
  ctx.lineTo(-4, -18)
  ctx.fill()
  ctx.fillStyle = '#fdba74'
  ctx.beginPath()
  ctx.moveTo(-40, -22)
  ctx.lineTo(-42, -34)
  ctx.lineTo(-32, -24)
  ctx.fill()
  // پوزه سفید
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.ellipse(-40, 2, 12, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-48, 0, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-30, -10, 3, 0, Math.PI * 2)
  ctx.fill()
  // پاها
  ctx.strokeStyle = '#9a3412'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, 28)
  ctx.lineTo(-12, 44)
  ctx.moveTo(18, 28)
  ctx.lineTo(22, 44)
  ctx.stroke()
}

function drawEagle(ctx) {
  // بال‌ها
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(-10, -8, 20, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.quadraticCurveTo(40, -50, 70, -8)
  ctx.quadraticCurveTo(35, -18, 0, 4)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-5, -6)
  ctx.quadraticCurveTo(-50, -40, -75, 5)
  ctx.quadraticCurveTo(-40, -8, -8, 8)
  ctx.fill()
  // سر و منقار
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.arc(-28, -18, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-38, -18)
  ctx.lineTo(-58, -14)
  ctx.lineTo(-38, -10)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-30, -20, 2.5, 0, Math.PI * 2)
  ctx.fill()
  // چنگال
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-6, 10)
  ctx.lineTo(-14, 24)
  ctx.moveTo(4, 10)
  ctx.lineTo(10, 24)
  ctx.stroke()
}

function drawWolf(ctx) {
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.ellipse(8, 10, 38, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(40, 0)
  ctx.quadraticCurveTo(68, -8, 62, 22)
  ctx.quadraticCurveTo(48, 18, 40, 12)
  ctx.fill()
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.ellipse(-30, -8, 24, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  // گوش
  ctx.beginPath()
  ctx.moveTo(-42, -20)
  ctx.lineTo(-48, -44)
  ctx.lineTo(-30, -26)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-22, -22)
  ctx.lineTo(-14, -42)
  ctx.lineTo(-8, -20)
  ctx.fill()
  ctx.fillStyle = '#d6d3d1'
  ctx.beginPath()
  ctx.ellipse(-42, 2, 12, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-50, 0, 3, 0, Math.PI * 2)
  ctx.arc(-28, -12, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(-28, -12, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#292524'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10, 28)
  ctx.lineTo(-14, 46)
  ctx.moveTo(20, 28)
  ctx.lineTo(24, 46)
  ctx.stroke()
}

function drawBoar(ctx) {
  ctx.fillStyle = '#78716c'
  ctx.beginPath()
  ctx.ellipse(5, 8, 40, 28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.ellipse(-32, 4, 26, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  // عاج
  ctx.strokeStyle = '#f5f5f4'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-48, 10)
  ctx.quadraticCurveTo(-62, 18, -54, 2)
  ctx.moveTo(-44, 14)
  ctx.quadraticCurveTo(-58, 24, -50, 8)
  ctx.stroke()
  // پوزه
  ctx.fillStyle = '#a8a29e'
  ctx.beginPath()
  ctx.ellipse(-52, 8, 14, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#292524'
  ctx.beginPath()
  ctx.arc(-56, 6, 2.5, 0, Math.PI * 2)
  ctx.arc(-56, 12, 2.5, 0, Math.PI * 2)
  ctx.arc(-28, -4, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.ellipse(-20, -22, 8, 10, 0, 0, Math.PI * 2)
  ctx.ellipse(-8, -20, 7, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#44403c'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-12, 30)
  ctx.lineTo(-16, 48)
  ctx.moveTo(18, 30)
  ctx.lineTo(22, 48)
  ctx.stroke()
}

function drawCroc(ctx) {
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.ellipse(10, 14, 48, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  // پوزه بلند
  ctx.beginPath()
  ctx.moveTo(-30, 8)
  ctx.lineTo(-90, 4)
  ctx.lineTo(-90, 18)
  ctx.lineTo(-30, 22)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#14532d'
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath()
    ctx.moveTo(-10 + i * 16, -2)
    ctx.lineTo(-2 + i * 16, -14)
    ctx.lineTo(6 + i * 16, -2)
    ctx.fill()
  }
  // دندان
  ctx.fillStyle = '#fefce8'
  for (let i = 0; i < 6; i += 1) {
    ctx.fillRect(-86 + i * 9, 8, 5, 6)
  }
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(-40, 2, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-40, 2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#14532d'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-8, 28)
  ctx.lineTo(-16, 40)
  ctx.moveTo(24, 28)
  ctx.lineTo(30, 40)
  ctx.stroke()
}

function drawLion(ctx) {
  // یال
  ctx.fillStyle = '#b45309'
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * 28 - 22, Math.sin(a) * 28 - 8, 12, 16, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#eab308'
  ctx.beginPath()
  ctx.ellipse(12, 14, 36, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ca8a04'
  ctx.beginPath()
  ctx.arc(-22, -8, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.ellipse(-34, 2, 12, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-42, 0, 3, 0, Math.PI * 2)
  ctx.arc(-18, -12, 3.5, 0, Math.PI * 2)
  ctx.arc(-30, -12, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-17, -13, 1.2, 0, Math.PI * 2)
  ctx.arc(-29, -13, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, 32)
  ctx.lineTo(-8, 50)
  ctx.moveTo(24, 32)
  ctx.lineTo(28, 50)
  ctx.stroke()
  // دم
  ctx.beginPath()
  ctx.moveTo(44, 8)
  ctx.quadraticCurveTo(70, -10, 66, 20)
  ctx.stroke()
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.arc(66, 20, 6, 0, Math.PI * 2)
  ctx.fill()
}

function drawBear(ctx) {
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(8, 8, 42, 32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-28, -10, 28, 0, Math.PI * 2)
  ctx.fill()
  // گوش گرد
  ctx.beginPath()
  ctx.arc(-42, -30, 12, 0, Math.PI * 2)
  ctx.arc(-14, -32, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a16207'
  ctx.beginPath()
  ctx.arc(-42, -30, 6, 0, Math.PI * 2)
  ctx.arc(-14, -32, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.ellipse(-40, 0, 14, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-48, -2, 3, 0, Math.PI * 2)
  ctx.arc(-28, -14, 3.5, 0, Math.PI * 2)
  ctx.arc(-16, -14, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#5c3d1e'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10, 34)
  ctx.lineTo(-14, 52)
  ctx.moveTo(22, 34)
  ctx.lineTo(26, 52)
  ctx.stroke()
}

function drawTiger(ctx) {
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.ellipse(10, 10, 40, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  // راه راه‌ها
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-5, -8)
  ctx.quadraticCurveTo(0, 10, -5, 28)
  ctx.moveTo(12, -10)
  ctx.quadraticCurveTo(18, 10, 12, 30)
  ctx.moveTo(28, -6)
  ctx.quadraticCurveTo(34, 10, 28, 26)
  ctx.stroke()
  ctx.fillStyle = '#ea580c'
  ctx.beginPath()
  ctx.ellipse(-30, -6, 24, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(-42, -18)
  ctx.lineTo(-48, -40)
  ctx.lineTo(-30, -24)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-22, -20)
  ctx.lineTo(-14, -38)
  ctx.lineTo(-8, -18)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.ellipse(-42, 4, 12, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-50, 2, 3, 0, Math.PI * 2)
  ctx.arc(-28, -10, 3.2, 0, Math.PI * 2)
  ctx.arc(-18, -10, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c2410c'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, 30)
  ctx.lineTo(-12, 48)
  ctx.moveTo(22, 30)
  ctx.lineTo(26, 48)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(46, 4)
  ctx.quadraticCurveTo(72, -16, 70, 18)
  ctx.stroke()
}

function drawDragon(ctx, bob) {
  const flap = Math.sin(bob * 5) * 10
  // بال‌ها
  ctx.fillStyle = '#6d28d9'
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.quadraticCurveTo(30, -55 + flap, 80, -20)
  ctx.quadraticCurveTo(40, -25, 8, 8)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(5, -8)
  ctx.quadraticCurveTo(-20, -50 - flap, -40, -5)
  ctx.quadraticCurveTo(-10, -18, 10, 6)
  ctx.fill()
  // بدن
  ctx.fillStyle = '#7c3aed'
  ctx.beginPath()
  ctx.ellipse(8, 8, 44, 28, 0, 0, Math.PI * 2)
  ctx.fill()
  // فلس
  ctx.fillStyle = '#a78bfa'
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.arc(-5 + i * 16, 0, 7, 0, Math.PI * 2)
    ctx.fill()
  }
  // گردن و سر
  ctx.fillStyle = '#5b21b6'
  ctx.beginPath()
  ctx.ellipse(-40, -8, 22, 16, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-68, -14, 26, 18, 0, 0, Math.PI * 2)
  ctx.fill()
  // شاخ
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(-70, -28)
  ctx.lineTo(-66, -48)
  ctx.lineTo(-58, -26)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-56, -28)
  ctx.lineTo(-48, -46)
  ctx.lineTo(-44, -24)
  ctx.fill()
  // دهان باز
  ctx.fillStyle = '#4c1d95'
  ctx.beginPath()
  ctx.ellipse(-88, -8, 18, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#9f1239'
  ctx.beginPath()
  ctx.ellipse(-92, -6, 12, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  ctx.fillRect(-98, -12, 5, 5)
  ctx.fillRect(-90, -12, 5, 5)
  // چشم
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-70, -20, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-70, -20, 2.5, 0, Math.PI * 2)
  ctx.fill()
  // دم
  ctx.strokeStyle = '#6d28d9'
  ctx.lineWidth = 14
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(48, 8)
  ctx.quadraticCurveTo(80, -20, 95, 24)
  ctx.stroke()
  ctx.fillStyle = '#c084fc'
  ctx.beginPath()
  ctx.moveTo(90, 18)
  ctx.lineTo(108, 10)
  ctx.lineTo(100, 32)
  ctx.fill()
  // پاها
  ctx.strokeStyle = '#4c1d95'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(-8, 30)
  ctx.lineTo(-14, 48)
  ctx.moveTo(24, 30)
  ctx.lineTo(30, 48)
  ctx.stroke()
}
