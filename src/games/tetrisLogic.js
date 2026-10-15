export const COLS = 10
export const ROWS = 15

export const PIECES = {
  I: {
    color: '#22d3ee',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    color: '#facc15',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    color: '#c084fc',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    color: '#fb923c',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  J: {
    color: '#60a5fa',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  S: {
    color: '#4ade80',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    color: '#fb7185',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
}

const TYPES = Object.keys(PIECES)
const LINE_SCORE = [0, 100, 300, 500, 800]

export function dropMs(score) {
  if (score >= 3000) return 600
  if (score >= 2000) return 740
  if (score >= 1000) return 900
  return 1100
}

export function speedTier(score) {
  if (score >= 3000) return 3
  if (score >= 2000) return 2
  if (score >= 1000) return 1
  return 0
}

export function rotate(matrix) {
  return matrix[0].map((_, x) => matrix.map((row) => row[x]).reverse())
}

export function cellsOf(piece) {
  const cells = []
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) cells.push({ x: piece.x + x, y: piece.y + y })
    })
  })
  return cells
}

export function collides(board, piece) {
  return cellsOf(piece).some((cell) => {
    if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return true
    if (cell.y >= 0 && board[cell.y][cell.x]) return true
    return false
  })
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function shuffle(list, random) {
  const bag = [...list]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

function takeType(game) {
  if (game.bag.length === 0) game.bag = shuffle(TYPES, game.random)
  return game.bag.pop()
}

function makePiece(type) {
  const shape = PIECES[type].shape.map((row) => [...row])
  return {
    type,
    color: PIECES[type].color,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
    grounded: false,
    nudges: 0,
  }
}

export function createGame(random = Math.random) {
  const game = {
    board: emptyBoard(),
    bag: [],
    piece: null,
    next: null,
    score: 0,
    lines: 0,
    alive: true,
    flash: [],
    busy: false,
    random,
  }
  game.next = takeType(game)
  spawn(game)
  return game
}

export function spawn(game) {
  game.piece = makePiece(game.next)
  game.next = takeType(game)
  if (collides(game.board, game.piece)) {
    game.alive = false
    return false
  }
  return true
}

export function tryMove(game, dx, dy) {
  if (!game.alive || game.busy || !game.piece) return false
  const next = {
    ...game.piece,
    x: game.piece.x + dx,
    y: game.piece.y + dy,
    shape: game.piece.shape,
  }
  if (collides(game.board, next)) return false
  const nudges = dy === 0 && game.piece.grounded ? game.piece.nudges + 1 : game.piece.nudges
  game.piece = { ...next, grounded: nudges > 8, nudges }
  return true
}

export function tryRotate(game) {
  if (!game.alive || game.busy || !game.piece) return false
  const shape = rotate(game.piece.shape)
  for (const kick of [0, -1, 1, -2, 2]) {
    const next = { ...game.piece, shape, x: game.piece.x + kick }
    if (!collides(game.board, next)) {
      const nudges = game.piece.grounded ? game.piece.nudges + 1 : game.piece.nudges
      game.piece = { ...next, grounded: nudges > 8, nudges }
      return true
    }
  }
  return false
}

export function fullRows(board) {
  const rows = []
  board.forEach((row, y) => {
    if (row.every(Boolean)) rows.push(y)
  })
  return rows
}

export function removeRows(board, rows) {
  const drop = new Set(rows)
  const kept = board.filter((_, y) => !drop.has(y))
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null))
  return kept
}

function paint(game) {
  for (const cell of cellsOf(game.piece)) {
    if (cell.y >= 0 && cell.y < ROWS && cell.x >= 0 && cell.x < COLS) {
      game.board[cell.y][cell.x] = game.piece.color
    }
  }
}

export function lockPiece(game) {
  paint(game)
  const cleared = fullRows(game.board)
  if (cleared.length) {
    game.board = removeRows(game.board, cleared)
    game.lines += cleared.length
    game.score += LINE_SCORE[cleared.length] || 0
  }
  return cleared.length
}

export function tick(game) {
  if (!game.alive || game.busy || !game.piece) return 'idle'
  const dropped = { ...game.piece, y: game.piece.y + 1 }
  if (!collides(game.board, dropped)) {
    game.piece = { ...dropped, grounded: false }
    return 'fall'
  }
  if (!game.piece.grounded && game.piece.nudges <= 8) {
    game.piece = { ...game.piece, grounded: true }
    return 'ground'
  }
  const cleared = lockPiece(game)
  if (!spawn(game)) return 'over'
  return cleared ? 'clear' : 'lock'
}

export function softDrop(game) {
  if (!game.alive || game.busy) return 'idle'
  if (tryMove(game, 0, 1)) return 'fall'
  const cleared = lockPiece(game)
  if (!spawn(game)) return 'over'
  return cleared ? 'clear' : 'lock'
}

export function ghostCells(game) {
  if (!game.piece || !game.alive) return []
  let y = game.piece.y
  while (!collides(game.board, { ...game.piece, y: y + 1 })) y += 1
  if (y === game.piece.y) return []
  return cellsOf({ ...game.piece, y })
}

export function snapshot(game) {
  return {
    board: game.board.map((row) => [...row]),
    active: game.alive && game.piece ? cellsOf(game.piece) : [],
    ghost: ghostCells(game),
    color: game.piece?.color ?? null,
    next: game.next,
    score: game.score,
    lines: game.lines,
    flash: [...game.flash],
    alive: game.alive,
  }
}
