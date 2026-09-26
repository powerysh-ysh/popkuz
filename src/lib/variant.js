/**
 * 개체 변이 — 같은 5마리라도 만날 때마다 다르게.
 *
 * "캐릭터가 5개뿐이라 금방 질린다"가 문제였습니다. 새 캐릭터를 그리는 건
 * 일러스트 작업이라 당장은 못 합니다. 대신 포켓몬고가 같은 문제를 푼
 * 방식을 씁니다 — **개체마다 다르게** 만드는 것입니다.
 *
 *   이로치(반짝)  같은 포켓몬인데 색이 다름. 매우 드물고, 만나면 자랑거리
 *   XXS / XXL     크기 기록. 별것 아닌데 사람들이 굉장히 좋아합니다
 *   진화형 야생    이미 진화한 개체가 야생에 나옴
 *
 * 5마리 × (기본/진화형) × (일반/반짝) × 크기 3종 = 60가지 조합이라,
 * 1분을 하든 10분을 하든 "어, 저건 뭐지?"가 계속 나옵니다.
 *
 * 그림은 이미 있는 10장(기본 5 + 진화형 5)만 씁니다. 반짝은 색을 돌려
 * 만들고, 크기는 배율만 바꿉니다. 새 에셋이 필요 없습니다.
 */

/** 진화형 개체로 나올 확률 */
const EVO_CHANCE = 0.14

/** 반짝 개체로 나올 확률. 너무 흔하면 특별하지 않습니다. */
const SHINY_CHANCE = 0.05

/** 시연용으로 이름을 대고 고를 수 있도록 객체로 둡니다. */
export const SIZES = {
  xxs: { id: 'xxs', label: '꼬마', weight: 12, scale: 0.66, bonus: 1 },
  normal: { id: 'normal', label: '', weight: 76, scale: 1, bonus: 0 },
  xxl: { id: 'xxl', label: '특대', weight: 12, scale: 1.3, bonus: 1 },
}

function pickSize() {
  const list = Object.values(SIZES)
  const total = list.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const s of list) {
    r -= s.weight
    if (r <= 0) return s
  }
  return SIZES.normal
}

/**
 * 야생 개체 하나를 굴립니다. 가품에는 쓰지 않습니다
 * (가짜인데 반짝이기까지 하면 단서가 뭐였는지 알 수 없게 됩니다).
 */
export function rollVariant() {
  return {
    evo: Math.random() < EVO_CHANCE,
    shiny: Math.random() < SHINY_CHANCE,
    size: pickSize(),
  }
}

/**
 * 화면에 띄울 이름. 앞에서부터 붙입니다.
 *   ✨ 반짝 특대 그린박꾸
 */
export function variantName(character, v) {
  const parts = []
  if (v.shiny) parts.push('✨ 반짝')
  if (v.size.label) parts.push(v.size.label)
  parts.push(v.evo ? character.evo.name : character.name)
  return parts.join(' ')
}

/**
 * 조각 보상.
 *   기본 2 · 진화형 4 · 크기 변이 +1 · 반짝이면 전체 3배
 * 반짝 진화형 특대면 (4+1)×3 = 15조각 — 한 번에 두 마리를 진화시킬 수
 * 있는 양입니다. 드물어야 신나는 보상이라 확률을 5%로 잡았습니다.
 */
export function variantPieces(v, base) {
  const n = (v.evo ? base * 2 : base) + v.size.bonus
  return v.shiny ? n * 3 : n
}

/** 개체가 특별할수록 한마디 붙여줍니다. 아무 말 없으면 그냥 지나갑니다. */
export function variantNote(v) {
  if (v.shiny) return '반짝 개체예요! 아주 드물어요'
  if (v.evo) return '이미 진화한 개체네요'
  if (v.size.id === 'xxl') return '엄청나게 크네요'
  if (v.size.id === 'xxs') return '아주 작아요'
  return ''
}
