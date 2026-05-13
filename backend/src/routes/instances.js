import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerInstancesRoutes(router, ctx) {
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

router.add('POST', '/instances', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const body = validateBody(req.body, {
      gameId: validators.id(),
      name: validators.string({ required: false, min: 2, max: 80 }),
      visibility: validators.enum(['PRIVATE', 'PUBLIC'], { required: false, defaultValue: 'PRIVATE' }),
      region: validators.string({ required: false, min: 2, max: 40, defaultValue: 'ap-south-1' }),
      maxPlayers: validators.int({ required: false, min: 1, max: 64, defaultValue: 8 })
    });
    const game = await findGame(body.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    if (!(await userOwnsGame(user.id, game.id))) throw new HttpError(403, 'GAME_NOT_OWNED', 'You must own the game to host it');

    const instanceId = createId('inst');
    const instance = await prisma.gameInstance.create({
      data: {
        id: instanceId,
        gameId: game.id,
        hostUserId: user.id,
        name: body.name || `${user.displayName}'s Lobby`,
        visibility: body.visibility,
        region: body.region,
        joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        maxPlayers: body.maxPlayers,
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
    const body = validateBody(req.body, {
      level: validators.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
      message: validators.string({ min: 1, max: 4000 })
    });

    console.log(`[Instance ${instance.id}] [${body.level}] ${body.message}`);
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

}
