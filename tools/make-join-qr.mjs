/**
 * 모드별 참가 QR을 인쇄용 PNG로 뽑습니다.
 *
 *   npm run joinqr -- https://powerysh-ysh.github.io/popkuz
 *
 * 왜 따로 뽑나요?
 *   앱의 모드(엑스포 / 팝업스토어)는 **들어온 주소**로 정해집니다.
 *   참가 QR이 공용 주소(/popkuz/)를 가리키면 폰에 저장된 이전 모드를
 *   그대로 따라가므로, 두 행사를 같은 기간에 운영하면 섞입니다.
 *   /expo, /store 를 각각 가리키는 QR을 뽑아 두면 그 걱정이 없습니다.
 *
 * 결과
 *   print/09-참가QR-엑스포.png       A4 세로 300dpi
 *   print/09-참가QR-팝업스토어.png   A4 세로 300dpi
 *   public/qr/join-expo.png          화면 표시용
 *   public/qr/join-store.png         화면 표시용
 *
 * QR은 오류정정 레벨 H입니다 — 조명, 약간의 훼손, 접힌 모서리에도 읽힙니다.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { CHARACTERS } from '../src/data/characters.js'

const base = (process.argv[2] || '').replace(/\/+$/, '')
if (!base) {
  console.log(`
  주소를 알려주세요.

    npm run joinqr -- https://powerysh-ysh.github.io/popkuz
`)
  process.exit(1)
}

// A4 세로 300dpi
const W = 2480
const H = 3508
const OUT = 'print'
const FONT = 'Malgun Gothic' // 윈도우 기본 한글 글꼴

await mkdir(OUT, { recursive: true })
await mkdir('public/qr', { recursive: true })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 표시용 주소 — https:// 를 떼면 읽기 쉽습니다. */
const shown = (url) => url.replace(/^https?:\/\//, '')

const MODES = [
  {
    id: 'expo',
    file: '09-참가QR-엑스포',
    screen: 'join-expo',
    badge: '엑스포 부스용',
    where: '킨텍스 제2전시장 · 시작박스 부스',
    lead: '부스 안에 숨은 팝꾸즈 5마리를 모으세요',
    color: '#22A45D',
    dark: '#177843',
    light: '#E8F7EF',
    steps: [
      'QR을 찍고 닉네임을 정해요 (가입 없음)',
      '탐지기를 켜고 부스를 돌며 QR을 찾아요',
      '공을 던져 맞추면 팝꾸즈를 잡아요',
      '5마리를 다 모으면 진화형이 해금돼요',
    ],
    ribbon: { text: '완주 선물 드립니다 🎁', bg: '#FFF6D6', line: '#F2B705', ink: '#8a6500' },
  },
  {
    id: 'store',
    file: '09-참가QR-팝업스토어',
    screen: 'join-store',
    badge: '교내 팝업스토어용',
    where: '동명대학교 교내 팝업스토어',
    lead: '매장 주변에 숨은 팝꾸즈를 찾으세요',
    color: '#7B5CD6',
    dark: '#573F9B',
    light: '#F0ECFB',
    steps: [
      'QR을 찍고 닉네임을 정해요 (가입 없음)',
      '매장 주변을 돌며 팝꾸즈를 찾아요',
      '찾을 때마다 할인권을 드려요',
      '매장에 들어와 직원에게 보여주세요',
    ],
    ribbon: {
      text: '최대 10,000원 할인권 🎟',
      bg: '#F3EEFF',
      line: '#7B5CD6',
      ink: '#4A3487',
    },
  },
]

for (const m of MODES) {
  const url = `${base}/${m.id}/`
  const layers = []

  // ── 캐릭터 5마리 한 줄 ────────────────────────────────
  const TH = 300
  const thumbs = []
  let tw = 0
  for (const c of CHARACTERS) {
    const b = await sharp(`public/characters/${c.id}.webp`)
      .resize({ height: TH, fit: 'inside' })
      .png()
      .toBuffer()
    const meta = await sharp(b).metadata()
    thumbs.push({ b, w: meta.width, h: meta.height })
    tw += meta.width
  }
  const gap = Math.floor((W - 260 - tw) / (CHARACTERS.length - 1))
  let x = 130
  for (const t of thumbs) {
    layers.push({ input: t.b, left: Math.round(x), top: Math.round(880 + (TH - t.h) / 2) })
    x += t.w + gap
  }

  // ── QR ────────────────────────────────────────────────
  // 흰 여백 위에 얹어야 어두운 배경에서도 확실히 읽힙니다.
  const QS = 1000
  const PAD = 60
  const qr = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: QS,
    color: { dark: '#1b1d21', light: '#ffffff' },
  })
  const plate = await sharp({
    create: {
      width: QS + PAD * 2,
      height: QS + PAD * 2,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([{ input: qr, left: PAD, top: PAD }])
    .png()
    .toBuffer()
  layers.push({ input: plate, left: Math.round((W - (QS + PAD * 2)) / 2), top: 1520 })

  const steps = m.steps
    .map(
      (s, i) => `
    <text x="250" y="${2842 + i * 108}" font-family="${FONT}" font-size="62" fill="#1b1d21">
      <tspan font-weight="bold" fill="${m.color}">${i + 1}</tspan><tspan dx="34">${esc(s)}</tspan>
    </text>`
    )
    .join('')

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${m.light}"/><stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="0" y="0" width="${W}" height="28" fill="${m.color}"/>

    <rect x="${W / 2 - 400}" y="150" width="800" height="118" rx="59" fill="${m.color}"/>
    <text x="${W / 2}" y="230" text-anchor="middle" font-family="${FONT}"
          font-size="66" font-weight="bold" fill="#ffffff">${esc(m.badge)}</text>

    <text x="${W / 2}" y="420" text-anchor="middle" font-family="${FONT}"
          font-size="58" letter-spacing="9" fill="${m.color}">DONGMYONG UNIVERSITY STARTUP</text>
    <text x="${W / 2}" y="600" text-anchor="middle" font-family="${FONT}"
          font-size="164" font-weight="bold" fill="#1b1d21">팝꾸즈를 찾아라!</text>
    <text x="${W / 2}" y="726" text-anchor="middle" font-family="${FONT}"
          font-size="70" fill="#4a5057">${esc(m.lead)}</text>
    <text x="${W / 2}" y="822" text-anchor="middle" font-family="${FONT}"
          font-size="54" fill="#868d95">가입 없이 QR만 찍으면 시작 · 10초면 충분해요</text>

    <text x="${W / 2}" y="1450" text-anchor="middle" font-family="${FONT}"
          font-size="88" font-weight="bold" fill="${m.color}">여기를 찍고 시작하세요</text>

    <text x="${W / 2}" y="2716" text-anchor="middle" font-family="${FONT}"
          font-size="50" fill="#868d95">${esc(shown(url))}</text>

    ${steps}

    <rect x="210" y="3246" width="${W - 420}" height="164" rx="38"
          fill="${m.ribbon.bg}" stroke="${m.ribbon.line}" stroke-width="6"/>
    <text x="${W / 2}" y="3356" text-anchor="middle" font-family="${FONT}"
          font-size="72" font-weight="bold" fill="${m.ribbon.ink}">${esc(m.ribbon.text)}</text>

    <text x="${W / 2}" y="3474" text-anchor="middle" font-family="${FONT}"
          font-size="44" fill="#868d95">${esc(m.where)} · 시작박스 START BOX</text>
  </svg>`)

  await sharp(bg).composite(layers).png().toFile(path.join(OUT, `${m.file}.png`))
  console.log(`  ✓ ${`print/${m.file}.png`.padEnd(34)} → ${url}`)

  // ── 화면 표시용 낱개 QR ────────────────────────────────
  await QRCode.toFile(path.join('public/qr', `${m.screen}.png`), url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 720,
    color: { dark: '#1b1d21', light: '#ffffff' },
  })
  console.log(`  ✓ ${`public/qr/${m.screen}.png`.padEnd(34)} 화면 표시용`)
}

console.log(`
  인쇄 설정: 컬러 / 배율 100% / 배경 그래픽 켜기 / A4 세로
  두 행사를 같은 기간에 운영하신다면 이 두 장을 각각 쓰세요.
`)
