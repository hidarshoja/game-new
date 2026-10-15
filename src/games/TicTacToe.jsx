import { useEffect, useRef, useState } from 'react'
import GameShell from '../components/GameShell'
import { playCheer, playMismatch, playPop } from '../utils/sounds'
import { cpuMove, winnerOf } from './ticTacToeLogic'

const LEVELS = [
  { id: 'easy', label: 'آسان' },
  { id: 'medium', label: 'معمولی' },
  { id: 'hard', label: 'سخت' },
]

const empty = () => Array(9).fill('')

export default function TicTacToe() {
  const [phase, setPhase] = useState('intro')
  const [level, setLevel] = useState('medium')
  const [board, setBoard] = useState(empty)
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  const [wins, setWins] = useState(0)
  const [busy, setBusy] = useState(false)
  const boardRef = useRef(board)
  const levelRef = useRef(level)

  useEffect(() => {
    boardRef.current = board
  }, [board])
  useEffect(() => {
    levelRef.current = level
  }, [level])

  const finish = (next, win) => {
    setBoard(next)
    boardRef.current = next
    if (!win) return false
    setResult(win)
    setBusy(false)
    if (win.mark === 'X') {
      setWins((value) => value + 1)
      playCheer()
    } else if (win.mark === 'O') playMismatch()
    else playPop()
    return true
  }

  const computer = (current) => {
    const index = cpuMove(current, levelRef.current)
    if (index < 0) return
    const next = current.slice()
    next[index] = 'O'
    finish(next, winnerOf(next))
    setBusy(false)
  }

  const play = (index) => {
    if (phase !== 'playing' || busy || result || board[index]) return
    const next = board.slice()
    next[index] = 'X'
    setHistory((stack) => [...stack, board])
    playPop()
    if (finish(next, winnerOf(next))) return
    setBusy(true)
    window.setTimeout(() => computer(next), 380)
  }

  const undo = () => {
    if (!history.length || busy) return
    const previous = history[history.length - 1]
    setHistory((stack) => stack.slice(0, -1))
    setBoard(previous)
    boardRef.current = previous
    setResult(null)
    setBusy(false)
  }

  const restart = () => {
    const fresh = empty()
    setBoard(fresh)
    boardRef.current = fresh
    setHistory([])
    setResult(null)
    setBusy(false)
    setPhase('playing')
  }

  const status = result?.mark === 'X' ? 'بردی!' : result?.mark === 'O' ? 'رایانه برد' : result ? 'مساوی شد' : 'نوبت توست'

  return (
    <GameShell title="دوز" emoji="❌" scoreLabel="برد" score={wins} actions={null}>
      <div className="xo">
        {phase === 'intro' ? (
          <div className="level-panel">
            <p className="level-panel__kicker">دوز</p>
            <div className="xo-preview" aria-hidden="true">
              <span>✕</span>
              <span />
              <span>✕</span>
            </div>
            <h2 className="level-panel__title">سه تا را در یک ردیف بگذار</h2>
            <p className="level-panel__meta">تو آبی هستی و رایانه نارنجی</p>
            <div className="xo-levels">
              {LEVELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`xo-level ${level === item.id ? 'xo-level--on' : ''}`}
                  onClick={() => setLevel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="primary-btn snake-start" onClick={restart}>
              شروع بازی
            </button>
          </div>
        ) : (
          <>
            <p className={`xo-status ${result?.mark === 'X' ? 'xo-status--win' : ''}`}>{status}</p>
            <div className="xo-frame">
              <div className="xo-board" dir="ltr">
                {board.map((cell, index) => {
                  const hot = result?.line?.includes(index)
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`xo-cell ${hot ? 'xo-cell--hot' : ''}`}
                      onClick={() => play(index)}
                      aria-label={`خانه ${index + 1}`}
                    >
                      {cell === 'X' ? <span className="xo-x">✕</span> : null}
                      {cell === 'O' ? <span className="xo-o" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="xo-legend">
              <span><b className="xo-x">✕</b> تو</span>
              <span><i className="xo-o" /> رایانه</span>
            </div>
            <div className="xo-actions">
              <button type="button" className="xo-mini" onClick={undo} disabled={!history.length || busy}>
                برگردون
              </button>
              <button type="button" className="xo-mini" onClick={restart}>
                دست تازه
              </button>
            </div>
          </>
        )}
      </div>
    </GameShell>
  )
}
