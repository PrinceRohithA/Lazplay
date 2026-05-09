import crypto from 'node:crypto';
import path from 'node:path';
import Razorpay from 'razorpay';
import AdmZip from 'adm-zip';
import { prisma } from './prisma.js';


const config = {
  // Nginx strips /api/ before proxying, so the backend sees /v1/... paths.
  // Override with API_PREFIX=/api/v1 for local dev without nginx.
  apiPrefix: process.env.API_PREFIX || '/v1',
  appVersion: process.env.APP_VERSION || '1.0.0',
  appEnv: process.env.APP_ENV || 'development',
  publicApiUrl: process.env.PUBLIC_API_URL || 'https://play.lazplay.tech/api/v1',
  publicWebUrl: process.env.PUBLIC_WEB_URL || 'https://play.lazplay.tech',
  authSecret: process.env.AUTH_SECRET || 'lazplay-dev-secret-change-before-production',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 604800),
  runtimeTokenTtlSeconds: Number(process.env.RUNTIME_TOKEN_TTL_SECONDS || 900),
  minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'https://cdn.lazplay.tech',
  minioBucket: process.env.MINIO_BUCKET || 'lazplay',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_lazplay',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'lazplay-razorpay-dev-secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'lazplay-webhook-dev-secret',
  allowMockPayments: (process.env.ALLOW_MOCK_PAYMENTS || 'true') === 'true'
};

// Lazy Razorpay SDK client — created once when first needed
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

const requireFields = (body, fields) => {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length > 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Missing required fields',
      missing.map((field) => ({ field, message: `${field} is required` }))
    );
  }
};

const parsePagination = (query) => ({
  page: Math.max(1, Number(query.get('page') || 1)),
  limit: Math.min(100, Math.max(1, Number(query.get('limit') || 20)))
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
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
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

  const add = (method, pattern, handler) => {
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

  return { add, match };
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
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  } catch { return null; }
}

async function requireAuth(req, _db, roles = []) {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  const payload = verifyToken(token);
  if (payload.type !== 'access') throw new HttpError(401, 'INVALID_TOKEN', 'Access token is required');
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'USER_INACTIVE', 'User is inactive or missing');
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
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (game?.priceType === 'FREE') return true;
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
  const screenshots = await prisma.gameMedia.findMany({ where: { gameId: game.id, type: 'IMAGE' } });
  const isOwned = user ? await userOwnsGame(user.id, game.id) : false;
  const isWishlisted = user ? !!(await prisma.wishlistItem.findFirst({ where: { userId: user.id, gameId: game.id } })) : false;
  return {
    id: game.id, slug: game.slug, title: game.title, shortDescription: game.shortDescription,
    description: game.description, price: game.price, currency: game.currency, priceType: game.priceType,
    releaseDate: game.releaseDate,
    developer: developer ? { id: developer.id, displayName: developer.displayName } : null,
    publisher: game.publisher, genres: game.genres, tags: game.tags, platforms: game.platforms,
    coverUrl: game.coverUrl, heroImageUrl: game.heroImageUrl, trailerUrl: game.trailerUrl,
    screenshots: screenshots.map((m) => m.url),
    systemRequirements: game.systemRequirements,
    isOwned, isWishlisted, rating, reviewCount: reviews.length,
    status: game.status, publishedAt: game.publishedAt, createdAt: game.createdAt, updatedAt: game.updatedAt,
  };
}

function signedStorageUrl(objectKey, method = 'GET', ttlSeconds = 900) {
  const expiresAt = addSeconds(ttlSeconds);
  const expires = Math.floor(new Date(expiresAt).getTime() / 1000);
  const signature = signHmac(`${method}:${config.minioBucket}:${objectKey}:${expires}`, config.minioSecretKey || config.authSecret);
  const normalizedBase = config.minioPublicUrl.replace(/\/+$/g, '');
  return {
    url: `${normalizedBase}/${config.minioBucket}/${encodeURIComponent(objectKey).replaceAll('%2F', '/')}?expires=${expires}&signature=${signature}`,
    expiresAt
  };
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

const extractObjectKeyFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const prefix = `/${config.minioBucket}/`;
    const pathname = decodeURIComponent(parsed.pathname);
    if (!pathname.startsWith(prefix)) return null;
    return pathname.slice(prefix.length);
  } catch {
    return null;
  }
};

const isWebRuntime = (runtime) => {
  const value = String(runtime || '').toUpperCase();
  return ['BROWSER', 'WEB', 'WEBGL', 'HTML5'].includes(value);
};

async function uploadRuntimeObject(objectKey, data, contentType) {
  const signed = signedStorageUrl(objectKey, 'PUT', 3600);
  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
    body: data
  });
  if (!response.ok) {
    throw new HttpError(502, 'STORAGE_UPLOAD_FAILED', `Failed to upload runtime object (${response.status})`);
  }
}

async function scanAndPrepareBuild(build, game) {
  const objectKey = build.artifactObjectKey || extractObjectKeyFromUrl(build.downloadUrl);
  if (!objectKey) throw new HttpError(409, 'BUILD_ARTIFACT_MISSING', 'Build artifact is missing');

  const download = signedStorageUrl(objectKey, 'GET', 3600);
  const response = await fetch(download.url);
  if (!response.ok) {
    throw new HttpError(502, 'BUILD_DOWNLOAD_FAILED', `Failed to download build artifact (${response.status})`);
  }

  const archiveBuffer = Buffer.from(await response.arrayBuffer());

  if (isWebRuntime(build.runtime || build.platform)) {
    let zip;
    try {
      zip = new AdmZip(archiveBuffer);
    } catch {
      throw new HttpError(400, 'BUILD_ARCHIVE_INVALID', 'Build archive is invalid or not a zip file');
    }

    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
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
      throw new HttpError(400, 'BUILD_ENTRYPOINT_MISSING', 'index.html was not found in the build archive');
    }

    for (const { entry, normalized } of normalizedEntries) {
      const runtimeKey = `runtime/${game.id}/${build.id}/${normalized}`;
      await uploadRuntimeObject(runtimeKey, entry.getData(), contentTypeForPath(normalized));
    }

    return prisma.gameBuild.update({
      where: { id: build.id },
      data: { status: 'SCANNED', scanStatus: 'PASSED', entrypoint }
    });
  }

  return prisma.gameBuild.update({
    where: { id: build.id },
    data: { status: 'SCANNED', scanStatus: 'PASSED' }
  });
}

function razorpaySignature(orderId, paymentId) {
  return crypto.createHmac('sha256', config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
}

function assertRazorpayWebhook(req) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature && config.allowMockPayments) return;
  if (!signature) throw new HttpError(401, 'WEBHOOK_SIGNATURE_REQUIRED', 'Razorpay webhook signature is required');
  const rawBody = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
  if (!safeCompare(signature, expected)) {
    throw new HttpError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Razorpay webhook signature is invalid');
  }
}

function registerRoutes(router) {

  router.add('GET', '/health', async () =>
    ok({
      status: 'ok',
      api: 'ok',
      database: 'ok',
      redis: 'not_configured',
      minio: 'configured',
      queue: 'in_process',
      timestamp: nowIso()
    })
  );

  router.add('GET', '/version', async () =>
    ok({
      name: 'lazplay-backend',
      version: config.appVersion,
      commit: 'local-dev',
      environment: config.appEnv
    })
  );

  router.add('POST', '/auth/register', async (req) => {
    requireFields(req.body, ['username', 'email', 'password', 'displayName']);
    const email = String(req.body.email).toLowerCase();
    const username = String(req.body.username).toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) {
      throw new HttpError(400, 'USER_EXISTS', 'Email or username already registered');
    }

    const user = await prisma.user.create({
      data: {
        id: createId('usr'),
        username,
        email,
        passwordHash: hashPassword(req.body.password),
        displayName: req.body.displayName,
        roles: ['PLAYER'],
        status: 'ACTIVE'
      }
    });

    const tokens = await createTokens(user);
    return ok({ user: sanitizeUser(user), ...tokens }, 201);
  });

  router.add('POST', '/auth/login', async (req) => {
    requireFields(req.body, ['identifier', 'password']);
    const identifier = String(req.body.identifier).toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });
    if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
    }
    if (user.status !== 'ACTIVE') throw new HttpError(403, 'USER_INACTIVE', 'User is not active');
    const tokens = await createTokens(user);
    return ok({ user: sanitizeUser(user), ...tokens });
  });

  router.add('POST', '/auth/refresh', async (req) => {
    requireFields(req.body, ['refreshToken']);
    const payload = verifyToken(req.body.refreshToken);
    if (payload.type !== 'refresh') throw new HttpError(401, 'INVALID_TOKEN', 'Refresh token is required');

    const session = await prisma.refreshSession.findFirst({
      where: { id: payload.sid, refreshTokenId: payload.jti }
    });
    if (!session || session.revokedAt) throw new HttpError(401, 'SESSION_REVOKED', 'Refresh session is not active');

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, 'USER_NOT_FOUND', 'User was not found');
    const tokens = await createTokens(user);
    return ok(tokens);
  });

  router.add('POST', '/auth/logout', async (req) => {
    const user = await requireAuth(req);
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      try {
        const payload = verifyToken(refreshToken);
        await prisma.refreshSession.updateMany({
          where: { id: payload.sid, userId: user.id },
          data: { revokedAt: new Date() }
        });
      } catch (e) { /* ignore invalid token on logout */ }
    }
    return ok({ loggedOut: true });
  });

  router.add('POST', '/auth/forgot-password', async () =>
    ok({
      message: 'If the email exists, a reset link has been sent'
    })
  );

  router.add('POST', '/auth/reset-password', async (req) => {
    requireFields(req.body, ['token', 'newPassword']);
    return ok({ passwordUpdated: true });
  });

  router.add('GET', '/auth/me', async (req) => {
    const user = await requireAuth(req);
    return ok(sanitizeUser(user));
  });

  router.add('PATCH', '/users/me', async (req) => {
    const user = await requireAuth(req);
    const data = {};
    if (req.body.displayName !== undefined) data.displayName = req.body.displayName;
    if (req.body.bio !== undefined) data.bio = req.body.bio;
    if (req.body.avatarObjectKey) {
      data.avatarUrl = signedStorageUrl(req.body.avatarObjectKey).url;
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data
    });
    return ok(sanitizeUser(updated));
  });

  router.add('PATCH', '/users/me/password', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['currentPassword', 'newPassword']);
    if (!verifyPassword(req.body.currentPassword, user.passwordHash)) {
      throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(req.body.newPassword) }
    });
    return ok({ passwordChanged: true });
  });

  router.add('GET', '/games/featured', async (req) => {
    const user = await getOptionalUser(req);
    const limit = Math.min(20, Math.max(1, Number(req.query.get('limit') || 6)));
    const games = await prisma.game.findMany({
      where: { status: 'PUBLISHED', featured: true },
      take: limit,
      orderBy: { publishedAt: 'desc' }
    });
    const results = await Promise.all(games.map(async (game) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      heroImageUrl: game.heroImageUrl,
      tagline: game.shortDescription,
      isOwned: user ? await userOwnsGame(user.id, game.id) : false
    })));
    return ok(results);
  });

  router.add('GET', '/games', async (req) => {
    const user = await getOptionalUser(req);
    const search = req.query.get('search') || '';
    const genre = req.query.get('genre');
    const tags = toArray(req.query.get('tags'));
    const platform = req.query.get('platform');
    const priceType = req.query.get('priceType');
    const status = req.query.get('status') || 'PUBLISHED';
    const sort = req.query.get('sort') || 'featured';
    const { page, limit } = parsePagination(req.query);

    const where = { status };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }
    if (genre) where.genres = { has: genre };
    if (tags.length > 0) where.tags = { hasEvery: tags };
    if (platform) where.platforms = { has: platform };
    if (priceType) where.priceType = priceType;

    let orderBy = { createdAt: 'desc' };
    if (sort === 'newest') orderBy = { publishedAt: 'desc' };
    if (sort === 'price_low_to_high') orderBy = { price: 'asc' };
    if (sort === 'featured') orderBy = { featured: 'desc' };

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    const pageItems = await Promise.all(games.map(g => publicGame(g, user)));
    return ok(pageItems, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('GET', '/games/:gameId/media', async (req) => {
    const game = await findGame(req.params.gameId);
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const media = await prisma.gameMedia.findMany({
      where: { gameId: game.id },
      orderBy: { sortOrder: 'asc' }
    });
    return ok(media);
  });

  router.add('GET', '/games/:gameId/reviews', async (req) => {
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const { page, limit } = parsePagination(req.query);

    const [total, reviews] = await Promise.all([
      prisma.gameReview.count({ where: { gameId: game.id } }),
      prisma.gameReview.findMany({
        where: { gameId: game.id },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    const items = reviews.map(r => ({
      ...r,
      author: sanitizeUser(r.user)
    }));

    return ok(items, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('POST', '/games/:gameId/reviews', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!(await userOwnsGame(user.id, game.id))) throw new HttpError(403, 'GAME_NOT_OWNED', 'You must own the game to review it');
    requireFields(req.body, ['rating', 'body']);
    const rating = Math.max(1, Math.min(5, Number(req.body.rating)));

    const review = await prisma.gameReview.upsert({
      where: { gameId_userId: { gameId: game.id, userId: user.id } },
      update: { rating, body: req.body.body },
      create: {
        id: createId('rev'),
        gameId: game.id,
        userId: user.id,
        rating,
        body: req.body.body
      }
    });

    return ok(review, 201);
  });

  router.add('DELETE', '/games/:gameId/reviews/:reviewId', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER', 'DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');

    const review = await prisma.gameReview.findUnique({ where: { id: req.params.reviewId } });
    if (!review || review.gameId !== game.id) throw new HttpError(404, 'REVIEW_NOT_FOUND', 'Review was not found');

    const developer = await developerForUser(user);
    const isDev = developer && developer.id === game.developerId;
    if (review.userId !== user.id && !user.roles.includes('ADMIN') && !isDev) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot delete this review');
    }

    await prisma.gameReview.delete({ where: { id: review.id } });
    return ok({ reviewId: review.id, deleted: true });
  });

  router.add('GET', '/games/:gameId/launch-manifest', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!(await userOwnsGame(user.id, game.id))) throw new HttpError(403, 'GAME_NOT_OWNED', 'You do not own this game');

    const build = game.latestBuildId ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } }) : null;
    const entrypoint = build?.entrypoint || 'index.html';
    const entryDir = entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1) : '';
    const runtimeKey = `runtime/${game.id}/${build?.id || 'latest'}/${entrypoint}`;
    const manifestKey = `runtime/${game.id}/${build?.id || 'latest'}/${entryDir}manifest.json`;
    return ok({
      gameId: game.id,
      buildId: build?.id || null,
      version: build?.version || null,
      runtime: build?.runtime || 'BROWSER',
      entrypointUrl: signedStorageUrl(runtimeKey).url,
      assetManifestUrl: signedStorageUrl(manifestKey).url,
      expiresAt: addSeconds(config.runtimeTokenTtlSeconds)
    });
  });

  router.add('GET', '/games/:gameId', async (req) => {
    const user = await getOptionalUser(req);
    const game = await findGame(req.params.gameId);
    if (!game || (game.status !== 'PUBLISHED' && !user?.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    }
    return ok(await publicGame(game, user));
  });

  router.add('GET', '/genres', async () => {
    const games = await prisma.game.findMany({ select: { genres: true } });
    const genres = [...new Set(games.flatMap(g => g.genres))].sort();
    return ok(genres.map((name) => ({ id: `genre_${slugify(name)}`, name, slug: slugify(name) })));
  });

  router.add('GET', '/tags', async () => {
    const games = await prisma.game.findMany({ select: { tags: true } });
    const tags = [...new Set(games.flatMap(g => g.tags))].sort();
    return ok(tags.map((name) => ({ id: `tag_${slugify(name)}`, name, slug: slugify(name) })));
  });

  router.add('GET', '/search', async (req) => {
    const q = req.query.get('q') || '';
    const limit = Math.min(20, Math.max(1, Number(req.query.get('limit') || 10)));
    const [games, developers] = await Promise.all([
      prisma.game.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, take: limit }),
      prisma.developerProfile.findMany({ where: { displayName: { contains: q, mode: 'insensitive' } }, take: limit })
    ]);
    return ok({ games, developers });
  });

  router.add('GET', '/library', async (req) => {
    const user = await requireAuth(req);
    const items = await prisma.libraryItem.findMany({
      where: { userId: user.id },
      include: { game: true },
      orderBy: { lastPlayedAt: 'desc' }
    });
    return ok(items);
  });

  router.add('GET', '/library/:gameId', async (req) => {
    const user = await requireAuth(req);
    const item = await prisma.libraryItem.findUnique({
      where: { userId_gameId: { userId: user.id, gameId: req.params.gameId } },
      include: { game: { include: { builds: { take: 1, orderBy: { createdAt: 'desc' } } } } }
    });
    if (!item) throw new HttpError(404, 'NOT_IN_LIBRARY', 'Game not in your library');
    return ok(item);
  });

  router.add('POST', '/library/:gameId/favorite', async (req) => {
    const user = await requireAuth(req);
    const updated = await prisma.libraryItem.update({
      where: { userId_gameId: { userId: user.id, gameId: req.params.gameId } },
      data: { favorite: true }
    });
    return ok(updated);
  });

  router.add('DELETE', '/library/:gameId/favorite', async (req) => {
    const user = await requireAuth(req);
    const updated = await prisma.libraryItem.update({
      where: { userId_gameId: { userId: user.id, gameId: req.params.gameId } },
      data: { favorite: false }
    });
    return ok(updated);
  });

  router.add('GET', '/wishlist', async (req) => {
    const user = await requireAuth(req);
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: { game: true }
    });
    return ok(items);
  });

  router.add('POST', '/wishlist', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['gameId']);
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_gameId: { userId: user.id, gameId: req.body.gameId } }
    });
    if (existing) return ok(existing);
    const item = await prisma.wishlistItem.create({
      data: { id: createId('wish'), userId: user.id, gameId: req.body.gameId }
    });
    return ok(item, 201);
  });

  router.add('DELETE', '/wishlist/:gameId', async (req) => {
    const user = await requireAuth(req);
    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, gameId: req.params.gameId }
    });
    return ok({ deleted: true });
  });

  router.add('GET', '/library', async (req) => {
    const user = await requireAuth(req);
    const items = await prisma.libraryItem.findMany({
      where: { userId: user.id },
      include: { game: true },
      orderBy: { lastPlayedAt: 'desc' }
    });
    return ok(items);
  });

  router.add('POST', '/library', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['gameId']);
    const item = await ensureLibraryItem(user.id, req.body.gameId, 'FREE');
    return ok(item, 201);
  });

  router.add('DELETE', '/library/:gameId', async (req) => {
    const user = await requireAuth(req);
    await prisma.libraryItem.deleteMany({
      where: { userId: user.id, gameId: req.params.gameId }
    });
    return ok({ deleted: true });
  });

  router.add('GET', '/entitlements', async (req) => {
    const user = await requireAuth(req);
    const entitlements = await prisma.entitlement.findMany({
      where: { userId: user.id },
      include: { game: true }
    });
    return ok(entitlements);
  });

  router.add('POST', '/payments/razorpay/orders', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    requireFields(req.body, ['gameId']);
    const game = await prisma.game.findUnique({ where: { id: req.body.gameId } });
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (await userOwnsGame(user.id, game.id)) throw new HttpError(409, 'ALREADY_OWNED', 'You already own this game');

    if (game.priceType === 'FREE') {
      const entitlement = await grantEntitlement(user.id, game.id, 'FREE');
      await addNotification(user.id, 'GAME_ADDED', 'Game added to library', `${game.title} was added to your library.`);
      return ok({ free: true, entitlement, libraryItemCreated: true }, 201);
    }

    const discount = req.body.couponCode === 'LAZ10' ? Math.floor(game.price * 0.1) : 0;
    const amount = game.price - discount;
    const internalOrderId = createId('ord');

    try {
      const rzpOrder = await getRazorpay().orders.create({
        amount,
        currency: game.currency || 'INR',
        receipt: `receipt_${internalOrderId}`,
      });

      const order = await prisma.order.create({
        data: {
          id: internalOrderId,
          userId: user.id,
          gameId: game.id,
          razorpayOrderId: rzpOrder.id,
          amount,
          currency: rzpOrder.currency,
          status: 'CREATED',
        },
      });

      return ok({
        internalOrderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        receipt: rzpOrder.receipt,
        game: { id: game.id, title: game.title },
        razorpayKeyId: config.razorpayKeyId
      }, 201);
    } catch (error) {
      console.error('Razorpay Order Creation Error:', error);
      throw new HttpError(500, 'PAYMENT_PROVIDER_ERROR', 'Could not create payment order');
    }
  });

  router.add('POST', '/payments/razorpay/verify', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    requireFields(req.body, ['internalOrderId', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature']);

    const order = await prisma.order.findUnique({
      where: { id: req.body.internalOrderId },
    });

    if (!order || order.razorpayOrderId !== req.body.razorpayOrderId || order.userId !== user.id) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    }

    const expected = razorpaySignature(req.body.razorpayOrderId, req.body.razorpayPaymentId);
    if (req.body.razorpaySignature !== expected && !(config.allowMockPayments && req.body.razorpaySignature === 'mock_signature')) {
      throw new HttpError(400, 'INVALID_PAYMENT_SIGNATURE', 'Razorpay payment signature is invalid');
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      }),
      prisma.payment.create({
        data: {
          id: createId('pay'),
          orderId: order.id,
          razorpayPaymentId: req.body.razorpayPaymentId,
          amount: order.amount,
          currency: order.currency,
          status: 'CAPTURED',
        },
      }),
      prisma.invoice.create({
        data: {
          id: createId('inv'),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      }),
    ]);

    const entitlement = await grantEntitlement(user.id, order.gameId, 'RAZORPAY_ORDER');
    await addNotification(user.id, 'PAYMENT_CAPTURED', 'Purchase complete', 'Your game was added to your library.');

    return ok({
      paymentStatus: 'CAPTURED',
      entitlement,
      libraryItemCreated: true
    });
  });

  router.add('POST', '/webhooks/razorpay', async (req) => {
    assertRazorpayWebhook(req);
    const event = req.body.event;
    const entity = req.body.payload?.payment?.entity;
    if (event === 'payment.captured' && entity?.order_id) {
      const order = await prisma.order.findFirst({ where: { razorpayOrderId: entity.order_id } });
      if (order && order.status !== 'PAID') {
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID' },
          }),
          prisma.payment.create({
            data: {
              id: createId('pay'),
              orderId: order.id,
              razorpayPaymentId: entity.id,
              amount: entity.amount,
              currency: entity.currency,
              status: 'CAPTURED',
            },
          }),
        ]);
        await grantEntitlement(order.userId, order.gameId, 'RAZORPAY_WEBHOOK');
      }
    }
    return ok({ received: true });
  });

  router.add('GET', '/orders', async (req) => {
    const user = await requireAuth(req);
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { game: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });
    return ok(orders);
  });

  router.add('GET', '/orders/:orderId', async (req) => {
    const user = await requireAuth(req);
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { game: true, payments: true, invoices: true }
    });
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    return ok(order);
  });

  router.add('GET', '/invoices/:invoiceId', async (req) => {
    const user = await requireAuth(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.invoiceId }
    });
    if (!invoice || (invoice.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    return ok({
      downloadUrl: signedStorageUrl(invoice.objectKey).url
    });
  });

  router.add('POST', '/refunds', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['orderId', 'reason']);
    const order = await prisma.order.findUnique({ where: { id: req.body.orderId } });
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const refund = await prisma.refund.create({
      data: {
        id: createId('refund'),
        orderId: order.id,
        reason: req.body.reason,
        status: user.roles.includes('ADMIN') ? 'APPROVED' : 'REQUESTED'
      }
    });

    return ok(refund, 201);
  });

  router.add('POST', '/storage/presign-upload', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['purpose', 'fileName', 'contentType', 'sizeBytes']);
    const objectKey = `${req.body.purpose.toLowerCase()}/${user.id}/${Date.now()}-${slugify(req.body.fileName) || req.body.fileName}`;
    const signed = signedStorageUrl(objectKey, 'PUT');

    await prisma.storageObject.create({
      data: {
        id: createId('obj'),
        ownerId: user.id,
        objectKey,
        purpose: req.body.purpose,
        fileName: req.body.fileName,
        contentType: req.body.contentType,
        sizeBytes: BigInt(req.body.sizeBytes),
        status: 'PRESIGNED'
      }
    });

    return ok({ objectKey, uploadUrl: signed.url, method: 'PUT', expiresAt: signed.expiresAt }, 201);
  });

  router.add('POST', '/storage/presign-multipart', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['gameId', 'buildId', 'fileName', 'contentType', 'sizeBytes', 'partCount']);
    const game = await findGame(req.body.gameId);
    await assertDeveloperOwnsGame(user, game);

    const objectKey = `builds/${game.id}/${req.body.buildId}/${req.body.fileName}`;
    const uploadId = createId('minio_upload');
    const partCount = Math.min(10000, Math.max(1, Number(req.body.partCount)));

    await prisma.storageObject.create({
      data: {
        id: createId('obj'),
        ownerId: user.id,
        objectKey,
        uploadId,
        purpose: 'BUILD_ARTIFACT',
        fileName: req.body.fileName,
        contentType: req.body.contentType,
        sizeBytes: BigInt(req.body.sizeBytes),
        status: 'MULTIPART_PRESIGNED'
      }
    });

    const parts = Array.from({ length: partCount }, (_, i) => ({
      partNumber: i + 1,
      uploadUrl: `${signedStorageUrl(objectKey, 'PUT').url}&uploadId=${uploadId}&partNumber=${i + 1}`
    }));

    return ok({ objectKey, uploadId, parts, expiresAt: addSeconds(3600) }, 201);
  });

  router.add('POST', '/storage/complete-multipart', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['objectKey', 'uploadId', 'parts']);
    const object = await prisma.storageObject.findUnique({
      where: { objectKey: req.body.objectKey }
    });

    if (!object || (object.ownerId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'OBJECT_NOT_FOUND', 'Storage object not found');
    }

    const updated = await prisma.storageObject.update({
      where: { id: object.id },
      data: { status: 'UPLOADED', completedAt: new Date() }
    });

    return ok({ objectKey: updated.objectKey, completed: true });
  });

  router.add('GET', '/storage/presign-download', async (req) => {
    await requireAuth(req);
    const objectKey = req.query.get('objectKey');
    if (!objectKey) throw new HttpError(400, 'VALIDATION_ERROR', 'objectKey is required');
    const signed = signedStorageUrl(objectKey, 'GET');
    return ok({ downloadUrl: signed.url, expiresAt: signed.expiresAt });
  });

  router.add('POST', '/webhooks/minio/object-created', async (req) => {
    const secret = req.headers['x-lazplay-internal-secret'];
    if (secret !== config.authSecret && !config.allowMockPayments) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid internal secret');
    }
    requireFields(req.body, ['bucket', 'objectKey', 'sizeBytes']);

    await prisma.storageObject.upsert({
      where: { objectKey: req.body.objectKey },
      update: { status: 'UPLOADED', sizeBytes: BigInt(req.body.sizeBytes), etag: req.body.etag },
      create: {
        id: createId('obj'),
        ownerId: 'system',
        objectKey: req.body.objectKey,
        purpose: 'UNKNOWN',
        fileName: path.basename(req.body.objectKey),
        contentType: 'application/octet-stream',
        sizeBytes: BigInt(req.body.sizeBytes),
        status: 'UPLOADED'
      }
    });

    return ok({ processed: true });
  });

  router.add('POST', '/developer/register', async (req) => {
    const user = await requireAuth(req);
    requireFields(req.body, ['displayName']);
    const existing = await developerForUser(user);
    if (existing) throw new HttpError(409, 'DEVELOPER_EXISTS', 'Developer profile already exists');

    const profile = await prisma.developerProfile.create({
      data: {
        id: createId('dev'),
        userId: user.id,
        displayName: req.body.displayName,
        website: req.body.website,
        supportEmail: req.body.supportEmail || user.email
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: [...new Set([...user.roles, 'DEVELOPER'])] } }
    });

    await addAuditLog(user.id, 'DEVELOPER_REGISTERED', 'DEVELOPER', profile.id, { displayName: profile.displayName });
    return ok(profile, 201);
  });
  router.add('GET', '/developer/profile', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    return ok(profile);
  });

  router.add('PATCH', '/developer/profile', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');

    const data = {};
    if (req.body.displayName !== undefined) data.displayName = req.body.displayName;
    if (req.body.bio !== undefined) data.bio = req.body.bio;
    if (req.body.website !== undefined) data.website = req.body.website;
    if (req.body.supportEmail !== undefined) data.supportEmail = req.body.supportEmail;

    const updated = await prisma.developerProfile.update({
      where: { id: profile.id },
      data
    });
    return ok(updated);
  });

  router.add('GET', '/developer/games', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    const games = await prisma.game.findMany({ where: { developerId: profile.id } });
    return ok(games);
  });

  router.add('POST', '/developer/games', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    requireFields(req.body, ['title']);

    const game = await prisma.game.create({
      data: {
        id: createId('game'),
        developerId: profile.id,
        title: req.body.title,
        slug: slugify(req.body.title) + '-' + createId('').slice(-4),
        status: 'DRAFT',
        price: 0,
        currency: 'INR',
        priceType: 'FREE'
      }
    });
    return ok(game, 201);
  });
  router.add('GET', '/developer/games/:gameId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    
    // Fetch media and builds separately to avoid complex join hangs
    const [media, builds] = await Promise.all([
        prisma.gameMedia.findMany({ where: { gameId: game.id } }),
        prisma.gameBuild.findMany({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    return ok({ ...game, media, builds });
  });


  router.add('PATCH', '/developer/games/:gameId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        title: req.body.title,
        shortDescription: req.body.shortDescription,
        description: req.body.description,
        tagline: req.body.tagline,
        price: req.body.price !== undefined ? Number(req.body.price) : undefined,
        priceType: req.body.priceType,
        genres: req.body.genres,
        tags: req.body.tags,
        platforms: req.body.platforms
      }
    });

    return ok(updated);
  });

router.add('DELETE', '/developer/games/:gameId', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const game = await prisma.game.findUnique({
    where: { id: req.params.gameId },
    include: { media: true, builds: true }
  });
  if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
  await assertDeveloperOwnsGame(user, game);

  // Cleanup all media from storage
  for (const m of game.media) {
      try {
          const url = new URL(m.url);
          const objectKey = decodeURIComponent(url.pathname.replace(`/${config.minioBucket}/`, ''));
          if (objectKey) {
              const expires = Math.floor((Date.now() + 300000) / 1000);
              const signature = signHmac(`DELETE:${config.minioBucket}:${objectKey}:${expires}`, config.minioSecretKey || config.authSecret);
              const deleteUrl = `${config.minioPublicUrl.replace(/\/+$/g, '')}/${config.minioBucket}/${encodeURIComponent(objectKey).replaceAll('%2F', '/')}?expires=${expires}&signature=${signature}`;
              await fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
          }
      } catch {}
  }

  // Cleanup all builds from storage
  for (const b of game.builds) {
      if (b.downloadUrl) {
          try {
              const url = new URL(b.downloadUrl);
              const objectKey = decodeURIComponent(url.pathname.replace(`/${config.minioBucket}/`, ''));
              if (objectKey) {
                  const expires = Math.floor((Date.now() + 300000) / 1000);
                  const signature = signHmac(`DELETE:${config.minioBucket}:${objectKey}:${expires}`, config.minioSecretKey || config.authSecret);
                  const deleteUrl = `${config.minioPublicUrl.replace(/\/+$/g, '')}/${config.minioBucket}/${encodeURIComponent(objectKey).replaceAll('%2F', '/')}?expires=${expires}&signature=${signature}`;
                  await fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
              }
          } catch {}
      }
  }

  await prisma.game.delete({ where: { id: game.id } });
  return ok({ deleted: true });
});

  router.add('POST', '/developer/games/:gameId/submit', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const build = game.latestBuildId
      ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } })
      : await prisma.gameBuild.findFirst({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' } });

    if (!build) throw new HttpError(409, 'BUILD_REQUIRED', 'Upload a build before submitting for review');
    if (build.status === 'WAITING_FOR_UPLOAD') {
      throw new HttpError(409, 'BUILD_NOT_UPLOADED', 'Build upload must be completed before submission');
    }

    await scanAndPrepareBuild(build, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date() }
    });

    return ok(updated);
  });

  router.add('POST', '/developer/games/:gameId/publish', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    });

    return ok(updated);
  });

  router.add('POST', '/developer/games/:gameId/unpublish', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'DRAFT' }
    });

    return ok(updated);
  });

  router.add('POST', '/developer/games/:gameId/visibility', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    requireFields(req.body, ['visibility']);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: req.body.visibility === 'PUBLIC' ? 'PUBLISHED' : 'DRAFT' }
    });

    return ok(updated);
  });

  router.add('POST', '/developer/games/:gameId/media', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    requireFields(req.body, ['type', 'url']);

    const media = await prisma.gameMedia.create({
      data: {
        id: createId('media'),
        gameId: game.id,
        type: req.body.type,
        url: req.body.url,
        alt: req.body.alt
      }
    });

    return ok(media, 201);
  });

  router.add('DELETE', '/developer/games/:gameId/media/:mediaId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const media = await prisma.gameMedia.findUnique({
      where: { id: req.params.mediaId, gameId: game.id }
    });

    if (media) {
      // Delete from storage if it's an object key (assuming the URL stores it or we can derive it)
      // For now, let's try to extract the object key from the URL if it matches our pattern
      try {
        const url = new URL(media.url);
        const objectKey = decodeURIComponent(url.pathname.replace(`/${config.minioBucket}/`, ''));
        if (objectKey) {
          const method = 'DELETE';
          const expires = Math.floor((Date.now() + 300000) / 1000);
          const signature = signHmac(`${method}:${config.minioBucket}:${objectKey}:${expires}`, config.minioSecretKey || config.authSecret);
          const normalizedBase = config.minioPublicUrl.replace(/\/+$/g, '');
          const deleteUrl = `${normalizedBase}/${config.minioBucket}/${encodeURIComponent(objectKey).replaceAll('%2F', '/')}?expires=${expires}&signature=${signature}`;
          
          await fetch(deleteUrl, { method: 'DELETE' }).catch(err => console.error('Storage deletion failed:', err));
        }
      } catch (e) {
        console.error('Could not delete from storage:', e);
      }

      await prisma.gameMedia.delete({
        where: { id: media.id }
      });
    }

    return ok({ deleted: true });
  });

  router.add('GET', '/developer/games/:gameId/builds', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    await assertDeveloperOwnsGame(user, game);
    const builds = await prisma.gameBuild.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: 'desc' }
    });
    return ok(builds);
  });

  router.add('POST', '/developer/games/:gameId/builds', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    await assertDeveloperOwnsGame(user, game);
    requireFields(req.body, ['version', 'platform']);

    const build = await prisma.gameBuild.create({
      data: {
        id: createId('build'),
        gameId: game.id,
        version: req.body.version,
        platform: req.body.platform,
        runtime: req.body.runtime,
        entrypoint: req.body.entrypoint,
        changelog: req.body.changelog,
        status: 'WAITING_FOR_UPLOAD'
      }
    });
    return ok(build, 201);
  });

router.add('GET', '/developer/builds', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const profile = await developerForUser(user);
  if (!profile && !user.roles.includes('ADMIN')) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

  const where = user.roles.includes('ADMIN') ? {} : { game: { developerId: profile.id } };
  const builds = await prisma.gameBuild.findMany({
    where,
    include: { game: true },
    orderBy: { createdAt: 'desc' }
  });
  return ok(builds);
});
  router.add('POST', '/developer/builds/:buildId/upload-url', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);
    requireFields(req.body, ['fileName', 'contentType', 'sizeBytes']);

    const objectKey = `games/${build.gameId}/builds/${build.id}/${req.body.fileName}`;
    const upload = signedStorageUrl(objectKey, 'PUT', 3600);
    return ok({ uploadUrl: upload.url, objectKey, expiresAt: upload.expiresAt });
  });

  router.add('POST', '/developer/builds/:buildId/uploads/complete', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);
    requireFields(req.body, ['objectKey']);

    const updated = await prisma.gameBuild.update({
      where: { id: build.id },
      data: {
        status: 'PROCESSING',
        artifactObjectKey: req.body.objectKey,
        downloadUrl: `${config.minioPublicUrl}/${config.minioBucket}/${req.body.objectKey}`,
        sizeBytes: req.body.sizeBytes ? BigInt(req.body.sizeBytes) : undefined,
        uploadedAt: new Date()
      }
    });

    return ok(updated);
  });

  router.add('POST', '/developer/builds/:buildId/scan', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const updated = await scanAndPrepareBuild(build, build.game);
    return ok(updated);
  });

  router.add('POST', '/developer/builds/:buildId/deploy', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const deployment = await prisma.deployment.create({
      data: {
        id: createId('dep'),
        gameId: build.gameId,
        buildId: build.id,
        status: 'QUEUED',
        progress: 0,
        logs: {
          create: { id: createId('deplog'), level: 'INFO', message: 'Deployment triggered via build endpoint' }
        }
      }
    });

    if (req.body.makeLatest) {
        await prisma.game.update({
            where: { id: build.gameId },
            data: { latestBuildId: build.id }
        });
    }

    return ok(deployment, 201);
  });


router.add('POST', '/developer/games/:gameId/deploy', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER']);
  requireFields(req.body, ['buildId']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.body.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);

  const deployment = await prisma.deployment.create({
    data: {
      id: createId('dep'),
      gameId: game.id,
      buildId: build.id,
      status: 'QUEUED',
      progress: 0,
      logs: {
        create: { id: createId('deplog'), level: 'INFO', message: 'Deployment queued by developer' }
      }
    }
  });

  return ok(deployment, 201);
});

router.add('GET', '/developer/builds/:buildId', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  return ok(build);
});

router.add('POST', '/developer/builds/:buildId/upload-url', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  requireFields(req.body, ['fileName', 'contentType', 'sizeBytes']);
  const objectKey = `builds/${game.id}/${build.id}/${req.body.fileName}`;
  if (req.body.multipart) {
    const uploadId = createId('minio_upload');
    const partCount = Math.max(1, Number(req.body.partCount || 1));
    const parts = Array.from({ length: partCount }, (_, index) => ({
      partNumber: index + 1,
      uploadUrl: `${signedStorageUrl(objectKey, 'PUT').url}&uploadId=${uploadId}&partNumber=${index + 1}`
    }));
    return ok({ objectKey, uploadType: 'MULTIPART', uploadId, parts }, 201);
  }
  const signed = signedStorageUrl(objectKey, 'PUT');
  return ok({ objectKey, uploadType: 'SINGLE', uploadUrl: signed.url, expiresAt: signed.expiresAt }, 201);
});

router.add('POST', '/developer/builds/:buildId/uploads/complete', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  requireFields(req.body, ['objectKey', 'sizeBytes']);
  const updated = await prisma.gameBuild.update({
    where: { id: build.id },
    data: {
      artifactObjectKey: req.body.objectKey,
      sizeBytes: Number(req.body.sizeBytes),
      checksumSha256: req.body.checksumSha256 || null,
      status: 'PROCESSING'
    }
  });
  return ok({ buildId: updated.id, status: updated.status, jobId: createId('job_extract') });
});

router.add('POST', '/developer/builds/:buildId/scan', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  await prisma.gameBuild.update({
    where: { id: build.id },
    data: { scanStatus: 'PASSED', status: 'SCANNED' }
  });
  return ok({ buildId: build.id, scanStatus: 'QUEUED', jobId: createId('job_scan') });
});

router.add('POST', '/developer/builds/:buildId/deploy', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  if (build.scanStatus !== 'PASSED') throw new HttpError(409, 'BUILD_NOT_SCANNED', 'Build must pass scan before deployment');
  const deployment = await prisma.deployment.create({
    data: {
      id: createId('dep'),
      gameId: game.id,
      buildId: build.id,
      status: 'QUEUED',
      environment: req.body.environment || 'PRODUCTION',
      progress: 0,
      releaseNotes: req.body.releaseNotes || '',
      logs: { create: { id: createId('log'), level: 'INFO', message: 'Deployment queued' } }
    }
  });
  if (req.body.makeLatest) await prisma.game.update({ where: { id: game.id }, data: { latestBuildId: build.id } });
  return ok(deployment, 201);
});

router.add('DELETE', '/developer/builds/:buildId', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
  if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
  const game = await findGame(build.gameId);
  await assertDeveloperOwnsGame(user, game);
  if (build.status === 'DEPLOYED') throw new HttpError(409, 'BUILD_DEPLOYED', 'Cannot delete a deployed build');
  await prisma.gameBuild.delete({ where: { id: build.id } });
  if (game.latestBuildId === build.id) await prisma.game.update({ where: { id: game.id }, data: { latestBuildId: null } });
  return ok({ buildId: build.id, deleted: true });
});

router.add('GET', '/developer/deployments/:deploymentId/logs', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const logs = await prisma.deploymentLog.findMany({
    where: { deploymentId: req.params.deploymentId },
    orderBy: { createdAt: 'asc' }
  });
  return ok(logs, 200, { nextCursor: logs.at(-1)?.id || null });
});

router.add('GET', '/developer/deployments/:deploymentId', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const deployment = await prisma.deployment.findUnique({
    where: { id: req.params.deploymentId },
    include: { logs: { orderBy: { createdAt: 'asc' } } }
  });
  if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found');
  const game = await findGame(deployment.gameId);
  await assertDeveloperOwnsGame(user, game);
  return ok(deployment);
});

router.add('GET', '/developer/deployments', async (req) => {
  const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
  const profile = await developerForUser(user);
  if (!profile && !user.roles.includes('ADMIN')) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

  const where = user.roles.includes('ADMIN') ? {} : { game: { developerId: profile.id } };
  const deployments = await prisma.deployment.findMany({
    where,
    include: { game: true, build: true },
    orderBy: { createdAt: 'desc' }
  });
  return ok(deployments);
});

  router.add('GET', '/developer/dashboard', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');

    const games = await prisma.game.findMany({ where: { developerId: profile.id } });
    const gameIds = games.map(g => g.id);

    const [orderStats, instanceCount] = await Promise.all([
      prisma.order.aggregate({
        where: { gameId: { in: gameIds }, status: 'PAID' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.gameInstance.count({
        where: { gameId: { in: gameIds } }
      })
    ]);

    return ok({
      stats: {
        totalGames: games.length,
        totalRevenue: orderStats._sum.amount || 0,
        totalSales: orderStats._count,
        activeInstances: instanceCount
      }
    });
  });

  router.add('GET', '/developer/analytics', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

    const stats = await prisma.order.aggregate({
      where: { game: { developerId: profile.id }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true }
    });

    const recentSales = await prisma.order.findMany({
      where: { game: { developerId: profile.id }, status: 'COMPLETED' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { game: true }
    });

    return ok({
      totalRevenue: stats._sum.amount || 0,
      totalSales: stats._count.id || 0,
      recentSales
    });
  });

  router.add('POST', '/instances', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    requireFields(req.body, ['gameId']);
    const game = await findGame(req.body.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    if (!(await userOwnsGame(user.id, game.id))) throw new HttpError(403, 'GAME_NOT_OWNED', 'You must own the game to host it');

    const instanceId = createId('inst');
    const instance = await prisma.gameInstance.create({
      data: {
        id: instanceId,
        gameId: game.id,
        hostUserId: user.id,
        name: req.body.name || `${user.displayName}'s Lobby`,
        visibility: req.body.visibility || 'PRIVATE',
        region: req.body.region || 'ap-south-1',
        joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        maxPlayers: Number(req.body.maxPlayers || 8),
        status: 'READY',
        players: {
          create: { id: createId('instp'), userId: user.id, role: 'HOST' }
        }
      },
      include: { game: true, players: true }
    });

    return ok(instance, 201);
  });

  router.add('GET', '/instances', async (req) => {
    const user = await requireAuth(req);
    const instances = await prisma.gameInstance.findMany({
      where: {
        OR: [
          { hostUserId: user.id },
          { players: { some: { userId: user.id } } }
        ]
      },
      include: { game: true, players: true },
      orderBy: { createdAt: 'desc' }
    });
    return ok(instances);
  });

  router.add('GET', '/instances/:instanceId', async (req) => {
    const user = await requireAuth(req);
    const instance = await prisma.gameInstance.findUnique({
      where: { id: req.params.instanceId },
      include: { hostUser: true, game: true, players: { include: { user: true } } }
    });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');

    return ok(instance);
  });

const instanceAction = (status) => async (req) => {
  const user = await requireAuth(req);
  const instance = await prisma.gameInstance.findUnique({ where: { id: req.params.instanceId } });
  if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
  if (instance.hostUserId !== user.id && !user.roles.includes('ADMIN')) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the host or admin can manage it');
  }

  const updated = await prisma.gameInstance.update({
    where: { id: instance.id },
    data: { status }
  });

  return ok(updated);
};

  router.add('POST', '/instances/:instanceId/start', instanceAction('STARTING'));
  router.add('POST', '/instances/:instanceId/stop', instanceAction('STOPPING'));
  router.add('POST', '/instances/:instanceId/restart', instanceAction('RESTARTING'));

  router.add('POST', '/instances/:instanceId/logs', async (req) => {
    const user = await requireAuth(req);
    const instance = await prisma.gameInstance.findUnique({ where: { id: req.params.instanceId } });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
    requireFields(req.body, ['level', 'message']);

    console.log(`[Instance ${instance.id}] [${req.body.level}] ${req.body.message}`);
    return ok({ logged: true });
  });

  router.add('DELETE', '/instances/:instanceId', async (req) => {
    const user = await requireAuth(req);
    const instance = await prisma.gameInstance.findUnique({ where: { id: req.params.instanceId } });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
    if (instance.hostUserId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the host or admin can delete the instance');
    }

    await prisma.gameInstance.delete({ where: { id: instance.id } });
    return ok({ deleted: true });
  });

  router.add('GET', '/instances/:instanceId/logs', async (req) => {
    const user = await requireAuth(req);
    const instance = await prisma.gameInstance.findUnique({ where: { id: req.params.instanceId } });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');

    const isMember = await prisma.instancePlayer.findUnique({
      where: { instanceId_userId: { instanceId: instance.id, userId: user.id } }
    });

    if (!isMember && instance.hostUserId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied');
    }

    return ok([]); // Return empty logs as we moved to console.log/external logging
  });

  router.add('GET', '/instances/:instanceId/metrics', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER', 'ADMIN']);
    const instance = await prisma.gameInstance.findUnique({
      where: { id: req.params.instanceId },
      include: { players: true }
    });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');

    const isMember = instance.players.some(p => p.userId === user.id);
    if (instance.hostUserId !== user.id && !user.roles.includes('ADMIN') && !isMember) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot access this instance');
    }

    return ok({
      cpuPercent: 42,
      memoryMb: 820,
      networkInKbps: 1200,
      networkOutKbps: 2400,
      playersOnline: instance.players.length,
      latencyMs: 14
    });
  });

  router.add('POST', '/instances/:instanceId/join', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const instance = await prisma.gameInstance.findUnique({
      where: { id: req.params.instanceId },
      include: { players: true }
    });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
    if (instance.status !== 'READY') throw new HttpError(400, 'INSTANCE_NOT_READY', 'Instance is not ready to join');
    if (instance.players.length >= instance.maxPlayers) throw new HttpError(400, 'INSTANCE_FULL', 'Instance is full');

    const updated = await prisma.gameInstance.update({
      where: { id: instance.id },
      data: {
        players: {
          upsert: {
            where: { instanceId_userId: { instanceId: instance.id, userId: user.id } },
            update: { role: 'PLAYER' },
            create: { id: createId('instp'), userId: user.id, role: 'PLAYER' }
          }
        }
      },
      include: { game: true, players: { include: { user: true } } }
    });

    return ok(updated);
  });

  router.add('GET', '/instances/:instanceId/connect-token', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const instance = await prisma.gameInstance.findUnique({
      where: { id: req.params.instanceId },
      include: { players: true }
    });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');

    const isMember = instance.players.some(p => p.userId === user.id);
    if (!isMember) throw new HttpError(403, 'FORBIDDEN', 'You must join this instance first');

    return ok({
      connectToken: signToken({ type: 'runtime', sub: user.id, instanceId: instance.id }, config.runtimeTokenTtlSeconds),
      endpoint: instance.endpoint || `wss://runtime.lazplay.local/instances/${instance.id}`,
      expiresAt: addSeconds(config.runtimeTokenTtlSeconds)
    });
  });

  router.add('GET', '/admin/dashboard', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const [userCount, gameCount, orderCount, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      })
    ]);
    return ok({
      stats: {
        totalUsers: userCount,
        totalGames: gameCount,
        totalOrders: orderCount,
        totalRevenue: revenue._sum.amount || 0
      }
    });
  });

  router.add('GET', '/admin/users', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const search = req.query.get('search') || '';
    const { page, limit } = parsePagination(req.query);

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return ok(users.map(sanitizeUser), 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('PATCH', '/admin/users/:userId/roles', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    requireFields(req.body, ['roles']);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { roles: req.body.roles }
    });

    await addAuditLog(admin.id, 'USER_ROLE_UPDATED', 'USER', user.id, { roles: req.body.roles });
    return ok(sanitizeUser(updated));
  });

  router.add('PATCH', '/admin/users/:userId/status', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    requireFields(req.body, ['status']);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: req.body.status }
    });

    await addAuditLog(admin.id, 'USER_STATUS_UPDATED', 'USER', user.id, { status: req.body.status });
    return ok(sanitizeUser(updated));
  });

  router.add('POST', '/admin/users/:userId/ban', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'BANNED' }
    });

    await addAuditLog(admin.id, 'USER_BANNED', 'USER', user.id, { reason: req.body.reason });
    return ok(sanitizeUser(updated));
  });

  router.add('POST', '/admin/users/:userId/unban', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' }
    });

    await addAuditLog(admin.id, 'USER_UNBANNED', 'USER', user.id);
    return ok(sanitizeUser(updated));
  });

  router.add('GET', '/admin/games', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const search = req.query.get('search') || '';
    const status = req.query.get('status');
    const { page, limit } = parsePagination(req.query);

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        include: { developer: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return ok(games, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('GET', '/admin/games/:gameId', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    const [developer, media, builds] = await Promise.all([
      prisma.developerProfile.findUnique({ where: { id: game.developerId } }),
      prisma.gameMedia.findMany({ where: { gameId: game.id }, orderBy: { sortOrder: 'asc' } }),
      prisma.gameBuild.findMany({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' } })
    ]);

    return ok({ ...game, developer, media, builds });
  });

  router.add('PATCH', '/admin/games/:gameId/status', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    requireFields(req.body, ['status']);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: req.body.status,
        statusReason: req.body.reason,
        publishedAt: req.body.status === 'PUBLISHED' ? new Date() : undefined
      }
    });

    await addAuditLog(admin.id, 'GAME_STATUS_UPDATED', 'GAME', game.id, { status: req.body.status });
    return ok(updated);
  });

  router.add('POST', '/admin/games/:gameId/feature', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    await prisma.game.update({
      where: { id: game.id },
      data: { featured: true }
    });

    await addAuditLog(admin.id, 'GAME_FEATURED', 'GAME', game.id);
    return ok({ featured: true });
  });

  router.add('DELETE', '/admin/games/:gameId/feature', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    await prisma.game.update({
      where: { id: game.id },
      data: { featured: false }
    });

    await addAuditLog(admin.id, 'GAME_UNFEATURED', 'GAME', game.id);
    return ok({ featured: false });
  });

  router.add('GET', '/admin/deployments', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const { page, limit } = parsePagination(req.query);
    const [total, items] = await Promise.all([
      prisma.deployment.count(),
      prisma.deployment.findMany({
        include: { game: true, build: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    return ok(items, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('GET', '/admin/deployments/:deploymentId', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const deployment = await prisma.deployment.findUnique({
      where: { id: req.params.deploymentId },
      include: { game: true, build: true, logs: { orderBy: { createdAt: 'asc' } } }
    });
    if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found');
    return ok(deployment);
  });

  router.add('GET', '/admin/nodes', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const nodes = await prisma.serverNode.findMany();
    return ok(nodes);
  });

  router.add('POST', '/admin/nodes', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    requireFields(req.body, ['id', 'region']);

    const existing = await prisma.serverNode.findUnique({ where: { id: req.body.id } });
    if (existing) throw new HttpError(409, 'NODE_EXISTS', 'Node ID already exists');

    const node = await prisma.serverNode.create({
      data: {
        id: req.body.id,
        region: req.body.region,
        status: 'HEALTHY'
      }
    });

    await addAuditLog(admin.id, 'SERVER_NODE_ADDED', 'SERVER', node.id, { region: node.region });
    return ok(node, 201);
  });

  router.add('PATCH', '/admin/nodes/:nodeId', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const node = await prisma.serverNode.findUnique({ where: { id: req.params.nodeId } });
    if (!node) throw new HttpError(404, 'NODE_NOT_FOUND', 'Node not found');

    const updated = await prisma.serverNode.update({
      where: { id: node.id },
      data: { status: req.body.status }
    });

    await addAuditLog(admin.id, 'SERVER_NODE_UPDATED', 'SERVER', node.id, { status: updated.status });
    return ok(updated);
  });

  router.add('DELETE', '/admin/nodes/:nodeId', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    await prisma.serverNode.delete({ where: { id: req.params.nodeId } });
    await addAuditLog(admin.id, 'SERVER_NODE_REMOVED', 'SERVER', req.params.nodeId);
    return ok({ deleted: true });
  });

  router.add('GET', '/admin/instances', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const { page, limit } = parsePagination(req.query);
    const [total, items] = await Promise.all([
      prisma.gameInstance.count(),
      prisma.gameInstance.findMany({
        include: { game: true, host: true, players: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    return ok(items, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('DELETE', '/admin/instances/:instanceId', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const instance = await prisma.gameInstance.findUnique({ where: { id: req.params.instanceId } });
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');

    await prisma.gameInstance.delete({ where: { id: instance.id } });
    await addAuditLog(admin.id, 'INSTANCE_FORCE_DELETED', 'INSTANCE', instance.id, { gameId: instance.gameId });
    return ok({ deleted: true });
  });

  router.add('GET', '/admin/payments', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const payments = await prisma.payment.findMany({
      include: { order: { include: { user: true, game: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return ok(payments);
  });

  router.add('GET', '/admin/payments/:paymentId', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { order: { include: { user: true } } }
    });
    if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    return ok(payment);
  });

  router.add('GET', '/admin/refunds', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const refunds = await prisma.refund.findMany({
      include: { order: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return ok(refunds);
  });

  router.add('GET', '/admin/refunds/:refundId', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const refund = await prisma.refund.findUnique({
      where: { id: req.params.refundId },
      include: { order: true }
    });
    if (!refund) throw new HttpError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    return ok(refund);
  });

  router.add('PATCH', '/admin/refunds/:refundId', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    requireFields(req.body, ['status']);

    const refund = await prisma.refund.findUnique({
      where: { id: req.params.refundId },
      include: { order: true }
    });
    if (!refund) throw new HttpError(404, 'REFUND_NOT_FOUND', 'Refund not found');

    const updated = await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: req.body.status,
        resolvedAt: new Date(),
        resolvedBy: admin.id,
        resolvedNote: req.body.note
      }
    });

    if (req.body.status === 'APPROVED') {
      await prisma.$transaction([
        prisma.order.update({ where: { id: refund.orderId }, data: { status: 'REFUNDED' } }),
        prisma.entitlement.deleteMany({ where: { userId: refund.order.userId, gameId: refund.order.gameId } }),
        prisma.libraryItem.deleteMany({ where: { userId: refund.order.userId, gameId: refund.order.gameId } })
      ]);
      await addNotification(refund.order.userId, 'REFUND_APPROVED', 'Refund Approved', 'Your refund has been processed and access revoked.');
    }

    await addAuditLog(admin.id, 'REFUND_STATUS_UPDATED', 'REFUND', refund.id, { status: req.body.status });
    return ok(updated);
  });

  router.add('GET', '/admin/audit-logs', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const { page, limit } = parsePagination(req.query);
    const [total, items] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    return ok(items, 200, {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  router.add('GET', '/admin/analytics', async (req) => {
    await requireAuth(req, null, ['ADMIN']);
    const [userCount, gameCount, deploymentCount, instanceCount, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.deployment.count(),
      prisma.gameInstance.count(),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      })
    ]);
    return ok({
      stats: {
        users: userCount,
        games: gameCount,
        deployments: deploymentCount,
        instances: instanceCount,
        totalRevenue: revenue._sum.amount || 0
      }
    });
  });

  router.add('GET', '/notifications', async (req) => {
    const user = await requireAuth(req);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return ok(notifications);
  });

  router.add('PATCH', '/notifications/:notificationId/read', async (req) => {
    const user = await requireAuth(req);
    const updated = await prisma.notification.update({
      where: { id: req.params.notificationId, userId: user.id },
      data: { read: true, readAt: new Date() }
    });
    return ok(updated);
  });

  router.add('POST', '/notifications/mark-all-read', async (req) => {
    const user = await requireAuth(req);
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() }
    });
    return ok({ success: true });
  });
}

export async function createApp() {
  // Connect to PostgreSQL via Prisma
  await prisma.$connect();
  const router = createRouter();
  registerRoutes(router);

  return async function app(req, res) {
    const requestId = createId('req');
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
      const routePath = url.pathname.slice(config.apiPrefix.length) || '/';
      const matched = router.match(req.method, routePath);
      if (!matched) {
        throw new HttpError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
      }
      req.query = url.searchParams;
      req.params = matched.params;
      req.body = await readJsonBody(req);
      const response = await matched.route.handler(req);
      sendJson(res, response.status, response.body);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'INTERNAL_SERVER_ERROR';
      const message = error instanceof HttpError ? error.message : 'Unexpected server error';
      sendJson(res, status, {
        success: false,
        error: {
          code,
          message,
          details: error.details
        },
        requestId
      });
    }
  };
}

export { config, verifyToken };
