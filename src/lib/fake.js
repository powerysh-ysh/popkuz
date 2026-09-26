/**
 * 가품 팝꾸즈 — "잡고 보니 짝퉁이었다".
 *
 * 포켓몬고의 메타몽이 같은 구조입니다. 다른 포켓몬인 척 서 있다가 잡은
 * 뒤에야 정체가 드러나죠. 여기서는 한 발 더 갑니다. **잡기 전에 알아챌
 * 수 있는 단서**를 남겨두고, 던지기 전에 "가짜다!"를 외칠 수 있게 합니다.
 *
 *   진품을 잡음    조각 +2          (기본 보상)
 *   가품을 잡음    조각 0 · 연속 끊김 (속았다)
 *   가품을 신고    반짝조각 +1       (감별 성공 — 제일 큰 보상)
 *   진품을 신고    놓침              (의심이 지나쳤다)
 *
 * 2초 안에 "잡을까 / 의심할까"를 정해야 하므로, 그냥 맞추기만 하던
 * 게임이 판단 게임이 됩니다. 한 판이 1분이어도 매번 다릅니다.
 *
 * 단서는 폰 화면에서 한눈에 보여야 합니다. 미묘한 그림자나 1px 차이는
 * 현장 조명에서 아무도 못 봅니다. 그래서 크게 네 가지만 씁니다.
 *
 * 가품은 **야생에만** 나옵니다. 부스·매장의 QR은 우리가 직접 붙인
 * 것이므로 가짜일 수가 없고, 도감과 할인권이 걸려 있어 흔들면 안 됩니다.
 */

export const TELLS = [
  {
    id: 'mirror',
    hint: '좌우가 뒤집혀 있었어요',
    style: { transform: 'scaleX(-1)' },
  },
  {
    id: 'pale',
    hint: '색이 탁했어요',
    style: { filter: 'saturate(0.4) brightness(0.88)' },
  },
  {
    // 색조를 돌리는 단서는 쓰지 않습니다 — 반짝 개체(variant.js)가
    // 색을 바꾸기 때문에, 진짜 반짝이를 가짜로 오해하게 됩니다.
    id: 'blur',
    hint: '윤곽이 흐릿했어요',
    style: { filter: 'blur(1.6px) contrast(0.92)' },
  },
  {
    // 크기로 속이는 단서도 안 씁니다 — 꼬마/특대 개체가 따로 있어서
    // 작다고 다 가짜가 아닙니다. 기울기는 어디와도 겹치지 않습니다.
    id: 'tilt',
    hint: '삐딱하게 기울어져 있었어요',
    style: { transform: 'rotate(-13deg)' },
  },
]

/**
 * 영문 이름을 슬쩍 틀리게 씁니다 (CHOKKU → CH0KKU).
 * 글자를 바꾸는 방식이라 한글 이름을 건드리지 않고, 어느 캐릭터에도
 * 안전하게 적용됩니다.
 */
export function fakeEn(en) {
  if (en.includes('O')) return en.replace('O', '0')
  if (en.includes('K')) return en.replace(/K(?=[^K]*$)/, 'X')
  return `${en.slice(0, -1)}U`
}

/** 잡을수록 가품이 자주 나옵니다. 처음부터 어려우면 그냥 어렵기만 합니다. */
export function fakeChance(caughtSoFar) {
  return Math.min(0.5, 0.18 + caughtSoFar * 0.025)
}

/**
 * 이번에 나올 야생이 가품인지 정합니다.
 * @returns {{tell: object, en: string}|null} null 이면 진품
 */
export function rollFake(character, caughtSoFar) {
  if (Math.random() >= fakeChance(caughtSoFar)) return null
  const tell = TELLS[Math.floor(Math.random() * TELLS.length)]
  return { tell, en: fakeEn(character.en) }
}
