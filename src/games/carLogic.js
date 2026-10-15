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
  }
}

export function jumpCar(state) {
  if (!state.alive || state.y > 2) return false
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
  }

  state.spawn -= dt
  state.coinSpawn -= dt
  if (state.spawn <= 0) {
    state.obstacles.push({
      id: state.nextId,
      x: 980,
      w: 46 + Math.random() * 24,
      h: 36 + Math.random() * 28,
    })
    state.nextId += 1
    state.spawn = Math.max(0.85, 1.7 - state.time * 0.02)
  }
  if (state.coinSpawn <= 0) {
    state.coins.push({
      id: state.nextId,
      x: 860,
      y: -70 - Math.random() * 70,
      got: false,
    })
    state.nextId += 1
    state.coinSpawn = 0.7 + Math.random() * 0.6
  }

  const step = state.speed * dt
  for (const ob of state.obstacles) ob.x -= step
  for (const coin of state.coins) coin.x -= step

  const carX = 92
  const carW = 78
  for (const ob of state.obstacles) {
    const hitX = ob.x < carX + carW - 16 && ob.x + ob.w > carX + 18
    const hitY = -state.y < ob.h - 6
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
