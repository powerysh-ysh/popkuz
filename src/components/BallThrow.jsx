import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 공을 던져 캐릭터를 맞추는 미니 게임.
 *
 * 캐릭터가 팡팡 뛰고 있으므로 타이밍 게임이 됩니다. 아래쪽 공을
 * 위로 튕기면(드래그 후 놓기) 공이 날아가고, 캐릭터에 닿으면 잡힙니다.
 *
 * 부스에서 쓰는 물건이라 두 가지를 지켰습니다.
 *   · 어린이·어르신도 할 수 있게 실패해도 계속 재시도 가능
 *   · 세 번 놓치면 "그냥 잡기" 버튼이 나와 아무도 막히지 않음
 */
export default function BallThrow({ targetRef, color, onHit, onGiveUp, onMiss }) {
  const wrapRef = useRef(null)
  const ballRef = useRef(null)
  const rafRef = useRef(0)

  const drag = useRef(null) // { id, sx, sy, samples: [] }
  const [pos, setPos] = useState({ x: 0, y: 0 }) // 공의 현재 오프셋(px)
  const [scale, setScale] = useState(1)
  const [flying, setFlying] = useState(false)
  const [misses, setMisses] = useState(0)
  const [hint, setHint] = useState('공을 위로 튕겨보세요!')

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPos({ x: 0, y: 0 })
    setScale(1)
    setFlying(false)
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  /** 공이 캐릭터와 겹치는지 */
  const isHit = () => {
    const b = ballRef.current?.getBoundingClientRect()
    const t = targetRef.current?.getBoundingClientRect()
    if (!b || !t) return false
    // 캐릭터 그림의 가장자리는 투명하므로 안쪽으로 조금 좁혀 판정합니다.
    const pad = t.width * 0.16
    const bx = b.left + b.width / 2
    const by = b.top + b.height / 2
    return (
      bx > t.left + pad && bx < t.right - pad && by > t.top + pad && by < t.bottom - pad
    )
  }

  const launch = (vx, vy) => {
    setFlying(true)
    let x = pos.x
    let y = pos.y
    let s = 1
    let last = performance.now()
    let hit = false

    const step = (now) => {
      const dt = Math.min(48, now - last) / 16.67 // 프레임 보정
      last = now

      x += vx * dt
      y += vy * dt
      vy += 0.9 * dt // 중력
      s = Math.max(0.35, s - 0.012 * dt) // 멀어질수록 작아짐

      setPos({ x, y })
      setScale(s)

      if (!hit && isHit()) {
        hit = true
        cancelAnimationFrame(rafRef.current)
        onHit()
        return
      }

      const wrap = wrapRef.current?.getBoundingClientRect()
      const out = !wrap || y > 80 || Math.abs(x) > wrap.width || y < -wrap.height * 1.4
      if (out) {
        cancelAnimationFrame(rafRef.current)
        // 빗나가면 캐릭터가 놀라서 멀리 달아납니다.
        onMiss?.()
        setMisses((m) => {
          const n = m + 1
          setHint(n >= 3 ? '아깝다! 아래 버튼으로 바로 잡아도 돼요' : '아깝다! 다시 던져보세요')
          return n
        })
        reset()
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  const onDown = (e) => {
    if (flying) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, samples: [] }
    setHint('위로 쭉 밀어서 놓으세요')
  }

  const onMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.sx
    const y = e.clientY - d.sy
    setPos({ x, y })
    d.samples.push({ x, y, t: performance.now() })
    if (d.samples.length > 6) d.samples.shift()
  }

  const onUp = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null

    const s = d.samples
    if (s.length < 2) {
      reset()
      return
    }
    const a = s[0]
    const b = s[s.length - 1]
    const dt = Math.max(16, b.t - a.t)
    // 화면 크기에 관계없이 비슷한 느낌이 나도록 보정합니다.
    let vx = ((b.x - a.x) / dt) * 14
    let vy = ((b.y - a.y) / dt) * 14

    if (vy > -6) {
      // 위로 던지지 않았으면 그냥 제자리로
      setHint('위쪽으로 튕겨야 날아가요')
      reset()
      return
    }
    vx = Math.max(-26, Math.min(26, vx))
    vy = Math.max(-46, vy)
    launch(vx, vy)
  }

  return (
    <div className="ball-zone" ref={wrapRef}>
      <p className="ball-hint">{hint}</p>

      <button
        ref={ballRef}
        className="ball"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transition: flying ? 'none' : 'transform 0.18s ease-out',
          '--ball': color,
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="공 던지기"
      >
        <span className="ball-band" />
        <span className="ball-dot" />
      </button>

      {misses >= 3 && (
        <button className="btn btn-ghost ball-giveup" onClick={onGiveUp}>
          그냥 잡기
        </button>
      )}
    </div>
  )
}
