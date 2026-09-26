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
    if (!raw) return 0
    const data = JSON.parse(raw)
    return Object.values(data).reduce((acc, curr) => acc + (curr.score || 0), 0)
  } catch {
    return 0
  }
}
