import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import BalloonVisual from '../components/BalloonVisual'
import {
  BALLOON_LEVELS,
  BALLOON_PALETTE,
  getColor,
  getLevelConfig,
} from './balloonLevels'
import { playCheer, playMismatch, playPop } from '../utils/sounds'

function pickColorId(level) {
  if (Math.random() > level.distractorChance) return level.targetColor
  const others = Object.keys(BALLOON_PALETTE).filter((id) => id !== level.targetColor)
  return others[Math.floor(Math.random() * others.length)]
}

function makeBalloon(id, level) {
  const colorId = pickColorId(level)
  const color = getColor(colorId)
  const [minRise, maxRise] = level.riseDuration
  const size = 54 + Math.random() * 34
  return {
    id,
    colorId,
    left: 6 + Math.random() * 74,
    size,
    duration: minRise + Math.random() * (maxRise - minRise),
    sway: 8 + Math.random() * 16,
    delay: Math.random() * 0.25,
    color,
    rotation: -10 + Math.random() * 20,
    isTarget: colorId === level.targetColor,
  }
}

export default function BalloonPop() {
  const [levelNumber, setLevelNumber] = useState(1)
  const [phase, setPhase] = useState('intro') // intro | playing | won | lost | complete
  const [popped, setPopped] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [balloons, setBalloons] = useState([])
  const [bursts, setBursts] = useState([])
  const [penalties, setPenalties] = useState([])

  const nextId = useRef(1)
  const spawnTimer = useRef(null)
  const tickTimer = useRef(null)
  const phaseRef = useRef(phase)
  const poppedRef = useRef(0)
  const levelRef = useRef(null)

  const level = useMemo(() => getLevelConfig(levelNumber), [levelNumber])
  const targetColor = getColor(level.targetColor)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    poppedRef.current = popped
  }, [popped])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  const clearTimers = useCallback(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current)
      spawnTimer.current = null
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current)
      tickTimer.current = null
    }
  }, [])

  const removeBalloon = useCallback((id) => {
    setBalloons((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const spawn = useCallback(() => {
    const cfg = levelRef.current
    if (!cfg || phaseRef.current !== 'playing') return
    const id = nextId.current++
    setBalloons((prev) => {
      const active = prev.filter((b) => !b.popping)
      if (active.length >= cfg.maxOnScreen) return prev
      return [...prev, makeBalloon(id, cfg)]
    })
  }, [])

  const startLevel = () => {
    clearTimers()
    setPopped(0)
    poppedRef.current = 0
    setBalloons([])
    setBursts([])
    setPenalties([])
    nextId.current = 1
    setTimeLeft(level.timeLimit)
    setPhase('playing')

    spawn()
    spawn()
    spawnTimer.current = setInterval(spawn, level.spawnMs)

    tickTimer.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimers()
          if (poppedRef.current >= levelRef.current.targetCount) {
            playCheer()
            setPhase(levelRef.current.level >= 10 ? 'complete' : 'won')
          } else {
            setPhase('lost')
          }
          setBalloons([])
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (phase !== 'playing') return
    if (popped < level.targetCount) return
    clearTimers()
    playCheer()
    setBalloons([])
    setPhase(level.level >= 10 ? 'complete' : 'won')
  }, [popped, level, phase, clearTimers])

  const popBalloon = (balloon) => {
    if (phase !== 'playing' || balloon.popping) return

    if (balloon.isTarget) {
      playPop()
      setPopped((current) => {
        const next = current + 1
        poppedRef.current = next
        return next
      })
    } else {
      playMismatch()
      setPopped((current) => {
        const next = current - 1
        poppedRef.current = next
        return next
      })
      const penaltyId = `penalty-${balloon.id}`
      setPenalties((prev) => [
        ...prev,
        { id: penaltyId, left: balloon.left, bottom: 22 + Math.random() * 30 },
      ])
      setTimeout(() => {
        setPenalties((prev) => prev.filter((item) => item.id !== penaltyId))
      }, 700)
    }

    setBalloons((prev) =>
      prev.map((b) => (b.id === balloon.id ? { ...b, popping: true } : b)),
    )

    const burstId = `burst-${balloon.id}`
    setBursts((prev) => [
      ...prev,
      {
        id: burstId,
        left: balloon.left,
        bottom: 16 + Math.random() * 42,
        color: balloon.color.body,
      },
    ])

    setTimeout(() => removeBalloon(balloon.id), 280)
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId))
    }, 650)
  }

  const goNextLevel = () => {
    clearTimers()
    setLevelNumber((n) => Math.min(10, n + 1))
    setBalloons([])
    setBursts([])
    setPopped(0)
    setPhase('intro')
  }

  const retryLevel = () => {
    clearTimers()
    setBalloons([])
    setBursts([])
    setPopped(0)
    setPhase('intro')
  }

  const restartGame = () => {
    clearTimers()
    setLevelNumber(1)
    setBalloons([])
    setBursts([])
    setPopped(0)
    setPhase('intro')
  }

  const progressLabel = `${popped}/${level.targetCount}`
  const timerUrgent = phase === 'playing' && timeLeft <= 10

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
  } else if (phase === 'playing') {
    actions = (
      <div className="balloon-hud">
        <div className={`hud-chip ${timerUrgent ? 'hud-chip--urgent' : ''}`}>
          <span>زمان</span>
          <strong>{timeLeft}</strong>
        </div>
        <div className={`hud-chip hud-chip--target ${popped < 0 ? 'hud-chip--minus' : ''}`}>
          <span
            className="hud-chip__dot"
            style={{ background: targetColor.body }}
            aria-hidden="true"
          />
          <strong>
            {popped}/{level.targetCount}
          </strong>
        </div>
        <div className="hud-chip">
          <span>مرحله</span>
          <strong>
            {level.level}/{BALLOON_LEVELS.length}
          </strong>
        </div>
      </div>
    )
  }

  return (
    <GameShell
      title="ترکاندن بادکنک‌ها"
      emoji="🎈"
      scoreLabel={phase === 'playing' ? 'هدف' : 'مرحله'}
      score={phase === 'playing' ? progressLabel : `${level.level}/10`}
      actions={actions}
    >
      <div className="balloon-sky" aria-label="صفحه بادکنک‌ها">
        <div className="sky-cloud sky-cloud--1" />
        <div className="sky-cloud sky-cloud--2" />
        <div className="sky-cloud sky-cloud--3" />
        <div className="sky-sun" />

        {phase === 'playing' && (
          <div className="balloon-target-badge" aria-hidden="true">
            <BalloonVisual color={targetColor} size={42} />
          </div>
        )}

        {balloons.map((balloon) => (
          <button
            key={balloon.id}
            type="button"
            className={[
              'balloon',
              balloon.popping ? 'balloon--pop' : '',
              !balloon.isTarget ? 'balloon--distractor' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${balloon.left}%`,
              width: balloon.size,
              height: balloon.size * 1.25,
              '--rise-duration': `${balloon.duration}s`,
              '--rise-delay': `${balloon.delay}s`,
              '--sway': `${balloon.sway}px`,
              '--rot': `${balloon.rotation}deg`,
              '--body': balloon.color.body,
              '--shine': balloon.color.shine,
            }}
            onClick={() => popBalloon(balloon)}
            onAnimationEnd={(e) => {
              if (e.animationName === 'float-up') removeBalloon(balloon.id)
            }}
            aria-label={
              balloon.isTarget
                ? `بادکنک ${balloon.color.name}`
                : `بادکنک ${balloon.color.name} (هدف نیست)`
            }
          >
            <span className="balloon__body">
              <span className="balloon__shine" />
            </span>
            <span className="balloon__knot" />
            <span className="balloon__string" />
          </button>
        ))}

        {penalties.map((penalty) => (
          <span
            key={penalty.id}
            className="score-float"
            style={{ left: `${penalty.left}%`, bottom: `${penalty.bottom}%` }}
            aria-hidden="true"
          >
            −۱
          </span>
        ))}

        {bursts.map((burst) => (
          <div
            key={burst.id}
            className="pop-burst"
            style={{
              left: `${burst.left}%`,
              bottom: `${burst.bottom}%`,
              '--pop': burst.color,
            }}
            aria-hidden="true"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </div>
        ))}

        {phase === 'intro' && (
          <div className="level-panel">
            <p className="level-panel__kicker">مرحله {level.level} از ۱۰</p>
            <BalloonVisual color={targetColor} size={132} className="level-panel__balloon" />
            <div className="level-panel__count" style={{ color: targetColor.body }}>
              {level.targetCount}
            </div>
            <h2 className="level-panel__title">
              بادکنک‌های {targetColor.name} را بترکان
            </h2>
            <p className="level-panel__meta">
              {level.targetCount} تا · {level.timeLimit} ثانیه
            </p>
          </div>
        )}

        {phase === 'won' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🎉</span>
            <h2>آفرین!</h2>
            <p>مرحله {level.level} تمام شد</p>
            <BalloonVisual color={targetColor} size={88} />
          </div>
        )}

        {phase === 'lost' && (
          <div className="level-panel level-panel--fail">
            <span className="level-panel__emoji">⏳</span>
            <h2>زمان تمام شد</h2>
            <p>
              {popped} از {level.targetCount} بادکنک {targetColor.name}
            </p>
            <BalloonVisual color={targetColor} size={88} />
          </div>
        )}

        {phase === 'complete' && (
          <div className="level-panel level-panel--success">
            <span className="level-panel__emoji">🏆</span>
            <h2>همه مراحل تموم شد!</h2>
            <p>قهرمان بادکنک‌ها شدی</p>
          </div>
        )}
      </div>
    </GameShell>
  )
}
