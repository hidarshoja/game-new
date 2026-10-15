let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function tone(freq, duration, type = 'sine', gain = 0.12, when = 0) {
  const ctx = getCtx()
  const t = ctx.currentTime + when
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

export function playPop() {
  const ctx = getCtx()
  const t = ctx.currentTime
  const bufferSize = ctx.sampleRate * 0.12
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  filter.Q.value = 0.7
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.35, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  noise.connect(filter)
  filter.connect(g)
  g.connect(ctx.destination)
  noise.start(t)
  tone(520, 0.08, 'triangle', 0.08)
  tone(780, 0.1, 'sine', 0.06, 0.03)
}

export function playCheer() {
  ;[523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.06))
}

export function playFlip() {
  tone(340, 0.08, 'triangle', 0.05)
  tone(480, 0.1, 'sine', 0.04, 0.04)
}

export function playMatch() {
  ;[523, 659, 784].forEach((f, i) => tone(f, 0.16, 'sine', 0.09, i * 0.07))
}

export function playMismatch() {
  tone(220, 0.14, 'sawtooth', 0.04)
  tone(180, 0.18, 'triangle', 0.035, 0.08)
}

function noiseBurst(duration, freq, gain, when = 0) {
  const ctx = getCtx()
  const t = ctx.currentTime + when
  const length = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, t)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  source.connect(filter)
  filter.connect(amp)
  amp.connect(ctx.destination)
  source.start(t)
}

const CREATURES = {
  cat: () => {
    tone(640, 0.1, 'triangle', 0.07)
    tone(420, 0.16, 'triangle', 0.06, 0.1)
  },
  dog: () => {
    noiseBurst(0.08, 400, 0.12)
    tone(160, 0.12, 'sawtooth', 0.06, 0.05)
    tone(120, 0.14, 'sawtooth', 0.05, 0.18)
  },
  cow: () => {
    tone(130, 0.35, 'sawtooth', 0.06)
    tone(98, 0.4, 'triangle', 0.05, 0.08)
  },
  duck: () => {
    tone(700, 0.08, 'square', 0.05)
    tone(520, 0.1, 'square', 0.045, 0.1)
  },
  rooster: () => {
    tone(500, 0.1, 'square', 0.05)
    tone(760, 0.12, 'square', 0.05, 0.12)
    tone(540, 0.16, 'triangle', 0.04, 0.26)
  },
  lion: () => {
    noiseBurst(0.35, 180, 0.14)
    tone(90, 0.4, 'sawtooth', 0.06)
  },
  frog: () => {
    tone(220, 0.08, 'square', 0.06)
    tone(160, 0.1, 'square', 0.05, 0.1)
  },
  bird: () => {
    tone(1500, 0.05, 'sine', 0.05)
    tone(1900, 0.06, 'sine', 0.045, 0.07)
    tone(1600, 0.07, 'sine', 0.04, 0.15)
  },
  wolf: () => {
    tone(320, 0.25, 'sine', 0.06)
    tone(480, 0.3, 'triangle', 0.05, 0.2)
  },
  elephant: () => {
    tone(80, 0.35, 'sawtooth', 0.07)
    tone(140, 0.2, 'triangle', 0.04, 0.15)
  },
  horse: () => {
    tone(400, 0.1, 'sawtooth', 0.05)
    tone(620, 0.12, 'triangle', 0.045, 0.1)
    tone(300, 0.14, 'sine', 0.04, 0.22)
  },
  pig: () => {
    tone(280, 0.08, 'square', 0.05)
    tone(210, 0.1, 'square', 0.045, 0.09)
  },
  sheep: () => {
    tone(360, 0.16, 'triangle', 0.05)
    tone(300, 0.18, 'sine', 0.04, 0.12)
  },
  bee: () => {
    tone(220, 0.25, 'sawtooth', 0.04)
    tone(260, 0.25, 'square', 0.03, 0.02)
  },
  owl: () => {
    tone(280, 0.16, 'sine', 0.06)
    tone(240, 0.18, 'sine', 0.05, 0.22)
  },
  snake: () => noiseBurst(0.4, 2400, 0.08),
  dolphin: () => {
    tone(900, 0.08, 'sine', 0.06)
    tone(1400, 0.1, 'sine', 0.05, 0.08)
    tone(1100, 0.08, 'triangle', 0.04, 0.18)
  },
  monkey: () => {
    tone(500, 0.06, 'square', 0.05)
    tone(700, 0.06, 'square', 0.045, 0.07)
    tone(430, 0.08, 'square', 0.04, 0.14)
  },
  bear: () => {
    tone(110, 0.22, 'sawtooth', 0.07)
    tone(80, 0.26, 'triangle', 0.05, 0.16)
  },
  frog2: () => {
    tone(180, 0.07, 'square', 0.05)
    tone(140, 0.09, 'triangle', 0.04, 0.08)
  },
}

const clips = new Map()
let currentClip = null

export function playCreature(animal) {
  if (!animal) return
  const src = `/sounds/${animal.id}.mp3`
  let audio = clips.get(animal.id)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    clips.set(animal.id, audio)
  }
  if (currentClip && currentClip !== audio) currentClip.pause()
  currentClip = audio
  audio.pause()
  try {
    audio.currentTime = 0
  } catch {
    /* clip not ready yet */
  }
  window.clearTimeout(audio._cut)
  const played = audio.play()
  audio._cut = window.setTimeout(() => audio.pause(), 2800)
  played?.catch(() => {
    if (CREATURES[animal.id]) CREATURES[animal.id]()
  })
}

export function playAnimal(id) {
  const patterns = {
    cat: () => {
      tone(620, 0.12, 'square', 0.06)
      tone(480, 0.18, 'square', 0.05, 0.12)
      tone(700, 0.1, 'square', 0.04, 0.28)
    },
    rabbit: () => {
      tone(880, 0.06, 'sine', 0.05)
      tone(990, 0.06, 'sine', 0.045, 0.08)
      tone(1100, 0.08, 'sine', 0.04, 0.16)
    },
    dog: () => {
      tone(180, 0.12, 'sawtooth', 0.07)
      tone(140, 0.16, 'sawtooth', 0.06, 0.14)
      tone(200, 0.1, 'triangle', 0.05, 0.3)
    },
    bird: () => {
      tone(1400, 0.05, 'sine', 0.05)
      tone(1700, 0.05, 'sine', 0.045, 0.07)
      tone(1550, 0.06, 'sine', 0.04, 0.14)
      tone(1900, 0.08, 'sine', 0.035, 0.22)
    },
    fox: () => {
      tone(420, 0.1, 'triangle', 0.06)
      tone(560, 0.12, 'triangle', 0.05, 0.1)
      tone(380, 0.14, 'sine', 0.045, 0.22)
    },
    bear: () => {
      tone(120, 0.2, 'sawtooth', 0.08)
      tone(90, 0.24, 'triangle', 0.06, 0.18)
    },
  }
  if (patterns[id]) {
    patterns[id]()
    return
  }
  const base = 280 + ((id?.charCodeAt(0) || 1) % 10) * 55
  tone(base, 0.1, 'triangle', 0.06)
  tone(base * 1.3, 0.14, 'sine', 0.05, 0.1)
}
