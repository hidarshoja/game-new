export const GRID = 16

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const FOOD_KINDS = [
  { id: 'apple', icon: '🍎', points: 10, color: '#ef4444' },
  { id: 'berry', icon: '🫐', points: 15, color: '#6366f1' },
  { id: 'lemon', icon: '🍋', points: 12, color: '#eab308' },
  { id: 'star', icon: '⭐', points: 25, color: '#f59e0b' },
]

const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export function createSnake() {
  const mid = Math.floor(GRID / 2)
  return {
    snake: [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ],
    dir: 'right',
    pending: null,
    food: null,
    score: 0,
    eaten: 0,
    alive: true,
    grow: 0,
  }
}

export function stepMs(eaten) {
  return Math.max(110, 280 - eaten * 7)
}

export function sameCell(a, b) {
  return a.x === b.x && a.y === b.y
}

export function occupied(snake, cell) {
  return snake.some((part) => sameCell(part, cell))
}

export function spawnFood(state, random = Math.random) {
  const free = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const cell = { x, y }
      if (!occupied(state.snake, cell)) free.push(cell)
    }
  }
  if (free.length === 0) return null
  const spot = free[Math.floor(random() * free.length)]
  const kind = FOOD_KINDS[Math.floor(random() * FOOD_KINDS.length)]
  return { ...spot, ...kind }
}

export function queueDir(state, next) {
  if (!DIRS[next]) return
  const current = state.pending || state.dir
  if (OPPOSITE[current] === next) return
  state.pending = next
}

export function tick(state, random = Math.random) {
  if (!state.alive) return 'dead'
  if (state.pending) {
    state.dir = state.pending
    state.pending = null
  }
  const move = DIRS[state.dir]
  const head = state.snake[0]
  // لبه‌ها می‌پیچند؛ فقط برخورد با بدن تمام‌کننده است
  const next = {
    x: (head.x + move.x + GRID) % GRID,
    y: (head.y + move.y + GRID) % GRID,
  }

  const bodyHit = state.snake.some((part, index) => {
    if (state.grow > 0 && index === state.snake.length - 1) return false
    return sameCell(part, next)
  })
  if (bodyHit) {
    state.alive = false
    return 'self'
  }

  state.snake.unshift(next)
  if (state.food && sameCell(next, state.food)) {
    state.score += state.food.points
    state.eaten += 1
    state.grow += 1
    state.food = spawnFood(state, random)
    return 'eat'
  }

  if (state.grow > 0) state.grow -= 1
  else state.snake.pop()
  return 'move'
}
