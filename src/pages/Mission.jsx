import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CHARACTERS, findCharacter } from '../data/characters'
import {
  clearMission,
  elapsed,
  formatTime,
  getBest,
  getMission,
  startMission,
} from '../lib/mission'
import { spotOf } from '../lib/spots'
import Popkku from '../components/Popkku'

/**
 * 미션 모드 — 무작위 2마리를 빨리 찾아오는 스피드런.
 *
 * 화면은 세 가지 상태뿐입니다: 시작 전 / 진행 중 / 완료.
 * 진행 중에는 탐지기로 보내고, 잡는 처리는 탐지기 화면이 합니다.
 */
export default function Mission() {
  const navigate = useNavigate()
  const [mission, setMission] = useState(() => getMission())
  const [, tick] = useState(0)
  const best = getBest()

  // 진행 중일 때 타이머를 0.1초마다 갱신
  useEffect(() => {
    if (!mission || mission.doneAt) return
    const t = setInterval(() => tick((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [mission])

  function begin() {
    const m = startMission(CHARACTERS, 2)
    setMission(m)
    navigate('/scan')
  }

  function reset() {
    clearMission()
    setMission(null)
  }

  /* ── 완료 ── */
  if (mission?.doneAt) {
    const ms = elapsed(mission)
    const isBest = best != null && ms <= best
    return (
      <div className="shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span>시작박스</span> 미션 완료
          </Link>
        </header>

        <section className="hero" style={{ paddingTop: 20 }}>
          <h1>
            미션 <em>성공!</em>
          </h1>
        </section>

        <div className="card center">
          <div className="mission-time">{formatTime(ms)}</div>
          {isBest ? (
            <p style={{ margin: 0, color: 'var(--green-dark)', fontSize: 16 }}>
              🏆 내 최고 기록!
            </p>
          ) : (
            best != null && (
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14 }}>
                내 최고 기록 {formatTime(best)}
              </p>
            )
          )}
        </div>

        <div className="parade" aria-hidden="true" style={{ marginTop: 16 }}>
          {mission.targets.map((id) => (
            <Popkku key={id} character={findCharacter(id)} size={96} />
          ))}
        </div>

        <div className="stack">
          <button className="btn btn-primary" onClick={begin}>
            ⚡ 한 번 더 도전
          </button>
          <Link className="btn btn-ghost" to="/dex">
            도감 보기
          </Link>
          <button className="btn btn-ghost" onClick={reset}>
            미션 끝내기
          </button>
        </div>
      </div>
    )
  }

  /* ── 진행 중 ── */
  if (mission) {
    return (
      <div className="shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span>시작박스</span> 미션 진행 중
          </Link>
        </header>

        <div className="card center">
          <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--ink-3)' }}>경과 시간</p>
          <div className="mission-time">{formatTime(elapsed(mission))}</div>
        </div>

        <h2 className="section-title">
          찾아야 할 팝꾸즈 <span className="line" />
          <span style={{ fontSize: 15, color: 'var(--ink-3)' }}>
            {mission.got.length} / {mission.targets.length}
          </span>
        </h2>

        <div className="dexgrid">
          {mission.targets.map((id) => {
            const c = findCharacter(id)
            const done = mission.got.includes(id)
            return (
              <div
                key={id}
                className={`dexcard${done ? '' : ' locked'}`}
                style={done ? { borderColor: c.color } : undefined}
              >
                <Popkku character={c} size={110} silhouette={!done} />
                <h3 style={{ color: done ? c.colorDark : '#8E949C' }}>
                  {done ? `${c.name} ✓` : c.name}
                </h3>
                <p className="spot">📍 {spotOf(c)}</p>
              </div>
            )
          })}
        </div>

        <div className="stack">
          <Link className="btn btn-primary" to="/scan">
            🔍 탐지기로 찾으러 가기
          </Link>
          <button className="btn btn-ghost" onClick={reset}>
            미션 포기
          </button>
        </div>
      </div>
    )
  }

  /* ── 시작 전 ── */
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 미션
        </Link>
      </header>

      <section className="hero" style={{ paddingTop: 16 }}>
        <h1>
          ⚡ <em>스피드</em> 미션
        </h1>
        <p>
          무작위로 정해진 <strong>팝꾸즈 2마리</strong>를
          <br />
          누가 제일 빨리 찾아오는지 겨뤄보세요!
        </p>
      </section>

      <div className="card" style={{ marginTop: 14 }}>
        <ul className="rules">
          <li>
            <b>1</b>
            <span>시작을 누르면 찾아야 할 2마리가 정해집니다.</span>
          </li>
          <li>
            <b>2</b>
            <span>탐지기로 부스를 돌며 그 2마리를 찾으세요.</span>
          </li>
          <li>
            <b>3</b>
            <span>
              둘 다 잡으면 <strong>기록이 멈춥니다.</strong> 최고 기록에 도전!
            </span>
          </li>
        </ul>
        {best != null && (
          <p style={{ margin: '14px 0 0', fontSize: 15, color: 'var(--green-dark)' }}>
            🏆 내 최고 기록 <strong>{formatTime(best)}</strong>
          </p>
        )}
      </div>

      <div className="stack">
        <button className="btn btn-primary" onClick={begin}>
          미션 시작!
        </button>
        <Link className="btn btn-ghost" to="/dex">
          도감 보기 (5마리 모으기)
        </Link>
      </div>

      <p className="footnote">
        미션 중에 잡은 캐릭터도 도감에 그대로 기록됩니다.
      </p>
    </div>
  )
}
