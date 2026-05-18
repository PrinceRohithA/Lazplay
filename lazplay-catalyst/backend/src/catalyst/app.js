import crypto from 'node:crypto';
import { config } from './config.js';
import { createRouter, createId, HttpError, ok, readJsonBody, sendJson, stripApiPrefix, toHttpError } from './http.js';
import { createCache } from './services/cache.js';
import { createDataStore, sqlString } from './services/datastore.js';
import { hashPassword, issueTokens, publicUser, requireUser, verifyPassword } from './services/auth.js';
import { publicObjectUrl, signedR2Url } from './services/r2.js';

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] == null || body[field] === '');
  if (missing.length > 0) throw new HttpError(400, 'VALIDATION_ERROR', `Missing fields: ${missing.join(', ')}`);
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cacheKeysForGame(gameId) {
  return [
    ['home', 'homepage:published'],
    ['home', 'games:featured'],
    ['home', 'games:trending'],
    ['metadata', `game:${gameId}`],
    ['manifests', `manifest:${gameId}`],
    ['launcher', `launcher:${gameId}`]
  ];
}

async function invalidateGame(cache, gameId) {
  await Promise.all(cacheKeysForGame(gameId).map(([segment, key]) => cache.deleteKey(segment, key)));
}

function createLaunchManifest({ game, version, manifest, downloadUrls = [] }) {
  const parsedManifest = typeof manifest.manifestJson === 'string'
    ? JSON.parse(manifest.manifestJson)
    : manifest.manifestJson || {};

  return {
    gameId: game.id,
    slug: game.slug,
    title: game.title,
    versionId: version?.id || manifest.versionId,
    version: version?.version || manifest.version,
    entrypoint: version?.entrypoint || parsedManifest.entrypoint || 'game.exe',
    distributionType: version?.distributionType || manifest.distributionType || 'CHUNKED',
    manifestObjectKey: manifest.objectKey,
    manifestHash: manifest.manifestHash,
    chunks: parsedManifest.chunks || [],
    downloadUrls,
    expiresAt: new Date(Date.now() + config.signedUrlTtlSeconds * 1000).toISOString()
  };
}

export function createApp() {
  const router = createRouter();

  router.add('GET', '/health', async () => ok({
    status: 'ok',
    service: 'lazplay-catalyst-api',
    version: config.appVersion,
    architecture: 'Catalyst AppSail + Catalyst Cache/Data Store + Cloudflare R2'
  }));

  router.add('GET', '/version', async () => ok({ version: config.appVersion, env: config.appEnv }));

  router.add('POST', '/auth/register', async (req, { db }) => {
    requireFields(req.body, ['email', 'username', 'password']);
    const existing = await db.findOne(config.tables.users, 'email', req.body.email);
    if (existing) throw new HttpError(409, 'EMAIL_EXISTS', 'Email is already registered');
    const user = await db.insert(config.tables.users, {
      id: createId('usr'),
      email: String(req.body.email).toLowerCase(),
      username: req.body.username,
      displayName: req.body.displayName || req.body.username,
      passwordHash: hashPassword(req.body.password),
      roles: 'PLAYER',
      status: 'ACTIVE'
    });
    return ok({ user: publicUser(user), ...issueTokens(user) }, 201);
  });

  router.add('POST', '/auth/login', async (req, { db, cache }) => {
    requireFields(req.body, ['email', 'password']);
    const user = await db.findOne(config.tables.users, 'email', String(req.body.email).toLowerCase());
    if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const tokens = issueTokens(user);
    await cache.setJson('launcher', `session:${user.id}`, { userId: user.id, createdAt: new Date().toISOString() }, config.cacheTtlHours.launcherSession);
    return ok({ user: publicUser(user), ...tokens });
  });

  router.add('GET', '/auth/me', async (req, { db }) => {
    const user = await requireUser(req, db);
    return ok({ user: publicUser(user) });
  });

  router.add('GET', '/games', async (req, { db, cache }) => {
    const limit = Math.min(Number(req.query.get('limit') || 24), 50);
    const { value, cache: state } = await cache.withJson('home', `homepage:published:${limit}`, config.cacheTtlHours.home, () =>
      db.listPublishedGames({ limit })
    );
    return ok({ games: value }, 200, { cache: state });
  });

  router.add('GET', '/games/featured', async (_req, { db, cache }) => {
    const { value, cache: state } = await cache.withJson('home', 'games:featured', config.cacheTtlHours.home, () =>
      db.list(config.tables.games, "status = 'PUBLISHED' AND featured = true", 24)
    );
    return ok({ games: value }, 200, { cache: state });
  });

  router.add('GET', '/games/trending', async (_req, { db, cache }) => {
    const { value, cache: state } = await cache.withJson('home', 'games:trending', config.cacheTtlHours.trending, () =>
      db.query(`SELECT * FROM ${config.tables.games} WHERE status = 'PUBLISHED' ORDER BY weeklyPlayCount DESC LIMIT 24`, config.tables.games)
    );
    return ok({ games: value }, 200, { cache: state });
  });

  router.add('GET', '/games/:gameId', async (req, { db, cache }) => {
    const { gameId } = req.params;
    const { value, cache: state } = await cache.withJson('metadata', `game:${gameId}`, config.cacheTtlHours.metadata, async () => {
      const byId = await db.findById(config.tables.games, gameId);
      return byId || db.findOne(config.tables.games, 'slug', normalizeSlug(gameId));
    });
    if (!value) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    return ok({ game: value }, 200, { cache: state });
  });

  router.add('GET', '/games/:gameId/launch-manifest', async (req, { db, cache }) => {
    const { gameId } = req.params;
    const { value, cache: state } = await cache.withJson('manifests', `manifest:${gameId}`, config.cacheTtlHours.manifest, async () => {
      const record = await db.gameManifest(gameId);
      if (!record) return null;
      return createLaunchManifest(record);
    });
    if (!value) throw new HttpError(404, 'MANIFEST_NOT_FOUND', 'Launch manifest was not found');
    return ok({ manifest: value }, 200, { cache: state });
  });

  router.add('POST', '/games/:gameId/download-session', async (req, { db, cache }) => {
    const user = await requireUser(req, db);
    const { gameId } = req.params;
    const ownsGame = await db.userOwnsGame(user.id, gameId);
    if (!ownsGame) throw new HttpError(403, 'OWNERSHIP_REQUIRED', 'Game ownership is required');

    const record = await db.gameManifest(gameId);
    if (!record) throw new HttpError(404, 'MANIFEST_NOT_FOUND', 'Launch manifest was not found');
    const parsedManifest = typeof record.manifest.manifestJson === 'string'
      ? JSON.parse(record.manifest.manifestJson)
      : record.manifest.manifestJson || {};
    const chunkKeys = (parsedManifest.chunks || []).slice(0, 500).map((chunk) => chunk.objectKey).filter(Boolean);
    const downloadUrls = await Promise.all(chunkKeys.map(async (key) => ({
      key,
      url: await signedR2Url({ method: 'GET', key, purpose: 'privateGame' })
    })));
    const sessionId = createId('dl');
    const manifest = createLaunchManifest({ ...record, downloadUrls });

    await cache.setJson('signedUrls', `download:${sessionId}`, {
      sessionId,
      userId: user.id,
      gameId,
      expiresAt: manifest.expiresAt
    }, config.cacheTtlHours.signedUrlSession);

    return ok({ sessionId, manifest });
  });

  router.add('POST', '/developer/games', async (req, { db, cache }) => {
    const user = await requireUser(req, db, ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['title']);
    const game = await db.insert(config.tables.games, {
      id: createId('game'),
      developerId: req.body.developerId || user.developerId || user.id,
      slug: normalizeSlug(req.body.slug || req.body.title),
      title: req.body.title,
      tagline: req.body.tagline || '',
      description: req.body.description || '',
      priceType: req.body.priceType || 'FREE',
      status: 'DRAFT',
      featured: false
    });
    await invalidateGame(cache, game.id);
    return ok({ game }, 201);
  });

  router.add('POST', '/developer/builds/:buildId/upload-url', async (req, { db }) => {
    await requireUser(req, db, ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['objectKey']);
    const purpose = req.body.public ? 'publicGame' : 'privateGame';
    const url = await signedR2Url({
      method: 'PUT',
      key: req.body.objectKey,
      purpose,
      contentType: req.body.contentType || 'application/octet-stream'
    });
    return ok({ uploadUrl: url, objectKey: req.body.objectKey, expiresIn: config.signedUrlTtlSeconds });
  });

  router.add('POST', '/developer/builds/:buildId/manifest', async (req, { db, cache }) => {
    await requireUser(req, db, ['DEVELOPER', 'ADMIN']);
    requireFields(req.body, ['gameId', 'versionId', 'manifest']);
    const manifestJson = JSON.stringify(req.body.manifest);
    const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
    const record = await db.insert(config.tables.manifests, {
      id: createId('mft'),
      gameId: req.body.gameId,
      versionId: req.body.versionId,
      objectKey: req.body.objectKey || '',
      manifestHash,
      distributionType: req.body.distributionType || 'CHUNKED',
      manifestJson
    });
    await invalidateGame(cache, req.body.gameId);
    return ok({ manifest: record }, 201);
  });

  router.add('GET', '/developer/builds/:buildId/manifest', async (req, { db }) => {
    await requireUser(req, db, ['DEVELOPER', 'ADMIN']);
    const manifest = await db.findOne(config.tables.manifests, 'versionId', req.params.buildId);
    if (!manifest) throw new HttpError(404, 'MANIFEST_NOT_FOUND', 'Manifest was not found');
    return ok({ manifest });
  });

  router.add('POST', '/storage/presign-upload', async (req, { db }) => {
    await requireUser(req, db);
    requireFields(req.body, ['objectKey']);
    const url = await signedR2Url({
      method: 'PUT',
      key: req.body.objectKey,
      purpose: req.body.purpose || 'media',
      contentType: req.body.contentType || 'application/octet-stream'
    });
    return ok({ uploadUrl: url, objectKey: req.body.objectKey, publicUrl: publicObjectUrl(req.body.objectKey, req.body.purpose) });
  });

  router.add('GET', '/comments/:gameId', async (req, { db, cache }) => {
    const key = `comments:${req.params.gameId}`;
    const { value, cache: state } = await cache.withJson('metadata', key, config.cacheTtlHours.metadata, () =>
      db.list(config.tables.comments, `gameId = ${sqlString(req.params.gameId)} AND status = 'VISIBLE'`, 100)
    );
    return ok({ comments: value }, 200, { cache: state });
  });

  router.add('POST', '/comments/:gameId', async (req, { db, cache }) => {
    const user = await requireUser(req, db);
    requireFields(req.body, ['body']);
    const comment = await db.insert(config.tables.comments, {
      id: createId('cmt'),
      gameId: req.params.gameId,
      userId: user.id,
      body: req.body.body,
      status: 'VISIBLE'
    });
    await cache.deleteKey('metadata', `comments:${req.params.gameId}`);
    return ok({ comment }, 201);
  });

  router.add('GET', '/cosmetics/:gameId', async (req, { db, cache }) => {
    const { value, cache: state } = await cache.withJson('metadata', `cosmetics:${req.params.gameId}`, config.cacheTtlHours.metadata, () =>
      db.list(config.tables.cosmetics, `gameId = ${sqlString(req.params.gameId)} AND status = 'ACTIVE'`, 100)
    );
    return ok({ cosmetics: value }, 200, { cache: state });
  });

  router.add('POST', '/payments/razorpay/orders', async (req, { db }) => {
    const user = await requireUser(req, db);
    requireFields(req.body, ['gameId']);
    const game = await db.findById(config.tables.games, req.body.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    const purchase = await db.insert(config.tables.purchases, {
      id: createId('pur'),
      userId: user.id,
      gameId: game.id,
      userGameKey: `${user.id}:${game.id}`,
      amount: Number(game.price || 0),
      currency: game.currency || 'INR',
      provider: 'RAZORPAY',
      status: Number(game.price || 0) === 0 ? 'ACTIVE' : 'CREATED'
    });
    return ok({ order: purchase }, 201);
  });

  router.add('GET', '/users/:username/profile', async (req, { db, cache }) => {
    const { username } = req.params;
    const { value, cache: state } = await cache.withJson('metadata', `profile:${username}`, config.cacheTtlHours.metadata, async () => {
      const user = await db.findOne(config.tables.users, 'username', username);
      if (!user) return null;
      
      const equipped = await db.list(config.tables.userEquippedCosmetics, `userId = ${sqlString(user.id)}`, 100);
      const equippedIds = equipped.map(e => e.cosmeticId).filter(Boolean);
      
      let equippedCosmetics = [];
      if (equippedIds.length > 0) {
        equippedCosmetics = await db.query(`SELECT * FROM ${config.tables.cosmetics} WHERE id IN (${equippedIds.map(id => sqlString(id)).join(', ')})`, config.tables.cosmetics);
      }
      
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        roles: user.roles,
        equipped: equipped.map(e => {
            const cosmetic = equippedCosmetics.find(c => c.id === e.cosmeticId);
            return { slot: e.slot, cosmetic };
        })
      };
    });
    if (!value) throw new HttpError(404, 'USER_NOT_FOUND', 'User profile not found');
    return ok({ profile: value }, 200, { cache: state });
  });

  router.add('GET', '/cosmetics/platform', async (req, { db, cache }) => {
    const { value, cache: state } = await cache.withJson('metadata', 'cosmetics:platform', config.cacheTtlHours.metadata, () =>
      db.list(config.tables.cosmetics, `sourceType = 'platform' AND status = 'ACTIVE'`, 500)
    );
    return ok({ cosmetics: value }, 200, { cache: state });
  });

  router.add('GET', '/users/me/inventory', async (req, { db }) => {
    const user = await requireUser(req, db);
    const inventory = await db.list(config.tables.userInventory, `userId = ${sqlString(user.id)}`, 1000);
    const equipped = await db.list(config.tables.userEquippedCosmetics, `userId = ${sqlString(user.id)}`, 100);
    return ok({ inventory, equipped });
  });

  router.add('POST', '/users/me/equip', async (req, { db, cache }) => {
    const user = await requireUser(req, db);
    requireFields(req.body, ['slot', 'cosmeticId']);
    const { slot, cosmeticId } = req.body;
    
    // Check ownership
    const owns = await db.list(config.tables.userInventory, `userId = ${sqlString(user.id)} AND cosmeticId = ${sqlString(cosmeticId)}`, 1);
    if (owns.length === 0) throw new HttpError(403, 'NOT_OWNED', 'You do not own this cosmetic');
    
    const existing = await db.findOne(config.tables.userEquippedCosmetics, 'userId', user.id); // Wait, this logic needs refinement, but we delete existing slot first
    await db.query(`DELETE FROM ${config.tables.userEquippedCosmetics} WHERE userId = ${sqlString(user.id)} AND slot = ${sqlString(slot)}`, config.tables.userEquippedCosmetics);
    
    const equipped = await db.insert(config.tables.userEquippedCosmetics, {
      id: createId('uec'),
      userId: user.id,
      slot: slot,
      cosmeticId: cosmeticId
    });
    
    await cache.deleteKey('metadata', `profile:${user.username}`);
    return ok({ equipped });
  });

  router.add('POST', '/cosmetics/:sku/purchase', async (req, { db, cache }) => {
    const user = await requireUser(req, db);
    const cosmetic = await db.findOne(config.tables.cosmetics, 'sku', req.params.sku);
    if (!cosmetic) throw new HttpError(404, 'COSMETIC_NOT_FOUND', 'Cosmetic not found');
    if (cosmetic.status !== 'ACTIVE') throw new HttpError(400, 'UNAVAILABLE', 'Cosmetic is not active');
    
    const owns = await db.list(config.tables.userInventory, `userId = ${sqlString(user.id)} AND cosmeticId = ${sqlString(cosmetic.id)}`, 1);
    if (owns.length > 0) throw new HttpError(409, 'ALREADY_OWNED', 'You already own this cosmetic');
    
    const price = Number(cosmetic.price || 0);
    const currentCoins = Number(user.coins || 0);
    
    if (currentCoins < price) {
        throw new HttpError(402, 'INSUFFICIENT_COINS', 'Not enough coins to purchase this cosmetic');
    }
    
    // Deduct coins and add to inventory
    await db.update(config.tables.users, user.id, { coins: currentCoins - price });
    const inventory = await db.insert(config.tables.userInventory, {
        id: createId('inv'),
        userId: user.id,
        cosmeticId: cosmetic.id,
        acquiredAt: new Date().toISOString()
    });
    
    return ok({ inventory, remainingCoins: currentCoins - price });
  });

  router.add('GET', '/admin/audit-logs', async (req, { db }) => {
    await requireUser(req, db, ['ADMIN']);
    return ok({ logs: await db.list(config.tables.adminLogs, '', 100) });
  });

  return async function app(req, res) {
    const requestId = createId('req');
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, null, requestId);
      return;
    }

    try {
      const url = new URL(req.url, 'http://localhost');
      const routePath = stripApiPrefix(url.pathname);
      if (!routePath) throw new HttpError(404, 'NOT_FOUND', `Route must start with one of: ${config.apiPrefixes.join(', ')}`);
      const matched = router.match(req.method, routePath);
      if (!matched) throw new HttpError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${url.pathname}`);

      req.requestId = requestId;
      req.query = url.searchParams;
      req.params = matched.params;
      req.body = await readJsonBody(req);

      const services = {
        cache: createCache(req),
        db: createDataStore(req)
      };
      const response = await matched.route.handler(req, services);
      sendJson(res, response.status, response.body, requestId);
    } catch (error) {
      const httpError = toHttpError(error);
      sendJson(res, httpError.status, {
        success: false,
        error: {
          code: httpError.code,
          message: httpError.message,
          details: httpError.details
        },
        requestId
      }, requestId);
    }
  };
}
