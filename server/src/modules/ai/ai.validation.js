'use strict';

const { z } = require('zod');
const { ValidationError } = require('../../lib/errors');

/**
 * Safely parse JSON from raw LLM output, stripping any markdown code block wrappers.
 * @param {string} raw
 * @returns {any}
 */
function extractAndParseJSON(raw) {
  if (typeof raw !== 'string') {
    throw new ValidationError('AI response was not text');
  }

  let cleaned = raw.trim();
  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new ValidationError(`AI response is not valid JSON: ${err.message}`);
  }
}

/**
 * Schema for domain classification LLM output.
 */
const domainOutputSchema = z.object({
  domain_slug: z.string().trim().min(2).max(50),
  explanation: z.string().trim().min(5).max(1000),
});

/**
 * Validate domain classification output.
 * @param {string} raw - Raw LLM string output
 * @param {Array<{ id: number, slug: string }>} allowedDomains - List of allowed domains
 * @returns {{ domainId: number, domainSlug: string, explanation: string }}
 */
function validateDomainOutput(raw, allowedDomains) {
  const json = extractAndParseJSON(raw);
  const parsed = domainOutputSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError('AI domain classification output failed schema validation', parsed.error.issues);
  }

  const matched = allowedDomains.find(
    (d) => d.slug.toLowerCase() === parsed.data.domain_slug.toLowerCase()
  );

  if (!matched) {
    throw new ValidationError(`AI returned unknown domain slug: "${parsed.data.domain_slug}"`);
  }

  return {
    domainId: matched.id,
    domainSlug: matched.slug,
    explanation: parsed.data.explanation,
  };
}

/**
 * Schema for difficulty prediction LLM output.
 */
const difficultyOutputSchema = z.object({
  difficulty: z.enum(['small', 'medium', 'hard']),
  explanation: z.string().trim().min(5).max(1000),
});

/**
 * Validate difficulty prediction output.
 * @param {string} raw - Raw LLM string output
 * @returns {{ difficulty: 'small' | 'medium' | 'hard', explanation: string }}
 */
function validateDifficultyOutput(raw) {
  const json = extractAndParseJSON(raw);
  const parsed = difficultyOutputSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError('AI difficulty prediction output failed schema validation', parsed.error.issues);
  }

  return {
    difficulty: parsed.data.difficulty,
    explanation: parsed.data.explanation,
  };
}

module.exports = {
  extractAndParseJSON,
  validateDomainOutput,
  validateDifficultyOutput,
};
