import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  BALL_R,
  BRICK_ROWS,
  COLS,
  PRIZE_TYPES,
  brickBox,
  circleHitsRect,
  createRally,
  makeBrickRow,
  pickPrize,
} from './ballBlastLogic'
import { playCheer, playFlip, playMatch, playPop } from '../utils/sounds'

const PADDLE_H = 14
const MIN_PADDLE = 64
const MAX_PADDLE = 190
const BASE_SPEED = 290

const PRIZE_COLOR = Object.fromEntries(PRIZE_TYPES.map((item) => [item.id, item.color]))
const DEFAULT_PADDLE = 118

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function speedOf(ball) {
  return Math.hypot(ball.vx, ball.vy) || BASE_SPEED
}

function setSpeed(ball, speed) {
  const mag = Math.hypot(ball.vx, ball.vy) || 1
  const next = clamp(speed, 220, 460)
  ball.vx = (ball.vx / mag) * next
  ball.vy = (ball.vy / mag) * next
  if (Math.abs(ball.vy) < 90) ball.vy = Math.sign(ball.vy || -1) * 120
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

export default function BallBlast() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const worldRef = useRef(null)
  const layoutRef = useRef(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const pointerRef = useRef(false)
  const hudTick = useRef(0)

  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0, balls: 1, wave: 1 })

  const syncHud = () => {
    const world = worldRef.current
    if (!world) return
    setHud({
      score: world.score,
      balls: world.balls.length,
      wave: world.wave,
    })
    if (!world.alive) setPhase('over')
  }

  const measure = () => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return null
    const rect = wrap.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(260, Math.floor(rect.width))
    const height = Math.max(340, Math.floor(rect.height))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const pad = 12
    const gap = 6
    const top = 16
    const cellW = (width - pad * 2 - gap * (COLS - 1)) / COLS
    const cellH = Math.min(34, (height * 0.42) / BRICK_ROWS)
    layoutRef.current = { width, height, pad, gap, top, cellW, cellH }
    return layoutRef.current
  }

  const spawnBall = (x, y, vx, vy) => {
    const ball = { x, y, vx, vy }
    setSpeed(ball, BASE_SPEED)
    return ball
  }

  const boot = () => {
    const rally = createRally()
    const layout = measure()
    const width = layout?.width || 320
    const height = layout?.height || 480
    worldRef.current = {
      ...rally,
      balls: [spawnBall(width / 2, height - 90, 90, -BASE_SPEED)],
      paddleX: width / 2,
      paddleW: rally.paddleWidth,
      auto: 0,
      pointerX: width / 2,
    }
    pointerRef.current = false
    lastRef.current = 0
    syncHud()
  }

  const begin = () => {
    setRun((value) => value + 1)
    setPhase('playing')
  }

  const toast = (text) => {
    const world = worldRef.current
    world.toast = text
    world.toastLife = 1.3
  }

  const applyPrize = (prize) => {
    const world = worldRef.current
    const source = world.balls[0]
    if (prize.id === 'wide') {
      world.paddleW = Math.min(MAX_PADDLE, world.paddleW * 1.3)
      toast('راکت بزرگ شد')
      playMatch()
    } else if (prize.id === 'narrow') {
      world.paddleW = Math.max(MIN_PADDLE, world.paddleW * 0.7)
      toast('راکت کوچک شد')
      playFlip()
    } else if (prize.id === 'multi') {
      if (source && world.balls.length < 5) {
        world.balls.push(
          spawnBall(source.x, source.y, -170, -BASE_SPEED),
          spawnBall(source.x, source.y, 170, -BASE_SPEED),
        )
        toast('چند توپ!')
        playMatch()
      } else {
        world.score += 50
        toast('+۵۰')
        playPop()
      }
    } else if (prize.id === 'twin') {
      if (source && world.balls.length < 5) {
        world.balls.push(spawnBall(source.x + 10, source.y, 140, -BASE_SPEED))
        toast('توپ اضافه')
        playMatch()
      } else {
        world.score += 35
        toast('+۳۵')
        playPop()
      }
    } else if (prize.id === 'star') {
      world.score += 80
      toast('+۸۰')
      playMatch()
    } else if (prize.id === 'mega') {
      world.score += 160
      toast('+۱۶۰')
      playMatch()
    } else if (prize.id === 'slow') {
      world.balls.forEach((ball) => setSpeed(ball, speedOf(ball) * 0.78))
      toast('آهسته‌تر شد')
      playFlip()
    } else if (prize.id === 'fast') {
      world.balls.forEach((ball) => setSpeed(ball, speedOf(ball) * 1.22))
      toast('سریع‌تر شد')
      playFlip()
    } else if (prize.id === 'fire') {
      world.fireTimer = 8
      toast('توپ آتشین!')
      playMatch()
    } else if (prize.id === 'reset') {
      world.paddleW = DEFAULT_PADDLE
      toast('راکت عادی')
      playFlip()
    } else if (prize.id === 'gift') {
      const bonus = 40 + Math.floor(world.random() * 90)
      world.score += bonus
      if (world.random() > 0.5) {
        world.paddleW = Math.min(MAX_PADDLE, world.paddleW * 1.15)
      } else if (source && world.balls.length < 4) {
        world.balls.push(spawnBall(source.x, source.y, -120, -BASE_SPEED))
      }
      toast(`هدیه +${bonus}`)
      playMatch()
    }
    world.score += 12
    world.floaters = world.floaters || []
    world.floaters.push({
      x: prize.x,
      y: prize.y,
      text: prize.icon,
      life: 1,
    })
  }

  const dropPrize = (x, y) => {
    const world = worldRef.current
    const prize = pickPrize(world.random)
    world.prizes.push({
      ...prize,
      x,
      y,
      vy: 78 + world.random() * 40,
      r: 16,
    })
  }

  const breakBrick = (brick) => {
    const world = worldRef.current
    const layout = layoutRef.current
    const box = brickBox(brick, layout)
    world.bricks = world.bricks.filter((item) => item !== brick)
    world.score += 10 + brick.hp * 5
    playPop()
    world.floaters = world.floaters || []
    world.floaters.push({
      x: box.x + box.w / 2,
      y: box.y + box.h / 2,
      text: `+${10 + brick.hp * 5}`,
      life: 1,
    })
    if (world.random() < 0.55) dropPrize(box.x + box.w / 2, box.y + box.h / 2)
    if (world.bricks.length === 0) {
      world.wave += 1
      for (let row = 0; row < 4; row++) {
        world.bricks.push(...makeBrickRow(world.wave, world.random, row))
      }
      toast(`مرحله ${world.wave}`)
      playMatch()
    }
  }

  const hitBrick = (ball, brick) => {
    const layout = layoutRef.current
    const box = brickBox(brick, layout)
    const overlapX = ball.x < box.x ? box.x - ball.x : ball.x - (box.x + box.w)
    const overlapY = ball.y < box.y ? box.y - ball.y : ball.y - (box.y + box.h)
    if (Math.abs(overlapX) < Math.abs(overlapY)) ball.vx *= -1
    else ball.vy *= -1
    const dmg = worldRef.current.fireTimer > 0 ? 2 : 1
    brick.hp -= dmg
    if (brick.hp <= 0) breakBrick(brick)
    else {
      worldRef.current.score += 2 * dmg
      playPop()
    }
    setSpeed(ball, speedOf(ball) + 4)
  }

  const step = (dt) => {
    const world = worldRef.current
    const layout = layoutRef.current
    if (!world?.alive || !layout) return
    const { width, height } = layout

    world.auto += dt
    let target = width / 2 + Math.sin(world.auto * 1.15) * (width * 0.34)
    if (pointerRef.current) target = world.pointerX
    world.paddleX += (target - world.paddleX) * Math.min(1, dt * 14)
    const half = world.paddleW / 2
    world.paddleX = clamp(world.paddleX, half + 6, width - half - 6)
    const paddleY = height - 32

    world.prizeTimer -= dt
    if (world.prizeTimer <= 0) {
      dropPrize(30 + world.random() * (width - 60), 8)
      world.prizeTimer = 2.6 + world.random() * 2.8
    }

    world.rowTimer -= dt
    if (world.rowTimer <= 0 && world.bricks.length < 24) {
      world.bricks.forEach((brick) => {
        brick.row += 1
      })
      world.bricks.push(...makeBrickRow(world.wave, world.random, 0))
      world.bricks = world.bricks.filter((brick) => brick.row < BRICK_ROWS + 2)
      if (world.bricks.some((brick) => brick.row >= BRICK_ROWS + 1)) {
        world.alive = false
        playCheer()
        syncHud()
        return
      }
      world.wave += 1
      world.rowTimer = 16
    }

    for (const ball of world.balls) {
      ball.x += ball.vx * dt
      ball.y += ball.vy * dt
      if (ball.x < BALL_R) {
        ball.x = BALL_R
        ball.vx = Math.abs(ball.vx)
      } else if (ball.x > width - BALL_R) {
        ball.x = width - BALL_R
        ball.vx = -Math.abs(ball.vx)
      }
      if (ball.y < BALL_R) {
        ball.y = BALL_R
        ball.vy = Math.abs(ball.vy)
      }

      if (
        ball.vy > 0 &&
        ball.y + BALL_R >= paddleY &&
        ball.y - BALL_R <= paddleY + PADDLE_H + 6 &&
        ball.x >= world.paddleX - half - BALL_R &&
        ball.x <= world.paddleX + half + BALL_R
      ) {
        const offset = (ball.x - world.paddleX) / half
        ball.y = paddleY - BALL_R - 0.5
        ball.vx = offset * 260
        ball.vy = -Math.abs(ball.vy)
        setSpeed(ball, Math.max(BASE_SPEED, speedOf(ball)))
        playFlip()
      }

      for (const brick of [...world.bricks]) {
        if (!world.bricks.includes(brick)) continue
        const box = brickBox(brick, layout)
        if (circleHitsRect(ball.x, ball.y, BALL_R, box)) {
          hitBrick(ball, brick)
          break
        }
      }
    }

    world.balls = world.balls.filter((ball) => ball.y < height + 20)
    if (world.balls.length === 0) {
      world.alive = false
      playCheer()
      syncHud()
      return
    }

    if (world.fireTimer > 0) world.fireTimer = Math.max(0, world.fireTimer - dt)

    // جایزه فقط با راکت گرفته می‌شود؛ برخورد توپ اثری ندارد
    world.prizes = world.prizes.filter((prize) => {
      prize.y += prize.vy * dt
      const onPaddle =
        prize.y + prize.r >= paddleY &&
        prize.y - prize.r <= paddleY + PADDLE_H &&
        Math.abs(prize.x - world.paddleX) < half + prize.r
      if (onPaddle) {
        applyPrize(prize)
        return false
      }
      return prize.y < height + 30
    })

    if (world.toastLife > 0) {
      world.toastLife -= dt
      if (world.toastLife <= 0) world.toast = null
    }
    world.floaters = (world.floaters || []).filter((item) => {
      item.y -= 28 * dt
      item.life -= dt
      return item.life > 0
    })

    hudTick.current += dt
    if (hudTick.current > 0.25) {
      hudTick.current = 0
      syncHud()
    }
  }

  const draw = () => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    const world = worldRef.current
    if (!canvas || !layout || !world) return
    const ctx = canvas.getContext('2d')
    const { width, height } = layout
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#0b1224')
    bg.addColorStop(1, '#171433')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    for (const brick of world.bricks) {
      const box = brickBox(brick, layout)
      ctx.save()
      ctx.shadowColor = brick.color
      ctx.shadowBlur = 12
      roundRect(ctx, box.x, box.y, box.w, box.h, 8)
      ctx.fillStyle = brick.color
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `800 ${Math.max(12, box.h * 0.42)}px Fredoka, Vazirmatn, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(brick.hp), box.x + box.w / 2, box.y + box.h / 2)
      ctx.restore()
    }

    for (const prize of world.prizes) {
      ctx.save()
      ctx.shadowColor = PRIZE_COLOR[prize.id]
      ctx.shadowBlur = 16
      ctx.fillStyle = PRIZE_COLOR[prize.id]
      ctx.beginPath()
      ctx.arc(prize.x, prize.y, prize.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      ctx.font = '800 14px Vazirmatn, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(prize.icon, prize.x, prize.y + 1)
      ctx.restore()
    }

    for (const floater of world.floaters || []) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, floater.life)
      ctx.fillStyle = '#fff'
      ctx.font = '800 16px Fredoka, Vazirmatn, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(floater.text, floater.x, floater.y)
      ctx.restore()
    }

    const paddleY = height - 32
    const half = world.paddleW / 2
    ctx.save()
    ctx.shadowColor = '#a78bfa'
    ctx.shadowBlur = 16
    roundRect(ctx, world.paddleX - half, paddleY, world.paddleW, PADDLE_H, 8)
    const paddleFill = ctx.createLinearGradient(0, paddleY, 0, paddleY + PADDLE_H)
    paddleFill.addColorStop(0, '#f5f3ff')
    paddleFill.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = paddleFill
    ctx.fill()
    ctx.restore()

    for (const ball of world.balls) {
      ctx.save()
      const onFire = world.fireTimer > 0
      ctx.shadowColor = onFire ? '#fb923c' : '#ddd6fe'
      ctx.shadowBlur = onFire ? 18 : 12
      const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R)
      g.addColorStop(0, '#fff')
      g.addColorStop(1, onFire ? '#f97316' : '#a78bfa')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    if (world.toast) {
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '800 18px Vazirmatn, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(world.toast, width / 2, height * 0.55)
      ctx.restore()
    }
  }

  const loop = (time) => {
    const last = lastRef.current || time
    const dt = Math.min(0.032, (time - last) / 1000)
    lastRef.current = time
    if (worldRef.current?.alive) step(dt)
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    if (phase !== 'playing') return undefined
    boot()
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run])

  const pointX = (event) => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    const world = worldRef.current
    if (!canvas || !layout || !world) return
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * layout.width
    world.pointerX = x
    pointerRef.current = true
    if (canvas.setPointerCapture && event.pointerId != null) {
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        /* pointer already released */
      }
    }
  }

  const release = () => {
    pointerRef.current = false
  }

  let actions = null
  if (phase === 'intro') {
    actions = (
      <button type="button" className="primary-btn" onClick={begin}>
        شروع بازی
      </button>
    )
  } else if (phase === 'over') {
    actions = (
      <button type="button" className="primary-btn" onClick={begin}>
        بازی دوباره
      </button>
    )
  } else {
    actions = (
      <div className="blast-legend blast-legend--rich">
        {PRIZE_TYPES.map((prize) => (
          <span key={prize.id}>
            <i className="lg" style={{ background: prize.color, color: prize.color }} />
            {prize.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <GameShell title="توپ و راکت" emoji="🟣" scoreLabel="امتیاز" score={hud.score} actions={actions}>
      <div className="blast">
        {phase === 'playing' ? (
          <>
            <div className="blast-hud">
              <div className="blast-chip">
                <span>مرحله</span>
                <strong>{hud.wave}</strong>
              </div>
              <div className="blast-chip">
                <span>توپ</span>
                <strong>×{hud.balls}</strong>
              </div>
              <div className="blast-chip blast-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <div className="blast-stage" ref={wrapRef}>
              <canvas
                ref={canvasRef}
                className="blast-canvas"
                onPointerDown={pointX}
                onPointerMove={(event) => {
                  if (pointerRef.current) pointX(event)
                }}
                onPointerUp={release}
                onPointerCancel={release}
              />
            </div>
          </>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۴</p>
            <div className="blast-intro-icons" aria-hidden="true">
              <span className="box box-ball">⬆</span>
              <span className="box box-bomb">⬇</span>
              <span className="box box-crystal">✦</span>
              <span className="box box-gold">★</span>
            </div>
            <h2 className="level-panel__title">توپ را با راکت برگردان</h2>
            <p className="level-panel__meta">جایزه را فقط با راکت بگیر · توپ همیشه در حرکت است</p>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{hud.score}</div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
