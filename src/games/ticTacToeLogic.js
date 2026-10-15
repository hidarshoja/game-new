export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a], line }
    }
  }
  if (board.every(Boolean)) return { mark: 'draw', line: null }
  return null
}

function empties(board) {
  return board.map((cell, index) => (cell ? -1 : index)).filter((index) => index >= 0)
}

export function mediumMove(board, mark) {
  const foe = mark === 'X' ? 'O' : 'X'
  const open = empties(board)
  const find = (who) => {
    for (const index of open) {
      const next = board.slice()
      next[index] = who
      if (winnerOf(next)?.mark === who) return index
    }
    return -1
  }
  const win = find(mark)
  if (win >= 0) return win
  const block = find(foe)
  if (block >= 0) return block
  if (!board[4]) return 4
  return open[Math.floor(Math.random() * open.length)]
}

function scoreMove(board, mark, foe, depth) {
  const result = winnerOf(board)
  if (result?.mark === mark) return 10 - depth
  if (result?.mark === foe) return depth - 10
  if (result?.mark === 'draw') return 0
  const open = empties(board)
  const turn = depth % 2 === 0 ? mark : foe
  let best = turn === mark ? -99 : 99
  for (const index of open) {
    const next = board.slice()
    next[index] = turn
    const value = scoreMove(next, mark, foe, depth + 1)
    best = turn === mark ? Math.max(best, value) : Math.min(best, value)
  }
  return best
}

export function hardMove(board, mark) {
  const foe = mark === 'X' ? 'O' : 'X'
  let best = -99
  let choice = empties(board)[0]
  for (const index of empties(board)) {
    const next = board.slice()
    next[index] = mark
    const value = scoreMove(next, mark, foe, 1)
    if (value > best) {
      best = value
      choice = index
    }
  }
  return choice
}

export function cpuMove(board, level) {
  const open = empties(board)
  if (!open.length) return -1
  if (level === 'easy') return open[Math.floor(Math.random() * open.length)]
  if (level === 'hard') return hardMove(board, 'O')
  return mediumMove(board, 'O')
}
