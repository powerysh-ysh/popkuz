/**
 * 캐릭터를 숨긴 장소 이름.
 *
 * 기본값은 부스 기준이지만, 시연이나 리허설은 다른 공간에서 합니다.
 * 그때 "부스 입구 · 웰컴 배너" 같은 안내가 뜨면 오히려 헷갈립니다.
 * 스태프가 화면에서 직접 고칠 수 있게 하고, 고친 값을 폰에 저장합니다.
 *
 * 다른 사람 폰에도 적용하려면 공유 링크(#/?s=...)를 열게 하면 됩니다.
 * 저장은 기기별이라 링크 한 번이면 참가자 전원이 같은 안내를 봅니다.
 */
import { CHARACTERS } from '../data/characters'

const KEY = 'popkkus.spots.v1'

/** @returns {Record<string,string>} 기본값과 다른 항목만 담긴 객체 */
export function getSpots() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/** 캐릭터의 현재 장소 이름 (설정값이 없으면 기본값) */
export function spotOf(character) {
  return getSpots()[character.id] || character.spot
}

export function saveSpots(map) {
  const clean = {}
  for (const c of CHARACTERS) {
    const v = (map[c.id] || '').trim()
    if (v && v !== c.spot) clean[c.id] = v.slice(0, 40)
  }
  try {
    if (Object.keys(clean).length) localStorage.setItem(KEY, JSON.stringify(clean))
    else localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
  return clean
}

export function resetSpots() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/** 설정을 URL에 실어 보낼 수 있게 인코딩합니다 (한글 포함). */
export function encodeSpots(map) {
  try {
    const json = JSON.stringify(map)
    const bytes = new TextEncoder().encode(json)
    let bin = ''
    bytes.forEach((b) => (bin += String.fromCharCode(b)))
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return ''
  }
}

export function decodeSpots(code) {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
    const v = JSON.parse(new TextDecoder().decode(bytes))
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

/** 공유 링크로 들어왔을 때 설정을 받아 적용합니다. */
export function applySharedSpots(code) {
  const v = decodeSpots(code)
  if (!v) return false
  saveSpots(v)
  return true
}
