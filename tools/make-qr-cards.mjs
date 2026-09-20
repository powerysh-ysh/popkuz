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
const DPI = 300
const mm = (v) => Math.round((v / 25.4) * DPI)
const OUT = 'print'
const FONT = 'Malgun Gothic' // 윈도우 기본 한글 글꼴

await mkdir(OUT, { recursive: true })

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let i = 0
for (const c of CHARACTERS) {
  i++
  const url = `${base}/#/${c.short}`

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

// ── 테스트 시트 ────────────────────────────────────────────
// A4 한 장에 5마리 QR을 모두 넣습니다. 부스가 아닌 곳(집, 학과 사무실)에서
// 리허설할 때 이 한 장만 출력하면 전체 흐름을 그대로 돌려볼 수 있습니다.
{
  const AW = 2480
  const AH = 3508
  const COLS = 2
  const QR = 620
  const CELL_W = 1080
  const CELL_H = 900
  const X0 = (AW - COLS * CELL_W) / 2
  const Y0 = 560

  const layers = []
  let n = 0
  for (const c of CHARACTERS) {
    const col = n % COLS
    const row = Math.floor(n / COLS)
    const cx = X0 + col * CELL_W
    const cy = Y0 + row * CELL_H

    const qr = await QRCode.toBuffer(`${base}/#/${c.short}`, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: QR,
      color: { dark: '#1b1d21', light: '#ffffff' },
    })
    layers.push({
      input: qr,
      left: Math.round(cx + (CELL_W - QR) / 2),
      top: Math.round(cy),
    })

    const thumb = await sharp(`public/characters/${c.id}.webp`)
      .resize({ width: 150, height: 130, fit: 'inside' })
      .png()
      .toBuffer()
    const tm = await sharp(thumb).metadata()
    layers.push({
      input: thumb,
      left: Math.round(cx + CELL_W / 2 - QR / 2 - tm.width - 20),
      top: Math.round(cy + QR / 2 - tm.height / 2),
    })

    layers.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W}" height="140">
        <text x="${CELL_W / 2}" y="60" text-anchor="middle" font-family="${FONT}"
              font-size="64" font-weight="bold" fill="${c.colorDark}">${esc(c.name)}</text>
        <text x="${CELL_W / 2}" y="118" text-anchor="middle" font-family="${FONT}"
              font-size="38" fill="#868d95">${esc(c.spot)}</text>
      </svg>`),
      left: Math.round(cx),
      top: Math.round(cy + QR + 16),
    })
    n++
  }

  const homeQr = await QRCode.toBuffer(`${base}/`, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 360,
    color: { dark: '#22a45d', light: '#ffffff' },
  })
  layers.push({ input: homeQr, left: Math.round(AW / 2 - 180), top: 2960 })

  const sheetBg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}">
    <rect width="${AW}" height="${AH}" fill="#ffffff"/>
    <rect x="0" y="0" width="${AW}" height="18" fill="#22a45d"/>
    <text x="${AW / 2}" y="190" text-anchor="middle" font-family="${FONT}"
          font-size="96" font-weight="bold" fill="#1b1d21">팝꾸즈를 찾아라 — 테스트 시트</text>
    <text x="${AW / 2}" y="270" text-anchor="middle" font-family="${FONT}"
          font-size="46" fill="#4a5057">이 종이를 오려서 방 곳곳에 붙이면 어디서든 리허설할 수 있습니다</text>
    <text x="${AW / 2}" y="350" text-anchor="middle" font-family="${FONT}"
          font-size="42" fill="#868d95">${esc(base)}</text>
    <text x="${AW / 2}" y="2930" text-anchor="middle" font-family="${FONT}"
          font-size="46" font-weight="bold" fill="#22a45d">게임 시작 (홈 화면)</text>
    <text x="${AW / 2}" y="3400" text-anchor="middle" font-family="${FONT}"
          font-size="38" fill="#868d95">진행 초기화는 ${esc(base)}/#/staff 에서 · 시작박스 POP-KKUS</text>
  </svg>`)

  await sharp(sheetBg).composite(layers).png().toFile(path.join(OUT, '00-테스트시트.png'))
  console.log(`  ✓ ${'print/00-테스트시트.png'.padEnd(26)} A4 한 장에 5마리 전부`)
}

// 부착 위치를 한눈에 보는 안내문도 같이 만듭니다.
const guide = [
  '팝꾸즈 QR 카드 부착 위치',
  '='.repeat(46),
  '',
  ...CHARACTERS.map(
    (c, n) =>
      `${String(n + 1).padStart(2, '0')}. ${c.name} (${c.en})\n    부착: ${c.spot}\n    주소: ${base}/#/${c.short}\n`
  ),
  '인쇄: A5 세로 / 300dpi / 배율 100%',
  '3일간 쓰므로 각 2장씩 여분 인쇄를 권장합니다.',
].join('\n')
await writeFile(path.join(OUT, '부착위치.txt'), guide, 'utf8')

console.log(`\n  ${CHARACTERS.length}장 생성 완료 → ${OUT}/`)
console.log(`  부착 위치 안내: ${OUT}/부착위치.txt\n`)

// ── 입구 안내 POP ──────────────────────────────────────────
// 부스 입구에 세워 "이런 게임이 있다"를 알리는 한 장. A4 300dpi로
// 만들지만 A3로 확대 인쇄해도 깨지지 않습니다.
{
  const W = 2480
  const H = 3508
  const layers = []

  // 캐릭터 5마리 한 줄
  const TH = 330
  const thumbs = []
  let tw = 0
  for (const c of CHARACTERS) {
    const b = await sharp(`public/characters/${c.id}.webp`)
      .resize({ height: TH, fit: 'inside' })
      .png()
      .toBuffer()
    const m = await sharp(b).metadata()
    thumbs.push({ b, w: m.width, h: m.height })
    tw += m.width
  }
  const gap = Math.floor((W - 240 - tw) / (CHARACTERS.length - 1))
  let x = 120
  for (const t of thumbs) {
    layers.push({ input: t.b, left: Math.round(x), top: Math.round(900 + (TH - t.h) / 2) })
    x += t.w + gap
  }

  // 시작 QR (홈 화면)
  const qr = await QRCode.toBuffer(`${base}/`, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 900,
    color: { dark: '#1b1d21', light: '#ffffff' },
  })
  layers.push({ input: qr, left: Math.round((W - 900) / 2), top: 1620 })

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8F7EF"/><stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="0" y="0" width="${W}" height="26" fill="#22A45D"/>

    <text x="${W / 2}" y="330" text-anchor="middle" font-family="${FONT}"
          font-size="66" letter-spacing="10" fill="#22A45D">DONGMYONG UNIVERSITY STARTUP</text>
    <text x="${W / 2}" y="520" text-anchor="middle" font-family="${FONT}"
          font-size="168" font-weight="bold" fill="#1b1d21">팝꾸즈를 찾아라!</text>
    <text x="${W / 2}" y="660" text-anchor="middle" font-family="${FONT}"
          font-size="72" fill="#4a5057">부스 안에 숨은 팝꾸즈 5마리를 모으세요</text>
    <text x="${W / 2}" y="770" text-anchor="middle" font-family="${FONT}"
          font-size="58" fill="#868d95">가입 없이 QR만 찍으면 시작 · 10초면 충분해요</text>

    <text x="${W / 2}" y="1560" text-anchor="middle" font-family="${FONT}"
          font-size="86" font-weight="bold" fill="#22A45D">여기를 찍고 시작하세요</text>

    <text x="240" y="2720" font-family="${FONT}" font-size="66" fill="#1b1d21">
      <tspan font-weight="bold" fill="#22A45D">1</tspan><tspan dx="30">QR을 찍고 닉네임을 정해요</tspan></text>
    <text x="240" y="2840" font-family="${FONT}" font-size="66" fill="#1b1d21">
      <tspan font-weight="bold" fill="#22A45D">2</tspan><tspan dx="30">부스를 돌며 팝꾸즈 5마리를 찾아요</tspan></text>
    <text x="240" y="2960" font-family="${FONT}" font-size="66" fill="#1b1d21">
      <tspan font-weight="bold" fill="#22A45D">3</tspan><tspan dx="30">다 모으면 진화형이 해금돼요!</tspan></text>
    <text x="240" y="3080" font-family="${FONT}" font-size="66" fill="#1b1d21">
      <tspan font-weight="bold" fill="#22A45D">4</tspan><tspan dx="30">완주 화면을 보여주고 선물 받아요</tspan></text>

    <rect x="200" y="3170" width="${W - 400}" height="180" rx="40" fill="#FFF6D6" stroke="#F2B705" stroke-width="6"/>
    <text x="${W / 2}" y="3290" text-anchor="middle" font-family="${FONT}"
          font-size="76" font-weight="bold" fill="#8a6500">완주 선물 드립니다 🎁</text>

    <text x="${W / 2}" y="3450" text-anchor="middle" font-family="${FONT}"
          font-size="50" fill="#868d95">동명대학교 창업학과 · 시작박스 START BOX</text>
  </svg>`)

  await sharp(bg).composite(layers).png().toFile(path.join(OUT, '06-입구POP.png'))
  console.log(`  ✓ ${'print/06-입구POP.png'.padEnd(26)} 입구 안내용 (A4, A3 확대 가능)`)
}

// ── 화면 표시용 낱개 QR ─────────────────────────────────────
// 인쇄 없이 노트북·태블릿 화면에 띄워놓고 스캔하게 하려고 만듭니다.
// 앱의 #/qr 페이지가 이 이미지를 불러 씁니다.
{
  await mkdir('public/qr', { recursive: true })
  for (const c of CHARACTERS) {
    await QRCode.toFile(path.join('public/qr', `${c.id}.png`), `${base}/#/${c.short}`, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 560,
      color: { dark: '#1b1d21', light: '#ffffff' },
    })
  }
  console.log(`  ✓ public/qr/*.png            화면 표시용 (앱 #/qr 에서 사용)`)
}

// ── 키캡·태그용 미니 QR 라벨 시트 ───────────────────────────
// 키캡(가로 18mm)에 직접 붙이거나, 키캡에 매다는 태그에 쓰는 작은 QR입니다.
// 작게 인쇄할수록 오류정정 레벨을 낮춰 모듈 수를 줄이는 편이 잘 읽힙니다.
// (레벨 H = 41x41, 레벨 M + 짧은 주소 = 25x25)
{
  const AW = 2480
  const AH = 3508
  const LABEL = mm(20) // 라벨 한 변 20mm — 18mm 키캡보다 살짝 크게
  const COLS = 8
  const GAP = mm(4)
  const X0 = mm(12)
  const Y0 = mm(34)
  const PER = 16 // 캐릭터당 16장

  const layers = []
  let row = 0
  for (const c of CHARACTERS) {
    const qr = await QRCode.toBuffer(`${base}/#/${c.short}`, {
      errorCorrectionLevel: 'M', // 작게 인쇄하므로 모듈 수를 줄입니다
      margin: 1,
      width: LABEL,
      color: { dark: '#000000', light: '#ffffff' },
    })
    for (let i = 0; i < PER; i++) {
      const col = i % COLS
      const r = row + Math.floor(i / COLS)
      layers.push({
        input: qr,
        left: Math.round(X0 + col * (LABEL + GAP)),
        top: Math.round(Y0 + r * (LABEL + GAP + mm(6))),
      })
    }
    // 줄 라벨
    layers.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="60">
        <text x="${X0}" y="44" font-family="${FONT}" font-size="40" font-weight="bold"
              fill="${c.colorDark}">${esc(c.name)} · ${c.short}</text></svg>`),
      left: 0,
      top: Math.round(Y0 + (row + 2) * (LABEL + GAP + mm(6)) - mm(4)),
    })
    row += 2
    // 줄 간격 확보
    row += 0.35
  }

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}">
    <rect width="${AW}" height="${AH}" fill="#ffffff"/>
    <text x="${X0}" y="${mm(16)}" font-family="${FONT}" font-size="64" font-weight="bold"
          fill="#1b1d21">팝꾸즈 미니 QR 라벨 (20mm)</text>
    <text x="${X0}" y="${mm(25)}" font-family="${FONT}" font-size="36" fill="#868d95">
      키캡에 매다는 태그·카드용 · 캐릭터당 16장 · 오려서 사용</text>
  </svg>`)

  await sharp(bg).composite(layers).png().toFile(path.join(OUT, '08-미니QR라벨.png'))
  console.log(`  ✓ ${'print/08-미니QR라벨.png'.padEnd(26)} 키캡·태그용 20mm 라벨 80장`)
}
