'use strict';

const { sanitizeProblem } = require('./ai.sanitizer');
const { buildDomainClassificationPrompt, buildDifficultyPredictionPrompt } = require('./ai.prompts');
const { validateDomainOutput, validateDifficultyOutput } = require('./ai.validation');
const { callClaude } = require('./ai.provider');

/**
 * Classify a problem's domain using the LLM.
 *
 * @param {object} params
 * @param {string} params.title - Problem title
 * @param {string} params.description - Problem description
 * @param {Array<{ id: number, slug: string, name: string, description: string }>} params.allowedDomains
 * @param {Function} [params.providerFn] - Optional mock/custom provider function for testing
 * @returns {Promise<{ domainId: number, domainSlug: string, explanation: string }>}
 */
async function classifyProblemDomain({ title, description, allowedDomains, providerFn = callClaude }) {
  const sanitized = sanitizeProblem({ title, description });
  const { systemPrompt, userPrompt } = buildDomainClassificationPrompt(sanitized, allowedDomains);

  const rawOutput = await providerFn({ systemPrompt, userPrompt });
  const validated = validateDomainOutput(rawOutput, allowedDomains);

  return validated;
}

/**
 * Predict a problem's implementation difficulty using the LLM.
 *
 * @param {object} params
 * @param {string} params.title - Problem title
 * @param {string} params.description - Problem description
 * @param {Function} [params.providerFn] - Optional mock/custom provider function for testing
 * @returns {Promise<{ difficulty: 'small' | 'medium' | 'hard', explanation: string }>}
 */
async function predictProblemDifficulty({ title, description, providerFn = callClaude }) {
  const sanitized = sanitizeProblem({ title, description });
  const { systemPrompt, userPrompt } = buildDifficultyPredictionPrompt(sanitized);

  const rawOutput = await providerFn({ systemPrompt, userPrompt });
  const validated = validateDifficultyOutput(rawOutput);

  return validated;
}

module.exports = {
  classifyProblemDomain,
  predictProblemDifficulty,
};
