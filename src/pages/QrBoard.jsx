import { Link } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'
import { spotOf } from '../lib/spots'
import Popkku from '../components/Popkku'

/**
 * 화면 QR 보드 — 인쇄 없이 시연·테스트할 때 씁니다.
 *
 * 노트북이나 태블릿에서 이 페이지를 열어두고, 사람들이 자기 폰으로
 * 화면의 QR을 찍으면 됩니다. 종이 QR과 똑같이 동작합니다.
 * 부스에서 쓰는 페이지가 아니므로 홈에 링크를 두지 않습니다.
 */
export default function QrBoard() {
  const base = import.meta.env.BASE_URL

  return (
    <div className="shell qrboard">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 화면 QR
        </Link>
      </header>

      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>
          <strong>인쇄 없이 시연할 때 쓰는 화면입니다.</strong> 이 페이지를 노트북이나
          태블릿에 띄워두고, 폰의 <strong>탐지기</strong>로 아래 QR을 비추면 종이와
          똑같이 잡힙니다.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-3)' }}>
          잘 안 읽히면 화면 밝기를 올리고, QR이 폰 화면의 1/3 이상 차도록 가까이
          대주세요. 정면보다 살짝 비스듬히 대면 반사가 줄어듭니다.
        </p>
      </div>

      {/* 참가용 — 이걸 먼저 찍어야 게임에 들어옵니다 */}
      <div className="joincard">
        <div>
          <h2>① 먼저 이걸 찍어서 접속</h2>
          <p>가입 없음 · 앱 설치 없음</p>
          <code>powerysh-ysh.github.io/popkuz</code>
        </div>
        <img src={`${base}qr/join.png`} alt="참가 QR" width={720} height={720} />
      </div>

      <h2 className="section-title">
        ② 찾아서 찍을 팝꾸즈 QR <span className="line" />
      </h2>

      <div className="qrgrid">
        {CHARACTERS.map((c, i) => (
          <div className="qrcard" key={c.id} style={{ borderColor: c.color }}>
            <div className="qrcard-head">
              <Popkku character={c} size={62} />
              <div>
                <strong style={{ color: c.colorDark, fontSize: 21 }}>{c.name}</strong>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {String(i + 1).padStart(2, '0')} · {spotOf(c)}
                </div>
              </div>
            </div>
            <img
              className="qrcard-img"
              src={`${base}qr/${c.id}.png`}
              alt={`${c.name} QR`}
              width={560}
              height={560}
            />
          </div>
        ))}
      </div>

      <div className="stack">
        <Link className="btn btn-primary" to="/scan">
          🔍 탐지기 열기
        </Link>
        <Link className="btn btn-ghost" to="/staff">
          스태프 화면 (진행 초기화)
        </Link>
      </div>

      <p className="footnote">
        시연이 끝나면 <strong>스태프 화면 → 진행 초기화</strong>로 기록을 지우세요.
      </p>
    </div>
  )
}
