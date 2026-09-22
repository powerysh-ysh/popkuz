/**
 * 할인권 — 팝업스토어 모드에서 캐릭터를 찾으면 발급됩니다.
 *
 * 할인권은 돈입니다. 엑스포 경품과 달리 실제 금전 손실로 이어지므로
 * 두 가지를 지킵니다.
 *
 *   1. 캐릭터당 1장만 발급 (같은 QR을 여러 번 찍어도 늘어나지 않음)
 *   2. 직원이 사용 처리하면 그 번호는 끝 — 되돌릴 수 없음
 *
 * 다만 이 저장소는 관람객 폰 안에 있습니다. 마음먹고 지우면 다시 받을
 * 수 있으므로, 실제 방어선은 **직원이 번호를 확인하고 적어두는 것**입니다.
 * 그래서 번호를 눈으로 읽기 쉬운 8자리로 만들고, 발급 시각을 함께 보여줍니다.
 */
import { STORE_PLAN } from './mode'

const KEY = 'popkkus.coupons.v1'

/** 헷갈리는 글자(O/0, I/1)를 뺀 문자표 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function newCode() {
  let s = ''
  for (let i = 0; i < 8; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    if (i === 3) s += '-'
  }
  return s
}

/** @returns {Array<{id:string, code:string, amount:number, at:string, usedAt:string|null}>} */
export function getCoupons() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* noop */
  }
  return list
}

/**
 * 캐릭터를 찾았을 때 할인권을 발급합니다.
 * 이미 받은 캐릭터면 새로 만들지 않고 기존 것을 돌려줍니다.
 */
export function issueCoupon(characterId) {
  const plan = STORE_PLAN[characterId]
  if (!plan) return null

  const list = getCoupons()
  const found = list.find((c) => c.id === characterId)
  if (found) return found

  const coupon = {
    id: characterId,
    code: newCode(),
    amount: plan.amount,
    at: new Date().toISOString(),
    usedAt: null,
  }
  save([...list, coupon])
  return coupon
}

export function couponOf(characterId) {
  return getCoupons().find((c) => c.id === characterId) || null
}

/** 직원이 사용 처리합니다. 되돌릴 수 없습니다. */
export function useCoupon(code) {
  const list = getCoupons()
  const i = list.findIndex((c) => c.code === code)
  if (i < 0) return { ok: false, reason: '없는 번호예요' }
  if (list[i].usedAt) return { ok: false, reason: '이미 사용한 할인권이에요' }
  list[i] = { ...list[i], usedAt: new Date().toISOString() }
  save(list)
  return { ok: true, coupon: list[i] }
}

export function clearCoupons() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/** 아직 안 쓴 할인권의 합계 */
export function unusedTotal() {
  return getCoupons()
    .filter((c) => !c.usedAt)
    .reduce((sum, c) => sum + c.amount, 0)
}
