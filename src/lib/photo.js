/**
 * 캐릭터와 함께 사진 찍기.
 *
 * 카메라 영상 한 프레임을 캔버스에 옮기고 그 위에 캐릭터와 장식을 그립니다.
 * 세로 3:4로 잘라 내보냅니다 — 인스타그램·카카오톡에 올리기 좋은 비율이고,
 * 가로로 찍힌 사진이 피드에서 작게 보이는 것을 막습니다.
 */

const OUT_W = 1080
const OUT_H = 1440 // 3:4

const imgCache = new Map()

function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src)
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
  imgCache.set(src, p)
  return p
}

/**
 * @param {HTMLVideoElement} video 재생 중인 카메라 영상
 * @param {object} character
 * @returns {Promise<Blob|null>}
 */
export async function takePhoto(video, character) {
  if (!video?.videoWidth) return null

  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d')

  // 1) 카메라 프레임을 3:4에 꽉 차게 (가운데 기준으로 잘라냄)
  const vw = video.videoWidth
  const vh = video.videoHeight
  const scale = Math.max(OUT_W / vw, OUT_H / vh)
  const dw = vw * scale
  const dh = vh * scale
  ctx.drawImage(video, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh)

  // 2) 아래쪽을 살짝 어둡게 — 글자가 어떤 배경에서도 읽히도록
  const grad = ctx.createLinearGradient(0, OUT_H * 0.55, 0, OUT_H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = grad
  ctx.fillRect(0, OUT_H * 0.55, OUT_W, OUT_H * 0.45)

  // 3) 캐릭터 — 아래쪽 가운데에 큼직하게
  try {
    const base = import.meta.env.BASE_URL
    const img = await loadImage(`${base}characters/${character.id}.webp`)
    const targetH = OUT_H * 0.42
    const ratio = img.width / img.height
    const cw = targetH * ratio
    const ch = targetH
    const cx = (OUT_W - cw) / 2
    const cy = OUT_H * 0.94 - ch

    // 바닥 그림자 — 붕 뜬 느낌을 없앱니다
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(OUT_W / 2, cy + ch - 6, cw * 0.36, ch * 0.055, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.drawImage(img, cx, cy, cw, ch)
  } catch {
    // 캐릭터 그림을 못 불러와도 사진 자체는 남깁니다
  }

  // 4) 캐릭터 이름
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 10
  ctx.font = 'bold 86px Jua, "Malgun Gothic", sans-serif'
  ctx.strokeText(character.name, OUT_W / 2, OUT_H * 0.44)
  ctx.fillText(character.name, OUT_W / 2, OUT_H * 0.44)

  ctx.font = '34px Jua, "Malgun Gothic", sans-serif'
  ctx.lineWidth = 7
  ctx.strokeText(character.en, OUT_W / 2, OUT_H * 0.44 + 52)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(character.en, OUT_W / 2, OUT_H * 0.44 + 52)

  // 5) 하단 워터마크 — 사진이 퍼질 때 따라다니는 홍보
  ctx.font = '38px Jua, "Malgun Gothic", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 6
  const tag = '시작박스 · 팝꾸즈를 찾아라'
  ctx.strokeText(tag, OUT_W / 2, OUT_H - 52)
  ctx.fillText(tag, OUT_W / 2, OUT_H - 52)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

function filename(character) {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `popkuz_${character.id}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`
}

/**
 * 공유 또는 저장.
 * 폰에서는 공유 시트(인스타·카톡)를 띄우고, 안 되면 다운로드로 넘어갑니다.
 * @returns {'shared'|'saved'|'failed'}
 */
export async function sharePhoto(blob, character) {
  const name = filename(character)
  const file = new File([blob], name, { type: 'image/jpeg' })

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${character.name} | 팝꾸즈를 찾아라`,
        text: `시작박스 부스에서 ${character.name}를 만났어요! #시작박스 #팝꾸즈`,
      })
      return 'shared'
    }
  } catch (e) {
    // 사용자가 공유창을 닫은 경우 — 실패로 보지 않습니다
    if (e?.name === 'AbortError') return 'shared'
  }

  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'saved'
  } catch {
    return 'failed'
  }
}
