export const BALL_ANGLE = Math.PI / 2

const COLORS = ['#fb7185', '#22d3ee', '#facc15', '#a78bfa', '#34d399', '#fb923c']

function angDiff(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function addRing(state, open) {
  const index = state.rings.length
  const gap = Math.max(0.95, 1.7 - index * 0.025)
  state.rings.push({
    y: 240 + index * 150,
    gapCenter: open ? BALL_ANGLE : Math.random() * Math.PI * 2,
    gap,
    color: COLORS[index % COLORS.length],
    passed: false,
  })
}

export function createTower() {
  const state = {
    rot: 0,
    spin: 0,
    ballY: 0,
    score: 0,
    alive: true,
    time: 0,
    rings: [],
  }
  for (let i = 0; i < 14; i += 1) addRing(state, i === 0)
  return state
}

export function spinTower(state, dir) {
  state.spin = dir
}

export function nudgeTower(state, delta) {
  state.rot += delta
}

export function updateTower(state, dt) {
  if (!state.alive) return 'idle'
  state.time += dt
  state.rot += state.spin * 2.15 * dt
  const speed = Math.min(168, 78 + state.score * 3.2)
  state.ballY += speed * dt

  while (state.rings[state.rings.length - 1].y < state.ballY + 1600) {
    addRing(state, false)
  }

  let event = 'idle'
  for (const ring of state.rings) {
    if (ring.passed || state.ballY < ring.y) continue
    ring.passed = true
    const diff = Math.abs(angDiff(BALL_ANGLE, ring.gapCenter + state.rot))
    if (diff <= ring.gap / 2) {
      state.score += 1
      event = diff < ring.gap * 0.2 ? 'perfect' : 'pass'
      if (event === 'perfect') state.score += 2
    } else {
      state.alive = false
      return 'dead'
    }
  }

  state.rings = state.rings.filter((ring) => ring.y > state.ballY - 400)
  return event
}
