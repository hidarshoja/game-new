/** ۱۰ مرحله پایه — هر حیوان تعداد تیر مشخصی می‌خواهد */
export const BEASTS = [
  { id: 'snake', name: 'مار', hits: 2, speed: 16, accent: '#16a34a' },
  { id: 'fox', name: 'روباه', hits: 3, speed: 18, accent: '#ea580c' },
  { id: 'eagle', name: 'عقاب', hits: 4, speed: 21, accent: '#92400e' },
  { id: 'wolf', name: 'گرگ', hits: 5, speed: 19, accent: '#57534e' },
  { id: 'boar', name: 'گراز', hits: 6, speed: 16, accent: '#78716c' },
  { id: 'croc', name: 'تمساح', hits: 7, speed: 14, accent: '#166534' },
  { id: 'lion', name: 'شیر', hits: 8, speed: 17, accent: '#ca8a04' },
  { id: 'bear', name: 'خرس', hits: 9, speed: 13, accent: '#78350f' },
  { id: 'tiger', name: 'ببر', hits: 9, speed: 20, accent: '#f97316' },
  { id: 'dragon', name: 'اژدها', hits: 10, speed: 12, accent: '#7c3aed' },
]

export const STAGES_PER_LEVEL = BEASTS.length

export function hitsFor(beast, level) {
  return beast.hits + (level - 1)
}

export function speedFor(beast, level) {
  return beast.speed * (1 + (level - 1) * 0.22)
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
    beast: null,
    banner: '',
    bannerT: 0,
    cleared: false,
  }
}

export function spawnStage(state, width) {
  const beast = BEASTS[state.stage % BEASTS.length]
  const level = state.level
  state.beast = {
    id: beast.id,
    name: beast.name,
    accent: beast.accent,
    maxHp: hitsFor(beast, level),
    hp: hitsFor(beast, level),
    speed: speedFor(beast, level),
    x: width + 40,
    y: 0,
    bob: 0,
    hurt: 0,
    dead: false,
    dieT: 0,
  }
  state.bullets = []
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
  if (state.cooldown > 0 || !state.alive || !state.beast || state.beast.dead) return false
  const angle = state.aim
  const speed = 520
  state.bullets.push({
    x: heroX + 28,
    y: heroY - 18,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.4,
  })
  state.cooldown = 0.22
  return true
}

export function updateHunt(state, dt, width, height, heroX) {
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

  const beast = state.beast
  if (!beast) return { event: null }

  if (beast.hurt > 0) beast.hurt -= dt
  beast.bob += dt

  if (beast.dead) {
    beast.dieT += dt
    beast.y += 40 * dt
    if (beast.dieT > 0.7) {
      advanceAfterKill(state, width)
      return { event: 'cleared' }
    }
    return { event: null }
  }

  // نزدیک شدن از راست به چپ
  beast.x -= beast.speed * dt
  const dangerX = heroX + 55
  // فقط وقتی واقعاً از راست آمده و رسیده
  if (beast.x < dangerX && beast.x < width * 0.55) {
    state.alive = false
    return { event: 'lost' }
  }

  for (const b of state.bullets) {
    b.life -= dt
    b.x += b.vx * dt
    b.y += b.vy * dt
  }

  let hit = false
  const by = height * 0.58 + Math.sin(beast.bob * 2.2) * (beast.id === 'eagle' ? 18 : 6)
  beast.drawY = by
  // جعبه برخورد بزرگ‌تر تا تیرها راحت‌تر بخورند
  const hitLeft = beast.x - 90
  const hitRight = beast.x + 55
  const hitTop = by - 55
  const hitBottom = by + 50

  for (const b of state.bullets) {
    if (b.life <= 0) continue
    if (b.x >= hitLeft && b.x <= hitRight && b.y >= hitTop && b.y <= hitBottom) {
      b.life = 0
      beast.hp -= 1
      beast.hurt = 0.18
      hit = true
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
        return { event: 'kill', hit: true }
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x < width + 40 && b.y > -40 && b.y < height + 40)
  return { event: hit ? 'hit' : null, hit }
}
