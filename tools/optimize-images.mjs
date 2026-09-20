/**
 * 캐릭터 원본 PNG → 웹용 이미지 변환
 *
 *   assets-src/chokku01.png  (1.7MB, 1402×1122)
 *        ↓
 *   public/characters/chokku.webp  (~40KB, 폭 480)
 *
 * 왜 필요한가: 원본 5장이면 8MB가 넘습니다. 전시장 와이파이에서
 * 8MB를 받는 동안 관람객은 이미 부스를 떠납니다.
 *
 * 사용법:  npm run images
 * 파일명 규칙: <캐릭터id>숫자.png  (예: chokku01.png, kkumkku01.png)
 *              진화형은 <캐릭터id>-evo.png
 */
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { removeChecker } from './dechecker.mjs'

const SRC = 'assets-src'
const OUT = 'public/characters'
const WIDTH = 480 // 도감 카드 최대 표시 폭의 약 2배 (레티나 대응)

const VALID = ['chokku', 'ppakku', 'nokku', 'heenkku', 'kkumkku']

/**
 * 파일명 → 캐릭터 키
 *   chokku01.png    → chokku       (기본형)
 *   chokku02.png    → chokku-evo   (진화형)
 *   chokku-evo.png  → chokku-evo   (명시적)
 * 번호를 안 붙이면 기본형으로 봅니다.
 */
function idFromFilename(file) {
  const base = path.basename(file, path.extname(file))
  if (base.endsWith('-evo')) {
    const id = base.slice(0, -4)
    return { id, key: `${id}-evo`, evo: true }
  }
  const m = base.match(/^(.*?)(\d+)$/)
  const id = m ? m[1] : base
  const evo = m ? Number(m[2]) >= 2 : false
  return { id, key: evo ? `${id}-evo` : id, evo }
}

const all = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()
if (!all.length) {
  console.log(`\n  ${SRC}/ 에 이미지가 없습니다.\n`)
  process.exit(0)
}

// 같은 캐릭터가 여러 장이면 파일명 순서상 첫 번째(보통 01)만 씁니다.
// 그래야 실행할 때마다 결과가 바뀌지 않습니다.
const picked = new Map()
const extras = []
for (const f of all) {
  const { key } = idFromFilename(f)
  if (picked.has(key)) extras.push(f)
  else picked.set(key, f)
}
const files = [...picked.values()]

await mkdir(OUT, { recursive: true })

let done = 0
let dechecked = 0
const unknown = []

for (const file of files) {
  const { id, key } = idFromFilename(file)
  if (!VALID.includes(id)) {
    unknown.push(file)
    continue
  }

  const from = path.join(SRC, file)
  const to = path.join(OUT, `${key}.webp`)

  // 원본에 alpha가 없고 체크무늬가 그려져 있으면 진짜 투명으로 바꿉니다.
  const raw = await sharp(from).raw().toBuffer({ resolveWithObject: true })
  const { rgba, changed } = removeChecker(raw)

  await sharp(rgba, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .trim({ threshold: 1 }) // 투명 여백 제거 — 캐릭터가 카드에 꽉 차게
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6, alphaQuality: 100 })
    .toFile(to)

  const before = (await stat(from)).size
  const after = (await stat(to)).size
  console.log(
    `  ✓ ${file.padEnd(18)} → ${key}.webp`.padEnd(44) +
      `${kb(before)} → ${kb(after)}` +
      (changed ? '  배경제거✓' : '  (배경 그대로)')
  )
  if (changed) dechecked++
  done++
}

console.log(`\n  ${done}개 변환 완료 → ${OUT}/`)

if (extras.length) {
  console.log(`\n  ℹ 같은 캐릭터의 예비 컷이라 사용하지 않음: ${extras.join(', ')}`)
  console.log(`    이 컷을 쓰려면 파일명을 01번으로 바꾸세요.`)
}

if (unknown.length) {
  console.log(`\n  ⚠ 이름을 알 수 없어 건너뜀: ${unknown.join(', ')}`)
  console.log(`    파일명을 다음 중 하나로 시작하게 해주세요: ${VALID.join(', ')}`)
}

const wanted = [...VALID, ...VALID.map((id) => `${id}-evo`)]
const missing = wanted.filter((key) => !picked.has(key))
if (missing.length) {
  console.log(`\n  ⏳ 아직 없는 컷: ${missing.join(', ')}`)
  console.log(`    진화형이 없으면 기본 컷에 오라를 입혀 표시합니다.`)
}
console.log()

function kb(n) {
  return `${(n / 1024).toFixed(0)}KB`.padStart(7)
}
