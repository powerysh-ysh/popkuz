import { useState } from 'react'

/**
 * 팝꾸즈 캐릭터.
 *
 * public/characters/<id>.webp 가 있으면 그 이미지를, 없거나 로딩에 실패하면
 * 인라인 SVG를 그립니다. 덕분에 일러스트가 아직 안 나온 캐릭터가 있어도
 * 화면이 비지 않고, 현장에서 이미지 로딩이 실패해도 게임이 멈추지 않습니다.
 *
 * 원본 PNG는 assets-src/ 에 넣고 `npm run images` 로 변환합니다.
 */
export default function Popkku({
  character,
  size = 160,
  silhouette = false, // 미획득 상태(도감 실루엣)
  evolved = false,
  className = '',
}) {
  const c = character
  const base = import.meta.env.BASE_URL

  // 시도 순서: 진화형 전용 컷 → 기본 컷 → SVG.
  // 진화형 일러스트가 아직 없어도 기본 컷에 오라와 반짝임이 얹혀
  // "진화한 모습"으로 자연스럽게 보입니다.
  const sources = evolved
    ? [`${base}characters/${c.id}-evo.webp`, `${base}characters/${c.id}.webp`]
    : [`${base}characters/${c.id}.webp`]

  const [srcIndex, setSrcIndex] = useState(0)
  const imgFailed = srcIndex >= sources.length

  const label = silhouette
    ? '아직 만나지 못한 팝꾸즈'
    : `${evolved ? c.evo.name : c.name} 캐릭터`

  // 실루엣은 이미지에 필터를 씌워 처리합니다 (형태는 보이고 정체는 숨김).
  if (!imgFailed) {
    return (
      <div
        className={`pk ${className}`}
        style={{ width: size, height: size * 0.9 }}
      >
        {evolved && !silhouette && <span className="pk-aura" style={{ background: c.color }} />}
        <img
          key={sources[srcIndex]}
          src={sources[srcIndex]}
          alt={label}
          width={size}
          height={size * 0.9}
          loading="lazy"
          decoding="async"
          onError={() => setSrcIndex((i) => i + 1)}
          className={silhouette ? 'pk-img pk-silhouette' : 'pk-img'}
        />
        {evolved && !silhouette && (
          <>
            <Star className="pk-star pk-star-1" color={c.color} />
            <Star className="pk-star pk-star-2" color={c.color} />
            <Star className="pk-star pk-star-3" color={c.color} />
          </>
        )}
      </div>
    )
  }

  return (
    <CrateSvg
      character={c}
      size={size}
      silhouette={silhouette}
      evolved={evolved}
      className={className}
    />
  )
}

function Star({ className, color }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 0 Q14 10 24 12 Q14 14 12 24 Q10 14 0 12 Q10 10 12 0 Z"
        fill={color}
      />
    </svg>
  )
}

/* ── 이미지가 없을 때의 대체 SVG ─────────────────────────── */

function CrateSvg({ character: c, size, silhouette, evolved, className }) {
  const uid = `${c.id}${evolved ? '-evo' : ''}`
  const body = silhouette ? '#C7CBD1' : c.color
  const bodyDark = silhouette ? '#A8ADB5' : c.colorDark
  const bodyTop = silhouette ? '#D8DBE0' : mix(c.color, '#ffffff', 0.22)

  return (
    <svg
      viewBox="0 0 200 180"
      width={size}
      height={size * 0.9}
      className={className}
      role="img"
      aria-label={silhouette ? '아직 만나지 못한 팝꾸즈' : `${evolved ? c.evo.name : c.name} 캐릭터`}
    >
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mix(body, '#ffffff', 0.18)} />
          <stop offset="100%" stopColor={body} />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="163" rx="58" ry="10" fill="#000" opacity="0.1" />
      <path
        d="M52 62 L100 38 L168 62 L120 86 Z"
        fill={bodyTop}
        stroke={bodyDark}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M120 86 L168 62 L168 122 L120 146 Z"
        fill={bodyDark}
        stroke={bodyDark}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="34"
        y="62"
        width="86"
        height="84"
        rx="12"
        fill={`url(#g-${uid})`}
        stroke={bodyDark}
        strokeWidth="3"
      />
      {[50, 63, 91, 104].map((x) => (
        <line
          key={x}
          x1={x}
          y1="72"
          x2={x}
          y2="136"
          stroke={bodyDark}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}

      {silhouette ? (
        <text
          x="77"
          y="118"
          textAnchor="middle"
          fontSize="46"
          fill="#8E949C"
          fontFamily="Jua, sans-serif"
        >
          ?
        </text>
      ) : (
        <>
          <Eye cx="64" cy="100" />
          <Eye cx="96" cy="100" />
        </>
      )}
    </svg>
  )
}

function Eye({ cx, cy }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="15" ry="16" fill="#fff" stroke="#1B1D21" strokeWidth="3" />
      <circle cx={cx + 2} cy={cy + 2} r="7" fill="#1B1D21" />
      <circle cx={cx + 5} cy={cy - 2} r="2.4" fill="#fff" />
    </g>
  )
}

function mix(a, b, t) {
  const pa = hex(a)
  const pb = hex(b)
  const ch = (i) => Math.round(pa[i] + (pb[i] - pa[i]) * t)
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
}

function hex(h) {
  const s = h.replace('#', '')
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ]
}
