export function createMetro() {
  return {
    lane: 1,
    visualLane: 1,
    zRun: 0,
    speed: 8.2,
    jump: 0,
    jumpV: 0,
    slide: 0,
    obstacles: [],
    coins: [],
    nextSpawn: 1.15,
    score: 0,
    coinsGot: 0,
    alive: true,
    cause: '',
    time: 0,
  }
}

export function steerMetro(state, action) {
  if (!state.alive) return false
  if (action === 'left' && state.lane > 0) {
    state.lane -= 1
    return true
  }
  if (action === 'right' && state.lane < 2) {
    state.lane += 1
    return true
  }
  if (action === 'jump' && state.jump <= 0.02 && state.slide <= 0) {
    state.jumpV = 3.55
    return true
  }
  if (action === 'slide' && state.jump <= 0.08) {
    state.slide = 0.62
    state.jump = 0
    state.jumpV = 0
    return true
  }
  return false
}

function spawn(state) {
  const roll = Math.random()
  if (roll < 0.3) {
    const lane = Math.floor(Math.random() * 3)
    for (let i = 0; i < 5; i += 1) {
      state.coins.push({ lane, z: 18 + i * 1.15, got: false })
    }
    return
  }

  const type = roll < 0.58 ? 'low' : roll < 0.8 ? 'high' : 'block'
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5)
  const count = type === 'block' && Math.random() < 0.4 ? 2 : 1
  for (let i = 0; i < count; i += 1) {
    state.obstacles.push({ lane: lanes[i], z: 18, type, hit: false })
  }
}

export function updateMetro(state, dt) {
  if (!state.alive) return { died: false, picked: 0 }

  state.time += dt
  state.speed = Math.min(12.2, 8.2 + state.zRun * 0.01)
  state.zRun += state.speed * dt
  state.visualLane += (state.lane - state.visualLane) * Math.min(1, dt * 14)

  if (state.slide > 0) state.slide -= dt
  state.jumpV -= 8.6 * dt
  state.jump += state.jumpV * dt
  if (state.jump <= 0) {
    state.jump = 0
    state.jumpV = 0
  }

  state.nextSpawn -= dt
  if (state.nextSpawn <= 0) {
    spawn(state)
    state.nextSpawn = Math.max(0.78, 1.28 - state.zRun * 0.003)
  }

  for (const ob of state.obstacles) ob.z -= state.speed * dt

  let picked = 0
  for (const coin of state.coins) {
    coin.z -= state.speed * dt
    if (!coin.got && coin.lane === state.lane && coin.z < 0.5 && coin.z > -0.2) {
      coin.got = true
      picked += 1
      state.coinsGot += 1
    }
  }

  for (const ob of state.obstacles) {
    if (ob.hit || ob.lane !== state.lane) continue
    if (ob.z > 0.55 || ob.z < -0.12) continue
    if (ob.type === 'low' && state.jump > 0.42) continue
    if (ob.type === 'high' && state.slide > 0.05) continue
    ob.hit = true
    state.alive = false
    state.cause = ob.type
    break
  }

  state.obstacles = state.obstacles.filter((ob) => ob.z > -3)
  state.coins = state.coins.filter((coin) => coin.z > -2 && !coin.got)
  state.score = Math.floor(state.zRun) + state.coinsGot * 10

  return { died: !state.alive, picked }
}
