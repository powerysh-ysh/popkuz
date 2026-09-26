import { useEffect, useRef, useState } from 'react'
import { QUIRKS } from '../lib/quirks'
import * as sfx from '../lib/sfx'
import { calculateResult } from '../lib/battle'
import { buzz } from '../lib/scanner'

export default function Battle({ character, transparent = false, easy = false, onWin }) {
  const canvasRef = useRef(null)
  
  const [timeLeft, setTimeLeft] = useState(easy ? 40 : 30)
  const [hp, setHp] = useState(3)
  const [maxHp, setMaxHp] = useState(3)
  const [combo, setCombo] = useState(1)
  const [tired, setTired] = useState(false)
  const [label, setLabel] = useState('')
  const [ended, setEnded] = useState(false)
  
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin
  
  const stateRef = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 100,
    speed: easy ? 0.7 : 1,
    hp: 3, maxHp: 3,
    visible: true,
    shield: false,
    decoys: [],
    tired: false,
    t: 0,
    W: 0, H: 0,
    
    targetX: 0, targetY: 0,
    image: null,
    
    balls: [], 
    particles: [],
    
    hitStopUntil: 0,
    shakeFrames: 0,
    
    score: 0,
    misses: 0,
    hits: 0,
    combo: 1,
    
    timeLeft: easy ? 40 : 30,
    lastTime: 0,
    winPhase: 0,
    winTimer: 0
  })

  useEffect(() => {
    const s = stateRef.current
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}characters/${character.id}.webp`
    img.onload = () => { s.image = img }
  }, [character.id])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    const q = QUIRKS[character.id] || {}
    
    setLabel(q.label || '')
    
    let reqId
    
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      s.W = rect.width
      s.H = rect.height
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      
      s.size = Math.min(s.W, s.H) * 0.34
      if (s.x === 0 && s.y === 0) {
        s.x = s.W / 2
        s.y = s.H / 2
        s.targetX = s.W / 2
        s.targetY = s.H / 2
      }
    }
    resize()
    window.addEventListener('resize', resize)
    
    q.init?.(s)
    setMaxHp(s.maxHp)
    setHp(s.hp)
    
    const makeTired = (s) => {
      if (s.tired) return
      s.tired = true
      s.speed = 0
      s.hp = 1
      s.visible = true
      s.shield = false
      s.decoys = []
      setTired(true)
      setHp(1)
    }

    const hitTarget = (s, q, time) => {
      s.hits++
      s.score += 100 * s.combo
      s.combo++
      s.hp--
      
      setHp(s.hp)
      setCombo(s.combo)
      
      s.hitStopUntil = time + 80
      s.shakeFrames = 10
      
      sfx.hit()
      buzz()
      
      for (let i = 0; i < 15; i++) {
        s.particles.push({
          x: s.x, y: s.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          r: 3 + Math.random() * 4,
          life: 500 + Math.random() * 200,
          color: character.color || '#ff0000'
        })
      }
      
      if (!s.tired) q.onHit?.(s)
      
      if (s.hp <= 0) {
        sfx.win()
        s.winPhase = 1
      }
    }

    const missTarget = (s) => {
      s.misses++
      s.combo = 1
      setCombo(1)
      sfx.miss()
      if (s.misses >= 6) makeTired(s)
    }
    
    const step = (time) => {
      reqId = requestAnimationFrame(step)
      if (!s.lastTime) s.lastTime = time
      const dt = time - s.lastTime
      s.lastTime = time
      
      if (s.winPhase > 0) {
        drawWin(ctx, s, dt)
        return
      }
      
      if (time >= s.hitStopUntil) {
        s.t += dt
        if (s.timeLeft > 0 && !s.tired) {
          s.timeLeft -= dt / 1000
          if (s.timeLeft <= 0) {
            s.timeLeft = 0
            makeTired(s)
          }
          setTimeLeft(Math.ceil(s.timeLeft))
        }
        
        if (!s.tired) {
          const dx = s.targetX - s.x
          const dy = s.targetY - s.y
          const dist = Math.hypot(dx, dy)
          if (dist < 5) {
            s.targetX = s.size / 2 + Math.random() * (s.W - s.size)
            s.targetY = s.size / 2 + Math.random() * (s.H - s.size - 100)
          } else {
            const moveSpeed = (2 + Math.random() * 2) * s.speed
            s.vx = (dx / dist) * moveSpeed
            s.vy = (dy / dist) * moveSpeed
            s.x += s.vx * (dt / 16.67)
            s.y += s.vy * (dt / 16.67)
          }
          q.update?.(s, dt)
        }
        
        for (let i = s.balls.length - 1; i >= 0; i--) {
          const b = s.balls[i]
          b.x += b.vx * (dt / 16.67)
          b.y += b.vy * (dt / 16.67)
          b.vy += 0.9 * (dt / 16.67)
          b.s = Math.max(0.35, b.s - 0.012 * (dt / 16.67))
          
          let hitSomeone = false
          if (b.vy > 0 && b.s < 0.8) {
            if (s.visible) {
              const pad = s.size * 0.16
              if (b.x > s.x - s.size/2 + pad && b.x < s.x + s.size/2 - pad &&
                  b.y > s.y - s.size/2 + pad && b.y < s.y + s.size/2 - pad) {
                hitSomeone = true
                if (!b.judged) {
                  b.judged = true
                  if (s.shield) missTarget(s)
                  else hitTarget(s, q, time)
                }
              }
            }
            if (!hitSomeone && s.decoys?.length) {
              for (let j = 0; j < s.decoys.length; j++) {
                const dec = s.decoys[j]
                const pad = s.size * 0.16
                if (b.x > dec.x - s.size/2 + pad && b.x < dec.x + s.size/2 - pad &&
                    b.y > dec.y - s.size/2 + pad && b.y < dec.y + s.size/2 - pad) {
                  hitSomeone = true
                  if (!b.judged) {
                    b.judged = true
                    missTarget(s)
                  }
                  s.decoys.splice(j, 1)
                  break
                }
              }
            }
          }
          if (hitSomeone || b.y > s.H + 50 || b.s <= 0.35) {
            if (!hitSomeone && !b.judged) {
              b.judged = true
              missTarget(s)
            }
            s.balls.splice(i, 1)
          }
        }
        
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i]
          p.x += p.vx * (dt/16.67)
          p.y += p.vy * (dt/16.67)
          p.life -= dt
          if (p.life <= 0) s.particles.splice(i, 1)
        }
      }
      
      draw(ctx, s, q)
    }

    const drawWin = (ctx, s, dt) => {
      ctx.clearRect(0, 0, s.W, s.H)
      s.winTimer += dt
      ctx.save()
      if (s.winTimer < 1000) {
        const p = s.winTimer / 1000
        ctx.translate(s.W / 2, s.H / 2)
        const shake = Math.sin(p * Math.PI * 6) * 10 * (1 - p)
        ctx.translate(shake, 0)
        ctx.scale(1 - p, 1 - p)
        ctx.globalAlpha = 1 - p
        if (s.image) {
          ctx.drawImage(s.image, -s.size/2, -s.size/2, s.size, s.size)
        } else {
          ctx.fillStyle = character.color || '#ff0000'
          ctx.beginPath()
          ctx.arc(0, 0, s.size/2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        if (!s.ended) {
          s.ended = true
          setEnded(true)
          const result = calculateResult({
            baseScore: s.score, hits: s.hits, misses: s.misses, 
            timeLeft: s.timeLeft, tired: s.tired
          })
          onWinRef.current(result)
        }
      }
      ctx.restore()
    }

    const draw = (ctx, s, q) => {
      if (!transparent) {
        ctx.fillStyle = character.colorLight || '#ffffff'
        ctx.fillRect(0, 0, s.W, s.H)
      } else {
        ctx.clearRect(0, 0, s.W, s.H)
      }
      ctx.save()
      if (s.shakeFrames > 0) {
        s.shakeFrames--
        const shakeX = (Math.random() - 0.5) * 10
        const shakeY = (Math.random() - 0.5) * 10
        ctx.translate(shakeX, shakeY)
      }
      const drawChar = (cx, cy, isDecoy) => {
        ctx.save()
        ctx.translate(cx, cy)
        if (!isDecoy && s.hitStopUntil > performance.now()) {
          ctx.scale(1.2, 0.8)
        }
        if (s.image) {
          ctx.drawImage(s.image, -s.size/2, -s.size/2, s.size, s.size)
        } else {
          ctx.fillStyle = character.color || '#ff0000'
          ctx.beginPath()
          ctx.arc(0, 0, s.size/2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      if (s.visible) drawChar(s.x, s.y, false)
      if (s.decoys) {
        for (const dec of s.decoys) drawChar(dec.x, dec.y, true)
      }
      q.draw?.(ctx, s)
      for (const p of s.particles) {
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life / 500
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      for (const b of s.balls) {
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.scale(b.s, b.s)
        ctx.beginPath()
        ctx.arc(0, 0, 20, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, 0, 20, Math.PI, Math.PI * 2)
        ctx.fillStyle = character.color || '#ff0000'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#000'
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()
    }
    
    reqId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(reqId)
      window.removeEventListener('resize', resize)
    }
  }, [character.id, transparent, easy])
  
  const drag = useRef(null)
  
  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, samples: [] }
  }
  
  const onMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.sx
    const y = e.clientY - d.sy
    d.samples.push({ x, y, t: performance.now(), cx: e.clientX, cy: e.clientY })
    if (d.samples.length > 6) d.samples.shift()
  }
  
  const onUp = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const s = stateRef.current
    if (s.winPhase > 0) return
    const samples = d.samples
    if (samples.length < 2) return
    const a = samples[0]
    const b = samples[samples.length - 1]
    const dt = Math.max(16, b.t - a.t)
    let vx = ((b.x - a.x) / dt) * 14
    let vy = ((b.y - a.y) / dt) * 14
    if (vy > -6) return
    vx = Math.max(-26, Math.min(26, vx))
    vy = Math.max(-46, vy)
    sfx.throwBall()
    s.balls.push({ x: b.cx, y: b.cy, vx, vy, s: 1 })
  }

  return (
    <div className="battle" style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', color: transparent ? '#fff' : '#000', pointerEvents: 'none' }}>
        <div style={{ fontSize: 24, fontWeight: 'bold' }}>🕒 {timeLeft}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: maxHp }).map((_, i) => (
            <div key={i} style={{
              width: 24, height: 24, borderRadius: '50%', 
              background: i < hp ? '#ff4d4f' : 'rgba(0,0,0,0.3)', border: '2px solid #fff'
            }} />
          ))}
        </div>
      </div>
      {label && !tired && (
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: 16, fontSize: 14 }}>
            {label}
          </span>
        </div>
      )}
      {tired && (
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ background: 'rgba(0,0,0,0.6)', color: '#ff4d4f', padding: '4px 12px', borderRadius: 16, fontSize: 14 }}>
            지쳤다! 지금이 기회예요!
          </span>
        </div>
      )}
      {combo > 1 && (
        <div style={{ position: 'absolute', top: 100, left: 20, color: '#ff7a45', fontWeight: 'bold', fontSize: 20, pointerEvents: 'none', textShadow: '1px 1px 0 #fff' }}>
          {combo} COMBO!
        </div>
      )}
    </div>
  )
}
