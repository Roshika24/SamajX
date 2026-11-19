
'use strict';

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function scoreApplication({ levelScore, domainFit, proposalScore, difficulty }, config) {
  const weights = config.scoring[difficulty || 'medium'];
  if (!weights) throw new TypeError('Unsupported difficulty');
  const level = clamp01(Number(levelScore) / config.scoring.maxLevelScore);
  const domain = clamp01(domainFit);
  const proposal = clamp01(Number(proposalScore ?? config.scoring.defaultProposalScore) / 5);
  const total = level * weights.level + domain * weights.domain + proposal * weights.proposal;
  return {
    score: Number(total.toFixed(4)),
    breakdown: {
      level: Number(levelScore) || 0,
      level_normalized: Number(level.toFixed(4)),
      domain_fit: Number(domain.toFixed(4)),
      proposal_score: Number(proposalScore ?? config.scoring.defaultProposalScore),
      weights,
      total: Number(total.toFixed(4)),
    },
  };
}

module.exports = { scoreApplication, clamp01 };
