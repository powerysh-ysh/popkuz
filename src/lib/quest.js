/**
 * 중간 미션 — 포켓몬고의 "필드 리서치"에 해당합니다.
 *
 * 탐지기를 켜고 있는 동안 항상 하나가 걸려 있습니다. 깨면 곧바로 다음
 * 미션이 붙습니다. 보상은 반짝조각 — 진화에 쓰는 유일한 만능 조각이라
 * 미션을 깰 이유가 생깁니다.
 *
 * 기존 "스피드 미션"(무작위 2마리 빨리 찾기)과는 다른 것입니다.
 * 스피드 미션은 따로 켜는 기록 경쟁이고, 이 미션은 그냥 놀다 보면
 * 저절로 깨지는 배경 목표입니다.
 *
 * 부스에서 쓰는 물건이라 두 가지를 지켰습니다.
 *   · 관람객이 아무것도 안 배워도 저절로 진행됩니다 (읽을 필요 없음)
 *   · 어떤 미션도 QR을 다시 찍게 만들지 않습니다 (동선을 꼬지 않으려고)
 */

import { issueKeycap } from './keycap'

const KEY = 'popkkus.quest.v1'

/**
 * ev  이 미션을 진행시키는 사건
 *      wild   야생 팝꾸즈를 잡음
 *      new    처음 만나는 팝꾸즈를 QR로 잡음
 *      ball   공을 던져서 맞춤 (야생·QR 모두)
 *      streak 연속 명중 — 빗나가면 0으로 돌아감
 */
export const QUESTS = [
  { id: 'ball2', ev: 'ball', goal: 2, rare: 2, text: '공으로 2마리 맞추기' },
  { id: 'wild3', ev: 'wild', goal: 3, rare: 2, text: '야생 팝꾸즈 3마리 잡기' },
  { id: 'new2', ev: 'new', goal: 2, rare: 3, text: '새로운 팝꾸즈 2마리 만나기' },
  { id: 'streak2', ev: 'streak', goal: 2, rare: 3, text: '연속으로 2번 명중하기' },
  { id: 'wild5', ev: 'wild', goal: 5, rare: 4, text: '야생 팝꾸즈 5마리 잡기' },
  { id: 'ball4', ev: 'ball', goal: 4, rare: 3, text: '공으로 4마리 맞추기' },
]

const byId = (id) => QUESTS.find((q) => q.id === id)

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return byId(v.id) ? v : null
  } catch {
    return null
  }
}

function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* noop */
  }
  return v
}

/**
 * 방금 깬 미션이 바로 다시 나오면 김이 새므로 제외하고 고릅니다.
 * 전부 깼으면 그냥 아무거나 다시 내줍니다 — 끝이 있는 게임이 아닙니다.
 */
function pick(exceptId) {
  const pool = QUESTS.filter((q) => q.id !== exceptId)
  const list = pool.length ? pool : QUESTS
  return list[Math.floor(Math.random() * list.length)]
}

/** 지금 걸려 있는 미션. 없으면 새로 하나 내줍니다. */
export function getQuest() {
  const cur = read()
  if (cur) return { ...byId(cur.id), n: cur.n, done: cur.n >= byId(cur.id).goal }
  const q = pick(null)
  write({ id: q.id, n: 0 })
  return { ...q, n: 0, done: false }
}

/**
 * 사건을 하나 기록합니다.
 *
 * @param {'wild'|'new'|'ball'|'streak'|'miss'} ev
 * @returns {{quest: object, completed: object|null}}
 *          completed 가 있으면 방금 그 미션을 깬 것입니다 (보상 지급 대상).
 */
export function progress(ev) {
  const q = getQuest()

  // 빗나가면 연속 명중 미션만 처음으로 돌아갑니다.
  if (ev === 'miss') {
    if (q.ev === 'streak' && q.n > 0) {
      write({ id: q.id, n: 0 })
      return { quest: { ...q, n: 0, done: false }, completed: null }
    }
    return { quest: q, completed: null }
  }

  // 연속 명중 미션은 'ball' 로도 올라갑니다 (명중이 곧 연속의 재료입니다).
  const hit = q.ev === ev || (q.ev === 'streak' && ev === 'ball')
  if (!hit) return { quest: q, completed: null }

  const n = q.n + 1
  if (n < q.goal) {
    write({ id: q.id, n })
    return { quest: { ...q, n, done: false }, completed: null }
  }

  // 깼습니다 — 다음 미션을 바로 걸어둡니다.
  const next = pick(q.id)
  write({ id: next.id, n: 0 })
  
  const newKeycap = issueKeycap()

  return {
    quest: { ...next, n: 0, done: false },
    completed: { ...q, n: q.goal, done: true, keycap: !!newKeycap },
  }
}

export function clearQuest() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
