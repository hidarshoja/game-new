const HALF = 34
const RADIUS = 15
const GRAVITY = 1280

export function createTrail() {
  const start = groundHeight(40) + 48
  return {
    x: 40,
    y: start,
    vx: 150,
    vy: 0,
    angle: 0,
    angVel: 0,
    lean: 0,
    alive: true,
    time: 0,
    score: 0,
    grounded: true,
  }
}

export function groundHeight(x) {
  let height = 118
  height += Math.sin(x * 0.0034) * 34
  height += Math.sin(x * 0.0105 + 0.8) * 14
  const span = 760
  const local = ((x % span) + span) % span
  if (local > 470 && local < 690) {
    const t = (local - 470) / 220
    const crest = 78 + (Math.floor(x / span) % 3) * 18
    height += Math.sin(t * Math.PI) * crest
  }
  const gapSpan = 1550
  const gap = ((x % gapSpan) + gapSpan) % gapSpan
  if (x > 700 && gap > 1240 && gap < 1360) height -= 78
  return height
}

export function updateTrail(state, dt, targetLean) {
  if (!state.alive) return 'dead'
  const step = Math.min(0.032, Math.max(0, dt))
  state.time += step
  state.lean += (targetLean - state.lean) * Math.min(1, step * 8)
  state.vy -= GRAVITY * step
  state.angVel += state.lean * 3.6 * step
  state.angVel *= Math.max(0, 1 - 2.4 * step)
  state.angle += state.angVel * step

  let grounded = false
  for (const side of [-1, 1]) {
    const wx = state.x + Math.cos(state.angle) * side * HALF
    const wy = state.y + Math.sin(state.angle) * side * HALF
    const floor = groundHeight(wx) + RADIUS
    const sink = floor - wy
    if (sink > 0) {
      grounded = true
      const push = sink * 48 + Math.max(0, -state.vy) * 7
      state.vy += push * step
      state.y += Math.min(sink, 12) * 0.45
      state.angVel += side * Math.min(sink, 24) * 0.012
      state.vx = Math.min(360, 155 + state.time * 3.2)
    }
  }
  state.grounded = grounded
  if (!grounded) state.vx *= 1 - step * 0.15

  state.x += state.vx * step
  state.y += state.vy * step
  state.score = Math.max(state.score, Math.floor(state.x / 14))

  const sunk = groundHeight(state.x) - state.y
  if (Math.abs(state.angle) > 1.22 || sunk > 36) {
    state.alive = false
    return 'dead'
  }
  return 'run'
}
