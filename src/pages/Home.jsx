import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CHARACTERS, TOTAL } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

export default function Home() {
  const { started, start, count, complete, state } = useHunt()
  const [name, setName] = useState('')
  const navigate = useNavigate()

  function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    start(name)
    navigate('/dex')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> POP-KKUS
        </Link>
      </header>

      <section className="hero">
        <p className="eyebrow">DONGMYONG UNIVERSITY STARTUP</p>
        <h1>
          팝꾸즈를 <em>찾아라!</em>
        </h1>
        <p>
          부스 안에 팝꾸즈 {TOTAL}마리가 숨어 있어요.
          <br />
          모두 찾아서 도감을 완성해 주세요!
        </p>
      </section>

      <div className="parade" aria-hidden="true">
        {CHARACTERS.map((c, i) => (
          <Popkku
            key={c.id}
            character={c}
            size={78}
            silhouette={!state.caught.some((x) => x.id === c.id)}
            className={i % 2 ? 'float-b' : 'float-a'}
          />
        ))}
      </div>

      {started ? (
        <div className="stack">
          <div className="card">
            <p style={{ margin: '0 0 10px', fontSize: 16 }}>
              {state.nickname} 탐험가님, 지금까지 {count}마리!
            </p>
            <Progress count={count} total={TOTAL} />
          </div>
          <Link className="btn btn-primary" to="/scan">
            🔍 팝꾸즈 탐지기 켜기
          </Link>
          <Link className="btn btn-mission" to="/mission">
            ⚡ 스피드 미션 도전
          </Link>
          <Link className="btn btn-ghost" to="/dex">
            도감 열기
          </Link>
          {complete && (
            <Link className="btn" to="/done">
              🎁 경품 받으러 가기
            </Link>
          )}
        </div>
      ) : (
        <form className="card stack" onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <label className="field">
            <span>닉네임을 정해주세요 (가입 없이 바로 시작)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 시작박스탐험가"
              maxLength={12}
              autoComplete="off"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            모험 시작하기
          </button>
        </form>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18 }}>어떻게 하나요?</h2>
        <ul className="rules">
          <li>
            <b>1</b>
            <span>
              부스를 돌아다니며 <strong>팝꾸즈 QR</strong>을 찾으세요.
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>탐지기</strong>를 켜고 QR을 비추면 그 자리에서 잡을 수 있어요.
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              {TOTAL}마리를 모두 모으면 <strong>진화형이 해금</strong>돼요!
            </span>
          </li>
          <li>
            <b>4</b>
            <span>완주 화면을 스태프에게 보여주고 경품을 받아가세요 🎁</span>
          </li>
        </ul>
      </div>

      <p className="footnote">
        2026 산학협력 EXPO · 킨텍스 제2전시장
        <br />
        동명대학교 창업학과 시작박스 부스
      </p>
    </div>
  )
}
