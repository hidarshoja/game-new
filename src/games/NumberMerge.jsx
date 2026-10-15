import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playMatch, playPop } from '../utils/sounds'
import { createMerge, moveMerge } from './mergeLogic'

const TILES = {
  2: ['#f8fafc', '#0f172a'],
  4: ['#fef3c7', '#92400e'],
  8: ['#fdba74', '#fff'],
  16: ['#fb923c', '#fff'],
  32: ['#f97316', '#fff'],
  64: ['#ef4444', '#fff'],
  128: ['#e11d48', '#fff'],
  256: ['#facc15', '#713f12'],
  512: ['#fbbf24', '#713f12'],
  1024: ['#f59e0b', '#fff'],
  2048: ['#fde047', '#713f12'],
  4096: ['#c084fc', '#fff'],
}

export default function NumberMerge() {
  const phaseRef = useRef('intro')
  const stateRef = useRef(null)
  const swipeRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [state, setState] = useState(() => createMerge())

  const fresh = () => {
    const next = createMerge()
    stateRef.current = next
    setState(next)
    phaseRef.current = 'playing'
    setPhase('playing')
  }

  const play = (dir) => {
    const current = stateRef.current
    if (phaseRef.current !== 'playing' || !current?.alive) return
    const next = {
      grid: current.grid.map((row) => row.slice()),
      score: current.score,
      best: current.best,
      alive: current.alive,
    }
    const before = next.score
    if (!moveMerge(next, dir)) return
    stateRef.current = next
    setState(next)
    if (next.score - before >= 64) playMatch()
    else playPop()
    if (!next.alive) {
      playCheer()
      phaseRef.current = 'over'
      setPhase('over')
    }
  }

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const onKey = (event) => {
      const map = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down',
      }
      const dir = map[event.key] || map[event.key.toLowerCase()]
      if (!dir) return
      event.preventDefault()
      play(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const onPointerDown = (event) => {
    swipeRef.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = (event) => {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) < 24) return
    play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  return (
    <GameShell title="ترکیب اعداد" emoji="🔢" scoreLabel="امتیاز" score={state.score} actions={null}>
      <div className="merge">
        {phase === 'playing' ? (
          <>
            <div
              className="merge-board"
              dir="ltr"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              {state.grid.flat().map((value, index) => {
                const tone = TILES[value] || ['#818cf8', '#fff']
                return (
                  <span
                    key={index}
                    className={`merge-tile ${value ? 'merge-tile--on' : ''}`}
                    style={value ? { background: tone[0], color: tone[1] } : undefined}
                  >
                    {value || ''}
                  </span>
                )
              })}
            </div>
            <p className="merge-best">بزرگ‌ترین عدد: {state.best}</p>
            <div className="merge-pad" dir="ltr">
              <button type="button" className="glass-btn glass-btn--side" aria-label="چپ" onPointerDown={() => play('left')}>
                ◀
              </button>
              <div className="merge-pad__col">
                <button type="button" className="glass-btn" aria-label="بالا" onPointerDown={() => play('up')}>
                  ▲
                </button>
                <button type="button" className="glass-btn" aria-label="پایین" onPointerDown={() => play('down')}>
                  ▼
                </button>
              </div>
              <button type="button" className="glass-btn glass-btn--side" aria-label="راست" onPointerDown={() => play('right')}>
                ▶
              </button>
            </div>
          </>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">ترکیب اعداد</p>
            <div className="merge-intro" aria-hidden="true">
              <span>2</span>
              <span>2</span>
              <span>4</span>
            </div>
            <h2 className="level-panel__title">عددهای مثل هم را یکی کن</h2>
            <p className="level-panel__meta">تا وقتی صفحه پر نشده ادامه بده</p>
            <button type="button" className="primary-btn snake-start" onClick={fresh}>
              شروع بازی
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{state.score}</div>
            <p className="level-panel__meta">بزرگ‌ترین عدد: {state.best}</p>
            <button type="button" className="primary-btn snake-start" onClick={fresh}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
