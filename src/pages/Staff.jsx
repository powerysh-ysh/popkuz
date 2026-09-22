import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'
import { useHunt } from '../lib/HuntContext'
import { checkConnection, diagnoseWrite, syncEnabled } from '../lib/sync'
import { formatTime, getBest, getMission } from '../lib/mission'
import { getWild } from '../lib/wild'

/**
 * 부스 운영용 화면. 관람객에게 노출되지 않습니다 (홈에 링크 없음).
 * 스태프 폰에 즐겨찾기 해두고 쓰세요.
 */
export default function Staff() {
  const { resetAll, state, count, code } = useHunt()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const [conn, setConn] = useState({ ok: null, reason: '확인 중…' })
  const [diag, setDiag] = useState(null)

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
