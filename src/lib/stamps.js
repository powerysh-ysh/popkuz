import { syncCatch } from './sync'
import { load } from './storage'
import { findSpace } from '../data/spaces'

const KEY_SPACES = 'popkkus.spaces.v1'
const KEY_STAMPS = 'popkkus.stamps.v1'
const DEFAULT_SPACES = [1, 2, 3]

export function getEnabledSpaces() {
  try {
    const raw = localStorage.getItem(KEY_SPACES)
    return raw ? JSON.parse(raw) : DEFAULT_SPACES
  } catch {
    return DEFAULT_SPACES
  }
}

export async function refreshEnabledSpaces() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_KEY
    if (!url || !key) return getEnabledSpaces()

    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 4000)
    const res = await fetch(`${url}/rest/v1/rpc/hunt_get_spaces`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: ctl.signal
    })
    clearTimeout(timer)
    
    if (!res.ok) return getEnabledSpaces()
    
    const ids = await res.json()
    if (Array.isArray(ids)) {
      try { localStorage.setItem(KEY_SPACES, JSON.stringify(ids)) } catch {}
      return ids
    }
    return getEnabledSpaces()
  } catch {
    return getEnabledSpaces()
  }
}

export async function setEnabledSpaces(pin, ids) {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_KEY
    if (!url || !key) return { ok: false, reason: '서버 설정이 없습니다.' }

    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 4000)
    const res = await fetch(`${url}/rest/v1/rpc/hunt_set_spaces`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin, spaces: ids }),
      signal: ctl.signal
    })
    clearTimeout(timer)
    
    if (!res.ok) return { ok: false, reason: '서버 요청 실패' }
    
    const ok = await res.json()
    if (ok === false) return { ok: false, reason: 'PIN이 맞지 않아요' }
    
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: '네트워크 오류' }
  }
}

export function getStamps() {
  try {
    const raw = localStorage.getItem(KEY_STAMPS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function hasStamp(id) {
  return getStamps().includes(Number(id))
}

export function addStamp(id) {
  const numId = Number(id)
  const stamps = getStamps()
  if (stamps.includes(numId)) {
    return { isNew: false }
  }
  
  stamps.push(numId)
  try {
    localStorage.setItem(KEY_STAMPS, JSON.stringify(stamps))
  } catch {}
  
  syncCatch(load(), "space:" + numId)
  return { isNew: true }
}

export function spaceLocked(id, caughtCount) {
  const space = findSpace(id)
  if (!space) return true
  return caughtCount < space.unlockAt
}

export function dexTotal() {
  return 5
}

export function dexCount(caughtCount) {
  return caughtCount
}

export function keycapCount(caughtCount) {
  if (caughtCount >= 5) return 1
  return 0
}
