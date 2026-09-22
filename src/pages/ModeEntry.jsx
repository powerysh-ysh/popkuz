import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { MODES, setMode } from '../lib/mode'

/**
 * 모드 진입점 — /expo 또는 /store 로 들어오면 그 모드로 전환하고 홈으로 보냅니다.
 *
 * 모드를 주소로 정하는 이유: 인쇄한 QR이 모드를 결정하므로 관람객이
 * 아무 설정도 하지 않아도 되고, 두 행사를 같은 기간에 운영해도 섞이지
 * 않습니다.
 */
export default function ModeEntry() {
  const { id } = useParams()
  const ok = Boolean(MODES[id])

  useEffect(() => {
    if (ok) setMode(id)
  }, [ok, id])

  return <Navigate to="/" replace />
}
