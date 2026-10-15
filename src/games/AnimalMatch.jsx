import { useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { animalsForLevel, getMatchLevel, MATCH_LEVELS } from './animalLevels'
import { playAnimal, playCheer, playFlip, playMatch, playMismatch } from '../utils/sounds'

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDeck(level, faceUp, dealId) {
  const animals = animalsForLevel(level)
  const pairs = animals.flatMap((animal) => [
    { uid: `${dealId}-${animal.id}-a`, animalId: animal.id, ...animal },
    { uid: `${dealId}-${animal.id}-b`, animalId: animal.id, ...animal },
  ])
  return shuffle(pairs).map((card) => ({
    ...card,
    flipped: faceUp,
    matched: false,
  }))
}

export default function AnimalMatch() {
  const [levelNumber, setLevelNumber] = useState(1)
  const [phase, setPhase] = useState('intro')
  const [cards, setCards] = useState([])
  const [picked, setPicked] = useState([])
  const [lock, setLock] = useState(false)
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [lastMatch, setLastMatch] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)

  const dealId = useRef(1)
  const hideTimer = useRef(null)
  const matchesRef = useRef(0)
  const levelRef = useRef(null)
  const pickedRef = useRef([])
  const lockRef = useRef(false)

  const level = useMemo(() => getMatchLevel(levelNumber), [levelNumber])
  const levelAnimals = animalsForLevel(level)
  const rows = Math.ceil((level.pairs * 2) / level.columns)
  const timerUrgent = (phase === 'playing' || phase === 'preview') && timeLeft <= 10

  useEffect(() => {
    matchesRef.current = matches
  }, [matches])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    if (phase !== 'preview') return undefined
    const timer = setTimeout(() => {
      setCards((prev) => prev.map((card) => ({ ...card, flipped: false })))
      setPhase('playing')
    }, level.previewMs)
    return () => clearTimeout(timer)
  }, [phase, level])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          const cfg = levelRef.current
          if (matchesRef.current >= cfg.pairs) {
            playCheer()
            setPhase(cfg.level >= 10 ? 'complete' : 'won')
          } else {
            setPhase('lost')
          }
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    if (matches < level.pairs) return
    playCheer()
    setPhase(level.level >= 10 ? 'complete' : 'won')
  }, [matches, phase, level])

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    [],
  )

  const startLevel = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const faceUp = level.previewMs > 0
    dealId.current += 1
    setCards(buildDeck(level, faceUp, dealId.current))
    pickedRef.current = []
    lockRef.current = false
    setPicked([])
    setLock(false)
    setMoves(0)
    setMatches(0)
    matchesRef.current = 0
    setLastMatch(null)
    setTimeLeft(level.timeLimit)
    setPhase(faceUp ? 'preview' : 'playing')
  }

  const goNextLevel = () => {
    setLevelNumber((current) => Math.min(10, current + 1))
    setCards([])
    setMatches(0)
    setMoves(0)
    setLastMatch(null)
    setPhase('intro')
  }

  const retryLevel = () => {
    setCards([])
    setMatches(0)
    setMoves(0)
    setLastMatch(null)
    setPhase('intro')
  }

  const restartGame = () => {
    setLevelNumber(1)
    setCards([])
    setMatches(0)
    setMoves(0)
    setLastMatch(null)
    setPhase('intro')
  }

  const onCardClick = (card) => {
    if (phase !== 'playing' || lockRef.current || card.matched) return
    const current = pickedRef.current
    if (current.some((item) => item.uid === card.uid)) return
    if (current.length >= 2) return

    playFlip()

    const nextPicked = [...current, card]
    pickedRef.current = nextPicked
    setPicked(nextPicked)
    setCards((prev) =>
      prev.map((item) => (item.uid === card.uid ? { ...item, flipped: true } : item)),
    )

    if (nextPicked.length < 2) return

    lockRef.current = true
    setLock(true)
    setMoves((count) => count + 1)

    const [first, second] = nextPicked
    const isMatch = first.animalId === second.animalId

    if (isMatch) {
      playMatch()
      setTimeout(() => playAnimal(first.animalId), 180)
      setLastMatch(first)
      setMatches((count) => {
        const next = count + 1
        matchesRef.current = next
        return next
      })
      setCards((prev) =>
        prev.map((item) =>
          item.animalId === first.animalId
            ? { ...item, matched: true, flipped: true }
            : item,
        ),
      )
      pickedRef.current = []
      lockRef.current = false
      setPicked([])
      setLock(false)
      return
    }

    playMismatch()
    hideTimer.current = setTimeout(() => {
      setCards((prev) =>
        prev.map((item) =>
          item.uid === first.uid || item.uid === second.uid
            ? { ...item, flipped: false }
            : item,
        ),
      )
      pickedRef.current = []
      lockRef.current = false
      setPicked([])
      setLock(false)
    }, level.hideMs)
  }

  let actions = null
  if (phase === 'intro') {
    actions = (
      <button type="button" className="primary-btn" onClick={startLevel}>
        شروع مرحله
      </button>
    )
  } else if (phase === 'won') {
    actions = (
      <button type="button" className="primary-btn" onClick={goNextLevel}>
        مرحله بعد
      </button>
    )
  } else if (phase === 'lost') {
    actions = (
      <button type="button" className="primary-btn" onClick={retryLevel}>
        دوباره تلاش کن
      </button>
    )
  } else if (phase === 'complete') {
    actions = (
      <button type="button" className="primary-btn" onClick={restartGame}>
        از اول شروع کن
      </button>
    )
  } else {
    actions = (
      <div className="balloon-hud">
        <div className={`hud-chip ${timerUrgent ? 'hud-chip--urgent' : ''}`}>
          <span>زمان</span>
          <strong>{timeLeft}</strong>
        </div>
        <div className="hud-chip hud-chip--target">
          <span>جفت</span>
          <strong>
            {matches}/{level.pairs}
          </strong>
        </div>
        <div className="hud-chip">
          <span>مرحله</span>
          <strong>
            {level.level}/{MATCH_LEVELS.length}
          </strong>
        </div>
      </div>
    )
  }

  const showBoard = phase === 'playing' || phase === 'preview'

  return (
    <GameShell
      title="حیوان مشابه"
      emoji="🐱"
      scoreLabel={showBoard ? 'جفت' : 'مرحله'}
      score={showBoard ? `${matches}/${level.pairs}` : `${level.level}/10`}
      actions={actions}
    >
      <div className="match-board">
        {showBoard ? (
          <>
            <div className="match-stats">
              <div className="stat-chip">
                <span>حرکت</span>
                <strong>{moves}</strong>
              </div>
              {phase === 'preview' ? (
                <div className="stat-chip stat-chip--live">
                  <span>راهنما</span>
                  <strong>نگاه کن</strong>
                </div>
              ) : lastMatch ? (
                <div className="stat-chip stat-chip--live" key={lastMatch.uid + matches}>
                  <span>{lastMatch.emoji}</span>
                  <strong>{lastMatch.name}</strong>
                </div>
              ) : (
                <div className="stat-chip">
                  <span>راهنما</span>
                  <strong>جفت پیدا کن</strong>
                </div>
              )}
            </div>

            <div
              className={`card-grid ${level.columns >= 4 ? 'card-grid--dense' : ''}`}
              style={{ '--cols': level.columns, '--rows': rows }}
            >
              {cards.map((card) => {
                const open = card.flipped || card.matched
                return (
                  <button
                    key={card.uid}
                    type="button"
                    className={[
                      'memory-card',
                      open ? 'memory-card--open' : '',
                      card.matched ? 'memory-card--matched' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onCardClick(card)}
                    aria-label={open ? card.name : 'کارت پنهان'}
                    disabled={card.matched || phase !== 'playing'}
                  >
                    <span className="memory-card__inner">
                      <span className="memory-card__face memory-card__face--back">
                        <span className="memory-card__pattern" />
                        <span className="memory-card__q">؟</span>
                      </span>
                      <span
                        className="memory-card__face memory-card__face--front"
                        style={{ '--card-bg': card.color }}
                      >
                        <span className="memory-card__emoji">{card.emoji}</span>
                        <span className="memory-card__name">{card.name}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">مرحله {level.level} از ۱۰</p>
            <div className="level-animals" aria-hidden="true">
              {levelAnimals.map((animal) => (
                <span key={animal.id}>{animal.emoji}</span>
              ))}
            </div>
            <div className="level-panel__count">{level.pairs}</div>
            <h2 className="level-panel__title">جفت‌های مشابه را پیدا کن</h2>
            <p className="level-panel__meta">
              {level.pairs} جفت · {level.timeLimit} ثانیه
            </p>
          </div>
        )}

        {phase === 'won' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🎉</span>
            <h2>آفرین!</h2>
            <p>مرحله {level.level} تمام شد</p>
            <p className="level-panel__meta">{moves} حرکت</p>
          </div>
        )}

        {phase === 'lost' && (
          <div className="level-panel level-panel--fail">
            <span className="level-panel__emoji">⏳</span>
            <h2>زمان تمام شد</h2>
            <p>
              {matches} از {level.pairs} جفت
            </p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🏆</span>
            <h2>همه مراحل تموم شد!</h2>
            <p>حافظه‌ات عالی بود</p>
          </div>
        )}
      </div>
    </GameShell>
  )
}
