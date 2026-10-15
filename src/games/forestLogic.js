export function createForest() {
  return {
    lane: 1,
    visualLane: 1,
    zRun: 0,
    speed: 7.6,
    jump: 0,
    jumpV: 0,
    slide: 0,
    obstacles: [],
    fruits: [],
    nextSpawn: 1.05,
    score: 0,
    fruitsGot: 0,
    alive: true,
    time: 0,
    // وقتی حیوان می‌گیرد: { lane, type, emoji, color, t }
    eaten: null,
  }
}

export function steerForest(state, action) {
  if (!state.alive || state.eaten) return false
  if (action === 'left' && state.lane > 0) {
    state.lane -= 1
    return true
  }
  if (action === 'right' && state.lane < 2) {
    state.lane += 1
    return true
  }
  if (action === 'jump' && state.jump <= 0.02 && state.slide <= 0) {
    state.jumpV = 3.6
    return true
  }
  if (action === 'slide' && state.jump <= 0.08) {
    state.slide = 0.58
    state.jump = 0
    state.jumpV = 0
    return true
  }
  return false
}

const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉']

export const ANIMALS = [
  { type: 'low', emoji: '🦔', label: 'خارپشت', color: '#92400e', mouth: '#7f1d1d' },
  { type: 'high', emoji: '🦅', label: 'عقاب', color: '#78350f', mouth: '#450a0a' },
  { type: 'block', emoji: '🐻', label: 'خرس', color: '#5c3d1e', mouth: '#7f1d1d' },
  { type: 'block', emoji: '🐺', label: 'گرگ', color: '#57534e', mouth: '#450a0a' },
  { type: 'low', emoji: '🐊', label: 'تمساح', color: '#166534', mouth: '#14532d' },
]

function spawn(state) {
  const roll = Math.random()
  if (roll < 0.38) {
    const lane = Math.floor(Math.random() * 3)
    for (let i = 0; i < 4; i += 1) {
      state.fruits.push({
        lane,
        z: 17 + i * 1.1,
        got: false,
        emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
      })
    }
    return
  }
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5)
  const count = animal.type === 'block' && Math.random() < 0.35 ? 2 : 1
  for (let i = 0; i < count; i += 1) {
    state.obstacles.push({
      lane: lanes[i],
      z: 18,
      type: animal.type,
      emoji: animal.emoji,
      color: animal.color,
      mouth: animal.mouth,
      hit: false,
      chomp: 0,
    })
  }
}

export function updateForest(state, dt) {
  if (!state.alive) return { died: false, picked: 0 }

  // صحنه بلعیده شدن
  if (state.eaten) {
    state.eaten.t += dt
    state.time += dt
    for (const ob of state.obstacles) {
      if (ob === state.eaten.ob || (ob.lane === state.eaten.lane && Math.abs(ob.z - 0.35) < 0.8)) {
        ob.chomp = Math.min(1, state.eaten.t / 0.35)
        ob.z = Math.max(0.28, ob.z - dt * 0.4)
      }
    }
    if (state.eaten.t >= 1.15) {
      state.alive = false
      return { died: true, picked: 0 }
    }
    return { died: false, picked: 0 }
  }

  state.time += dt
  state.speed = Math.min(11.8, 7.6 + state.zRun * 0.012)
  state.zRun += state.speed * dt
  state.visualLane += (state.lane - state.visualLane) * Math.min(1, dt * 14)
  if (state.slide > 0) state.slide -= dt
  state.jumpV -= 8.8 * dt
  state.jump += state.jumpV * dt
  if (state.jump <= 0) {
    state.jump = 0
    state.jumpV = 0
  }
  state.nextSpawn -= dt
  if (state.nextSpawn <= 0) {
    spawn(state)
    state.nextSpawn = Math.max(0.72, 1.2 - state.zRun * 0.003)
  }
  for (const ob of state.obstacles) {
    ob.z -= state.speed * dt
    // دهان کمی باز و بسته می‌شود
    ob.chomp = 0.35 + Math.sin(state.time * 6 + ob.lane) * 0.2
  }
  let picked = 0
  for (const fruit of state.fruits) {
    fruit.z -= state.speed * dt
    if (!fruit.got && fruit.lane === state.lane && fruit.z < 0.5 && fruit.z > -0.2 && state.slide <= 0.05) {
      fruit.got = true
      picked += 1
      state.fruitsGot += 1
      state.score += 8
    }
  }
  for (const ob of state.obstacles) {
    if (ob.hit || ob.lane !== state.lane) continue
    if (ob.z > 0.55 || ob.z < -0.12) continue
    if (ob.type === 'low' && state.jump > 0.42) continue
    if (ob.type === 'high' && state.slide > 0.05) continue
    ob.hit = true
    ob.chomp = 0
    state.eaten = {
      lane: ob.lane,
      type: ob.type,
      emoji: ob.emoji,
      color: ob.color,
      mouth: ob.mouth,
      ob,
      t: 0,
    }
    state.jump = 0
    state.jumpV = 0
    state.slide = 0
    return { died: false, picked, eaten: true }
  }
  state.obstacles = state.obstacles.filter((ob) => ob.z > -2)
  state.fruits = state.fruits.filter((fruit) => fruit.z > -2 && !fruit.got)
  state.score = Math.max(state.score, Math.floor(state.zRun * 2) + state.fruitsGot * 8)
  return { died: false, picked }
}
