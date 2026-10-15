export function createRide(style) {
  return {
    style,
    y: 0,
    vy: 0,
    speed: 240,
    dist: 0,
    spawn: 0.8,
    coinSpawn: 0.4,
    obstacles: [],
    coins: [],
    score: 0,
    meter: 0,
    coinsGot: 0,
    alive: true,
    time: 0,
    nextId: 1,
    jumps: 0,
  }
}

export function jumpCar(state) {
  if (!state.alive) return false
  if (state.y >= -2) state.jumps = 0
  if (state.jumps >= 2) return false
  state.jumps += 1
  state.vy = -560
  return true
}

export function updateRide(state, dt) {
  if (!state.alive) return 'idle'
  state.time += dt
  state.speed = Math.min(430, 240 + state.time * 6)
  state.dist += state.speed * dt
  state.vy += 1500 * dt
  state.y += state.vy * dt
  if (state.y > 0) {
    state.y = 0
    state.vy = 0
    state.jumps = 0
  }

  state.spawn -= dt
  state.coinSpawn -= dt
  if (state.spawn <= 0) {
    const roll = Math.random()
    const kind = roll < 0.42 ? 'rock' : roll < 0.74 ? 'crate' : 'barrier'
    const size = {
      rock: { w: 44, h: 22 },
      crate: { w: 48, h: 50 },
      barrier: { w: 34, h: 74 },
    }[kind]
    state.obstacles.push({ id: state.nextId, x: 1020, kind, ...size })
    state.nextId += 1
    state.spawn = Math.max(0.9, 1.75 - state.time * 0.018)
  }
  if (state.coinSpawn <= 0) {
    const arc = Math.random() < 0.5
    const count = arc ? 3 : 1
    for (let i = 0; i < count; i += 1) {
      state.coins.push({
        id: state.nextId,
        x: 900 + i * 58,
        y: arc ? -78 - Math.sin(i * 1.4) * 48 : -90 - Math.random() * 50,
        got: false,
      })
      state.nextId += 1
    }
    state.coinSpawn = 0.85 + Math.random() * 0.7
  }

  const step = state.speed * dt
  for (const ob of state.obstacles) ob.x -= step
  for (const coin of state.coins) coin.x -= step

  const carX = 78
  const carW = 112
  const clearance = state.style?.wheel === 'monster' ? 24 : state.style?.wheel === 'big' ? 10 : 0
  for (const ob of state.obstacles) {
    const hitX = ob.x < carX + carW - 18 && ob.x + ob.w > carX + 22
    const hitY = -state.y + clearance < ob.h - 4
    if (hitX && hitY) {
      state.alive = false
      return 'dead'
    }
  }

  let picked = 0
  for (const coin of state.coins) {
    if (coin.got) continue
    const nearX = coin.x < carX + carW && coin.x > carX
    if (nearX && Math.abs(-state.y + coin.y) < 42) {
      coin.got = true
      picked += 1
      state.coinsGot += 1
      state.score += 10
    }
  }

  state.obstacles = state.obstacles.filter((ob) => ob.x > -120)
  state.coins = state.coins.filter((coin) => coin.x > -40 && !coin.got)
  state.meter += state.speed * dt * 0.05
  const gained = Math.floor(state.meter)
  state.meter -= gained
  state.score += gained
  return picked ? 'coin' : 'run'
}
