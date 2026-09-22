/**
 * 게임 설명서 (A4 300dpi) — 부스에 세워두는 관람객용 안내.
 *
 *   npm run guide -- https://내주소
 *
 * 스태프가 매번 입으로 설명할 수 없으므로, 관람객이 혼자 읽고
 * 시작할 수 있을 만큼만 담습니다. 글이 많으면 아무도 안 읽습니다.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { CHARACTERS } from '../src/data/characters.js'

const base = (process.argv[2] || '').replace(/\/+$/, '')
if (!base) {
  console.log('\n  npm run guide -- https://내주소\n')
  process.exit(1)
}

const W = 2480
const H = 3508
const OUT = 'print'
const FONT = 'Malgun Gothic'
await mkdir(OUT, { recursive: true })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const layers = []

// 시작 QR
const qr = await QRCode.toBuffer(`${base}/`, {
  type: 'png',
  errorCorrectionLevel: 'H',
  margin: 1,
  width: 520,
  color: { dark: '#1b1d21', light: '#ffffff' },
})
layers.push({ input: qr, left: W - 520 - 190, top: 300 })

// 캐릭터 5마리
const TH = 250
const thumbs = []
let tw = 0
for (const c of CHARACTERS) {
  const b = await sharp(`public/characters/${c.id}.webp`)
    .resize({ height: TH, fit: 'inside' })
    .png()
    .toBuffer()
  const m = await sharp(b).metadata()
  thumbs.push({ b, w: m.width, h: m.height, c })
  tw += m.width
}
const gap = Math.floor((W - 360 - tw) / (CHARACTERS.length - 1))
let x = 180
const nameSvg = []
for (const t of thumbs) {
  layers.push({ input: t.b, left: Math.round(x), top: Math.round(2420 + (TH - t.h) / 2) })
  nameSvg.push(
    `<text x="${Math.round(x + t.w / 2)}" y="2740" text-anchor="middle" font-family="${FONT}"
       font-size="52" font-weight="bold" fill="${t.c.colorDark}">${esc(t.c.name)}</text>`
  )
  x += t.w + gap
}

const steps = [
  ['1', 'QR을 찍고 닉네임을 정해요', '가입도 앱 설치도 없어요'],
  ['2', '탐지기를 켜고 부스를 둘러봐요', '카메라 허용을 눌러주세요'],
  ['3', '팝꾸즈를 찾으면 공을 던져 맞춰요', '위로 쭉 밀었다 놓으면 날아가요'],
  ['4', '5마리를 다 모으면 진화형이 열려요', '완주 화면을 스태프에게 보여주세요'],
]
  .map(
    ([n, t, sub], i) => `
    <circle cx="255" cy="${1010 + i * 300}" r="46" fill="#22A45D"/>
    <text x="255" y="${1032 + i * 300}" text-anchor="middle" font-family="${FONT}"
          font-size="60" font-weight="bold" fill="#fff">${n}</text>
    <text x="350" y="${1000 + i * 300}" font-family="${FONT}" font-size="72"
          font-weight="bold" fill="#1b1d21">${esc(t)}</text>
    <text x="350" y="${1070 + i * 300}" font-family="${FONT}" font-size="48"
          fill="#868d95">${esc(sub)}</text>`
  )
  .join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#E8F7EF"/><stop offset="55%" stop-color="#ffffff"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="26" fill="#22A45D"/>

  <text x="180" y="230" font-family="${FONT}" font-size="52" letter-spacing="8"
        fill="#22A45D">게임 설명서</text>
  <text x="180" y="390" font-family="${FONT}" font-size="132" font-weight="bold"
        fill="#1b1d21">팝꾸즈를 찾아라!</text>
  <text x="180" y="480" font-family="${FONT}" font-size="60" fill="#4a5057">
    부스에 숨은 팝꾸즈 5마리를 모으세요</text>
  <text x="180" y="560" font-family="${FONT}" font-size="48" fill="#868d95">
    다 모으면 선물을 드려요 🎁</text>
  <text x="${W - 520 - 190 + 260}" y="890" text-anchor="middle" font-family="${FONT}"
        font-size="46" font-weight="bold" fill="#22A45D">여기 찍고 시작</text>

  ${steps}

  <rect x="180" y="2230" width="${W - 360}" height="600" rx="30" fill="#F7FAF8" stroke="#E5E8EC" stroke-width="4"/>
  <text x="${W / 2}" y="2340" text-anchor="middle" font-family="${FONT}" font-size="56"
        font-weight="bold" fill="#1b1d21">찾아야 할 팝꾸즈 5마리</text>
  ${nameSvg.join('')}

  <rect x="180" y="2900" width="${W - 360}" height="180" rx="30" fill="#FFF6D6" stroke="#F2B705" stroke-width="5"/>
  <text x="${W / 2}" y="3015" text-anchor="middle" font-family="${FONT}" font-size="58"
        font-weight="bold" fill="#8a6500">카카오톡 말고 크롬·사파리로 열어주세요</text>

  <text x="${W / 2}" y="3180" text-anchor="middle" font-family="${FONT}" font-size="44" fill="#868d95">
    잘 안 되면 부스 스태프에게 말씀해 주세요</text>
  <text x="${W / 2}" y="3330" text-anchor="middle" font-family="${FONT}" font-size="42" fill="#B4BAC1">
    동명대학교 창업학과 · 시작박스 START BOX</text>
  <text x="${W / 2}" y="3400" text-anchor="middle" font-family="${FONT}" font-size="38" fill="#C9D1D9">
    ${esc(base)}</text>
</svg>`

await sharp(Buffer.from(svg)).composite(layers).png().toFile(path.join(OUT, '10-게임설명서.png'))
console.log(`\n  ✓ ${OUT}/10-게임설명서.png  (A4, 부스 비치용)\n`)
