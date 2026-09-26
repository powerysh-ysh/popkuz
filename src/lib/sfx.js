let ctx = null

function getContext() {
  if (ctx) return ctx
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  try {
    ctx = new AudioContext()
  } catch {
    return null
  }
  return ctx
}

export function hit() {
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.1)
  
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.1)
  
  osc.start()
  osc.stop(c.currentTime + 0.1)
}

export function miss() {
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(200, c.currentTime)
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.2)
  
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.2)
  
  osc.start()
  osc.stop(c.currentTime + 0.2)
}

export function win() {
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.setValueAtTime(600, c.currentTime + 0.1)
  osc.frequency.setValueAtTime(800, c.currentTime + 0.2)
  
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.4)
  
  osc.start()
  osc.stop(c.currentTime + 0.4)
}

export function throwBall() {
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(500, c.currentTime + 0.15)
  
  gain.gain.setValueAtTime(0.1, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.15)
  
  osc.start()
  osc.stop(c.currentTime + 0.15)
}
