const FRUITS = [
  { id: 'apple', points: 10, color: '#ef4444' },
  { id: 'orange', points: 12, color: '#f97316' },
  { id: 'lemon', points: 14, color: '#facc15' },
  { id: 'grape', points: 16, color: '#a855f7' },
  { id: 'berry', points: 18, color: '#ec4899' },
]

const BAD = [
  { id: 'rock', color: '#64748b' },
  { id: 'bomb', color: '#111827' },
]

export function createFruit() {
  return {
    basketX: 0.5,
    items: [],
    spawn: 1.1,
    score: 0,
    lives: 3,
    caught: 0,
    alive: true,
    time: 0,
    nextId: 1,
  }
}

export function setBasket(state, x) {
  state.basketX = Math.min(0.84, Math.max(0.16, x))
}

export function nudgeBasket(state, dir) {
  setBasket(state, state.basketX + dir * 0.09)
}

export function updateFruit(state, dt) {
  if (!state.alive) return { caught: 0, bad: 0, died: false }
  state.time += dt
  const fall = Math.min(0.46, 0.2 + state.time * 0.006)
  state.spawn -= dt
  let caught = 0
  let bad = 0

  if (state.spawn <= 0) {
    const allowBad = state.time > 2.4 && Math.random() < Math.min(0.26, 0.08 + state.time * 0.004)
    const kind = allowBad ? BAD[Math.floor(Math.random() * BAD.length)] : FRUITS[Math.floor(Math.random() * FRUITS.length)]
    state.items.push({
      id: state.nextId,
      x: 0.14 + Math.random() * 0.72,
      y: -0.08,
      kind,
      bad: allowBad,
    })
    state.nextId += 1
    state.spawn = Math.max(0.42, 1.05 - state.time * 0.01)
  }

  const keep = []
  for (const item of state.items) {
    item.y += fall * dt
    const inBasket = item.y >= 0.76 && item.y <= 0.86 && Math.abs(item.x - state.basketX) < 0.13
    if (inBasket) {
      if (item.bad) {
        bad += 1
        state.lives -= 1
        if (state.lives <= 0) {
          state.alive = false
          state.items = keep
          return { caught, bad, died: true }
        }
      } else {
        caught += 1
        state.caught += 1
        state.score += item.kind.points
      }
      continue
    }
    if (item.y < 1.08) keep.push(item)
  }
  state.items = keep
  return { caught, bad, died: false }
}
