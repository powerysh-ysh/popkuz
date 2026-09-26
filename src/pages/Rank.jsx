import { useEffect, useState } from 'react'
import { modeConfig } from '../lib/mode'
import { fetchTop, syncEnabled } from '../lib/sync'

export default function Rank() {
  const [top, setTop] = useState([])
  const cfg = modeConfig()
  const base = import.meta.env.BASE_URL

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!syncEnabled) return
      const data = await fetchTop(10)
      if (!mounted) return
      setTop(data)
    }
    load()
    const timer = setInterval(load, 15000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

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
      <h1 style={{ fontSize: '48px', marginBottom: '40px', color: '#fff' }}>
        오늘의 박스 오프너 TOP 10
      </h1>

      {!syncEnabled ? (
        <div style={{ fontSize: '32px', color: '#ff6b6b', margin: 'auto' }}>
          랭킹 서버에 연결되지 않았어요
        </div>
      ) : (
        <table style={{ width: '80%', maxWidth: '900px', borderCollapse: 'collapse', marginBottom: '40px' }}>
          <tbody>
            {top.map((row, i) => {
              const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
              const color = colors[i] || '#ffffff'
              return (
                <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ fontSize: '36px', padding: '16px', color, fontWeight: 'bold', width: '15%', textAlign: 'center' }}>
                    {i + 1}
                  </td>
                  <td style={{ fontSize: '36px', padding: '16px', color }}>
                    {row.nickname || '익명 오프너'}
                  </td>
                  <td style={{ fontSize: '36px', padding: '16px', color, textAlign: 'right', fontWeight: 'bold' }}>
                    {row.score}점
                  </td>
                </tr>
              )
            })}
            {top.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '40px', fontSize: '28px', color: '#666' }}>
                  아직 오늘의 완주자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={`${base}qr/join-${cfg.id}.png`}
          alt="join qr"
          width={160}
          height={160}
          style={{ borderRadius: '16px', backgroundColor: '#fff', padding: '8px' }}
        />
        <div style={{ marginTop: '12px', fontSize: '20px', color: '#aaa' }}>
          QR을 찍어 도전하세요!
        </div>
      </div>
    </div>
  )
}
