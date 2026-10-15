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
