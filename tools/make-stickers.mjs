/**
 * 팝꾸즈 스티커 인쇄 시안을 만듭니다.
 *
 *   npm run stickers
 *
 * 결과 (sticker/ 폴더)
 *   시안_A6시트.png        인쇄소에 넘기는 파일 (A6, 300dpi, 3mm 도련 포함)
 *   칼선안내_A6시트.png     칼선 위치를 확인하는 용도 (인쇄소에 같이 첨부)
 *   낱개/*.png             낱장 스티커 (투명 배경, 흰 테두리 포함)
 *   인쇄사양.txt           발주할 때 그대로 전달하는 사양서
 *
 * 왜 도련(bleed)이 필요한가: 인쇄 후 자를 때 종이가 0.5~1mm씩 밀립니다.
 * 재단선 바깥까지 그림을 3mm 더 그려두지 않으면 가장자리에 흰 줄이 생깁니다.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CHARACTERS } from '../src/data/characters.js'

const DPI = 300
const mm = (v) => Math.round((v / 25.4) * DPI)

// A6 105 x 148mm + 도련 3mm
const BLEED = mm(3)
const TRIM_W = mm(105)
const TRIM_H = mm(148)
const W = TRIM_W + BLEED * 2
const H = TRIM_H + BLEED * 2

const OUT = 'sticker'
const FONT = 'Malgun Gothic'

// 스티커 격자: 2열 x 3행
const COLS = 2
const ROWS = 3
const PAD = mm(6) // 시트 가장자리 여백 (재단선 기준)
const GAPX = mm(5)
const GAPY = mm(5)
const CELL_W = Math.floor((TRIM_W - PAD * 2 - GAPX * (COLS - 1)) / COLS)
const CELL_H = Math.floor((TRIM_H - PAD * 2 - GAPY * (ROWS - 1)) / ROWS)

await mkdir(path.join(OUT, '낱개'), { recursive: true })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 스티커 한 장: 흰 배지 + 컬러 테두리 + 캐릭터 + 이름 */
async function sticker(c, w, h) {
  const R = Math.round(Math.min(w, h) * 0.22)
  const art = await sharp(`public/characters/${c.id}.webp`)
    .resize({
      width: Math.round(w * 0.66),
      height: Math.round(h * 0.52),
      fit: 'inside',
    })
    .png()
    .toBuffer()
  const am = await sharp(art).metadata()

  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${R}"
          fill="#ffffff" stroke="${c.color}" stroke-width="12"/>
    <text x="${w / 2}" y="${h - Math.round(h * 0.17)}" text-anchor="middle"
          font-family="${FONT}" font-size="${Math.round(h * 0.16)}"
          font-weight="bold" fill="${c.colorDark}">${esc(c.name)}</text>
    <text x="${w / 2}" y="${h - Math.round(h * 0.07)}" text-anchor="middle"
          font-family="${FONT}" font-size="${Math.round(h * 0.062)}"
          letter-spacing="4" fill="#9aa1a8">${c.en}</text>
  </svg>`)

  return sharp(base)
    .composite([
      {
        input: art,
        left: Math.round((w - am.width) / 2),
        top: Math.round(h * 0.11),
      },
    ])
    .png()
    .toBuffer()
}

/** 6번째 칸: 시작박스 워드마크 스티커 */
async function logoSticker(w, h) {
  const R = Math.round(Math.min(w, h) * 0.22)
  return sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${R}"
            fill="#22A45D"/>
      <text x="${w / 2}" y="${Math.round(h * 0.45)}" text-anchor="middle"
            font-family="${FONT}" font-size="${Math.round(h * 0.2)}"
            font-weight="bold" fill="#ffffff">시작박스</text>
      <text x="${w / 2}" y="${Math.round(h * 0.62)}" text-anchor="middle"
            font-family="${FONT}" font-size="${Math.round(h * 0.09)}"
            letter-spacing="8" fill="#BFF0D4">START BOX</text>
      <text x="${w / 2}" y="${Math.round(h * 0.82)}" text-anchor="middle"
            font-family="${FONT}" font-size="${Math.round(h * 0.085)}"
            fill="#E8F7EF">작은 상자가 만든 큰 세계</text>
    </svg>`)
  )
    .png()
    .toBuffer()
}

// ── 시트 조립 ──────────────────────────────────────────────
const cells = []
for (const c of CHARACTERS) cells.push({ kind: 'char', c })
cells.push({ kind: 'logo' })

const layers = []
const cutRects = []
for (let i = 0; i < cells.length; i++) {
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const left = BLEED + PAD + col * (CELL_W + GAPX)
  const top = BLEED + PAD + row * (CELL_H + GAPY)

  const img =
    cells[i].kind === 'char'
      ? await sticker(cells[i].c, CELL_W, CELL_H)
      : await logoSticker(CELL_W, CELL_H)

  layers.push({ input: img, left, top })
  cutRects.push({ left, top })
}

const sheetBg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <rect width="${W}" height="${H}" fill="#ffffff"/>
   </svg>`
)
await sharp(sheetBg).composite(layers).png().toFile(path.join(OUT, '시안_A6시트.png'))

// ── 칼선 안내 (인쇄소 확인용) ───────────────────────────────
const R = Math.round(Math.min(CELL_W, CELL_H) * 0.22)
const guides = cutRects
  .map(
    (r) =>
      `<rect x="${r.left}" y="${r.top}" width="${CELL_W}" height="${CELL_H}" rx="${R}"
             fill="none" stroke="#FF00FF" stroke-width="6" stroke-dasharray="24 16"/>`
  )
  .join('')

await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <rect x="${BLEED}" y="${BLEED}" width="${TRIM_W}" height="${TRIM_H}"
          fill="none" stroke="#00A3FF" stroke-width="6"/>
    ${guides}
    <text x="${W / 2}" y="${H - 20}" text-anchor="middle" font-family="${FONT}"
          font-size="34" fill="#666">파랑 = 재단선(A6) · 분홍 점선 = 칼선(도무송)</text>
  </svg>`)
)
  .png()
  .toFile(path.join(OUT, '칼선안내_A6시트.png'))

// ── 낱개 스티커 (투명 배경) ─────────────────────────────────
const ONE = mm(45)
for (const c of CHARACTERS) {
  const img = await sticker(c, ONE, Math.round(ONE * 1.15))
  await sharp(img).png().toFile(path.join(OUT, '낱개', `${c.id}.png`))
}

// ── 사양서 ─────────────────────────────────────────────────
const spec = `팝꾸즈 스티커 인쇄 사양서
${'='.repeat(48)}

[ 발주 시 그대로 전달하세요 ]

제품          도무송 스티커 (칼선 스티커) / 낱장 떼어 쓰는 형태
용지          아트지 유광코팅 (또는 모조지) — 인쇄소 기본 사양이면 충분
규격          A6 (105 x 148 mm) 시트
도련(재단여백) 3 mm 포함되어 있음 (파일 실제 크기 111 x 154 mm)
해상도        300 dpi
색상          RGB 파일입니다. 인쇄소에서 CMYK 변환 요청
              (초록/노랑이 약간 탁해질 수 있으니 "선명하게" 요청)
시트당 구성    6종 (캐릭터 5 + 시작박스 로고 1)
수량          150 시트  ← 조정 가능

[ 넘길 파일 ]
  시안_A6시트.png        ← 이 파일이 인쇄 원본입니다
  칼선안내_A6시트.png     ← 칼선 위치 확인용 (참고용, 인쇄 안 함)

[ 인쇄소에 꼭 확인할 것 ]
  1. 칼선(도무송)을 각 스티커 모양대로 따 줄 수 있는지
     → 어려우면 "사각 모서리 둥근 칼선"으로 해도 괜찮습니다
  2. 납기 — 3~5 영업일이 보통입니다. 행사가 9/30이므로
     늦어도 9/24까지는 발주해야 안전합니다
  3. 소량(150장) 가능 여부

[ 참고 업체 ]
  레드프린팅, 오프린트미, 성원애드피아 등에서
  "도무송 스티커" 또는 "칼선 스티커"로 검색

[ 예상 단가 ]
  A6 6종 시트 150장 기준 약 4~7만원 (업체·용지에 따라 다름)
`
await writeFile(path.join(OUT, '인쇄사양.txt'), spec, 'utf8')

console.log(`
  ✓ ${OUT}/시안_A6시트.png        ${W} x ${H} px (A6 + 도련 3mm)
  ✓ ${OUT}/칼선안내_A6시트.png     칼선 확인용
  ✓ ${OUT}/낱개/*.png             낱장 5종
  ✓ ${OUT}/인쇄사양.txt           발주용 사양서
`)
