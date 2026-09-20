// 팝꾸즈 캐릭터 정의
//
// ┌─ 운영자가 수정할 곳 ────────────────────────────────────┐
// │ spot      : 부스 내 QR 부착 지점 (전시품 확정 후 수정)      │
// │ token     : QR 주소 추측 방지용. 인쇄 전에 바꿔도 됩니다     │
// └────────────────────────────────────────────────────────┘

export const CHARACTERS = [
  {
    id: 'chokku',
    token: 'sb01',
    name: '초꾸',
    en: 'CHOKKU',
    tagline: '새로운 시작을 찾는 호기심 많은 탐험가!',
    element: '풀 (자연)',
    elementIcon: '🌿',
    personality: '호기심 많고 활발함',
    skill: '싹틔우기',
    skillDesc: '주변에 새로운 길을 만들어냄',
    quote: '어디든 가보자! 새로운 게 기다리고 있어!',
    spot: '부스 입구 · 웰컴 배너',
    color: '#22A45D',
    colorDark: '#177843',
    colorLight: '#E8F7EF',
    evo: {
      name: '그린박꾸',
      desc: '모든 곳에 새로운 가능성을 피워내는 숲의 수호자!',
    },
  },
  {
    id: 'ppakku',
    token: 'sb02',
    name: '빠꾸',
    en: 'PPAKKU',
    tagline: '언제나 도전하는 열정적인 에너지 메이커!',
    element: '불 (열정)',
    elementIcon: '🔥',
    personality: '용감하고 도전적임',
    skill: '팝업 부스터',
    skillDesc: '순간적으로 엄청난 속도로 돌진함',
    quote: '멈추지 않아! 지금이 바로 시작이야!',
    spot: '참가팀 전시품 존',
    color: '#E03131',
    colorDark: '#A61E1E',
    colorLight: '#FDECEC',
    evo: {
      name: '레드박꾸',
      desc: '뜨거운 에너지로 모두를 이끄는 불꽃 리더!',
    },
  },
  {
    id: 'nokku',
    token: 'sb03',
    name: '노꾸',
    en: 'NOKKU',
    tagline: '언제나 아이디어가 넘치는 발명 천재!',
    element: '전기 (아이디어)',
    elementIcon: '⚡',
    personality: '똑똑하고 창의적임',
    skill: '아이디어 팝!',
    skillDesc: '새로운 아이템이나 기믹을 만들어냄',
    quote: '좋은 생각이 떠올랐어! 함께 만들어보자!',
    spot: '키캡 만들기 체험 테이블',
    color: '#F2B705',
    colorDark: '#C08F00',
    colorLight: '#FEF6E0',
    evo: {
      name: '골드박꾸',
      desc: '무한한 아이디어로 세상을 변화시키는 발명의 천재!',
    },
  },
  {
    id: 'heenkku',
    token: 'sb04',
    name: '흰꾸',
    en: 'HEENKKU',
    tagline: '언제나 차분하고 든든한 지킴이!',
    element: '얼음 (지식)',
    elementIcon: '❄️',
    personality: '차분하고 신중함',
    skill: '쿨다운 실드',
    skillDesc: '주변을 보호하는 차가운 방어막 생성',
    quote: '천천히, 그리고 확실하게. 언제나 함께야.',
    spot: '학교소개 · 벽면패널',
    color: '#C9D1D9',
    colorDark: '#8B97A3',
    colorLight: '#F4F6F8',
    evo: {
      name: '스노우박꾸',
      desc: '모두를 지키는 차가운 지혜의 수호자!',
    },
  },
  {
    id: 'kkumkku',
    token: 'sb05',
    name: '꿈꾸',
    en: 'KKUMKKU',
    tagline: '언제나 상상을 키우는 몽상가!',
    element: '꿈 (상상)',
    elementIcon: '⭐',
    personality: '상상력이 풍부하고 감성적임',
    skill: '드림 팝!',
    skillDesc: '상상을 현실로 만드는 특별한 힘',
    quote: '상상해봐! 지금 이 순간, 뭐든 될 수 있어!',
    spot: '시작박스 다이어리 존',
    color: '#8B5CF6',
    colorDark: '#6634D4',
    colorLight: '#F1EBFE',
    evo: {
      name: '드림박꾸',
      desc: '상상의 세계를 현실로 여는 꿈의 안내자!',
    },
  },
]

export const TOTAL = CHARACTERS.length

export function findCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || null
}
