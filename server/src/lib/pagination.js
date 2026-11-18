const { ValidationError } = require('./errors');

function parsePagination(query = {}, { defaultPage = 1, defaultLimit = 20, maxLimit = 100 } = {}) {
  const parse = (value, fallback, field) => {
    if (value === undefined || value === null || value === '') return fallback;
    const raw = String(value);
    if (!/^\d+$/.test(raw)) throw new ValidationError(`${field} must be a positive integer`);
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || number < 1) throw new ValidationError(`${field} must be a positive integer`);
    return number;
  };

  const page = parse(query.page, defaultPage, 'page');
  const requestedLimit = parse(query.limit, defaultLimit, 'limit');
  const limit = Math.min(requestedLimit, maxLimit);
  // A safe page integer can still produce an unsafe SQL OFFSET after multiplication.
  if (!Number.isSafeInteger((page - 1) * limit)) {
    throw new ValidationError('page is too large');
  }
  return { page, limit };
}

module.exports = { parsePagination };
