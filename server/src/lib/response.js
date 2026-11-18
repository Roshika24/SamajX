/**
 * Standard JSON response helpers.
 *
 * Every API response uses one of these so the frontend always sees
 * the same shape: { ok, data?, error?, meta? }.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object} data
 * @param {number} [status=200]
 * @param {object} [meta] – pagination info, etc.
 */
function success(res, data, status = 200, meta) {
  const body = { ok: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Send a paginated success response.
 * @param {import('express').Response} res
 * @param {object[]} data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
function paginated(res, data, total, page = 1, limit = 20) {
  // Keep pagination metadata explicit and stable for frontend tables.
  const meta = typeof total === 'object' && total !== null
    ? total
    : { page, limit, total };
  return res.status(200).json({ ok: true, data, meta });
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [status=400]
 * @param {string} [code='BAD_REQUEST']
 * @param {object[]} [details]
 */
function error(res, message, status = 400, code = 'BAD_REQUEST', details) {
  const body = { ok: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

module.exports = { success, paginated, error };
