export const COLS = 5

const COLORS = ['#f472b6', '#22d3ee', '#a3e635', '#fbbf24', '#c084fc', '#fb7185']

export function createStarRally() {
  return {
    bricks: seedRows(3),
    prizes: [],
    score: 0,
    wave: 1,
    paddleW: 108,
    alive: true,
    fire: 0,
    magnet: 0,
    shield: 0,
    spawn: 2.1,
    rowTimer: 10,
    lives: 1,
  }
}

function seedRows(count) {
  const bricks = []
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (Math.random() < 0.1) continue
      bricks.push({
        id: `${row}-${col}-${Math.random()}`,
        col,
        row,
        hp: 1 + (Math.random() > 0.8 ? 1 : 0),
        color: COLORS[(row + col) % COLORS.length],
        shape: row % 2 === 0 ? 'diamond' : 'hex',
      })
    }
  }
  return bricks
}

export function addBrickRow(state) {
  for (const brick of state.bricks) brick.row += 1
  for (let col = 0; col < COLS; col += 1) {
    if (Math.random() < 0.12) continue
    state.bricks.push({
      id: `w${state.wave}-${col}-${Math.random()}`,
      col,
      row: 0,
      hp: 1 + Math.floor(state.wave / 4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.5 ? 'diamond' : 'hex',
    })
  }
  state.wave += 1
  if (state.bricks.some((brick) => brick.row >= 8)) {
    state.alive = false
  }
}

/** جوایز مخصوص توپ ستاره‌ای — متفاوت از توپ و راکت */
export const PRIZES = [
  { id: 'magnet', icon: '🧲', color: '#38bdf8', label: 'مغناطیس' },
  { id: 'comet', icon: '☄️', color: '#fb923c', label: 'شهاب' },
  { id: 'twin', icon: '✨', color: '#e879f9', label: 'دوقلو' },
  { id: 'freeze', icon: '❄️', color: '#a5f3fc', label: 'یخ' },
  { id: 'gem', icon: '💎', color: '#67e8f9', label: 'جواهر' },
  { id: 'bomb', icon: '💥', color: '#f87171', label: 'انفجار' },
  { id: 'shield', icon: '🛡️', color: '#86efac', label: 'سپر' },
  { id: 'grow', icon: '🌕', color: '#fde68a', label: 'ماه بزرگ' },
  { id: 'shrink', icon: '🌑', color: '#94a3b8', label: 'ماه کوچک' },
  { id: 'orbit', icon: '🪐', color: '#c4b5fd', label: 'مدار' },
]
