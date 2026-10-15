import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import {
  COLS,
  PIECES,
  ROWS,
  createGame,
  dropMs,
  snapshot,
  softDrop,
  speedTier,
  tick,
  tryMove,
  tryRotate,
} from './tetrisLogic'
import { playCheer, playFlip, playMatch } from '../utils/sounds'

const TIER_LABELS = ['آهسته', 'کمی تندتر', 'تندتر', 'سریع']

function MiniPiece({ type }) {
  if (!type) return null
  const piece = PIECES[type]
  return (
    <div
      className="mini-piece"
      style={{ gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)` }}
      aria-hidden="true"
    >
      {piece.shape.flatMap((row, y) =>
        row.map((value, x) => (
          <span
            key={`${y}-${x}`}
            className={value ? 'mini-piece__brick' : 'mini-piece__empty'}
            style={value ? { background: piece.color } : undefined}
          />
        )),
      )}
    </div>
  )
}

export default function BrickStack() {
  const gameRef = useRef(null)
  const timeoutRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [view, setView] = useState(null)
  const [gain, setGain] = useState(0)

  const publish = () => {
    if (!gameRef.current) return
    setView(snapshot(gameRef.current))
  }

  const onSettle = (result, gained) => {
    if (gained > 0) {
      setGain(gained)
      playMatch()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setGain(0), 700)
    }
    if (result === 'over') {
      setPhase('over')
      playCheer()
    }
    publish()
  }

  const apiRef = useRef({})
  apiRef.current = {
    left: () => {
      if (tryMove(gameRef.current, -1, 0)) publish()
    },
    right: () => {
      if (tryMove(gameRef.current, 1, 0)) publish()
    },
    rotate: () => {
      if (tryRotate(gameRef.current)) {
        playFlip()
        publish()
      }
    },
    down: () => {
      const game = gameRef.current
      if (!game || phase !== 'playing') return
      const before = game.score
      const result = softDrop(game)
      if (result === 'idle') return
      if (result === 'fall') {
        publish()
        return
      }
      onSettle(result, game.score - before)
    },
    tick: () => {
      const game = gameRef.current
      if (!game || phase !== 'playing') return
      const before = game.score
      const result = tick(game)
      if (result === 'fall' || result === 'ground' || result === 'idle') {
        if (result !== 'idle') publish()
        return
      }
      onSettle(result, game.score - before)
    },
  }

  const tier = speedTier(view?.score || 0)

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const id = setInterval(() => apiRef.current.tick(), dropMs(gameRef.current?.score || 0))
    return () => clearInterval(id)
  }, [phase, tier])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const onKey = (event) => {
      const key = event.key
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(key)) {
        event.preventDefault()
      }
      if (key === 'ArrowLeft') apiRef.current.left()
      if (key === 'ArrowRight') apiRef.current.right()
      if (key === 'ArrowDown') apiRef.current.down()
      if (key === 'ArrowUp' || key === ' ') apiRef.current.rotate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const start = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setGain(0)
    gameRef.current = createGame()
    setPhase('playing')
    setView(snapshot(gameRef.current))
  }

  const hold = (name) => (event) => {
    event.preventDefault()
    apiRef.current[name]()
    const id = setInterval(() => apiRef.current[name](), 120)
    const stop = () => {
      clearInterval(id)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  const score = view?.score || 0

  let actions = null
  if (phase === 'intro') {
    actions = (
      <button type="button" className="primary-btn" onClick={start}>
        شروع بازی
      </button>
    )
  } else if (phase === 'over') {
    actions = (
      <button type="button" className="primary-btn" onClick={start}>
        بازی دوباره
      </button>
    )
  } else {
    actions = (
      <div className="tetris-controls">
        <button type="button" className="pad-btn" aria-label="چپ" onPointerDown={hold('left')}>
          ◀
        </button>
        <button
          type="button"
          className="pad-btn"
          aria-label="چرخش"
          onPointerDown={(event) => {
            event.preventDefault()
            apiRef.current.rotate()
          }}
        >
          ⟳
        </button>
        <button type="button" className="pad-btn" aria-label="راست" onPointerDown={hold('right')}>
          ▶
        </button>
        <button type="button" className="pad-btn pad-btn--down" aria-label="پایین" onPointerDown={hold('down')}>
          ▼
        </button>
      </div>
    )
  }

  const activeMap = new Map((view?.active || []).map((cell) => [`${cell.x}:${cell.y}`, view.color]))
  const ghostMap = new Set((view?.ghost || []).map((cell) => `${cell.x}:${cell.y}`))

  return (
    <GameShell title="چیدن آجرها" emoji="🧱" scoreLabel="امتیاز" score={score} actions={actions}>
      <div className="tetris">
        {phase === 'playing' && view ? (
          <>
            <div className="tetris-hud">
              <div className="tetris-scorebox">
                <span>امتیاز</span>
                <strong>{score}</strong>
                <div className="speed-dots" aria-label={TIER_LABELS[tier]}>
                  {[0, 1, 2, 3].map((step) => (
                    <i key={step} className={step <= tier ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <div className="next-box">
                <span>بعدی</span>
                <MiniPiece type={view.next} />
              </div>
            </div>

            <div className="tetris-board" role="img" aria-label="صفحه آجرها">
              {Array.from({ length: ROWS }).map((_, y) =>
                Array.from({ length: COLS }).map((__, x) => {
                  const key = `${x}:${y}`
                  const settled = view.board[y][x]
                  const falling = activeMap.get(key)
                  const color = falling || settled
                  const ghost = !color && ghostMap.has(key)
                  return (
                    <span
                      key={key}
                      className={[
                        'tetris-cell',
                        color ? 'tetris-cell--brick' : '',
                        ghost ? 'tetris-cell--ghost' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={color ? { '--brick': color } : undefined}
                    />
                  )
                }),
              )}
              {gain > 0 ? <span className="brick-gain">+{gain}</span> : null}
            </div>
          </>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">بازی ۳</p>
            <div className="brick-demo" aria-hidden="true">
              <span style={{ '--brick': '#22d3ee' }} />
              <span style={{ '--brick': '#facc15' }} />
              <span style={{ '--brick': '#4ade80' }} />
              <span style={{ '--brick': '#fb7185' }} />
            </div>
            <h2 className="level-panel__title">آجرها را کنار هم بچین</h2>
            <p className="level-panel__meta">تا وقتی صفحه پر نشده، بازی ادامه دارد</p>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{score}</div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
