/**
 * State machine module — the single authority on "can this transition happen?"
 *
 * Every status change in the system goes through `transition()`.
 * It checks the current status, validates the transition, verifies
 * the actor's role, and writes an audit-log entry — all in one transaction.
 */

const pool = require('../db/pool');
const audit = require('./auditLog');
const { AppError, ForbiddenError } = require('./errors');
const { MACHINES, canTransition } = require('./stateMachine.rules');

/* ── Transition definitions ─────────────────────────────────────────
   Format:  { [fromStatus]: { [toStatus]: { roles: string[] } } }
   'system' is a pseudo-role used by cron jobs and internal logic.
──────────────────────────────────────────────────────────────────── */


/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Check whether a transition is allowed (pure, no DB, no side effects).
 *
 * @param {string} entityType – 'problem', 'application', etc.
 * @param {string} from       – current status
 * @param {string} to         – desired status
 * @param {string} actorRole  – req.user.role or 'system'
 * @returns {{ allowed: boolean, error?: string }}
 */
/**
 * Execute a state transition inside an existing transaction.
 *
 * @param {import('pg').PoolClient} client   – the transaction client
 * @param {string}   entityType
 * @param {number}   entityId
 * @param {string}   toStatus
 * @param {string}   actorRole
 * @param {import('express').Request} [req]  – for audit logging (null for system jobs)
 * @returns {Promise<{ from: string, to: string }>}
 * @throws {AppError | ForbiddenError}
 */
async function transitionTx(client, entityType, entityId, toStatus, actorRole, req, auditDetails = {}) {
  const machine = MACHINES[entityType];
  if (!machine) throw new AppError(`Unknown entity type: ${entityType}`);

  // Lock the row to prevent concurrent transitions
  const { rows } = await client.query(
    `SELECT ${machine.statusColumn} FROM ${machine.table} WHERE id = $1 FOR UPDATE`,
    [entityId]
  );

  if (rows.length === 0) {
    throw new AppError(`${entityType} #${entityId} not found`, 404, 'NOT_FOUND');
  }

  const currentStatus = rows[0][machine.statusColumn];
  const check = canTransition(entityType, currentStatus, toStatus, actorRole);

  if (!check.allowed) {
    // Distinguish 403 (wrong role) from 409 (wrong status)
    if (check.error.includes('Role')) {
      throw new ForbiddenError(check.error);
    }
    throw new AppError(check.error, 409, 'INVALID_TRANSITION');
  }

  // Apply the transition
  await client.query(
    `UPDATE ${machine.table} SET ${machine.statusColumn} = $1 WHERE id = $2`,
    [toStatus, entityId]
  );

  // Audit log (if we have a request context)
  if (req) {
    await audit.logTx(
      client, req,
      `transition_${entityType}`,
      entityType,
      entityId,
      { from: currentStatus, to: toStatus, ...auditDetails }
    );
  }

  return { from: currentStatus, to: toStatus, ...auditDetails };
}

/**
 * Convenience wrapper that creates its own transaction.
 */
async function transition(entityType, entityId, toStatus, actorRole, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transitionTx(client, entityType, entityId, toStatus, actorRole, req);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  canTransition,
  transition,
  transitionTx,
  MACHINES,           // exported for testing
};
