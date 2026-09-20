/**
 * Supabase 동기화 — 전적으로 선택 사항입니다.
 *
 * 환경변수가 비어 있으면 아무 것도 하지 않고 조용히 넘어갑니다.
 * 게임 진행은 localStorage만으로 완결되므로 이 파일의 실패는
 * 절대 사용자 화면을 막지 않습니다. (현장 와이파이 대비)
 *
 * supabase-js 패키지를 쓰지 않고 REST를 직접 호출합니다 — 의존성을 줄여
 * 번들이 가볍고 빌드 실패 지점이 하나 사라집니다.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || ''
const KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const syncEnabled = Boolean(URL_BASE && KEY)

const TIMEOUT_MS = 4000

async function post(table, body) {
  if (!syncEnabled) return null
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const res = await fetch(`${URL_BASE}/rest/v1/${table}`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    // 네트워크 없음/타임아웃 — 무시합니다.
    return false
  }
}

export function syncHunter(state) {
  return post('hunt_hunters', {
    id: state.hunterId,
    nickname: state.nickname,
    started_at: state.startedAt,
    done_at: state.doneAt,
    caught_count: state.caught.length,
  })
}

export function syncCatch(state, characterId) {
  return post('hunt_catches', {
    hunter_id: state.hunterId,
    character_id: characterId,
    caught_at: new Date().toISOString(),
  })
}
