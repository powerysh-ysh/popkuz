import { useEffect, useState } from 'react'
import { isMuted, setMuted } from '../lib/sfx'

export default function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted())
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    const handleStorage = () => {
      setMutedState(isMuted())
    }
    window.addEventListener('storage', handleStorage)
    
    let seenTip = null
    try {
      seenTip = localStorage.getItem('popkkus.sound.tip')
    } catch (e) {}
    
    if (!seenTip) {
      setShowTip(true)
      try {
        localStorage.setItem('popkkus.sound.tip', '1')
      } catch (e) {}
      const timer = setTimeout(() => setShowTip(false), 4000)
      return () => {
        window.removeEventListener('storage', handleStorage)
        clearTimeout(timer)
      }
    }

    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    setShowTip(false)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      right: 'calc(16px + env(safe-area-inset-right))',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      {showTip && (
        <div style={{
          backgroundColor: '#333',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          아이폰은 무음 모드면 소리가 안 나요
        </div>
      )}
      <button
        onClick={toggle}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          padding: 0
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
