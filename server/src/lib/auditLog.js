/**
 * Audit log helper — records every admin action for accountability.
 *
 * Usage:
 *   const audit = require('../lib/auditLog');
 *   await audit.log(req, 'approve_leader', 'leader', leaderId, { status: 'approved' });
 *
 * Also works inside a transaction:
 *   await audit.logTx(client, req, 'set_difficulty', 'problem', problemId, { difficulty: 'hard' });
 */

const pool = require('../db/pool');

const INSERT_SQL = `
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

/**
 * Write an audit log entry using the shared pool.
 * @param {import('express').Request} req – for user id and IP
 * @param {string} action       – e.g. 'approve_leader', 'set_difficulty'
 * @param {string} entityType   – e.g. 'leader', 'problem'
 * @param {number} entityId
 * @param {object} [details={}] – any extra context (old value, new value, etc.)
 */
async function log(req, action, entityType, entityId, details = {}) {
  const userId = req.user?.id ?? null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  await pool.query(INSERT_SQL, [
    userId,
    action,
    entityType,
    entityId,
    JSON.stringify(details),
    ip,
  ]);
}

/**
 * Write an audit log entry inside an existing transaction.
 * @param {import('pg').PoolClient} client – the transaction client
 * @param {import('express').Request} req
 * @param {string} action
 * @param {string} entityType
 * @param {number} entityId
 * @param {object} [details={}]
 */
async function logTx(client, req, action, entityType, entityId, details = {}) {
  const userId = req.user?.id ?? null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  await client.query(INSERT_SQL, [
    userId,
    action,
    entityType,
    entityId,
    JSON.stringify(details),
    ip,
  ]);
}

module.exports = { log, logTx };
