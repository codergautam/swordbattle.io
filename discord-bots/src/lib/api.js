import { config } from '../config.js';

export class ApiError extends Error {
  constructor(message, status, url) {
    super(message);
    this.status = status;
    this.url = url;
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, { method = 'GET', body, auth = false, timeoutMs = 10000, retries = 1 } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) headers.authorization = `Bearer ${config.moderationSecret}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (retries > 0) {
      await sleep(750);
      return request(url, { method, body, auth, timeoutMs, retries: retries - 1 });
    }
    throw new ApiError(`${method} ${url} failed: ${err.message}`, null, url);
  }
  if (res.ok) return res.json();
  if (res.status >= 500 && retries > 0) {
    await sleep(750);
    return request(url, { method, body, auth, timeoutMs, retries: retries - 1 });
  }
  throw new ApiError(`${method} ${url} -> HTTP ${res.status}`, res.status, url);
}

const resolveUrl = (path) => (path.startsWith('http') ? path : config.apiBase + path);

export const apiGet = (path, opts = {}) => request(resolveUrl(path), opts);
export const apiPost = (path, body, opts = {}) => request(resolveUrl(path), { ...opts, method: 'POST', body });
