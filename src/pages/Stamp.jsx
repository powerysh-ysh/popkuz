import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useHunt } from '../lib/HuntContext'
import { findSpace } from '../data/spaces'
import { getEnabledSpaces, refreshEnabledSpaces, addStamp, spaceLocked, dexCount, dexTotal } from '../lib/stamps'
import { keycapStatus } from '../lib/keycap'
import { mission } from '../lib/sfx'
import { buzz } from '../lib/scanner'

export default function Stamp() {
  const { id: paramId } = useParams()
  const location = useLocation()
  const { count } = useHunt()
  
  const spaceId = Number(paramId) || paramId
  const space = findSpace(spaceId)
  const token = new URLSearchParams(location.search).get('k')

  const [stampState, setStampState] = useState('checking')
  const checked = useRef(false)

  useEffect(() => {
    if (!space || space.token !== token) {
      setStampState('invalid')
      return
    }
    
    if (checked.current) return
    checked.current = true

    async function check() {
      const enabled = await refreshEnabledSpaces()
      if (!enabled.includes(space.id)) {
        setStampState('closed')
        return
      }

      if (spaceLocked(space.id, count)) {
        setStampState('locked')
        return
      }

      const { isNew } = addStamp(space.id)
      if (isNew) {
        setStampState('new')
        mission()
        buzz([100, 50, 100])
      } else {
        setStampState('already')
      }
    }
    check()
  }, [space, token, count])

  const dxCount = dexCount(count)
  const dxTotal = dexTotal()
  const ks = keycapStatus(count)

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 공간 스탬프
        </Link>
      </header>

      <div className="card" style={{ textAlign: 'center', margin: '20px 0', padding: '40px 20px' }}>
        {stampState === 'checking' && (
          <h2>확인 중…</h2>
        )}
        
        {stampState === 'invalid' && (
          <h2>잘못된 QR이에요</h2>
        )}
        
        {stampState === 'closed' && (
          <h2>오늘은 운영하지 않는 공간이에요</h2>
        )}

        {stampState === 'locked' && (
          <>
            <h2>팝꾸즈 {space.unlockAt - count}마리 더 잡으면 열려요</h2>
            <div className="stack" style={{ marginTop: 20 }}>
              <Link className="btn btn-primary" to="/scan">🔍 탐지기</Link>
            </div>
          </>
        )}

        {stampState === 'new' && (
          <>
            <div style={{
              display: 'inline-block',
              animation: 'spinScale 0.6s ease-out forwards',
              fontSize: 80,
              margin: '20px 0'
            }}>
              💮
            </div>
            <h2>{space.name} 스탬프 획득!</h2>
            <style>{`
              @keyframes spinScale {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
            `}</style>
          </>
        )}

        {stampState === 'already' && (
          <h2>이미 받은 스탬프예요</h2>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>도감 진행</h3>
        <div className="piece-row" style={{ margin: '10px 0', fontSize: 18 }}>
          <strong>{dxCount} / {dxTotal}</strong>
        </div>

        {ks.remaining >= 1 && (
          <div className="stack" style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 'bold' }}>
              🎁 키캡 {ks.remaining}개 받을 수 있어요
            </p>
            <Link className="btn btn-primary ticket" to="/ticket">🎟️ 교환권 보기</Link>
          </div>
        )}

        {ks.total !== 2 && (
          <p style={{ margin: '12px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
            도감을 다 채우면 키캡 2개!
          </p>
        )}
      </div>
      
      <div className="stack" style={{ marginTop: 16 }}>
        <Link className="btn" to="/dex">📖 도감 보기</Link>
      </div>
    </div>
  )
}
