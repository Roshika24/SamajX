/**
 * Thin fetch wrapper for CivicPulse API.
 *
 * - Always sends/receives JSON
 * - Always includes cookies (credentials: 'include')
 * - Throws on non-ok responses with the server's error body
 */

const BASE = '/api';

async function request(endpoint, options = {}) {
  const { body, ...rest } = options;

  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...rest,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${endpoint}`, config);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = json?.error?.code || 'UNKNOWN';
    throw err;
  }

  return json;
}

// Convenience methods
export const api = {
  get:    (url)        => request(url, { method: 'GET' }),
  post:   (url, body)  => request(url, { method: 'POST', body }),
  put:    (url, body)  => request(url, { method: 'PUT', body }),
  patch:  (url, body)  => request(url, { method: 'PATCH', body }),
  delete: (url)        => request(url, { method: 'DELETE' }),
};
