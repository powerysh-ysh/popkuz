import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keycapStatus, redeemKeycaps } from '../lib/keycap'
import { useHunt } from '../lib/HuntContext'
import { isSurveyDone, markSurveyDone, surveyUrl } from '../lib/survey'

export default function Ticket() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { count } = useHunt()
  const [status, setStatus] = useState(() => keycapStatus(count))
  const [surveyDone, setSurveyDone] = useState(() => isSurveyDone())

  useEffect(() => {
    if (searchParams.get('survey') === 'done') {
      markSurveyDone()
      setSurveyDone(true)
    }
  }, [searchParams])

  const handleUse = () => {
    if (window.confirm(`스태프만 눌러주세요. 키캡 ${status.remaining}개 지급 처리하면 되돌릴 수 없어요.`)) {
      const res = redeemKeycaps(count)
      if (res.ok) {
        setStatus(keycapStatus(count))
      } else {
        alert("처리에 실패했습니다.")
      }
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 3D 프린터 키캡 교환권
        </Link>
      </header>

      {status.total > 0 ? (
        surveyDone ? (
          <div className="card center stack">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>3D 프린터 키캡 교환권</h2>
            <div
              className={`ticket${status.remaining === 0 ? ' used' : ''}`}
              style={{ borderColor: status.remaining === 0 ? 'var(--line)' : '#007aff', textAlign: 'center', display: 'block', padding: '24px 16px' }}
            >
              <p className="ticket-code" style={{ fontSize: 36, margin: '0 0 16px' }}>{status.code}</p>
              <p className="ticket-meta" style={{ marginBottom: 4 }}>
                받을 수 있는 키캡 {status.total}개 · 받아간 {status.used}개
              </p>
            </div>
            
            {status.remaining > 0 && (
              <button className="btn btn-primary" onClick={handleUse}>
                스태프 확인 — 키캡 {status.remaining}개 지급
              </button>
            )}
            
            <p className="footnote">스태프는 코드와 개수를 적어 두세요</p>
          </div>
        ) : (
          <div className="card center stack">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>3D 프린터 키캡 교환권</h2>
            <p>키캡 받기 전에 30초 설문!</p>
            <a href={surveyUrl(status.code)} className="btn btn-primary">
              설문하러 가기
            </a>
            <button className="btn btn-ghost" onClick={() => { markSurveyDone(); setSurveyDone(true); }} style={{ fontSize: '0.9em' }}>
              설문을 제출했어요
            </button>
          </div>
        )
      ) : (
        <div className="card center stack">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>3D 프린터 키캡 교환권</h2>
          <p>팝꾸즈 5마리를 모두 잡으면 키캡 1개</p>
          <Link className="btn btn-primary" to="/dex">
            도감 열기
          </Link>
        </div>
      )}
    </div>
  )
}
