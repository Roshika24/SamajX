'use strict';

function clamp01(val) {
  const n = Number(val);
  if (Number.isNaN(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function scoreApplication({ levelScore, domainFit, proposalScore, difficulty, distanceKm }, config) {
  const weights = config.scoring[difficulty || 'medium'];
  if (!weights) throw new TypeError('Unsupported difficulty');
  const level = clamp01(Number(levelScore) / config.scoring.maxLevelScore);
  const domain = clamp01(domainFit);
  const proposal = clamp01(Number(proposalScore ?? config.scoring.defaultProposalScore) / 5);

  // If university is far away (> 150 km), apply a modest distance penalty so closer universities rank higher
  const isFarAway = distanceKm != null && Number(distanceKm) > 150;
  const distancePenalty = isFarAway ? 0.05 : 0;
  const baseScore = level * weights.level + domain * weights.domain + proposal * weights.proposal;
  const total = clamp01(baseScore - distancePenalty);

  return {
    score: Number(total.toFixed(4)),
    breakdown: {
      level: Number(levelScore) || 0,
      level_normalized: Number(level.toFixed(4)),
      domain_fit: Number(domain.toFixed(4)),
      proposal_score: Number(proposalScore ?? config.scoring.defaultProposalScore),
      distance_km: distanceKm != null ? Number(distanceKm) : null,
      is_far_away: isFarAway,
      distance_penalty: distancePenalty,
      weights,
      total: Number(total.toFixed(4)),
    },
  };
}

module.exports = { scoreApplication, clamp01 };
