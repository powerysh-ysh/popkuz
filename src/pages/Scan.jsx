import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CHARACTERS, TOTAL, findCharacter } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { buzz, parseCatchUrl, scanLoop, startCamera, stopCamera } from '../lib/scanner'
import { sharePhoto, takePhoto } from '../lib/photo'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

/**
 * 팝꾸즈 탐지기 — 앱 안에서 카메라를 켜고 QR을 찾습니다.
 *
 * 카메라 앱을 5번 여닫지 않고, 한 번 켠 채로 부스를 돌며 5마리를 잡습니다.
 * 카메라를 쓸 수 없는 환경(카카오톡 내부 브라우저 등)에서는 안내를 띄우고
 * 기존 방식(폰 카메라 앱으로 QR 촬영)으로 유도합니다 — 두 경로 모두
 * 같은 결과로 이어지므로 게임이 멈추지 않습니다.
 */
export default function Scan() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const stopScanRef = useRef(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { capture, count, has } = useHunt()

  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  // 발견한 캐릭터를 화면에 띄운 상태. { character, isNew }
  const [found, setFound] = useState(null)
  const foundRef = useRef(null)
  // 찍은 사진 { url, blob, character }
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const handleFound = useCallback(
    (text) => {
      if (foundRef.current) return // 이미 한 마리를 띄워둔 상태
      const id = parseCatchUrl(text, CHARACTERS)
      if (!id) return // 우리 QR이 아님 — 무시
      const character = findCharacter(id)
      const already = has(id)
      foundRef.current = character
      buzz(already ? 30 : [40, 60, 80])
      setFound({ character, isNew: !already })
    },
    [has]
  )

  // 시연·점검용: #/scan?demo=chokku 로 열면 카메라 없이 발견 연출을 볼 수 있습니다.
  // (회의에서 보여줄 때, 그리고 카메라가 없는 환경에서 화면을 확인할 때 씁니다.)
  const demo = params.get('demo')
  const demoShown = useRef(false)
  useEffect(() => {
    if (!demo || demoShown.current) return
    const c = findCharacter(demo)
    if (!c) return
    demoShown.current = true // 잡은 뒤 다시 튀어나오지 않게 한 번만
    foundRef.current = c
    setFound({ character: c, isNew: !has(c.id) })
  }, [demo, has])

  useEffect(() => {
    let cancelled = false
    if (demo) return () => {}
    ;(async () => {
      const { stream, error: err } = await startCamera()
      if (cancelled) {
        stopCamera(stream)
        return
      }
      if (err) {
        setError(err)
        return
      }
      streamRef.current = stream
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      try {
        await v.play()
      } catch {
        /* 자동재생 차단 — playsInline 속성으로 대부분 해결됩니다 */
      }
      setReady(true)
      stopScanRef.current = scanLoop(v, handleFound)
    })()

    return () => {
      cancelled = true
      stopScanRef.current?.()
      stopCamera(streamRef.current)
    }
  }, [handleFound, demo])

  /** 화면의 캐릭터를 탭해서 잡습니다. */
  function grab() {
    const c = foundRef.current
    if (!c) return
    const { state } = capture(c.id)
    buzz([50, 40, 120])
    const done = state.caught.length >= TOTAL
    foundRef.current = null
    setFound(null)
    if (done) navigate('/done')
  }

  function dismiss() {
    foundRef.current = null
    setFound(null)
  }

  /** 카메라 화면에 캐릭터를 얹어 한 장 찍습니다. */
  async function shoot() {
    const c = foundRef.current
    if (!c || busy) return
    setBusy(true)
    buzz(35)
    try {
      const blob = await takePhoto(videoRef.current, c)
      if (blob) setPhoto({ url: URL.createObjectURL(blob), blob, character: c })
    } finally {
      setBusy(false)
    }
  }

  async function savePhoto() {
    if (!photo || busy) return
    setBusy(true)
    const r = await sharePhoto(photo.blob, photo.character)
    setBusy(false)
    if (r === 'saved') setToast('사진을 저장했어요')
    else if (r === 'failed') setToast('저장에 실패했어요')
    if (r !== 'shared') setTimeout(() => setToast(''), 2400)
  }

  function closePhoto() {
    if (photo?.url) URL.revokeObjectURL(photo.url)
    setPhoto(null)
  }

  if (error) {
    return (
      <div className="shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span>시작박스</span> 탐지기
          </Link>
        </header>
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>📷 {error}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            괜찮아요! <strong>휴대폰 기본 카메라 앱</strong>으로 부스의 QR을 찍어도
            똑같이 잡을 수 있습니다.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-3)', marginBottom: 0 }}>
            카카오톡·인스타그램 안에서 열면 카메라가 막힐 수 있어요. 오른쪽 위
            메뉴에서 <strong>다른 브라우저로 열기</strong>를 눌러보세요.
          </p>
        </div>
        <div className="stack">
          <Link className="btn btn-primary" to="/dex">
            도감 보기
          </Link>
          <Link className="btn btn-ghost" to="/">
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="scan">
      <video ref={videoRef} className="scan-video" playsInline muted autoPlay />
      <div className="scan-dim" />

      {/* 조준 프레임 */}
      {!found && (
        <div className="scan-frame">
          <span className="c tl" />
          <span className="c tr" />
          <span className="c bl" />
          <span className="c br" />
          <span className="scan-line" />
        </div>
      )}

      {/* 상단 HUD */}
      <div className="scan-top">
        <Link to="/" className="scan-x" aria-label="닫기">
          ✕
        </Link>
        <div className="scan-progress">
          <Progress count={count} total={TOTAL} />
        </div>
      </div>

      {/* 하단 안내 */}
      {!found && (
        <div className="scan-hint">
          <span className="radar" />
          {ready ? '팝꾸즈를 찾는 중… 부스의 QR을 비춰보세요' : '카메라를 켜는 중…'}
        </div>
      )}

      {/* 찍은 사진 */}
      {photo && (
        <div className="photo-view">
          <img src={photo.url} alt="찍은 사진" className="photo-img" />
          <div className="photo-actions">
            <button className="btn btn-primary" onClick={savePhoto} disabled={busy}>
              저장 · 공유하기
            </button>
            <button className="btn btn-ghost" onClick={closePhoto}>
              다시 찍기
            </button>
          </div>
        </div>
      )}

      {toast && <div className="scan-toast">{toast}</div>}

      {/* 발견! */}
      {found && (
        <div className="scan-found">
          <p
            className="scan-found-kicker"
            style={{ color: found.isNew ? '#FFE066' : '#CED4DA' }}
          >
            {found.isNew ? '✨ 팝꾸즈 발견!' : '👋 이미 만난 친구'}
          </p>

          <button className="scan-target" onClick={grab} aria-label={`${found.character.name} 잡기`}>
            <span className="ring" style={{ borderColor: found.character.color }} />
            <span className="ring r2" style={{ borderColor: found.character.color }} />
            <Popkku character={found.character} size={240} className="bob" />
          </button>

          <p className="scan-found-name">{found.character.name}</p>

          <div className="scan-actions">
            {found.isNew ? (
              <button className="btn btn-primary" onClick={grab}>
                탭해서 잡기!
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={dismiss}>
                계속 찾기
              </button>
            )}
            <button className="btn btn-photo" onClick={shoot} disabled={busy}>
              📸 같이 사진 찍기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
