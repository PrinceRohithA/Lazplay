import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerAuthRoutes(router, ctx) {
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
    sendOTP, verifyOTP
  } = ctx;

router.add('POST', '/auth/register', async (req) => {
    const body = validateBody(req.body, {
      username: validators.string({ min: 3, max: 32, lower: true, pattern: /^[a-z0-9_.-]+$/ }),
      email: validators.email(),
      password: validators.password(),
      displayName: validators.string({ min: 2, max: 80 }),
      code: validators.string({ min: 6, max: 6 })
    });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] }
    });
    if (existing) {
      throw new HttpError(400, 'USER_EXISTS', 'Email or username already registered');
    }

    // Verify the email OTP code
    const isValid = await verifyOTP(body.email, 'VERIFY_EMAIL', body.code);
    if (!isValid) {
      throw new HttpError(400, 'INVALID_OTP', 'The verification code is invalid or has expired');
    }

    const user = await prisma.user.create({
      data: {
        id: createId('usr'),
        username: body.username,
        email: body.email,
        passwordHash: hashPassword(body.password),
        displayName: body.displayName,
        roles: ['PLAYER'],
        status: 'ACTIVE'
      }
    });

    const tokens = await createTokens(user);
    return ok({ user: sanitizeUser(user), ...tokens }, 201);
  });

router.add('POST', '/auth/login', async (req) => {
    const body = validateBody(req.body, {
      identifier: validators.string({ min: 3, max: 254, lower: true }),
      password: validators.password({ min: 1 })
    });
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: body.identifier }, { username: body.identifier }] }
    });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
    }
    if (user.status !== 'ACTIVE') throw new HttpError(403, 'USER_INACTIVE', 'User is not active');
    const tokens = await createTokens(user);
    return ok({ user: sanitizeUser(user), ...tokens });
  });

router.add('POST', '/auth/refresh', async (req) => {
    const body = validateBody(req.body, {
      refreshToken: validators.token()
    });
    const payload = verifyToken(body.refreshToken);
    if (payload.type !== 'refresh') throw new HttpError(401, 'INVALID_TOKEN', 'Refresh token is required');

    const session = await prisma.refreshSession.findFirst({
      where: { id: payload.sid, refreshTokenId: payload.jti }
    });
    if (!session || session.revokedAt) throw new HttpError(401, 'SESSION_REVOKED', 'Refresh session is not active');

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, 'USER_NOT_FOUND', 'User was not found');
    const tokens = await createTokens(user);
    return ok(tokens);
  });

router.add('POST', '/auth/logout', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      refreshToken: validators.token({ required: false })
    });
    if (body.refreshToken) {
      try {
        const payload = verifyToken(body.refreshToken);
        await prisma.refreshSession.updateMany({
          where: { id: payload.sid, userId: user.id },
          data: { revokedAt: new Date() }
        });
      } catch (e) { /* ignore invalid token on logout */ }
    }
    return ok({ loggedOut: true });
  });

router.add('POST', '/auth/forgot-password', async (req) => {
    const body = validateBody(req.body, { email: validators.email() });
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user) {
      await sendOTP(body.email, 'RESET_PASSWORD');
    }
    return ok({
      message: 'If the email exists, a verification code has been sent'
    });
  });

router.add('POST', '/auth/reset-password', async (req) => {
    const body = validateBody(req.body, {
      email: validators.email(),
      code: validators.string({ min: 6, max: 6 }),
      newPassword: validators.password()
    });
    
    const isValid = await verifyOTP(body.email, 'RESET_PASSWORD', body.code);
    if (!isValid) {
      throw new HttpError(400, 'INVALID_OTP', 'The verification code is invalid or has expired');
    }
    
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(body.newPassword) }
    });
    
    return ok({ passwordUpdated: true });
  });

router.add('POST', '/auth/resend-otp', async (req) => {
    const body = validateBody(req.body, {
      email: validators.email(),
      purpose: validators.string({ pattern: /^(VERIFY_EMAIL|RESET_PASSWORD)$/ })
    });
    
    if (body.purpose === 'VERIFY_EMAIL') {
      const existing = await prisma.user.findFirst({
        where: { email: body.email }
      });
      if (existing) {
        throw new HttpError(400, 'USER_EXISTS', 'Email is already registered');
      }
    }
    
    await sendOTP(body.email, body.purpose);
    return ok({ sent: true });
  });

router.add('POST', '/auth/verify-otp', async (req) => {
    const body = validateBody(req.body, {
      email: validators.email(),
      purpose: validators.string({ pattern: /^(VERIFY_EMAIL|RESET_PASSWORD)$/ }),
      code: validators.string({ min: 6, max: 6 })
    });
    
    const isValid = await verifyOTP(body.email, body.purpose, body.code);
    if (!isValid) {
      throw new HttpError(400, 'INVALID_OTP', 'The verification code is invalid or has expired');
    }
    
    return ok({ verified: true });
  });

router.add('GET', '/auth/me', async (req) => {
    const user = await requireAuth(req);
    return ok(sanitizeUser(user));
  });

router.add('PATCH', '/users/me', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      displayName: validators.string({ required: false, min: 2, max: 80 }),
      bio: validators.string({ required: false, min: 0, max: 1000, allowBlank: true }),
      avatarObjectKey: validators.objectKey({ required: false })
    }, { atLeastOne: ['displayName', 'bio', 'avatarObjectKey'] });
    const data = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.avatarObjectKey) {
      data.avatarUrl = (await signedStorageUrl(body.avatarObjectKey, 'GET', 900, getMediaBucket())).url;
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data
    });
    return ok(sanitizeUser(updated));
  });

router.add('PATCH', '/users/me/password', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      currentPassword: validators.password({ min: 1 }),
      newPassword: validators.password()
    });
    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(body.newPassword) }
    });
    return ok({ passwordChanged: true });
  });

}
