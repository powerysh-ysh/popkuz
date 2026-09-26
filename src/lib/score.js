export function saveScore(id, result) {
  try {
    const raw = localStorage.getItem('popkkus.score.v1')
    const data = raw ? JSON.parse(raw) : {}
    const prev = data[id]?.score || -1
    if (result.score > prev) {
      data[id] = { score: result.score, grade: result.grade, at: new Date().toISOString() }
      localStorage.setItem('popkkus.score.v1', JSON.stringify(data))
    }
  } catch {
    // ignore
  }
}

export function bestOf(id) {
  try {
    const raw = localStorage.getItem('popkkus.score.v1')
    if (!raw) return null
    const data = JSON.parse(raw)
    return data[id] || null
  } catch {
    return null
  }
}

export function totalScore() {
  try {
    const raw = localStorage.getItem('popkkus.score.v1')
    let baseScore = 0
    if (raw) {
      const data = JSON.parse(raw)
      baseScore = Object.values(data).reduce((acc, curr) => acc + (curr.score || 0), 0)
    }
    const total = baseScore + bonusTotal()
    return total < 0 ? 0 : total
  } catch {
    const total = bonusTotal()
    return total < 0 ? 0 : total
  }
}

export function addBonus(n, reason) {
  try {
    const raw = localStorage.getItem('popkkus.bonus.v1')
    const data = raw ? JSON.parse(raw) : { total: 0, log: [] }
    data.total += n
    data.log.unshift({ n, reason, at: new Date().toISOString() })
    if (data.log.length > 50) {
      data.log = data.log.slice(0, 50)
    }
    localStorage.setItem('popkkus.bonus.v1', JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function bonusTotal() {
  try {
    const raw = localStorage.getItem('popkkus.bonus.v1')
    if (!raw) return 0
    const data = JSON.parse(raw)
    return data.total || 0
  } catch {
    return 0
  }
}
