function empty() {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
}

function blanks(grid) {
  const cells = []
  grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) cells.push({ x, y })
    })
  })
  return cells
}

export function spawnTile(grid, value) {
  const cells = blanks(grid)
  if (!cells.length) return false
  const spot = cells[Math.floor(Math.random() * cells.length)]
  grid[spot.y][spot.x] = value ?? (Math.random() < 0.9 ? 2 : 4)
  return true
}

export function slideLine(line) {
  const nums = line.filter(Boolean)
  const out = []
  let gained = 0
  for (let i = 0; i < nums.length; i += 1) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const value = nums[i] * 2
      out.push(value)
      gained += value
      i += 1
    } else {
      out.push(nums[i])
    }
  }
  while (out.length < 4) out.push(0)
  return { line: out, gained }
}

function same(a, b) {
  return a.every((row, y) => row.every((value, x) => value === b[y][x]))
}

export function canMove(grid) {
  if (blanks(grid).length) return true
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      if (x < 3 && grid[y][x] === grid[y][x + 1]) return true
      if (y < 3 && grid[y][x] === grid[y + 1][x]) return true
    }
  }
  return false
}

function apply(grid, dir) {
  const next = grid.map((row) => row.slice())
  let gained = 0
  if (dir === 'left' || dir === 'right') {
    for (let y = 0; y < 4; y += 1) {
      const source = dir === 'right' ? next[y].slice().reverse() : next[y]
      const slid = slideLine(source)
      next[y] = dir === 'right' ? slid.line.slice().reverse() : slid.line
      gained += slid.gained
    }
  } else {
    for (let x = 0; x < 4; x += 1) {
      const column = [0, 1, 2, 3].map((y) => next[y][x])
      const source = dir === 'down' ? column.reverse() : column
      const slid = slideLine(source)
      const line = dir === 'down' ? slid.line.slice().reverse() : slid.line
      line.forEach((value, y) => {
        next[y][x] = value
      })
      gained += slid.gained
    }
  }
  return { grid: next, gained }
}

export function createMerge() {
  const grid = empty()
  spawnTile(grid, 2)
  spawnTile(grid, 2)
  return { grid, score: 0, best: 2, alive: true }
}

export function loadMerge(grid) {
  return {
    grid: grid.map((row) => row.slice()),
    score: 0,
    best: Math.max(2, ...grid.flat()),
    alive: canMove(grid),
  }
}

export function moveMerge(state, dir) {
  if (!state.alive) return false
  const moved = apply(state.grid, dir)
  if (same(state.grid, moved.grid)) return false
  state.grid = moved.grid
  state.score += moved.gained
  spawnTile(state.grid)
  state.best = Math.max(state.best, ...state.grid.flat())
  if (!canMove(state.grid)) state.alive = false
  return true
}
