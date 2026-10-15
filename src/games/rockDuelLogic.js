export const LANES = 3
export const HITS_TO_WIN = 10

export const STAGES = [
  { name: 'دره', sky: ['#0f172a', '#1e293b', '#14532d'], aim: 0.42, hop: 1.05, fire: 1.2 },
  { name: 'غروب', sky: ['#431407', '#9a3412', '#365314'], aim: 0.52, hop: 0.85, fire: 0.95 },
  { name: 'مه', sky: ['#0f172a', '#475569', '#1e293b'], aim: 0.48, hop: 0.72, fire: 0.82 },
  { name: 'طوفان', sky: ['#172554', '#1e3a8a', '#0f172a'], aim: 0.62, hop: 0.58, fire: 0.7 },
  { name: 'شب', sky: ['#020617', '#1e1b4b', '#052e16'], aim: 0.72, hop: 0.5, fire: 0.58 },
  { name: 'قلعه', sky: ['#450a0a', '#7f1d1d', '#1c1917'], aim: 0.8, hop: 0.42, fire: 0.48 },
]

export function createDuel() {
  return {
    stage: 0,
    loop: 0,
    playerLane: 1,
    botLane: 1,
    playerVis: 1,
    botVis: 1,
    aimLane: 1,
    playerHits: 0,
    botHits: 0,
    cooldown: 0,
    mustRelease: false,
    botThink: 0.7,
    bullets: [],
    flashes: [],
    particles: [],
    banner: 'دره',
    bannerT: 1.4,
    alive: true,
    winner: null,
    pause: 0,
  }
}

export function stageInfo(state) {
  const base = STAGES[state.stage % STAGES.length]
  const loop = state.loop
  return {
    ...base,
    aim: Math.min(0.92, base.aim + loop * 0.06),
    hop: Math.max(0.28, base.hop * (1 - loop * 0.12)),
    fire: Math.max(0.32, base.fire * (1 - loop * 0.1)),
    title: loop ? `${base.name} +${loop}` : base.name,
  }
}

export function movePlayer(state, dir) {
  if (!state.alive || state.pause > 0 || state.winner) return false
  const next = state.playerLane + dir
  if (next < 0 || next > 2) return false
  state.playerLane = next
  return true
}

export function setAimLane(state, lane) {
  if (!state || lane < 0 || lane > 2) return
  state.aimLane = lane
}

/** تیر به سمت صخره‌ای که نشانه گرفته‌ای می‌رود (حتی اگر خودت روی صخره دیگر باشی) */
export function shootPlayer(state, width, height, laneYFn) {
  if (!state.alive || state.pause > 0 || state.winner) return false
  if (state.mustRelease || state.cooldown > 0) return false
  const target = state.aimLane
  const startY = laneYFn(height, state.playerVis) - 34
  const endY = laneYFn(height, target) - 34
  const startX = width * 0.22
  const endX = width * 0.78
  const travel = 0.42
  state.bullets.push({
    side: 'player',
    lane: target,
    x: startX,
    y: startY,
    vx: (endX - startX) / travel,
    vy: (endY - startY) / travel,
    life: travel + 0.08,
  })
  state.flashes.push({ side: 'player', lane: state.playerLane, t: 0.14 })
  state.cooldown = 0.34
  state.mustRelease = true
  return true
}

export function releaseShot(state) {
  if (state) state.mustRelease = false
}

function botShoot(state, width, height, laneYFn, lane) {
  const startY = laneYFn(height, state.botVis) - 34
  const endY = laneYFn(height, lane) - 34
  const startX = width * 0.78
  const endX = width * 0.22
  const travel = 0.48
  state.bullets.push({
    side: 'bot',
    lane,
    x: startX,
    y: startY,
    vx: (endX - startX) / travel,
    vy: (endY - startY) / travel,
    life: travel + 0.08,
  })
  state.flashes.push({ side: 'bot', lane: state.botLane, t: 0.14 })
}

export function updateDuel(state, dt, width, height, laneYFn) {
  if (!state.alive) return { event: null }
  const info = stageInfo(state)
  if (state.bannerT > 0) state.bannerT -= dt
  if (state.cooldown > 0) state.cooldown -= dt
  state.playerVis += (state.playerLane - state.playerVis) * Math.min(1, dt * 12)
  state.botVis += (state.botLane - state.botVis) * Math.min(1, dt * 10)

  for (const f of state.flashes) f.t -= dt
  state.flashes = state.flashes.filter((f) => f.t > 0)

  for (const p of state.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  state.particles = state.particles.filter((p) => p.life > 0)

  if (state.pause > 0) {
    state.pause -= dt
    if (state.pause <= 0 && state.winner === 'player') {
      state.stage += 1
      if (state.stage >= STAGES.length) {
        state.stage = 0
        state.loop += 1
      }
      state.playerHits = 0
      state.botHits = 0
      state.playerLane = 1
      state.botLane = 1
      state.aimLane = 1
      state.bullets = []
      state.winner = null
      state.banner = stageInfo(state).title
      state.bannerT = 1.5
      return { event: 'next' }
    }
    return { event: null }
  }

  state.botThink -= dt
  if (state.botThink <= 0) {
    const roll = Math.random()
    if (roll < 0.55) {
      const aimed = Math.random() < info.aim ? state.playerLane : Math.floor(Math.random() * 3)
      botShoot(state, width, height, laneYFn, aimed)
      state.botThink = info.fire * (0.75 + Math.random() * 0.5)
    } else {
      const dir = Math.random() < 0.5 ? -1 : 1
      const next = state.botLane + dir
      if (next >= 0 && next <= 2) state.botLane = next
      else state.botLane = Math.max(0, Math.min(2, state.botLane - dir))
      state.botThink = info.hop * (0.55 + Math.random() * 0.6)
    }
  }

  let event = null
  const hitPad = 26
  for (const b of state.bullets) {
    b.life -= dt
    b.x += b.vx * dt
    b.y += b.vy * dt

    if (b.side === 'player' && b.x >= width * 0.74) {
      b.dead = true
      const botY = laneYFn(height, state.botVis) - 34
      if (Math.abs(b.y - botY) <= hitPad || b.lane === state.botLane) {
        state.botHits += 1
        spawnHit(state, b.x, b.y, '#38bdf8')
        event = 'hit-bot'
        if (state.botHits >= HITS_TO_WIN) {
          state.winner = 'player'
          state.pause = 1.35
          state.banner = 'مرحله تمام شد'
          state.bannerT = 1.3
          event = 'win'
        }
      }
    }
    if (b.side === 'bot' && b.x <= width * 0.26) {
      b.dead = true
      const youY = laneYFn(height, state.playerVis) - 34
      if (Math.abs(b.y - youY) <= hitPad || b.lane === state.playerLane) {
        state.playerHits += 1
        spawnHit(state, b.x, b.y, '#fb7185')
        event = 'hit-you'
        if (state.playerHits >= HITS_TO_WIN) {
          state.winner = 'bot'
          state.alive = false
          event = 'lose'
        }
      }
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead && b.life > 0 && b.x > -30 && b.x < width + 30)
  return { event }
}

function spawnHit(state, x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.35 + Math.random() * 0.2,
      color,
    })
  }
}

export function laneFromY(height, y, laneYFn) {
  let best = 1
  let bestDist = Infinity
  for (let lane = 0; lane < 3; lane += 1) {
    const dist = Math.abs(laneYFn(height, lane) - y)
    if (dist < bestDist) {
      bestDist = dist
      best = lane
    }
  }
  return best
}
