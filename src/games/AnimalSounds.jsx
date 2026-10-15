import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { ANIMALS, SOUND_LEVELS, pickRound } from '../data/animals'
import { playCheer, playCreature, playMismatch, playPop } from '../utils/sounds'

export default function AnimalSounds() {
  const [phase, setPhase] = useState('intro')
  const [levelIndex, setLevelIndex] = useState(0)
  const [round, setRound] = useState(0)
  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [puzzle, setPuzzle] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [mark, setMark] = useState(null)
  const lockRef = useRef(false)
  const livesRef = useRef(3)

  const level = SOUND_LEVELS[levelIndex]

  const deal = (index, roundNumber) => {
    const config = SOUND_LEVELS[index]
    const pool = ANIMALS.slice(0, Math.min(ANIMALS.length, config.pool))
    const next = pickRound(pool, config.choices)
    setPuzzle(next)
    setSeconds(config.seconds)
    setRound(roundNumber)
    setMark(null)
    lockRef.current = false
    window.setTimeout(() => playCreature(next.answer), 250)
  }

  const begin = () => {
    setLevelIndex(0)
    setLives(3)
    livesRef.current = 3
    setScore(0)
    setPhase('playing')
    deal(0, 1)
  }

  useEffect(() => {
    if (phase !== 'playing' || !puzzle) return undefined
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          miss()
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, puzzle])

  const miss = () => {
    if (lockRef.current) return
    lockRef.current = true
    playMismatch()
    const left = livesRef.current - 1
    livesRef.current = left
    setLives(left)
    if (left <= 0) setPhase('over')
    else window.setTimeout(() => deal(levelIndex, round + 1), 750)
  }

  const choose = (animal) => {
    if (phase !== 'playing' || lockRef.current || !puzzle) return
    const ok = animal.id === puzzle.answer.id
    setMark({ id: animal.id, ok })
    if (ok) {
      lockRef.current = true
      playPop()
      const bonus = 10 + seconds
      setScore((value) => value + bonus)
      const nextRound = round + 1
      if (nextRound > level.rounds) {
        if (levelIndex + 1 >= SOUND_LEVELS.length) {
          playCheer()
          setPhase('complete')
        } else {
          playCheer()
          setPhase('levelup')
        }
      } else {
        window.setTimeout(() => deal(levelIndex, nextRound), 700)
      }
      return
    }
    miss()
  }

  const nextLevel = () => {
    const index = levelIndex + 1
    setLevelIndex(index)
    setPhase('playing')
    deal(index, 1)
  }

  return (
    <GameShell title="صدای حیوانات" emoji="🔊" scoreLabel="امتیاز" score={score} actions={null}>
      <div className="zoo">
        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">{ANIMALS.length} صدای حیوان</p>
            <div className="zoo-faces" aria-hidden="true">🐱 🐶 🦁 🐸</div>
            <h2 className="level-panel__title">صدا را بشنو و حیوان را پیدا کن</h2>
            <p className="level-panel__meta">ده مرحله با صدای واقعی هر حیوان</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              شروع بازی
            </button>
          </div>
        )}

        {phase === 'playing' && puzzle && (
          <>
            <div className="zoo-top">
              <span>مرحله {levelIndex + 1}</span>
              <span>{'❤'.repeat(Math.max(0, lives))}</span>
              <span>{seconds} ثانیه</span>
            </div>
            <button type="button" className="zoo-speaker" onClick={() => playCreature(puzzle.answer)} aria-label="پخش صدا">
              🔊
            </button>
            <p className="zoo-hint">این صدای کدام حیوان است؟</p>
            <div className="zoo-grid" style={{ '--cols': puzzle.options.length > 4 ? 3 : 2 }}>
              {puzzle.options.map((animal) => (
                <button
                  key={animal.id}
                  type="button"
                  className={`zoo-card ${mark?.id === animal.id ? (mark.ok ? 'zoo-card--good' : 'zoo-card--bad') : ''}`}
                  onClick={() => choose(animal)}
                >
                  <i aria-hidden="true">{animal.emoji}</i>
                  <small>{animal.name}</small>
                </button>
              ))}
            </div>
            <p className="zoo-progress">
              {round} از {level.rounds}
            </p>
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
            <p className="level-panel__meta">تا مرحله {levelIndex + 1}</p>
            <button type="button" className="primary-btn snake-start" onClick={begin}>
              بازی دوباره
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
