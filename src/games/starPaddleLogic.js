export const COLS = 6

const COLORS = ['#fb7185', '#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f97316']

export function createStarRally() {
  return {
    bricks: seedRows(3),
    prizes: [],
    score: 0,
    wave: 1,
    paddleW: 120,
    alive: true,
    fire: 0,
    spawn: 2.4,
    rowTimer: 11,
  }
}

function seedRows(count) {
  const bricks = []
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (Math.random() < 0.12) continue
      bricks.push({
        id: `${row}-${col}-${Math.random()}`,
        col,
        row,
        hp: 1 + (Math.random() > 0.85 ? 1 : 0),
        color: COLORS[(row + col) % COLORS.length],
      })
    }
  }
  return bricks
}

export function addBrickRow(state) {
  for (const brick of state.bricks) brick.row += 1
  for (let col = 0; col < COLS; col += 1) {
    if (Math.random() < 0.15) continue
    state.bricks.push({
      id: `w${state.wave}-${col}-${Math.random()}`,
      col,
      row: 0,
      hp: 1 + Math.floor(state.wave / 5),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
  }
  state.wave += 1
  if (state.bricks.some((brick) => brick.row >= 8)) {
    state.alive = false
  }
}

export const PRIZES = [
  { id: 'wide', icon: '⬆', color: '#34d399' },
  { id: 'narrow', icon: '⬇', color: '#fb7185' },
  { id: 'star', icon: '★', color: '#facc15' },
  { id: 'slow', icon: '🐢', color: '#67e8f9' },
  { id: 'fast', icon: '⚡', color: '#38bdf8' },
  { id: 'multi', icon: '✦', color: '#c084fc' },
]
