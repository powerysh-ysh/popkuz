/**
 * 바닥에 고정되는 AR — 폰 OS의 내장 뷰어를 띄웁니다.
 *
 * 우리가 공간 인식(SLAM)을 구현하지 않습니다. iOS는 AR Quick Look,
 * 안드로이드는 Scene Viewer가 바닥을 찾아주고, 사용자는 캐릭터 주위를
 * 걸어다니며 볼 수 있습니다. 라이브러리도 필요 없습니다 —
 * iOS는 <a rel="ar">, 안드로이드는 intent:// 한 줄이면 됩니다.
 *
 * 이 기능은 어디까지나 보너스입니다. 안 되는 기기에서는 조용히
 * 버튼을 감추고, 게임 본류(탐지기·도감·완주)에는 영향을 주지 않습니다.
 */

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '')

export function isIOS() {
  const s = ua()
  // iPadOS 13+ 는 데스크톱 사파리로 위장하므로 터치 여부로 함께 판별합니다.
  return /iPad|iPhone|iPod/.test(s) || (/Macintosh/.test(s) && navigator.maxTouchPoints > 1)
}

export function isAndroid() {
  return /Android/.test(ua())
}

/** AR 버튼을 보여줄 수 있는 기기인지. */
export function arSupported() {
  return isIOS() || isAndroid()
}

function absolute(url) {
  return new URL(url, window.location.href).href
}

/**
 * 캐릭터를 실제 공간에 세웁니다.
 * @returns {boolean} 띄우기를 시도했으면 true
 */
export function launchAR(character) {
  const base = import.meta.env.BASE_URL
  const glb = absolute(`${base}ar/${character.id}.glb`)
  const usdz = absolute(`${base}ar/${character.id}.usdz`)

  if (isIOS()) {
    // 사파리는 rel="ar" 링크 안에 이미지가 들어 있어야 AR Quick Look을 엽니다.
    const a = document.createElement('a')
    a.setAttribute('rel', 'ar')
    a.href = usdz
    const img = document.createElement('img')
    img.src = `${base}characters/${character.id}.webp`
    img.style.display = 'none'
    a.appendChild(img)
    document.body.appendChild(a)
    a.click()
    setTimeout(() => a.remove(), 1000)
    return true
  }

  if (isAndroid()) {
    const fallback = absolute(`${base}#/dex`)
    const url =
      `intent://arvr.google.com/scene-viewer/1.0` +
      `?file=${encodeURIComponent(glb)}` +
      `&mode=ar_preferred` +
      `&title=${encodeURIComponent(character.name)}` +
      `#Intent;scheme=https;package=com.google.ar.core;` +
      `action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(fallback)};end;`
    window.location.href = url
    return true
  }

  return false
}
