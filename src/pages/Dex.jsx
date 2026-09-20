import { Link } from 'react-router-dom'
import { CHARACTERS, TOTAL } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

export default function Dex() {
  const { has, count, complete, state } = useHunt()

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 도감
        </Link>
      </header>

      <div className="card">
        <p style={{ margin: '0 0 10px', fontSize: 16 }}>
          {state.nickname ? `${state.nickname} 탐험가님의 도감` : '팝꾸즈 도감'}
        </p>
        <Progress count={count} total={TOTAL} />
      </div>

      <div className="dexgrid">
        {CHARACTERS.map((c, i) => {
          const caught = has(c.id)
          return (
            <div
              key={c.id}
              className={`dexcard${caught ? '' : ' locked'}`}
              style={caught ? { borderColor: c.color } : undefined}
            >
              <span className="num">No.{String(i + 1).padStart(2, '0')}</span>
              <Popkku character={c} size={110} silhouette={!caught} />
              <h3 style={caught ? { color: c.colorDark } : { color: '#8E949C' }}>
                {caught ? c.name : '???'}
              </h3>
              <p className="sub">
                {caught ? `${c.elementIcon} ${c.element}` : '아직 만나지 못했어요'}
              </p>
              {!caught && <p className="spot">📍 {c.spot}</p>}
            </div>
          )
        })}
      </div>

      <h2 className="section-title">
        진화형 <span className="line" /> <span style={{ fontSize: 14 }}>{complete ? '해금!' : '🔒'}</span>
      </h2>

      {complete ? (
        <>
          <div className="dexgrid">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="dexcard" style={{ borderColor: c.color }}>
                <Popkku character={c} size={110} evolved />
                <h3 style={{ color: c.colorDark }}>{c.evo.name}</h3>
                <p className="sub">{c.evo.desc}</p>
              </div>
            ))}
          </div>
          <div className="stack">
            <Link className="btn btn-primary" to="/done">
              🎁 경품 받으러 가기
            </Link>
          </div>
        </>
      ) : (
        <p className="locked-note">
          {TOTAL}마리를 모두 만나면
          <br />
          <strong>진화형 {TOTAL}종</strong>이 해금됩니다!
          <br />
          남은 친구 <strong>{TOTAL - count}마리</strong>를 찾아주세요.
        </p>
      )}

      <p className="footnote">
        &ldquo;함께라면, 어떤 시작도 두렵지 않아!&rdquo;
        <br />
        작은 상자가 만든 큰 세계 · POP-KKUS
      </p>
    </div>
  )
}
