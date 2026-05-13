import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerAdminRoutes(router, ctx) {
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
    const body = validateBody(req.body, {
      roles: validators.stringArray({ required: true, minItems: 1, maxItems: 3, upper: true })
    });
    const invalidRoles = body.roles.filter((role) => !['PLAYER', 'DEVELOPER', 'ADMIN'].includes(role));
    if (invalidRoles.length > 0) {
      validationFailure([{ field: 'roles', message: `Invalid roles: ${invalidRoles.join(', ')}` }]);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { roles: body.roles }
    });

    await addAuditLog(admin.id, 'USER_ROLE_UPDATED', 'USER', user.id, { roles: body.roles });
    return ok(sanitizeUser(updated));
  });

router.add('PATCH', '/admin/users/:userId/status', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    const body = validateBody(req.body, {
      status: validators.enum(['ACTIVE', 'BANNED', 'SUSPENDED', 'INACTIVE'])
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: body.status }
    });

    await addAuditLog(admin.id, 'USER_STATUS_UPDATED', 'USER', user.id, { status: body.status });
    return ok(sanitizeUser(updated));
  });

router.add('POST', '/admin/users/:userId/ban', async (req) => {
    const admin = await requireAuth(req, null, ['ADMIN']);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    const body = validateBody(req.body, {
      reason: validators.string({ required: false, min: 3, max: 1000 })
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'BANNED' }
    });

    await addAuditLog(admin.id, 'USER_BANNED', 'USER', user.id, { reason: body.reason });
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
    const body = validateBody(req.body, {
      status: validators.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED']),
      reason: validators.string({ required: false, min: 1, max: 1000 })
    });

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: body.status,
        statusReason: body.reason,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : undefined
      }
    });

    await addAuditLog(admin.id, 'GAME_STATUS_UPDATED', 'GAME', game.id, { status: body.status });
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
    const body = validateBody(req.body, {
      id: validators.id(),
      region: validators.string({ min: 2, max: 40 })
    });

    const existing = await prisma.serverNode.findUnique({ where: { id: body.id } });
    if (existing) throw new HttpError(409, 'NODE_EXISTS', 'Node ID already exists');

    const node = await prisma.serverNode.create({
      data: {
        id: body.id,
        region: body.region,
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
    const body = validateBody(req.body, {
      status: validators.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'OFFLINE'])
    });

    const updated = await prisma.serverNode.update({
      where: { id: node.id },
      data: { status: body.status }
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
    const body = validateBody(req.body, {
      status: validators.enum(['REQUESTED', 'APPROVED', 'REJECTED']),
      note: validators.string({ required: false, min: 1, max: 1000 })
    });

    const refund = await prisma.refund.findUnique({
      where: { id: req.params.refundId },
      include: { order: true }
    });
    if (!refund) throw new HttpError(404, 'REFUND_NOT_FOUND', 'Refund not found');

    const updated = await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: body.status,
        resolvedAt: new Date(),
        resolvedBy: admin.id,
        resolvedNote: body.note
      }
    });

    if (body.status === 'APPROVED') {
      await prisma.$transaction([
        prisma.order.update({ where: { id: refund.orderId }, data: { status: 'REFUNDED' } }),
        prisma.entitlement.deleteMany({ where: { userId: refund.order.userId, gameId: refund.order.gameId } }),
        prisma.libraryItem.deleteMany({ where: { userId: refund.order.userId, gameId: refund.order.gameId } })
      ]);
      await addNotification(refund.order.userId, 'REFUND_APPROVED', 'Refund Approved', 'Your refund has been processed and access revoked.');
    }

    await addAuditLog(admin.id, 'REFUND_STATUS_UPDATED', 'REFUND', refund.id, { status: body.status });
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

}
