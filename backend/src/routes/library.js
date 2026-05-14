import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerLibraryRoutes(router, ctx) {
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

router.add('GET', '/library', async (req) => {
    const user = await requireAuth(req);
    const items = await prisma.libraryItem.findMany({
      where: { userId: user.id },
      include: { game: true },
      orderBy: { lastPlayedAt: 'desc' }
    });
    
    // Transform items to include public game data at the root
    const formatted = await Promise.all(items.map(async (item) => {
      const g = await publicGame(item.game, user);
      return {
        ...item,
        ...g,
        game: undefined // avoid circular or redundant data
      };
    }));
    
    return ok(formatted);
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

router.add('POST', '/library', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      gameId: validators.id()
    });
    
    const game = await prisma.game.findUnique({ where: { id: body.gameId } });
    if (!game || (game.status !== 'PUBLISHED' && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    }

    // If it's a free game, we grant the entitlement and add to library
    if (game.priceType === 'FREE') {
      await grantEntitlement(user.id, game.id, 'FREE');
    } else {
      // For paid games, the user MUST have an active entitlement already
      const hasEnt = await userOwnsGame(user.id, game.id);
      if (!hasEnt) {
        throw new HttpError(403, 'PURCHASE_REQUIRED', 'You must purchase this game before adding it to your library');
      }
      // ensureLibraryItem will create it if it doesn't exist
      await ensureLibraryItem(user.id, game.id, 'PURCHASED');
    }

    const item = await prisma.libraryItem.findUnique({
      where: { userId_gameId: { userId: user.id, gameId: game.id } },
      include: { game: true }
    });
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

}
