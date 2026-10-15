import { useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { MATH_LEVELS, makePuzzle } from './fruitMathLogic'
import { playCheer, playMismatch, playPop } from '../utils/sounds'

export default function FruitMath() {
  const [phase, setPhase] = useState('intro')
  const [levelIndex, setLevelIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [puzzle, setPuzzle] = useState(null)
  const [mark, setMark] = useState(null)
  const lockRef = useRef(false)
  const livesRef = useRef(3)

  const level = MATH_LEVELS[levelIndex]

  const deal = (index, roundNumber) => {
    const next = makePuzzle(MATH_LEVELS[index])
    setPuzzle(next)
    setRound(roundNumber)
    setMark(null)
    lockRef.current = false
  }

  const begin = () => {
    setLevelIndex(0)
    setScore(0)
    setLives(3)
    livesRef.current = 3
    setPhase('playing')
    deal(0, 1)
  }

  const choose = (value) => {
    if (phase !== 'playing' || !puzzle || lockRef.current) return
    const ok = value === puzzle.answer
    setMark({ value, ok })
    if (ok) {
      lockRef.current = true
      playPop()
      setScore((s) => s + 10 + levelIndex * 2)
      const nextRound = round + 1
      if (nextRound > level.rounds) {
        if (levelIndex + 1 >= MATH_LEVELS.length) {
          playCheer()
          setPhase('complete')
        } else {
          playCheer()
          setPhase('levelup')
        }
      } else {
        window.setTimeout(() => deal(levelIndex, nextRound), 650)
      }
      return
    }
    playMismatch()
    lockRef.current = true
    const left = livesRef.current - 1
    livesRef.current = left
    setLives(left)
    if (left <= 0) {
      playCheer()
      setPhase('over')
    } else {
      window.setTimeout(() => deal(levelIndex, Math.min(level.rounds, round + 1)), 700)
    }
  }

  const nextLevel = () => {
    const index = levelIndex + 1
    setLevelIndex(index)
    setPhase('playing')
    deal(index, 1)
  }

  return (
    <GameShell title="میوه‌حساب" emoji="🍎" scoreLabel="امتیاز" score={score} actions={null}>
      <div className="fruit-math">
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">جمع و تفریق با میوه</p>
            <div className="math-intro" aria-hidden="true">🍎 + 🍌 = ؟</div>
            <h2 className="level-panel__title">بشمار و جواب درست را بزن</h2>
            <p className="level-panel__meta">برای کودکان ۳ تا ۱۲ سال، مرحله‌ای و ساده</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              شروع بازی
            </button>
          </div>
        )}

        {phase === 'playing' && puzzle && (
          <>
            <div className="math-top">
              <span>مرحله {levelIndex + 1}</span>
              <span>{'❤'.repeat(Math.max(0, lives))}</span>
              <span>
                {round} از {level.rounds}
              </span>
            </div>
            <div className="math-board">
              <div className="math-group" aria-label={`${puzzle.a} ${puzzle.item.name}`}>
                {Array.from({ length: puzzle.a }, (_, i) => (
                  <span key={`a-${i}`}>{puzzle.item.emoji}</span>
                ))}
              </div>
              <strong className="math-op">{puzzle.op === '+' ? '＋' : '−'}</strong>
              <div className="math-group" aria-label={`${puzzle.b} ${puzzle.item.name}`}>
                {Array.from({ length: puzzle.b }, (_, i) => (
                  <span key={`b-${i}`}>{puzzle.item.emoji}</span>
                ))}
              </div>
              <strong className="math-op">＝</strong>
              <strong className="math-q">؟</strong>
            </div>
            <p className="math-ask">چند تا می‌شود؟</p>
            <div className="math-choices" style={{ '--cols': puzzle.options.length > 3 ? 2 : puzzle.options.length }}>
              {puzzle.options.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`math-choice ${mark?.value === value ? (mark.ok ? 'math-choice--good' : 'math-choice--bad') : ''}`}
                  onClick={() => choose(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'levelup' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🌟</span>
            <h2>مرحله تمام شد</h2>
            <p>برو مرحله {levelIndex + 2}</p>
            <button type="button" className="primary-btn snake-start" onClick={nextLevel}>
              مرحله بعد
            </button>
          </div>
        )}

        {phase === 'complete' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>همه مرحله‌ها را رد کردی</p>
            <div className="tetris-final-score">{score}</div>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="level-panel level-panel--success" role="status">
            <span className="level-panel__emoji">🎉</span>
            <h2>تبریک می‌گم</h2>
            <p>جمع امتیاز شما</p>
            <div className="tetris-final-score">{score}</div>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
