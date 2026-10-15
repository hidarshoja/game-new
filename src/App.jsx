import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GamePage from './pages/GamePage'
import BalloonPop from './games/BalloonPop'
import AnimalMatch from './games/AnimalMatch'
import BrickStack from './games/BrickStack'
import BallBlast from './games/BallBlast'
import SnakeGame from './games/SnakeGame'
import CrossyRoad from './games/CrossyRoad'
import MetroRun from './games/MetroRun'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/balloon-pop" element={<BalloonPop />} />
          <Route path="/games/animal-match" element={<AnimalMatch />} />
          <Route path="/games/brick-stack" element={<BrickStack />} />
          <Route path="/games/ball-blast" element={<BallBlast />} />
          <Route path="/games/snake" element={<SnakeGame />} />
          <Route path="/games/crossy" element={<CrossyRoad />} />
          <Route path="/games/metro" element={<MetroRun />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
