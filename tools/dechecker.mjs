/**
 * "투명 배경처럼 보이는 체크무늬"를 실제 투명도로 바꿉니다.
 *
 * 받은 원본 PNG는 alpha 채널이 없고(hasAlpha: false) 회색 체크무늬가
 * 픽셀로 그려져 있습니다 — 투명 배경 미리보기를 그대로 내보낸 파일입니다.
 * 그대로 쓰면 캐릭터 뒤에 회색 격자가 따라다닙니다.
 *
 * 처리 방법
 *   1. 테두리에서 체크무늬의 밝은색/어두운색과 칸 크기를 알아냅니다.
 *   2. 각 좌표에서 "원래 체크무늬라면 이 색이어야 한다"를 계산합니다.
 *   3. 테두리부터 물채우기(flood fill)로 바깥 배경만 훑습니다.
 *        · 예상 색과 같으면        → 완전 투명
 *        · 예상보다 어두우면(그림자) → 그 비율만큼 반투명 검정
 *        · 그 외(캐릭터)            → 그대로 둠
 *
 * 물채우기를 쓰는 이유: 캐릭터 안쪽에 우연히 회색이 있어도 바깥과 이어져
 * 있지 않으면 건드리지 않습니다. 흰색 계열인 흰꾸가 지워지지 않습니다.
 */

const NEUTRAL_TOL = 18 // R,G,B 최대-최소 차이가 이 이하이면 무채색으로 봅니다
const MATCH_TOL = 16 // 예상 체크무늬 색과 이만큼 차이나면 같은 색으로 봅니다
const SHADOW_FLOOR = 0.3 // 예상 색의 30%보다 어두우면 배경이 아니라 물체로 봅니다

/**
 * @param {{data: Buffer, info: {width:number,height:number,channels:number}}} raw
 * @returns {{data: Buffer, info: object, changed: boolean}} RGBA 버퍼
 */
export function removeChecker(raw) {
  const { data, info } = raw
  const { width: W, height: H, channels: CH } = info
  const at = (x, y) => (y * W + x) * CH

  const detected = detectChecker(data, info)
  if (!detected) {
    return { rgba: toRGBA(data, info), changed: false }
  }
  const { light, dark, cell } = detected

  const lumAt = (x, y) => {
    const i = at(x, y)
    return (data[i] + data[i + 1] + data[i + 2]) / 3
  }

  /**
   * "이 자리가 정말 격자인가"를 봅니다.
   *
   * 밝기만 보면 흰색 캐릭터(흰꾸)의 면이 격자의 밝은 칸과 구분되지 않아
   * 몸통이 깎여나갑니다. 격자는 한 칸 옆이 반드시 반대 색이라는 성질이
   * 있으므로, 상하좌우로 한 칸씩 떨어진 곳과 밝기가 크게 달라지는지를
   * 함께 확인합니다. 평평한 흰 면은 이 조건을 통과하지 못합니다.
   */
  const CONTRAST = (light - dark) * 0.35
  const looksCheckered = (x, y, lum) => {
    if (x + cell < W && Math.abs(lumAt(x + cell, y) - lum) >= CONTRAST) return true
    if (x - cell >= 0 && Math.abs(lumAt(x - cell, y) - lum) >= CONTRAST) return true
    if (y + cell < H && Math.abs(lumAt(x, y + cell) - lum) >= CONTRAST) return true
    if (y - cell >= 0 && Math.abs(lumAt(x, y - cell) - lum) >= CONTRAST) return true
    return false
  }

  const isCheckerTone = (lum) =>
    Math.abs(lum - light) <= MATCH_TOL || Math.abs(lum - dark) <= MATCH_TOL

  // 체크무늬 위에 드리운 그림자: 어두운 칸보다도 어둡지만 외곽선만큼
  // 검지는 않은 구간. 그 비율만큼 반투명하게 남깁니다.
  const shadowFloor = dark * SHADOW_FLOOR

  const rgba = toRGBA(data, info)
  const visited = new Uint8Array(W * H)
  const queue = []

  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const idx = y * W + x
    if (visited[idx]) return
    visited[idx] = 1

    const i = at(x, y)
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // 무채색이 아니면 캐릭터입니다 — 여기서 멈춥니다.
    if (Math.max(r, g, b) - Math.min(r, g, b) > NEUTRAL_TOL) return

    const lum = (r + g + b) / 3
    if (lum > light + MATCH_TOL) return // 체크무늬보다 밝음 → 캐릭터
    if (lum < shadowFloor) return // 너무 어두움 → 캐릭터 외곽선

    // 밝은 칸과 같은 밝기인데 주변이 전부 같은 밝기라면 격자가 아니라
    // 흰색 캐릭터의 평평한 면입니다. 이 경우에만 패턴을 확인합니다.
    const nearLight = Math.abs(lum - light) <= MATCH_TOL
    if (nearLight && !looksCheckered(x, y, lum)) return

    const o = (y * W + x) * 4
    rgba[o] = 0
    rgba[o + 1] = 0
    rgba[o + 2] = 0
    rgba[o + 3] = isCheckerTone(lum)
      ? 0 // 순수 배경
      : Math.round(Math.min(1, Math.max(0, 1 - lum / dark)) * 255 * 0.5) // 그림자

    queue.push(x, y)
  }

  for (let x = 0; x < W; x++) {
    consider(x, 0)
    consider(x, H - 1)
  }
  for (let y = 0; y < H; y++) {
    consider(0, y)
    consider(W - 1, y)
  }

  while (queue.length) {
    const y = queue.pop()
    const x = queue.pop()
    consider(x + 1, y)
    consider(x - 1, y)
    consider(x, y + 1)
    consider(x, y - 1)
  }

  return { rgba, changed: true, info: { width: W, height: H, channels: 4 } }
}

function toRGBA(data, info) {
  const { width: W, height: H, channels: CH } = info
  if (CH === 4) return Buffer.from(data)
  const out = Buffer.alloc(W * H * 4)
  for (let p = 0; p < W * H; p++) {
    out[p * 4] = data[p * CH]
    out[p * 4 + 1] = data[p * CH + 1]
    out[p * 4 + 2] = data[p * CH + 2]
    out[p * 4 + 3] = 255
  }
  return out
}

/** 위쪽 두 줄을 훑어 체크무늬의 두 색과 칸 크기를 알아냅니다. */
function detectChecker(data, info) {
  const { width: W, channels: CH } = info
  const row = []
  const y = 1
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * CH
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (Math.max(r, g, b) - Math.min(r, g, b) > NEUTRAL_TOL) return null // 무채색 배경이 아님
    row.push((r + g + b) / 3)
  }

  const lo = Math.min(...row)
  const hi = Math.max(...row)
  if (hi - lo < 25) return null // 단색 배경 — 체크무늬가 아님

  const mid = (lo + hi) / 2
  // 색이 바뀌는 지점들 사이 간격의 최빈값이 칸 크기입니다.
  const edges = []
  for (let x = 1; x < row.length; x++) {
    if (row[x - 1] < mid !== row[x] < mid) edges.push(x)
  }
  if (edges.length < 3) return null

  const gaps = {}
  for (let i = 1; i < edges.length; i++) {
    const g = edges[i] - edges[i - 1]
    gaps[g] = (gaps[g] || 0) + 1
  }
  const cell = Number(Object.entries(gaps).sort((a, b) => b[1] - a[1])[0][0])
  if (!cell || cell < 3 || cell > 64) return null

  // 첫 경계에서 격자 위상을 잡습니다.
  const phase = { x: edges[0] % cell, y: edges[0] % cell }
  // 위상에 맞춰 (0,0) 칸이 밝은색인지 확인하고 필요하면 뒤집습니다.
  const firstIsLight = row[Math.max(0, edges[0] - Math.floor(cell / 2))] >= mid
  const light = hi
  const dark = lo
  if (!firstIsLight) phase.x += cell

  return { light, dark, cell, phase }
}
