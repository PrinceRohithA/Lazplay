import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerPaymentsRoutes(router, ctx) {
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
    scanAndPrepareBuild, deleteStorageObject, deleteStorageRecord, deleteStorageObjectFromUrl, razorpaySignature,
    assertRazorpayWebhook
  } = ctx;

router.add('POST', '/payments/razorpay/orders', async (req) => {
    const user = await requireAuth(req, null, ['PLAYER']);
    const body = validateBody(req.body, {
      gameId: validators.id(),
      couponCode: validators.string({ required: false, min: 1, max: 40, upper: true })
    });
    const game = await prisma.game.findUnique({ where: { id: body.gameId } });
    if (!game || game.status !== 'PUBLISHED') throw new HttpError(404, 'GAME_NOT_FOUND', 'Game was not found');
    if (await userOwnsGame(user.id, game.id)) throw new HttpError(409, 'ALREADY_OWNED', 'You already own this game');

    if (game.priceType === 'FREE') {
      const entitlement = await grantEntitlement(user.id, game.id, 'FREE');
      await addNotification(user.id, 'GAME_ADDED', 'Game added to library', `${game.title} was added to your library.`);
      return ok({ free: true, entitlement, libraryItemCreated: true }, 201);
    }

    const discount = body.couponCode === 'LAZ10' ? Math.floor(game.price * 0.1) : 0;
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
    const body = validateBody(req.body, {
      internalOrderId: validators.id(),
      razorpayOrderId: validators.string({ min: 3, max: 128 }),
      razorpayPaymentId: validators.string({ min: 3, max: 128 }),
      razorpaySignature: validators.string({ min: 10, max: 256 })
    });

    const order = await prisma.order.findUnique({
      where: { id: body.internalOrderId },
    });

    if (!order || order.razorpayOrderId !== body.razorpayOrderId || order.userId !== user.id) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    }

    const expected = razorpaySignature(body.razorpayOrderId, body.razorpayPaymentId);
    if (body.razorpaySignature !== expected && !(config.allowMockPayments && body.razorpaySignature === 'mock_signature')) {
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
          razorpayPaymentId: body.razorpayPaymentId,
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
    const invoiceBucket = resolveBucketForKey(invoice.objectKey);
    const invoiceSigned = await signedStorageUrl(invoice.objectKey, 'GET', 900, invoiceBucket);
    return ok({
      downloadUrl: invoiceSigned.url
    });
  });

router.add('POST', '/refunds', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      orderId: validators.id(),
      reason: validators.string({ min: 3, max: 1000 })
    });
    const order = await prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order || (order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const refund = await prisma.refund.create({
      data: {
        id: createId('refund'),
        orderId: order.id,
        reason: body.reason,
        status: user.roles.includes('ADMIN') ? 'APPROVED' : 'REQUESTED'
      }
    });

    return ok(refund, 201);
  });

}
