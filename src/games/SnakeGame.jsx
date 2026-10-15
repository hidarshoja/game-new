import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  GRID,
  createSnake,
  queueDir,
  spawnFood,
  stepMs,
  tick,
} from './snakeLogic'
import { playCheer, playMatch, playPop } from '../utils/sounds'

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

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const layoutRef = useRef(null)
  const timerRef = useRef(null)
  const rafRef = useRef(0)
  const phaseRef = useRef('intro')
  const controlRef = useRef('touch')
  const flashRef = useRef(0)
  const crumbsRef = useRef([])

  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [control, setControl] = useState('touch')
  const [hud, setHud] = useState({ score: 0, length: 3, eaten: 0 })
  const [hint, setHint] = useState('')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    controlRef.current = control
  }, [control])

  const syncHud = () => {
    const state = stateRef.current
    if (!state) return
    setHud({ score: state.score, length: state.snake.length, eaten: state.eaten })
  }

  const measure = () => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return null
    const rect = wrap.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(280, Math.floor(rect.width))
    const height = Math.max(360, Math.floor(rect.height))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const topSafe = 58
    const bottomSafe = controlRef.current === 'buttons' ? 198 : 96
    const sidePad = 8
    const usableW = width - sidePad * 2
    const usableH = Math.max(180, height - topSafe - bottomSafe)
    const cell = Math.max(14, Math.floor(Math.min(usableW / GRID, usableH / GRID)))
    const board = cell * GRID
    const ox = Math.floor((width - board) / 2)
    const oy = Math.floor(topSafe + Math.max(0, (usableH - board) / 2))
    layoutRef.current = { width, height, cell, ox, oy, board }
    return layoutRef.current
  }

  const burst = (x, y, color) => {
    for (let i = 0; i < 10; i += 1) {
      crumbsRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        life: 0.45,
        max: 0.45,
        r: 2 + Math.random() * 3,
        color,
      })
    }
  }

  const draw = (now = performance.now()) => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    const state = stateRef.current
    if (!canvas || !layout || !state) return
    const ctx = canvas.getContext('2d')
    const { width, height, cell, ox, oy, board } = layout
    const t = now / 1000

    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#0b1f17')
    bg.addColorStop(0.45, '#07140f')
    bg.addColorStop(1, '#020807')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < 18; i += 1) {
      const px = (i * 97 + t * 8) % width
      const py = (i * 53 + Math.sin(t + i) * 12) % height
      ctx.fillStyle = `rgba(110, 231, 183, ${0.04 + (i % 4) * 0.01})`
      ctx.beginPath()
      ctx.arc(px, py, 1.4 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.shadowColor = 'rgba(52, 211, 153, 0.25)'
    ctx.shadowBlur = 28
    roundRect(ctx, ox - 10, oy - 10, board + 20, board + 20, 24)
    ctx.fillStyle = 'rgba(4, 18, 12, 0.92)'
    ctx.fill()
    ctx.restore()

    roundRect(ctx, ox - 10, oy - 10, board + 20, board + 20, 24)
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.28)'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if ((x + y) % 2 !== 0) continue
        ctx.fillStyle = 'rgba(52, 211, 153, 0.05)'
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
      }
    }

    if (state.food) {
      const fx = ox + state.food.x * cell
      const fy = oy + state.food.y * cell
      const pulse = 1 + Math.sin(t * 6) * 0.06
      ctx.save()
      ctx.translate(fx + cell / 2, fy + cell / 2)
      ctx.scale(pulse, pulse)
      ctx.shadowColor = state.food.color
      ctx.shadowBlur = 22
      roundRect(ctx, -cell * 0.34, -cell * 0.34, cell * 0.68, cell * 0.68, cell * 0.26)
      const foodFill = ctx.createRadialGradient(-cell * 0.12, -cell * 0.16, 2, 0, 0, cell * 0.4)
      foodFill.addColorStop(0, '#fff7ed')
      foodFill.addColorStop(0.45, state.food.color)
      foodFill.addColorStop(1, '#111827')
      ctx.fillStyle = foodFill
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = `${Math.floor(cell * 0.44)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(state.food.icon, 0, 1)
      ctx.restore()
    }

    const centerOf = (part) => ({
      x: ox + part.x * cell + cell / 2,
      y: oy + part.y * cell + cell / 2,
    })

    if (state.snake.length > 1) {
      ctx.save()
      ctx.beginPath()
      state.snake.forEach((part, index) => {
        const point = centerOf(part)
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = cell * 0.72
      ctx.strokeStyle = 'rgba(20, 83, 45, 0.55)'
      ctx.shadowColor = 'rgba(74, 222, 128, 0.55)'
      ctx.shadowBlur = 18
      ctx.stroke()
      ctx.lineWidth = cell * 0.5
      ctx.strokeStyle = '#22c55e'
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.restore()
    }

    for (let index = state.snake.length - 1; index >= 0; index -= 1) {
      const part = state.snake[index]
      const point = centerOf(part)
      const isHead = index === 0
      const fade = index / Math.max(1, state.snake.length - 1)
      const radius = isHead ? cell * 0.42 : cell * 0.28 + (1 - fade) * cell * 0.06
      ctx.save()
      ctx.shadowColor = isHead ? '#bbf7d0' : 'rgba(34, 197, 94, 0.28)'
      ctx.shadowBlur = isHead ? 20 : 8
      const fill = ctx.createRadialGradient(
        point.x - radius * 0.35,
        point.y - radius * 0.4,
        radius * 0.12,
        point.x,
        point.y,
        radius,
      )
      fill.addColorStop(0, isHead ? '#ecfdf5' : `rgba(187, 247, 208, ${0.95 - fade * 0.35})`)
      fill.addColorStop(0.5, isHead ? '#4ade80' : `rgba(34, 197, 94, ${0.95 - fade * 0.2})`)
      fill.addColorStop(1, isHead ? '#166534' : `rgba(20, 83, 45, ${0.95 - fade * 0.1})`)
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.restore()

      if (!isHead) continue

      const look = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      }[state.dir]
      const side = { x: -look.y, y: look.x }
      const eye = Math.max(2.4, cell * 0.1)
      const drawEye = (sign) => {
        const ex = point.x + look.x * cell * 0.14 + side.x * cell * 0.14 * sign
        const ey = point.y + look.y * cell * 0.14 + side.y * cell * 0.14 * sign
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ex, ey, eye * 1.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#052e16'
        ctx.beginPath()
        ctx.arc(ex + look.x * eye * 0.25, ey + look.y * eye * 0.25, eye * 0.62, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ex - eye * 0.25, ey - eye * 0.25, eye * 0.28, 0, Math.PI * 2)
        ctx.fill()
      }
      drawEye(1)
      drawEye(-1)

      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = Math.max(1.5, cell * 0.05)
      ctx.beginPath()
      ctx.moveTo(point.x + look.x * cell * 0.28, point.y + look.y * cell * 0.28)
      ctx.quadraticCurveTo(
        point.x + look.x * cell * 0.48 + side.x * cell * 0.08,
        point.y + look.y * cell * 0.48 + side.y * cell * 0.08,
        point.x + look.x * cell * 0.42,
        point.y + look.y * cell * 0.42,
      )
      ctx.stroke()
    }

    crumbsRef.current = crumbsRef.current
      .map((bit) => ({
        ...bit,
        x: bit.x + bit.vx * 0.016,
        y: bit.y + bit.vy * 0.016,
        life: bit.life - 0.016,
      }))
      .filter((bit) => bit.life > 0)
    crumbsRef.current.forEach((bit) => {
      ctx.globalAlpha = Math.max(0, bit.life / bit.max)
      ctx.fillStyle = bit.color
      ctx.beginPath()
      ctx.arc(bit.x, bit.y, bit.r, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(74, 222, 128, ${flashRef.current * 0.18})`
      ctx.fillRect(0, 0, width, height)
      flashRef.current = Math.max(0, flashRef.current - 0.04)
    }
  }

  const schedule = () => {
    clearTimeout(timerRef.current)
    const state = stateRef.current
    if (!state?.alive || phaseRef.current !== 'playing') return
    timerRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing' || !stateRef.current?.alive) return
      const result = tick(stateRef.current)
      if (result === 'eat') {
        playPop()
        flashRef.current = 1
        const layout = layoutRef.current
        const food = stateRef.current.food
        if (layout && stateRef.current) {
          const head = stateRef.current.snake[0]
          burst(
            layout.ox + head.x * layout.cell + layout.cell / 2,
            layout.oy + head.y * layout.cell + layout.cell / 2,
            food?.color || '#4ade80',
          )
        }
        if (stateRef.current.eaten % 4 === 0) playMatch()
      } else if (result === 'self') {
        playCheer()
        setPhase('over')
        syncHud()
        return
      }
      syncHud()
      schedule()
    }, stepMs(state.eaten))
  }

  const boot = () => {
    const state = createSnake()
    state.food = spawnFood(state)
    stateRef.current = state
    crumbsRef.current = []
    flashRef.current = 0
    measure()
    syncHud()
  }

  const begin = () => {
    setRun((value) => value + 1)
    setPhase('playing')
  }

  const steer = (dir) => {
    const state = stateRef.current
    if (!state?.alive || phaseRef.current !== 'playing') return
    queueDir(state, dir)
    setHint(dir)
    window.clearTimeout(steer._t)
    steer._t = window.setTimeout(() => setHint(''), 280)
  }

  const onPad = (dir) => (event) => {
    event.preventDefault()
    event.stopPropagation()
    steer(dir)
  }

  const onTouchSteer = (event) => {
    if (controlRef.current !== 'touch') return
    if (event.target.closest?.('.snake-controls, .glass-btn, .snake-glass-pad')) return
    event.preventDefault()
    const wrap = wrapRef.current
    if (!wrap) return
    const point = event.touches?.[0] || event.changedTouches?.[0] || event
    const rect = wrap.getBoundingClientRect()
    const x = (point.clientX ?? 0) - rect.left
    const y = (point.clientY ?? 0) - rect.top
    const dx = x - rect.width / 2
    const dy = y - rect.height / 2
    if (Math.abs(dx) > Math.abs(dy)) steer(dx < 0 ? 'left' : 'right')
    else steer(dy < 0 ? 'up' : 'down')
  }

  useEffect(() => {
    if (phase !== 'playing') return undefined
    boot()
    schedule()
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
      if (!dir) return
      event.preventDefault()
      steer(dir)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    const paint = (now) => {
      draw(now)
      rafRef.current = requestAnimationFrame(paint)
    }
    rafRef.current = requestAnimationFrame(paint)
    return () => {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run])

  useEffect(() => {
    if (phase !== 'playing') return
    measure()
  }, [control, phase])

  const controlPicker = (live = false) => (
    <div className={`snake-controls ${live ? 'snake-controls--live' : ''}`} role="group" aria-label="نحوه بازی">
      <span>نحوه بازی</span>
      <div className="snake-controls__row">
        <button
          type="button"
          className={control === 'touch' ? 'on' : ''}
          onClick={(event) => {
            event.stopPropagation()
            setControl('touch')
          }}
        >
          لمس صفحه
        </button>
        <button
          type="button"
          className={control === 'buttons' ? 'on' : ''}
          onClick={(event) => {
            event.stopPropagation()
            setControl('buttons')
          }}
        >
          با دکمه
        </button>
      </div>
    </div>
  )

  return (
    <GameShell title="مار" emoji="🐍" scoreLabel="امتیاز" score={hud.score} actions={null}>
      <div className={`snake ${phase === 'playing' ? 'snake--live' : ''}`}>
        {phase === 'playing' ? (
          <div
            className={`snake-arena ${control === 'touch' ? 'snake-arena--touch' : ''}`}
            ref={wrapRef}
            onPointerDown={onTouchSteer}
          >
            <canvas ref={canvasRef} className="snake-canvas" />

            <div className="snake-glass-hud">
              <div className="glass-chip">
                <span>طول</span>
                <strong>{hud.length}</strong>
              </div>
              <div className="glass-chip">
                <span>غذا</span>
                <strong>{hud.eaten}</strong>
              </div>
              <div className="glass-chip glass-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>

            {control === 'touch' && hint ? (
              <div className={`snake-touch-hint snake-touch-hint--${hint}`} aria-hidden="true">
                {{ up: '▲', down: '▼', left: '◀', right: '▶' }[hint]}
              </div>
            ) : null}

            {control === 'touch' ? (
              <p className="snake-touch-tip">هر سمت صفحه را لمس کن</p>
            ) : (
              <div className="snake-glass-pad" dir="ltr">
                <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={onPad('left')}>
                  ◀
                </button>
                <div className="snake-glass-pad__col">
                  <button type="button" className="glass-btn" aria-label="بالا" onPointerDown={onPad('up')}>
                    ▲
                  </button>
                  <button type="button" className="glass-btn" aria-label="پایین" onPointerDown={onPad('down')}>
                    ▼
                  </button>
                </div>
                <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={onPad('right')}>
                  ▶
                </button>
              </div>
            )}

            {controlPicker(true)}
          </div>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۵</p>
            <div className="snake-intro" aria-hidden="true">
              <span className="snake-intro__body" />
              <span className="snake-intro__body" />
              <span className="snake-intro__head">👀</span>
              <span className="snake-intro__food">🍎</span>
            </div>
            <h2 className="level-panel__title">غذا بخور و بزرگ شو</h2>
            <p className="level-panel__meta">مراقب باش به بدن خودت برخورد نکنی</p>
            {controlPicker(false)}
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
            <p className="level-panel__meta">طول مار: {hud.length}</p>
            {controlPicker(false)}
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
