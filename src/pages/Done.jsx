import { useEffect, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import { totalScore } from '../lib/score'
import { syncScore } from '../lib/sync'

export default function Done() {
  const { complete, finish, code, state } = useHunt()
  const synced = useRef(false)
  const score = totalScore()

  useEffect(() => {
    if (complete) {
      finish()
      if (!synced.current) {
        syncScore(state, score)
        synced.current = true
      }
    }
  }, [complete, finish, state, score])

  if (!complete) return <Navigate to="/dex" replace />

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 완주!
        </Link>
      </header>

      <section className="hero" style={{ paddingTop: 16 }}>
        <h1>
          도감 <em>완성!</em>
        </h1>
        <p>{state.nickname || '탐험가'}님, 팝꾸즈 5마리를 모두 만났어요 🎉</p>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '20px 0', color: 'var(--brand)' }}>
          총점: {score}점
        </div>
      </section>

      <div className="parade" aria-hidden="true">
        {CHARACTERS.map((c, i) => (
          <Popkku
            key={c.id}
            character={c}
            size={78}
            evolved
            className={i % 2 ? 'float-b' : 'float-a'}
          />
        ))}
      </div>

      <div className="card">
        <p className="center" style={{ margin: 0, fontSize: 16 }}>
          이 화면을 <strong>스태프에게 보여주세요</strong>
        </p>
        <div className="code">{code}</div>
        <p className="center" style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
          완주 인증 코드
        </p>
      </div>

      <div className="stack">
        <Link className="btn btn-ghost" to="/dex">
          도감 · 진화 보러 가기
        </Link>
      </div>

      <p className="footnote">
        경품은 부스 스태프에게 받아가세요.
        <br />
        함께해 주셔서 고맙습니다! 🌱
      </p>
    </div>
  )
}
