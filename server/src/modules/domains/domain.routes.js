/**
 * Domains module — routes.
 *
 * GET /api/domains — public list of all problem domains.
 */

const { Router } = require('express');
const domainDb = require('./domain.db');
const { success } = require('../../lib/response');

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const domains = await domainDb.findAll();
    return success(res, domains);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
