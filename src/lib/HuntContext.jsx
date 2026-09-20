import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as storage from './storage'
import { syncCatch, syncDone, syncHunter } from './sync'
import { TOTAL } from '../data/characters'

const Ctx = createContext(null)

export function HuntProvider({ children }) {
  const [state, setState] = useState(() => storage.load())

  const start = useCallback((nickname) => {
    const next = storage.startHunt(nickname)
    setState(next)
    syncHunter(next) // 실패해도 무시 (await 하지 않음)
    return next
  }, [])

  const capture = useCallback((id) => {
    const { state: next, isNew } = storage.addCatch(id)
    setState(next)
    if (isNew) {
      // 닉네임 없이 QR부터 찍은 사람도 참여자로 세야 하므로 함께 기록합니다.
      syncHunter(next)
      syncCatch(next, id)
    }
    return { state: next, isNew }
  }, [])

  const finish = useCallback(() => {
    const next = storage.markDone()
    setState(next)
    syncDone(next)
    return next
  }, [])

  const resetAll = useCallback(() => {
    setState(storage.reset())
  }, [])

  const value = useMemo(() => {
    const count = state.caught.length
    return {
      state,
      start,
      capture,
      finish,
      resetAll,
      count,
      total: TOTAL,
      complete: count >= TOTAL,
      started: Boolean(state.nickname),
      has: (id) => storage.hasCaught(state, id),
      code: storage.completionCode(state),
    }
  }, [state, start, capture, finish, resetAll])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHunt() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useHunt must be used inside <HuntProvider>')
  return v
}
