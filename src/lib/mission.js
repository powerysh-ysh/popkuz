/**
 * 미션 모드 — 무작위 2마리를 빨리 찾아오는 스피드런.
 *
 * 도감(5마리 모으기)과 별개로 돌아갑니다. 미션 중에 잡은 캐릭터도
 * 도감에는 그대로 기록되므로 두 모드가 서로를 방해하지 않습니다.
 *
 * 기록은 폰에 저장합니다. 전시장 네트워크를 신뢰하지 않으므로
 * 서버가 없어도 개인 최고 기록은 남습니다.
 */

const KEY = 'popkkus.mission.v1'
const BEST = 'popkkus.best.v1'

/** @returns {{targets:string[], startedAt:number, got:string[], doneAt:number|null}|null} */
export function getMission() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (!Array.isArray(m?.targets) || m.targets.length === 0) return null
    return { got: [], doneAt: null, ...m }
  } catch {
    return null
  }
}

function save(m) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* 저장 실패해도 진행 중 화면은 동작합니다 */
  }
  return m
}

/** 무작위 n마리를 뽑아 미션을 시작합니다. */
export function startMission(characters, n = 2) {
  const pool = [...characters]
  const targets = []
  while (targets.length < n && pool.length) {
    targets.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id)
  }
  return save({ targets, startedAt: Date.now(), got: [], doneAt: null })
}

export function clearMission() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/**
 * 미션 대상을 잡았을 때 기록합니다.
 * @returns {{mission:object, hit:boolean, done:boolean}}
 *   hit=false 면 이번 미션 대상이 아닌 캐릭터입니다 (도감에는 들어갑니다)
 */
export function markMission(id) {
  const m = getMission()
  if (!m || m.doneAt) return { mission: m, hit: false, done: false }
  if (!m.targets.includes(id)) return { mission: m, hit: false, done: false }
  if (m.got.includes(id)) return { mission: m, hit: true, done: false }

  const got = [...m.got, id]
  const done = got.length >= m.targets.length
  const next = save({ ...m, got, doneAt: done ? Date.now() : null })
  if (done) recordBest(next.doneAt - next.startedAt)
  return { mission: next, hit: true, done }
}

export function elapsed(m) {
  if (!m) return 0
  return (m.doneAt ?? Date.now()) - m.startedAt
}

/** 1분 23.4초 형태로 보여줍니다. */
export function formatTime(ms) {
  const total = Math.max(0, ms) / 1000
  const min = Math.floor(total / 60)
  const sec = total - min * 60
  return min > 0 ? `${min}분 ${sec.toFixed(1)}초` : `${sec.toFixed(1)}초`
}

export function getBest() {
  try {
    const v = Number(localStorage.getItem(BEST))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function recordBest(ms) {
  try {
    const prev = getBest()
    if (!prev || ms < prev) localStorage.setItem(BEST, String(ms))
  } catch {
    /* noop */
  }
}
