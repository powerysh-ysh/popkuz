import { Link } from 'react-router-dom'
import { CHARACTERS, findCharacter, TOTAL } from '../data/characters'
import { COUPON_TERMS, formatWon, planOf } from '../lib/mode'
import { getCoupons, unusedTotal } from '../lib/coupon'
import { useHunt } from '../lib/HuntContext'
import Popkku from '../components/Popkku'
import Progress from '../components/Progress'

/**
 * 내 할인권 — 팝업스토어 모드 전용.
 *
 * 학생이 직원에게 보여주는 화면입니다. 번호가 커야 하고, 사용 조건이
 * 같이 보여야 합니다. "받고 나서야 조건을 알게 되는" 경험이 제일 나쁩니다.
 */
export default function Wallet() {
  const { count } = useHunt()
  const coupons = getCoupons()
  const total = unusedTotal()

  // 발견 순서대로 보여줍니다.
  const sorted = [...coupons].sort(
    (a, b) => (planOf(a.id)?.order || 0) - (planOf(b.id)?.order || 0)
  )
  const left = CHARACTERS.filter((c) => !coupons.some((x) => x.id === c.id))

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 내 할인권
        </Link>
      </header>

      <div className="card center">
        <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ink-3)' }}>
          쓸 수 있는 할인권
        </p>
        <div className="mission-time">{formatWon(total)}</div>
        <Progress count={count} total={TOTAL} />
      </div>

      {sorted.length === 0 ? (
        <p className="locked-note">
          아직 찾은 팝꾸즈가 없어요.
          <br />
          매장 주변에서 팝꾸즈를 찾아보세요!
        </p>
      ) : (
        <div className="stack">
          {sorted.map((cp) => {
            const c = findCharacter(cp.id)
            const used = Boolean(cp.usedAt)
            return (
              <div
                key={cp.id}
                className={`ticket${used ? ' used' : ''}`}
                style={{ borderColor: used ? 'var(--line)' : c.color }}
              >
                <Popkku character={c} size={72} silhouette={used} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="ticket-amt" style={{ color: used ? '#9aa1a8' : c.colorDark }}>
                    {formatWon(cp.amount)}
                  </p>
                  <p className="ticket-code">{cp.code}</p>
                  <p className="ticket-meta">
                    {c.name} · {used ? '사용 완료' : '사용 가능'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {left.length > 0 && (
        <p className="footnote">
          아직 못 만난 팝꾸즈 {left.length}마리 — {left.map((c) => c.name).join(', ')}
        </p>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>사용 안내</h2>
        <ul className="rules">
          {COUPON_TERMS.map((t) => (
            <li key={t}>
              <b>·</b>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="stack">
        <Link className="btn btn-primary" to="/scan">
          🔍 탐지기로 더 찾기
        </Link>
        <Link className="btn btn-ghost" to="/dex">
          도감 보기
        </Link>
      </div>

      <p className="footnote">
        매장 직원에게 이 화면을 보여주세요.
      </p>
    </div>
  )
}
