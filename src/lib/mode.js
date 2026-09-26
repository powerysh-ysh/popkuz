/**
 * 운영 모드 — 같은 앱을 두 행사에서 쓰기 위한 장치.
 *
 *   expo   2026 산학협력 EXPO 킨텍스 부스 (3일)
 *          전시 5곳을 보게 만드는 것이 목적. 완주하면 경품.
 *
 *   store  동명대 교내 팝업스토어 (1~2주)
 *          매장 유입과 구매가 목적. 찾을 때마다 할인권을 준다.
 *
 * 모드는 **들어온 주소**로 정합니다. 인쇄한 QR이 모드를 결정하므로
 * 기기 설정에 의존하지 않고, 두 행사를 동시에 운영해도 섞이지 않습니다.
 *
 *   /popkuz/        → 저장된 모드 (기본 expo)
 *   /popkuz/expo    → expo 모드로 전환 후 시작
 *   /popkuz/store   → store 모드로 전환 후 시작
 */

const KEY = 'popkkus.mode.v1'

export const MODES = {
  expo: {
    id: 'expo',
    name: '엑스포 부스',
    where: '킨텍스 제2전시장 · 시작박스 부스',
    // 5마리를 다 모으면 완주 → 경품
    goal: 'collect',
    reward: '완주 선물',
    hasCoupon: false,
    hasWild: true, // 야생 출현
    hasMission: true, // 스피드 미션
    hasBuddy: false, // 동행 캐릭터 선택
    sequential: false, // 순서대로 잠금 해제
  },
  store: {
    id: 'store',
    name: '팝업스토어',
    where: '동명대학교 교내 팝업스토어',
    // 찾을 때마다 할인권 → 매장에서 사용
    goal: 'coupon',
    reward: '매장 할인권',
    hasCoupon: true,
    // 야생은 켜되 할인권은 주지 않습니다. 할인권은 오직 매장 주변의
    // QR 5개로만 나옵니다 — 야생으로 돈이 나가면 안 됩니다.
    // 야생은 진화 재료(조각)와 미션 진행에만 쓰입니다.
    hasWild: true,
    hasMission: false,
    hasBuddy: true,
    sequential: true, // 꿈꾸는 앞의 넷을 찾아야 열립니다
  },
}

/**
 * 팝업스토어 모드의 캐릭터별 난이도와 보상.
 * 순서(order)는 잠금 해제 순서이기도 합니다.
 */
export const STORE_PLAN = {
  nokku: {
    order: 1,
    level: '쉬움',
    amount: 1000,
    role: '처음 온 학생을 맞이하는 안내자',
    clue: '매장 앞 안내판 근처에 있어요.',
  },
  chokku: {
    order: 2,
    level: '보통',
    amount: 2000,
    role: '숨는 것을 좋아함',
    clue: '초록빛이 보이는 곳을 살펴보세요.',
  },
  ppakku: {
    order: 3,
    level: '조금 어려움',
    amount: 3000,
    role: '빠르고 활동적임',
    clue: '사람이 자주 지나다니는 길목, 눈높이보다 위를 보세요.',
  },
  heenkku: {
    order: 4,
    level: '어려움',
    amount: 5000,
    role: '조용하고 눈썰미가 좋음',
    clue: '두 개의 단서가 만나는 자리에 있어요.',
  },
  kkumkku: {
    order: 5,
    level: '최고 난도',
    amount: 10000,
    role: '마지막에 나타나는 희귀 팝꾸즈',
    clue: '앞선 넷을 모두 만나야 모습을 드러냅니다.',
  },
}

/** 할인권 사용 조건 — 화면 여러 곳에 같은 문구로 씁니다. */
export const COUPON_TERMS = [
  '팝업스토어 안에서 상품을 구매할 때만 사용할 수 있어요.',
  '결제 1회에 할인권 1장, 다른 할인권과 중복 사용은 안 돼요.',
  '잔액은 환급되지 않아요.',
  '1만원 할인권은 하루 발급 수량이 정해져 있어요.',
]

export function getMode() {
  try {
    const v = localStorage.getItem(KEY)
    return v && MODES[v] ? v : 'expo'
  } catch {
    return 'expo'
  }
}

export function setMode(id) {
  if (!MODES[id]) return getMode()
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* noop */
  }
  return id
}

/** 현재 모드의 설정 */
export function modeConfig() {
  return MODES[getMode()]
}

export function isStore() {
  return getMode() === 'store'
}

/** 팝업스토어 모드에서의 캐릭터 정보 (없으면 null) */
export function planOf(characterId) {
  return STORE_PLAN[characterId] || null
}

export function formatWon(n) {
  return `${n.toLocaleString('ko-KR')}원`
}
