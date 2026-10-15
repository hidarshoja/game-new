export const BALLOON_PALETTE = {
  red: {
    id: 'red',
    name: 'قرمز',
    body: '#ff4d6d',
    shine: '#ffb3c1',
  },
  blue: {
    id: 'blue',
    name: 'آبی',
    body: '#3a86ff',
    shine: '#b6d0ff',
  },
  yellow: {
    id: 'yellow',
    name: 'زرد',
    body: '#ffd60a',
    shine: '#fff3a3',
  },
  green: {
    id: 'green',
    name: 'سبز',
    body: '#06d6a0',
    shine: '#b6f5df',
  },
  purple: {
    id: 'purple',
    name: 'بنفش',
    body: '#9b5de5',
    shine: '#d9b8ff',
  },
  orange: {
    id: 'orange',
    name: 'نارنجی',
    body: '#ff9f1c',
    shine: '#ffd6a0',
  },
}

/** هر مرحله: رنگ هدف، تعداد، زمان، سرعت بالا رفتن و فاصله تولید */
export const BALLOON_LEVELS = [
  {
    level: 1,
    targetColor: 'red',
    targetCount: 8,
    timeLimit: 60,
    riseDuration: [7.5, 10],
    spawnMs: 1100,
    maxOnScreen: 5,
    distractorChance: 0.35,
  },
  {
    level: 2,
    targetColor: 'blue',
    targetCount: 10,
    timeLimit: 60,
    riseDuration: [6.8, 9.2],
    spawnMs: 1000,
    maxOnScreen: 6,
    distractorChance: 0.4,
  },
  {
    level: 3,
    targetColor: 'yellow',
    targetCount: 12,
    timeLimit: 55,
    riseDuration: [6.2, 8.4],
    spawnMs: 900,
    maxOnScreen: 6,
    distractorChance: 0.45,
  },
  {
    level: 4,
    targetColor: 'green',
    targetCount: 14,
    timeLimit: 55,
    riseDuration: [5.6, 7.6],
    spawnMs: 850,
    maxOnScreen: 7,
    distractorChance: 0.5,
  },
  {
    level: 5,
    targetColor: 'purple',
    targetCount: 16,
    timeLimit: 50,
    riseDuration: [5.1, 7],
    spawnMs: 780,
    maxOnScreen: 7,
    distractorChance: 0.5,
  },
  {
    level: 6,
    targetColor: 'orange',
    targetCount: 18,
    timeLimit: 50,
    riseDuration: [4.6, 6.4],
    spawnMs: 720,
    maxOnScreen: 8,
    distractorChance: 0.55,
  },
  {
    level: 7,
    targetColor: 'red',
    targetCount: 20,
    timeLimit: 50,
    riseDuration: [4.2, 5.8],
    spawnMs: 660,
    maxOnScreen: 8,
    distractorChance: 0.55,
  },
  {
    level: 8,
    targetColor: 'blue',
    targetCount: 22,
    timeLimit: 45,
    riseDuration: [3.8, 5.2],
    spawnMs: 600,
    maxOnScreen: 9,
    distractorChance: 0.6,
  },
  {
    level: 9,
    targetColor: 'yellow',
    targetCount: 24,
    timeLimit: 45,
    riseDuration: [3.4, 4.7],
    spawnMs: 540,
    maxOnScreen: 9,
    distractorChance: 0.6,
  },
  {
    level: 10,
    targetColor: 'green',
    targetCount: 28,
    timeLimit: 40,
    riseDuration: [2.9, 4.1],
    spawnMs: 480,
    maxOnScreen: 10,
    distractorChance: 0.65,
  },
]

export function getLevelConfig(levelNumber) {
  return BALLOON_LEVELS.find((l) => l.level === levelNumber) ?? BALLOON_LEVELS[0]
}

export function getColor(colorId) {
  return BALLOON_PALETTE[colorId]
}
