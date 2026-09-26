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

export function getKeycap() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function issueKeycap() {
  const current = getKeycap()
  if (current) return null

  const keycap = {
    code: newCode(),
    at: new Date().toISOString(),
    usedAt: null,
  }
  
  try {
    localStorage.setItem(KEY, JSON.stringify(keycap))
  } catch {
    /* noop */
  }
  return keycap
}

export function useKeycap() {
  const current = getKeycap()
  if (!current) return { ok: false, reason: '체험권이 없습니다.' }
  if (current.usedAt) return { ok: false, reason: '이미 사용한 체험권입니다.' }
  
  current.usedAt = new Date().toISOString()
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* noop */
  }
  return { ok: true }
}
