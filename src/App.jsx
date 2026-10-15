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
import FruitBasket from './games/FruitBasket'
import BallTower from './games/BallTower'
import NumberMerge from './games/NumberMerge'
import TicTacToe from './games/TicTacToe'
import CarGame from './games/CarGame'
import AnimalSounds from './games/AnimalSounds'
import StarPaddle from './games/StarPaddle'
import ForestRun from './games/ForestRun'
import FruitMath from './games/FruitMath'
import BeastHunt from './games/BeastHunt'

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
          <Route path="/games/fruit" element={<FruitBasket />} />
          <Route path="/games/tower" element={<BallTower />} />
          <Route path="/games/merge" element={<NumberMerge />} />
          <Route path="/games/tic-tac-toe" element={<TicTacToe />} />
          <Route path="/games/car" element={<CarGame />} />
          <Route path="/games/animal-sounds" element={<AnimalSounds />} />
          <Route path="/games/star-paddle" element={<StarPaddle />} />
          <Route path="/games/forest" element={<ForestRun />} />
          <Route path="/games/fruit-math" element={<FruitMath />} />
          <Route path="/games/beast-hunt" element={<BeastHunt />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
