import { Link } from 'react-router-dom'
import { games } from '../data/games'

export default function GamePage() {
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <span className="coming-soon__emoji">🚧</span>
        <h1>به‌زودی</h1>
        <p>جزئیات این بازی هنوز تعریف نشده است.</p>
        <Link to="/" className="primary-btn">
          بازگشت به لیست
        </Link>
      </div>
    </div>
  )
}

export function getGameById(id) {
  return games.find((g) => g.id === id)
}
