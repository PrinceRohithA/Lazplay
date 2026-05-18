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
    scanAndPrepareBuild, deleteStorageObject, deleteStorageRecord, deleteStorageObjectFromUrl, razorpaySignature,
    assertRazorpayWebhook, sendEmail, signedStorageUrl, extractObjectKeyFromUrl
  } = ctx;

  async function sendPurchaseEmail(user, game, amount, currency = 'INR') {
    const subject = `Purchase Confirmation: ${game.title}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; background: #fff; border-radius: 8px; border: 1px solid #eee; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin-bottom: 20px;">Thank you for your purchase!</h2>
        <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
        <p>Your purchase of <strong>${game.title}</strong> has been confirmed and added to your LazPlay library.</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px;">Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #666;">Game:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${game.title}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Amount Paid:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${currency} ${amount}</td>
            </tr>
          </table>
        </div>
        
        <p>You can now download and play this game using the LazPlay Desktop Launcher.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #999;">If you have any questions, please contact support.</p>
      </div>
    `;
    return sendEmail({ to: user.email, subject, html }).catch(err => console.error('[purchase-email-failed]', err));
  }

  async function sendFreeGameEmail(user, game) {
    const subject = `Game Added: ${game.title}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; background: #fff; border-radius: 8px; border: 1px solid #eee; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; margin-bottom: 20px;">Enjoy your new game!</h2>
        <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
        <p><strong>${game.title}</strong> has been successfully added to your LazPlay library.</p>
        
        <p>Since this is a free game, no payment was required.</p>
        <p>You can now download and play this game using the LazPlay Desktop Launcher.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #999;">Enjoy playing!</p>
      </div>
    `;
    return sendEmail({ to: user.email, subject, html }).catch(err => console.error('[free-email-failed]', err));
  }

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
      await sendFreeGameEmail(user, game);
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
    
    // Background send email
    const game = await prisma.game.findUnique({ where: { id: order.gameId } });
    if (game) await sendPurchaseEmail(user, game, order.amount / 100, order.currency);

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
        const [user, game] = await Promise.all([
          prisma.user.findUnique({ where: { id: order.userId } }),
          prisma.game.findUnique({ where: { id: order.gameId } })
        ]);
        if (user && game) {
          await addNotification(user.id, 'PAYMENT_CAPTURED', 'Purchase complete', 'Your game was added to your library.');
          await sendPurchaseEmail(user, game, entity.amount / 100, entity.currency);
        }
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
      where: { id: req.params.invoiceId },
      include: { order: true }
    });
    if (!invoice || (invoice.order.userId !== user.id && !user.roles.includes('ADMIN'))) {
      throw new HttpError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    }
    const key = invoice.pdfUrl ? extractObjectKeyFromUrl(invoice.pdfUrl) : `invoices/${invoice.id}.pdf`;
    const invoiceBucket = resolveBucketForKey(key);
    const invoiceSigned = await signedStorageUrl(key, 'GET', 900, invoiceBucket);
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
