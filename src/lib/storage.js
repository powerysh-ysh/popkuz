/**
 * 진행 상황 저장 — localStorage 단독으로 완결됩니다.
 *
 * 전시장 와이파이는 신뢰할 수 없다고 가정합니다. 모든 읽기/쓰기는
 * 로컬에서 즉시 끝나고, 서버 동기화는 sync.js가 별도로 best-effort 처리합니다.
 * 사파리 시크릿 모드 등에서 localStorage 접근 자체가 throw 할 수 있으므로
 * 전부 try/catch 로 감쌉니다.
 */

const KEY = 'popkkus.v1'

const EMPTY = {
  hunterId: null,
  nickname: '',
  caught: [], // [{ id, at }]
  startedAt: null,
  doneAt: null,
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return { ...EMPTY, ...parsed, caught: parsed.caught ?? [] }
  } catch {
    return { ...EMPTY }
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 저장 실패해도 세션 동안의 화면 동작은 유지됩니다.
  }
  return state
}

export function startHunt(nickname) {
  const state = load()
  const next = {
    ...state,
    hunterId: state.hunterId ?? newId(),
    nickname: nickname.trim().slice(0, 12),
    startedAt: state.startedAt ?? new Date().toISOString(),
  }
  return save(next)
}

/** @returns {{state: object, isNew: boolean}} isNew=false 면 이미 잡았던 캐릭터 */
export function addCatch(id) {
  const state = load()
  if (state.caught.some((c) => c.id === id)) {
    return { state, isNew: false }
  }
  const next = {
    ...state,
    hunterId: state.hunterId ?? newId(),
    caught: [...state.caught, { id, at: new Date().toISOString() }],
  }
  return { state: save(next), isNew: true }
}

export function markDone() {
  const state = load()
  if (state.doneAt) return state
  return save({ ...state, doneAt: new Date().toISOString() })
}

/**
 * 이 기기의 진행 상황을 전부 지웁니다
 * (도감 + 미션 + 최고 기록 + 야생 + 할인권 + 조각·진화 + 중간 미션).
 * 운영 모드와 장소 설정은 스태프가 정한 값이므로 남겨둡니다.
 * 시연이나 테스트 뒤에 스태프가 누릅니다. 하나라도 남으면
 * 다음 사람이 이어받은 상태로 시작하게 됩니다.
 */
export function reset() {
  const KEYS = [
    KEY,
    'popkkus.mission.v1',
    'popkkus.best.v1',
    'popkkus.wild.v1',
    'popkkus.coupons.v1',
    'popkkus.pieces.v1', // 조각 · 진화
    'popkkus.quest.v1', // 중간 미션
  ]
  for (const k of KEYS) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* noop */
    }
  }
  return { ...EMPTY }
}

export function hasCaught(state, id) {
  return state.caught.some((c) => c.id === id)
}

/**
 * 완주 인증 코드 — 스태프가 눈으로 확인하는 용도입니다.
 * hunterId에서 6자리를 뽑아 보여주므로 화면마다 항상 같은 값이 나옵니다.
 */
export function completionCode(state) {
  if (!state.hunterId) return '------'
  let h = 0
  for (const ch of state.hunterId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
}

function newId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
