import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerGamesRoutes(router, ctx) {
  const {
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
    scanAndPrepareBuild, deleteStorageObject, deleteStorageRecord, deleteStorageObjectFromUrl, razorpaySignature
  } = ctx;

router.add('GET', '/games/featured', async (req) => {
    const user = await getOptionalUser(req);
    const limit = validateQueryInt(req.query, 'limit', { required: false, defaultValue: 6, min: 1, max: 20 });
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
      tagline: game.tagline,
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
        { description: { contains: search, mode: 'insensitive' } },
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
    const body = validateBody(req.body, {
      rating: validators.int({ min: 1, max: 5 }),
      body: validators.string({ min: 1, max: 4000 })
    });

    const review = await prisma.gameReview.upsert({
      where: { gameId_userId: { gameId: game.id, userId: user.id } },
      update: { rating: body.rating, body: body.body },
      create: {
        id: createId('rev'),
        gameId: game.id,
        userId: user.id,
        rating: body.rating,
        body: body.body
      }
    });

    return ok(review, 201);
  });

router.add('POST', '/games/:gameId/plays/start', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (!(await userOwnsGame(user.id, game.id))) throw new HttpError(403, 'GAME_NOT_OWNED', 'You do not own this game');

    await prisma.gamePlaySession.updateMany({
      where: { gameId: game.id, userId: user.id, endedAt: null },
      data: { endedAt: new Date(), durationSeconds: 0 }
    });

    const session = await prisma.gamePlaySession.create({
      data: {
        id: createId('play'),
        gameId: game.id,
        userId: user.id,
        startedAt: new Date()
      }
    });

    return ok({ sessionId: session.id, startedAt: session.startedAt }, 201);
  });

router.add('POST', '/games/:gameId/plays/end', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');

    const body = validateBody(req.body, {
      sessionId: validators.id({ required: false })
    });

    const where = body.sessionId
      ? { id: body.sessionId, gameId: game.id, userId: user.id, endedAt: null }
      : { gameId: game.id, userId: user.id, endedAt: null };

    const session = await prisma.gamePlaySession.findFirst({
      where,
      orderBy: { startedAt: 'desc' }
    });

    if (!session) throw new HttpError(404, 'PLAY_SESSION_NOT_FOUND', 'Active play session not found');

    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));

    const updated = await prisma.gamePlaySession.update({
      where: { id: session.id },
      data: { endedAt, durationSeconds }
    });

    return ok({ sessionId: updated.id, endedAt: updated.endedAt, durationSeconds: updated.durationSeconds });
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

    // WEB GAMES CANNOT BE SOLD: Only FREE games can be played online in the browser.
    if (game.priceType !== 'FREE') {
      throw new HttpError(403, 'WEB_PLAY_NOT_SUPPORTED', 'Paid games cannot be played online in the browser. Please download the game to play locally.');
    }

    const build = game.latestBuildId ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } }) : null;
    const entrypoint = build?.entrypoint || 'index.html';
    const entryDir = entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1) : '';
    const runtimeKey = `runtime/${game.id}/${build?.id || 'latest'}/${entrypoint}`;
    const manifestKey = `runtime/${game.id}/${build?.id || 'latest'}/${entryDir}manifest.json`;
    const runtimeBucket = getRuntimeBucketForGame(game);

    let entrypointUrl;
    let assetManifestUrl;
    let expiresAt = null;

    if (String(game.priceType || '').toUpperCase() === 'FREE') {
      entrypointUrl = publicObjectUrl(runtimeKey, runtimeBucket);
      assetManifestUrl = publicObjectUrl(manifestKey, runtimeBucket);
      if (!entrypointUrl || !assetManifestUrl) {
        throw new HttpError(500, 'PUBLIC_GAME_URL_MISSING', 'Public game URL configuration is missing');
      }
    } else {
      const runtimeSigned = await signedStorageUrl(runtimeKey, 'GET', 900, runtimeBucket);
      const manifestSigned = await signedStorageUrl(manifestKey, 'GET', 900, runtimeBucket);
      entrypointUrl = runtimeSigned.url;
      assetManifestUrl = manifestSigned.url;
      expiresAt = addSeconds(config.runtimeTokenTtlSeconds);
    }
    return ok({
      gameId: game.id,
      buildId: build?.id || null,
      version: build?.version || null,
      runtime: build?.runtime || 'BROWSER',
      entrypointUrl,
      assetManifestUrl,
      expiresAt
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
    const limit = validateQueryInt(req.query, 'limit', { required: false, defaultValue: 10, min: 1, max: 20 });
    const [games, developers] = await Promise.all([
      prisma.game.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, take: limit }),
      prisma.developerProfile.findMany({ where: { displayName: { contains: q, mode: 'insensitive' } }, take: limit })
    ]);
    return ok({ games, developers });
  });

}
