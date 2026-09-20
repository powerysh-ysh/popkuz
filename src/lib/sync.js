/**
 * Supabase 참여 통계 — 전적으로 선택 사항입니다.
 *
 * 환경변수가 비어 있으면 아무 것도 하지 않고 조용히 넘어갑니다.
 * 게임 진행은 localStorage만으로 완결되므로 이 파일의 실패는
 * 절대 사용자 화면을 막지 않습니다. (현장 와이파이 대비)
 *
 * ── 설계: 오직 INSERT만 합니다 ──────────────────────────────
 * 갱신(UPDATE)을 쓰면 익명 사용자에게 수정 권한을 줘야 하고, 그러면
 * 누구든 남의 기록을 덮어쓸 수 있습니다. 그래서 상태를 고쳐 쓰는 대신
 * "일어난 일"을 한 줄씩 쌓기만 합니다.
 *
 *   hunt_hunters      시작한 사람 (1인 1행)
 *   hunt_catches      캐릭터를 잡은 사건 (1건 1행)
 *   hunt_completions  완주한 사건 (1인 1행)
 *
 * 완주자 수·참여자 수는 이 로그를 세면 나옵니다. 조회 권한은 아예
 * 주지 않으므로 관람객은 남의 닉네임을 읽을 수 없습니다.
 *
 * supabase-js 패키지를 쓰지 않고 REST를 직접 호출합니다 — 의존성을 줄여
 * 번들이 가볍고 빌드 실패 지점이 하나 사라집니다.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || ''
const KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const syncEnabled = Boolean(URL_BASE && KEY)

const TIMEOUT_MS = 4000

async function insert(table, body) {
  if (!syncEnabled) return false
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
        // ignore-duplicates: 같은 행을 두 번 보내도 조용히 무시됩니다.
        // (UPDATE 권한이 필요한 merge-duplicates와 달리 INSERT 권한만 씁니다.)
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    // 네트워크 없음 / 타임아웃 — 무시합니다.
    return false
  }
}

/** 게임을 시작한 사람. 이미 있으면 무시됩니다. */
export function syncHunter(state) {
  return insert('hunt_hunters', {
    id: state.hunterId,
    nickname: state.nickname || null,
    started_at: state.startedAt || new Date().toISOString(),
  })
}

/** 캐릭터 획득 1건. */
export function syncCatch(state, characterId) {
  return insert('hunt_catches', {
    hunter_id: state.hunterId,
    character_id: characterId,
    caught_at: new Date().toISOString(),
  })
}

/**
 * 통계 서버가 실제로 준비됐는지 확인합니다 (스태프 화면용).
 *
 * 조회 정책을 주지 않았으므로 결과는 항상 빈 목록입니다. 그래도
 * 200이 돌아오면 "테이블이 있고 키가 맞다"는 뜻이고, 404면
 * supabase.sql 을 아직 실행하지 않은 것입니다.
 */
export async function checkConnection() {
  if (!syncEnabled) return { ok: false, reason: '환경변수 없음 (로컬 전용으로 동작 중)' }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const res = await fetch(`${URL_BASE}/rest/v1/hunt_catches?select=hunter_id&limit=1`, {
      signal: ctl.signal,
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
    clearTimeout(timer)
    if (res.ok) return { ok: true, reason: '정상' }
    if (res.status === 404) return { ok: false, reason: '테이블 없음 — supabase.sql 을 실행하세요' }
    return { ok: false, reason: `서버 응답 ${res.status}` }
  } catch {
    return { ok: false, reason: '연결 실패 (네트워크 확인)' }
  }
}

/**
 * 쓰기 자가진단 (스태프 화면용).
 *
 * 평소 insert()는 현장 안정성을 위해 오류를 삼킵니다. 설정이 잘못됐을 때
 * 원인을 볼 수 없으므로, 진단용으로 실제 한 줄을 넣어보고 서버가 준
 * 상태코드와 메시지를 그대로 보여줍니다.
 */
export async function diagnoseWrite() {
  if (!syncEnabled) return { ok: false, detail: '환경변수 없음' }
  const id =
    crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Date.now().toString().slice(-12)}`
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/hunt_hunters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ id, nickname: '__진단__', started_at: new Date().toISOString() }),
    })
    const body = await res.text()
    return {
      ok: res.ok,
      detail: `HTTP ${res.status}${body ? ' · ' + body.slice(0, 220) : ''}`,
    }
  } catch (e) {
    return { ok: false, detail: `요청 실패: ${e?.message || e}` }
  }
}

/** 완주 1건. */
export function syncDone(state) {
  return insert('hunt_completions', {
    hunter_id: state.hunterId,
    nickname: state.nickname || null,
    done_at: state.doneAt || new Date().toISOString(),
  })
}
