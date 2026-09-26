let ctx = null
let masterGain = null
let sfxGain = null
let activeBgmGain = null

let isMutedState = false
let currentBgmName = 'none'
let bgmSchedulerId = null
let bgmNextNoteTime = 0
let bgmCurrentNoteIndex = 0
let bgmBassNextNoteTime = 0
let bgmBassCurrentNoteIndex = 0

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('popkkus.sound.v1')
    if (saved === 'off') {
      isMutedState = true
    }
  } catch (e) {}
}

const BPM_EXPLORE = 110
const BPM_BATTLE = 150

const NOTES = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
}

const SCORE_EXPLORE = [
  ['E5', 0.5], ['E5', 0.5], [null, 0.5], ['E5', 0.5], [null, 0.5], ['C5', 0.5], ['E5', 1],
  ['G5', 1], [null, 1], ['G4', 1], [null, 1],
  ['C5', 1.5], ['G4', 0.5], [null, 0.5], ['E4', 1],
  ['A4', 1], ['B4', 1], ['Bb4', 0.5], ['A4', 1],
  ['G4', 0.66], ['E5', 0.66], ['G5', 0.66], ['A5', 1], ['F5', 0.5], ['G5', 0.5],
  ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['B4', 1.5]
]

const SCORE_BASS_EXPLORE = [
  ['C3', 0.5], [null, 0.5], ['C3', 0.5], [null, 0.5],
  ['G3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5],
  ['A3', 0.5], [null, 0.5], ['A3', 0.5], [null, 0.5],
  ['F3', 0.5], [null, 0.5], ['F3', 0.5], [null, 0.5]
]

const SCORE_BATTLE = [
  ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 0.5],
  ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5],
]

const SCORE_BASS_BATTLE = [
  ['E3', 0.5], ['E3', 0.5], ['A3', 0.5], ['G3', 0.5], ['E3', 0.5], ['E3', 0.5], ['D3', 0.5], ['D3', 0.5]
]

function getContext() {
  if (ctx) return ctx
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  try {
    ctx = new AudioContext()
    
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
    masterGain.gain.value = isMutedState ? 0 : 1
    
    sfxGain = ctx.createGain()
    sfxGain.connect(masterGain)
    sfxGain.gain.value = 0.4
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (ctx.state === 'running') ctx.suspend()
      } else {
        if (!isMutedState && ctx.state === 'suspended') ctx.resume()
      }
    })
  } catch (e) {
    return null
  }
  return ctx
}

export function isMuted() {
  return isMutedState
}

export function setMuted(b) {
  isMutedState = b
  try {
    localStorage.setItem('popkkus.sound.v1', b ? 'off' : 'on')
  } catch (e) {}
  const c = getContext()
  if (c && masterGain) {
    masterGain.gain.value = b ? 0 : 1
    if (b) {
      if (bgmSchedulerId) {
        clearInterval(bgmSchedulerId)
        bgmSchedulerId = null
      }
    } else {
      if (!bgmSchedulerId && currentBgmName !== 'none') {
        bgmNextNoteTime = c.currentTime
        bgmCurrentNoteIndex = 0
        bgmBassNextNoteTime = c.currentTime
        bgmBassCurrentNoteIndex = 0
        bgmSchedulerId = setInterval(scheduleBgm, 25)
      }
    }
  }
}

export function unlock() {
  const c = getContext()
  if (c && c.state === 'suspended') {
    c.resume()
  }
}

function playNote(freq, startTime, duration, isBass = false) {
  const c = getContext()
  if (!c || isMutedState || !activeBgmGain) return

  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(activeBgmGain)
  
  if (isBass) {
    osc.type = 'triangle'
  } else {
    osc.type = currentBgmName === 'explore' ? 'square' : 'triangle'
  }
  osc.frequency.value = freq
  
  const vol = isBass ? 0.15 : 0.3
  gain.gain.setValueAtTime(vol, startTime)
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.02)
  
  osc.start(startTime)
  osc.stop(startTime + duration)
}

function scheduleBgm() {
  const c = getContext()
  if (!c || isMutedState || currentBgmName === 'none') return

  const score = currentBgmName === 'explore' ? SCORE_EXPLORE : SCORE_BATTLE
  const scoreBass = currentBgmName === 'explore' ? SCORE_BASS_EXPLORE : SCORE_BASS_BATTLE
  const bpm = currentBgmName === 'explore' ? BPM_EXPLORE : BPM_BATTLE
  const beatLen = 60 / bpm

  while (bgmNextNoteTime < c.currentTime + 0.1) {
    const note = score[bgmCurrentNoteIndex]
    if (note[0]) {
      const freq = NOTES[note[0]] || note[0]
      playNote(freq, bgmNextNoteTime, note[1] * beatLen, false)
    }
    bgmNextNoteTime += note[1] * beatLen
    bgmCurrentNoteIndex = (bgmCurrentNoteIndex + 1) % score.length
  }
  
  while (bgmBassNextNoteTime < c.currentTime + 0.1) {
    const note = scoreBass[bgmBassCurrentNoteIndex]
    if (note[0]) {
      const freq = NOTES[note[0]] || note[0]
      playNote(freq, bgmBassNextNoteTime, note[1] * beatLen, true)
    }
    bgmBassNextNoteTime += note[1] * beatLen
    bgmBassCurrentNoteIndex = (bgmBassCurrentNoteIndex + 1) % scoreBass.length
  }
}

export function currentBgm() {
  return currentBgmName
}

export function playBgm(name) {
  if (currentBgmName === name) return
  currentBgmName = name
  
  const c = getContext()
  if (!c) return

  if (bgmSchedulerId) {
    clearInterval(bgmSchedulerId)
    bgmSchedulerId = null
  }

  if (activeBgmGain) {
    const oldGain = activeBgmGain;
    try {
      oldGain.gain.cancelScheduledValues(c.currentTime)
      oldGain.gain.setValueAtTime(oldGain.gain.value, c.currentTime)
      oldGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3)
      setTimeout(() => {
        try { oldGain.disconnect() } catch (e) {}
      }, 300)
    } catch (e) {}
  }

  if (name !== 'none') {
    activeBgmGain = c.createGain()
    activeBgmGain.connect(masterGain)
    activeBgmGain.gain.value = 0.35
    
    bgmNextNoteTime = c.currentTime + 0.3
    bgmCurrentNoteIndex = 0
    bgmBassNextNoteTime = c.currentTime + 0.3
    bgmBassCurrentNoteIndex = 0
    if (!isMutedState) {
      bgmSchedulerId = setInterval(scheduleBgm, 25)
    }
  } else {
    activeBgmGain = null
  }
}

function playSfx(type, freqPath, gainPath, duration) {
  const c = getContext()
  if (!c || isMutedState) return
  if (c.state === 'suspended') c.resume()
  
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(sfxGain)
  
  osc.type = type
  
  osc.frequency.setValueAtTime(freqPath[0][0], c.currentTime + freqPath[0][1])
  for (let i = 1; i < freqPath.length; i++) {
    const [freq, time, exp] = freqPath[i]
    if (exp) osc.frequency.exponentialRampToValueAtTime(freq, c.currentTime + time)
    else osc.frequency.linearRampToValueAtTime(freq, c.currentTime + time)
  }
  
  gain.gain.setValueAtTime(gainPath[0][0], c.currentTime + gainPath[0][1])
  for (let i = 1; i < gainPath.length; i++) {
    const [val, time, exp] = gainPath[i]
    if (exp) gain.gain.exponentialRampToValueAtTime(val, c.currentTime + time)
    else gain.gain.linearRampToValueAtTime(val, c.currentTime + time)
  }
  
  osc.start(c.currentTime)
  osc.stop(c.currentTime + duration)
}

function playNoise(duration) {
  const c = getContext()
  if (!c || isMutedState) return
  if (c.state === 'suspended') c.resume()

  const bufferSize = c.sampleRate * duration
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = c.createBufferSource()
  noise.buffer = buffer
  
  const gain = c.createGain()
  gain.gain.setValueAtTime(1, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration)
  
  noise.connect(gain)
  gain.connect(sfxGain)
  noise.start(c.currentTime)
}

export function hit() {
  playSfx('square', [[400, 0], [800, 0.1, true]], [[1, 0], [0.01, 0.1, true]], 0.1)
}
export function miss() {
  playSfx('triangle', [[200, 0], [100, 0.2]], [[1, 0], [0.01, 0.2]], 0.2)
}
export function win() {
  playSfx('sine', [[400, 0], [600, 0.1], [800, 0.2]], [[1, 0], [0.01, 0.4]], 0.4)
}
export function throwBall() {
  playSfx('sine', [[300, 0], [500, 0.15]], [[1, 0], [0.01, 0.15]], 0.15)
}
export function tap() {
  playSfx('sine', [[600, 0], [300, 0.05]], [[1, 0], [0.01, 0.05, true]], 0.05)
}
export function found() {
  playSfx('sine', [[440, 0], [554, 0.1], [659, 0.2]], [[1, 0], [1, 0.1], [0.01, 0.3]], 0.3)
}
export function wildAppear() {
  playNoise(0.2)
  setTimeout(() => playSfx('square', [[880, 0], [1108, 0.2]], [[1, 0], [0.01, 0.3, true]], 0.3), 100)
}
export function shake() {
  playSfx('square', [[200, 0], [150, 0.1]], [[1, 0], [0.01, 0.1, true]], 0.1)
}
export function breakout() {
  playNoise(0.1)
  playSfx('sawtooth', [[300, 0], [100, 0.3]], [[1, 0], [0.01, 0.3, true]], 0.3)
}
export function judge(level) {
  if (level === 'Nice') {
    playSfx('sine', [[523, 0], [659, 0.2]], [[1, 0], [0.01, 0.3]], 0.3)
  } else if (level === 'Great') {
    playSfx('sine', [[523, 0], [659, 0.1], [783, 0.2]], [[1, 0], [0.01, 0.4]], 0.4)
  } else {
    playSfx('sine', [[523, 0], [659, 0.1], [783, 0.2], [1046, 0.3]], [[1, 0], [0.01, 0.5]], 0.5)
  }
}
export function curve() {
  playSfx('sine', [[400, 0], [800, 0.2], [1200, 0.4]], [[1, 0], [0.01, 0.4]], 0.4)
}
export function fake() {
  playSfx('sawtooth', [[150, 0], [100, 0.3]], [[1, 0], [0.01, 0.4]], 0.4)
}
export function judgeSuccess() {
  playSfx('triangle', [[880, 0], [1108, 0.1], [1318, 0.2]], [[1, 0], [0.01, 0.3]], 0.3)
}
export function mission() {
  playSfx('square', [[440, 0], [440, 0.1], [554, 0.2], [659, 0.4]], [[1, 0], [1, 0.2], [0.01, 0.6]], 0.6)
}
export function ticket() {
  playSfx('square', [[440, 0], [554, 0.1], [659, 0.2], [880, 0.3], [880, 0.5], [1046, 0.8]], [[1, 0], [1, 0.5], [0.01, 1.2]], 1.2)
}
export function evolve() {
  playSfx('sine', [[400, 0], [1200, 0.5]], [[1, 0], [0.01, 0.6]], 0.6)
  setTimeout(() => playSfx('triangle', [[1046, 0], [1318, 0.2]], [[1, 0], [0.01, 0.3]], 0.3), 400)
}
export function complete() {
  playSfx('square', [[523, 0], [659, 0.2], [783, 0.4], [1046, 0.6], [1046, 1.0], [1318, 1.5]], [[1, 0], [1, 1.0], [0.01, 2.0]], 2.0)
}
