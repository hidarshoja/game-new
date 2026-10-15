const ITEMS = [
  { id: 'apple', emoji: '🍎', name: 'سیب' },
  { id: 'banana', emoji: '🍌', name: 'موز' },
  { id: 'grape', emoji: '🍇', name: 'انگور' },
  { id: 'berry', emoji: '🍓', name: 'توت' },
  { id: 'orange', emoji: '🍊', name: 'پرتقال' },
  { id: 'star', emoji: '⭐', name: 'ستاره' },
  { id: 'ball', emoji: '🔵', name: 'توپ' },
  { id: 'cookie', emoji: '🍪', name: 'کلوچه' },
]

export const MATH_LEVELS = [
  { rounds: 5, max: 5, ops: ['+'], choices: 3 },
  { rounds: 5, max: 7, ops: ['+'], choices: 3 },
  { rounds: 6, max: 9, ops: ['+', '-'], choices: 3 },
  { rounds: 6, max: 10, ops: ['+', '-'], choices: 4 },
  { rounds: 7, max: 12, ops: ['+', '-'], choices: 4 },
  { rounds: 7, max: 15, ops: ['+', '-'], choices: 4 },
  { rounds: 8, max: 18, ops: ['+', '-'], choices: 4 },
  { rounds: 8, max: 20, ops: ['+', '-'], choices: 5 },
]

export function makePuzzle(level, random = Math.random) {
  const item = ITEMS[Math.floor(random() * ITEMS.length)]
  const op = level.ops[Math.floor(random() * level.ops.length)]
  let a = 1 + Math.floor(random() * level.max)
  let b = 1 + Math.floor(random() * level.max)
  if (op === '-') {
    if (b > a) [a, b] = [b, a]
    if (a === b) a = Math.min(level.max, a + 1)
  } else {
    while (a + b > level.max + 4) {
      a = 1 + Math.floor(random() * Math.max(2, level.max - 1))
      b = 1 + Math.floor(random() * Math.max(2, level.max - 1))
    }
  }
  const answer = op === '+' ? a + b : a - b
  const options = new Set([answer])
  while (options.size < level.choices) {
    const noise = answer + Math.floor(random() * 7) - 3
    if (noise >= 0 && noise !== answer) options.add(noise)
  }
  const list = [...options]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return { item, a, b, op, answer, options: list }
}
