import crypto from 'node:crypto';
import { config } from '../config.js';
import { createId, HttpError } from '../http.js';

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', config.authSecret).update(value).digest('base64url');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function createToken(payload, ttlSeconds) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + Number(ttlSeconds)
  });
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export function verifyToken(token) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) throw new HttpError(401, 'INVALID_TOKEN', 'Token is invalid');
  if (signature !== sign(`${header}.${body}`)) throw new HttpError(401, 'INVALID_TOKEN', 'Token signature is invalid');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new HttpError(401, 'TOKEN_EXPIRED', 'Token has expired');
  return payload;
}

export function bearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
}

export async function requireUser(req, db, roles = []) {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  const payload = verifyToken(token);
  const user = await db.findById(config.tables.users, payload.sub);
  if (!user || user.status === 'BANNED' || user.status === 'DISABLED') {
    throw new HttpError(401, 'USER_INACTIVE', 'User is inactive or missing');
  }
  const userRoles = String(user.roles || 'PLAYER').split(',').map((role) => role.trim());
  if (roles.length > 0 && !roles.some((role) => userRoles.includes(role))) {
    throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions');
  }
  return { ...user, roles: userRoles };
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function issueTokens(user) {
  const sessionId = createId('sess');
  return {
    accessToken: createToken({ type: 'access', sub: user.id, roles: user.roles || 'PLAYER', sid: sessionId }, config.accessTokenTtlSeconds),
    refreshToken: createToken({ type: 'refresh', sub: user.id, sid: sessionId }, config.refreshTokenTtlSeconds),
    expiresIn: config.accessTokenTtlSeconds
  };
}
