import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CHARACTERS, findByShort, findCharacter, TOTAL } from '../data/characters'
import { COUPON_TERMS, formatWon, isStore, planOf } from '../lib/mode'
import { issueCoupon } from '../lib/coupon'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

import Battle from '../components/Battle'
import { saveScore } from '../lib/score'

/**
 * QR 착지 화면. 주소 형태: /c/chokku?k=sb01
 *
 * 닉네임을 아직 안 정한 사람이 QR부터 찍는 경우가 반드시 생깁니다
 * (부스 안쪽 QR을 먼저 발견). 그래도 튕겨내지 않고 일단 획득시킨 뒤
 * 닉네임은 나중에 받습니다 — 첫 화면에서 막으면 그냥 떠납니다.
 */
export default function Catch() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { capture, count, started, has } = useHunt()
  const [result, setResult] = useState(null)
  
  const [showBattle, setShowBattle] = useState(false)
  const [battleResult, setBattleResult] = useState(null)
  const capturedId = useRef(null)

  const [coupon, setCoupon] = useState(null)
  
  // 두 형식을 모두 받습니다.
  //   긴 형식  /c/chokku?k=sb01  — 먼저 만든 인쇄물
  //   짧은 형식 /q7              — 키캡처럼 작게 인쇄할 때 (QR이 29x29로 작아짐)
  const byShort = findByShort(id)
  const character = byShort || findCharacter(id)
  const tokenOk = byShort ? true : Boolean(character) && params.get('k') === character.token

  // "이미 처리했는가"를 boolean으로 두면, 이 화면에 머문 채 다음 QR을 찍었을 때 (라우터가 같은 컴포넌트를 재사용하므로) 두 번째 캐릭터가 잡히지 않습니다. 어떤 캐릭터를 처리했는지를 기억해야 합니다.
  const prevId = useRef(character?.id)
  if (prevId.current !== character?.id) {
    prevId.current = character?.id
    setShowBattle(false)
    setBattleResult(null)
    setResult(null)
    setCoupon(null)
    capturedId.current = null
  }

  const store = isStore()
  const plan = character ? planOf(character.id) : null

  // 팝업스토어 모드에서 꿈꾸는 앞의 넷을 모두 찾아야 열립니다.
  // 운으로 최고 보상을 가져가지 못하게 하려는 장치입니다.
  const locked =
    store &&
    plan?.order === 5 &&
    CHARACTERS.some((c) => c.id !== character.id && !has(c.id))

  useEffect(() => {
    if (!character || !tokenOk || locked) return
    if (capturedId.current === character.id) return // StrictMode 이중 실행 방지
    
    if (!has(character.id) && !showBattle && !battleResult) {
      setShowBattle(true)
      return
    }
    
    if (has(character.id) && !showBattle) {
      capturedId.current = character.id
      setResult(capture(character.id))
      if (store) setCoupon(issueCoupon(character.id))
    }
  }, [character, tokenOk, locked, store, capture, has, showBattle, battleResult])

  const handleWin = (res) => {
    saveScore(character.id, res)
    setBattleResult(res)
    setShowBattle(false)
    capturedId.current = character.id
    setResult(capture(character.id))
    if (store) setCoupon(issueCoupon(character.id))
  }

  if (character && locked) {
    const left = CHARACTERS.filter((c) => c.id !== character.id && !has(c.id))
    return (
      <div className="catch" style={{ background: character.colorLight }}>
        <p className="kicker" style={{ color: character.colorDark }}>
          🔒 아직 열리지 않았어요
        </p>
        <Popkku character={character} size={200} silhouette />
        <h1>{character.name}</h1>
        <p className="quote">
          앞선 팝꾸즈를 모두 만나야
          <br />
          모습을 드러냅니다.
        </p>
        <div className="statline">
          {left.map((c) => (
            <span key={c.id} className="chip">
              {c.name} 남음
            </span>
          ))}
        </div>
        <div className="actions">
          <Link className="btn btn-primary" to="/dex">
            남은 팝꾸즈 확인하기
          </Link>
        </div>
      </div>
    )
  }

  if (!character || !tokenOk) {
    return (
      <div className="catch">
        <h1 style={{ fontSize: 26 }}>앗, 여긴 아무도 없네요</h1>
        <p className="quote">부스 안의 팝꾸즈 QR을 찾아서 다시 찍어주세요!</p>
        <div className="actions">
          <Link className="btn btn-primary" to="/">
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  if (showBattle) {
    return (
      <Battle 
        character={character} 
        easy={store} 
        onWin={handleWin} 
      />
    )
  }

  const isNew = result?.isNew ?? true
  const newCount = result?.state.caught.length ?? count
  const complete = newCount >= TOTAL

  return (
    <div className="catch" style={{ background: character.colorLight }}>
      <p className="kicker" style={{ color: character.colorDark }}>
        {isNew ? '✨ 새로운 친구를 만났어요!' : '👋 이미 만난 친구예요'}
      </p>

      <div className="burst">
        <Popkku character={character} size={220} />
      </div>

      <h1>{character.name}</h1>
      <p className="en">{character.en}</p>

      <p className="quote">&ldquo;{character.quote}&rdquo;</p>
      
      {battleResult && (
        <div className="battle-result" style={{ background: 'rgba(255,255,255,0.4)', padding: 12, borderRadius: 8, margin: '12px 0', textAlign: 'center' }}>
          <strong>등급 {battleResult.grade}</strong> (점수: {battleResult.score})
        </div>
      )}

      {store && coupon ? (
        <div className="coupon-card" style={{ borderColor: character.color }}>
          <p className="coupon-amt" style={{ color: character.colorDark }}>
            {formatWon(coupon.amount)} 할인권
          </p>
          <p className="coupon-code">{coupon.code}</p>
          <p className="coupon-terms">{COUPON_TERMS[0]}</p>
        </div>
      ) : (
        <div className="statline">
          <span className="chip">
            {character.elementIcon} {character.element}
          </span>
          <span className="chip">필살기 · {character.skill}</span>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340, marginBottom: 18 }}>
        <Progress count={newCount} total={TOTAL} />
      </div>

      <div className="actions">
        {complete ? (
          <button className="btn btn-primary" onClick={() => navigate('/done')}>
            🎉 도감 완성! 경품 받기
          </button>
        ) : (
          <>
            <Link className="btn btn-primary" to="/scan">
              🔍 탐지기로 계속 찾기 (남은 {TOTAL - newCount}마리)
            </Link>
            {store ? (
              <Link className="btn btn-ghost" to="/wallet">
                🎟 내 할인권 보기
              </Link>
            ) : (
              <Link className="btn btn-ghost" to="/dex">
                도감 확인하기
              </Link>
            )}
          </>
        )}
        {!started && (
          <Link className="btn btn-ghost" to="/">
            닉네임 정하기
          </Link>
        )}
      </div>
    </div>
  )
}
