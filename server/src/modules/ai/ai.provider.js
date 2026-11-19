'use strict';

const config = require('../../config');
const { AppError } = require('../../lib/errors');

class AIProviderError extends AppError {
  constructor(message, status = 502, code = 'AI_PROVIDER_ERROR', isRetryable = false) {
    super(message, status, code);
    this.isRetryable = isRetryable;
  }
}

/**
 * Call the Anthropic Messages API.
 * Uses native fetch in Node 18+ to avoid extraneous dependencies.
 *
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {string} [params.apiKey]
 * @param {string} [params.model]
 * @param {number} [params.timeoutMs]
 * @returns {Promise<string>} Model raw text response
 */
async function callClaude({
  systemPrompt,
  userPrompt,
  apiKey = config.ai.apiKey,
  model = config.ai.model,
  timeoutMs = config.ai.timeoutMs,
}) {
  const isPlaceholderKey = !apiKey ||
    apiKey.includes('your-actual-key') ||
    apiKey.includes('your_') ||
    apiKey.includes('placeholder') ||
    apiKey === 'your_anthropic_api_key_here';

  if (isPlaceholderKey) {
    if (config.server.isDev || process.env.AI_PROVIDER === 'mock') {
      return generateDevFallbackResponse({ systemPrompt, userPrompt });
    }
    throw new AIProviderError('AI provider API key is not configured', 503, 'AI_NOT_CONFIGURED', false);
  }

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.1, // low temperature for consistent structured extraction
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed?.error?.message || errorMsg;
      } catch {
        errorMsg = errorBody.slice(0, 200) || errorMsg;
      }

      if (config.server.isDev) {
        console.warn(`[AI] Provider returned ${response.status}: ${errorMsg}. Falling back to dev mock.`);
        return generateDevFallbackResponse({ systemPrompt, userPrompt });
      }

      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError(`Invalid AI provider credentials: ${errorMsg}`, 502, 'AI_AUTH_ERROR', false);
      }
      if (response.status === 429) {
        throw new AIProviderError(`AI provider rate limit exceeded: ${errorMsg}`, 429, 'AI_RATE_LIMITED', true);
      }
      if (response.status >= 500) {
        throw new AIProviderError(`AI provider server error (${response.status}): ${errorMsg}`, 502, 'AI_SERVER_ERROR', true);
      }
      throw new AIProviderError(`AI provider client error (${response.status}): ${errorMsg}`, 400, 'AI_REQUEST_ERROR', false);
    }

    const data = await response.json();
    const contentBlock = data.content?.find((c) => c.type === 'text');
    if (!contentBlock || !contentBlock.text) {
      throw new AIProviderError('AI provider returned empty content', 502, 'AI_EMPTY_RESPONSE', false);
    }

    return contentBlock.text;
  } catch (err) {
    clearTimeout(timer);
    if (config.server.isDev) {
      console.warn(`[AI] Network/Provider call failed: ${err.message}. Falling back to dev mock.`);
      return generateDevFallbackResponse({ systemPrompt, userPrompt });
    }
    if (err instanceof AIProviderError) throw err;

    if (err.name === 'AbortError') {
      throw new AIProviderError(`AI request timed out after ${timeoutMs}ms`, 504, 'AI_TIMEOUT', true);
    }

    throw new AIProviderError(`Network error communicating with AI provider: ${err.message}`, 502, 'AI_NETWORK_ERROR', true);
  }
}

/**
 * Intelligent dev-mode fallback when no Anthropic API key is provided.
 * Ensures the platform remains functional during local testing and evaluations.
 */
function generateDevFallbackResponse({ systemPrompt, userPrompt }) {
  const text = (userPrompt + ' ' + systemPrompt).toLowerCase();

  // 1. Difficulty prediction prompt
  if (systemPrompt.includes('"difficulty": "small" | "medium" | "hard"') || userPrompt.includes('Predict the implementation difficulty')) {
    if (text.includes('bridge') || text.includes('structural') || text.includes('telemetry') || text.includes('sensor network') || text.includes('treatment plant') || text.includes('chemical') || text.includes('factory')) {
      return JSON.stringify({
        difficulty: 'hard',
        explanation: 'Requires complex chemical contaminant remediation, soil testing protocols, multi-stakeholder intervention, and environmental safety gear.'
      });
    }
    if (text.includes('pothole') || text.includes('trash') || text.includes('litter') || text.includes('survey') || text.includes('photo')) {
      return JSON.stringify({
        difficulty: 'small',
        explanation: 'Can be completed via mobile field cataloging, student surveys, and basic photographic documentation without specialized labs.'
      });
    }
    return JSON.stringify({
      difficulty: 'medium',
      explanation: 'Requires diagnostic measurement, hardware assembly or mobile software prototyping, and field testing with stakeholders.'
    });
  }

  // 2. Domain classification prompt
  if (text.includes('soil') || text.includes('crop') || text.includes('farm') || text.includes('vegetation') || text.includes('agriculture') || text.includes('fertilizer') || text.includes('plant')) {
    return JSON.stringify({
      domain_slug: 'agriculture',
      explanation: 'The issue directly impacts agricultural soil quality, local farmland vegetation, and community crop sustainability.'
    });
  }
  if (text.includes('chemical') || text.includes('toxic') || text.includes('factory') || text.includes('pollution') || text.includes('effluent') || text.includes('emission')) {
    return JSON.stringify({
      domain_slug: 'environmental',
      explanation: 'Involves industrial effluent, toxic chemical discharge, and environmental mitigation protocols.'
    });
  }
  if (text.includes('water') || text.includes('flood') || text.includes('drain') || text.includes('sewage') || text.includes('pipe') || text.includes('leak')) {
    return JSON.stringify({
      domain_slug: 'water_sanitation',
      explanation: 'The issue describes drainage blockage, stormwater accumulation, or drinking water utility disruption.'
    });
  }
  if (text.includes('road') || text.includes('pothole') || text.includes('traffic') || text.includes('asphalt') || text.includes('flyover') || text.includes('transport')) {
    return JSON.stringify({
      domain_slug: 'roads_transport',
      explanation: 'Concerns roadway pavement condition, traffic congestion, and commuter transportation safety.'
    });
  }
  if (text.includes('solar') || text.includes('electric') || text.includes('light') || text.includes('power') || text.includes('energy') || text.includes('wire')) {
    return JSON.stringify({
      domain_slug: 'energy',
      explanation: 'Concerns municipal electrical wiring, public illumination, or renewable solar microgrid generation infrastructure.'
    });
  }
  if (text.includes('garbage') || text.includes('waste') || text.includes('trash') || text.includes('dump') || text.includes('plastic')) {
    return JSON.stringify({
      domain_slug: 'waste',
      explanation: 'Describes solid waste accumulation, community bin overflow, and municipal sanitation requirements.'
    });
  }
  if (text.includes('app') || text.includes('software') || text.includes('portal') || text.includes('code') || text.includes('digital') || text.includes('tracking')) {
    return JSON.stringify({
      domain_slug: 'software_it',
      explanation: 'The problem can be solved or monitored through digital web applications, community data portals, or software algorithms.'
    });
  }

  return JSON.stringify({
    domain_slug: 'civil',
    explanation: 'The reported community infrastructure challenge requires structural inspection, material repair, and civil engineering design.'
  });
}

module.exports = {
  callClaude,
  AIProviderError,
  generateDevFallbackResponse,
};
