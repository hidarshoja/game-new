export const LANES = 3
export const HITS_TO_WIN = 10

export const STAGES = [
  { name: 'دره', sky: ['#1e293b', '#334155', '#14532d'], aim: 0.42, hop: 1.05, fire: 1.2 },
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
    playerHits: 0,
    botHits: 0,
    cooldown: 0,
    mustRelease: false,
    botThink: 0.7,
    bullets: [],
    flashes: [],
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

export function shootPlayer(state, width) {
  if (!state.alive || state.pause > 0 || state.winner) return false
  if (state.mustRelease || state.cooldown > 0) return false
  state.bullets.push({
    side: 'player',
    lane: state.playerLane,
    x: width * 0.22,
    vx: 340,
  })
  state.flashes.push({ side: 'player', lane: state.playerLane, t: 0.12 })
  state.cooldown = 0.46
  state.mustRelease = true
  return true
}

export function releaseShot(state) {
  if (state) state.mustRelease = false
}

function botShoot(state, width, lane) {
  state.bullets.push({
    side: 'bot',
    lane,
    x: width * 0.78,
    vx: -300 - state.loop * 20,
  })
  state.flashes.push({ side: 'bot', lane, t: 0.12 })
}

export function updateDuel(state, dt, width) {
  if (!state.alive) return { event: null }
  const info = stageInfo(state)
  if (state.bannerT > 0) state.bannerT -= dt
  if (state.cooldown > 0) state.cooldown -= dt
  state.playerVis += (state.playerLane - state.playerVis) * Math.min(1, dt * 12)
  state.botVis += (state.botLane - state.botVis) * Math.min(1, dt * 10)

  for (const f of state.flashes) f.t -= dt
  state.flashes = state.flashes.filter((f) => f.t > 0)

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
      botShoot(state, width, aimed)
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
  for (const b of state.bullets) {
    b.x += b.vx * dt
    if (b.side === 'player' && b.x >= width * 0.76) {
      b.dead = true
      if (b.lane === state.botLane) {
        state.botHits += 1
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
    if (b.side === 'bot' && b.x <= width * 0.24) {
      b.dead = true
      if (b.lane === state.playerLane) {
        state.playerHits += 1
        event = 'hit-you'
        if (state.playerHits >= HITS_TO_WIN) {
          state.winner = 'bot'
          state.alive = false
          event = 'lose'
        }
      }
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead && b.x > -20 && b.x < width + 20)
  return { event }
}
