/**
 * 야생 팝꾸즈 — QR 없이 탐지기 화면에 가끔 나타나는 캐릭터.
 *
 * 도감(경품 기준)과는 분리합니다. 야생을 잡아도 도감은 채워지지 않고
 * "오늘 잡은 수"만 올라갑니다. 그래야 관람객이 전시 5곳을 실제로
 * 돌게 되고, 동시에 탐지기를 켜두는 동안 심심하지 않습니다.
 *
 * 스피드 미션 중에는 나타나지 않습니다 — 기록 경쟁을 방해하면 안 됩니다.
 */

const KEY = 'popkkus.wild.v1'

/** 다음 출현까지의 대기 시간(ms). 너무 자주 나오면 QR 찾기를 방해합니다. */
export const MIN_GAP = 10000
export const MAX_GAP = 20000

/** 나타난 뒤 이만큼 지나면 도망갑니다. */
export const ESCAPE_MS = 7000

export function nextGap() {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP)
}

export function pickWild(characters) {
  return characters[Math.floor(Math.random() * characters.length)]
}

/** @returns {{count:number, day:string}} */
export function getWild() {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    // 날짜가 바뀌면 "오늘 잡은 수"를 새로 셉니다 (3일 행사).
    if (!v || v.day !== today) return { count: 0, day: today }
    return { count: Number(v.count) || 0, day: today }
  } catch {
    return { count: 0, day: today }
  }
}

export function addWild() {
  const cur = getWild()
  const next = { count: cur.count + 1, day: cur.day }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
  return next
}

export function clearWild() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
