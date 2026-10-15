import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  BEASTS,
  MAG_SIZE,
  createHunt,
  onPointerRelease,
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
  const [hud, setHud] = useState({ score: 0, level: 1, stage: 1, hp: 0, maxHp: 0, name: '', ammo: MAG_SIZE, reload: 0 })

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

    const heroPos = (w, h) => ({ x: Math.max(52, w * 0.13), y: h * 0.64 })

    const syncHud = (st) => {
      if (!st?.beast) return
      setHud({
        score: st.score,
        level: st.level,
        stage: st.stage + 1,
        hp: Math.max(0, st.beast.hp),
        maxHp: st.beast.maxHp,
        name: st.beast.name,
        ammo: st.ammo,
        reload: st.reload,
      })
    }

    const boot = () => {
      const size = measure()
      if (size.w < 80 || size.h < 80) return false
      spawnStage(state, size.w)
      syncHud(state)
      booted = true
      return true
    }
    boot()

    const aimFromPointer = (w, h) => {
      const hero = heroPos(w, h)
      const p = pointerRef.current
      // بدون قفل خودکار — فقط جایی که انگشت است
      const tx = p.x || w * 0.75
      const ty = p.y || h * 0.55
      const dx = tx - hero.x
      const dy = ty - (hero.y - 24)
      state.aim = Math.max(-1.2, Math.min(0.9, Math.atan2(dy, Math.max(16, dx))))
    }

    const tryShoot = () => {
      const rect = wrap.getBoundingClientRect()
      const hero = heroPos(rect.width, rect.height)
      if (shoot(stateRef.current, hero.x, hero.y)) {
        playPop()
        syncHud(stateRef.current)
      }
    }

    const onPointer = (event) => {
      const rect = wrap.getBoundingClientRect()
      const point = event.touches?.[0] || event.changedTouches?.[0] || event
      pointerRef.current.x = (point.clientX ?? 0) - rect.left
      pointerRef.current.y = (point.clientY ?? 0) - rect.top
      aimFromPointer(rect.width, rect.height)
    }
    const onDown = (event) => {
      if (event.target?.closest?.('.beast-fire')) return
      pointerRef.current.down = true
      onPointer(event)
      tryShoot()
    }
    const onUp = () => {
      pointerRef.current.down = false
      onPointerRelease(stateRef.current)
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const rect = wrap.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const st = stateRef.current
      const hero = heroPos(w, h)
      if (!booted) boot()
      aimFromPointer(w, h)
      // نگه‌داشتن انگشت دیگر تیر پشت‌سرهم نمی‌زند

      if ((st?.alive || st?.eaten) && st.beast && phaseRef.current === 'playing') {
        const result = updateHunt(st, dt, w, h, hero.x, hero.y)
        if (result.hit) playFlip()
        if (result.event === 'kill') playCheer()
        if (result.event === 'eaten') playFlip()
        if (result.event === 'lost') {
          playCheer()
          setHud((prev) => ({ ...prev, score: st.score }))
          phaseRef.current = 'over'
          setPhase('over')
        } else {
          const key = `${st.score}-${st.beast.hp}-${st.ammo}-${st.reload.toFixed(1)}-${st.level}-${st.stage}`
          if (key !== shown) {
            shown = key
            syncHud(st)
          }
        }
      }
      drawScene(canvas, st, w, h, hero, pointerRef.current)
      rafRef.current = requestAnimationFrame(paint)
    }

    wrap.addEventListener('pointermove', onPointer)
    wrap.addEventListener('pointerdown', onDown)
    wrap.addEventListener('pointerup', onUp)
    wrap.addEventListener('pointercancel', onUp)
    wrap.addEventListener('pointerleave', onUp)
    window.addEventListener('resize', measure)
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(rafRef.current)
      wrap.removeEventListener('pointermove', onPointer)
      wrap.removeEventListener('pointerdown', onDown)
      wrap.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('pointercancel', onUp)
      wrap.removeEventListener('pointerleave', onUp)
      window.removeEventListener('resize', measure)
    }
  }, [phase])

  return (
    <GameShell title="نگهبان جنگل" emoji="🏹" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`beast-hunt ${phase === 'playing' ? 'beast-hunt--live' : ''}`}>
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">شکار حرفه‌ای</p>
            <div className="beast-intro" aria-hidden="true">🏹 🐍 🦁 🐉</div>
            <h2 className="level-panel__title">نشانه بگیر، رها کن، دوباره بزن</h2>
            <p className="level-panel__meta">
              نگه‌داشتن انگشت دیگر کار نمی‌کند. فقط ۳ تیر داری، بعد خشاب پر می‌شود. حیوان‌ها جاخالی می‌دهند.
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
            <div className="beast-ammo" aria-live="polite">
              {hud.reload > 0 ? (
                <span className="beast-ammo__reload">پر کردن خشاب…</span>
              ) : (
                Array.from({ length: MAG_SIZE }).map((_, i) => (
                  <span key={i} className={`beast-ammo__bolt ${i < hud.ammo ? 'is-on' : ''}`} />
                ))
              )}
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
                const st = stateRef.current
                // دکمه فقط شلیک می‌کند؛ نشانه از آخرین لمس صفحه است
                if (st && !pointerRef.current.x) {
                  pointerRef.current.x = rect.width * 0.72
                  pointerRef.current.y = (st.beast?.drawY || rect.height * 0.55)
                }
                const hero = { x: Math.max(52, rect.width * 0.13), y: rect.height * 0.64 }
                const dx = (pointerRef.current.x || rect.width * 0.72) - hero.x
                const dy = (pointerRef.current.y || rect.height * 0.55) - (hero.y - 24)
                st.aim = Math.max(-1.2, Math.min(0.9, Math.atan2(dy, Math.max(16, dx))))
                if (shoot(st, hero.x, hero.y)) playPop()
              }}
              onPointerUp={() => {
                pointerRef.current.down = false
                onPointerRelease(stateRef.current)
              }}
              onPointerLeave={() => {
                pointerRef.current.down = false
                onPointerRelease(stateRef.current)
              }}
            >
              🏹 شلیک
            </button>
            <p className="beast-hint">لمس = نشانه · رها کن و دوباره بزن · ۳ تیر در خشاب</p>
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

function drawScene(canvas, state, w, h, hero, pointer) {
  if (!canvas || !state) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0
  ctx.save()
  ctx.translate(shakeX, shakeY)

  // آسمان غروب جنگل
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0f172a')
  sky.addColorStop(0.35, '#1e3a5f')
  sky.addColorStop(0.65, '#0c4a6e')
  sky.addColorStop(1, '#14532d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // خورشید/مهتاب
  const sun = ctx.createRadialGradient(w * 0.78, h * 0.18, 4, w * 0.78, h * 0.18, 90)
  sun.addColorStop(0, 'rgba(254,243,199,0.85)')
  sun.addColorStop(0.4, 'rgba(251,191,36,0.25)')
  sun.addColorStop(1, 'rgba(251,191,36,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)

  // لایه‌های جنگل دور
  drawSilhouetteTrees(ctx, w, h * 0.42, 0.35, '#052e16')
  drawSilhouetteTrees(ctx, w, h * 0.5, 0.55, '#14532d')

  // زمین
  const ground = ctx.createLinearGradient(0, h * 0.68, 0, h)
  ground.addColorStop(0, '#166534')
  ground.addColorStop(1, '#052e16')
  ctx.fillStyle = ground
  ctx.beginPath()
  ctx.moveTo(0, h * 0.72)
  ctx.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.55, h * 0.74)
  ctx.quadraticCurveTo(w * 0.8, h * 0.8, w, h * 0.7)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fill()

  // مه پایین
  const mist = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.85)
  mist.addColorStop(0, 'rgba(148,163,184,0)')
  mist.addColorStop(1, 'rgba(148,163,184,0.18)')
  ctx.fillStyle = mist
  ctx.fillRect(0, h * 0.55, w, h * 0.35)

  // سنگ زیر پا
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(hero.x, hero.y + 52, 48, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  const stone = ctx.createLinearGradient(hero.x - 40, hero.y + 40, hero.x + 40, hero.y + 58)
  stone.addColorStop(0, '#78716c')
  stone.addColorStop(1, '#44403c')
  ctx.fillStyle = stone
  ctx.beginPath()
  ctx.ellipse(hero.x, hero.y + 48, 40, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  const eating = state.eaten
  if (!eating) drawHeroPro(ctx, hero.x, hero.y, state.aim, state.cooldown, state.bloom)

  if (state.beast) drawBeastPro(ctx, state.beast, state.beast.drawY || h * 0.56)

  if (eating && state.beast) {
    drawHeroBeingEaten(ctx, hero, state.beast, Math.min(1, eating.t / 0.9), eating.byFire)
  }

  // تیرها
  for (const b of state.bullets) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(Math.atan2(b.vy, b.vx))
    ctx.shadowColor = '#fde68a'
    ctx.shadowBlur = 8
    const shaft = ctx.createLinearGradient(-12, 0, 14, 0)
    shaft.addColorStop(0, '#92400e')
    shaft.addColorStop(1, '#fbbf24')
    ctx.fillStyle = shaft
    ctx.fillRect(-12, -2, 22, 4)
    ctx.fillStyle = '#e11d48'
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(18, -5)
    ctx.lineTo(18, 5)
    ctx.fill()
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.moveTo(-12, 0)
    ctx.lineTo(-18, -4)
    ctx.lineTo(-14, 0)
    ctx.lineTo(-18, 4)
    ctx.fill()
    ctx.restore()
  }

  for (const f of state.flames || []) drawFlame(ctx, f)

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2.2)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5 + (1 - p.life) * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // نشانه‌گیر
  if (pointer?.x && !eating) {
    const cx = pointer.x
    const cy = pointer.y
    ctx.strokeStyle = state.bloom > 0.4 ? 'rgba(248,113,113,0.75)' : 'rgba(253,224,71,0.8)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, 14 + state.bloom * 10, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 22, cy)
    ctx.lineTo(cx - 8, cy)
    ctx.moveTo(cx + 8, cy)
    ctx.lineTo(cx + 22, cy)
    ctx.moveTo(cx, cy - 22)
    ctx.lineTo(cx, cy - 8)
    ctx.moveTo(cx, cy + 8)
    ctx.lineTo(cx, cy + 22)
    ctx.stroke()
  }

  if (state.bannerT > 0 && state.banner) {
    ctx.fillStyle = 'rgba(15,23,42,0.78)'
    roundRect(ctx, w / 2 - 140, 54, 280, 42, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(251,191,36,0.45)'
    ctx.stroke()
    ctx.fillStyle = '#fef9c3'
    ctx.font = '800 15px Vazirmatn, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(state.banner, w / 2, 75)
  }

  if (state.beast && !state.beast.dead) {
    const barW = 150
    const bx = w - barW - 14
    const by = 54
    ctx.fillStyle = 'rgba(15,23,42,0.65)'
    roundRect(ctx, bx, by, barW, 12, 6)
    ctx.fill()
    const ratio = state.beast.hp / state.beast.maxHp
    const hg = ctx.createLinearGradient(bx, by, bx + barW, by)
    hg.addColorStop(0, state.beast.accent)
    hg.addColorStop(1, '#fef3c7')
    ctx.fillStyle = hg
    roundRect(ctx, bx, by, Math.max(6, barW * ratio), 12, 6)
    ctx.fill()
  }

  // وینیت
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.78)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)

  ctx.restore()
}

function drawSilhouetteTrees(ctx, w, baseY, scale, color) {
  ctx.fillStyle = color
  for (let i = 0; i < 9; i += 1) {
    const x = (i / 8) * w + (i % 2) * 12
    const tall = (40 + (i % 3) * 18) * scale
    ctx.beginPath()
    ctx.moveTo(x, baseY - tall)
    ctx.lineTo(x + 28 * scale, baseY + 8)
    ctx.lineTo(x - 28 * scale, baseY + 8)
    ctx.fill()
  }
}

function drawHeroPro(ctx, x, y, aim, cooldown, bloom) {
  ctx.save()
  ctx.translate(x, y)

  // پاها
  const jean = ctx.createLinearGradient(-12, 8, 12, 48)
  jean.addColorStop(0, '#1e3a8a')
  jean.addColorStop(1, '#172554')
  ctx.fillStyle = jean
  roundRect(ctx, -15, 8, 13, 38, 5)
  ctx.fill()
  roundRect(ctx, 3, 8, 13, 38, 5)
  ctx.fill()
  ctx.fillStyle = '#1c1917'
  roundRect(ctx, -17, 40, 15, 9, 3)
  ctx.fill()
  roundRect(ctx, 3, 40, 15, 9, 3)
  ctx.fill()

  // شنل کوتاه
  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.beginPath()
  ctx.moveTo(-18, -30)
  ctx.quadraticCurveTo(-28, 0, -20, 20)
  ctx.lineTo(8, -10)
  ctx.fill()

  // بالاتنه زره سبک
  const armor = ctx.createLinearGradient(-18, -40, 18, 12)
  armor.addColorStop(0, '#38bdf8')
  armor.addColorStop(0.5, '#0284c7')
  armor.addColorStop(1, '#0c4a6e')
  ctx.fillStyle = armor
  roundRect(ctx, -17, -36, 34, 48, 11)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  roundRect(ctx, -7, -28, 12, 18, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(254,243,199,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-6, -12, 12, 10)

  ctx.fillStyle = '#78350f'
  ctx.fillRect(-17, 2, 34, 7)
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.arc(0, 5.5, 3.2, 0, Math.PI * 2)
  ctx.fill()

  // تیردان
  const quiver = ctx.createLinearGradient(-34, -24, -20, 14)
  quiver.addColorStop(0, '#a16207')
  quiver.addColorStop(1, '#713f12')
  ctx.fillStyle = quiver
  roundRect(ctx, -34, -24, 14, 34, 5)
  ctx.fill()
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath()
    ctx.moveTo(-30, -18 + i * 8)
    ctx.lineTo(-24, -18 + i * 8)
    ctx.stroke()
  }

  // سر
  ctx.fillStyle = '#e8a86a'
  ctx.fillRect(-3, -50, 9, 14)
  const face = ctx.createRadialGradient(-1, -60, 2, 3, -56, 17)
  face.addColorStop(0, '#ffe8d1')
  face.addColorStop(1, '#c2410c')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.ellipse(3, -58, 14, 16, 0, 0, Math.PI * 2)
  ctx.fill()

  // مو و کلاه شکارچی
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.ellipse(1, -70, 15, 9, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#365314'
  roundRect(ctx, -12, -72, 28, 10, 4)
  ctx.fill()
  ctx.fillStyle = '#4d7c0f'
  ctx.beginPath()
  ctx.ellipse(2, -72, 16, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(7, -60, 2.3, 2.7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(7.6, -60.6, 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(8, -52, 4, 0.2, Math.PI - 0.2)
  ctx.stroke()

  // کمان
  ctx.save()
  ctx.translate(12, -18)
  ctx.rotate(aim)
  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, 4)
  ctx.lineTo(-20, 10)
  ctx.stroke()

  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(22, 0, 26, -1.2, 1.2)
  ctx.stroke()
  ctx.strokeStyle = bloom > 0.5 ? '#fca5a5' : '#f5f5f4'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(22 + Math.cos(-1.2) * 26, Math.sin(-1.2) * 26)
  ctx.lineTo(2 + bloom * 4, 0)
  ctx.lineTo(22 + Math.cos(1.2) * 26, Math.sin(1.2) * 26)
  ctx.stroke()

  if (cooldown < 0.12) {
    ctx.fillStyle = '#fbbf24'
    roundRect(ctx, 2, -2.2, 28, 4.4, 2)
    ctx.fill()
    ctx.fillStyle = '#e11d48'
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(38, -5)
    ctx.lineTo(38, 5)
    ctx.fill()
  }
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(2, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

function drawBeastPro(ctx, beast, y) {
  const hurt = beast.hurt > 0
  const alpha = beast.dead ? Math.max(0, 1 - beast.dieT * 1.3) : 1
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(beast.x + (hurt ? Math.sin(beast.hurt * 50) * 5 : 0), y + (beast.dead ? beast.dieT * 28 : 0))
  // سایه
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(0, 42, 48, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  if (hurt) ctx.filter = 'brightness(1.4)'

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
      drawDragon(ctx, beast.bob, beast.chomp || 0)
      break
    default:
      drawLion(ctx)
  }
  ctx.filter = 'none'
  ctx.restore()
}

function drawFlame(ctx, f) {
  ctx.save()
  ctx.translate(f.x, f.y)
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, f.r)
  g.addColorStop(0, '#fff7ed')
  g.addColorStop(0.3, '#fbbf24')
  g.addColorStop(0.65, '#ea580c')
  g.addColorStop(1, 'rgba(127,29,29,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, f.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHeroBeingEaten(ctx, hero, beast, progress, byFire) {
  const mouthX = beast.x - (beast.id === 'dragon' ? 92 : 52)
  const mouthY = (beast.drawY || hero.y) - (beast.id === 'dragon' ? 8 : 0)
  const x = hero.x + (mouthX - hero.x) * progress
  const y = hero.y + (mouthY - hero.y) * progress
  const s = 1 - progress * 0.8
  ctx.save()
  ctx.globalAlpha = Math.max(0.1, 1 - progress * 0.92)
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (byFire) {
    const g = ctx.createRadialGradient(0, -16, 2, 0, -16, 30)
    g.addColorStop(0, '#fff7ed')
    g.addColorStop(1, 'rgba(234,88,12,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, -16, 28, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#0284c7'
  roundRect(ctx, -13, -26, 26, 34, 8)
  ctx.fill()
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.arc(0, -38, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* —— حیوانات با سایه و جزئیات بیشتر —— */

function drawSnake(ctx) {
  const body = ctx.createLinearGradient(-40, -20, 70, 20)
  body.addColorStop(0, '#14532d')
  body.addColorStop(0.5, '#22c55e')
  body.addColorStop(1, '#166534')
  ctx.strokeStyle = body
  ctx.lineWidth = 18
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(72, 12)
  ctx.bezierCurveTo(48, -22, 28, 30, 8, 2)
  ctx.bezierCurveTo(-8, -18, -24, 22, -42, 6)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(190,242,100,0.55)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(64, 8)
  ctx.bezierCurveTo(44, -12, 24, 18, 4, 0)
  ctx.stroke()
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.ellipse(-54, 4, 24, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(-60, -4, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-60, -4, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(-76, 6)
  ctx.lineTo(-90, 0)
  ctx.lineTo(-76, 12)
  ctx.stroke()
}

function drawFox(ctx) {
  const fur = ctx.createLinearGradient(-20, -20, 40, 30)
  fur.addColorStop(0, '#fb923c')
  fur.addColorStop(1, '#c2410c')
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(12, 14, 38, 23, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(42, 6)
  ctx.quadraticCurveTo(78, -24, 84, 20)
  ctx.quadraticCurveTo(58, 28, 42, 14)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.ellipse(78, 8, 11, 9, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ea580c'
  ctx.beginPath()
  ctx.ellipse(-30, -4, 24, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-40, -16)
  ctx.lineTo(-48, -44)
  ctx.lineTo(-26, -22)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-18, -18)
  ctx.lineTo(-8, -42)
  ctx.lineTo(-2, -16)
  ctx.fill()
  ctx.fillStyle = '#ffedd5'
  ctx.beginPath()
  ctx.ellipse(-42, 4, 13, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-50, 2, 3, 0, Math.PI * 2)
  ctx.arc(-28, -10, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#9a3412'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-6, 30)
  ctx.lineTo(-12, 48)
  ctx.moveTo(20, 30)
  ctx.lineTo(26, 48)
  ctx.stroke()
}

function drawEagle(ctx) {
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(-6, -4, 22, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(2, -8)
  ctx.quadraticCurveTo(44, -58, 78, -6)
  ctx.quadraticCurveTo(38, -16, 4, 8)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-4, -4)
  ctx.quadraticCurveTo(-54, -44, -82, 8)
  ctx.quadraticCurveTo(-42, -6, -6, 10)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.arc(-30, -16, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-40, -16)
  ctx.lineTo(-64, -10)
  ctx.lineTo(-40, -6)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-32, -18, 2.8, 0, Math.PI * 2)
  ctx.fill()
}

function drawWolf(ctx) {
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.ellipse(10, 12, 40, 25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.ellipse(-32, -6, 25, 21, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-44, -18)
  ctx.lineTo(-52, -46)
  ctx.lineTo(-30, -24)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-20, -20)
  ctx.lineTo(-10, -44)
  ctx.lineTo(-4, -18)
  ctx.fill()
  ctx.fillStyle = '#d6d3d1'
  ctx.beginPath()
  ctx.ellipse(-44, 4, 13, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-52, 2, 3, 0, Math.PI * 2)
  ctx.arc(-28, -12, 3.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-28, -12, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#292524'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, 30)
  ctx.lineTo(-14, 50)
  ctx.moveTo(22, 30)
  ctx.lineTo(28, 50)
  ctx.stroke()
}

function drawBoar(ctx) {
  ctx.fillStyle = '#78716c'
  ctx.beginPath()
  ctx.ellipse(8, 10, 42, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.ellipse(-34, 6, 28, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#f5f5f4'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-50, 12)
  ctx.quadraticCurveTo(-68, 22, -58, 2)
  ctx.moveTo(-46, 16)
  ctx.quadraticCurveTo(-62, 28, -52, 8)
  ctx.stroke()
  ctx.fillStyle = '#a8a29e'
  ctx.beginPath()
  ctx.ellipse(-54, 10, 15, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-58, 8, 2.5, 0, Math.PI * 2)
  ctx.arc(-58, 14, 2.5, 0, Math.PI * 2)
  ctx.arc(-28, -2, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawCroc(ctx) {
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.ellipse(12, 16, 50, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-28, 10)
  ctx.lineTo(-96, 4)
  ctx.lineTo(-96, 22)
  ctx.lineTo(-28, 26)
  ctx.fill()
  ctx.fillStyle = '#14532d'
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath()
    ctx.moveTo(-8 + i * 16, 0)
    ctx.lineTo(i * 16, -14)
    ctx.lineTo(8 + i * 16, 0)
    ctx.fill()
  }
  ctx.fillStyle = '#fefce8'
  for (let i = 0; i < 6; i += 1) ctx.fillRect(-92 + i * 10, 10, 5, 7)
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(-42, 4, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-42, 4, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawLion(ctx) {
  ctx.fillStyle = '#b45309'
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * 30 - 22, Math.sin(a) * 30 - 6, 13, 17, a, 0, Math.PI * 2)
    ctx.fill()
  }
  const body = ctx.createLinearGradient(-10, -10, 40, 30)
  body.addColorStop(0, '#facc15')
  body.addColorStop(1, '#a16207')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(14, 16, 38, 25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#eab308'
  ctx.beginPath()
  ctx.arc(-22, -6, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.ellipse(-36, 4, 13, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-44, 2, 3, 0, Math.PI * 2)
  ctx.arc(-18, -12, 3.5, 0, Math.PI * 2)
  ctx.arc(-30, -12, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-2, 34)
  ctx.lineTo(-8, 52)
  ctx.moveTo(26, 34)
  ctx.lineTo(32, 52)
  ctx.stroke()
}

function drawBear(ctx) {
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(10, 10, 44, 34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-28, -8, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-44, -30, 13, 0, Math.PI * 2)
  ctx.arc(-14, -32, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a16207'
  ctx.beginPath()
  ctx.arc(-44, -30, 6, 0, Math.PI * 2)
  ctx.arc(-14, -32, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.ellipse(-42, 2, 15, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-50, 0, 3, 0, Math.PI * 2)
  ctx.arc(-28, -14, 3.5, 0, Math.PI * 2)
  ctx.arc(-16, -14, 3.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawTiger(ctx) {
  const fur = ctx.createLinearGradient(-20, -20, 40, 30)
  fur.addColorStop(0, '#fb923c')
  fur.addColorStop(1, '#c2410c')
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(12, 12, 42, 27, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(-4, -8)
  ctx.quadraticCurveTo(2, 12, -4, 30)
  ctx.moveTo(14, -10)
  ctx.quadraticCurveTo(20, 12, 14, 32)
  ctx.moveTo(30, -6)
  ctx.quadraticCurveTo(36, 12, 30, 28)
  ctx.stroke()
  ctx.fillStyle = '#ea580c'
  ctx.beginPath()
  ctx.ellipse(-32, -4, 25, 21, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(-44, -16)
  ctx.lineTo(-52, -42)
  ctx.lineTo(-30, -22)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-22, -18)
  ctx.lineTo(-12, -40)
  ctx.lineTo(-6, -16)
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.ellipse(-44, 6, 13, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-52, 4, 3, 0, Math.PI * 2)
  ctx.arc(-28, -10, 3.2, 0, Math.PI * 2)
  ctx.arc(-18, -10, 3.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawDragon(ctx, bob, chomp = 0) {
  const flap = Math.sin(bob * 5.5) * 12
  const jaw = 0.4 + chomp * 1.05
  ctx.fillStyle = '#6d28d9'
  ctx.beginPath()
  ctx.moveTo(2, -12)
  ctx.quadraticCurveTo(34, -60 + flap, 86, -18)
  ctx.quadraticCurveTo(42, -22, 10, 10)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(6, -8)
  ctx.quadraticCurveTo(-24, -54 - flap, -46, -2)
  ctx.quadraticCurveTo(-12, -16, 12, 8)
  ctx.fill()
  const body = ctx.createLinearGradient(-20, -20, 50, 30)
  body.addColorStop(0, '#a78bfa')
  body.addColorStop(1, '#5b21b6')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(10, 10, 46, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c4b5fd'
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.arc(-4 + i * 17, 2, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#5b21b6'
  ctx.beginPath()
  ctx.ellipse(-42, -8, 24, 17, -0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-72, -14, 28, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(-74, -30)
  ctx.lineTo(-70, -52)
  ctx.lineTo(-60, -28)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-58, -30)
  ctx.lineTo(-48, -50)
  ctx.lineTo(-44, -26)
  ctx.fill()
  const open = 11 + jaw * 11
  ctx.fillStyle = '#4c1d95'
  ctx.beginPath()
  ctx.ellipse(-94, -8, 22, open, 0, 0, Math.PI * 2)
  ctx.fill()
  const throat = ctx.createRadialGradient(-102, -6, 2, -96, -6, 18)
  throat.addColorStop(0, '#fff7ed')
  throat.addColorStop(0.4, '#fb923c')
  throat.addColorStop(1, '#9f1239')
  ctx.fillStyle = throat
  ctx.beginPath()
  ctx.ellipse(-100, -6, 15, open * 0.72, 0, 0, Math.PI * 2)
  ctx.fill()
  if (chomp > 0.15) {
    const blast = ctx.createRadialGradient(-118, -6, 2, -128, -6, 34)
    blast.addColorStop(0, '#fffbeb')
    blast.addColorStop(0.4, '#f97316')
    blast.addColorStop(1, 'rgba(234,88,12,0)')
    ctx.fillStyle = blast
    ctx.beginPath()
    ctx.ellipse(-126, -6, 26 + chomp * 18, 12 + chomp * 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-74, -20, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-74, -20, 2.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#6d28d9'
  ctx.lineWidth = 15
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(50, 10)
  ctx.quadraticCurveTo(86, -22, 102, 26)
  ctx.stroke()
  ctx.fillStyle = '#c084fc'
  ctx.beginPath()
  ctx.moveTo(96, 20)
  ctx.lineTo(118, 8)
  ctx.lineTo(108, 34)
  ctx.fill()
}
