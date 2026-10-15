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
import { playCheer, playFlip, playMatch, playPop } from '../utils/sounds'

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
    const size = Math.max(260, Math.floor(Math.min(rect.width || 300, rect.height || 300, 420)))
    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const pad = 10
    const cell = (size - pad * 2) / GRID
    layoutRef.current = { size, pad, cell }
    return layoutRef.current
  }

  const draw = () => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    const state = stateRef.current
    if (!canvas || !layout || !state) return
    const ctx = canvas.getContext('2d')
    const { size, pad, cell } = layout

    const bg = ctx.createLinearGradient(0, 0, size, size)
    bg.addColorStop(0, '#102018')
    bg.addColorStop(1, '#163024')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)

    // board
    roundRect(ctx, pad - 4, pad - 4, size - pad * 2 + 8, size - pad * 2 + 8, 18)
    ctx.fillStyle = 'rgba(8, 24, 16, 0.92)'
    ctx.fill()

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if ((x + y) % 2 === 0) continue
        ctx.fillStyle = 'rgba(52, 211, 153, 0.05)'
        ctx.fillRect(pad + x * cell, pad + y * cell, cell, cell)
      }
    }

    // food
    if (state.food) {
      const fx = pad + state.food.x * cell
      const fy = pad + state.food.y * cell
      ctx.save()
      ctx.shadowColor = state.food.color
      ctx.shadowBlur = 16
      roundRect(ctx, fx + cell * 0.12, fy + cell * 0.12, cell * 0.76, cell * 0.76, cell * 0.28)
      ctx.fillStyle = state.food.color
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = `${Math.floor(cell * 0.48)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(state.food.icon, fx + cell / 2, fy + cell / 2 + 1)
      ctx.restore()
    }

    // snake
    state.snake.forEach((part, index) => {
      const x = pad + part.x * cell
      const y = pad + part.y * cell
      const isHead = index === 0
      const t = index / Math.max(1, state.snake.length - 1)
      ctx.save()
      ctx.shadowColor = isHead ? '#6ee7b7' : 'rgba(52, 211, 153, 0.35)'
      ctx.shadowBlur = isHead ? 14 : 6
      roundRect(
        ctx,
        x + cell * 0.08,
        y + cell * 0.08,
        cell * 0.84,
        cell * 0.84,
        isHead ? cell * 0.32 : cell * 0.26,
      )
      const fill = ctx.createLinearGradient(x, y, x, y + cell)
      fill.addColorStop(0, isHead ? '#bbf7d0' : `rgba(110, 231, 183, ${0.95 - t * 0.35})`)
      fill.addColorStop(1, isHead ? '#22c55e' : `rgba(16, 185, 129, ${0.95 - t * 0.25})`)
      ctx.fillStyle = fill
      ctx.fill()
      if (isHead) {
        ctx.fillStyle = '#052e16'
        const eye = cell * 0.1
        const ox = state.dir === 'left' ? -cell * 0.12 : state.dir === 'right' ? cell * 0.12 : 0
        const oy = state.dir === 'up' ? -cell * 0.12 : state.dir === 'down' ? cell * 0.12 : 0
        ctx.beginPath()
        ctx.arc(x + cell * 0.35 + ox, y + cell * 0.38 + oy, eye, 0, Math.PI * 2)
        ctx.arc(x + cell * 0.65 + ox, y + cell * 0.38 + oy, eye, 0, Math.PI * 2)
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
      } else if (result === 'wall' || result === 'self') {
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

  const steer = (dir) => {
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
      steer(dir)
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

  let actions = null
  if (phase === 'playing') {
    actions = (
      <div className="snake-pad" dir="ltr">
        <button type="button" className="snake-btn" aria-label="بالا" onPointerDown={() => steer('up')}>
          ▲
        </button>
        <div className="snake-pad__mid">
          <button type="button" className="snake-btn" aria-label="چپ" onPointerDown={() => steer('left')}>
            ◀
          </button>
          <button type="button" className="snake-btn" aria-label="راست" onPointerDown={() => steer('right')}>
            ▶
          </button>
        </div>
        <button type="button" className="snake-btn" aria-label="پایین" onPointerDown={() => steer('down')}>
          ▼
        </button>
      </div>
    )
  }

  return (
    <GameShell title="مار" emoji="🐍" scoreLabel="امتیاز" score={hud.score} actions={actions}>
      <div className="snake">
        {phase === 'playing' ? (
          <>
            <div className="blast-hud">
              <div className="blast-chip">
                <span>طول</span>
                <strong>{hud.length}</strong>
              </div>
              <div className="blast-chip">
                <span>غذا</span>
                <strong>{hud.eaten}</strong>
              </div>
              <div className="blast-chip blast-chip--score">
                <span>امتیاز</span>
                <strong>{hud.score}</strong>
              </div>
            </div>
            <div className="snake-stage" ref={wrapRef}>
              <canvas ref={canvasRef} className="snake-canvas" />
            </div>
          </>
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
