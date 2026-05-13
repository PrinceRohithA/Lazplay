import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerWishlistRoutes(router, ctx) {
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
    const body = validateBody(req.body, {
      gameId: validators.id()
    });
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_gameId: { userId: user.id, gameId: body.gameId } }
    });
    if (existing) return ok(existing);
    const item = await prisma.wishlistItem.create({
      data: { id: createId('wish'), userId: user.id, gameId: body.gameId }
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

}
