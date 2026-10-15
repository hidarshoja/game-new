export const COLS = 7
export const SPAN = 12

const CAR_COLORS = ['#ef4444', '#3b82f6', '#facc15', '#f8fafc', '#a855f7', '#fb923c']

export function laneKind(y) {
  if (y <= 1) return 'grass'
  const cycle = (y - 2) % 6
  return ['road', 'road', 'grass', 'river', 'road', 'grass'][cycle]
}

function wrap(x) {
  return ((x % SPAN) + SPAN) % SPAN
}

export function overlaps(px, pw, ox, ow) {
  const a1 = px
  const a2 = px + pw
  const base = wrap(ox)
  for (const shift of [0, SPAN, -SPAN]) {
    const b1 = base + shift
    const b2 = b1 + ow
    if (a1 < b2 && a2 > b1) return true
  }
  return false
}

function makeLane(y) {
  const kind = laneKind(y)
  const dir = y % 2 === 0 ? 1 : -1
  const lane = {
    y,
    kind,
    dir,
    speed: 0,
    obstacles: [],
    trees: [],
  }

  if (kind === 'road') {
    lane.speed = Math.min(2.55, 1.25 + y * 0.03)
    const count = y > 18 && y % 3 === 0 ? 3 : 2
    let x = Math.random() * 2.2
    for (let i = 0; i < count; i += 1) {
      const w = 1.28
      lane.obstacles.push({
        x,
        w,
        color: CAR_COLORS[(y + i) % CAR_COLORS.length],
      })
      x += w + 2.35 + Math.random() * 0.7
    }
  }

  if (kind === 'river') {
    lane.speed = Math.min(1.75, 0.82 + y * 0.018)
    let x = Math.random() * 1.4
    for (let i = 0; i < 3; i += 1) {
      const w = 2.15
      lane.obstacles.push({ x, w })
      x += w + 1.45 + Math.random() * 0.45
    }
  }

  if (kind === 'grass' && y > 1) {
    const used = new Set()
    const count = 1 + (y % 4 === 0 ? 1 : 0)
    for (let i = 0; i < count; i += 1) {
      const tx = Math.floor(Math.random() * COLS)
      if (used.has(tx) || tx === 3) continue
      used.add(tx)
      lane.trees.push(tx)
    }
  }

  return lane
}

export function laneAt(state, y) {
  if (!state.lanes.has(y)) state.lanes.set(y, makeLane(y))
  return state.lanes.get(y)
}

export function ensureLanes(state, until) {
  for (let y = 0; y <= until; y += 1) laneAt(state, y)
  for (const y of state.lanes.keys()) {
    if (y < state.y - 8) state.lanes.delete(y)
  }
}

export function createCrossy() {
  const state = {
    x: 3,
    y: 0,
    score: 0,
    alive: true,
    cause: '',
    face: 'up',
    hop: null,
    hopLift: 0,
    time: 0,
    lanes: new Map(),
  }
  ensureLanes(state, 20)
  return state
}

function killed(state, cause) {
  state.alive = false
  state.cause = cause
  return 'dead'
}

function resolve(state) {
  const y = Math.round(state.y)
  const lane = laneAt(state, y)
  if (lane.kind === 'road') {
    const hit = lane.obstacles.some((ob) => overlaps(state.x + 0.16, 0.62, ob.x, ob.w))
    if (hit) return killed(state, 'car')
  }
  if (lane.kind === 'river') {
    const onLog = lane.obstacles.some((ob) => overlaps(state.x + 0.08, 0.78, ob.x, ob.w))
    if (!onLog) return killed(state, 'water')
  }
  return 'safe'
}

export function queueHop(state, dir) {
  if (!state.alive || state.hop) return false
  const baseX = Math.round(state.x)
  let toX = baseX
  let toY = state.y
  if (dir === 'left') toX = baseX - 1
  if (dir === 'right') toX = baseX + 1
  if (dir === 'up') toY = state.y + 1
  if (dir === 'down') toY = Math.max(0, state.y - 1)
  if (toX < 0 || toX >= COLS) return false
  if (toX === baseX && toY === state.y) return false
  const lane = laneAt(state, toY)
  if (lane.trees.includes(toX)) return false
  state.hop = { fromX: state.x, fromY: state.y, toX, toY, t: 0 }
  state.face = dir
  return true
}

export function updateCrossy(state, dt) {
  if (!state.alive) return 'idle'
  state.time += dt
  ensureLanes(state, Math.floor(state.y) + 16)

  for (const lane of state.lanes.values()) {
    if (!lane.speed) continue
    for (const ob of lane.obstacles) ob.x = wrap(ob.x + lane.dir * lane.speed * dt)
  }

  if (state.hop) {
    state.hop.t += dt
    const p = Math.min(1, state.hop.t / 0.16)
    const eased = p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2
    state.x = state.hop.fromX + (state.hop.toX - state.hop.fromX) * eased
    state.y = state.hop.fromY + (state.hop.toY - state.hop.fromY) * eased
    state.hopLift = Math.sin(Math.min(1, p) * Math.PI)
    if (p >= 1) {
      state.x = state.hop.toX
      state.y = state.hop.toY
      state.hop = null
      state.hopLift = 0
      const gained = state.y > state.score
      state.score = Math.max(state.score, state.y)
      const end = resolve(state)
      if (end === 'dead') return 'dead'
      return gained ? 'forward' : 'land'
    }
    return 'hop'
  }

  const lane = laneAt(state, Math.round(state.y))
  if (lane.kind === 'river') {
    const log = lane.obstacles.find((ob) => overlaps(state.x + 0.08, 0.78, ob.x, ob.w))
    if (!log) return killed(state, 'water')
    state.x += lane.dir * lane.speed * dt
    if (state.x < -0.15 || state.x > COLS - 0.85) return killed(state, 'water')
    return 'ride'
  }

  if (lane.kind === 'road') {
    const hit = lane.obstacles.some((ob) => overlaps(state.x + 0.16, 0.62, ob.x, ob.w))
    if (hit) return killed(state, 'car')
  }

  return 'idle'
}
