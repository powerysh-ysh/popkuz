import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getKeycap, useKeycap } from '../lib/keycap'

export default function Ticket() {
  const navigate = useNavigate()
  const [keycap, setKeycap] = useState(getKeycap())

  const handleUse = () => {
    if (window.confirm('스태프만 눌러주세요. 사용 처리하면 되돌릴 수 없어요.')) {
      const res = useKeycap()
      if (res.ok) {
        setKeycap(getKeycap())
      } else {
        alert(res.reason)
      }
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 3D 프린터 키캡 체험권
        </Link>
      </header>

      {keycap ? (
        <div className="card center stack">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>3D 프린터 키캡 체험권</h2>
          <div
            className={`ticket${keycap.usedAt ? ' used' : ''}`}
            style={{ borderColor: keycap.usedAt ? 'var(--line)' : '#007aff', textAlign: 'center', display: 'block', padding: '24px 16px' }}
          >
            <p className="ticket-code" style={{ fontSize: 36, margin: '0 0 16px' }}>{keycap.code}</p>
            <p className="ticket-meta" style={{ marginBottom: 4 }}>
              발급 시각: {new Date(keycap.at).toLocaleString()}
            </p>
            <p className="ticket-meta">
              상태: {keycap.usedAt ? `사용 완료 (${new Date(keycap.usedAt).toLocaleString()})` : '사용 가능'}
            </p>
          </div>
          
          {!keycap.usedAt && (
            <button className="btn btn-primary" onClick={handleUse}>
              스태프 확인 — 사용 처리
            </button>
          )}
          
          <p className="footnote">스태프는 코드를 적어 두세요</p>
        </div>
      ) : (
        <div className="card center stack">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>3D 프린터 키캡 체험권</h2>
          <p>탐지기의 미션을 하나 깨면 받을 수 있어요</p>
          <Link className="btn btn-primary" to="/scan">
            🔍 탐지기로 가기
          </Link>
        </div>
      )}
    </div>
  )
}
