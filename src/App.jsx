import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GamePage from './pages/GamePage'
import BalloonPop from './games/BalloonPop'
import AnimalMatch from './games/AnimalMatch'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/balloon-pop" element={<BalloonPop />} />
          <Route path="/games/animal-match" element={<AnimalMatch />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
