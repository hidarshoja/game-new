import { Link } from 'react-router-dom'

export default function GameShell({ title, emoji, scoreLabel, score, children, actions }) {
  return (
    <div className="game-shell">
      <header className="game-topbar">
        <Link to="/" className="icon-btn" aria-label="بازگشت">
          <span aria-hidden="true">→</span>
        </Link>
        <div className="game-topbar__title">
          <span className="game-topbar__emoji" aria-hidden="true">
            {emoji}
          </span>
          <h1>{title}</h1>
        </div>
        {scoreLabel != null ? (
          <div className="score-pill" aria-live="polite">
            <span>{scoreLabel}</span>
            <strong>{score}</strong>
          </div>
        ) : (
          <div className="score-pill score-pill--ghost" />
        )}
      </header>

      <div className="game-stage">{children}</div>

      {actions ? <div className="game-actions">{actions}</div> : null}
    </div>
  )
}
