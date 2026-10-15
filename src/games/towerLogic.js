export const BALL_ANGLE = Math.PI / 2

const COLORS = [
  ['#fda4af', '#e11d48'],
  ['#7dd3fc', '#0284c7'],
  ['#fde68a', '#d97706'],
  ['#c4b5fd', '#7c3aed'],
  ['#86efac', '#059669'],
  ['#fdba74', '#ea580c'],
]

function angDiff(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function addRing(state, open) {
  const index = state.rings.length
  const gap = Math.max(0.9, 1.65 - index * 0.022)
  const palette = COLORS[index % COLORS.length]
  state.rings.push({
    y: 280 + index * 165,
    gapCenter: open ? BALL_ANGLE : Math.random() * Math.PI * 2,
    gap,
    color: palette[0],
    deep: palette[1],
    passed: false,
  })
}

export function createTower() {
  const state = {
    rot: 0,
    spin: 0,
    ballY: 40,
    ballV: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    alive: true,
    time: 0,
    bounce: 0,
    shake: 0,
    flash: 0,
    particles: [],
    rings: [],
  }
  for (let i = 0; i < 16; i += 1) addRing(state, i < 2)
  return state
}

export function spinTower(state, dir) {
  state.spin = dir
}

export function nudgeTower(state, delta) {
  state.rot += delta
}

function burst(state, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2
    const s = 40 + Math.random() * 90
    state.particles.push({
      x: Math.cos(BALL_ANGLE) * 0.7,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 30,
      life: 0.35 + Math.random() * 0.25,
      color,
      size: 3 + Math.random() * 4,
    })
  }
}

export function updateTower(state, dt) {
  if (!state.alive) return 'idle'
  state.time += dt
  state.rot += state.spin * 2.35 * dt
  if (state.bounce > 0) state.bounce = Math.max(0, state.bounce - dt)
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt)
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt)

  const fall = Math.min(210, 92 + state.score * 3.4)
  const hop = Math.sin(state.time * 9.5) * 10
  state.ballV = fall
  state.ballY += fall * dt

  while (state.rings[state.rings.length - 1].y < state.ballY + 1800) {
    addRing(state, false)
  }

  let event = 'idle'
  for (const ring of state.rings) {
    if (ring.passed || state.ballY < ring.y) continue
    ring.passed = true
    const diff = Math.abs(angDiff(BALL_ANGLE, ring.gapCenter + state.rot))
    if (diff <= ring.gap / 2) {
      const perfect = diff < ring.gap * 0.22
      state.combo = perfect ? state.combo + 1 : 1
      state.bestCombo = Math.max(state.bestCombo, state.combo)
      state.score += perfect ? 3 + Math.min(4, state.combo) : 1
      state.bounce = 0.16
      state.flash = perfect ? 0.22 : 0.1
      burst(state, ring.y, perfect ? '#fde68a' : ring.color, perfect ? 16 : 10)
      event = perfect ? 'perfect' : 'pass'
    } else {
      state.alive = false
      state.shake = 0.35
      state.ballV = 0
      burst(state, ring.y, '#fb7185', 22)
      return 'dead'
    }
  }
  state.hop = hop

  for (const p of state.particles) {
    p.life -= dt
    p.x += (p.vx * dt) / 180
    p.y += p.vy * dt
    p.vy += 260 * dt
  }
  state.particles = state.particles.filter((p) => p.life > 0)
  state.rings = state.rings.filter((ring) => ring.y > state.ballY - 520)
  return event
}
