export const COLS = 7
export const BRICK_ROWS = 5
export const BALL_R = 8

export const PRIZE_TYPES = [
  { id: 'wide', label: 'راکت بزرگ', icon: '⬆', color: '#34d399', weight: 14 },
  { id: 'narrow', label: 'راکت کوچک', icon: '⬇', color: '#fb7185', weight: 12 },
  { id: 'multi', label: 'چند توپ', icon: '✦', color: '#c084fc', weight: 10 },
  { id: 'twin', label: 'توپ اضافه', icon: '＋', color: '#a78bfa', weight: 12 },
  { id: 'star', label: 'امتیاز', icon: '★', color: '#facc15', weight: 14 },
  { id: 'mega', label: 'امتیاز بزرگ', icon: '◆', color: '#f59e0b', weight: 8 },
  { id: 'slow', label: 'آهسته', icon: '🐢', color: '#67e8f9', weight: 10 },
  { id: 'fast', label: 'سریع', icon: '⚡', color: '#38bdf8', weight: 9 },
  { id: 'fire', label: 'آتشین', icon: '🔥', color: '#f97316', weight: 8 },
  { id: 'reset', label: 'راکت عادی', icon: '↺', color: '#94a3b8', weight: 7 },
  { id: 'gift', label: 'هدیه', icon: '🎁', color: '#ec4899', weight: 6 },
]

const BRICK_COLORS = ['#7c3aed', '#22d3ee', '#f59e0b', '#34d399', '#f43f5e', '#60a5fa']

export function createBrick(col, row, wave, random) {
  const hp = 1 + Math.floor(wave / 6) + (random() > 0.82 ? 1 : 0)
  return {
    id: `b-${wave}-${col}-${row}-${Math.floor(random() * 9999)}`,
    col,
    row,
    hp,
    color: BRICK_COLORS[Math.floor(random() * BRICK_COLORS.length)],
  }
}

export function makeBrickRow(wave, random, row) {
  const bricks = []
  for (let col = 0; col < COLS; col++) {
    if (random() < 0.18 && bricks.length > 2) continue
    bricks.push(createBrick(col, row, wave, random))
  }
  return bricks
}

export function createRally(random = Math.random) {
  const bricks = []
  for (let row = 0; row < 4; row++) {
    bricks.push(...makeBrickRow(1, random, row))
  }
  return {
    bricks,
    prizes: [],
    score: 0,
    wave: 1,
    balls: 1,
    paddleWidth: 118,
    alive: true,
    phase: 'play',
    toast: null,
    toastLife: 0,
    random,
    prizeTimer: 2.8,
    rowTimer: 14,
    fireTimer: 0,
  }
}

export function pickPrize(random) {
  const total = PRIZE_TYPES.reduce((sum, item) => sum + item.weight, 0)
  let roll = random() * total
  for (const item of PRIZE_TYPES) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return PRIZE_TYPES[0]
}

export function brickBox(brick, layout) {
  const gap = layout.gap
  return {
    x: layout.pad + brick.col * (layout.cellW + gap),
    y: layout.top + brick.row * (layout.cellH + gap),
    w: layout.cellW,
    h: layout.cellH,
  }
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= r * r
}
