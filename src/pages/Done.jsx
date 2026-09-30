import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CHARACTERS, TOTAL } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { modeConfig } from '../lib/mode'
import Popkku from '../components/Popkku'
import { totalScore, syncTotalIfHigher } from '../lib/score'
import * as sfx from '../lib/sfx'
import { keycapStatus } from '../lib/keycap'
import { isSurveyDone, surveyUrl } from '../lib/survey'

export default function Done() {
  const { complete, finish, state, count, resetAll } = useHunt()
  const navigate = useNavigate()
  const mode = modeConfig()
  const goal = mode.goalCount || TOTAL
  const synced = useRef(false)
  const played = useRef(false)
  const score = totalScore()

  useEffect(() => {
    if (complete) {
      finish()
      if (!played.current) {
        sfx.complete()
        played.current = true
      }
      if (!synced.current) {
        syncTotalIfHigher()
        synced.current = true
      }
    }
  }, [complete, finish, state, score])

  if (!complete) return <Navigate to="/dex" replace />

  const status = keycapStatus(count)
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 완주!
        </Link>
      </header>

      <section className="hero" style={{ paddingTop: 16 }}>
        <h1>
          <em>완주!</em>
        </h1>
        <p>{state.nickname || '탐험가'}님, 팝꾸즈 {goal}마리를 잡았어요 🎉</p>
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
        <p className="center" style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>
          🎉 팝꾸즈 {goal}마리 획득!
        </p>
        <p className="center" style={{ margin: '8px 0 0', fontSize: 14 }}>
          아래 두 가지를 하면 3D 프린터 키캡을 드려요
        </p>
      </div>

      <div className="stack">
        <a 
          className="btn btn-primary" 
          href="https://www.instagram.com/tm_localcon/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af)', color: 'white', border: 'none' }}
        >
          📸 인스타그램 팔로우하기 @tm_localcon
        </a>
        {status.code && !isSurveyDone() ? (
          <a className="btn btn-primary" href={surveyUrl(status.code)}>
            📝 30초 설문하고 키캡 받기
          </a>
        ) : (
          <Link className="btn btn-primary" to="/ticket">
            🎁 키캡 교환권 보기
          </Link>
        )}
        <Link className="btn btn-ghost" to="/dex">
          도감 · 진화 보러 가기
        </Link>
      </div>

      <button
        className="btn btn-ghost"
        style={{ fontSize: 'small' }}
        onClick={() => {
          if (window.confirm('지금까지 잡은 팝꾸즈와 점수가 모두 지워져요. 처음부터 다시 할까요?')) {
            navigate('/', { replace: true })
            setTimeout(() => resetAll(), 0)
          }
        }}
      >
        처음부터 다시 하기
      </button>

      <p className="footnote">
        함께해 주셔서 고맙습니다! 🌱
      </p>
    </div>
  )
}
