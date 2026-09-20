import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { findCharacter, TOTAL } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

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
  const { capture, count, started } = useHunt()
  const [result, setResult] = useState(null)
  // "이미 처리했는가"를 boolean으로 두면, 이 화면에 머문 채 다음 QR을 찍었을 때
  // (라우터가 같은 컴포넌트를 재사용하므로) 두 번째 캐릭터가 잡히지 않습니다.
  // 어떤 캐릭터를 처리했는지를 기억해야 합니다.
  const capturedId = useRef(null)

  const character = findCharacter(id)
  const tokenOk = character && params.get('k') === character.token

  useEffect(() => {
    if (!character || !tokenOk) return
    if (capturedId.current === character.id) return // StrictMode 이중 실행 방지
    capturedId.current = character.id
    setResult(capture(character.id))
  }, [character, tokenOk, capture])

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

      <div className="statline">
        <span className="chip">
          {character.elementIcon} {character.element}
        </span>
        <span className="chip">필살기 · {character.skill}</span>
      </div>

      <div style={{ width: '100%', maxWidth: 340, marginBottom: 18 }}>
        <Progress count={newCount} total={TOTAL} />
      </div>

      <div className="actions">
        {complete ? (
          <button className="btn btn-primary" onClick={() => navigate('/done')}>
            🎉 도감 완성! 경품 받기
          </button>
        ) : (
          <Link className="btn btn-primary" to="/dex">
            도감 확인하기 (남은 {TOTAL - newCount}마리)
          </Link>
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
