import { useEffect, useState } from 'react'
import { fetchDailyStats, fetchHourlyToday, syncEnabled } from '../lib/sync'

export default function Stats() {
  const [daily, setDaily] = useState(null)
  const [hourly, setHourly] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!syncEnabled) {
        if (mounted) setLoaded(true)
        return
      }
      const dStats = await fetchDailyStats()
      const hStats = await fetchHourlyToday()
      if (!mounted) return
      setDaily(dStats)
      setHourly(hStats)
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      setLastUpdated(`${hh}:${mm}:${ss}`)
      setLoaded(true)
    }
    load()
    const timer = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#aaa' }}>불러오는 중…</h1>
      </div>
    )
  }

  if (!syncEnabled || daily === null || hourly === null) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#ff6b6b' }}>통계를 불러오지 못했어요</h1>
      </div>
    )
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const todayDaily = daily.find(d => d.day === todayStr) || { started: 0, played: 0, completed: 0, catches: 0 }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ fontSize: '36px', marginBottom: '8px', color: '#fff' }}>참여 통계</h1>
      <div style={{ fontSize: '18px', color: '#aaa', marginBottom: '40px' }}>
        마지막 갱신 {lastUpdated || '-'}
      </div>

      {/* 오늘 요약 카드 */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '48px', width: '100%', maxWidth: '900px', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', color: '#aaa', marginBottom: '12px' }}>오늘 시작</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#4dabf7' }}>{todayDaily.started}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', color: '#aaa', marginBottom: '12px' }}>1마리 이상 잡음 (참여)</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffd43b' }}>{todayDaily.played}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', color: '#aaa', marginBottom: '12px' }}>완주 (키캡 대상)</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#51cf66' }}>{todayDaily.completed}</div>
        </div>
      </div>

      {/* 오늘 시간대별 막대 그래프 */}
      <div style={{ width: '100%', maxWidth: '900px', marginBottom: '64px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>오늘 시간대별 시작 인원</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '4px', paddingTop: '20px' }}>
          {hourly.map(h => {
            const maxStarted = Math.max(1, ...hourly.map(x => x.started))
            const heightPct = (h.started / maxStarted) * 100
            // 영업시간 위주로 보여주되 전부 렌더링해도 무방
            return (
              <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ width: '100%', backgroundColor: '#4dabf7', height: `${heightPct}%`, minHeight: h.started > 0 ? '4px' : '0' }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>{h.hour}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 날짜별 표 */}
      <div style={{ width: '100%', maxWidth: '900px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>날짜별 기록</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ color: '#aaa', borderBottom: '2px solid #444' }}>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>날짜</th>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>시작</th>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>참여</th>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>완주</th>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>잡은 수</th>
              <th style={{ padding: '12px', fontWeight: 'normal' }}>완주율</th>
            </tr>
          </thead>
          <tbody>
            {daily.map(d => {
              const rate = d.started > 0 ? ((d.completed / d.started) * 100).toFixed(1) + '%' : '-'
              return (
                <tr key={d.day} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '16px' }}>{d.day}</td>
                  <td style={{ padding: '16px' }}>{d.started}</td>
                  <td style={{ padding: '16px' }}>{d.played}</td>
                  <td style={{ padding: '16px' }}>{d.completed}</td>
                  <td style={{ padding: '16px' }}>{d.catches}</td>
                  <td style={{ padding: '16px' }}>{rate}</td>
                </tr>
              )
            })}
            {daily.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', color: '#666' }}>데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
