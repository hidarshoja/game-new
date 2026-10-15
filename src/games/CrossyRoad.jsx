import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playFlip, playPop } from '../utils/sounds'
import { COLS, SPAN, createCrossy, laneAt, queueHop, updateCrossy } from './crossyLogic'

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

function wrappedXs(x) {
  const base = ((x % SPAN) + SPAN) % SPAN
  return [base - SPAN, base, base + SPAN]
}

export default function CrossyRoad() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const phaseRef = useRef('intro')
  const rafRef = useRef(0)
  const swipeRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0 })

  const sync = () => {
    const state = stateRef.current
    if (!state) return
    setHud({ score: state.score })
  }

  const draw = () => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cell = width / COLS
    const anchor = height * 0.56

    ctx.clearRect(0, 0, width, height)
    const sky = ctx.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#8fd4ff')
    sky.addColorStop(1, '#d9f5c8')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    const first = Math.floor(state.y) - 3
    const last = Math.floor(state.y) + 12
    for (let y = last; y >= first; y -= 1) {
      if (y < 0) continue
      const lane = laneAt(state, y)
      const sy = anchor - (y - state.y) * cell
      if (sy > height + cell || sy < -cell) continue
      drawLane(ctx, lane, sy, cell, width, state.time)
    }

    const px = state.x * cell + cell / 2
    const py = anchor + cell / 2
    drawChicken(ctx, px, py, cell, state.face, state.hopLift)
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

  const steer = (dir) => (event) => {
    event.preventDefault()
    const state = stateRef.current
    if (!state?.alive || phaseRef.current !== 'playing') return
    if (queueHop(state, dir)) playFlip()
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    stateRef.current = createCrossy()
    measure()
    sync()
    let last = performance.now()

    const onResize = () => {
      measure()
      draw()
    }
    const onKey = (event) => {
      const map = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      const dir = map[event.key] || map[event.key.toLowerCase()]
      if (!dir || !stateRef.current) return
      event.preventDefault()
      if (queueHop(stateRef.current, dir)) playFlip()
    }

    const paint = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (state?.alive && phaseRef.current === 'playing') {
        const before = state.score
        const event = updateCrossy(state, dt)
        if (!state.alive) {
          playCheer()
          sync()
          phaseRef.current = 'over'
          setPhase('over')
        } else if (state.score !== before) {
          playPop()
          sync()
        } else if (event === 'land') {
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
    if (!start || !stateRef.current?.alive) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) < 28) return
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    if (queueHop(stateRef.current, dir)) playFlip()
  }

  const cause =
    stateRef.current?.cause === 'water' ? 'توی آب افتادی' : 'ماشین بهت برخورد کرد'

  return (
    <GameShell title="عبور از جاده" emoji="🐔" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`arcade crossy-game ${phase === 'playing' ? 'arcade--live' : ''}`}>
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
                <span>ردیف</span>
                <strong>{hud.score}</strong>
              </div>
              <div className="glass-chip glass-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <div className="snake-glass-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={steer('left')}>
                ◀
              </button>
              <div className="snake-glass-pad__col">
                <button type="button" className="glass-btn" aria-label="جلو" onPointerDown={steer('up')}>
                  ▲
                </button>
                <button type="button" className="glass-btn" aria-label="عقب" onPointerDown={steer('down')}>
                  ▼
                </button>
              </div>
              <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={steer('right')}>
                ▶
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۶</p>
            <div className="crossy-intro" aria-hidden="true">
              <span className="crossy-intro__tree" />
              <span className="crossy-intro__chick">🐔</span>
              <span className="crossy-intro__car" />
            </div>
            <h2 className="level-panel__title">از خیابان و رودخانه رد شو</h2>
            <p className="level-panel__meta">تا وقتی زنده بمانی جلو برو</p>
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
            <p className="level-panel__meta">{cause}</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}

function drawLane(ctx, lane, sy, cell, width, time) {
  if (lane.kind === 'grass') {
    ctx.fillStyle = lane.y % 2 === 0 ? '#74c85d' : '#68b853'
    ctx.fillRect(0, sy, width, cell)
    for (let i = 0; i < 4; i += 1) {
      const fx = ((lane.y * 37 + i * 53) % COLS) * cell + cell * 0.3
      ctx.fillStyle = i % 2 ? '#fde68a' : '#f9a8d4'
      ctx.beginPath()
      ctx.arc(fx, sy + cell * 0.72, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    lane.trees.forEach((tx) => drawTree(ctx, tx * cell + cell / 2, sy + cell * 0.55, cell))
    return
  }

  if (lane.kind === 'road') {
    ctx.fillStyle = '#3a4150'
    ctx.fillRect(0, sy, width, cell)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, sy, width, 3)
    ctx.fillRect(0, sy + cell - 3, width, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < COLS; i += 1) {
      ctx.fillRect(i * cell + cell * 0.2, sy + cell * 0.46, cell * 0.28, 3)
    }
    lane.obstacles.forEach((car) => {
      wrappedXs(car.x).forEach((x) => {
        if (x > COLS + 1 || x + car.w < -1) return
        drawCar(ctx, x * cell, sy, car.w * cell, cell, car.color, lane.dir)
      })
    })
    return
  }

  const water = ctx.createLinearGradient(0, sy, 0, sy + cell)
  water.addColorStop(0, '#2f90cf')
  water.addColorStop(1, '#1d6eab')
  ctx.fillStyle = water
  ctx.fillRect(0, sy, width, cell)
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i += 1) {
    const shift = ((time * 40 + i * 30 + lane.y * 10) % (cell * 2)) - cell
    ctx.beginPath()
    ctx.moveTo(-20, sy + cell * (0.28 + i * 0.22))
    for (let x = shift; x < width + 20; x += 18) {
      ctx.quadraticCurveTo(x + 6, sy + cell * (0.18 + i * 0.22), x + 14, sy + cell * (0.28 + i * 0.22))
    }
    ctx.stroke()
  }
  lane.obstacles.forEach((log) => {
    wrappedXs(log.x).forEach((x) => {
      if (x > COLS + 1 || x + log.w < -1) return
      drawLog(ctx, x * cell, sy, log.w * cell, cell)
    })
  })
}

function drawTree(ctx, x, y, cell) {
  ctx.fillStyle = '#8a5a34'
  roundRect(ctx, x - cell * 0.06, y - cell * 0.02, cell * 0.12, cell * 0.28, 3)
  ctx.fill()
  ctx.fillStyle = '#15803d'
  ctx.beginPath()
  ctx.arc(x, y - cell * 0.16, cell * 0.24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(x - cell * 0.1, y - cell * 0.26, cell * 0.16, 0, Math.PI * 2)
  ctx.arc(x + cell * 0.1, y - cell * 0.24, cell * 0.15, 0, Math.PI * 2)
  ctx.fill()
}

function drawCar(ctx, x, y, w, h, color, dir) {
  const bodyY = y + h * 0.22
  const bodyH = h * 0.56
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  roundRect(ctx, x + 4, y + h * 0.72, w - 6, h * 0.12, 6)
  ctx.fill()
  ctx.fillStyle = color
  roundRect(ctx, x + 2, bodyY, w - 4, bodyH, 8)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  roundRect(ctx, x + w * 0.22, bodyY + 4, w * 0.56, bodyH * 0.42, 5)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(x + w * 0.22, y + h * 0.74, h * 0.1, 0, Math.PI * 2)
  ctx.arc(x + w * 0.78, y + h * 0.74, h * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = dir > 0 ? '#fef3c7' : '#fb7185'
  ctx.fillRect(dir > 0 ? x + w - 8 : x + 3, bodyY + bodyH * 0.35, 5, 6)
}

function drawLog(ctx, x, y, w, h) {
  ctx.fillStyle = '#92400e'
  roundRect(ctx, x + 2, y + h * 0.28, w - 4, h * 0.44, h * 0.2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.7)'
  ctx.lineWidth = 2
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath()
    ctx.moveTo(x + (w * i) / 4, y + h * 0.32)
    ctx.lineTo(x + (w * i) / 4, y + h * 0.68)
    ctx.stroke()
  }
}

function drawChicken(ctx, x, y, cell, face, lift) {
  const cy = y - lift * cell * 0.42
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y + cell * 0.22, cell * 0.2 * (1 - lift * 0.25), cell * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(x, cy)
  ctx.scale(face === 'left' ? -1.7 : 1.7, 1.7)

  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.ellipse(0, cell * 0.08, cell * 0.2, cell * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.ellipse(0, cell * 0.1, cell * 0.1, cell * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(0, -cell * 0.12, cell * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(-cell * 0.05, -cell * 0.24)
  ctx.lineTo(0, -cell * 0.34)
  ctx.lineTo(cell * 0.06, -cell * 0.24)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cell * 0.06, -cell * 0.14, cell * 0.045, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(cell * 0.075, -cell * 0.14, cell * 0.02, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(cell * 0.12, -cell * 0.1)
  ctx.lineTo(cell * 0.24, -cell * 0.06)
  ctx.lineTo(cell * 0.12, -cell * 0.02)
  ctx.fill()

  ctx.strokeStyle = '#c2410c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-cell * 0.06, cell * 0.2)
  ctx.lineTo(-cell * 0.08, cell * 0.32)
  ctx.moveTo(cell * 0.06, cell * 0.2)
  ctx.lineTo(cell * 0.1, cell * 0.32)
  ctx.stroke()
  ctx.restore()
}
