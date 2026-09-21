import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CHARACTERS, TOTAL, findCharacter } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { buzz, parseCatchUrl, scanLoop, startCamera, stopCamera } from '../lib/scanner'
import BallThrow from '../components/BallThrow'
import { elapsed, formatTime, getMission, markMission } from '../lib/mission'
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
  const [toast, setToast] = useState('')
  // 공 던지기 판정을 위해 캐릭터 위치를 참조합니다.
  const targetRef = useRef(null)
  const [caught, setCaught] = useState(false)
  // 인식 상태 — 무엇이 안 되는지 화면에서 바로 보이게 합니다.
  const [stat, setStat] = useState(null)
  const otherQrAt = useRef(0)
  // 미션 모드가 켜져 있으면 목표와 경과 시간을 위에 띄웁니다.
  const [mission, setMission] = useState(() => getMission())
  const [, tickTime] = useState(0)
  // 아직 못 만난 캐릭터의 위치 힌트를 돌아가며 보여줍니다.
  // QR을 찾는 동안 화면이 비어 있으면 금방 지루해집니다.
  const [hintIndex, setHintIndex] = useState(0)

  const handleFound = useCallback(
    (text) => {
      if (foundRef.current) return // 이미 한 마리를 띄워둔 상태
      const id = parseCatchUrl(text, CHARACTERS)
      if (!id) {
        // QR은 읽혔는데 우리 것이 아닙니다. 조용히 무시하면 "왜 안 되지?"가
        // 되므로, 읽히고 있다는 사실만 짧게 알려줍니다.
        const now = Date.now()
        if (now - otherQrAt.current > 2500) {
          otherQrAt.current = now
          setToast('다른 QR이에요 — 팝꾸즈 카드를 비춰주세요')
          setTimeout(() => setToast(''), 2200)
        }
        return
      }
      const character = findCharacter(id)
      const already = has(id)
      foundRef.current = character
      buzz(already ? 30 : [40, 60, 80])
      setFound({ character, isNew: !already })
    },
    [has]
  )

  useEffect(() => {
    if (!mission || mission.doneAt) return
    const t = setInterval(() => tickTime((n) => n + 1), 200)
    return () => clearInterval(t)
  }, [mission])

  useEffect(() => {
    const t = setInterval(() => setHintIndex((n) => n + 1), 3200)
    return () => clearInterval(t)
  }, [])

  // 시연·점검용: #/scan?demo=chokku 로 열면 카메라 없이 발견 연출을 볼 수 있습니다.
  // (회의에서 보여줄 때, 그리고 카메라가 없는 환경에서 화면을 확인할 때 씁니다.)
  const debug = params.get('debug') === '1'
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
      stopScanRef.current = scanLoop(v, handleFound, setStat)
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

    // 미션 중이면 목표 달성 여부를 함께 확인합니다.
    const m = getMission()
    if (m && !m.doneAt) {
      const r = markMission(c.id)
      setMission(r.mission)
      foundRef.current = null
      setFound(null)
      if (r.done) {
        navigate('/mission')
        return
      }
      if (!r.hit) {
        setToast('이번 미션 대상은 아니에요 (도감에는 담았어요)')
        setTimeout(() => setToast(''), 2400)
      }
      return
    }

    const done = state.caught.length >= TOTAL
    foundRef.current = null
    setFound(null)
    if (done) navigate('/done')
  }

  function dismiss() {
    foundRef.current = null
    setFound(null)
  }

  /** 공이 맞았을 때 — 잡기 연출 후 실제로 획득 처리 */
  function onBallHit() {
    if (caught) return
    setCaught(true)
    buzz([60, 40, 140])
    setTimeout(() => {
      setCaught(false)
      grab()
    }, 850)
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
          {mission && !mission.doneAt ? (
            <div className="scan-mission">
              <span className="scan-mission-time">{formatTime(elapsed(mission))}</span>
              <span className="scan-mission-targets">
                {mission.targets.map((id) => {
                  const c = CHARACTERS.find((x) => x.id === id)
                  const got = mission.got.includes(id)
                  return (
                    <span key={id} className={got ? 'mt got' : 'mt'} style={{ color: c.color }}>
                      {got ? '✓' : '·'} {c.name}
                    </span>
                  )
                })}
              </span>
            </div>
          ) : (
            <Progress count={count} total={TOTAL} />
          )}
        </div>
      </div>

      {/* 하단 안내 */}
      {!found && (
        <div className="scan-hint">
          <span className="radar" />
          {!ready ? (
            '카메라를 켜는 중…'
          ) : (
            (() => {
              // 미션 중이면 미션 목표를, 아니면 아직 못 만난 캐릭터를 안내합니다.
              const pool =
                mission && !mission.doneAt
                  ? mission.targets.filter((id) => !mission.got.includes(id))
                  : CHARACTERS.filter((c) => !has(c.id)).map((c) => c.id)
              if (!pool.length) return '팝꾸즈를 찾는 중…'
              const c = CHARACTERS.find((x) => x.id === pool[hintIndex % pool.length])
              return (
                <span>
                  <strong style={{ color: c.color }}>{c.name}</strong>
                  {' '}
                  {c.spot} 쪽에 있어요
                  <br />
                  <span style={{ fontSize: 13, opacity: 0.8 }}>
                    남은 팝꾸즈 {pool.length}마리 · QR을 비춰보세요
                  </span>
                </span>
              )
            })()
          )}
        </div>
      )}

      {/* 인식 상태 — ?debug=1 을 붙이면 자세히 보입니다 */}
      {!found && stat && (
        <div className="scan-stat">
          {debug ? (
            <>
              엔진 {stat.engine} · 프레임 {stat.frames} · 인식 {stat.decodes}
              {stat.lastText ? <><br />읽음: {stat.lastText.slice(0, 60)}</> : null}
              {stat.lastError ? <><br />오류: {stat.lastError.slice(0, 60)}</> : null}
            </>
          ) : (
            <>
              {stat.decodes > 0
                ? `QR ${stat.decodes}개 읽음`
                : `탐지 중 ${stat.frames}`}
            </>
          )}
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

          <div className={`scan-target${caught ? ' caught' : ''}`} ref={targetRef}>
            <span className="ring" style={{ borderColor: found.character.color }} />
            <span className="ring r2" style={{ borderColor: found.character.color }} />
            {/* 그림자를 따로 두고 캐릭터와 반대로 움직여야 진짜로 뛰는 것처럼 보입니다 */}
            <span className="hop-shadow" />
            <Popkku character={found.character} size={240} className={caught ? 'wobble' : 'hop'} />
          </div>

          <p className="scan-found-name">{found.character.name}</p>

          {found.isNew ? (
            <BallThrow
              targetRef={targetRef}
              color={found.character.color}
              onHit={onBallHit}
              onGiveUp={grab}
            />
          ) : (
            <div className="scan-actions">
              <button className="btn btn-ghost" onClick={dismiss}>
                계속 찾기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
