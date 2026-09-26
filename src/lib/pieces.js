import { addBonus } from './score.js'

/**
 * 팝조각 — 포켓몬고의 "사탕"에 해당합니다.
 *
 * 왜 넣었나요?
 *   야생 포획이 "오늘 잡은 수"만 올리고 끝나서, 잡을 이유가 없었습니다.
 *   포켓몬고가 재미있는 건 잡기 → 사탕 → 진화로 이어지는 고리가 있기
 *   때문입니다. 야생 포획을 진화의 재료로 만들면 그 고리가 생깁니다.
 *
 * 두 가지 조각이 있습니다.
 *   팝조각    그 캐릭터 전용. QR로 처음 잡으면 3개, 야생으로 잡으면 2개.
 *   반짝조각  아무 캐릭터에게나 쓸 수 있음. 미션을 깨야만 나옵니다.
 *             (포켓몬고의 "이상한 사탕"에 해당합니다)
 *
 * 도감과는 분리되어 있습니다. 조각을 아무리 모아도 도감은 부스의 QR로만
 * 채워집니다 — 관람객이 전시 5곳을 실제로 돌게 하려는 원래 목적은
 * 그대로 지켜야 합니다.
 */

const KEY = 'popkkus.pieces.v1'

/** 진화에 필요한 조각 수 */
export const EVOLVE_COST = 6

/** 어떻게 잡았을 때 조각을 몇 개 주는지 */
export const GAIN = {
  qr: 3, // QR로 처음 만났을 때
  wild: 2, // 야생으로 잡았을 때
}

const EMPTY = { p: {}, rare: 0, evolved: [] }

export function loadPieces() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY, p: {} }
    const v = JSON.parse(raw)
    return {
      p: v.p && typeof v.p === 'object' ? v.p : {},
      rare: Number(v.rare) || 0,
      evolved: Array.isArray(v.evolved) ? v.evolved : [],
    }
  } catch {
    return { ...EMPTY, p: {} }
  }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 저장에 실패해도 화면 동작은 유지됩니다 */
  }
  return s
}

/** 그 캐릭터 전용 조각을 더합니다. */
export function addPieces(id, n) {
  const s = loadPieces()
  s.p[id] = (s.p[id] || 0) + n
  return save(s)
}

/** 반짝조각(아무 데나 쓸 수 있는 조각)을 더합니다. */
export function addRare(n) {
  const s = loadPieces()
  s.rare += n
  return save(s)
}

export function piecesOf(id) {
  return loadPieces().p[id] || 0
}

export function rareCount() {
  return loadPieces().rare
}

export function isEvolved(id) {
  return loadPieces().evolved.includes(id)
}

/**
 * 진화 가능 여부와 남은 수량.
 * 전용 조각이 모자라면 반짝조각으로 채울 수 있습니다.
 */
export function evolveStatus(id) {
  const s = loadPieces()
  const own = s.p[id] || 0
  const need = Math.max(0, EVOLVE_COST - own)
  return {
    evolved: s.evolved.includes(id),
    own,
    rare: s.rare,
    cost: EVOLVE_COST,
    // 반짝조각으로 메워야 하는 수
    useRare: Math.min(need, s.rare),
    can: !s.evolved.includes(id) && own + s.rare >= EVOLVE_COST,
  }
}

/**
 * 진화시킵니다. 전용 조각을 먼저 쓰고 모자란 만큼만 반짝조각을 씁니다
 * (반짝조각이 더 귀하므로 아껴 쓰는 쪽이 사용자에게 유리합니다).
 *
 * @returns {{ok: boolean, reason?: string, usedRare?: number}}
 */
export function evolve(id) {
  const s = loadPieces()
  if (s.evolved.includes(id)) return { ok: false, reason: '이미 진화했어요' }

  const own = s.p[id] || 0
  const fromOwn = Math.min(own, EVOLVE_COST)
  const fromRare = EVOLVE_COST - fromOwn
  if (fromRare > s.rare) return { ok: false, reason: '조각이 모자라요' }

  s.p[id] = own - fromOwn
  s.rare -= fromRare
  s.evolved = [...s.evolved, id]
  save(s)
  addBonus(200, 'evolve:' + id)
  return { ok: true, usedRare: fromRare }
}

export function losePiece(characterId) {
  const s = loadPieces()
  if (s.rare >= 1) {
    s.rare -= 1
    save(s)
    return { lost: 'rare' }
  }
  const own = s.p[characterId] || 0
  if (own >= 1) {
    s.p[characterId] = own - 1
    save(s)
    return { lost: 'piece' }
  }
  return { lost: null }
}

export function clearPieces() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/**
 * 「그린박꾸(으)로」 같은 표기를 피합니다.
 * 한글 음절의 받침 유무로 "로 / 으로"를 고릅니다 (받침 ㄹ 은 "로").
 */
export function ro(word) {
  const last = word.codePointAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '로' // 한글이 아니면 그냥 로
  const jong = (last - 0xac00) % 28
  return jong === 0 || jong === 8 ? '로' : '으로'
}
