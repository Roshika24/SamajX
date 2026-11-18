/** Pure level calculation, shared by production logic and unit tests. */
function calculateLevel(scores = [], thresholds) {
  const values = scores.map(Number).filter(Number.isFinite);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  let level = 'beginner';
  if (average >= thresholds.beginnerMax && average <= thresholds.intermediateMax) level = 'intermediate';
  else if (average > thresholds.intermediateMax) level = 'advanced';
  const nextThreshold = level === 'beginner' ? thresholds.beginnerMax : level === 'intermediate' ? thresholds.intermediateMax : null;
  return { level, average: Number(average.toFixed(2)), nextThreshold, progress: nextThreshold === null ? 100 : Math.min(100, Math.round((average / nextThreshold) * 100)) };
}
module.exports = { calculateLevel };
