import crypto from 'node:crypto';
import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const ok = (data, status = 200, extra = {}) => ({
  status,
  body: { success: true, data, ...extra }
});

export const noContent = () => ({ status: 204, body: null });

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}

export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({ method, pattern, parts: splitPath(pattern), handler });
  }

  function match(method, pathname) {
    const parts = splitPath(pathname);
    for (const route of routes) {
      if (route.method !== method && route.method !== 'ANY') continue;
      if (route.parts.length !== parts.length) continue;
      const params = {};
      let matched = true;

      for (let index = 0; index < route.parts.length; index += 1) {
        const expected = route.parts[index];
        const actual = parts[index];
        if (expected.startsWith(':')) {
          params[expected.slice(1)] = decodeURIComponent(actual);
          continue;
        }
        if (expected !== actual) {
          matched = false;
          break;
        }
      }

      if (matched) return { route, params };
    }
    return null;
  }

  return { add, match, routes: () => [...routes] };
}

export function splitPath(value) {
  return String(value || '/')
    .replace(/\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

export function stripApiPrefix(pathname) {
  const match = config.apiPrefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!match) return null;
  return pathname.slice(match.length) || '/';
}

export async function readJsonBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > config.maxJsonBodyBytes) {
      throw new HttpError(413, 'BODY_TOO_LARGE', 'Request body is too large');
    }
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  req.rawBody = raw;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'INVALID_JSON_BODY', 'Request body must be a JSON object');
    }
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}

export function sendJson(res, status, body, requestId = undefined) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Razorpay-Signature, X-Lazplay-Admin-Secret');
  if (requestId) res.setHeader('X-Request-Id', requestId);

  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

export function toHttpError(error) {
  if (error instanceof HttpError) return error;
  return new HttpError(500, 'INTERNAL_SERVER_ERROR', error?.message || 'Unexpected server error');
}
