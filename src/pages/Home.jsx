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
        <h3>بازی‌های کودکانه محمد شجاع</h3>
        <p className="home-sub">یکی را انتخاب کن و شروع کن</p>
        <p className="home-sub">برای همکاری و ساخت بازی دلخواه به ایدی تلگرام زیر پیام دهید</p>
        <div style={{ display: 'flex', gap: '10px' , alignItems: 'center' , justifyContent: 'center' , width: '100%'}}>
        <a href="https://t.me/H_programmer" target="_blank" rel="noopener noreferrer" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <span className="home-card__body">
            <span className="home-card__index" style={{color: '#fff'}}>تلگرام</span>
            <span className="home-card__title" style={{color: '#fff' , direction: 'ltr'}}>@H_programmer</span>
          </span>
        </a>
        </div>
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
