'use strict';

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from','in','is','it','of','on','or','that','the','this','to','was','were','with',
  'hai','ka','ki','ke','ko','mein','me','par','se','aur','ye','woh','hai','tha','the','near','area','road','street'
]);

function tokenize(value) {
  return String(value || '').toLowerCase().normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/u)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

// Cosine similarity over term-frequency vectors. This deterministic baseline is
// intentionally explainable; embeddings/semantic similarity remain a later upgrade.
function cosineSimilarity(left, right) {
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.length || !b.length) return 0;
  const tf = (words) => {
    const map = new Map();
    for (const word of words) map.set(word, (map.get(word) || 0) + 1);
    return map;
  };
  const va = tf(a);
  const vb = tf(b);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const value of va.values()) normA += value * value;
  for (const value of vb.values()) normB += value * value;
  for (const [word, value] of va) dot += value * (vb.get(word) || 0);
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function mergeBand(score, { high = 0.85, medium = 0.65 } = {}) {
  if (score >= high) return 'high';
  if (score >= medium) return 'medium';
  return 'low';
}

module.exports = { tokenize, cosineSimilarity, mergeBand };
