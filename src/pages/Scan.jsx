import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CHARACTERS, TOTAL, findCharacter } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { buzz, parseCatchUrl, scanLoop, startCamera, stopCamera } from '../lib/scanner'
import BallThrow from '../components/BallThrow'
import { elapsed, formatTime, getMission, markMission } from '../lib/mission'
import { ESCAPE_MS, addWild, getWild, nextGap, pickWild } from '../lib/wild'
import { spotOf } from '../lib/spots'
import { modeConfig } from '../lib/mode'
import { useRoam } from '../lib/roam'
import { GAIN, addPieces, addRare, rareCount } from '../lib/pieces'
import { getQuest, progress } from '../lib/quest'
import { TELLS, fakeEn, rollFake } from '../lib/fake'
import { SIZES, rollVariant, variantName, variantNote, variantPieces } from '../lib/variant'
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
  // 공 던지기 판정은 **캐릭터 그림**에 걸어야 합니다. 바깥 상자(300px)에
  // 걸면 캐릭터를 아무리 줄여도 판정 범위가 그대로라 너무 잘 맞습니다.
  const targetRef = useRef(null) // 그림 — 명중 판정용
  const roamRef = useRef(null) // 바깥 상자 — 돌아다니기용 (파동 링까지 같이 움직임)
  const [caught, setCaught] = useState(false)
  // 발견한 팝꾸즈가 화면 안을 돌아다니게 합니다. 잡히면 멈춥니다.
  const { startle } = useRoam(roamRef, Boolean(found) && !caught)

  // 인식 상태 — 무엇이 안 되는지 화면에서 바로 보이게 합니다.
  const [stat, setStat] = useState(null)
  const otherQrAt = useRef(0)
  // 미션 모드가 켜져 있으면 목표와 경과 시간을 위에 띄웁니다.
  // 팝업스토어 모드에는 스피드 미션이 없습니다. 엑스포에서 하던 미션이
  // 남아 있어도 화면에 끌고 오지 않도록 여기서 걸러냅니다.
  const [mission, setMission] = useState(() => (modeConfig().hasMission ? getMission() : null))
  const [, tickTime] = useState(0)
  // 아직 못 만난 캐릭터의 위치 힌트를 돌아가며 보여줍니다.
  // QR을 찾는 동안 화면이 비어 있으면 금방 지루해집니다.
  const [hintIndex, setHintIndex] = useState(0)
  // 중간 미션(필드 리서치)과 진화 재료인 반짝조각
  const [quest, setQuest] = useState(() => getQuest())
  const [rare, setRare] = useState(() => rareCount())
  const [reward, setReward] = useState(null)

  // 야생 출현 — 도감과 분리된 재미 요소
  const [wildCount, setWildCount] = useState(() => getWild().count)
  const wildTimer = useRef(0)
  const escapeTimer = useRef(0)

  // 시연·점검용: #/scan?demo=chokku 로 열면 카메라 없이 발견 연출을 볼 수 있습니다.
  // (회의에서 보여줄 때, 그리고 카메라가 없는 환경에서 화면을 확인할 때 씁니다.)
  //
  // 이 두 줄은 반드시 아래 useEffect 들보다 **위에** 있어야 합니다.
  // 의존성 배열은 렌더 중에 평가되므로, 아래에 두면 선언 전에 읽히면서
  // 화면 전체가 죽습니다(TDZ).
  const debug = params.get('debug') === '1'
  const demo = params.get('demo')

  // 모드에 따라 야생 출현·스피드 미션을 끕니다.
  // 팝업스토어는 할인권이 걸린 게임이라 야생이 섞이면 안 됩니다.
  const cfg = modeConfig()

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
      clearTimeout(escapeTimer.current) // QR 쪽이 우선입니다
      buzz(already ? 30 : [40, 60, 80])
      setFound({ character, isNew: !already, wild: false })
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

  /**
   * 야생 출현 예약.
   * 미션 중에는 걸지 않습니다 — 기록 경쟁을 방해하면 안 됩니다.
   * 이미 무언가 떠 있으면 다음 기회로 미룹니다.
   */
  const scheduleWild = useCallback(() => {
    clearTimeout(wildTimer.current)
    wildTimer.current = setTimeout(() => {
      const m = getMission()
      if (m && !m.doneAt) return scheduleWild()
      if (foundRef.current) return scheduleWild()
      const c = pickWild(CHARACTERS)
      const fake = rollFake(c, getWild().count)
      foundRef.current = c
      // 반짝 개체는 조금 더 길게 울려서 "뭔가 다르다"를 손으로도 알립니다.
      const v = fake ? null : rollVariant()
      buzz(v?.shiny ? [30, 50, 30, 50, 30, 50, 80] : [25, 40, 25])
      setFound({
        character: c,
        isNew: true,
        wild: true,
        fake,
        variant: v,
      })
      // 일정 시간 안에 못 잡으면 도망갑니다 — 긴장감이 생깁니다.
      escapeTimer.current = setTimeout(() => {
        if (foundRef.current === c) {
          foundRef.current = null
          setFound(null)
          setToast('야생 팝꾸즈가 도망갔어요!')
          setTimeout(() => setToast(''), 2000)
        }
        scheduleWild()
      }, ESCAPE_MS)
    }, nextGap())
  }, [])

  useEffect(() => {
    if (demo || error || !cfg.hasWild) return
    scheduleWild()
    return () => {
      clearTimeout(wildTimer.current)
      clearTimeout(escapeTimer.current)
    }
  }, [demo, error, cfg.hasWild, scheduleWild])

  const demoShown = useRef(false)
  useEffect(() => {
    if (!demo || demoShown.current) return
    const c = findCharacter(demo)
    if (!c) return
    demoShown.current = true // 잡은 뒤 다시 튀어나오지 않게 한 번만

    // 야생·가품 연출도 미리 볼 수 있습니다. 야생은 무작위로 나오므로
    // 회의나 현장 설명에서 "가품이 이런 거예요"를 보여줄 방법이 필요합니다.
    //   #/scan?demo=chokku&wild=1            야생 진품
    //   #/scan?demo=chokku&wild=1&fake=1     야생 가품 (단서 무작위)
    //   #/scan?demo=chokku&wild=1&fake=mirror  단서 지정
    const wild = params.get('wild') === '1'
    const fakeArg = params.get('fake')
    const tell = fakeArg
      ? TELLS.find((t) => t.id === fakeArg) || TELLS[Math.floor(Math.random() * TELLS.length)]
      : null

    // 개체 변이도 지정해서 띄울 수 있습니다 (반짝은 확률 5% 라 기다릴 수 없음)
    //   &shiny=1   반짝 개체
    //   &evo=1     진화형 개체
    //   &size=xxl  꼬마(xxs) / 특대(xxl)
    const wantVariant =
      params.get('shiny') === '1' || params.get('evo') === '1' || params.get('size')
    const variant =
      wild && !tell && wantVariant
        ? {
            shiny: params.get('shiny') === '1',
            evo: params.get('evo') === '1',
            size: SIZES[params.get('size')] || SIZES.normal,
          }
        : null

    foundRef.current = c
    setFound({
      character: c,
      isNew: !has(c.id),
      wild,
      fake: wild && tell ? { tell, en: fakeEn(c.en) } : null,
      variant,
    })
  }, [demo, has, params])

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

  /**
   * 미션 진행을 한 칸 올립니다. 깨면 반짝조각을 주고 다음 미션이 붙습니다.
   * 보상 안내는 일반 토스트와 따로 띄웁니다 — 같은 자리에 쓰면 잡기 안내에
   * 덮여서 "뭐가 지나갔지?" 가 됩니다.
   */
  function bumpQuest(ev) {
    const r = progress(ev)
    setQuest(r.quest)
    if (!r.completed) return
    const s = addRare(r.completed.rare)
    setRare(s.rare)
    buzz([30, 40, 30, 40, 60])
    setReward(r.completed)
    setTimeout(() => setReward(null), 2800)
  }

  /** 화면의 캐릭터를 탭해서 잡습니다. */
  function grab() {
    const c = foundRef.current
    if (!c) return

    // 야생은 도감에 넣지 않습니다. 도감은 부스의 QR로만 채워집니다.
    if (found?.wild) {
      clearTimeout(escapeTimer.current)
      const fake = found.fake
      foundRef.current = null
      setFound(null)

      if (fake) {
        // 속았습니다. 조각도 없고 연속 기록도 끊깁니다.
        buzz([140, 60, 140])
        setToast(`앗, 가품이었어요! ${fake.tell.hint}`)
        setTimeout(() => setToast(''), 3000)
        bumpQuest('miss')
        scheduleWild()
        return
      }

      const w = addWild()
      setWildCount(w.count)
      const v = found.variant
      const gain = v ? variantPieces(v, GAIN.wild) : GAIN.wild
      addPieces(c.id, gain)
      buzz(v?.shiny ? [60, 40, 60, 40, 160] : [50, 40, 120])
      const who = v ? variantName(c, v) : c.name
      setToast(`포획! ${who} 조각 +${gain}`)
      setTimeout(() => setToast(''), 2600)
      bumpQuest('wild')
      scheduleWild()
      return
    }

    const { state, isNew } = capture(c.id)
    buzz([50, 40, 120])
    if (isNew) {
      addPieces(c.id, GAIN.qr)
      bumpQuest('new')
    }

    // 미션 중이면 목표 달성 여부를 함께 확인합니다.
    const m = cfg.hasMission ? getMission() : null
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

  /**
   * 「가짜다!」 — 던지기 전에 감별을 시도합니다.
   * 맞히면 잡는 것보다 큰 보상(반짝조각), 틀리면 놓칩니다.
   * 의심에도 대가가 있어야 아무 때나 누르지 않습니다.
   */
  function report() {
    const c = foundRef.current
    if (!c || !found?.wild) return
    clearTimeout(escapeTimer.current)
    const fake = found.fake
    foundRef.current = null
    setFound(null)

    if (fake) {
      const st = addRare(1)
      setRare(st.rare)
      buzz([40, 40, 40, 40, 120])
      setToast(`감별 성공! ${fake.tell.hint} · 반짝조각 +1`)
      setTimeout(() => setToast(''), 3000)
    } else {
      buzz([120, 80])
      setToast(`진짜였어요… ${c.name}이(가) 도망갔어요`)
      setTimeout(() => setToast(''), 2600)
      bumpQuest('miss')
    }
    scheduleWild()
  }

  /** 공이 맞았을 때 — 잡기 연출 후 실제로 획득 처리 */
  function onBallHit() {
    if (caught) return
    setCaught(true)
    buzz([60, 40, 140])
    bumpQuest('ball')
    setTimeout(() => {
      setCaught(false)
      grab()
    }, 850)
  }

  /** 공이 빗나갔을 때 — 캐릭터가 달아나고, 연속 명중 미션은 처음으로 */
  function onBallMiss() {
    startle()
    bumpQuest('miss')
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
        {wildCount > 0 && <span className="scan-wild">🌿 {wildCount}</span>}
        {rare > 0 && <span className="scan-rare">✦ {rare}</span>}
      </div>

      {/* 중간 미션 — 항상 하나가 걸려 있습니다 */}
      {!found && quest && (
        <div className="scan-quest">
          <span className="q-label">미션</span>
          <span className="q-text">{quest.text}</span>
          <span className="q-count">
            {quest.n}/{quest.goal}
          </span>
          <span className="q-bar">
            <i style={{ width: `${Math.min(100, (quest.n / quest.goal) * 100)}%` }} />
          </span>
        </div>
      )}

      {/* 미션 달성 — 잡기 안내와 겹치지 않도록 따로 띄웁니다 */}
      {reward && (
        <div className="scan-reward">
          <strong>미션 완료!</strong>
          <span>{reward.text}</span>
          <em>반짝조각 +{reward.rare}</em>
        </div>
      )}

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
                  {spotOf(c)} 쪽에 있어요
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
            style={{ color: found.wild ? '#8CE99A' : found.isNew ? '#FFE066' : '#CED4DA' }}
          >
            {found.wild
              ? '🌿 야생 출현! 잡을까, 의심할까?'
              : found.isNew
                ? '✨ 팝꾸즈 발견!'
                : '👋 이미 만난 친구'}
          </p>

          <div className={`scan-target${caught ? ' caught' : ''}`} ref={roamRef}>
            <span className="ring" style={{ borderColor: found.character.color }} />
            <span className="ring r2" style={{ borderColor: found.character.color }} />
            {/* 그림자를 따로 두고 캐릭터와 반대로 움직여야 진짜로 뛰는 것처럼 보입니다 */}
            <span className="hop-shadow" />
            {/* 가품은 여기에 단서가 걸립니다 (뒤집힘·색·크기).
                Popkku 를 건드리지 않고 겉에 씌워야 도감 등 다른 화면에
                영향이 가지 않습니다. */}
            <span
              ref={targetRef}
              className={`tell${found.variant?.shiny ? ' shiny' : ''}`}
              style={
                found.fake
                  ? found.fake.tell.style
                  : found.variant && found.variant.size.scale !== 1
                    ? { transform: `scale(${found.variant.size.scale})` }
                    : undefined
              }
            >
              <Popkku
                character={found.character}
                size={168}
                evolved={Boolean(found.variant?.evo)}
                className={caught ? 'wobble' : 'hop'}
              />
            </span>
          </div>

          <p className="scan-found-name">
            {found.variant ? variantName(found.character, found.variant) : found.character.name}
          </p>

          {found.wild && (
            <p className="scan-found-en">
              {found.fake ? found.fake.en : found.character.en}
            </p>
          )}

          {found.variant && variantNote(found.variant) && (
            <p className="scan-found-note">{variantNote(found.variant)}</p>
          )}

          {/* 이건 앱의 판정이 아니라 **내가 누르는 선택지**입니다.
              「가짜다!」 로 쓰면 앱이 가짜라고 알려주는 것처럼 읽힙니다. */}
          {found.wild && !caught && (
            <button className="fakebtn" onClick={report}>
              🧐 가짜 같은데?
            </button>
          )}

          {/* 야생은 도감에 이미 있어도 잡습니다 — 조각을 주기 때문입니다.
              isNew 만 보면 후반에는 야생을 잡을 방법이 사라집니다. */}
          {found.isNew || found.wild ? (
            <BallThrow
              targetRef={targetRef}
              color={found.character.color}
              onHit={onBallHit}
              onGiveUp={grab}
              onMiss={onBallMiss}
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
