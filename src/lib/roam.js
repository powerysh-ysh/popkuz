import { useCallback, useEffect, useRef } from 'react'

/**
 * 발견한 팝꾸즈를 화면 안에서 돌아다니게 합니다.
 *
 * 제자리에서 뛰기만 하면 "맞추기만 하면 되는" 과녁이 됩니다. 살아있는
 * 걸 쫓는 느낌을 내려면 스스로 자리를 옮겨 다녀야 합니다.
 *
 * 왜 React state 가 아니라 DOM 을 직접 만지나요?
 *   1초에 60번 setState 를 하면 화면 전체가 다시 그려져서 구형 폰에서
 *   버벅입니다. 위치만 바꾸면 되므로 transform 만 직접 씁니다.
 *
 * 공을 던지는 "도중에" 피하지는 않습니다. 날아가는 공을 피해버리면
 * 실력과 무관하게 안 맞아서 금방 재미없어집니다. 대신 빗나갔을 때
 * 놀라서 멀리 튀고(startle), 놓칠수록 조금씩 빨라집니다.
 */

const BASE_SPEED = 3.1 // 프레임당 px (60fps 기준)
const SPEED_PER_MISS = 0.8
const MAX_SPEED = 8
const ARRIVE = 12 // 이 거리 안에 들어오면 도착으로 봅니다
const PAUSE_MS = [90, 320] // 도착 후 잠깐 멈칫하는 시간
/** 가끔 목적지에 닿기도 전에 방향을 홱 틉니다 (예측을 막습니다) */
const SWERVE_MS = [600, 1400]

const rand = (a, b) => a + Math.random() * (b - a)

/** 화면 밖으로 나가지 않게 움직일 수 있는 범위를 구합니다. */
function bounds() {
  const w = typeof window === 'undefined' ? 375 : window.innerWidth
  const h = typeof window === 'undefined' ? 812 : window.innerHeight
  return {
    // 캐릭터가 168px 이라 예전(240px)보다 훨씬 넓게 다닐 수 있습니다.
    x: Math.max(60, Math.min(190, (w - 168) / 2 - 8)),
    y: Math.max(70, Math.min(150, h * 0.13)),
  }
}

/**
 * @param {object} ref      움직일 요소 (scan-target)
 * @param {boolean} active  돌아다닐지 여부 (잡히면 false)
 */
export function useRoam(ref, active) {
  const st = useRef({ x: 0, y: 0, tx: 0, ty: 0, level: 0, waitUntil: 0 })
  const raf = useRef(0)

  /** 다음 목적지를 고릅니다. 지금 자리에서 너무 가까우면 다시 고릅니다. */
  const retarget = useCallback((far = false) => {
    const b = bounds()
    const s = st.current
    for (let i = 0; i < 6; i++) {
      const tx = rand(-b.x, b.x)
      const ty = rand(-b.y, b.y)
      const d = Math.hypot(tx - s.x, ty - s.y)
      if (d > (far ? b.x : b.x * 0.55)) {
        s.tx = tx
        s.ty = ty
        return
      }
    }
    s.tx = -s.x
    s.ty = rand(-b.y, b.y)
  }, [])

  /** 빗나갔을 때 — 놀라서 멀리 튀고 조금 빨라집니다. */
  const startle = useCallback(() => {
    st.current.level = Math.min(6, st.current.level + 1)
    st.current.waitUntil = 0
    st.current.swerveAt = 0
    retarget(true)
  }, [retarget])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 움직임을 줄여달라고 설정한 분에게는 흔들지 않습니다.
    const still =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (still) {
      el.style.transform = ''
      return
    }
    // 잡혔을 때는 그 자리에 그대로 둡니다. 가운데로 되돌리면 순간이동처럼
    // 툭 튀어서 잡은 맛이 사라집니다.
    if (!active) {
      cancelAnimationFrame(raf.current)
      return
    }

    // 새로 나타날 때마다 가운데에서 시작합니다.
    st.current = { x: 0, y: 0, tx: 0, ty: 0, level: 0, waitUntil: 0, swerveAt: 0 }
    retarget(true)

    let last = performance.now()
    const step = (now) => {
      const s = st.current
      const dt = Math.min(48, now - last) / 16.67 // 프레임 보정
      last = now

      // 한 점으로 곧장 가기만 하면 다음 위치가 읽힙니다. 도착 전에도
      // 이따금 방향을 바꿔야 "쫓는" 느낌이 납니다.
      if (now >= s.swerveAt) {
        s.swerveAt = now + rand(SWERVE_MS[0], SWERVE_MS[1])
        if (s.swerveAt > 0 && Math.random() < 0.7) retarget()
      }

      if (now >= s.waitUntil) {
        const dx = s.tx - s.x
        const dy = s.ty - s.y
        const dist = Math.hypot(dx, dy)

        if (dist < ARRIVE) {
          // 잠깐 멈칫했다가 다음 자리로 — 계속 미끄러지면 기계처럼 보입니다.
          s.waitUntil = now + rand(PAUSE_MS[0], PAUSE_MS[1])
          retarget()
        } else {
          const speed = Math.min(MAX_SPEED, BASE_SPEED + s.level * SPEED_PER_MISS)
          const move = Math.min(dist, speed * dt)
          s.x += (dx / dist) * move
          s.y += (dy / dist) * move
        }
      }

      el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf.current)
  }, [ref, active, retarget])

  return { startle }
}
