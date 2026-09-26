import { useEffect, useRef, useState } from 'react'
import { QUIRKS } from '../lib/quirks'
import * as sfx from '../lib/sfx'
import { calculateResult } from '../lib/battle'
import { buzz } from '../lib/scanner'

export default function Battle({ character, transparent = false, easy = false, onWin }) {
  const canvasRef = useRef(null)
  
  const [timeLeft, setTimeLeft] = useState(easy ? 40 : 30)
  const [hits, setHits] = useState(0)
  const [breakouts, setBreakouts] = useState(0)
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
    
    timeLeft: easy ? 40 : 30,
    lastTime: 0,
    winPhase: 0,
    winTimer: 0,

    catchRate: 0.5,
    breakouts: 0,
    dodging: false,
    depth: 0.8,
    capturing: false,
    
    dodgeT: 2500 + Math.random() * 1500,
    dodgePhase: 0,
    dodgeTimer: 0,
    
    capture: null,
    judgements: [],
    
    initialized: false
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
      
      s.size = Math.min(s.W, s.H) * 0.24
      if (s.x === 0 && s.y === 0) {
        s.x = s.W / 2
        s.y = s.H / 2
        s.targetX = s.W / 2
        s.targetY = s.H / 2
      }
    }
    resize()
    window.addEventListener('resize', resize)
    
    s.catchRate = { chokku: 0.55, ppakku: 0.45, nokku: 0.40, heenkku: 0.35, kkumkku: 0.30 }[character.id] || 0.5
    q.init?.(s)
    
    const makeTired = (s) => {
      if (s.tired) return
      s.tired = true
      s.speed = 0
      s.visible = true
      s.shield = false
      s.decoys = []
      s.dodging = false
      s.dodgePhase = 0
      s.dodgeTimer = 0
      setTired(true)
    }

    const hitTarget = (s, q, time, b, hitR) => {
      s.hits++
      
      let judgeText = ''
      let judgeMulti = 1
      let addedScore = 50
      if (hitR <= 0.40) { judgeText = 'Excellent'; judgeMulti = 2; addedScore = 300 }
      else if (hitR <= 0.65) { judgeText = 'Great'; judgeMulti = 1.6; addedScore = 200 }
      else if (hitR <= 0.90) { judgeText = 'Nice'; judgeMulti = 1.3; addedScore = 100 }
      
      if (b.isCurve) addedScore += 100
      s.score += addedScore
      setHits(s.hits)
      
      if (judgeText || b.isCurve) {
        s.judgements.push({
          text: judgeText,
          curve: b.isCurve,
          x: s.x, y: s.y,
          life: 1000
        })
      }
      
      sfx.hit()
      buzz()
      
      if (!s.tired) q.onHit?.(s)
      
      s.capturing = true
      s.visible = false
      s.dodging = false
      s.dodgePhase = 0
      s.dodgeTimer = 0
      
      let p = s.catchRate * judgeMulti * (b.isCurve ? 1.7 : 1) * (1 + 0.15 * s.breakouts)
      if (s.tired) p = 1.0
      p = Math.min(0.95, p)
      
      s.capture = {
        x: s.x, y: s.y,
        targetY: s.H - 100,
        phase: 0,
        timer: 300,
        p: Math.pow(p, 1/3),
        shakeRot: 0
      }
      
      s.balls = []
    }

    const missTarget = (s) => {
      s.misses++
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
      
      s.t += dt
      
      if (s.timeLeft > 0 && !s.tired && !s.capturing) {
        s.timeLeft -= dt / 1000
        if (s.timeLeft <= 0) {
          s.timeLeft = 0
          makeTired(s)
        }
        setTimeLeft(Math.ceil(s.timeLeft))
      }
      
      for (let i = s.judgements.length - 1; i >= 0; i--) {
        s.judgements[i].life -= dt
        s.judgements[i].y -= dt * 0.05
        if (s.judgements[i].life <= 0) s.judgements.splice(i, 1)
      }
      
      if (s.capturing) {
        const c = s.capture
        c.timer -= dt
        if (c.phase === 0) {
          c.y += (c.targetY - c.y) * 0.2
          if (c.timer <= 0) {
            c.phase = 1; c.timer = 600
            sfx.hit(); buzz()
          }
        } else if (c.phase >= 1 && c.phase <= 3) {
          const p = 1 - Math.max(0, c.timer) / 600
          c.shakeRot = Math.sin(p * Math.PI * 4) * 0.3 * (1 - p)
          
          if (c.timer <= 0) {
            if (s.tired || Math.random() < c.p) {
              if (c.phase === 3) {
                c.phase = 4; c.timer = 500; c.shakeRot = 0
              } else {
                c.phase++; c.timer = 600
                sfx.hit(); buzz()
              }
            } else {
              s.breakouts++
              setBreakouts(s.breakouts)
              if (s.breakouts >= 3) makeTired(s)
              s.capturing = false
              s.visible = true
              sfx.miss()
              for (let i = 0; i < 20; i++) {
                s.particles.push({
                  x: c.x, y: c.y,
                  vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
                  r: 3 + Math.random() * 4,
                  life: 500 + Math.random() * 200,
                  color: '#ffffff'
                })
              }
              s.x = s.size / 2 + Math.random() * (s.W - s.size)
              s.y = s.H / 2 + Math.random() * (s.H / 2 - 100)
              q.onBreakout?.(s)
            }
          }
        } else if (c.phase === 4) {
          if (c.timer <= 0) {
            sfx.win()
            s.winPhase = 1
            s.capturing = false
            for (let i = 0; i < 30; i++) {
              s.particles.push({
                x: c.x, y: c.y,
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                r: 4 + Math.random() * 6,
                life: 600 + Math.random() * 300,
                color: '#ffdd00'
              })
            }
          }
        }
      }
      
      if (!s.capturing && !s.tired) {
        s.depth = 0.8 + Math.sin(s.t * 0.001) * 0.2
        s.targetY = s.H * 0.7 - (1 - s.depth) * (s.H * 0.4)
        
        const dx = s.targetX - s.x
        const dy = s.targetY - s.y
        const dist = Math.hypot(dx, dy)
        if (dist < 5) {
          s.targetX = s.size / 2 + Math.random() * (s.W - s.size)
        } else {
          const moveSpeed = (2 + Math.random() * 2) * s.speed
          s.vx = (dx / dist) * moveSpeed
          s.vy = (dy / dist) * moveSpeed
          s.x += s.vx * (dt / 16.67)
          s.y += s.vy * (dt / 16.67)
        }
        
        s.dodgeT -= dt
        if (s.dodgeT <= 0 && s.dodgePhase === 0) {
          s.dodgePhase = 1; s.dodgeTimer = 250
        }
        if (s.dodgePhase === 1) {
          s.dodgeTimer -= dt
          if (s.dodgeTimer <= 0) {
            s.dodgePhase = 2; s.dodgeTimer = 500; s.dodging = true
          }
        } else if (s.dodgePhase === 2) {
          s.dodgeTimer -= dt
          if (s.dodgeTimer <= 0) {
            s.dodgePhase = 0; s.dodging = false
            s.dodgeT = 2500 + Math.random() * 1500
          }
        }
        
        q.update?.(s, dt)
      } else if (s.tired) {
        s.depth = 1.0
        s.x += (s.W / 2 - s.x) * 0.05
        s.y += (s.H / 2 - s.y) * 0.05
      }
      
      const hitR = 1.0 - 0.7 * ((s.t % 1600) / 1600)
      
      for (let i = s.balls.length - 1; i >= 0; i--) {
        const b = s.balls[i]
        b.x += b.vx * (dt / 16.67)
        b.y += b.vy * (dt / 16.67)
        b.vy += 0.9 * (dt / 16.67)
        b.s = Math.max(0.35, b.s - 0.012 * (dt / 16.67))
        if (b.isCurve) {
          b.vx += b.curveDir * 0.35 * (dt / 16.67)
          b.rot = (b.rot || 0) + b.curveDir * 0.2 * (dt / 16.67)
        }
        
        let hitSomeone = false
        if (b.vy > 0 && b.s < 0.8) {
          if (s.visible && !s.dodging) {
            const effSize = s.size * s.depth
            const pad = effSize * 0.16
            if (b.x > s.x - effSize/2 + pad && b.x < s.x + effSize/2 - pad &&
                b.y > s.y - effSize/2 + pad && b.y < s.y + effSize/2 - pad) {
              hitSomeone = true
              if (!b.judged) {
                b.judged = true
                if (s.shield) missTarget(s)
                else hitTarget(s, q, time, b, hitR)
              }
            }
          }
          if (!hitSomeone && s.decoys?.length) {
            for (let j = 0; j < s.decoys.length; j++) {
              const dec = s.decoys[j]
              const effSize = s.size * s.depth
              const pad = effSize * 0.16
              if (b.x > dec.x - effSize/2 + pad && b.x < dec.x + effSize/2 - pad &&
                  b.y > dec.y - effSize/2 + pad && b.y < dec.y + effSize/2 - pad) {
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
          if (!hitSomeone && !b.judged && !s.capturing) {
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
      
      draw(ctx, s, q, hitR)
    }

    const drawWin = (ctx, s, dt) => {
      ctx.clearRect(0, 0, s.W, s.H)
      s.winTimer += dt
      ctx.save()
      
      for (const p of s.particles) {
        p.x += p.vx * (dt/16.67); p.y += p.vy * (dt/16.67); p.life -= dt
        if (p.life > 0) {
          ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 600
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      
      if (s.winTimer < 1000) {
        const p = s.winTimer / 1000
        const c = s.capture || { x: s.W/2, y: s.H/2 }
        ctx.translate(c.x, c.y)
        ctx.scale(1 - p, 1 - p)
        ctx.globalAlpha = 1 - p
        drawBall(ctx, character.color, 0)
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
    
    const drawBall = (ctx, color, rot = 0) => {
      ctx.save()
      ctx.rotate(rot)
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI, Math.PI * 2); ctx.fillStyle = color || '#ff0000'; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke()
      ctx.restore()
    }

    const draw = (ctx, s, q, hitR) => {
      if (!transparent) {
        ctx.fillStyle = character.colorLight || '#ffffff'
        ctx.fillRect(0, 0, s.W, s.H)
      } else {
        ctx.clearRect(0, 0, s.W, s.H)
      }
      ctx.save()
      
      const drawChar = (cx, cy, isDecoy) => {
        ctx.save()
        ctx.translate(cx, cy)
        
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.beginPath()
        ctx.ellipse(0, s.size * s.depth * 0.4, s.size * s.depth * 0.4, s.size * s.depth * 0.15, 0, 0, Math.PI * 2)
        ctx.fill()
        
        let jumpOffset = 0
        if (s.dodgePhase === 1) {
          ctx.scale(1.2, 0.5)
          ctx.translate(0, s.size * s.depth * 0.25)
        } else if (s.dodgePhase === 2) {
          jumpOffset = -s.size * s.depth * 0.5 * Math.sin( (1 - s.dodgeTimer/500) * Math.PI )
          ctx.translate(0, jumpOffset)
        }
        
        const d = isDecoy ? 1.0 : s.depth
        const effSize = s.size * d
        if (s.image) {
          ctx.drawImage(s.image, -effSize/2, -effSize/2, effSize, effSize)
        } else {
          ctx.fillStyle = character.color || '#ff0000'
          ctx.beginPath(); ctx.arc(0, 0, effSize/2, 0, Math.PI * 2); ctx.fill()
        }
        
        if (!isDecoy && !s.tired && s.visible) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(0, 0, effSize/2, 0, Math.PI * 2); ctx.stroke()
          
          let ringColor = s.catchRate >= 0.45 ? '#0f0' : s.catchRate >= 0.35 ? '#ff0' : '#f00'
          ctx.strokeStyle = ringColor
          ctx.lineWidth = 4
          ctx.beginPath(); ctx.arc(0, 0, (effSize/2) * hitR, 0, Math.PI * 2); ctx.stroke()
        }
        ctx.restore()
      }
      
      if (s.visible) drawChar(s.x, s.y, false)
      if (s.decoys) {
        for (const dec of s.decoys) drawChar(dec.x, dec.y, true)
      }
      q.draw?.(ctx, s)
      
      for (const p of s.particles) {
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life / 500)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      
      if (s.capturing && s.capture) {
        const c = s.capture
        ctx.save()
        ctx.translate(c.x, c.y)
        drawBall(ctx, character.color, c.shakeRot || 0)
        ctx.restore()
      }
      
      for (const b of s.balls) {
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.scale(b.s, b.s)
        drawBall(ctx, character.color, b.rot || 0)
        ctx.restore()
      }
      
      if (drag.current && drag.current.samples.length > 0) {
        const b = drag.current.samples[drag.current.samples.length - 1]
        ctx.save()
        ctx.translate(b.cx, b.cy)
        drawBall(ctx, character.color, drag.current.totalAngle || 0)
        ctx.restore()
      }
      
      for (const j of s.judgements) {
        ctx.save()
        ctx.translate(j.x, j.y - (1000 - j.life) * 0.05)
        ctx.globalAlpha = Math.max(0, j.life / 1000)
        ctx.fillStyle = '#ff7a45'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 4
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        
        let text = j.text
        if (j.curve) text += (text ? ' + ' : '') + '커브볼!'
        
        ctx.strokeText(text, 0, 0)
        ctx.fillText(text, 0, 0)
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
    drag.current = { 
      id: e.pointerId, sx: e.clientX, sy: e.clientY, 
      samples: [], totalAngle: 0, lastAngle: undefined 
    }
  }
  
  const onMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const cx = e.clientX
    const cy = e.clientY
    const x = cx - d.sx
    const y = cy - d.sy
    
    const currentAngle = Math.atan2(y, x)
    if (d.lastAngle !== undefined && Math.hypot(x, y) > 10) {
      let diff = currentAngle - d.lastAngle
      if (diff > Math.PI) diff -= 2 * Math.PI
      if (diff < -Math.PI) diff += 2 * Math.PI
      d.totalAngle += diff
    }
    if (Math.hypot(x, y) > 10) d.lastAngle = currentAngle
    
    d.samples.push({ x, y, t: performance.now(), cx, cy })
    if (d.samples.length > 6) d.samples.shift()
  }
  
  const onUp = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const s = stateRef.current
    if (s.winPhase > 0 || s.capturing) return
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
    
    const isCurve = Math.abs(d.totalAngle) >= 2 * Math.PI
    const curveDir = d.totalAngle > 0 ? 1 : -1
    
    sfx.throwBall()
    s.balls.push({ x: b.cx, y: b.cy, vx, vy, s: 1, isCurve, curveDir, rot: d.totalAngle })
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
        <div style={{ display: 'flex', gap: 4, fontWeight: 'bold', fontSize: 18, textShadow: transparent ? '1px 1px 2px #000' : 'none' }}>
          포획 시도 {hits} · 탈출 {breakouts}/3
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
    </div>
  )
}

