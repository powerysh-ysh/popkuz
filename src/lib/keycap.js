import { keycapCount } from './stamps'

const KEY = 'popkkus.keycap.v1'
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function newCode() {
  let s = ''
  for (let i = 0; i < 8; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    if (i === 3) s += '-'
  }
  return s
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {}
}

export function keycapStatus(caughtCount) {
  const total = keycapCount(caughtCount)
  let current = read()
  
  if (total >= 1 && !current) {
    current = {
      code: newCode(),
      at: new Date().toISOString(),
      used: 0
    }
    write(current)
  }
  
  if (!current) {
    return { code: null, total: 0, used: 0, remaining: 0 }
  }
  
  const used = current.used || 0
  const remaining = Math.max(0, total - used)
  
  return { code: current.code, total, used, remaining }
}

export function redeemKeycaps(caughtCount) {
  const status = keycapStatus(caughtCount)
  if (status.remaining <= 0) {
    return { ok: false, n: 0 }
  }
  
  const current = read()
  if (current) {
    current.used = (current.used || 0) + status.remaining
    write(current)
  }
  
  return { ok: true, n: status.remaining }
}
