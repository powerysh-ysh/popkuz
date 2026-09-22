import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { checkConnection, diagnoseWrite, syncEnabled } from '../lib/sync'
import { formatTime, getBest, getMission } from '../lib/mission'
import { getWild } from '../lib/wild'
import { MODES, formatWon, getMode, planOf, setMode } from '../lib/mode'
import { getCoupons, useCoupon } from '../lib/coupon'

/**
 * 부스 운영용 화면. 관람객에게 노출되지 않습니다 (홈에 링크 없음).
 * 스태프 폰에 즐겨찾기 해두고 쓰세요.
 */
export default function Staff() {
  const { resetAll, state, count, code } = useHunt()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const [conn, setConn] = useState({ ok: null, reason: '확인 중…' })
  const [diag, setDiag] = useState(null)
  const [mode, setModeState] = useState(() => getMode())
  const [codeInput, setCodeInput] = useState('')
  const [useResult, setUseResult] = useState(null)
  const store = mode === 'store'

  function switchMode(id) {
    setMode(id)
    setModeState(id)
    location.reload()
  }

  function redeem() {
    const r = useCoupon(codeInput.trim().toUpperCase())
    setUseResult(r)
    if (r.ok) setCodeInput('')
  }

  useEffect(() => {
    let alive = true
    checkConnection().then((r) => alive && setConn(r))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="staff">
      <div className="shell">
        <header className="topbar">
          <h1 style={{ margin: 0 }}>🛠 스태프 화면</h1>
        </header>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 17 }}>운영 모드</h2>
          <p style={{ fontSize: 14, color: '#C7CCD2', margin: '0 0 12px' }}>
            지금 이 기기는 <strong style={{ color: '#8CE99A' }}>{MODES[mode].name}</strong> 모드입니다
            — {MODES[mode].where}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.values(MODES).map((m) => (
              <button
                key={m.id}
                className="btn btn-ghost"
                style={
                  m.id === mode
                    ? { borderColor: '#22A45D', color: '#177843', fontWeight: 'bold' }
                    : undefined
                }
                onClick={() => m.id !== mode && switchMode(m.id)}
              >
                {m.id === mode ? '✓ ' : ''}
                {m.name}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#8E949C', margin: '10px 0 0', lineHeight: 1.6 }}>
            관람객 폰은 <code>/expo</code> 또는 <code>/store</code> 주소로 들어오면
            자동으로 그 모드가 됩니다. 인쇄한 QR이 모드를 정하므로 섞이지 않습니다.
          </p>
        </div>

        {store && (
          <div className="card" style={{ marginTop: 14 }}>
            <h2 style={{ marginTop: 0, fontSize: 17 }}>🎟 할인권 사용 처리</h2>
            <p style={{ fontSize: 14, color: '#C7CCD2', margin: '0 0 12px', lineHeight: 1.7 }}>
              학생 화면의 <strong style={{ color: '#fff' }}>8자리 번호</strong>를 입력하고
              사용 처리하세요. 한 번 처리하면 되돌릴 수 없습니다.
            </p>
            <input
              className="setup-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="예: A3K9-7PQR"
              autoCapitalize="characters"
              style={{ marginTop: 0 }}
            />
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={redeem}>
              사용 처리
            </button>
            {useResult && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: useResult.ok ? '#8CE99A' : '#FFA8A8',
                }}
              >
                {useResult.ok
                  ? `✅ ${formatWon(useResult.coupon.amount)} 할인권 사용 처리 완료`
                  : `⚠️ ${useResult.reason}`}
              </p>
            )}
            <table style={{ marginTop: 12 }}>
              <tbody>
                {getCoupons().length === 0 ? (
                  <tr>
                    <td style={{ color: '#8E949C' }}>이 기기에 발급된 할인권 없음</td>
                  </tr>
                ) : (
                  getCoupons()
                    .sort((a, b) => (planOf(a.id)?.order || 0) - (planOf(b.id)?.order || 0))
                    .map((c) => (
                      <tr key={c.code}>
                        <td style={{ color: '#C7CCD2' }}>{c.code}</td>
                        <td style={{ width: 90 }}>{formatWon(c.amount)}</td>
                        <td style={{ width: 80, color: c.usedAt ? '#8E949C' : '#8CE99A' }}>
                          {c.usedAt ? '사용됨' : '사용 가능'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: '#8E949C', marginBottom: 0, lineHeight: 1.6 }}>
              할인권은 학생 폰에 저장됩니다. 확실한 방어선은 <strong>번호를 적어두는 것</strong>입니다.
              같은 번호가 또 오면 거르세요.
            </p>
          </div>
        )}

        <div className="card" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>완주 확인 방법</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#C7CCD2', margin: 0 }}>
            관람객 화면에 <strong style={{ color: '#fff' }}>진화형 5종</strong>이 보이고
            6자리 <strong style={{ color: '#fff' }}>완주 인증 코드</strong>가 떠 있으면
            완주입니다. 코드는 사람마다 다르며 같은 사람은 항상 같은 코드가 나옵니다 —
            같은 코드로 두 번 받아가려는 경우만 걸러주세요.
          </p>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>QR 주소 (인쇄용)</h2>
          <table>
            <tbody>
              {CHARACTERS.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ width: 28, color: '#8E949C' }}>{i + 1}</td>
                  <td style={{ width: 56, color: c.color }}>{c.name}</td>
                  <td style={{ fontSize: 12, color: '#C7CCD2', wordBreak: 'break-all' }}>
                    /#/{c.short}
                    <div style={{ color: '#7C848C', marginTop: 2 }}>📍 {c.spot}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#8E949C', marginBottom: 0 }}>
            기준 주소: {origin || '(배포 후 확정)'}
            <br />
            화면 QR 보드: <code>{origin}/#/qr</code> (인쇄 없이 시연할 때)
          </p>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>이 기기 상태</h2>
          <table>
            <tbody>
              <tr>
                <td>닉네임</td>
                <td>{state.nickname || '—'}</td>
              </tr>
              <tr>
                <td>획득</td>
                <td>{count} / {CHARACTERS.length}</td>
              </tr>
              <tr>
                <td>코드</td>
                <td>{code}</td>
              </tr>
              <tr>
                <td>미션</td>
                <td>
                  {(() => {
                    const m = getMission()
                    if (!m) return '없음'
                    if (m.doneAt) return '완료됨'
                    return `진행 중 (${m.got.length}/${m.targets.length})`
                  })()}
                </td>
              </tr>
              <tr>
                <td>야생 포획</td>
                <td>{getWild().count}마리 (도감과 별개)</td>
              </tr>
              <tr>
                <td>최고 기록</td>
                <td>{getBest() != null ? formatTime(getBest()) : '—'}</td>
              </tr>
              <tr>
                <td>통계 서버</td>
                <td>
                  {conn.ok === null && '⏳ 확인 중…'}
                  {conn.ok === true && '✅ 정상 기록 중'}
                  {conn.ok === false && (
                    <span style={{ color: syncEnabled ? '#FF8787' : '#8E949C' }}>
                      {syncEnabled ? '⚠️ ' : '— '}
                      {conn.reason}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={async () => {
              setDiag({ detail: '검사 중…' })
              setDiag(await diagnoseWrite())
            }}
          >
            쓰기 자가진단
          </button>
          {diag && (
            <p
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.6,
                wordBreak: 'break-all',
                color: diag.ok ? '#8CE99A' : '#FFA8A8',
              }}
            >
              {diag.ok ? '✅ 쓰기 성공 — ' : '⚠️ '}
              {diag.detail}
            </p>
          )}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (
                confirm('이 기기의 도감 · 미션 · 기록 · 야생 포획을 모두 지웁니다. 계속할까요?')
              ) {
                resetAll()
                location.reload()
              }
            }}
          >
            진행 초기화 (도감 · 미션 · 기록)
          </button>
        </div>

        <div className="stack">
          <Link className="btn btn-ghost" to="/setup">
            📍 장소 설정 (시연 공간에 맞추기)
          </Link>
          <Link className="btn btn-ghost" to="/qr">
            화면 QR 보드
          </Link>
          <Link className="btn btn-ghost" to="/">
            관람객 화면으로
          </Link>
        </div>
      </div>
    </div>
  )
}
