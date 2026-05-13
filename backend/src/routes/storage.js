import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerStorageRoutes(router, ctx) {
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

router.add('POST', '/storage/presign-upload', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      purpose: validators.enum(['GAME_MEDIA', 'USER_MEDIA', 'AVATAR', 'PROFILE_MEDIA', 'MEDIA', 'GAME_BUILD', 'BUILD', 'GAME_ARTIFACT', 'ARTIFACT']),
      fileName: validators.fileName(),
      contentType: validators.string({ min: 3, max: 160, pattern: /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i }),
      sizeBytes: validators.bigint({ min: 1n })
    });
    const objectKey = `${body.purpose.toLowerCase()}/${user.id}/${Date.now()}-${slugify(body.fileName) || body.fileName}`;
    const bucket = resolveBucketForPurpose(body.purpose);
    const signed = await signedStorageUrl(objectKey, 'PUT', 900, bucket, { contentType: body.contentType });
    const publicUrl = publicObjectUrl(objectKey, bucket);

    await prisma.storageObject.create({
      data: {
        id: createId('obj'),
        ownerId: user.id,
        objectKey,
        purpose: body.purpose,
        fileName: body.fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        status: 'PRESIGNED'
      }
    });

    return ok({ objectKey, uploadUrl: signed.url, publicUrl, method: 'PUT', expiresAt: signed.expiresAt }, 201);
  });

router.add('POST', '/storage/presign-multipart', async () => {
    throw new HttpError(501, 'MULTIPART_NOT_SUPPORTED', 'Multipart uploads are not enabled for R2');
  });

router.add('POST', '/storage/complete-multipart', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const body = validateBody(req.body, {
      objectKey: validators.objectKey(),
      uploadId: validators.string({ min: 1, max: 256 }),
      parts: validators.array({ minItems: 1, maxItems: 1000 })
    });
    const object = await prisma.storageObject.findUnique({
      where: { objectKey: body.objectKey }
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
    const objectKey = validateBody(
      { objectKey: req.query.get('objectKey') },
      { objectKey: validators.objectKey() }
    ).objectKey;
    const bucket = resolveBucketForKey(objectKey);
    const signed = await signedStorageUrl(objectKey, 'GET', 900, bucket);
    return ok({ downloadUrl: signed.url, expiresAt: signed.expiresAt });
  });

router.add('POST', '/webhooks/minio/object-created', async (req) => {
    const secret = req.headers['x-lazplay-internal-secret'];
    if (secret !== config.authSecret && !config.allowMockPayments) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid internal secret');
    }
    const body = validateBody(req.body, {
      bucket: validators.string({ min: 1, max: 160 }),
      objectKey: validators.objectKey(),
      sizeBytes: validators.bigint({ min: 0n }),
      etag: validators.string({ required: false, min: 1, max: 256 })
    });

    await prisma.storageObject.upsert({
      where: { objectKey: body.objectKey },
      update: { status: 'UPLOADED', sizeBytes: body.sizeBytes, etag: body.etag },
      create: {
        id: createId('obj'),
        ownerId: 'system',
        objectKey: body.objectKey,
        purpose: 'UNKNOWN',
        fileName: path.basename(body.objectKey),
        contentType: 'application/octet-stream',
        sizeBytes: body.sizeBytes,
        status: 'UPLOADED'
      }
    });

    return ok({ processed: true });
  });

}
