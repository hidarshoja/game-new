/** ۱۰ مرحله پایه */
export const BEASTS = [
  { id: 'snake', name: 'مار', hits: 3, speed: 20, accent: '#16a34a', dodge: 1.45 },
  { id: 'fox', name: 'روباه', hits: 4, speed: 22, accent: '#ea580c', dodge: 1.65 },
  { id: 'eagle', name: 'عقاب', hits: 5, speed: 25, accent: '#92400e', dodge: 1.85 },
  { id: 'wolf', name: 'گرگ', hits: 6, speed: 23, accent: '#57534e', dodge: 1.4 },
  { id: 'boar', name: 'گراز', hits: 7, speed: 19, accent: '#78716c', dodge: 1.05 },
  { id: 'croc', name: 'تمساح', hits: 8, speed: 17, accent: '#166534', dodge: 0.95 },
  { id: 'lion', name: 'شیر', hits: 9, speed: 21, accent: '#ca8a04', dodge: 1.35 },
  { id: 'bear', name: 'خرس', hits: 10, speed: 16, accent: '#78350f', dodge: 0.9 },
  { id: 'tiger', name: 'ببر', hits: 10, speed: 24, accent: '#f97316', dodge: 1.7 },
  { id: 'dragon', name: 'اژدها', hits: 12, speed: 15, accent: '#7c3aed', dodge: 1.5 },
]

export const STAGES_PER_LEVEL = BEASTS.length
export const MAG_SIZE = 3

export function hitsFor(beast, level) {
  return beast.hits + (level - 1) * 2
}

export function speedFor(beast, level) {
  return beast.speed * (1 + (level - 1) * 0.28)
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
    dodge: beast.dodge * (1 + (level - 1) * 0.12),
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
    state.reload = 1.35
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
  state.cooldown = 0.48
  state.bloom = Math.min(1.35, state.bloom + 0.42)
  state.mustRelease = true
  state.shake = Math.min(8, state.shake + 3)
  if (state.ammo <= 0) state.reload = 1.35
  return true
}

export function onPointerRelease(state) {
  state.mustRelease = false
}

function pickDodge(beast, height) {
  const amp = 58 * beast.dodge
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
  const weaveAmp = 10 * beast.dodge
  beast.dodgeT -= dt

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    const dx = beast.x - b.x
    if (dx > 15 && dx < 200) {
      const t = dx / Math.max(60, b.vx)
      const futureY = b.y + b.vy * t
      const byNow = height * 0.56 + beast.yOff + Math.sin(beast.weave) * weaveAmp
      if (Math.abs(futureY - byNow) < 48) {
        beast.yTarget = futureY < byNow
          ? beast.yOff + (55 + Math.random() * 25) * beast.dodge
          : beast.yOff - (55 + Math.random() * 25) * beast.dodge
        beast.yTarget = Math.max(-height * 0.2, Math.min(height * 0.16, beast.yTarget))
        beast.dodgeT = 0.28 + Math.random() * 0.2
        break
      }
    }
  }

  if (beast.dodgeT <= 0) pickDodge(beast, height)
  const dodgeSpeed = 210 * beast.dodge
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
      for (let i = 0; i < 3; i += 1) {
        state.flames.push({
          x: mouthX - i * 6,
          y: mouthY + (i - 1) * 8,
          vx: -190 - state.level * 22 - i * 12,
          vy: (i - 1) * 35 + (Math.random() - 0.5) * 20,
          life: 1.5 - i * 0.1,
          r: 11 + i * 3,
        })
      }
      beast.fireT = Math.max(0.7, 1.35 - state.level * 0.1)
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
  const hitLeft = beast.x - 58
  const hitRight = beast.x + 28
  const hitTop = by - 28
  const hitBottom = by + 26

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    if (b.x >= hitLeft && b.x <= hitRight && b.y >= hitTop && b.y <= hitBottom) {
      b.life = 0
      beast.hp -= 1
      beast.hurt = 0.2
      hit = true
      beast.yTarget = beast.yOff + (Math.random() > 0.5 ? 1 : -1) * (48 + Math.random() * 30) * beast.dodge
      beast.yTarget = Math.max(-height * 0.2, Math.min(height * 0.16, beast.yTarget))
      beast.dodgeT = 0.22
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
