/** ۱۰ مرحله پایه — هر حیوان تعداد تیر مشخصی می‌خواهد */
export const BEASTS = [
  { id: 'snake', name: 'مار', hits: 2, speed: 17, accent: '#16a34a', dodge: 1.15 },
  { id: 'fox', name: 'روباه', hits: 3, speed: 19, accent: '#ea580c', dodge: 1.35 },
  { id: 'eagle', name: 'عقاب', hits: 4, speed: 22, accent: '#92400e', dodge: 1.55 },
  { id: 'wolf', name: 'گرگ', hits: 5, speed: 20, accent: '#57534e', dodge: 1.2 },
  { id: 'boar', name: 'گراز', hits: 6, speed: 17, accent: '#78716c', dodge: 0.85 },
  { id: 'croc', name: 'تمساح', hits: 7, speed: 15, accent: '#166534', dodge: 0.75 },
  { id: 'lion', name: 'شیر', hits: 8, speed: 18, accent: '#ca8a04', dodge: 1.1 },
  { id: 'bear', name: 'خرس', hits: 9, speed: 14, accent: '#78350f', dodge: 0.7 },
  { id: 'tiger', name: 'ببر', hits: 9, speed: 21, accent: '#f97316', dodge: 1.4 },
  { id: 'dragon', name: 'اژدها', hits: 10, speed: 13, accent: '#7c3aed', dodge: 1.25 },
]

export const STAGES_PER_LEVEL = BEASTS.length

export function hitsFor(beast, level) {
  return beast.hits + (level - 1)
}

export function speedFor(beast, level) {
  return beast.speed * (1 + (level - 1) * 0.25)
}

export function createHunt() {
  return {
    level: 1,
    stage: 0,
    score: 0,
    alive: true,
    aim: -0.18,
    cooldown: 0,
    bullets: [],
    particles: [],
    flames: [],
    beast: null,
    banner: '',
    bannerT: 0,
    cleared: false,
    eaten: null,
  }
}

export function spawnStage(state, width) {
  const beast = BEASTS[state.stage % BEASTS.length]
  const level = state.level
  state.beast = {
    id: beast.id,
    name: beast.name,
    accent: beast.accent,
    dodge: beast.dodge,
    maxHp: hitsFor(beast, level),
    hp: hitsFor(beast, level),
    speed: speedFor(beast, level),
    x: width + 50,
    yOff: 0,
    yTarget: 0,
    dodgeT: 0.4 + Math.random() * 0.5,
    bob: 0,
    hurt: 0,
    dead: false,
    dieT: 0,
    fireT: beast.id === 'dragon' ? 1.2 : 0,
    chomp: 0,
  }
  state.bullets = []
  state.flames = []
  state.eaten = null
  state.banner = `مرحله ${state.stage + 1} — ${beast.name}`
  state.bannerT = 1.6
  state.cleared = false
}

export function advanceAfterKill(state, width) {
  state.score += state.beast.maxHp * 10 + state.level * 5
  state.stage += 1
  if (state.stage >= STAGES_PER_LEVEL) {
    state.stage = 0
    state.level += 1
    state.banner = `لول ${state.level}! سریع‌تر و قوی‌تر`
    state.bannerT = 2.2
  }
  spawnStage(state, width)
}

export function shoot(state, heroX, heroY) {
  if (state.cooldown > 0 || !state.alive || state.eaten || !state.beast || state.beast.dead) return false
  const angle = state.aim
  const speed = 500
  state.bullets.push({
    x: heroX + 28,
    y: heroY - 18,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.35,
  })
  // تیراندازی پشت سر هم سخت‌تر
  state.cooldown = 0.38
  return true
}

function pickDodge(beast, height) {
  const amp = 42 * beast.dodge
  const choices = [-amp, -amp * 0.55, 0, amp * 0.55, amp]
  let next = choices[Math.floor(Math.random() * choices.length)]
  // اگر نزدیک هدف قبلی بود، جای دیگر برو
  if (Math.abs(next - beast.yTarget) < 12) {
    next = choices[(choices.indexOf(beast.yTarget) + 2) % choices.length] ?? amp
  }
  beast.yTarget = Math.max(-height * 0.16, Math.min(height * 0.14, next))
  beast.dodgeT = (0.55 + Math.random() * 0.75) / Math.max(0.7, beast.dodge)
}

export function updateHunt(state, dt, width, height, heroX, heroY) {
  if (!state.alive) return { event: null }
  if (state.bannerT > 0) state.bannerT -= dt
  if (state.cooldown > 0) state.cooldown -= dt

  for (const p of state.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 180 * dt
  }
  state.particles = state.particles.filter((p) => p.life > 0)

  // صحنه بلعیدن شکارچی
  if (state.eaten) {
    state.eaten.t += dt
    if (state.beast) {
      state.beast.chomp = Math.min(1, state.eaten.t / 0.35)
      state.beast.x += (heroX + 40 - state.beast.x) * Math.min(1, dt * 4)
    }
    if (state.eaten.t >= 1.25) {
      state.alive = false
      return { event: 'lost' }
    }
    return { event: null }
  }

  const beast = state.beast
  if (!beast) return { event: null }

  if (beast.hurt > 0) beast.hurt -= dt
  beast.bob += dt

  if (beast.dead) {
    beast.dieT += dt
    beast.yOff += 40 * dt
    if (beast.dieT > 0.7) {
      advanceAfterKill(state, width)
      return { event: 'cleared' }
    }
    return { event: null }
  }

  // نزدیک شدن + جاخالی عمودی
  beast.x -= beast.speed * dt
  beast.dodgeT -= dt

  // اگر تیر نزدیک است، فوری جاخالی بده
  for (const b of state.bullets) {
    if (b.life <= 0) continue
    const dx = beast.x - b.x
    if (dx > 20 && dx < 160) {
      const futureY = b.y + b.vy * (dx / Math.max(40, b.vx))
      const byNow = height * 0.58 + beast.yOff
      if (Math.abs(futureY - byNow) < 38 && beast.dodgeT < 0.35) {
        beast.yTarget = futureY < byNow ? beast.yOff + 50 * beast.dodge : beast.yOff - 50 * beast.dodge
        beast.yTarget = Math.max(-height * 0.16, Math.min(height * 0.14, beast.yTarget))
        beast.dodgeT = 0.45
        break
      }
    }
  }

  if (beast.dodgeT <= 0) pickDodge(beast, height)
  const dodgeSpeed = 160 * beast.dodge
  if (beast.yOff < beast.yTarget) beast.yOff = Math.min(beast.yTarget, beast.yOff + dodgeSpeed * dt)
  if (beast.yOff > beast.yTarget) beast.yOff = Math.max(beast.yTarget, beast.yOff - dodgeSpeed * dt)

  const baseY = height * 0.58 + Math.sin(beast.bob * 2.2) * (beast.id === 'eagle' ? 14 : 4)
  const by = baseY + beast.yOff
  beast.drawY = by

  // اژدها آتش از دهان
  if (beast.id === 'dragon') {
    beast.fireT -= dt
    if (beast.fireT <= 0 && beast.x < width * 0.92) {
      const mouthX = beast.x - 88
      const mouthY = by - 8
      state.flames.push({
        x: mouthX,
        y: mouthY,
        vx: -170 - state.level * 18,
        vy: (Math.random() - 0.5) * 40,
        life: 1.6,
        r: 10 + Math.random() * 6,
      })
      // شعله دوم برای هیجان
      state.flames.push({
        x: mouthX + 8,
        y: mouthY + 6,
        vx: -150 - state.level * 14,
        vy: 20 + Math.random() * 25,
        life: 1.4,
        r: 8,
      })
      beast.fireT = Math.max(0.85, 1.55 - state.level * 0.08)
      beast.chomp = 0.85
    }
    if (beast.chomp > 0) beast.chomp -= dt * 1.8
  }

  for (const f of state.flames) {
    f.life -= dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.r *= 1 + dt * 0.4
    // آتش به شکارچی بخورد
    if (Math.hypot(f.x - heroX, f.y - (heroY - 20)) < 28 + f.r * 0.35) {
      state.eaten = { t: 0, byFire: true }
      beast.chomp = 0
      return { event: 'eaten' }
    }
  }
  state.flames = state.flames.filter((f) => f.life > 0 && f.x > -40)

  const dangerX = heroX + 58
  if (beast.x < dangerX && beast.x < width * 0.55) {
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
  // جعبه برخورد دقیق‌تر روی بدن فعلی (با جاخالی)
  const hitLeft = beast.x - 78
  const hitRight = beast.x + 42
  const hitTop = by - 40
  const hitBottom = by + 38

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    if (b.x >= hitLeft && b.x <= hitRight && b.y >= hitTop && b.y <= hitBottom) {
      b.life = 0
      beast.hp -= 1
      beast.hurt = 0.18
      hit = true
      // بعد از ضربه جاخالی تند
      beast.yTarget = beast.yOff + (Math.random() > 0.5 ? 1 : -1) * (36 + Math.random() * 28) * beast.dodge
      beast.yTarget = Math.max(-height * 0.16, Math.min(height * 0.14, beast.yTarget))
      beast.dodgeT = 0.35
      for (let i = 0; i < 8; i += 1) {
        state.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.8) * 180,
          life: 0.35 + Math.random() * 0.25,
          color: beast.accent,
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
