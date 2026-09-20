/**
 * 팀 회의용 설명 한 장 (A4 300dpi).
 *
 *   npm run team
 *
 * 회의에서 말로 설명하면 잘 안 와닿습니다. 한 장을 돌리고, 그 자리에서
 * 각자 폰으로 2분 해보게 하는 것이 가장 빠릅니다. 그래서 오른쪽 위에
 * 바로 해볼 수 있는 QR을 넣었습니다.
 *
 * 전시 매칭 칸은 일부러 비워 둡니다 — 회의에서 손으로 채우라고.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { CHARACTERS } from '../src/data/characters.js'

const base = (process.argv[2] || '').replace(/\/+$/, '')
if (!base) {
  console.log('\n  npm run team -- https://내주소\n')
  process.exit(1)
}

const W = 2480
const H = 3508
const OUT = 'print'
const FONT = 'Malgun Gothic'
await mkdir(OUT, { recursive: true })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const layers = []

// 상단 QR — 회의 자리에서 바로 해보라고
const qr = await QRCode.toBuffer(`${base}/`, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 1,
  width: 330,
  color: { dark: '#1b1d21', light: '#ffffff' },
})
layers.push({ input: qr, left: W - 330 - 150, top: 150 })

// 캐릭터 5마리 줄 — 매칭 표 왼쪽 열에 들어갑니다
const ROW_Y = 1180
const ROW_H = 250
for (let i = 0; i < CHARACTERS.length; i++) {
  const c = CHARACTERS[i]
  const img = await sharp(`public/characters/${c.id}.webp`)
    .resize({ height: 150, fit: 'inside' })
    .png()
    .toBuffer()
  const m = await sharp(img).metadata()
  layers.push({
    input: img,
    left: 250,
    top: Math.round(ROW_Y + i * ROW_H + (ROW_H - m.height) / 2 - 10),
  })
}

const rows = CHARACTERS.map((c, i) => {
  const y = ROW_Y + i * ROW_H
  return `
    <rect x="180" y="${y - 20}" width="${W - 360}" height="${ROW_H - 16}" rx="24"
          fill="${i % 2 ? '#F7FAF8' : '#FFFFFF'}" stroke="#E5E8EC" stroke-width="3"/>
    <text x="470" y="${y + 85}" font-family="${FONT}" font-size="62" font-weight="bold"
          fill="${c.colorDark}">${esc(c.name)}</text>
    <text x="470" y="${y + 145}" font-family="${FONT}" font-size="40" fill="#868d95">${esc(
      c.element
    )}</text>
    <line x1="820" y1="${y + 40}" x2="820" y2="${y + ROW_H - 70}" stroke="#E5E8EC" stroke-width="3"/>
    <text x="880" y="${y + 80}" font-family="${FONT}" font-size="36" fill="#B4BAC1">맡을 전시 · 체험</text>
    <line x1="880" y1="${y + 150}" x2="${W - 260}" y2="${y + 150}" stroke="#C9D1D9" stroke-width="3"
          stroke-dasharray="14 10"/>`
}).join('')

const steps = [
  ['1', 'QR을 찍고 닉네임 입력 (가입 없음, 10초)'],
  ['2', '탐지기를 켜고 부스를 돌며 팝꾸즈 5마리를 찾음'],
  ['3', '찾으면 화면에서 팡팡 뛰는 캐릭터를 탭해서 잡음'],
  ['4', '같이 사진 찍어 인스타·카톡에 공유 (워터마크 자동)'],
  ['5', '5마리 완성 → 진화형 해금 → 인증 코드 → 선물'],
]
  .map(
    ([n, t], i) => `
    <circle cx="255" cy="${640 + i * 88}" r="26" fill="#22A45D"/>
    <text x="255" y="${653 + i * 88}" text-anchor="middle" font-family="${FONT}"
          font-size="36" font-weight="bold" fill="#fff">${n}</text>
    <text x="305" y="${654 + i * 88}" font-family="${FONT}" font-size="44" fill="#1b1d21">${esc(t)}</text>`
  )
  .join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="22" fill="#22A45D"/>

  <text x="180" y="230" font-family="${FONT}" font-size="46" letter-spacing="8"
        fill="#22A45D">동명대 창업학과 · 시작박스 부스</text>
  <text x="180" y="340" font-family="${FONT}" font-size="118" font-weight="bold"
        fill="#1b1d21">팝꾸즈를 찾아라</text>
  <text x="180" y="420" font-family="${FONT}" font-size="48" fill="#4a5057">
    관람객이 우리 전시를 &#48577;&#51648; &#50506;&#44172; &#47564;&#46300;&#45716; 부스 게임</text>
  <text x="${W - 330 - 150 + 165}" y="530" text-anchor="middle" font-family="${FONT}"
        font-size="34" fill="#868d95">여기 찍고 지금 해보세요</text>

  <rect x="180" y="470" width="1700" height="120" rx="20" fill="#FFF6D6" stroke="#F2B705" stroke-width="4"/>
  <text x="220" y="547" font-family="${FONT}" font-size="46" fill="#8a6500">
    핵심: 경품이 목적이 아니라 &#8220;5개 전시를 다 보게 만드는 것&#8221;이 목적입니다</text>

  ${steps}

  <text x="180" y="1105" font-family="${FONT}" font-size="58" font-weight="bold" fill="#1b1d21">
    캐릭터 ↔ 전시·체험 매칭 (회의에서 채우기)</text>
  ${rows}

  <rect x="180" y="2480" width="${W - 360}" height="330" rx="24" fill="#E8F7EF"/>
  <text x="230" y="2560" font-family="${FONT}" font-size="52" font-weight="bold" fill="#177843">
    각자 준비할 것</text>
  <text x="230" y="2640" font-family="${FONT}" font-size="44" fill="#1b1d21">
    · 내 전시 어디에 QR을 붙일지 정하기 (관람객이 전시 앞에 서게 되는 자리)</text>
  <text x="230" y="2710" font-family="${FONT}" font-size="44" fill="#1b1d21">
    · 내 캐릭터 이름 외우기 — 관람객이 &#8220;○○ 어디 있어요?&#8221; 하고 물어봅니다</text>
  <text x="230" y="2780" font-family="${FONT}" font-size="44" fill="#1b1d21">
    · 행사 전에 폰으로 한 번 해보기 (안 해보면 현장에서 설명 못 합니다)</text>

  <rect x="180" y="2870" width="${W - 360}" height="250" rx="24" fill="#FFF" stroke="#E5E8EC" stroke-width="3"/>
  <text x="230" y="2950" font-family="${FONT}" font-size="52" font-weight="bold" fill="#1b1d21">
    오늘 정할 것</text>
  <text x="230" y="3025" font-family="${FONT}" font-size="44" fill="#1b1d21">
    1. 위 매칭표 채우기        2. 경품 품목·수량 (9/24까지 발주)</text>
  <text x="230" y="3090" font-family="${FONT}" font-size="44" fill="#1b1d21">
    3. QR 인쇄 담당 · 경품 확인 담당 정하기</text>

  <text x="${W / 2}" y="3300" text-anchor="middle" font-family="${FONT}" font-size="38" fill="#868d95">
    ${esc(base)}</text>
  <text x="${W / 2}" y="3370" text-anchor="middle" font-family="${FONT}" font-size="34" fill="#B4BAC1">
    2026 산학협력 EXPO · 킨텍스 제2전시장 · 9/30(수)~10/2(금)</text>
</svg>`

await sharp(Buffer.from(svg)).composite(layers).png().toFile(path.join(OUT, '07-팀설명서.png'))
console.log(`\n  ✓ ${OUT}/07-팀설명서.png  (A4, 회의용 한 장)\n`)
