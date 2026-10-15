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

  const [phase, setPhase] = useState('intro')
  const [run, setRun] = useState(0)
  const [hud, setHud] = useState({ score: 0, length: 3, eaten: 0 })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

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

    const topSafe = 52
    const bottomSafe = 108
    const sidePad = 6
    const usableW = width - sidePad * 2
    const usableH = Math.max(180, height - topSafe - bottomSafe)
    const cell = Math.max(14, Math.floor(Math.min(usableW / GRID, usableH / GRID)))
    const board = cell * GRID
    const ox = Math.floor((width - board) / 2)
    const oy = Math.floor(topSafe + Math.max(0, (usableH - board) / 2))
    layoutRef.current = { width, height, cell, ox, oy, board }
    return layoutRef.current
  }

  const draw = () => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    const state = stateRef.current
    if (!canvas || !layout || !state) return
    const ctx = canvas.getContext('2d')
    const { width, height, cell, ox, oy, board } = layout

    const bg = ctx.createRadialGradient(width * 0.5, height * 0.2, 20, width * 0.5, height * 0.55, width * 0.9)
    bg.addColorStop(0, '#1a3d2e')
    bg.addColorStop(0.45, '#0f241c')
    bg.addColorStop(1, '#081510')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // soft vignette lights
    ctx.fillStyle = 'rgba(52, 211, 153, 0.05)'
    ctx.beginPath()
    ctx.arc(width * 0.2, height * 0.15, 80, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(width * 0.85, height * 0.75, 100, 0, Math.PI * 2)
    ctx.fill()

    // board plate
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 24
    roundRect(ctx, ox - 8, oy - 8, board + 16, board + 16, 22)
    ctx.fillStyle = 'rgba(6, 20, 14, 0.88)'
    ctx.fill()
    ctx.restore()

    roundRect(ctx, ox - 8, oy - 8, board + 16, board + 16, 22)
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.18)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const px = ox + x * cell
        const py = oy + y * cell
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.045)'
          ctx.fillRect(px, py, cell, cell)
        }
      }
    }

    if (state.food) {
      const fx = ox + state.food.x * cell
      const fy = oy + state.food.y * cell
      ctx.save()
      ctx.shadowColor = state.food.color
      ctx.shadowBlur = 20
      roundRect(ctx, fx + cell * 0.14, fy + cell * 0.14, cell * 0.72, cell * 0.72, cell * 0.28)
      const foodFill = ctx.createLinearGradient(fx, fy, fx, fy + cell)
      foodFill.addColorStop(0, '#fff7ed')
      foodFill.addColorStop(0.35, state.food.color)
      foodFill.addColorStop(1, '#111827')
      ctx.fillStyle = foodFill
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = `${Math.floor(cell * 0.46)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(state.food.icon, fx + cell / 2, fy + cell / 2 + 1)
      ctx.restore()
    }

    state.snake.forEach((part, index) => {
      const x = ox + part.x * cell
      const y = oy + part.y * cell
      const isHead = index === 0
      const t = index / Math.max(1, state.snake.length - 1)
      ctx.save()
      ctx.shadowColor = isHead ? '#86efac' : 'rgba(52, 211, 153, 0.28)'
      ctx.shadowBlur = isHead ? 18 : 8
      roundRect(
        ctx,
        x + cell * 0.1,
        y + cell * 0.1,
        cell * 0.8,
        cell * 0.8,
        isHead ? cell * 0.34 : cell * 0.28,
      )
      const fill = ctx.createLinearGradient(x, y, x + cell, y + cell)
      fill.addColorStop(0, isHead ? '#dcfce7' : `rgba(134, 239, 172, ${0.95 - t * 0.4})`)
      fill.addColorStop(1, isHead ? '#16a34a' : `rgba(21, 128, 61, ${0.95 - t * 0.2})`)
      ctx.fillStyle = fill
      ctx.fill()

      if (isHead) {
        ctx.fillStyle = '#052e16'
        const eye = Math.max(2, cell * 0.09)
        const oxEye = state.dir === 'left' ? -cell * 0.12 : state.dir === 'right' ? cell * 0.12 : 0
        const oyEye = state.dir === 'up' ? -cell * 0.12 : state.dir === 'down' ? cell * 0.12 : 0
        ctx.beginPath()
        ctx.arc(x + cell * 0.35 + oxEye, y + cell * 0.38 + oyEye, eye, 0, Math.PI * 2)
        ctx.arc(x + cell * 0.65 + oxEye, y + cell * 0.38 + oyEye, eye, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.arc(x + cell * 0.33 + oxEye, y + cell * 0.35 + oyEye, eye * 0.35, 0, Math.PI * 2)
        ctx.arc(x + cell * 0.63 + oxEye, y + cell * 0.35 + oyEye, eye * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
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
    measure()
    syncHud()
  }

  const begin = () => {
    setRun((value) => value + 1)
    setPhase('playing')
  }

  const steer = (dir) => (event) => {
    event.preventDefault()
    const state = stateRef.current
    if (!state?.alive || phaseRef.current !== 'playing') return
    queueDir(state, dir)
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
      queueDir(stateRef.current, dir)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    const paint = () => {
      draw()
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

  return (
    <GameShell
      title="مار"
      emoji="🐍"
      scoreLabel="امتیاز"
      score={hud.score}
      actions={null}
    >
      <div className={`snake ${phase === 'playing' ? 'snake--live' : ''}`}>
        {phase === 'playing' ? (
          <div className="snake-arena" ref={wrapRef}>
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

            <div className="snake-glass-pad" dir="ltr">
              <button type="button" className="glass-btn" aria-label="بالا" onPointerDown={steer('up')}>
                ▲
              </button>
              <div className="snake-glass-pad__row">
                <button type="button" className="glass-btn" aria-label="چپ" onPointerDown={steer('left')}>
                  ◀
                </button>
                <button type="button" className="glass-btn" aria-label="راست" onPointerDown={steer('right')}>
                  ▶
                </button>
              </div>
              <button type="button" className="glass-btn" aria-label="پایین" onPointerDown={steer('down')}>
                ▼
              </button>
            </div>
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
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
