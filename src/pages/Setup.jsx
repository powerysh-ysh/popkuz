import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'
import { encodeSpots, getSpots, resetSpots, saveSpots, spotOf } from '../lib/spots'
import Popkku from '../components/Popkku'

/**
 * 장소 설정 — 시연이나 리허설을 다른 공간에서 할 때 씁니다.
 *
 * 부스가 아닌 곳(회의실, 강의실, 집)에 QR을 숨겨놓고 할 때
 * "부스 입구" 같은 기본 안내가 뜨면 헷갈립니다. 여기서 5곳의 이름을
 * 그 공간에 맞게 바꾸면 도감·탐지기·미션 안내가 모두 따라갑니다.
 */
export default function Setup() {
  const [draft, setDraft] = useState(() => {
    const cur = getSpots()
    const d = {}
    for (const c of CHARACTERS) d[c.id] = cur[c.id] || ''
    return d
  })
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')

  const origin =
    typeof window !== 'undefined'
      ? window.location.href.split('#')[0].replace(/\?.*$/, '')
      : ''

  function save() {
    saveSpots(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function useDefaults() {
    resetSpots()
    const d = {}
    for (const c of CHARACTERS) d[c.id] = ''
    setDraft(d)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function shareLink() {
    const map = saveSpots(draft)
    const code = encodeSpots(map)
    // 해시 라우팅이므로 파라미터는 # 안쪽에 넣어야 앱이 읽습니다.
    const url = code ? `${origin}#/?s=${code}` : origin
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied('링크를 복사했어요 — 단톡방에 붙여넣으세요')
        setTimeout(() => setCopied(''), 3000)
      },
      () => setCopied(url)
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span>시작박스</span> 장소 설정
        </Link>
      </header>

      <div className="card">
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>
          <strong>QR을 숨긴 곳의 이름</strong>을 적으세요. 도감·탐지기·미션의
          위치 안내가 모두 이 이름으로 바뀝니다.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-3)' }}>
          비워두면 기본값(부스 기준)을 씁니다. 시연이 끝나면
          <strong> 기본값으로 되돌리기</strong>를 눌러주세요.
        </p>
      </div>

      <div className="stack">
        {CHARACTERS.map((c) => (
          <div className="setup-row" key={c.id} style={{ borderColor: c.color }}>
            <Popkku character={c} size={58} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: c.colorDark, fontSize: 17 }}>{c.name}</strong>
              <input
                className="setup-input"
                value={draft[c.id]}
                placeholder={c.spot}
                maxLength={40}
                onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="stack">
        <button className="btn btn-primary" onClick={save}>
          {saved ? '저장했어요 ✓' : '저장하기'}
        </button>
        <button className="btn btn-ghost" onClick={shareLink}>
          🔗 다른 폰에도 적용할 링크 복사
        </button>
        <button className="btn btn-ghost" onClick={useDefaults}>
          기본값(부스 기준)으로 되돌리기
        </button>
      </div>

      {copied && <p className="setup-note">{copied}</p>}

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>지금 적용된 안내</h2>
        <ul className="rules">
          {CHARACTERS.map((c) => (
            <li key={c.id}>
              <b style={{ background: c.colorLight, color: c.colorDark }}>·</b>
              <span>
                <strong>{c.name}</strong> — {spotOf({ ...c, spot: draft[c.id] || c.spot })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="stack">
        <Link className="btn btn-ghost" to="/qr">
          화면 QR 보드 열기
        </Link>
        <Link className="btn btn-ghost" to="/staff">
          스태프 화면
        </Link>
      </div>
    </div>
  )
}
