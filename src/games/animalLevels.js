export const ANIMALS = [
  { id: 'cat', emoji: '🐱', name: 'گربه', color: '#ffd6a5' },
  { id: 'rabbit', emoji: '🐰', name: 'خرگوش', color: '#e2e8f0' },
  { id: 'dog', emoji: '🐶', name: 'سگ', color: '#fde68a' },
  { id: 'bird', emoji: '🐦', name: 'پرنده', color: '#bae6fd' },
  { id: 'fox', emoji: '🦊', name: 'روباه', color: '#fed7aa' },
  { id: 'bear', emoji: '🐻', name: 'خرس', color: '#d6d3d1' },
  { id: 'frog', emoji: '🐸', name: 'قورباغه', color: '#bbf7d0' },
  { id: 'lion', emoji: '🦁', name: 'شیر', color: '#fde68a' },
  { id: 'monkey', emoji: '🐵', name: 'میمون', color: '#fed7aa' },
  { id: 'panda', emoji: '🐼', name: 'پاندا', color: '#e5e7eb' },
]

/**
 * هر مرحله سخت‌تر می‌شود:
 * جفت بیشتر، زمان کمتر، برگشتن کارت سریع‌تر،
 * و در مراحل اول یک نگاه کوتاه به کارت‌ها.
 */
export const MATCH_LEVELS = [
  { level: 1, pairs: 2, columns: 2, timeLimit: 90, hideMs: 1400, previewMs: 2500 },
  { level: 2, pairs: 3, columns: 3, timeLimit: 80, hideMs: 1200, previewMs: 2000 },
  { level: 3, pairs: 4, columns: 2, timeLimit: 75, hideMs: 1100, previewMs: 1600 },
  { level: 4, pairs: 4, columns: 2, timeLimit: 60, hideMs: 950, previewMs: 1000 },
  { level: 5, pairs: 5, columns: 3, timeLimit: 60, hideMs: 850, previewMs: 800 },
  { level: 6, pairs: 6, columns: 3, timeLimit: 55, hideMs: 750, previewMs: 0 },
  { level: 7, pairs: 6, columns: 3, timeLimit: 45, hideMs: 650, previewMs: 0 },
  { level: 8, pairs: 8, columns: 4, timeLimit: 50, hideMs: 580, previewMs: 0 },
  { level: 9, pairs: 8, columns: 4, timeLimit: 40, hideMs: 500, previewMs: 0 },
  { level: 10, pairs: 10, columns: 4, timeLimit: 40, hideMs: 420, previewMs: 0 },
]

export function getMatchLevel(levelNumber) {
  return MATCH_LEVELS.find((item) => item.level === levelNumber) ?? MATCH_LEVELS[0]
}

export function animalsForLevel(level) {
  return ANIMALS.slice(0, level.pairs)
}
