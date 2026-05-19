import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import Razorpay from 'razorpay';
import AdmZip from 'adm-zip';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from './prisma.js';
import { ValidationError, validateBody, validateQueryInt, validationFailure, validators } from './validation.js';
import { processBuildDirectory } from '@lazplay/distribution';
import { publishBuildManifest } from './services/distribution.js';

import { registerAuthRoutes } from './routes/auth.js';
import { registerGamesRoutes } from './routes/games.js';
import { registerLibraryRoutes } from './routes/library.js';
import { registerWishlistRoutes } from './routes/wishlist.js';
import { registerPaymentsRoutes } from './routes/payments.js';
import { registerStorageRoutes } from './routes/storage.js';
import { registerDeveloperRoutes } from './routes/developer.js';
import { registerInstancesRoutes } from './routes/instances.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerChunkRoutes } from './routes/chunks.js';


const config = {
  // Nginx strips /api/ before proxying, so the backend sees /v1/... paths.
  // Override with API_PREFIX=/api/v1 for local dev without nginx.
  apiPrefix: process.env.API_PREFIX || '/v1',
  appVersion: process.env.APP_VERSION || '1.0.0',
  appEnv: process.env.APP_ENV || 'development',
  publicApiUrl: process.env.PUBLIC_API_URL || 'https://play.lazplay.tech/api/v1',
  publicWebUrl: process.env.PUBLIC_WEB_URL || 'https://play.lazplay.tech',
  authSecret: process.env.AUTH_SECRET || 'lazplay-dev-secret-change-before-production',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 7200),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 7776000),
  runtimeTokenTtlSeconds: Number(process.env.RUNTIME_TOKEN_TTL_SECONDS || 900),
  r2Endpoint: process.env.R2_ENDPOINT,
  r2Bucket: process.env.R2_BUCKET,
  r2MediaBucket: process.env.R2_MEDIA_BUCKET || process.env.R2_BUCKET,
  r2GameBucket: process.env.R2_GAME_BUCKET || process.env.R2_BUCKET,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Region: process.env.R2_REGION || 'auto',
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  r2MediaPublicUrl: process.env.R2_MEDIA_PUBLIC_URL || process.env.R2_PUBLIC_URL,
  r2GamePublicUrl: process.env.R2_GAME_PUBLIC_URL,
  r2PublicGameBucket: process.env.R2_PUBLIC_GAME_BUCKET || process.env.R2_GAME_BUCKET || process.env.R2_BUCKET,
  r2PrivateGameBucket: process.env.R2_PRIVATE_GAME_BUCKET || process.env.R2_GAME_BUCKET || process.env.R2_BUCKET,
  r2PublicGamePublicUrl: process.env.R2_PUBLIC_GAME_PUBLIC_URL || process.env.R2_GAME_PUBLIC_URL || process.env.R2_PUBLIC_URL,
  maxGameMediaScreenshots: Number(process.env.MAX_GAME_MEDIA_SCREENSHOTS || 10),
  maxGameMediaVideos: Number(process.env.MAX_GAME_MEDIA_VIDEOS || 1),
  maxGameMediaHeroBanners: Number(process.env.MAX_GAME_MEDIA_HERO_BANNERS || 1),
  maxGameMediaItems: Number(process.env.MAX_GAME_MEDIA_ITEMS || 0),
  maxJsonBodyBytes: Number(process.env.MAX_JSON_BODY_BYTES || 1024 * 1024),
  logRequests: (process.env.LOG_REQUESTS || 'true') !== 'false',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_lazplay',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'lazplay-razorpay-dev-secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'lazplay-webhook-dev-secret',
  allowMockPayments: (process.env.ALLOW_MOCK_PAYMENTS || 'true') === 'true',
  resendApiKey: process.env.RESEND_API_KEY || 'resend_key'
};

const r2 = new S3Client({
  region: config.r2Region,
  endpoint: config.r2Endpoint,
  credentials: config.r2AccessKeyId && config.r2SecretAccessKey
    ? { accessKeyId: config.r2AccessKeyId, secretAccessKey: config.r2SecretAccessKey }
    : undefined,
  forcePathStyle: true,
  requestChecksumCalculation: 'NEVER',
  responseChecksumValidation: 'NEVER'
});

let _rzp = null;
const getRazorpay = () => {
  if (!_rzp) {
    _rzp = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }
  return _rzp;
};

class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const ok = (data, status = 200, extra = {}) => ({
  status,
  body: {
    success: true,
    data,
    ...extra
  }
});

const noContent = () => ({ status: 204, body: null });

const nowIso = () => new Date().toISOString();

const addSeconds = (seconds) => new Date(Date.now() + seconds * 1000).toISOString();

const createId = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return value.split(',').map((item) => item.trim());
  return [];
};

const parsePagination = (query) => ({
  page: validateQueryInt(query, 'page', { required: false, defaultValue: 1, min: 1 }),
  limit: validateQueryInt(query, 'limit', { required: false, defaultValue: 20, min: 1, max: 100 })
});

const paginate = (items, query) => {
  const { page, limit } = parsePagination(query);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    pageItems: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt);
  const candidateHash = candidate.split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
};

const signHmac = (value, secret = config.authSecret) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url');

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const signToken = (payload, ttlSeconds) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + ttlSeconds
    })
  ).toString('base64url');
  return `${header}.${body}.${signHmac(`${header}.${body}`)}`;
};

const verifyToken = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token is invalid');
  }
  const [header, body, signature] = parts;
  const expected = signHmac(`${header}.${body}`);
  if (!safeCompare(signature, expected)) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Token signature is invalid');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'TOKEN_EXPIRED', 'Token has expired');
  }
  return payload;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const money = (amount) => Number(amount || 0);

// Data persistence is handled by Prisma + PostgreSQL.

async function readJsonBody(req) {
  req.rawBody = '';
  if (req.method === 'GET' || req.method === 'HEAD') return {};

  const contentType = String(req.headers['content-type'] || '');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Request body must use application/json');
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > config.maxJsonBodyBytes) {
      throw new HttpError(413, 'BODY_TOO_LARGE', `Request body must be smaller than ${config.maxJsonBodyBytes} bytes`);
    }
    chunks.push(chunk);
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

function toHttpError(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof ValidationError) {
    return new HttpError(400, 'VALIDATION_ERROR', error.message, error.details);
  }

  if (error?.code === 'P2002') {
    return new HttpError(409, 'UNIQUE_CONSTRAINT', 'A record with this value already exists', {
      target: error.meta?.target
    });
  }
  if (error?.code === 'P2003') {
    return new HttpError(409, 'RELATION_CONSTRAINT', 'Related record constraint failed', {
      field: error.meta?.field_name
    });
  }
  if (error?.code === 'P2025') {
    return new HttpError(404, 'RECORD_NOT_FOUND', 'Record was not found');
  }
  if (error?.code === 'P2000') {
    return new HttpError(400, 'VALUE_TOO_LONG', 'One of the submitted values is too long', {
      column: error.meta?.column_name
    });
  }

  const message = config.appEnv === 'production' ? 'Unexpected server error' : `Unexpected server error: ${error?.message || 'Unknown error'}`;
  return new HttpError(500, 'INTERNAL_SERVER_ERROR', message, config.appEnv === 'production' ? undefined : { stack: error?.stack });
}

function logRequest(event, details) {
  if (!config.logRequests && event === 'request-complete') return;
  const level = event === 'request-error' ? 'error' : 'info';
  console[level](`[${event}]`, details);
}

function logRouteRegistration(routes) {
  if (!config.logRequests) return;
  console.info('[routes-registered]', { count: routes.length });
}

function safeRequestDebug(req, matched, routePath, status, startedAt) {
  return {
    requestId: req.requestId,
    method: req.method,
    path: routePath || req.url,
    route: matched?.route?.pattern || null,
    status,
    durationMs: Date.now() - startedAt
  };
}

function routeDebugDetails(req, matched, routePath, status, code, message, startedAt, error) {
  return {
    ...safeRequestDebug(req, matched, routePath, status, startedAt),
    code,
    message,
    params: req.params || {},
    stack: error?.stack
  };
}

function sendJson(res, status, body) {
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
    , 2));
}

function createRouter() {
  const routes = [];
  const routeKeys = new Set();

  const add = (method, pattern, handler) => {
    const key = `${method} ${pattern}`;
    if (routeKeys.has(key)) {
      console.warn('[route-duplicate]', { method, pattern });
    }
    routeKeys.add(key);
    routes.push({
      method,
      pattern,
      parts: splitPath(pattern),
      handler
    });
  };

  const match = (method, pathname) => {
    const parts = splitPath(pathname);
    for (const route of routes) {
      if (route.method !== method) continue;
      if (route.parts.length !== parts.length) continue;
      const params = {};
      let matched = true;
      for (let index = 0; index < route.parts.length; index += 1) {
        const patternPart = route.parts[index];
        const actualPart = parts[index];
        if (patternPart.startsWith(':')) {
          params[patternPart.slice(1)] = decodeURIComponent(actualPart);
          continue;
        }
        if (patternPart !== actualPart) {
          matched = false;
          break;
        }
      }
      if (matched) return { route, params };
    }
    return null;
  };

  return { add, match, routes: () => [...routes] };
}

function splitPath(value) {
  return String(value || '/')
    .replace(/\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

async function getOptionalUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') return null;
    const [user, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.sub } }),
      prisma.refreshSession.findUnique({ where: { id: payload.sid } })
    ]);
    if (!user || user.status !== 'ACTIVE') return null;
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    return user;
  } catch { return null; }
}

async function requireAuth(req, _db, roles = []) {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  const payload = verifyToken(token);
  if (payload.type !== 'access') throw new HttpError(401, 'INVALID_TOKEN', 'Access token is required');

  const [user, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.sub } }),
    prisma.refreshSession.findUnique({ where: { id: payload.sid } })
  ]);

  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'USER_INACTIVE', 'User is inactive or missing');
  if (!session || session.revokedAt) throw new HttpError(401, 'SESSION_REVOKED', 'Session has been revoked or expired');
  if (session.expiresAt < new Date()) throw new HttpError(401, 'SESSION_EXPIRED', 'Session has expired');

  if (roles.length > 0 && !roles.some((role) => user.roles.includes(role))) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
  }
  return user;
}

async function createTokens(user) {
  const sessionId = createId('sess');
  const refreshTokenId = createId('rt');
  const accessToken = signToken({ type: 'access', sub: user.id, roles: user.roles, sid: sessionId }, config.accessTokenTtlSeconds);
  const refreshToken = signToken({ type: 'refresh', sub: user.id, jti: refreshTokenId, sid: sessionId }, config.refreshTokenTtlSeconds);
  await prisma.refreshSession.create({
    data: {
      id: sessionId, userId: user.id, refreshTokenId,
      expiresAt: new Date(Date.now() + config.refreshTokenTtlSeconds * 1000),
    },
  });
  return { accessToken, refreshToken };
}

async function developerForUser(user) {
  return prisma.developerProfile.findUnique({ where: { userId: user.id } });
}

async function findGame(gameIdOrSlug) {
  return prisma.game.findFirst({ where: { OR: [{ id: gameIdOrSlug }, { slug: gameIdOrSlug }] } });
}

async function findBuild(buildId) {
  return prisma.gameBuild.findUnique({ where: { id: buildId } });
}

async function findDeployment(deploymentId) {
  return prisma.deployment.findUnique({ where: { id: deploymentId } });
}

async function gameDeveloper(game) {
  if (!game?.developerId) return null;
  return prisma.developerProfile.findUnique({ where: { id: game.developerId } });
}

async function assertDeveloperOwnsGame(user, game) {
  if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
  if (user.roles.includes('ADMIN')) return;
  const developer = await developerForUser(user);
  if (!developer || developer.id !== game.developerId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the owning developer can access this game');
  }
}

async function userOwnsGame(userId, gameId) {
  const ent = await prisma.entitlement.findFirst({ where: { userId, gameId, status: 'ACTIVE' } });
  return !!ent;
}

async function ensureLibraryItem(userId, gameId, ownershipType = 'PURCHASED') {
  const existing = await prisma.libraryItem.findUnique({ where: { userId_gameId: { userId, gameId } } });
  if (existing) return existing;
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { builds: { where: { id: undefined } } } });
  const latestBuild = game?.latestBuildId ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } }) : null;
  return prisma.libraryItem.create({
    data: { id: createId('lib'), userId, gameId, ownershipType, installedStatus: 'READY', favorite: false, playtimeSeconds: 0, installedBuildVersion: latestBuild?.version || null },
  });
}

async function setLatestBuild(gameId, build) {
  if (!gameId || !build) return null;
  return prisma.game.update({
    where: { id: gameId },
    data: { latestBuildId: build.id, version: build.version }
  });
}

async function grantEntitlement(userId, gameId, source) {
  const existing = await prisma.entitlement.findUnique({ where: { userId_gameId: { userId, gameId } } });
  const entitlement = existing
    ? await prisma.entitlement.update({ where: { userId_gameId: { userId, gameId } }, data: { status: 'ACTIVE' } })
    : await prisma.entitlement.create({ data: { id: createId('ent'), userId, gameId, source, status: 'ACTIVE' } });
  await ensureLibraryItem(userId, gameId, source === 'FREE' ? 'FREE' : 'PURCHASED');
  return entitlement;
}

async function addNotification(userId, type, title, body) {
  return prisma.notification.create({
    data: { id: createId('notif'), userId, type, title, body, read: false },
  });
}

async function addAuditLog(actorId, action, targetType, targetId, metadata = {}) {
  return prisma.auditLog.create({
    data: { id: createId('audit'), actorId, action, targetType, targetId, metadata },
  });
}

async function publicGame(game, user = null) {
  const developer = await gameDeveloper(game);
  const reviews = await prisma.gameReview.findMany({ where: { gameId: game.id } });
  const rating = reviews.length === 0 ? 0 : Math.round((reviews.reduce((t, r) => t + r.rating, 0) / reviews.length) * 10) / 10;

  const allMedia = await prisma.gameMedia.findMany({ where: { gameId: game.id }, orderBy: { sortOrder: 'asc' } });

  const resolveUrl = (url, keyHint = null) => {
    if (url && (url.startsWith('http') || url.startsWith('https'))) return url;
    const key = keyHint || url;
    if (key && key.includes('/')) return publicObjectUrl(key, resolveBucketForKey(key));
    return url || null;
  };

  // Resolve assets with fallbacks from GameMedia
  const findMedia = (alt) => allMedia.find(m => m.alt === alt)?.url;

  const coverUrl = resolveUrl(game.coverUrl, game.coverObjectKey) || findMedia('COVER_IMAGE') || findMedia('PROJECT_COVER') || findMedia('COVER');
  const heroImageUrl = resolveUrl(game.heroImageUrl) || findMedia('HERO_IMAGE') || findMedia('HERO');
  const heroBannerUrl = resolveUrl(game.heroBannerUrl) || findMedia('HERO_BANNER') || findMedia('BANNER');
  const trailerUrl = resolveUrl(game.trailerUrl, game.trailerObjectKey) || allMedia.find(m => m.type === 'VIDEO' || m.alt === 'VIDEO_TRAILER')?.url;

  // Screenshots are all images EXCEPT those used as main assets
  const mainAssetUrls = [coverUrl, heroImageUrl, heroBannerUrl].filter(Boolean);
  const screenshots = allMedia
    .filter(m => m.type === 'IMAGE' && !mainAssetUrls.includes(m.url))
    .map(m => resolveUrl(m.url));

  const entitlement = user ? await prisma.entitlement.findFirst({ where: { userId: user.id, gameId: game.id, status: 'ACTIVE' } }) : null;
  const libItem = user ? await prisma.libraryItem.findUnique({ where: { userId_gameId: { userId: user.id, gameId: game.id } } }) : null;
  const isOwned = !!libItem;
  const hasEntitlement = !!entitlement;
  const isWishlisted = user ? !!(await prisma.wishlistItem.findFirst({ where: { userId: user.id, gameId: game.id } })) : false;

  const build = game.latestBuildId ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } }) : null;
  const isWeb = isWebRuntime(build?.runtime || build?.platform);
  const entrypoint = build?.entrypoint || (isWeb ? 'index.html' : 'game.exe');

  let downloadUrl = null;
  let distributionType = build?.distributionType || 'ZIP';
  let usesChunkDistribution = distributionType === 'CHUNKED';

  if (isOwned && build?.artifactObjectKey && !usesChunkDistribution) {
    const isWebBuild = isWebRuntime(build.runtime || build.platform);
    const bucket = isWebBuild ? getPublicGameBucket() : getPrivateGameBucket();
    const signed = await signedStorageUrl(build.artifactObjectKey, 'GET', 3600, bucket);
    downloadUrl = signed.url;
  }

  return {
    id: game.id, slug: game.slug, title: game.title,
    description: game.description, tagline: game.tagline,
    price: game.price, currency: game.currency, priceType: game.priceType,
    releaseDate: game.releaseDate,
    developer: developer ? { id: developer.id, displayName: developer.displayName } : null,
    publisher: game.publisher, genres: game.genres, tags: game.tags, platforms: game.platforms,
    coverUrl, heroImageUrl, heroBannerUrl, trailerUrl,
    screenshots,
    version: game.version || null,
    size: build?.sizeBytes ? Number(build.sizeBytes) : 0,
    hardwareSpecs: game.hardwareSpecs,
    systemRequirements: game.systemRequirements,
    entrypoint, downloadUrl,
    distributionType, usesChunkDistribution,
    checksumSha256: build?.checksumSha256 || null,
    isOwned, hasEntitlement, isWishlisted, rating, reviewCount: reviews.length,
    status: game.status, publishedAt: game.publishedAt, createdAt: game.createdAt, updatedAt: game.updatedAt,
  };
}

const getMediaBucket = () => config.r2MediaBucket || config.r2Bucket;
const getPublicGameBucket = () => config.r2PublicGameBucket || config.r2GameBucket || config.r2Bucket;
const getPrivateGameBucket = () => config.r2PrivateGameBucket || config.r2GameBucket || config.r2Bucket;
const getGameBucket = () => getPrivateGameBucket();
const getRuntimeBucketForPriceType = (priceType) =>
  String(priceType || '').toUpperCase() === 'FREE' ? getPublicGameBucket() : getPrivateGameBucket();
const getRuntimeBucketForGame = (game, build = null) => {
  const isWebBuild = (build && isWebRuntime(build.runtime || build.platform)) || 
                isWebRuntime(game?.platform || game?.runtime);
  return isWebBuild ? getPublicGameBucket() : getPrivateGameBucket();
};

const assertR2Config = (bucket) => {
  if (!config.r2Endpoint || !bucket || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
    throw new HttpError(500, 'R2_CONFIG_MISSING', 'R2 configuration is missing');
  }
};

const resolveBucketForPurpose = (purpose) => {
  const value = String(purpose || '').toUpperCase();
  const mediaPurposes = new Set(['GAME_MEDIA', 'USER_MEDIA', 'AVATAR', 'PROFILE_MEDIA', 'MEDIA']);
  if (mediaPurposes.has(value)) return getMediaBucket();
  return getPrivateGameBucket();
};

const resolveBucketForKey = (objectKey) => {
  const value = String(objectKey || '').toLowerCase();
  const mediaPrefixes = ['game_media/', 'user_media/', 'avatar/', 'avatars/', 'profile_media/', 'media/'];
  if (mediaPrefixes.some((prefix) => value.startsWith(prefix))) return getMediaBucket();
  return getPrivateGameBucket();
};

const publicObjectUrl = (objectKey, bucket) => {
  const mediaBucket = getMediaBucket();
  const publicGameBucket = getPublicGameBucket();
  const privateGameBucket = getPrivateGameBucket();
  const base = bucket === mediaBucket
    ? (config.r2MediaPublicUrl || config.r2PublicUrl)
    : bucket === publicGameBucket
      ? (config.r2PublicGamePublicUrl || config.r2GamePublicUrl || config.r2PublicUrl)
      : bucket === privateGameBucket
        ? null
        : config.r2PublicUrl;
  if (!base) return null;
  return `${base.replace(/\/+$/g, '')}/${objectKey}`;
};

async function signedStorageUrl(objectKey, method = 'GET', ttlSeconds = 900, bucket = getPrivateGameBucket(), options = {}) {
  assertR2Config(bucket);
  const expiresAt = addSeconds(ttlSeconds);
  let command;

  const commandParams = { Bucket: bucket, Key: objectKey };
  if (options.contentType) {
    commandParams.ContentType = options.contentType;
  }

  if (method === 'GET') command = new GetObjectCommand(commandParams);
  if (method === 'PUT') command = new PutObjectCommand(commandParams);
  if (method === 'DELETE') command = new DeleteObjectCommand(commandParams);

  if (!command) throw new HttpError(400, 'INVALID_METHOD', 'Unsupported storage method');

  // If we sign with Content-Type, the client MUST send that exact Content-Type header.
  // We use signableHeaders to ensure it's included in the signature if present.
  const url = await getSignedUrl(r2, command, {
    expiresIn: ttlSeconds,
    signableHeaders: options.contentType ? new Set(['content-type']) : undefined
  });
  return { url, expiresAt };
}

const runtimePrefixForGame = (gameId) => `runtime/${gameId}/`;

const buildCopySource = (bucket, key) =>
  `${bucket}/${encodeURIComponent(key).replaceAll('%2F', '/')}`;

async function moveRuntimeObjects(gameId, fromBucket, toBucket) {
  if (!gameId || !fromBucket || !toBucket || fromBucket === toBucket) return;
  assertR2Config(fromBucket);
  assertR2Config(toBucket);

  const prefix = runtimePrefixForGame(gameId);
  let continuationToken = undefined;

  do {
    const response = await r2.send(new ListObjectsV2Command({
      Bucket: fromBucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));

    const contents = response.Contents || [];
    for (const item of contents) {
      if (!item.Key) continue;
      await r2.send(new CopyObjectCommand({
        Bucket: toBucket,
        Key: item.Key,
        CopySource: buildCopySource(fromBucket, item.Key)
      }));
      await r2.send(new DeleteObjectCommand({ Bucket: fromBucket, Key: item.Key }));
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
}

async function deleteRuntimeObjects(gameId, bucket) {
  if (!gameId || !bucket) return;
  assertR2Config(bucket);

  const prefix = runtimePrefixForGame(gameId);
  let continuationToken = undefined;

  do {
    const response = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));

    const contents = response.Contents || [];
    for (const item of contents) {
      if (!item.Key) continue;
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.Key }));
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const normalizeArchivePath = (entryName) => {
  const normalized = String(entryName || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return normalized;
};

const contentTypeForPath = (entryName) => {
  const ext = path.posix.extname(entryName).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.wasm': return 'application/wasm';
    case '.mp3': return 'audio/mpeg';
    case '.mp4': return 'video/mp4';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
};

const extractObjectKeyFromUrl = (url, bucketHint = null) => {
  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    if (bucketHint) {
      if (pathname.startsWith(`${bucketHint}/`)) return pathname.slice(bucketHint.length + 1);
      return pathname || null;
    }

    const mediaOrigin = config.r2MediaPublicUrl ? new URL(config.r2MediaPublicUrl).origin : null;
    const publicGameOrigin = config.r2PublicGamePublicUrl
      ? new URL(config.r2PublicGamePublicUrl).origin
      : config.r2GamePublicUrl
        ? new URL(config.r2GamePublicUrl).origin
        : null;
    const legacyOrigin = config.r2PublicUrl ? new URL(config.r2PublicUrl).origin : null;
    if (mediaOrigin && parsed.origin === mediaOrigin) return pathname || null;
    if (publicGameOrigin && parsed.origin === publicGameOrigin) return pathname || null;
    if (legacyOrigin && parsed.origin === legacyOrigin) return pathname || null;

    const mediaBucket = getMediaBucket();
    const publicGameBucket = getPublicGameBucket();
    const privateGameBucket = getPrivateGameBucket();
    if (mediaBucket && pathname.startsWith(`${mediaBucket}/`)) {
      return pathname.slice(mediaBucket.length + 1);
    }
    if (publicGameBucket && pathname.startsWith(`${publicGameBucket}/`)) {
      return pathname.slice(publicGameBucket.length + 1);
    }
    if (privateGameBucket && pathname.startsWith(`${privateGameBucket}/`)) {
      return pathname.slice(privateGameBucket.length + 1);
    }

    return pathname || null;
  } catch {
    return null;
  }
};

const isWebRuntime = (runtime) => {
  const value = String(runtime || '').toUpperCase();
  return ['BROWSER', 'WEB', 'WEBGL', 'HTML5'].includes(value);
};

async function uploadRuntimeObject(objectKey, data, contentType, bucket = getPrivateGameBucket()) {
  const targetBucket = bucket || getPrivateGameBucket();
  assertR2Config(targetBucket);
  try {
    await r2.send(new PutObjectCommand({
      Bucket: targetBucket,
      Key: objectKey,
      Body: data,
      ContentType: contentType || 'application/octet-stream'
    }));
  } catch (error) {
    console.error('[runtime-upload-failed]', { objectKey, message: error?.message });
    throw new HttpError(502, 'STORAGE_UPLOAD_FAILED', 'Failed to upload runtime object');
  }
}

async function scanAndPrepareBuild(build, game) {
  const objectKey = build.artifactObjectKey;
  if (!objectKey) throw new HttpError(409, 'BUILD_ARTIFACT_MISSING', 'Build artifact is missing');

  // If the build was already chunked client-side, we bypass zip extraction and server chunking
  if (build.distributionType === 'CHUNKED') {
    return prisma.gameBuild.update({
      where: { id: build.id },
      data: {
        status: 'READY',
        scanStatus: 'PASSED',
        scanMessage: 'Chunked build verified and passed.'
      }
    });
  }

  // Server-Side Native Chunking Pipeline for Windows/Linux uploads on web
  const isNative = ['WINDOWS', 'LINUX'].includes(build.platform?.toUpperCase());
  if (isNative && objectKey.endsWith('.zip')) {
    console.log('[backend-chunking-pipeline-triggered]', {
      buildId: build.id,
      platform: build.platform,
      objectKey
    });

    const bucket = getPrivateGameBucket();
    assertR2Config(bucket);

    // 1. Download ZIP from Cloudflare R2
    let archiveBuffer;
    try {
      const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
      const bodyStream = response.Body;
      const chunks = [];
      for await (const chunk of bodyStream) {
        chunks.push(Buffer.from(chunk));
      }
      archiveBuffer = Buffer.concat(chunks);
    } catch (error) {
      console.error('[backend-chunk-download-failed]', { buildId: build.id, objectKey, message: error?.message });
      throw new HttpError(502, 'BUILD_DOWNLOAD_FAILED', 'Failed to download build artifact for backend chunking');
    }

    // 2. Open ZIP archive
    let zip;
    try {
      zip = new AdmZip(archiveBuffer);
    } catch {
      throw new HttpError(400, 'BUILD_ARCHIVE_INVALID', 'Build archive is invalid or not a zip file');
    }

    // 3. Create a unique temp folder inside the standard OS tmpdir
    const randomId = crypto.randomBytes(16).toString('hex');
    const tempDir = path.join(os.tmpdir(), `lazplay_build_${build.id}_${randomId}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      // 4. Extract all files to tempDir
      zip.extractAllTo(tempDir, true);

      // 5. Run the high-performance local chunking, ZSTD compression & BLAKE3 hashing pipeline
      const { manifest, chunks: chunkMap } = await processBuildDirectory(tempDir, {
        version: build.version || '1.0.0',
        entrypoint: build.entrypoint || 'game.exe',
        platform: build.platform
      });

      // 6. Upload generated chunks to Cloudflare R2
      for (const [hash, chunkInfo] of chunkMap.entries()) {
        const chunkKey = `chunks/${hash}`;
        // Delta Deduplication: Check if chunk already exists to prevent duplicate S3 puts
        const chunkExists = await prisma.contentChunk.findUnique({ where: { hash } });
        if (!chunkExists) {
          console.log('[backend-chunking-uploading]', { hash, size: chunkInfo.size });
          await uploadRuntimeObject(chunkKey, chunkInfo.data, 'application/octet-stream', bucket);
        }
      }

      // 7. Publish build manifest (registers chunks, links build, updates status to READY and distributionType to CHUNKED)
      const record = await publishBuildManifest(build.id, build.version || '1.0.0', manifest, (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`);

      console.log('[backend-chunking-pipeline-success]', {
        buildId: build.id,
        chunkCount: record.chunkCount,
        totalBytes: record.totalBytes.toString()
      });

      return prisma.gameBuild.findUnique({ where: { id: build.id } });
    } finally {
      // 8. Clean up tempDir completely
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('[backend-chunk-temp-cleanup-failed]', { tempDir, error: err.message });
      }
    }
  }

  const isWeb = isWebRuntime(build.runtime || build.platform);

  // Optimization: If it's not a web game, or it's a paid web game,
  // we don't need to extract anything. Skip downloading the archive.
  if (!isWeb || game.priceType !== 'FREE') {
    const scanMessage = isWeb && game.priceType !== 'FREE'
      ? 'Web runtime skipped for paid game. File will only be available for download.'
      : null;

    console.log('[build-scan-skipped] Extraction not required', {
      buildId: build.id,
      gameId: game.id,
      isWeb,
      priceType: game.priceType
    });

    return prisma.gameBuild.update({
      where: { id: build.id },
      data: {
        status: 'SCANNED',
        scanStatus: 'PASSED',
        scanMessage
      }
    });
  }

  const bucket = isWeb ? getPublicGameBucket() : getPrivateGameBucket();
  assertR2Config(bucket);
  const runtimeBucket = getRuntimeBucketForGame(game, build);

  // Only download if we are actually going to extract it (Free + Web)
  let archiveBuffer;
  try {
    const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    const bodyStream = response.Body;
    const chunks = [];
    for await (const chunk of bodyStream) {
      chunks.push(Buffer.from(chunk));
    }
    archiveBuffer = Buffer.concat(chunks);
  } catch (error) {
    console.error('[build-download-failed]', { buildId: build.id, objectKey, message: error?.message });
    throw new HttpError(502, 'BUILD_DOWNLOAD_FAILED', 'Failed to download build artifact');
  }

  let zip;
  try {
    zip = new AdmZip(archiveBuffer);
  } catch {
    throw new HttpError(400, 'BUILD_ARCHIVE_INVALID', 'Build archive is invalid or not a zip file');
  }

  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (isWeb && entries.length > 1000) {
    throw new HttpError(400, 'BUILD_FILE_COUNT_EXCEEDED', `Web game builds are strictly limited to a maximum of 1,000 files/items to ensure optimal browser execution performance. Your build contains ${entries.length} items. Please compress, pack textures, or bundle assets.`);
  }
  const normalizedEntries = [];
  let entrypoint = null;

  for (const entry of entries) {
    const normalized = normalizeArchivePath(entry.entryName);
    if (!normalized) continue;
    normalizedEntries.push({ entry, normalized });
    if (normalized.toLowerCase() === 'index.html') entrypoint = normalized;
    if (!entrypoint && normalized.toLowerCase().endsWith('/index.html')) entrypoint = normalized;
  }

  if (!entrypoint) {
    // If no root index.html, try to find any index.html or game.exe in the archive
    const backup = normalizedEntries.find(e =>
      e.normalized.toLowerCase().endsWith('index.html') ||
      e.normalized.toLowerCase().endsWith('game.exe') ||
      e.normalized.toLowerCase().endsWith('.exe')
    );

    if (backup) {
      entrypoint = backup.normalized;
      console.log('[build-entrypoint-fallback]', { buildId: build.id, entrypoint });
    } else if (isWeb) {
      // For web, if we really can't find anything, we must fail
      console.error('[build-entrypoint-missing]', { buildId: build.id, objectKey });
      throw new HttpError(400, 'BUILD_ENTRYPOINT_MISSING', 'index.html was not found in the build archive');
    } else {
      // For native, we can default to game.exe and let the launcher handle it
      entrypoint = 'game.exe';
    }
  }

  console.log('[build-zip-entries]', { buildId: build.id, entries: normalizedEntries.length, entrypoint });

  for (const { entry, normalized } of normalizedEntries) {
    const runtimeKey = `runtime/${game.id}/${build.id}/${normalized}`;
    await uploadRuntimeObject(runtimeKey, entry.getData(), contentTypeForPath(normalized), runtimeBucket);
  }

  return prisma.gameBuild.update({
    where: { id: build.id },
    data: { status: 'SCANNED', scanStatus: 'PASSED', entrypoint }
  });
}

async function deleteStorageObject(objectKey, bucket = resolveBucketForKey(objectKey)) {
  if (!objectKey) return;
  try {
    const resolvedBucket = bucket || resolveBucketForKey(objectKey);
    if (!resolvedBucket) return;
    await r2.send(new DeleteObjectCommand({ Bucket: resolvedBucket, Key: objectKey }));
  } catch { }
}

async function deleteStorageRecord(objectKey) {
  if (!objectKey) return;
  try {
    await prisma.storageObject.deleteMany({ where: { objectKey } });
  } catch { }
}

async function deleteStorageObjectFromUrl(url, bucketHint = null) {
  const objectKey = extractObjectKeyFromUrl(url, bucketHint);
  if (!objectKey) return;
  await deleteStorageObject(objectKey, bucketHint || resolveBucketForKey(objectKey));
  await deleteStorageRecord(objectKey);
}

function razorpaySignature(orderId, paymentId) {
  return crypto.createHmac('sha256', config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
}

function assertRazorpayWebhook(req) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature && config.allowMockPayments) return;
  if (!signature) throw new HttpError(401, 'WEBHOOK_SIGNATURE_REQUIRED', 'Razorpay webhook signature is required');
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
  if (!safeCompare(signature, expected)) {
    throw new HttpError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Razorpay webhook signature is invalid');
  }
}

async function sendEmail({ to, subject, html }) {
  if (!config.resendApiKey) {
    console.warn('[email-skipped] Resend API key not configured', { to, subject });
    return null;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LazPlay <noreply@mail.lazplay.tech>',
        to,
        subject,
        html
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[email-failed]', data);
      throw new Error(data.message || 'Failed to send email');
    }
    return data;
  } catch (error) {
    console.error('[email-error]', error);
    throw error;
  }
}

async function createOTP(email, purpose) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const id = createId('otp');
  
  await prisma.otp.create({
    data: { id, email, code, purpose, expiresAt }
  });
  
  return code;
}

async function verifyOTP(email, purpose, code) {
  const otp = await prisma.otp.findFirst({
    where: { email, purpose, code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!otp) return false;
  
  // Mark as used by deleting it
  await prisma.otp.delete({ where: { id: otp.id } });
  return true;
}

async function sendOTP(email, purpose, subjectPrefix = 'LazPlay') {
  const code = await createOTP(email, purpose);
  const subject = purpose === 'VERIFY_EMAIL' 
    ? `[${subjectPrefix}] Verify your email` 
    : `[${subjectPrefix}] Reset your password`;
    
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; background: #fff; border-radius: 8px;">
      <h2 style="color: #000;">${subject}</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; padding: 16px; background: #f0f0f0; border-radius: 6px; display: inline-block; letter-spacing: 4px; color: #000;">
        ${code}
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
      <p style="font-size: 12px; color: #999;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

function registerRoutes(router) {

  const ctx = {
    config, getRazorpay, HttpError, ok, noContent, nowIso, addSeconds, createId, slugify, toArray,
    parsePagination, paginate, hashPassword, verifyPassword, signHmac, safeCompare, signToken, verifyToken,
    sanitizeUser, money, readJsonBody, toHttpError, logRequest, logRouteRegistration, safeRequestDebug,
    routeDebugDetails, sendJson, createRouter, splitPath, getBearerToken, getOptionalUser, requireAuth,
    createTokens, developerForUser, findGame, findBuild, findDeployment, gameDeveloper, assertDeveloperOwnsGame,
    userOwnsGame, ensureLibraryItem, setLatestBuild, grantEntitlement, addNotification, addAuditLog, publicGame,
    getMediaBucket, getPublicGameBucket, getPrivateGameBucket, getGameBucket, getRuntimeBucketForPriceType,
    getRuntimeBucketForGame, assertR2Config, resolveBucketForPurpose, resolveBucketForKey, publicObjectUrl,
    signedStorageUrl, runtimePrefixForGame, buildCopySource, moveRuntimeObjects, fetchWithTimeout,
    normalizeArchivePath, contentTypeForPath, extractObjectKeyFromUrl, isWebRuntime, uploadRuntimeObject,
    scanAndPrepareBuild, deleteRuntimeObjects, deleteStorageObject, deleteStorageRecord, deleteStorageObjectFromUrl, razorpaySignature,
    validationFailure, assertRazorpayWebhook, sendEmail, createOTP, verifyOTP, sendOTP
  };

  registerAuthRoutes(router, ctx);
  registerGamesRoutes(router, ctx);
  registerLibraryRoutes(router, ctx);
  registerWishlistRoutes(router, ctx);
  registerPaymentsRoutes(router, ctx);
  registerStorageRoutes(router, ctx);
  registerDeveloperRoutes(router, ctx);
  registerInstancesRoutes(router, ctx);
  registerAdminRoutes(router, ctx);
  registerNotificationsRoutes(router, ctx);
  registerSystemRoutes(router, ctx);
  registerChunkRoutes(router, ctx);
}

export async function createApp() {
  // Connect to PostgreSQL via Prisma
  await prisma.$connect();
  const router = createRouter();
  registerRoutes(router);
  logRouteRegistration(router.routes());

  return async function app(req, res) {
    const requestId = createId('req');
    const startedAt = Date.now();
    let matched = null;
    let routePath = null;
    req.requestId = requestId;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Razorpay-Signature, X-Lazplay-Internal-Secret');
    res.setHeader('X-Request-Id', requestId);

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, null);
      return;
    }

    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith(config.apiPrefix)) {
        throw new HttpError(404, 'NOT_FOUND', `Route must start with ${config.apiPrefix}`);
      }
      routePath = url.pathname.slice(config.apiPrefix.length) || '/';
      matched = router.match(req.method, routePath);
      if (!matched) {
        throw new HttpError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
      }
      req.query = url.searchParams;
      req.params = matched.params;
      req.body = await readJsonBody(req);
      const response = await matched.route.handler(req);
      res.setHeader('X-Response-Time', `${Date.now() - startedAt}ms`);
      sendJson(res, response.status, response.body);
      logRequest('request-complete', safeRequestDebug(req, matched, routePath, response.status, startedAt));
    } catch (error) {
      const httpError = toHttpError(error);
      const status = httpError.status;
      const code = httpError.code;
      const message = httpError.message;
      res.setHeader('X-Response-Time', `${Date.now() - startedAt}ms`);
      logRequest('request-error', routeDebugDetails(req, matched, routePath, status, code, message, startedAt, error));
      sendJson(res, status, {
        success: false,
        error: {
          code,
          message,
          details: httpError.details
        },
        requestId
      });
    }
  };
}

export { config, verifyToken };
