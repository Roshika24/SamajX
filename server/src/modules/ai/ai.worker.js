'use strict';

const pool = require('../../db/pool');
const config = require('../../config');
const { classifyProblemDomain, predictProblemDifficulty } = require('./ai.service');
const { AIProviderError } = require('./ai.provider');

/**
 * Enqueue AI jobs for a newly created or re-evaluated problem.
 * Idempotent via UNIQUE (problem_id, job_type).
 *
 * @param {number} problemId
 * @param {object} [dbClient=pool]
 */
async function enqueueProblemAIJobs(problemId, dbClient = pool) {
  if (!Number.isSafeInteger(Number(problemId)) || Number(problemId) < 1) {
    throw new Error(`Invalid problemId for AI job: ${problemId}`);
  }

  // Enqueue both domain classification and difficulty prediction jobs
  await dbClient.query(
    `INSERT INTO ai_jobs (problem_id, job_type, status, max_attempts)
     VALUES ($1, 'domain_classification', 'pending', 3),
            ($1, 'difficulty_prediction', 'pending', 3)
     ON CONFLICT (problem_id, job_type) DO UPDATE
       SET status = CASE WHEN ai_jobs.status = 'failed' THEN 'pending' ELSE ai_jobs.status END,
           attempts = CASE WHEN ai_jobs.status = 'failed' THEN 0 ELSE ai_jobs.attempts END`,
    [problemId]
  );
}

/**
 * Process a single AI job atomically.
 *
 * @param {object} [options]
 * @param {Function} [options.providerFn] - Mock provider for testing
 * @param {object} [options.dbClient] - Database client or pool
 * @returns {Promise<{ processed: boolean, job?: object, result?: object, error?: string }>}
 */
async function processNextAIJob(options = {}) {
  const client = options.dbClient || (await pool.connect());
  const isManagedClient = Boolean(options.dbClient);

  try {
    if (!isManagedClient) await client.query('BEGIN');

    // Claim one eligible job atomically with SKIP LOCKED
    const { rows: jobs } = await client.query(
      `SELECT j.id, j.problem_id, j.job_type, j.attempts, j.max_attempts,
              p.title, p.description
       FROM ai_jobs j
       JOIN problems p ON p.id = j.problem_id
       WHERE j.status IN ('pending', 'failed')
         AND j.attempts < j.max_attempts
       ORDER BY j.created_at ASC
       FOR UPDATE OF j SKIP LOCKED
       LIMIT 1`
    );

    const job = jobs[0];
    if (!job) {
      if (!isManagedClient) await client.query('COMMIT');
      return { processed: false };
    }

    // Mark as processing and increment attempt count
    await client.query(
      `UPDATE ai_jobs
       SET status = 'processing',
           attempts = attempts + 1,
           started_at = NOW()
       WHERE id = $1`,
      [job.id]
    );

    if (!isManagedClient) await client.query('COMMIT');

    // Execute job outside transaction to keep row lock short
    let jobSuccess = false;
    let jobResult = null;
    let jobError = null;
    let isRetryable = true;

    try {
      if (!config.ai.enabled && !options.providerFn) {
        throw new AIProviderError('AI processing is disabled or unconfigured', 503, 'AI_DISABLED', false);
      }

      if (job.job_type === 'domain_classification') {
        const { rows: domains } = await pool.query(
          'SELECT id, slug, name, description FROM domains ORDER BY name'
        );
        jobResult = await classifyProblemDomain({
          title: job.title,
          description: job.description,
          allowedDomains: domains,
          providerFn: options.providerFn,
        });

        // Save AI domain suggestion without overwriting any existing human admin verdict
        await pool.query(
          `UPDATE problems
           SET ai_suggested_domain_id = $2,
               ai_domain_explanation = $3,
               ai_domain_status = CASE 
                 WHEN ai_domain_status IN ('accepted', 'overridden') THEN ai_domain_status 
                 ELSE 'suggested' 
               END,
               ai_status = 'done'
           WHERE id = $1`,
          [job.problem_id, jobResult.domainId, jobResult.explanation]
        );
      } else if (job.job_type === 'difficulty_prediction') {
        jobResult = await predictProblemDifficulty({
          title: job.title,
          description: job.description,
          providerFn: options.providerFn,
        });

        // Save AI difficulty prediction without overwriting any existing human admin verdict
        await pool.query(
          `UPDATE problems
           SET ai_suggested_difficulty = $2::difficulty,
               ai_difficulty_reason = $3,
               ai_difficulty_status = CASE 
                 WHEN ai_difficulty_status IN ('accepted', 'overridden') THEN ai_difficulty_status 
                 ELSE 'suggested' 
               END,
               ai_status = 'done'
           WHERE id = $1`,
          [job.problem_id, jobResult.difficulty, jobResult.explanation]
        );
      } else {
        throw new Error(`Unknown job_type: ${job.job_type}`);
      }

      jobSuccess = true;
    } catch (err) {
      jobError = err.message || String(err);
      if (err instanceof AIProviderError) {
        isRetryable = err.isRetryable;
      } else if (err.code === 'VALIDATION_ERROR') {
        // Model returned permanently unparseable structure
        isRetryable = false;
      }
    }

    // Update job record with final status
    if (jobSuccess) {
      await pool.query(
        `UPDATE ai_jobs
         SET status = 'done',
             completed_at = NOW(),
             last_error = NULL
         WHERE id = $1`,
        [job.id]
      );
      return { processed: true, job, result: jobResult };
    } else {
      const isFinalFailure = !isRetryable || (job.attempts + 1 >= job.max_attempts);
      const nextStatus = isFinalFailure ? 'failed' : 'pending';

      await pool.query(
        `UPDATE ai_jobs
         SET status = $2,
             last_error = $3
         WHERE id = $1`,
        [job.id, nextStatus, (jobError || 'Unknown error').slice(0, 1000)]
      );

      // If permanently failed, record failed status on problem
      if (isFinalFailure) {
        if (job.job_type === 'domain_classification') {
          await pool.query(
            `UPDATE problems SET ai_domain_status = 'failed' WHERE id = $1`,
            [job.problem_id]
          );
        } else if (job.job_type === 'difficulty_prediction') {
          await pool.query(
            `UPDATE problems SET ai_difficulty_status = 'failed' WHERE id = $1`,
            [job.problem_id]
          );
        }
      }

      return { processed: true, job, error: jobError };
    }
  } catch (err) {
    if (!isManagedClient) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    if (!isManagedClient) client.release();
  }
}

/**
 * Run a batch of pending AI jobs.
 * @param {object} [options]
 * @param {number} [options.batchSize=10]
 * @param {Function} [options.providerFn]
 * @returns {Promise<{ processedCount: number, errors: string[] }>}
 */
async function runAIWorker(options = {}) {
  const batchSize = options.batchSize || 10;
  let processedCount = 0;
  const errors = [];

  for (let i = 0; i < batchSize; i++) {
    try {
      const outcome = await processNextAIJob(options);
      if (!outcome.processed) break; // no more pending jobs
      processedCount++;
      if (outcome.error) errors.push(outcome.error);
    } catch (err) {
      errors.push(err.message);
      break;
    }
  }

  return { processedCount, errors };
}

/**
 * Trigger background AI worker asynchronously without awaiting or blocking the caller.
 */
function triggerAIWorker() {
  setImmediate(() => {
    runAIWorker({ batchSize: 5 }).catch((err) => {
      console.error('[SamajX AI Worker] Background processing error:', err.message);
    });
  });
}

module.exports = {
  enqueueProblemAIJobs,
  processNextAIJob,
  runAIWorker,
  triggerAIWorker,
};
