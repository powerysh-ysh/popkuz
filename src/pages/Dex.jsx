import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CHARACTERS, TOTAL } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { arSupported, launchAR } from '../lib/ar'
import { spotOf } from '../lib/spots'
import { EVOLVE_COST, evolve, evolveStatus, rareCount, ro } from '../lib/pieces'
import { buzz } from '../lib/scanner'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'
import * as sfx from '../lib/sfx'

export default function Dex() {
  const { has, count, complete, state } = useHunt()

  // AR은 보너스입니다. 지원하지 않는 기기에서는 버튼 자체를 감춥니다.
  const [ar, setAr] = useState(false)
  useEffect(() => setAr(arSupported()), [])

  // 조각은 localStorage에 있으므로, 진화 후 다시 읽도록 한 칸 돌립니다.
  const [tick, setTick] = useState(0)
  const rare = rareCount()

  function onEvolve(c) {
    const r = evolve(c.id)
    if (!r.ok) return
    buzz([60, 40, 60, 40, 140])
    sfx.evolve()
    setTick((n) => n + 1)
  }

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
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          ✦ 반짝조각 <strong style={{ color: '#B78700' }}>{rare}개</strong> — 미션을 깨면
          모이고, 아무 팝꾸즈에게나 쓸 수 있어요.
        </p>
      </div>

      <div className="dexgrid" key={tick}>
        {CHARACTERS.map((c, i) => {
          const caught = has(c.id)
          const st = evolveStatus(c.id)
          const pct = Math.min(100, (st.own / EVOLVE_COST) * 100)

          return (
            <div
              key={c.id}
              className={`dexcard${caught ? '' : ' locked'}`}
              style={caught ? { borderColor: c.color } : undefined}
            >
              <span className="num">No.{String(i + 1).padStart(2, '0')}</span>
              <Popkku
                character={c}
                size={110}
                silhouette={!caught}
                evolved={st.evolved}
              />
              <h3 style={caught ? { color: c.colorDark } : { color: '#8E949C' }}>
                {caught ? (st.evolved ? c.evo.name : c.name) : '???'}
              </h3>
              <p className="sub">
                {!caught
                  ? '아직 만나지 못했어요'
                  : st.evolved
                    ? c.evo.desc
                    : `${c.elementIcon} ${c.element}`}
              </p>

              {!caught && <p className="spot">📍 {spotOf(c)}</p>}

              {caught && st.evolved && <span className="evo-tag">진화 완료</span>}

              {/* 조각 모으기 — 아직 진화 안 한 캐릭터만 */}
              {caught && !st.evolved && (
                <>
                  <div className="piece-row">
                    <span>조각</span>
                    <span className="piece-bar">
                      <i style={{ width: `${pct}%`, background: c.color }} />
                    </span>
                    <span>
                      {st.own}/{EVOLVE_COST}
                    </span>
                  </div>
                  <button
                    className="evobtn"
                    style={st.can ? { borderColor: c.color, color: c.colorDark } : undefined}
                    disabled={!st.can}
                    onClick={() => onEvolve(c)}
                  >
                    {st.can
                      ? st.useRare > 0
                        ? `진화 (✦${st.useRare} 사용)`
                        : `${c.evo.name}${ro(c.evo.name)} 진화`
                      : `조각 ${EVOLVE_COST - st.own - st.rare}개 더`}
                  </button>
                </>
              )}

              {caught && ar && (
                <button
                  className="arbtn"
                  style={{ borderColor: c.color, color: c.colorDark }}
                  onClick={() => launchAR(c)}
                >
                  📱 AR로 세워보기
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>조각은 어떻게 모으나요?</h2>
        <ul className="rules">
          <li>
            <b>·</b>
            <span>부스의 QR로 처음 만나면 그 팝꾸즈 조각 <strong>3개</strong></span>
          </li>
          <li>
            <b>·</b>
            <span>야생 팝꾸즈를 잡으면 그 팝꾸즈 조각 <strong>2개</strong></span>
          </li>
          <li>
            <b>·</b>
            <span>탐지기의 <strong>미션</strong>을 깨면 반짝조각 ✦ (아무 데나 쓸 수 있어요)</span>
          </li>
          <li>
            <b>·</b>
            <span>진화에는 <strong>{EVOLVE_COST}개</strong>가 필요해요</span>
          </li>
        </ul>
        <div className="stack">
          <Link className="btn btn-primary" to="/scan">
            🔍 탐지기로 조각 모으기
          </Link>
        </div>
      </div>

      {complete && (
        <div className="stack">
          <Link className="btn btn-primary" to="/done">
            🎁 경품 받으러 가기
          </Link>
        </div>
      )}

      <p className="footnote">
        &ldquo;함께라면, 어떤 시작도 두렵지 않아!&rdquo;
        <br />
        작은 상자가 만든 큰 세계 · POP-KKUS
      </p>
    </div>
  )
}
