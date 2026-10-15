/** ۱۰ مرحله پایه */
export const BEASTS = [
  { id: 'snake', name: 'مار', hits: 2, speed: 15, accent: '#16a34a', dodge: 0.95 },
  { id: 'fox', name: 'روباه', hits: 3, speed: 16, accent: '#ea580c', dodge: 1.1 },
  { id: 'eagle', name: 'عقاب', hits: 4, speed: 18, accent: '#92400e', dodge: 1.25 },
  { id: 'wolf', name: 'گرگ', hits: 5, speed: 16, accent: '#57534e', dodge: 1 },
  { id: 'boar', name: 'گراز', hits: 6, speed: 14, accent: '#78716c', dodge: 0.75 },
  { id: 'croc', name: 'تمساح', hits: 7, speed: 13, accent: '#166534', dodge: 0.7 },
  { id: 'lion', name: 'شیر', hits: 8, speed: 15, accent: '#ca8a04', dodge: 0.95 },
  { id: 'bear', name: 'خرس', hits: 9, speed: 12, accent: '#78350f', dodge: 0.65 },
  { id: 'tiger', name: 'ببر', hits: 9, speed: 17, accent: '#f97316', dodge: 1.15 },
  { id: 'dragon', name: 'اژدها', hits: 10, speed: 11, accent: '#7c3aed', dodge: 1 },
]

export const STAGES_PER_LEVEL = BEASTS.length
export const MAG_SIZE = 4

export function hitsFor(beast, level) {
  return beast.hits + (level - 1)
}

export function speedFor(beast, level) {
  return beast.speed * (1 + (level - 1) * 0.16)
}

export function createHunt() {
  return {
    level: 1,
    stage: 0,
    score: 0,
    alive: true,
    aim: -0.12,
    cooldown: 0,
    ammo: MAG_SIZE,
    reload: 0,
    bloom: 0,
    mustRelease: false,
    bullets: [],
    particles: [],
    flames: [],
    beast: null,
    banner: '',
    bannerT: 0,
    cleared: false,
    eaten: null,
    shake: 0,
  }
}

export function spawnStage(state, width) {
  const beast = BEASTS[state.stage % BEASTS.length]
  const level = state.level
  state.beast = {
    id: beast.id,
    name: beast.name,
    accent: beast.accent,
    dodge: beast.dodge * (1 + (level - 1) * 0.06),
    maxHp: hitsFor(beast, level),
    hp: hitsFor(beast, level),
    speed: speedFor(beast, level),
    x: width + 60,
    yOff: (Math.random() - 0.5) * 30,
    yTarget: 0,
    dodgeT: 0.25 + Math.random() * 0.35,
    bob: Math.random() * 10,
    hurt: 0,
    dead: false,
    dieT: 0,
    fireT: beast.id === 'dragon' ? 0.9 : 0,
    chomp: 0,
    weave: Math.random() * Math.PI * 2,
  }
  state.bullets = []
  state.flames = []
  state.eaten = null
  state.ammo = MAG_SIZE
  state.reload = 0
  state.bloom = 0
  state.mustRelease = false
  state.banner = `مرحله ${state.stage + 1} — ${beast.name}`
  state.bannerT = 1.5
  state.cleared = false
}

export function advanceAfterKill(state, width) {
  state.score += state.beast.maxHp * 12 + state.level * 8
  state.stage += 1
  if (state.stage >= STAGES_PER_LEVEL) {
    state.stage = 0
    state.level += 1
    state.banner = `لول ${state.level}! سخت‌تر شد`
    state.bannerT = 2.2
  }
  spawnStage(state, width)
}

/** فقط با رها کردن انگشت می‌شود دوباره تیر زد — نگه‌داشتن کافی نیست */
export function shoot(state, heroX, heroY) {
  if (!state.alive || state.eaten || !state.beast || state.beast.dead) return false
  if (state.mustRelease) return false
  if (state.reload > 0) return false
  if (state.cooldown > 0) return false
  if (state.ammo <= 0) {
    state.reload = 0.85
    state.ammo = 0
    return false
  }

  const spread = (Math.random() - 0.5) * state.bloom * 0.55
  const angle = state.aim + spread
  const speed = 480 + Math.random() * 40
  state.bullets.push({
    x: heroX + 30,
    y: heroY - 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.25,
  })
  state.ammo -= 1
  state.cooldown = 0.32
  state.bloom = Math.min(0.7, state.bloom + 0.18)
  state.mustRelease = true
  state.shake = Math.min(6, state.shake + 2)
  if (state.ammo <= 0) state.reload = 0.85
  return true
}

export function onPointerRelease(state) {
  state.mustRelease = false
}

function pickDodge(beast, height) {
  const amp = 36 * beast.dodge
  const picks = [-amp, -amp * 0.65, -amp * 0.3, amp * 0.3, amp * 0.65, amp]
  let next = picks[Math.floor(Math.random() * picks.length)]
  if (Math.abs(next - beast.yOff) < 18) next = -Math.sign(beast.yOff || 1) * amp * 0.8
  beast.yTarget = Math.max(-height * 0.2, Math.min(height * 0.16, next))
  beast.dodgeT = (0.32 + Math.random() * 0.45) / Math.max(0.85, beast.dodge)
}

export function updateHunt(state, dt, width, height, heroX, heroY) {
  if (!state.alive) return { event: null }
  if (state.bannerT > 0) state.bannerT -= dt
  if (state.cooldown > 0) state.cooldown -= dt
  if (state.bloom > 0) state.bloom = Math.max(0, state.bloom - dt * 0.85)
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 18)
  if (state.reload > 0) {
    state.reload -= dt
    if (state.reload <= 0) {
      state.ammo = MAG_SIZE
      state.reload = 0
    }
  }

  for (const p of state.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 220 * dt
  }
  state.particles = state.particles.filter((p) => p.life > 0)

  if (state.eaten) {
    state.eaten.t += dt
    if (state.beast) {
      state.beast.chomp = Math.min(1, state.eaten.t / 0.3)
      state.beast.x += (heroX + 36 - state.beast.x) * Math.min(1, dt * 5)
    }
    if (state.eaten.t >= 1.2) {
      state.alive = false
      return { event: 'lost' }
    }
    return { event: null }
  }

  const beast = state.beast
  if (!beast) return { event: null }

  if (beast.hurt > 0) beast.hurt -= dt
  beast.bob += dt
  beast.weave += dt * (2.2 + beast.dodge * 0.8)

  if (beast.dead) {
    beast.dieT += dt
    beast.yOff += 50 * dt
    if (beast.dieT > 0.65) {
      advanceAfterKill(state, width)
      return { event: 'cleared' }
    }
    return { event: null }
  }

  beast.x -= beast.speed * dt
  // حرکت موجی اضافه برای غیرقابل پیش‌بینی بودن
  const weaveAmp = 5 * beast.dodge
  beast.dodgeT -= dt

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    const dx = beast.x - b.x
    if (dx > 30 && dx < 130) {
      const t = dx / Math.max(60, b.vx)
      const futureY = b.y + b.vy * t
      const byNow = height * 0.56 + beast.yOff + Math.sin(beast.weave) * weaveAmp
      if (Math.abs(futureY - byNow) < 28 && Math.random() < 0.45) {
        beast.yTarget = futureY < byNow
          ? beast.yOff + 28 * beast.dodge
          : beast.yOff - 28 * beast.dodge
        beast.yTarget = Math.max(-height * 0.16, Math.min(height * 0.14, beast.yTarget))
        beast.dodgeT = 0.45
        break
      }
    }
  }

  if (beast.dodgeT <= 0) pickDodge(beast, height)
  const dodgeSpeed = 120 * beast.dodge
  if (beast.yOff < beast.yTarget) beast.yOff = Math.min(beast.yTarget, beast.yOff + dodgeSpeed * dt)
  if (beast.yOff > beast.yTarget) beast.yOff = Math.max(beast.yTarget, beast.yOff - dodgeSpeed * dt)

  const baseY = height * 0.56 + Math.sin(beast.bob * 2.4) * (beast.id === 'eagle' ? 16 : 3)
  const by = baseY + beast.yOff + Math.sin(beast.weave) * weaveAmp
  beast.drawY = by

  if (beast.id === 'dragon') {
    beast.fireT -= dt
    if (beast.fireT <= 0 && beast.x < width * 0.9) {
      const mouthX = beast.x - 92
      const mouthY = by - 10
      for (let i = 0; i < 2; i += 1) {
        state.flames.push({
          x: mouthX - i * 6,
          y: mouthY + (i - 0.5) * 10,
          vx: -150 - state.level * 12 - i * 8,
          vy: (i - 0.5) * 24,
          life: 1.35,
          r: 10 + i * 2,
        })
      }
      beast.fireT = Math.max(1.15, 1.9 - state.level * 0.06)
      beast.chomp = 1
    }
    if (beast.chomp > 0) beast.chomp -= dt * 2
  }

  for (const f of state.flames) {
    f.life -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.r *= 1 + dt * 0.5
    if (Math.hypot(f.x - heroX, f.y - (heroY - 18)) < 26 + f.r * 0.3) {
      state.eaten = { t: 0, byFire: true }
      beast.chomp = 0
      return { event: 'eaten' }
    }
  }
  state.flames = state.flames.filter((f) => f.life > 0 && f.x > -50)

  if (beast.x < heroX + 52 && beast.x < width * 0.52) {
    state.eaten = { t: 0, byFire: false }
    beast.chomp = 0
    return { event: 'eaten' }
  }

  for (const b of state.bullets) {
    b.life -= dt
    b.x += b.vx * dt
    b.y += b.vy * dt
  }

  let hit = false
  // جعبه کوچک‌تر = سخت‌تر
  const hitLeft = beast.x - 78
  const hitRight = beast.x + 40
  const hitTop = by - 42
  const hitBottom = by + 38

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    if (b.x >= hitLeft && b.x <= hitRight && b.y >= hitTop && b.y <= hitBottom) {
      b.life = 0
      beast.hp -= 1
      beast.hurt = 0.2
      hit = true
      beast.yTarget = beast.yOff + (Math.random() > 0.5 ? 1 : -1) * 24 * beast.dodge
      beast.yTarget = Math.max(-height * 0.16, Math.min(height * 0.14, beast.yTarget))
      beast.dodgeT = 0.4
      for (let i = 0; i < 10; i += 1) {
        state.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.85) * 200,
          life: 0.3 + Math.random() * 0.3,
          color: i % 2 ? beast.accent : '#fef3c7',
        })
      }
      if (beast.hp <= 0) {
        beast.dead = true
        beast.dieT = 0
        state.flames = []
        return { event: 'kill', hit: true }
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x < width + 40 && b.y > -40 && b.y < height + 40)
  return { event: hit ? 'hit' : null, hit }
}
