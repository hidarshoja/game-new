import { Link } from 'react-router-dom'
import InstallApp from '../components/InstallApp'
import { games } from '../data/games'

export default function Home() {
  return (
    <div className="home">
      <div className="home-bg" aria-hidden="true">
        <span className="blob blob--a" />
        <span className="blob blob--b" />
        <span className="blob blob--c" />
      </div>

      <header className="home-hero">
        <p className="home-kicker">دنیای بازی‌های کودک</p>
        <h1>بازی‌های شاد</h1>
        <p className="home-sub">یکی را انتخاب کن و شروع کن</p>
      </header>

      <InstallApp />

      <nav className="home-list" aria-label="لیست بازی‌ها">
        {games.map((game, index) => {
          const content = (
            <>
              <span
                className="home-card__icon"
                style={{
                  background: `linear-gradient(145deg, ${game.accent}33, ${game.accent}18)`,
                  boxShadow: `0 10px 28px ${game.glow}`,
                }}
              >
                {game.emoji}
              </span>
              <span className="home-card__body">
                <span className="home-card__index">بازی {index + 1}</span>
                <span className="home-card__title">{game.title}</span>
                <span className="home-card__meta">{game.skill}</span>
              </span>
              <span className="home-card__arrow" aria-hidden="true">
                {game.comingSoon ? '…' : '‹'}
              </span>
            </>
          )

          if (game.comingSoon) {
            return (
              <div key={game.id} className="home-card home-card--soon">
                {content}
              </div>
            )
          }

          return (
            <Link
              key={game.id}
              to={game.path}
              className="home-card"
              style={{ '--accent': game.accent, '--glow': game.glow }}
            >
              {content}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
