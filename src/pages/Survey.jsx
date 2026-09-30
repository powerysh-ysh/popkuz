import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHunt } from '../lib/HuntContext'
import { keycapStatus } from '../lib/keycap'
import { isSurveyDone, markSurveyDone, surveyEmbedUrl } from '../lib/survey'

export default function Survey() {
  const navigate = useNavigate()
  const { count } = useHunt()
  const status = keycapStatus(count)
  const code = status.code
  const loadCount = useRef(0)
  const [done, setDone] = useState(() => isSurveyDone())
  const initialDone = useRef(done)

  useEffect(() => {
    if (done) {
      if (initialDone.current) {
        navigate('/ticket', { replace: true })
      } else {
        const timer = setTimeout(() => {
          navigate('/ticket', { replace: true })
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [done, navigate])

  const handleLoad = () => {
    loadCount.current += 1
    if (loadCount.current >= 2) {
      markSurveyDone()
      setDone(true)
    }
  }

  const handleManualDone = () => {
    markSurveyDone()
    setDone(true)
  }

  if (!code) {
    return (
      <div className="shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span>시작박스</span> 설문
          </Link>
        </header>
        <div className="card center stack" style={{ marginTop: 24 }}>
          <p>먼저 팝꾸즈를 잡아 주세요</p>
          <Link className="btn btn-primary" to="/">홈으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      <header className="topbar" style={{ flexShrink: 0, padding: '16px 20px' }}>
        <Link to="/" className="brand">
          <span>시작박스</span> 설문
        </Link>
      </header>
      
      {done ? (
        <div className="card center stack" style={{ margin: 20 }}>
          <p>✅ 설문 완료! 교환권을 보여 주세요</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 20px 12px' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>📝 30초 설문 — 제출하면 바로 키캡 교환권이 열려요</p>
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <iframe 
              src={surveyEmbedUrl(code)} 
              style={{ width: '100%', height: '75vh', border: 0 }}
              onLoad={handleLoad}
              title="survey"
            />
          </div>

          <div style={{ padding: 20, textAlign: 'center' }}>
            <button className="btn btn-ghost" onClick={handleManualDone} style={{ fontSize: '0.9em' }}>
              설문을 제출했어요
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
