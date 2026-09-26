export function calculateResult({ baseScore, hits, misses, timeLeft, tired }) {
  let finalScore = baseScore + Math.floor(timeLeft) * 10 - misses * 20
  if (finalScore < 0) finalScore = 0
  
  let grade = 'C'
  if (!tired) {
    if (finalScore >= 500) grade = 'S'
    else if (finalScore >= 350) grade = 'A'
    else if (finalScore >= 200) grade = 'B'
  }
  
  return {
    score: finalScore,
    grade,
    hits,
    misses,
    timeLeft
  }
}
