/**
 * 앱 안에서 QR을 읽는 스캐너.
 *
 * 카메라 앱을 5번 열었다 닫았다 하지 않도록, 카메라를 한 번만 켜고
 * 화면에 띄운 채로 계속 QR을 찾습니다.
 *
 * 인식 방법은 두 가지를 준비합니다.
 *   1. BarcodeDetector — 브라우저 내장. 빠르고 배터리를 덜 먹습니다.
 *                        (안드로이드 크롬 지원, iOS 사파리 미지원)
 *   2. jsQR — 자바스크립트 구현. 어디서나 되지만 조금 느립니다.
 * 1번이 있으면 1번, 없으면 2번으로 자동 전환합니다.
 */
import jsQR from 'jsqr'

/** 후면 카메라를 켭니다. 실패 이유를 사람이 읽을 수 있는 문장으로 돌려줍니다. */
export async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: '이 브라우저는 카메라를 지원하지 않아요' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // 후면 카메라
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
    return { stream, error: null }
  } catch (e) {
    const name = e?.name || ''
    if (name === 'NotAllowedError')
      return { stream: null, error: '카메라 사용을 허용해 주세요' }
    if (name === 'NotFoundError')
      return { stream: null, error: '카메라를 찾을 수 없어요' }
    // 카카오톡 등 앱 내 브라우저에서 자주 나오는 경우
    return { stream: null, error: '이 브라우저에서는 카메라를 열 수 없어요' }
  }
}

export function stopCamera(stream) {
  try {
    stream?.getTracks().forEach((t) => t.stop())
  } catch {
    /* 이미 정리됨 */
  }
}

/** 브라우저 내장 인식기를 쓸 수 있으면 만들어 둡니다. */
async function makeNativeDetector() {
  try {
    if (!('BarcodeDetector' in window)) return null
    const formats = await window.BarcodeDetector.getSupportedFormats()
    if (!formats.includes('qr_code')) return null
    return new window.BarcodeDetector({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

/**
 * 카메라 영상에서 QR을 계속 찾습니다.
 *
 * @param {HTMLVideoElement} video
 * @param {(text: string) => void} onFound  QR 문자열을 찾을 때마다 호출
 * @returns {() => void} 중지 함수
 */
export function scanLoop(video, onFound) {
  let stopped = false
  let raf = 0
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let native = null
  let last = 0

  // 초당 8회면 충분합니다. 매 프레임 돌리면 폰이 뜨거워지고 배터리가 빨리 닳습니다.
  const INTERVAL = 125
  // 긴 변을 이 크기로 줄여서 인식합니다. 원본 해상도로 돌리면 느립니다.
  const MAX = 480

  makeNativeDetector().then((d) => {
    native = d
  })

  const tick = async (t) => {
    if (stopped) return
    raf = requestAnimationFrame(tick)
    if (t - last < INTERVAL) return
    last = t
    if (video.readyState < 2 || !video.videoWidth) return

    try {
      if (native) {
        const codes = await native.detect(video)
        if (codes?.length) onFound(codes[0].rawValue)
        return
      }

      const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight))
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) onFound(code.data)
    } catch {
      // 한 프레임 실패는 무시하고 다음 프레임으로 갑니다.
    }
  }

  raf = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
  }
}

/**
 * QR에서 읽은 문자열 → 캐릭터 id.
 *
 * 인쇄된 QR은 우리 주소(.../#/c/chokku?k=sb01)를 담고 있습니다.
 * 다른 QR(전시장 곳곳의 무관한 QR)은 무시해야 하므로 형식을 확인합니다.
 */
export function parseCatchUrl(text, characters) {
  try {
    const m = String(text).match(/#\/c\/([a-z]+)\?k=([A-Za-z0-9]+)/)
    if (!m) return null
    const c = characters.find((x) => x.id === m[1] && x.token === m[2])
    return c ? c.id : null
  } catch {
    return null
  }
}

/** 짧은 진동. 지원하지 않는 기기에서는 조용히 넘어갑니다. */
export function buzz(pattern = 60) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* noop */
  }
}
