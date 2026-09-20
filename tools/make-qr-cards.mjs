/**
 * 부스에 붙일 QR 카드를 인쇄용 PNG로 뽑습니다.
 *
 *   npm run qr -- https://내주소.example.com
 *
 * 결과: print/01-chokku.png … 05-kkumkku.png  (A5 세로, 300dpi)
 * A4 용지에 두 장씩 넣거나 A5로 바로 인쇄하면 됩니다.
 *
 * QR은 오류정정 레벨 H로 만듭니다 — 부스 조명이나 약간의 훼손,
 * 모서리가 접혀도 읽힙니다.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { CHARACTERS } from '../src/data/characters.js'

const base = (process.argv[2] || '').replace(/\/+$/, '')
if (!base) {
  console.log(`
  주소를 알려주세요.

    npm run qr -- https://내주소.example.com

  배포한 주소를 넣으면 그 주소로 QR을 만듭니다.
`)
  process.exit(1)
}

// A5 세로 300dpi
const W = 1748
const H = 2480
const OUT = 'print'
const FONT = 'Malgun Gothic' // 윈도우 기본 한글 글꼴

await mkdir(OUT, { recursive: true })

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let i = 0
for (const c of CHARACTERS) {
  i++
  const url = `${base}/#/c/${c.id}?k=${c.token}`

  // QR — 여백(margin)은 카드 레이아웃에서 주므로 최소로 둡니다.
  const qrPng = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 760,
    color: { dark: '#1b1d21', light: '#ffffff' },
  })

  const charPng = await sharp(`public/characters/${c.id}.webp`)
    .resize({ width: 1020, height: 820, fit: 'inside' })
    .png()
    .toBuffer()
  const charMeta = await sharp(charPng).metadata()

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${c.colorLight}"/>
    <rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="60"
          fill="#ffffff" stroke="${c.color}" stroke-width="18"/>

    <text x="${W / 2}" y="250" text-anchor="middle" font-family="${FONT}"
          font-size="112" font-weight="bold" fill="${c.colorDark}">${c.elementIcon === '❄️' ? '' : ''}나를 찾아줘!</text>

    <text x="${W / 2}" y="1330" text-anchor="middle" font-family="${FONT}"
          font-size="150" font-weight="bold" fill="${c.colorDark}">${esc(c.name)}</text>
    <text x="${W / 2}" y="1410" text-anchor="middle" font-family="${FONT}"
          font-size="52" letter-spacing="14" fill="#868d95">${c.en}</text>

    <text x="${W / 2}" y="2320" text-anchor="middle" font-family="${FONT}"
          font-size="60" font-weight="bold" fill="${c.colorDark}">휴대폰 카메라로 QR을 찍어주세요</text>
    <text x="${W / 2}" y="2400" text-anchor="middle" font-family="${FONT}"
          font-size="44" fill="#868d95">시작박스 · POP-KKUS · ${String(i).padStart(2, '0')} / ${CHARACTERS.length}</text>
  </svg>`)

  const out = path.join(OUT, `${String(i).padStart(2, '0')}-${c.id}.png`)
  await sharp(bg)
    .composite([
      {
        input: charPng,
        left: Math.round((W - charMeta.width) / 2),
        top: Math.round(380 + (820 - charMeta.height) / 2),
      },
      { input: qrPng, left: Math.round((W - 760) / 2), top: 1480 },
    ])
    .png()
    .toFile(out)

  console.log(`  ✓ ${out.padEnd(26)} ${url}`)
}

// 부착 위치를 한눈에 보는 안내문도 같이 만듭니다.
const guide = [
  '팝꾸즈 QR 카드 부착 위치',
  '='.repeat(46),
  '',
  ...CHARACTERS.map(
    (c, n) =>
      `${String(n + 1).padStart(2, '0')}. ${c.name} (${c.en})\n    부착: ${c.spot}\n    주소: ${base}/#/c/${c.id}?k=${c.token}\n`
  ),
  '인쇄: A5 세로 / 300dpi / 배율 100%',
  '3일간 쓰므로 각 2장씩 여분 인쇄를 권장합니다.',
].join('\n')
await writeFile(path.join(OUT, '부착위치.txt'), guide, 'utf8')

console.log(`\n  ${CHARACTERS.length}장 생성 완료 → ${OUT}/`)
console.log(`  부착 위치 안내: ${OUT}/부착위치.txt\n`)
