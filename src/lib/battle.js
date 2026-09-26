export function calculateResult({ baseScore, hits, misses, timeLeft, tired }) {
  let finalScore = baseScore + Math.floor(timeLeft) * 10 - misses * 20;
  if (hits === 1 && misses === 0) finalScore += 300;
  if (finalScore < 0) finalScore = 0;
  
  let grade = 'C';
  if (!tired) {
    if (finalScore >= 700) grade = 'S';
    else if (finalScore >= 450) grade = 'A';
    else if (finalScore >= 250) grade = 'B';
  }
  
  return {
    score: finalScore,
    grade,
    hits,
    misses,
    timeLeft
  };
}
