export const COLS = 7
export const BRICK_ROWS = 5
export const BALL_R = 8

export const PRIZE_TYPES = [
  { id: 'wide', label: 'راکت بزرگ', icon: '⬆' },
  { id: 'narrow', label: 'راکت کوچک', icon: '⬇' },
  { id: 'multi', label: 'چند توپ', icon: '✦' },
  { id: 'star', label: 'امتیاز', icon: '★' },
  { id: 'slow', label: 'آهسته', icon: '🐢' },
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
    prizeTimer: 3.5,
    rowTimer: 14,
  }
}

export function pickPrize(random) {
  return PRIZE_TYPES[Math.floor(random() * PRIZE_TYPES.length)]
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
