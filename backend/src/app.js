import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(BACKEND_ROOT, 'data', 'db.json');

const config = {
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  appVersion: process.env.APP_VERSION || '1.0.0',
  appEnv: process.env.APP_ENV || 'development',
  publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  publicWebUrl: process.env.PUBLIC_WEB_URL || 'http://localhost:5173',
  authSecret: process.env.AUTH_SECRET || 'lazplay-dev-secret-change-before-production',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 604800),
  runtimeTokenTtlSeconds: Number(process.env.RUNTIME_TOKEN_TTL_SECONDS || 900),
  minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
  minioBucket: process.env.MINIO_BUCKET || 'lazplay',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_lazplay',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'lazplay-razorpay-dev-secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'lazplay-webhook-dev-secret',
  allowMockPayments: (process.env.ALLOW_MOCK_PAYMENTS || 'true') === 'true'
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

function createSeedData() {
  const createdAt = nowIso();
  const users = [
    {
      id: 'usr_player',
      username: 'player',
      email: 'player@example.com',
      passwordHash: hashPassword('Password123!'),
      displayName: 'Neon Runner',
      bio: 'Arcade player and lobby host.',
      avatarUrl: '',
      roles: ['PLAYER'],
      status: 'ACTIVE',
      createdAt
    },
    {
      id: 'usr_dev',
      username: 'developer',
      email: 'dev@example.com',
      passwordHash: hashPassword('Password123!'),
      displayName: 'Neon Labs Dev',
      bio: 'Builds games for LazPlay.',
      avatarUrl: '',
      roles: ['PLAYER', 'DEVELOPER'],
      status: 'ACTIVE',
      createdAt
    },
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hashPassword('Password123!'),
      displayName: 'System Admin',
      bio: 'LazPlay operator.',
      avatarUrl: '',
      roles: ['PLAYER', 'DEVELOPER', 'ADMIN'],
      status: 'ACTIVE',
      createdAt
    }
  ];

  return {
    schemaVersion: 1,
    users,
    refreshSessions: [],
    developerProfiles: [
      {
        id: 'dev_neon_labs',
        userId: 'usr_dev',
        displayName: 'Neon Labs',
        website: 'https://neonlabs.example.com',
        supportEmail: 'support@neonlabs.example.com',
        verificationStatus: 'VERIFIED',
        payoutStatus: 'ACTIVE',
        createdAt
      }
    ],
    games: [
      {
        id: 'game_cyber_quest',
        developerId: 'dev_neon_labs',
        slug: 'cyber-quest',
        title: 'Cyber Quest',
        shortDescription: 'Run-and-gun arcade adventure through neon sectors.',
        description: 'A high-octane run-and-gun adventure through the neon-drenched sectors of Neo-Tokyo.',
        price: 49900,
        currency: 'INR',
        priceType: 'PAID',
        releaseDate: '2026-05-01',
        publisher: 'Neon Labs',
        genres: ['Action', 'Platformer'],
        tags: ['Cyberpunk', 'Multiplayer'],
        platforms: ['PC', 'CLOUD'],
        status: 'PUBLISHED',
        featured: true,
        coverObjectKey: 'games/game_cyber_quest/media/cover.jpg',
        coverUrl: 'https://cdn.lazplay.local/games/cyber-quest/cover.jpg',
        heroImageUrl: 'https://cdn.lazplay.local/games/cyber-quest/hero.jpg',
        trailerUrl: 'https://cdn.lazplay.local/games/cyber-quest/trailer.mp4',
        latestBuildId: 'build_cyber_webgl_104',
        systemRequirements: {
          minimum: { cpu: 'Dual core', memory: '4 GB', storage: '2 GB' },
          recommended: { cpu: 'Quad core', memory: '8 GB', storage: '4 GB' }
        },
        publishedAt: createdAt,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: 'game_neon_drifter',
        developerId: 'dev_neon_labs',
        slug: 'neon-drifter-84',
        title: 'Neon Drifter 84',
        shortDescription: 'High-speed synthwave racing protocol.',
        description: 'Race through retro-futuristic highways with low-latency hosted multiplayer.',
        price: 24900,
        currency: 'INR',
        priceType: 'PAID',
        releaseDate: '2026-04-20',
        publisher: 'Neon Labs',
        genres: ['Racing'],
        tags: ['Arcade', 'Multiplayer'],
        platforms: ['PC', 'CLOUD'],
        status: 'PUBLISHED',
        featured: true,
        coverUrl: 'https://cdn.lazplay.local/games/neon-drifter/cover.jpg',
        heroImageUrl: 'https://cdn.lazplay.local/games/neon-drifter/hero.jpg',
        trailerUrl: 'https://cdn.lazplay.local/games/neon-drifter/trailer.mp4',
        latestBuildId: 'build_neon_webgl_100',
        systemRequirements: {
          minimum: { cpu: 'Dual core', memory: '4 GB', storage: '1 GB' },
          recommended: { cpu: 'Quad core', memory: '8 GB', storage: '2 GB' }
        },
        publishedAt: createdAt,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: 'game_terminal_defense',
        developerId: 'dev_neon_labs',
        slug: 'terminal-defense',
        title: 'Terminal Defense',
        shortDescription: 'Command-line strategy defense game.',
        description: 'Protect your data from incoming breaches in real time.',
        price: 0,
        currency: 'INR',
        priceType: 'FREE',
        releaseDate: '2026-04-01',
        publisher: 'Neon Labs',
        genres: ['Strategy'],
        tags: ['Indie', 'Singleplayer'],
        platforms: ['WEB', 'CLOUD'],
        status: 'PUBLISHED',
        featured: false,
        coverUrl: 'https://cdn.lazplay.local/games/terminal-defense/cover.jpg',
        heroImageUrl: 'https://cdn.lazplay.local/games/terminal-defense/hero.jpg',
        trailerUrl: '',
        latestBuildId: 'build_terminal_webgl_100',
        systemRequirements: {
          minimum: { cpu: 'Dual core', memory: '2 GB', storage: '512 MB' },
          recommended: { cpu: 'Dual core', memory: '4 GB', storage: '1 GB' }
        },
        publishedAt: createdAt,
        createdAt,
        updatedAt: createdAt
      }
    ],
    gameMedia: [
      {
        id: 'media_cyber_1',
        gameId: 'game_cyber_quest',
        type: 'IMAGE',
        url: 'https://cdn.lazplay.local/games/cyber-quest/screenshot-1.jpg',
        alt: 'Cyber Quest screenshot',
        sortOrder: 1
      },
      {
        id: 'media_cyber_trailer',
        gameId: 'game_cyber_quest',
        type: 'VIDEO',
        url: 'https://cdn.lazplay.local/games/cyber-quest/trailer.mp4',
        alt: 'Cyber Quest trailer',
        sortOrder: 2
      }
    ],
    gameBuilds: [
      {
        id: 'build_cyber_webgl_104',
        gameId: 'game_cyber_quest',
        version: '1.0.4',
        platform: 'WEBGL',
        runtime: 'BROWSER',
        entrypoint: 'index.html',
        changelog: 'Improved multiplayer latency.',
        artifactObjectKey: 'builds/game_cyber_quest/build_cyber_webgl_104/package.zip',
        status: 'DEPLOYED',
        scanStatus: 'PASSED',
        sizeBytes: 536870912,
        createdAt
      },
      {
        id: 'build_neon_webgl_100',
        gameId: 'game_neon_drifter',
        version: '1.0.0',
        platform: 'WEBGL',
        runtime: 'BROWSER',
        entrypoint: 'index.html',
        changelog: 'Initial release.',
        artifactObjectKey: 'builds/game_neon_drifter/build_neon_webgl_100/package.zip',
        status: 'DEPLOYED',
        scanStatus: 'PASSED',
        sizeBytes: 300000000,
        createdAt
      },
      {
        id: 'build_terminal_webgl_100',
        gameId: 'game_terminal_defense',
        version: '1.0.0',
        platform: 'WEBGL',
        runtime: 'BROWSER',
        entrypoint: 'index.html',
        changelog: 'Initial release.',
        artifactObjectKey: 'builds/game_terminal_defense/build_terminal_webgl_100/package.zip',
        status: 'DEPLOYED',
        scanStatus: 'PASSED',
        sizeBytes: 120000000,
        createdAt
      }
    ],
    deployments: [],
    deploymentLogs: [],
    gameReviews: [
      {
        id: 'rev_seed_1',
        gameId: 'game_cyber_quest',
        userId: 'usr_player',
        rating: 5,
        body: 'Great multiplayer hosting performance.',
        createdAt
      }
    ],
    wishlistItems: [
      {
        id: 'wish_seed_1',
        userId: 'usr_player',
        gameId: 'game_neon_drifter',
        addedAt: createdAt
      }
    ],
    entitlements: [
      {
        id: 'ent_seed_1',
        userId: 'usr_player',
        gameId: 'game_cyber_quest',
        source: 'SEED',
        status: 'ACTIVE',
        grantedAt: createdAt
      },
      {
        id: 'ent_seed_2',
        userId: 'usr_player',
        gameId: 'game_terminal_defense',
        source: 'FREE',
        status: 'ACTIVE',
        grantedAt: createdAt
      }
    ],
    libraryItems: [
      {
        id: 'lib_seed_1',
        userId: 'usr_player',
        gameId: 'game_cyber_quest',
        ownershipType: 'PURCHASED',
        installedStatus: 'READY',
        favorite: false,
        lastPlayedAt: createdAt,
        playtimeSeconds: 8420,
        installedBuildVersion: '1.0.4',
        ownedAt: createdAt
      },
      {
        id: 'lib_seed_2',
        userId: 'usr_player',
        gameId: 'game_terminal_defense',
        ownershipType: 'FREE',
        installedStatus: 'READY',
        favorite: false,
        lastPlayedAt: null,
        playtimeSeconds: 0,
        installedBuildVersion: '1.0.0',
        ownedAt: createdAt
      }
    ],
    orders: [],
    payments: [],
    refunds: [],
    invoices: [],
    storageObjects: [],
    gameInstances: [],
    instancePlayers: [],
    instanceLogs: [],
    notifications: [],
    auditLogs: [],
    serverNodes: [
      {
        id: 'node_1',
        region: 'ap-south-1',
        status: 'HEALTHY',
        cpuPercent: 42,
        memoryPercent: 45,
        packetLossPercent: 0.2,
        activeInstances: 12
      },
      {
        id: 'node_3',
        region: 'ap-south-1',
        status: 'DEGRADED',
        cpuPercent: 84,
        memoryPercent: 45,
        packetLossPercent: 15.2,
        activeInstances: 120
      }
    ]
  };
}

async function loadDb() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const seed = createSeedData();
    await saveDb(seed);
    return seed;
  }
}

async function saveDb(db) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

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
  res.end(JSON.stringify(body, null, 2));
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

function getOptionalUser(req, db) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') return null;
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  } catch {
    return null;
  }
}

function requireAuth(req, db, roles = []) {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  const payload = verifyToken(token);
  if (payload.type !== 'access') throw new HttpError(401, 'INVALID_TOKEN', 'Access token is required');
  const user = db.users.find((item) => item.id === payload.sub);
  if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'USER_INACTIVE', 'User is inactive or missing');
  if (roles.length > 0 && !roles.some((role) => user.roles.includes(role))) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
  }
  return user;
}

function createTokens(db, user) {
  const sessionId = createId('sess');
  const refreshTokenId = createId('rt');
  const accessToken = signToken(
    {
      type: 'access',
      sub: user.id,
      roles: user.roles,
      sid: sessionId
    },
    config.accessTokenTtlSeconds
  );
  const refreshToken = signToken(
    {
      type: 'refresh',
      sub: user.id,
      jti: refreshTokenId,
      sid: sessionId
    },
    config.refreshTokenTtlSeconds
  );
  db.refreshSessions.push({
    id: sessionId,
    userId: user.id,
    refreshTokenId,
    expiresAt: addSeconds(config.refreshTokenTtlSeconds),
    revokedAt: null,
    createdAt: nowIso()
  });
  return { accessToken, refreshToken };
}

function developerForUser(db, user) {
  return db.developerProfiles.find((profile) => profile.userId === user.id);
}

function findGame(db, gameIdOrSlug) {
  return db.games.find((game) => game.id === gameIdOrSlug || game.slug === gameIdOrSlug);
}

function findBuild(db, buildId) {
  return db.gameBuilds.find((build) => build.id === buildId);
}

function findDeployment(db, deploymentId) {
  return db.deployments.find((deployment) => deployment.id === deploymentId);
}

function gameDeveloper(db, game) {
  return db.developerProfiles.find((profile) => profile.id === game?.developerId);
}

function assertDeveloperOwnsGame(db, user, game) {
  if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
  if (user.roles.includes('ADMIN')) return;
  const developer = developerForUser(db, user);
  if (!developer || developer.id !== game.developerId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the owning developer can access this game');
  }
}

function userOwnsGame(db, userId, gameId) {
  const game = db.games.find((item) => item.id === gameId);
  if (game?.priceType === 'FREE') return true;
  return db.entitlements.some(
    (entitlement) => entitlement.userId === userId && entitlement.gameId === gameId && entitlement.status === 'ACTIVE'
  );
}

function ensureLibraryItem(db, userId, gameId, ownershipType = 'PURCHASED') {
  let libraryItem = db.libraryItems.find((item) => item.userId === userId && item.gameId === gameId);
  const game = db.games.find((item) => item.id === gameId);
  const latestBuild = db.gameBuilds.find((build) => build.id === game?.latestBuildId);
  if (!libraryItem) {
    libraryItem = {
      id: createId('lib'),
      userId,
      gameId,
      ownershipType,
      installedStatus: 'READY',
      favorite: false,
      lastPlayedAt: null,
      playtimeSeconds: 0,
      installedBuildVersion: latestBuild?.version || null,
      ownedAt: nowIso()
    };
    db.libraryItems.push(libraryItem);
  }
  return libraryItem;
}

function grantEntitlement(db, userId, gameId, source) {
  let entitlement = db.entitlements.find((item) => item.userId === userId && item.gameId === gameId);
  if (!entitlement) {
    entitlement = {
      id: createId('ent'),
      userId,
      gameId,
      source,
      status: 'ACTIVE',
      grantedAt: nowIso()
    };
    db.entitlements.push(entitlement);
  } else {
    entitlement.status = 'ACTIVE';
  }
  ensureLibraryItem(db, userId, gameId, source === 'FREE' ? 'FREE' : 'PURCHASED');
  return entitlement;
}

function addNotification(db, userId, type, title, body) {
  const notification = {
    id: createId('notif'),
    userId,
    type,
    title,
    body,
    read: false,
    createdAt: nowIso()
  };
  db.notifications.push(notification);
  return notification;
}

function addAuditLog(db, actorId, action, targetType, targetId, metadata = {}) {
  const audit = {
    id: createId('audit'),
    actorId,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: nowIso()
  };
  db.auditLogs.push(audit);
  return audit;
}

function publicGame(db, game, user = null) {
  const developer = gameDeveloper(db, game);
  const reviews = db.gameReviews.filter((review) => review.gameId === game.id);
  const rating =
    reviews.length === 0 ? 0 : Math.round((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10) / 10;
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    price: game.price,
    currency: game.currency,
    priceType: game.priceType,
    releaseDate: game.releaseDate,
    developer: developer
      ? {
        id: developer.id,
        displayName: developer.displayName
      }
      : null,
    publisher: game.publisher,
    genres: game.genres,
    tags: game.tags,
    platforms: game.platforms,
    coverUrl: game.coverUrl,
    heroImageUrl: game.heroImageUrl,
    trailerUrl: game.trailerUrl,
    screenshots: db.gameMedia.filter((media) => media.gameId === game.id && media.type === 'IMAGE').map((media) => media.url),
    systemRequirements: game.systemRequirements,
    isOwned: user ? userOwnsGame(db, user.id, game.id) : false,
    isWishlisted: user ? db.wishlistItems.some((item) => item.userId === user.id && item.gameId === game.id) : false,
    rating,
    reviewCount: reviews.length,
    status: game.status,
    publishedAt: game.publishedAt,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
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

function registerRoutes(router, state) {
  const db = () => state.db;
  const persist = () => state.save();

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
    requireFields(req.body, ['username', 'email', 'password']);
    const existing = db().users.find(
      (user) => user.email.toLowerCase() === req.body.email.toLowerCase() || user.username.toLowerCase() === req.body.username.toLowerCase()
    );
    if (existing) throw new HttpError(409, 'USER_EXISTS', 'A user with that email or username already exists');
    const user = {
      id: createId('usr'),
      username: req.body.username,
      email: req.body.email,
      passwordHash: hashPassword(req.body.password),
      displayName: req.body.displayName || req.body.username,
      bio: '',
      avatarUrl: '',
      roles: ['PLAYER'],
      status: 'ACTIVE',
      createdAt: nowIso()
    };
    db().users.push(user);
    const tokens = createTokens(db(), user);
    await persist();
    return ok({ user: sanitizeUser(user), ...tokens }, 201);
  });

  router.add('POST', '/auth/login', async (req) => {
    requireFields(req.body, ['identifier', 'password']);
    const identifier = String(req.body.identifier).toLowerCase();
    const user = db().users.find(
      (item) => item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier
    );
    if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
    }
    if (user.status !== 'ACTIVE') throw new HttpError(403, 'USER_INACTIVE', 'User is not active');
    const tokens = createTokens(db(), user);
    await persist();
    return ok({ user: sanitizeUser(user), ...tokens });
  });

  router.add('POST', '/auth/refresh', async (req) => {
    requireFields(req.body, ['refreshToken']);
    const payload = verifyToken(req.body.refreshToken);
    if (payload.type !== 'refresh') throw new HttpError(401, 'INVALID_TOKEN', 'Refresh token is required');
    const session = db().refreshSessions.find((item) => item.id === payload.sid && item.refreshTokenId === payload.jti);
    if (!session || session.revokedAt) throw new HttpError(401, 'SESSION_REVOKED', 'Refresh session is not active');
    session.revokedAt = nowIso();
    const user = db().users.find((item) => item.id === payload.sub);
    if (!user) throw new HttpError(401, 'USER_NOT_FOUND', 'User was not found');
    const tokens = createTokens(db(), user);
    await persist();
    return ok(tokens);
  });

  router.add('POST', '/auth/logout', async (req) => {
    const user = requireAuth(req, db());
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      const payload = verifyToken(refreshToken);
      const session = db().refreshSessions.find((item) => item.id === payload.sid && item.userId === user.id);
      if (session) session.revokedAt = nowIso();
    }
    await persist();
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
    const user = requireAuth(req, db());
    return ok(sanitizeUser(user));
  });

  router.add('PATCH', '/users/me', async (req) => {
    const user = requireAuth(req, db());
    user.displayName = req.body.displayName ?? user.displayName;
    user.bio = req.body.bio ?? user.bio;
    if (req.body.avatarObjectKey) {
      user.avatarUrl = signedStorageUrl(req.body.avatarObjectKey).url;
    }
    await persist();
    return ok(sanitizeUser(user));
  });

  router.add('PATCH', '/users/me/password', async (req) => {
    const user = requireAuth(req, db());
    requireFields(req.body, ['currentPassword', 'newPassword']);
    if (!verifyPassword(req.body.currentPassword, user.passwordHash)) {
      throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    user.passwordHash = hashPassword(req.body.newPassword);
    await persist();
    return ok({ passwordChanged: true });
  });

  router.add('GET', '/games/featured', async (req) => {
    const user = getOptionalUser(req, db());
    const limit = Math.min(20, Math.max(1, Number(req.query.get('limit') || 6)));
    const games = db()
      .games.filter((game) => game.status === 'PUBLISHED' && game.featured)
      .slice(0, limit)
      .map((game) => ({
        id: game.id,
        slug: game.slug,
        title: game.title,
        heroImageUrl: game.heroImageUrl,
        tagline: game.shortDescription,
        isOwned: user ? userOwnsGame(db(), user.id, game.id) : false
      }));
    return ok(games);
  });

  router.add('GET', '/games', async (req) => {
    const user = getOptionalUser(req, db());
    const search = (req.query.get('search') || '').toLowerCase();
    const genre = req.query.get('genre');
    const tags = toArray(req.query.get('tags')).map((tag) => tag.toLowerCase());
    const platform = req.query.get('platform');
    const priceType = req.query.get('priceType');
    const status = req.query.get('status') || 'PUBLISHED';
    const sort = req.query.get('sort') || 'featured';

    let games = db().games.filter((game) => game.status === status);
    if (search) {
      games = games.filter(
        (game) =>
          game.title.toLowerCase().includes(search) ||
          game.shortDescription.toLowerCase().includes(search) ||
          game.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }
    if (genre) games = games.filter((game) => game.genres.map((item) => item.toLowerCase()).includes(genre.toLowerCase()));
    if (tags.length > 0) {
      games = games.filter((game) => tags.every((tag) => game.tags.map((item) => item.toLowerCase()).includes(tag)));
    }
    if (platform) games = games.filter((game) => game.platforms.map((item) => item.toLowerCase()).includes(platform.toLowerCase()));
    if (priceType) games = games.filter((game) => game.priceType.toLowerCase() === priceType.toLowerCase());
    if (sort === 'newest') games.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    if (sort === 'price_low_to_high') games.sort((a, b) => money(a.price) - money(b.price));
    if (sort === 'featured') games.sort((a, b) => Number(b.featured) - Number(a.featured));

    const { pageItems, pagination } = paginate(games, req.query);
    return ok(pageItems.map((game) => publicGame(db(), game, user)), 200, { pagination });
  });

  router.add('GET', '/games/:gameId/media', async (req) => {
    const game = findGame(db(), req.params.gameId);
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    return ok(db().gameMedia.filter((media) => media.gameId === game.id).sort((a, b) => a.sortOrder - b.sortOrder));
  });

  router.add('GET', '/games/:gameId/reviews', async (req) => {
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const reviews = db()
      .gameReviews.filter((review) => review.gameId === game.id)
      .map((review) => ({
        ...review,
        author: sanitizeUser(db().users.find((user) => user.id === review.userId))
      }));
    const { pageItems, pagination } = paginate(reviews, req.query);
    return ok(pageItems, 200, { pagination });
  });

  router.add('POST', '/games/:gameId/reviews', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!userOwnsGame(db(), user.id, game.id)) throw new HttpError(403, 'GAME_NOT_OWNED', 'You must own the game to review it');
    requireFields(req.body, ['rating', 'body']);
    const rating = Math.max(1, Math.min(5, Number(req.body.rating)));
    let review = db().gameReviews.find((item) => item.gameId === game.id && item.userId === user.id);
    if (!review) {
      review = {
        id: createId('rev'),
        gameId: game.id,
        userId: user.id,
        rating,
        body: req.body.body,
        createdAt: nowIso()
      };
      db().gameReviews.push(review);
    } else {
      review.rating = rating;
      review.body = req.body.body;
      review.updatedAt = nowIso();
    }
    await persist();
    return ok(review, 201);
  });

  router.add('DELETE', '/games/:gameId/reviews/:reviewId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const reviewIndex = db().gameReviews.findIndex((r) => r.id === req.params.reviewId && r.gameId === game.id);
    if (reviewIndex === -1) throw new HttpError(404, 'REVIEW_NOT_FOUND', 'Review was not found');
    const review = db().gameReviews[reviewIndex];
    const isDev = (() => { const dev = developerForUser(db(), user); return dev && dev.id === game.developerId; })();
    if (review.userId !== user.id && !user.roles.includes('ADMIN') && !isDev) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot delete this review');
    }
    db().gameReviews.splice(reviewIndex, 1);
    await persist();
    return ok({ reviewId: review.id, deleted: true });
  });

  router.add('GET', '/games/:gameId/launch-manifest', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!userOwnsGame(db(), user.id, game.id)) throw new HttpError(403, 'GAME_NOT_OWNED', 'You do not own this game');
    const build = db().gameBuilds.find((item) => item.id === game.latestBuildId);
    const runtimeKey = `runtime/${game.id}/${build?.id || 'latest'}/index.html`;
    const manifestKey = `runtime/${game.id}/${build?.id || 'latest'}/manifest.json`;
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
    const user = getOptionalUser(req, db());
    const game = findGame(db(), req.params.gameId);
    if (!game || (game.status !== 'PUBLISHED' && !user?.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    }
    return ok(publicGame(db(), game, user));
  });

  router.add('GET', '/genres', async () => {
    const genres = [...new Set(db().games.flatMap((game) => game.genres))].sort();
    return ok(genres.map((name) => ({ id: `genre_${slugify(name)}`, name, slug: slugify(name) })));
  });

  router.add('GET', '/tags', async () => {
    const tags = [...new Set(db().games.flatMap((game) => game.tags))].sort();
    return ok(tags.map((name) => ({ id: `tag_${slugify(name)}`, name, slug: slugify(name) })));
  });

  router.add('GET', '/search', async (req) => {
    const q = (req.query.get('q') || '').toLowerCase();
    const limit = Math.min(20, Math.max(1, Number(req.query.get('limit') || 10)));
    const games = db()
      .games.filter(
        (game) =>
          game.status === 'PUBLISHED' &&
          (!q || game.title.toLowerCase().includes(q) || game.shortDescription.toLowerCase().includes(q))
      )
      .slice(0, limit)
      .map((game) => ({
        id: game.id,
        slug: game.slug,
        title: game.title,
        coverUrl: game.coverUrl
      }));
    const developers = db()
      .developerProfiles.filter((developer) => !q || developer.displayName.toLowerCase().includes(q))
      .slice(0, limit)
      .map((developer) => ({
        id: developer.id,
        displayName: developer.displayName
      }));
    return ok({ games, developers });
  });

  router.add('GET', '/library', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const search = (req.query.get('search') || '').toLowerCase();
    const status = req.query.get('status');
    let items = db().libraryItems.filter((item) => item.userId === user.id);
    if (status) items = items.filter((item) => item.installedStatus.toLowerCase() === status.toLowerCase());
    items = items
      .map((item) => {
        const game = db().games.find((entry) => entry.id === item.gameId);
        const build = db().gameBuilds.find((entry) => entry.id === game?.latestBuildId);
        return {
          gameId: item.gameId,
          slug: game?.slug,
          title: game?.title,
          coverUrl: game?.coverUrl,
          ownershipType: item.ownershipType,
          installedStatus: item.installedStatus,
          favorite: item.favorite,
          lastPlayedAt: item.lastPlayedAt,
          playtimeSeconds: item.playtimeSeconds,
          updateAvailable: Boolean(build?.version && item.installedBuildVersion && build.version !== item.installedBuildVersion)
        };
      })
      .filter((item) => !search || item.title?.toLowerCase().includes(search));
    const { pageItems, pagination } = paginate(items, req.query);
    return ok(pageItems, 200, { pagination });
  });

  router.add('GET', '/library/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const item = db().libraryItems.find((entry) => entry.userId === user.id && entry.gameId === game.id);
    if (!item) throw new HttpError(404, 'LIBRARY_ITEM_NOT_FOUND', 'Library item was not found');
    const latestBuild = db().gameBuilds.find((build) => build.id === game.latestBuildId);
    return ok({
      gameId: game.id,
      title: game.title,
      ownedAt: item.ownedAt,
      installedStatus: item.installedStatus,
      latestBuildVersion: latestBuild?.version || null,
      installedBuildVersion: item.installedBuildVersion,
      updateAvailable: Boolean(latestBuild?.version && latestBuild.version !== item.installedBuildVersion),
      playtimeSeconds: item.playtimeSeconds,
      cloudSavesEnabled: true
    });
  });

  router.add('POST', '/library/:gameId/favorite', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const item = db().libraryItems.find((entry) => entry.userId === user.id && entry.gameId === game.id);
    if (!item) throw new HttpError(404, 'LIBRARY_ITEM_NOT_FOUND', 'Library item was not found');
    item.favorite = true;
    await persist();
    return ok({ gameId: game.id, favorite: true });
  });

  router.add('DELETE', '/library/:gameId/favorite', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const item = db().libraryItems.find((entry) => entry.userId === user.id && entry.gameId === game.id);
    if (!item) throw new HttpError(404, 'LIBRARY_ITEM_NOT_FOUND', 'Library item was not found');
    item.favorite = false;
    await persist();
    return ok({ gameId: game.id, favorite: false });
  });

  router.add('GET', '/wishlist', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    return ok(
      db()
        .wishlistItems.filter((item) => item.userId === user.id)
        .map((item) => {
          const game = db().games.find((entry) => entry.id === item.gameId);
          return {
            gameId: item.gameId,
            slug: game?.slug,
            title: game?.title,
            price: game?.price,
            currency: game?.currency,
            coverUrl: game?.coverUrl,
            addedAt: item.addedAt
          };
        })
    );
  });

  router.add('POST', '/wishlist/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!db().wishlistItems.some((item) => item.userId === user.id && item.gameId === game.id)) {
      db().wishlistItems.push({ id: createId('wish'), userId: user.id, gameId: game.id, addedAt: nowIso() });
    }
    await persist();
    return ok({ gameId: game.id, wishlisted: true });
  });

  router.add('DELETE', '/wishlist/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    state.db.wishlistItems = db().wishlistItems.filter((item) => !(item.userId === user.id && item.gameId === game.id));
    await persist();
    return ok({ gameId: game.id, wishlisted: false });
  });

  router.add('GET', '/entitlements', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    return ok(db().entitlements.filter((item) => item.userId === user.id));
  });

  router.add('POST', '/payments/razorpay/orders', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    requireFields(req.body, ['gameId']);
    const game = findGame(db(), req.body.gameId);
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (userOwnsGame(db(), user.id, game.id)) throw new HttpError(409, 'ALREADY_OWNED', 'You already own this game');
    if (game.priceType === 'FREE') {
      const entitlement = grantEntitlement(db(), user.id, game.id, 'FREE');
      addNotification(db(), user.id, 'GAME_ADDED', 'Game added to library', `${game.title} was added to your library.`);
      await persist();
      return ok({ free: true, entitlement, libraryItemCreated: true }, 201);
    }
    const discount = req.body.couponCode === 'LAZ10' ? Math.floor(game.price * 0.1) : 0;
    const amount = game.price - discount;
    const internalOrderId = createId('ord');
    const razorpayOrderId = `order_${crypto.randomUUID().replaceAll('-', '').slice(0, 14)}`;
    const order = {
      id: internalOrderId,
      userId: user.id,
      gameId: game.id,
      razorpayOrderId,
      razorpayPaymentId: null,
      amount,
      currency: req.body.currency || game.currency,
      receipt: `lazplay_${internalOrderId}`,
      status: 'CREATED',
      couponCode: req.body.couponCode || null,
      createdAt: nowIso()
    };
    db().orders.push(order);
    await persist();
    return ok(
      {
        internalOrderId,
        razorpayOrderId,
        amount,
        currency: order.currency,
        receipt: order.receipt,
        game: { id: game.id, title: game.title },
        razorpayKeyId: config.razorpayKeyId
      },
      201
    );
  });

  router.add('POST', '/payments/razorpay/verify', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    requireFields(req.body, ['internalOrderId', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature']);
    const order = db().orders.find(
      (item) => item.id === req.body.internalOrderId && item.razorpayOrderId === req.body.razorpayOrderId && item.userId === user.id
    );
    if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    const expected = razorpaySignature(req.body.razorpayOrderId, req.body.razorpayPaymentId);
    if (req.body.razorpaySignature !== expected && !(config.allowMockPayments && req.body.razorpaySignature === 'mock_signature')) {
      throw new HttpError(400, 'INVALID_PAYMENT_SIGNATURE', 'Razorpay payment signature is invalid');
    }
    order.status = 'PAID';
    order.razorpayPaymentId = req.body.razorpayPaymentId;
    order.paidAt = nowIso();
    const payment = {
      id: createId('pay'),
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      amount: order.amount,
      currency: order.currency,
      status: 'CAPTURED',
      createdAt: nowIso()
    };
    db().payments.push(payment);
    const entitlement = grantEntitlement(db(), user.id, order.gameId, 'RAZORPAY_ORDER');
    const invoice = {
      id: createId('inv'),
      orderId: order.id,
      invoiceNumber: `LP-${new Date().getFullYear()}-${String(db().invoices.length + 1).padStart(4, '0')}`,
      objectKey: `invoices/${order.id}.pdf`,
      createdAt: nowIso()
    };
    db().invoices.push(invoice);
    addNotification(db(), user.id, 'PAYMENT_CAPTURED', 'Purchase complete', 'Your game was added to your library.');
    await persist();
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
      const order = db().orders.find((item) => item.razorpayOrderId === entity.order_id);
      if (order && order.status !== 'PAID') {
        order.status = 'PAID';
        order.razorpayPaymentId = entity.id;
        order.paidAt = nowIso();
        db().payments.push({
          id: createId('pay'),
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: entity.id,
          amount: entity.amount,
          currency: entity.currency,
          status: 'CAPTURED',
          createdAt: nowIso()
        });
        grantEntitlement(db(), order.userId, order.gameId, 'RAZORPAY_WEBHOOK');
      }
    }
    await persist();
    return ok({ received: true });
  });

  router.add('GET', '/orders', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const orders = db()
      .orders.filter((order) => order.userId === user.id)
      .map((order) => {
        const game = db().games.find((entry) => entry.id === order.gameId);
        return {
          id: order.id,
          gameId: order.gameId,
          gameTitle: game?.title,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt
        };
      });
    return ok(orders);
  });

  router.add('GET', '/orders/:orderId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const order = db().orders.find((item) => item.id === req.params.orderId);
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    }
    const invoice = db().invoices.find((item) => item.orderId === order.id);
    return ok({ ...order, invoiceId: invoice?.id || null });
  });

  router.add('GET', '/invoices/:invoiceId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const invoice = db().invoices.find((item) => item.id === req.params.invoiceId);
    if (!invoice) throw new HttpError(404, 'INVOICE_NOT_FOUND', 'Invoice was not found');
    const order = db().orders.find((item) => item.id === invoice.orderId);
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'INVOICE_NOT_FOUND', 'Invoice was not found');
    }
    return ok({
      id: invoice.id,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      downloadUrl: signedStorageUrl(invoice.objectKey).url
    });
  });

  router.add('POST', '/refunds', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    requireFields(req.body, ['orderId', 'reason']);
    const order = db().orders.find((item) => item.id === req.body.orderId);
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    }
    const refund = {
      id: createId('refund'),
      orderId: order.id,
      userId: order.userId,
      reason: req.body.reason,
      status: user.roles.includes('ADMIN') ? 'APPROVED' : 'REQUESTED',
      createdAt: nowIso()
    };
    db().refunds.push(refund);
    await persist();
    return ok({ refundId: refund.id, status: refund.status, orderId: order.id }, 201);
  });

  router.add('POST', '/storage/presign-upload', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['purpose', 'fileName', 'contentType', 'sizeBytes']);
    const objectKey = `${req.body.purpose.toLowerCase()}/${user.id}/${Date.now()}-${slugify(req.body.fileName) || req.body.fileName}`;
    const signed = signedStorageUrl(objectKey, 'PUT');
    db().storageObjects.push({
      id: createId('obj'),
      ownerId: user.id,
      objectKey,
      purpose: req.body.purpose,
      fileName: req.body.fileName,
      contentType: req.body.contentType,
      sizeBytes: Number(req.body.sizeBytes),
      status: 'PRESIGNED',
      createdAt: nowIso()
    });
    await persist();
    return ok({ objectKey, uploadUrl: signed.url, method: 'PUT', expiresAt: signed.expiresAt }, 201);
  });

  router.add('POST', '/storage/presign-multipart', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['gameId', 'buildId', 'fileName', 'contentType', 'sizeBytes', 'partCount']);
    const game = findGame(db(), req.body.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    const objectKey = `builds/${game.id}/${req.body.buildId}/${req.body.fileName}`;
    const uploadId = createId('minio_upload');
    const partCount = Math.min(10000, Math.max(1, Number(req.body.partCount)));
    const parts = Array.from({ length: partCount }, (_, index) => {
      const partNumber = index + 1;
      return {
        partNumber,
        uploadUrl: `${signedStorageUrl(objectKey, 'PUT').url}&uploadId=${uploadId}&partNumber=${partNumber}`
      };
    });
    db().storageObjects.push({
      id: createId('obj'),
      ownerId: user.id,
      objectKey,
      uploadId,
      purpose: 'BUILD_ARTIFACT',
      fileName: req.body.fileName,
      contentType: req.body.contentType,
      sizeBytes: Number(req.body.sizeBytes),
      status: 'MULTIPART_PRESIGNED',
      createdAt: nowIso()
    });
    await persist();
    return ok({ objectKey, uploadId, parts, expiresAt: addSeconds(3600) }, 201);
  });

  router.add('POST', '/storage/complete-multipart', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['objectKey', 'uploadId', 'parts']);
    const object = db().storageObjects.find((item) => item.objectKey === req.body.objectKey && item.uploadId === req.body.uploadId);
    if (!object || (object.ownerId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'OBJECT_NOT_FOUND', 'Storage object was not found');
    }
    object.status = 'UPLOADED';
    object.completedAt = nowIso();
    object.parts = req.body.parts;
    await persist();
    return ok({ objectKey: object.objectKey, completed: true, sizeBytes: object.sizeBytes });
  });

  router.add('GET', '/storage/presign-download', async (req) => {
    requireAuth(req, db(), ['PLAYER', 'DEVELOPER', 'ADMIN']);
    const objectKey = req.query.get('objectKey');
    if (!objectKey) throw new HttpError(400, 'VALIDATION_ERROR', 'objectKey query parameter is required');
    const signed = signedStorageUrl(objectKey, 'GET');
    return ok({ downloadUrl: signed.url, expiresAt: signed.expiresAt });
  });

  router.add('POST', '/webhooks/minio/object-created', async (req) => {
    const secret = req.headers['x-lazplay-internal-secret'];
    if (secret !== config.authSecret && !config.allowMockPayments) {
      throw new HttpError(401, 'INVALID_INTERNAL_SECRET', 'Internal secret is invalid');
    }
    requireFields(req.body, ['bucket', 'objectKey', 'sizeBytes']);
    let object = db().storageObjects.find((item) => item.objectKey === req.body.objectKey);
    if (!object) {
      object = {
        id: createId('obj'),
        ownerId: 'system',
        objectKey: req.body.objectKey,
        purpose: 'UNKNOWN',
        fileName: path.basename(req.body.objectKey),
        contentType: 'application/octet-stream',
        sizeBytes: Number(req.body.sizeBytes),
        status: 'UPLOADED',
        createdAt: nowIso()
      };
      db().storageObjects.push(object);
    }
    object.status = 'UPLOADED';
    object.etag = req.body.etag || object.etag;
    object.sizeBytes = Number(req.body.sizeBytes);
    await persist();
    return ok({ processed: true });
  });

  router.add('POST', '/developer/register', async (req) => {
    const user = requireAuth(req, db());
    requireFields(req.body, ['displayName']);
    const existing = developerForUser(db(), user);
    if (existing) throw new HttpError(409, 'DEVELOPER_EXISTS', 'Developer profile already exists for this account');
    const profile = {
      id: createId('dev'),
      userId: user.id,
      displayName: req.body.displayName,
      website: req.body.website || '',
      supportEmail: req.body.supportEmail || user.email,
      verificationStatus: 'PENDING',
      payoutStatus: 'INACTIVE',
      createdAt: nowIso()
    };
    if (!user.roles.includes('DEVELOPER')) user.roles.push('DEVELOPER');
    db().developerProfiles.push(profile);
    addAuditLog(db(), user.id, 'DEVELOPER_REGISTERED', 'DEVELOPER', profile.id, { displayName: profile.displayName });
    await persist();
    return ok(profile, 201);
  });

  router.add('GET', '/developer/profile', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const profile = developerForUser(db(), user);
    if (!profile) throw new HttpError(404, 'DEVELOPER_PROFILE_NOT_FOUND', 'Developer profile was not found');
    return ok(profile);
  });

  router.add('PATCH', '/developer/profile', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const profile = developerForUser(db(), user);
    if (!profile) throw new HttpError(404, 'DEVELOPER_PROFILE_NOT_FOUND', 'Developer profile was not found');
    profile.displayName = req.body.displayName ?? profile.displayName;
    profile.website = req.body.website ?? profile.website;
    profile.supportEmail = req.body.supportEmail ?? profile.supportEmail;
    await persist();
    return ok(profile);
  });

  router.add('GET', '/developer/games', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const developer = developerForUser(db(), user);
    const status = req.query.get('status');
    let games = user.roles.includes('ADMIN') && !developer ? db().games : db().games.filter((game) => game.developerId === developer?.id);
    if (status) games = games.filter((game) => game.status.toLowerCase() === status.toLowerCase());
    const { pageItems, pagination } = paginate(games, req.query);
    return ok(
      pageItems.map((game) => {
        const latestBuild = db().gameBuilds.find((build) => build.id === game.latestBuildId);
        return {
          id: game.id,
          title: game.title,
          slug: game.slug,
          status: game.status,
          latestBuildVersion: latestBuild?.version || null,
          downloads30d: 8492,
          revenue30d: db()
            .orders.filter((order) => order.gameId === game.id && order.status === 'PAID')
            .reduce((total, order) => total + order.amount, 0)
        };
      }),
      200,
      { pagination }
    );
  });

  router.add('GET', '/developer/games/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    const latestBuild = db().gameBuilds.find((build) => build.id === game.latestBuildId);
    const media = db().gameMedia.filter((m) => m.gameId === game.id).sort((a, b) => a.sortOrder - b.sortOrder);
    return ok({ ...game, latestBuildVersion: latestBuild?.version || null, media });
  });

  router.add('POST', '/developer/games', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const developer = developerForUser(db(), user);
    if (!developer) throw new HttpError(404, 'DEVELOPER_PROFILE_NOT_FOUND', 'Developer profile was not found');
    requireFields(req.body, ['title', 'shortDescription', 'description']);
    const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.title);
    if (db().games.some((game) => game.slug === slug)) throw new HttpError(409, 'SLUG_EXISTS', 'Game slug already exists');
    const game = {
      id: createId('game'),
      developerId: developer.id,
      slug,
      title: req.body.title,
      version: req.body.version || 'v1.0.0',
      shortDescription: req.body.shortDescription,
      description: req.body.description,
      price: Number(req.body.price || 0),
      currency: req.body.currency || 'INR',
      priceType: req.body.priceType || (Number(req.body.price || 0) > 0 ? 'PAID' : 'FREE'),
      licensingModel: req.body.licensingModel || (Number(req.body.price || 0) > 0 ? 'PREMIUM' : 'FREE_TO_PLAY'),
      releaseDate: req.body.releaseDate || null,
      publisher: req.body.publisher || developer.displayName,
      genres: req.body.genres || [],
      tags: req.body.tags || [],
      platforms: req.body.platforms || ['PC'],
      hardwareSpecs: req.body.hardwareSpecs || ['PC_SYSTEM'],
      status: 'DRAFT',
      featured: false,
      coverUrl: '',
      heroImageUrl: '',
      heroBannerUrl: '',
      trailerUrl: '',
      latestBuildId: null,
      systemRequirements: req.body.systemRequirements || {
        minimum: { cpu: '', memory: '', gpu: '', storage: '' },
        recommended: { cpu: '', memory: '', gpu: '', storage: '' }
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    db().games.push(game);
    await persist();
    return ok({ id: game.id, title: game.title, slug: game.slug, status: game.status }, 201);
  });

  router.add('PATCH', '/developer/games/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    const editable = [
      'title',
      'version',
      'shortDescription',
      'description',
      'price',
      'currency',
      'priceType',
      'licensingModel',
      'releaseDate',
      'publisher',
      'genres',
      'tags',
      'platforms',
      'hardwareSpecs',
      'coverUrl',
      'heroImageUrl',
      'heroBannerUrl',
      'trailerUrl',
      'systemRequirements'
    ];
    for (const field of editable) {
      if (req.body[field] !== undefined) game[field] = req.body[field];
    }
    if (req.body.coverObjectKey) game.coverUrl = signedStorageUrl(req.body.coverObjectKey).url;
    if (req.body.heroBannerObjectKey) game.heroBannerUrl = signedStorageUrl(req.body.heroBannerObjectKey).url;
    if (req.body.trailerObjectKey) game.trailerUrl = signedStorageUrl(req.body.trailerObjectKey).url;
    game.updatedAt = nowIso();
    await persist();
    return ok(game);
  });

  router.add('DELETE', '/developer/games/:gameId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    if (game.status === 'PUBLISHED') throw new HttpError(409, 'PUBLISHED_GAME', 'Unpublish the game before deleting it');
    state.db.games = db().games.filter((item) => item.id !== game.id);
    await persist();
    return ok({ deleted: true });
  });

  router.add('POST', '/developer/games/:gameId/submit-review', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    game.status = 'IN_REVIEW';
    game.reviewNotes = req.body.notes || '';
    game.submittedAt = nowIso();
    await persist();
    return ok({ gameId: game.id, status: game.status, submittedAt: game.submittedAt });
  });

  router.add('POST', '/developer/games/:gameId/publish', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    game.status = 'PUBLISHED';
    game.publishedAt = nowIso();
    game.updatedAt = nowIso();
    await persist();
    return ok({ gameId: game.id, status: game.status, publishedAt: game.publishedAt });
  });

  router.add('POST', '/developer/games/:gameId/unpublish', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    game.status = 'UNPUBLISHED';
    game.unpublishReason = req.body.reason || '';
    game.updatedAt = nowIso();
    await persist();
    return ok({ gameId: game.id, status: game.status });
  });

  router.add('POST', '/developer/games/:gameId/media', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    requireFields(req.body, ['type', 'objectKey']);
    const validTypes = ['IMAGE', 'VIDEO'];
    if (!validTypes.includes(req.body.type)) {
      throw new HttpError(400, 'VALIDATION_ERROR', `type must be one of: ${validTypes.join(', ')}`);
    }
    const existingMedia = db().gameMedia.filter((m) => m.gameId === game.id);
    const sortOrder = req.body.sortOrder ?? (existingMedia.length + 1);
    const media = {
      id: createId('media'),
      gameId: game.id,
      type: req.body.type,
      url: signedStorageUrl(req.body.objectKey).url,
      objectKey: req.body.objectKey,
      alt: req.body.alt || `${game.title} ${req.body.type.toLowerCase()}`,
      sortOrder
    };
    db().gameMedia.push(media);
    await persist();
    return ok(media, 201);
  });

  router.add('DELETE', '/developer/games/:gameId/media/:mediaId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    const mediaIndex = db().gameMedia.findIndex((m) => m.id === req.params.mediaId && m.gameId === game.id);
    if (mediaIndex === -1) throw new HttpError(404, 'MEDIA_NOT_FOUND', 'Media item was not found');
    const [removed] = db().gameMedia.splice(mediaIndex, 1);
    await persist();
    return ok({ mediaId: removed.id, deleted: true });
  });

  router.add('GET', '/developer/games/:gameId/builds', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    return ok(db().gameBuilds.filter((build) => build.gameId === game.id));
  });

  router.add('POST', '/developer/games/:gameId/builds', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const game = findGame(db(), req.params.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    requireFields(req.body, ['version', 'platform', 'runtime', 'entrypoint']);
    const build = {
      id: createId('build'),
      gameId: game.id,
      version: req.body.version,
      platform: req.body.platform,
      runtime: req.body.runtime,
      entrypoint: req.body.entrypoint,
      changelog: req.body.changelog || '',
      artifactObjectKey: null,
      status: 'WAITING_FOR_UPLOAD',
      scanStatus: 'NOT_STARTED',
      sizeBytes: 0,
      createdAt: nowIso()
    };
    db().gameBuilds.push(build);
    await persist();
    return ok(build, 201);
  });

  router.add('GET', '/developer/builds', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const developer = developerForUser(db(), user);
    const devGameIds = user.roles.includes('ADMIN') && !developer
      ? db().games.map((g) => g.id)
      : db().games.filter((g) => g.developerId === developer?.id).map((g) => g.id);
    const platform = req.query.get('platform');
    const status = req.query.get('status');
    let builds = db().gameBuilds.filter((b) => devGameIds.includes(b.gameId));
    if (platform) builds = builds.filter((b) => b.platform === platform);
    if (status) builds = builds.filter((b) => b.status === status);
    const { pageItems, pagination } = paginate(builds, req.query);
    return ok(pageItems.map((build) => {
      const game = db().games.find((g) => g.id === build.gameId);
      return { ...build, gameTitle: game?.title, gameSlug: game?.slug };
    }), 200, { pagination });
  });

  router.add('GET', '/developer/builds/:buildId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    return ok(build);
  });

  router.add('POST', '/developer/builds/:buildId/upload-url', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
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
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    requireFields(req.body, ['objectKey', 'sizeBytes']);
    build.artifactObjectKey = req.body.objectKey;
    build.sizeBytes = Number(req.body.sizeBytes);
    build.checksumSha256 = req.body.checksumSha256 || null;
    build.status = 'PROCESSING';
    const jobId = createId('job_extract');
    await persist();
    return ok({ buildId: build.id, status: build.status, jobId });
  });

  router.add('POST', '/developer/builds/:buildId/scan', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    build.scanStatus = 'PASSED';
    build.status = 'SCANNED';
    const jobId = createId('job_scan');
    await persist();
    return ok({ buildId: build.id, scanStatus: 'QUEUED', jobId });
  });

  router.add('POST', '/developer/builds/:buildId/deploy', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    if (build.scanStatus !== 'PASSED') throw new HttpError(409, 'BUILD_NOT_SCANNED', 'Build must pass scan before deployment');
    const deployment = {
      id: createId('dep'),
      gameId: game.id,
      buildId: build.id,
      status: 'QUEUED',
      environment: req.body.environment || 'PRODUCTION',
      progress: 0,
      releaseNotes: req.body.releaseNotes || '',
      createdAt: nowIso()
    };
    db().deployments.push(deployment);
    db().deploymentLogs.push({
      id: createId('log'),
      deploymentId: deployment.id,
      level: 'INFO',
      message: 'Deployment queued',
      timestamp: nowIso()
    });
    if (req.body.makeLatest) game.latestBuildId = build.id;
    await persist();
    return ok(deployment, 201);
  });

  router.add('DELETE', '/developer/builds/:buildId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const build = findBuild(db(), req.params.buildId);
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = findGame(db(), build.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    if (build.status === 'DEPLOYED') throw new HttpError(409, 'BUILD_DEPLOYED', 'Cannot delete a deployed build');
    state.db.gameBuilds = db().gameBuilds.filter((b) => b.id !== build.id);
    if (game.latestBuildId === build.id) game.latestBuildId = null;
    await persist();
    return ok({ buildId: build.id, deleted: true });
  });

  router.add('GET', '/developer/deployments/:deploymentId/logs', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const deployment = findDeployment(db(), req.params.deploymentId);
    if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment was not found');
    const game = findGame(db(), deployment.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    const limit = Math.min(500, Math.max(1, Number(req.query.get('limit') || 100)));
    const logs = db()
      .deploymentLogs.filter((log) => log.deploymentId === deployment.id)
      .slice(-limit);
    return ok(logs, 200, { nextCursor: logs.at(-1)?.id || null });
  });

  router.add('GET', '/developer/deployments/:deploymentId', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const deployment = findDeployment(db(), req.params.deploymentId);
    if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment was not found');
    const game = findGame(db(), deployment.gameId);
    assertDeveloperOwnsGame(db(), user, game);
    return ok({
      ...deployment,
      steps: [
        { name: 'extract', status: deployment.progress >= 25 ? 'COMPLETED' : 'PENDING' },
        { name: 'scan', status: deployment.progress >= 50 ? 'COMPLETED' : 'PENDING' },
        { name: 'publish-assets', status: deployment.progress >= 75 ? 'COMPLETED' : 'PENDING' },
        { name: 'activate-release', status: deployment.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' }
      ]
    });
  });

  router.add('GET', '/developer/deployments', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER', 'ADMIN']);
    const developer = developerForUser(db(), user);
    const devGameIds = user.roles.includes('ADMIN') && !developer
      ? db().games.map((g) => g.id)
      : db().games.filter((g) => g.developerId === developer?.id).map((g) => g.id);
    const status = req.query.get('status');
    const gameId = req.query.get('gameId');
    let deployments = db().deployments.filter((dep) => devGameIds.includes(dep.gameId));
    if (status) deployments = deployments.filter((dep) => dep.status === status);
    if (gameId) deployments = deployments.filter((dep) => dep.gameId === gameId);
    const { pageItems, pagination } = paginate(deployments, req.query);
    return ok(pageItems.map((dep) => {
      const game = db().games.find((g) => g.id === dep.gameId);
      const build = db().gameBuilds.find((b) => b.id === dep.buildId);
      return { ...dep, gameTitle: game?.title, buildVersion: build?.version };
    }), 200, { pagination });
  });

  router.add('GET', '/developer/analytics', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const developer = developerForUser(db(), user);
    const gameIds = db().games.filter((game) => game.developerId === developer?.id).map((game) => game.id);
    const paidOrders = db().orders.filter((order) => gameIds.includes(order.gameId) && order.status === 'PAID');
    const grossRevenue = paidOrders.reduce((total, order) => total + order.amount, 0);
    return ok({
      downloads: 8492,
      activeInstances: db().gameInstances.filter((instance) => gameIds.includes(instance.gameId)).length,
      grossRevenue,
      netRevenue: Math.floor(grossRevenue * 0.8),
      averageSessionSeconds: 1440,
      series: [{ date: new Date().toISOString().slice(0, 10), downloads: 1200, revenue: grossRevenue }]
    });
  });

  router.add('GET', '/developer/revenue', async (req) => {
    const user = requireAuth(req, db(), ['DEVELOPER']);
    const developer = developerForUser(db(), user);
    const gameIds = db().games.filter((game) => game.developerId === developer?.id).map((game) => game.id);
    const grossRevenue = db()
      .orders.filter((order) => gameIds.includes(order.gameId) && order.status === 'PAID')
      .reduce((total, order) => total + order.amount, 0);
    const platformFee = Math.floor(grossRevenue * 0.2);
    return ok({
      currency: 'INR',
      grossRevenue,
      platformFee,
      taxes: 0,
      netRevenue: grossRevenue - platformFee,
      pendingPayout: grossRevenue - platformFee,
      paidOut: 0
    });
  });

  router.add('POST', '/instances', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    requireFields(req.body, ['gameId']);
    const game = findGame(db(), req.body.gameId);
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!userOwnsGame(db(), user.id, game.id)) throw new HttpError(403, 'GAME_NOT_OWNED', 'You must own the game to host it');
    const instance = {
      id: createId('inst'),
      gameId: game.id,
      ownerId: user.id,
      status: 'PROVISIONING',
      region: req.body.region || 'ap-south-1',
      visibility: req.body.visibility || 'PRIVATE',
      maxPlayers: Number(req.body.maxPlayers || 8),
      name: req.body.name || `${game.title} Lobby`,
      joinCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      endpoint: null,
      createdAt: nowIso()
    };
    db().gameInstances.push(instance);
    db().instancePlayers.push({
      id: createId('iplayer'),
      instanceId: instance.id,
      userId: user.id,
      role: 'HOST',
      joinedAt: nowIso()
    });
    await persist();
    return ok(instance, 201);
  });

  router.add('GET', '/instances', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const gameId = req.query.get('gameId');
    const status = req.query.get('status');
    const memberInstanceIds = db().instancePlayers.filter((player) => player.userId === user.id).map((player) => player.instanceId);
    let instances = db().gameInstances.filter((instance) => instance.ownerId === user.id || memberInstanceIds.includes(instance.id));
    if (gameId) instances = instances.filter((instance) => instance.gameId === gameId);
    if (status) instances = instances.filter((instance) => instance.status.toLowerCase() === status.toLowerCase());
    return ok(
      instances.map((instance) => {
        const game = db().games.find((item) => item.id === instance.gameId);
        return {
          id: instance.id,
          gameId: instance.gameId,
          gameTitle: game?.title,
          status: instance.status,
          playersOnline: db().instancePlayers.filter((player) => player.instanceId === instance.id).length,
          maxPlayers: instance.maxPlayers,
          region: instance.region
        };
      })
    );
  });

  router.add('GET', '/instances/:instanceId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    const isMember = db().instancePlayers.some((player) => player.instanceId === instance.id && player.userId === user.id);
    if (!isMember && instance.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot access this instance');
    }
    return ok({
      ...instance,
      endpoint: instance.endpoint || `wss://runtime.lazplay.local/instances/${instance.id}`,
      players: db()
        .instancePlayers.filter((player) => player.instanceId === instance.id)
        .map((player) => ({
          userId: player.userId,
          displayName: db().users.find((entry) => entry.id === player.userId)?.displayName,
          role: player.role
        }))
    });
  });

  const instanceAction = (status) => async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    if (instance.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the instance owner can manage it');
    }
    instance.status = status;
    if (status === 'STARTING') instance.endpoint = `wss://runtime.lazplay.local/instances/${instance.id}`;
    db().instanceLogs.push({
      id: createId('ilog'),
      instanceId: instance.id,
      level: 'INFO',
      message: `Instance status changed to ${status}`,
      timestamp: nowIso()
    });
    await persist();
    return ok({ instanceId: instance.id, status });
  };

  router.add('POST', '/instances/:instanceId/start', instanceAction('STARTING'));
  router.add('POST', '/instances/:instanceId/stop', instanceAction('STOPPING'));
  router.add('POST', '/instances/:instanceId/restart', instanceAction('RESTARTING'));

  router.add('DELETE', '/instances/:instanceId', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    if (instance.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the instance owner can delete it');
    }
    state.db.gameInstances = db().gameInstances.filter((item) => item.id !== instance.id);
    state.db.instancePlayers = db().instancePlayers.filter((item) => item.instanceId !== instance.id);
    await persist();
    return ok({ instanceId: instance.id, deleted: true });
  });

  router.add('GET', '/instances/:instanceId/logs', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    const isMember = db().instancePlayers.some((player) => player.instanceId === instance.id && player.userId === user.id);
    if (!isMember && instance.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot access this instance');
    }
    return ok(db().instanceLogs.filter((log) => log.instanceId === instance.id));
  });

  router.add('GET', '/instances/:instanceId/metrics', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER', 'ADMIN']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    if (instance.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      const isMember = db().instancePlayers.some((player) => player.instanceId === instance.id && player.userId === user.id);
      if (!isMember) throw new HttpError(403, 'FORBIDDEN', 'You cannot access this instance');
    }
    return ok({
      cpuPercent: 42,
      memoryMb: 820,
      networkInKbps: 1200,
      networkOutKbps: 2400,
      playersOnline: db().instancePlayers.filter((player) => player.instanceId === instance.id).length,
      latencyMs: 14
    });
  });

  router.add('POST', '/instances/:instanceId/join', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    if (instance.visibility === 'PRIVATE' && req.body.joinCode !== instance.joinCode) {
      throw new HttpError(403, 'INVALID_JOIN_CODE', 'Join code is invalid');
    }
    if (!db().instancePlayers.some((player) => player.instanceId === instance.id && player.userId === user.id)) {
      db().instancePlayers.push({
        id: createId('iplayer'),
        instanceId: instance.id,
        userId: user.id,
        role: 'PLAYER',
        joinedAt: nowIso()
      });
    }
    await persist();
    return ok({
      instanceId: instance.id,
      joined: true,
      connectToken: signToken({ type: 'runtime', sub: user.id, instanceId: instance.id }, config.runtimeTokenTtlSeconds)
    });
  });

  router.add('GET', '/instances/:instanceId/connect-token', async (req) => {
    const user = requireAuth(req, db(), ['PLAYER']);
    const instance = db().gameInstances.find((item) => item.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    const isMember = db().instancePlayers.some((player) => player.instanceId === instance.id && player.userId === user.id);
    if (!isMember) throw new HttpError(403, 'FORBIDDEN', 'You must join this instance first');
    return ok({
      connectToken: signToken({ type: 'runtime', sub: user.id, instanceId: instance.id }, config.runtimeTokenTtlSeconds),
      endpoint: instance.endpoint || `wss://runtime.lazplay.local/instances/${instance.id}`,
      expiresAt: addSeconds(config.runtimeTokenTtlSeconds)
    });
  });

  router.add('GET', '/admin/dashboard', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    return ok({
      usersOnline: db().refreshSessions.filter((session) => !session.revokedAt).length,
      activeInstances: db().gameInstances.length,
      serverLoadPercent: 89.4,
      revenue24h: db().orders.filter((order) => order.status === 'PAID').reduce((total, order) => total + order.amount, 0),
      pendingGameReviews: db().games.filter((game) => game.status === 'IN_REVIEW').length,
      alerts: db()
        .serverNodes.filter((node) => node.status !== 'HEALTHY')
        .map((node) => ({ severity: 'CRITICAL', message: `Node ${node.id} is ${node.status}` }))
    });
  });

  router.add('GET', '/admin/users', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const search = (req.query.get('search') || '').toLowerCase();
    const role = req.query.get('role');
    const status = req.query.get('status');
    let users = db().users;
    if (search) users = users.filter((user) => user.email.toLowerCase().includes(search) || user.username.toLowerCase().includes(search));
    if (role) users = users.filter((user) => user.roles.includes(role));
    if (status) users = users.filter((user) => user.status.toLowerCase() === status.toLowerCase());
    const { pageItems, pagination } = paginate(users, req.query);
    return ok(pageItems.map(sanitizeUser), 200, { pagination });
  });

  router.add('PATCH', '/admin/users/:userId/role', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    requireFields(req.body, ['roles']);
    const user = db().users.find((item) => item.id === req.params.userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found');
    user.roles = req.body.roles;
    addAuditLog(db(), admin.id, 'USER_ROLE_UPDATED', 'USER', user.id, { roles: user.roles });
    await persist();
    return ok({ userId: user.id, roles: user.roles });
  });

  router.add('GET', '/admin/users/:userId', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const user = db().users.find((item) => item.id === req.params.userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found');
    return ok(sanitizeUser(user));
  });

  router.add('PATCH', '/admin/users/:userId/status', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    requireFields(req.body, ['status']);
    const user = db().users.find((item) => item.id === req.params.userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found');
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(req.body.status)) {
      throw new HttpError(400, 'VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`);
    }
    user.status = req.body.status;
    addAuditLog(db(), admin.id, 'USER_STATUS_UPDATED', 'USER', user.id, { status: user.status });
    await persist();
    return ok({ userId: user.id, status: user.status });
  });

  router.add('POST', '/admin/users/:userId/ban', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const user = db().users.find((item) => item.id === req.params.userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found');
    user.status = 'BANNED';
    user.banReason = req.body.reason || 'No reason provided';
    user.banExpiresAt = req.body.expiresAt || null;
    addAuditLog(db(), admin.id, 'USER_BANNED', 'USER', user.id, { reason: user.banReason });
    await persist();
    return ok({ userId: user.id, status: user.status });
  });

  router.add('POST', '/admin/users/:userId/unban', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const user = db().users.find((item) => item.id === req.params.userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User was not found');
    user.status = 'ACTIVE';
    user.banReason = null;
    user.banExpiresAt = null;
    addAuditLog(db(), admin.id, 'USER_UNBANNED', 'USER', user.id);
    await persist();
    return ok({ userId: user.id, status: user.status });
  });

  router.add('GET', '/admin/games', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const status = req.query.get('status');
    let games = db().games;
    if (status) games = games.filter((game) => game.status === status);
    const { pageItems, pagination } = paginate(games, req.query);
    return ok(
      pageItems.map((game) => ({
        id: game.id,
        title: game.title,
        developerName: gameDeveloper(db(), game)?.displayName,
        status: game.status,
        submittedAt: game.submittedAt || null
      })),
      200,
      { pagination }
    );
  });

  router.add('PATCH', '/admin/games/:gameId/status', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    requireFields(req.body, ['status']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    game.status = req.body.status;
    game.statusReason = req.body.reason || '';
    game.updatedAt = nowIso();
    addAuditLog(db(), admin.id, 'GAME_STATUS_UPDATED', 'GAME', game.id, { status: game.status, reason: game.statusReason });
    await persist();
    return ok({ gameId: game.id, status: game.status });
  });

  router.add('POST', '/admin/games/:gameId/feature', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    game.featured = true;
    game.updatedAt = nowIso();
    addAuditLog(db(), admin.id, 'GAME_FEATURED', 'GAME', game.id);
    await persist();
    return ok({ gameId: game.id, featured: true });
  });

  router.add('DELETE', '/admin/games/:gameId/feature', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const game = findGame(db(), req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    game.featured = false;
    game.updatedAt = nowIso();
    addAuditLog(db(), admin.id, 'GAME_UNFEATURED', 'GAME', game.id);
    await persist();
    return ok({ gameId: game.id, featured: false });
  });

  router.add('GET', '/admin/deployments', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const status = req.query.get('status');
    const gameId = req.query.get('gameId');
    let deployments = db().deployments;
    if (status) deployments = deployments.filter((deployment) => deployment.status === status);
    if (gameId) deployments = deployments.filter((deployment) => deployment.gameId === gameId);
    const { pageItems, pagination } = paginate(deployments, req.query);
    return ok(pageItems.map((dep) => {
      const game = db().games.find((g) => g.id === dep.gameId);
      const build = db().gameBuilds.find((b) => b.id === dep.buildId);
      return { ...dep, gameTitle: game?.title, buildVersion: build?.version };
    }), 200, { pagination });
  });

  router.add('GET', '/admin/deployments/:deploymentId', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const deployment = findDeployment(db(), req.params.deploymentId);
    if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment was not found');
    const game = db().games.find((g) => g.id === deployment.gameId);
    const build = db().gameBuilds.find((b) => b.id === deployment.buildId);
    const logs = db().deploymentLogs.filter((log) => log.deploymentId === deployment.id);
    return ok({
      ...deployment,
      gameTitle: game?.title,
      buildVersion: build?.version,
      steps: [
        { name: 'extract',        status: deployment.progress >= 25 ? 'COMPLETED' : 'PENDING' },
        { name: 'scan',           status: deployment.progress >= 50 ? 'COMPLETED' : 'PENDING' },
        { name: 'publish-assets', status: deployment.progress >= 75 ? 'COMPLETED' : 'PENDING' },
        { name: 'activate',       status: deployment.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' }
      ],
      logCount: logs.length
    });
  });

  router.add('GET', '/admin/servers', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    return ok(db().serverNodes);
  });

  router.add('POST', '/admin/servers', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    requireFields(req.body, ['id', 'region']);
    if (db().serverNodes.find((n) => n.id === req.body.id)) {
      throw new HttpError(409, 'NODE_EXISTS', 'A server node with that ID already exists');
    }
    const node = {
      id: req.body.id,
      region: req.body.region,
      status: req.body.status || 'HEALTHY',
      cpuPercent: 0,
      memoryPercent: 0,
      packetLossPercent: 0,
      activeInstances: 0
    };
    db().serverNodes.push(node);
    addAuditLog(db(), admin.id, 'SERVER_NODE_ADDED', 'SERVER', node.id, { region: node.region });
    await persist();
    return ok(node, 201);
  });

  router.add('PATCH', '/admin/servers/:nodeId', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const node = db().serverNodes.find((n) => n.id === req.params.nodeId);
    if (!node) throw new HttpError(404, 'NODE_NOT_FOUND', 'Server node was not found');
    const editable = ['status', 'cpuPercent', 'memoryPercent', 'packetLossPercent', 'activeInstances', 'region'];
    for (const field of editable) {
      if (req.body[field] !== undefined) node[field] = req.body[field];
    }
    addAuditLog(db(), admin.id, 'SERVER_NODE_UPDATED', 'SERVER', node.id, { status: node.status });
    await persist();
    return ok(node);
  });

  router.add('DELETE', '/admin/servers/:nodeId', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const nodeIndex = db().serverNodes.findIndex((n) => n.id === req.params.nodeId);
    if (nodeIndex === -1) throw new HttpError(404, 'NODE_NOT_FOUND', 'Server node was not found');
    const [removed] = db().serverNodes.splice(nodeIndex, 1);
    addAuditLog(db(), admin.id, 'SERVER_NODE_REMOVED', 'SERVER', removed.id);
    await persist();
    return ok({ nodeId: removed.id, deleted: true });
  });

  router.add('GET', '/admin/instances', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const status = req.query.get('status');
    const gameId = req.query.get('gameId');
    let instances = db().gameInstances;
    if (status) instances = instances.filter((i) => i.status === status);
    if (gameId) instances = instances.filter((i) => i.gameId === gameId);
    const { pageItems, pagination } = paginate(instances, req.query);
    return ok(pageItems.map((instance) => {
      const game = db().games.find((g) => g.id === instance.gameId);
      const owner = db().users.find((u) => u.id === instance.ownerId);
      return {
        ...instance,
        gameTitle: game?.title,
        ownerDisplayName: owner?.displayName,
        playersOnline: db().instancePlayers.filter((p) => p.instanceId === instance.id).length
      };
    }), 200, { pagination });
  });

  router.add('DELETE', '/admin/instances/:instanceId', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    const instance = db().gameInstances.find((i) => i.id === req.params.instanceId);
    if (!instance) throw new HttpError(404, 'INSTANCE_NOT_FOUND', 'Instance was not found');
    state.db.gameInstances = db().gameInstances.filter((i) => i.id !== instance.id);
    state.db.instancePlayers = db().instancePlayers.filter((i) => i.instanceId !== instance.id);
    addAuditLog(db(), admin.id, 'INSTANCE_FORCE_DELETED', 'INSTANCE', instance.id, { gameId: instance.gameId });
    await persist();
    return ok({ instanceId: instance.id, deleted: true });
  });

  router.add('GET', '/admin/payments', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const status = req.query.get('status');
    let payments = db().payments;
    if (status) payments = payments.filter((payment) => payment.status === status);
    const { pageItems, pagination } = paginate(payments, req.query);
    return ok(pageItems, 200, { pagination });
  });

  router.add('GET', '/admin/payments/:paymentId', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const payment = db().payments.find((p) => p.id === req.params.paymentId);
    if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found');
    const order = db().orders.find((o) => o.id === payment.orderId);
    const user = order ? db().users.find((u) => u.id === order.userId) : null;
    return ok({ ...payment, order: order || null, user: user ? sanitizeUser(user) : null });
  });

  router.add('GET', '/admin/refunds', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    return ok(db().refunds);
  });

  router.add('GET', '/admin/refunds/:refundId', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const refund = db().refunds.find((r) => r.id === req.params.refundId);
    if (!refund) throw new HttpError(404, 'REFUND_NOT_FOUND', 'Refund was not found');
    const order = db().orders.find((o) => o.id === refund.orderId);
    return ok({ ...refund, order: order || null });
  });

  router.add('PATCH', '/admin/refunds/:refundId', async (req) => {
    const admin = requireAuth(req, db(), ['ADMIN']);
    requireFields(req.body, ['status']);
    const refund = db().refunds.find((r) => r.id === req.params.refundId);
    if (!refund) throw new HttpError(404, 'REFUND_NOT_FOUND', 'Refund was not found');
    const validStatuses = ['APPROVED', 'REJECTED', 'PROCESSED'];
    if (!validStatuses.includes(req.body.status)) {
      throw new HttpError(400, 'VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`);
    }
    refund.status = req.body.status;
    refund.resolvedAt = nowIso();
    refund.resolvedBy = admin.id;
    refund.resolvedNote = req.body.note || '';
    if (req.body.status === 'APPROVED') {
      const order = db().orders.find((o) => o.id === refund.orderId);
      if (order) {
        const entitlement = db().entitlements.find((e) => e.userId === order.userId && e.gameId === order.gameId);
        if (entitlement) entitlement.status = 'REVOKED';
        state.db.libraryItems = db().libraryItems.filter((li) => !(li.userId === order.userId && li.gameId === order.gameId));
        addNotification(db(), order.userId, 'REFUND_APPROVED', 'Refund approved', 'Your refund has been approved and access revoked.');
      }
    }
    addAuditLog(db(), admin.id, 'REFUND_STATUS_UPDATED', 'REFUND', refund.id, { status: refund.status });
    await persist();
    return ok(refund);
  });

  router.add('GET', '/admin/audit-logs', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const actorId = req.query.get('actorId');
    const action = req.query.get('action');
    let logs = db().auditLogs;
    if (actorId) logs = logs.filter((log) => log.actorId === actorId);
    if (action) logs = logs.filter((log) => log.action === action);
    return ok(logs);
  });

  router.add('GET', '/admin/reports', async (req) => {
    requireAuth(req, db(), ['ADMIN']);
    const type = req.query.get('type') || 'payments';
    if (type === 'payments') {
      return ok({
        type,
        from: req.query.get('from') || null,
        to: req.query.get('to') || null,
        totalRevenue: db().orders.filter((order) => order.status === 'PAID').reduce((total, order) => total + order.amount, 0),
        orderCount: db().orders.length,
        refundCount: db().refunds.length
      });
    }
    return ok({
      type,
      users: db().users.length,
      games: db().games.length,
      deployments: db().deployments.length,
      instances: db().gameInstances.length
    });
  });

  router.add('GET', '/notifications', async (req) => {
    const user = requireAuth(req, db());
    const unreadOnly = req.query.get('unreadOnly') === 'true';
    const limit = Math.min(100, Math.max(1, Number(req.query.get('limit') || 20)));
    let notifications = db().notifications.filter((notification) => notification.userId === user.id);
    if (unreadOnly) notifications = notifications.filter((notification) => !notification.read);
    return ok(notifications.slice(-limit).reverse());
  });

  router.add('POST', '/notifications/:notificationId/read', async (req) => {
    const user = requireAuth(req, db());
    const notification = db().notifications.find((item) => item.id === req.params.notificationId && item.userId === user.id);
    if (!notification) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found');
    notification.read = true;
    notification.readAt = nowIso();
    await persist();
    return ok({ notificationId: notification.id, read: true });
  });

  router.add('POST', '/notifications/read-all', async (req) => {
    const user = requireAuth(req, db());
    let updatedCount = 0;
    for (const notification of db().notifications) {
      if (notification.userId === user.id && !notification.read) {
        notification.read = true;
        notification.readAt = nowIso();
        updatedCount += 1;
      }
    }
    await persist();
    return ok({ updatedCount });
  });
}

export async function createApp() {
  const state = {
    db: await loadDb(),
    async save() {
      await saveDb(this.db);
    }
  };
  const router = createRouter();
  registerRoutes(router, state);

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
