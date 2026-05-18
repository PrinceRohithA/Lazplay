import { prisma } from '../prisma.js';
import { validateBody, validateQueryInt, validators } from '../validation.js';

export function registerDeveloperRoutes(router, ctx) {
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
    scanAndPrepareBuild, deleteRuntimeObjects, deleteStorageObject, deleteStorageRecord, deleteStorageObjectFromUrl, razorpaySignature,
    validationFailure
  } = ctx;

router.add('POST', '/developer/register', async (req) => {
    const user = await requireAuth(req);
    const body = validateBody(req.body, {
      displayName: validators.string({ min: 2, max: 80 }),
      website: validators.url({ required: false }),
      supportEmail: validators.email({ required: false })
    });
    const existing = await developerForUser(user);
    if (existing) throw new HttpError(409, 'DEVELOPER_EXISTS', 'Developer profile already exists');

    const profile = await prisma.developerProfile.create({
      data: {
        id: createId('dev'),
        userId: user.id,
        displayName: body.displayName,
        website: body.website,
        supportEmail: body.supportEmail || user.email
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: [...new Set([...user.roles, 'DEVELOPER'])] } }
    });

    await addAuditLog(user.id, 'DEVELOPER_REGISTERED', 'DEVELOPER', profile.id, { displayName: profile.displayName });
    return ok(profile, 201);
  });

router.add('GET', '/developer/profile', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    return ok(profile);
  });

router.add('PATCH', '/developer/profile', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    const body = validateBody(req.body, {
      displayName: validators.string({ required: false, min: 2, max: 80 }),
      bio: validators.string({ required: false, min: 0, max: 1000, allowBlank: true }),
      website: validators.url({ required: false }),
      supportEmail: validators.email({ required: false })
    }, { atLeastOne: ['displayName', 'bio', 'website', 'supportEmail'] });

    const data = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.website !== undefined) data.website = body.website;
    if (body.supportEmail !== undefined) data.supportEmail = body.supportEmail;

    const updated = await prisma.developerProfile.update({
      where: { id: profile.id },
      data
    });
    return ok(updated);
  });

router.add('GET', '/developer/games', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    
    if (user.roles.includes('ADMIN')) {
      const games = await prisma.game.findMany({ orderBy: { createdAt: 'desc' } });
      return ok(games);
    }

    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    const games = await prisma.game.findMany({ where: { developerId: profile.id }, orderBy: { createdAt: 'desc' } });
    const mapped = await Promise.all(games.map(g => publicGame(g, user)));
    return ok(mapped);
  });

router.add('POST', '/developer/games', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
    const body = validateBody(req.body, {
      title: validators.string({ min: 2, max: 120 }),
      description: validators.string({ required: false, min: 0, max: 10000, allowBlank: true, trim: false }),
      tagline: validators.string({ required: false, min: 0, max: 120, allowBlank: true }),
      price: validators.int({ required: false, min: 0, max: 10000000 }),
      priceType: validators.enum(['FREE', 'PAID'], { required: false }),
      releaseDate: validators.string({ required: false, min: 0, max: 40, allowBlank: true }),
      publisher: validators.string({ required: false, min: 0, max: 120, allowBlank: true }),
      genres: validators.stringArray({ required: false, maxItems: 10, maxLength: 60 }),
      tags: validators.stringArray({ required: false, maxItems: 20, maxLength: 60 }),
      platforms: validators.stringArray({ required: false, maxItems: 12, maxLength: 60, upper: true }),
      licensingModel: validators.string({ required: false, min: 0, max: 60, allowBlank: true }),
      hardwareSpecs: validators.object({ required: false }),
      systemRequirements: validators.object({ required: false })
    });

    const game = await prisma.game.create({
      data: {
        id: createId('game'),
        developerId: profile.id,
        title: body.title,
        slug: slugify(body.title) + '-' + createId('').slice(-4),
        status: 'DRAFT',
        price: body.price ?? 0,
        currency: 'INR',
        priceType: body.priceType ?? 'FREE',
        description: body.description,
        tagline: body.tagline,
        releaseDate: body.releaseDate,
        publisher: body.publisher,
        genres: body.genres || [],
        tags: body.tags || [],
        platforms: body.platforms || [],
        licensingModel: body.licensingModel,
        hardwareSpecs: body.hardwareSpecs,
        systemRequirements: body.systemRequirements
      }
    });
    return ok(game, 201);
  });

router.add('GET', '/developer/games/:gameId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    // Fetch media and builds separately to avoid complex join hangs
    const [media, builds, mapped] = await Promise.all([
      prisma.gameMedia.findMany({ where: { gameId: game.id } }),
      prisma.gameBuild.findMany({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      publicGame(game, user)
    ]);

    return ok({ ...mapped, media, builds });
  });

router.add('PATCH', '/developer/games/:gameId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    const body = validateBody(req.body, {
      title: validators.string({ required: false, min: 2, max: 120 }),
      description: validators.string({ required: false, min: 0, max: 10000, allowBlank: true, trim: false }),
      tagline: validators.string({ required: false, min: 0, max: 120, allowBlank: true }),
      price: validators.int({ required: false, min: 0, max: 10000000 }),
      priceType: validators.enum(['FREE', 'PAID'], { required: false }),
      releaseDate: validators.string({ required: false, min: 0, max: 40, allowBlank: true }),
      publisher: validators.string({ required: false, min: 0, max: 120, allowBlank: true }),
      genres: validators.stringArray({ required: false, maxItems: 10, maxLength: 60 }),
      tags: validators.stringArray({ required: false, maxItems: 20, maxLength: 60 }),
      platforms: validators.stringArray({ required: false, maxItems: 12, maxLength: 60, upper: true }),
      licensingModel: validators.string({ required: false, min: 0, max: 60, allowBlank: true }),
      hardwareSpecs: validators.object({ required: false }),
      licensingModel: validators.string({ required: false, min: 0, max: 60, allowBlank: true }),
      hardwareSpecs: validators.object({ required: false }),
      systemRequirements: validators.object({ required: false }),
      coverUrl: validators.string({ required: false, min: 0, max: 500, allowBlank: true }),
      coverObjectKey: validators.string({ required: false, min: 0, max: 500, allowBlank: true }),
      heroImageUrl: validators.string({ required: false, min: 0, max: 500, allowBlank: true }),
      heroBannerUrl: validators.string({ required: false, min: 0, max: 500, allowBlank: true }),
      trailerUrl: validators.string({ required: false, min: 0, max: 500, allowBlank: true }),
      trailerObjectKey: validators.string({ required: false, min: 0, max: 500, allowBlank: true })
    }, {
      atLeastOne: [
        'title', 'description', 'tagline',
        'price', 'priceType', 'releaseDate', 'publisher',
        'genres', 'tags', 'platforms', 'licensingModel',
        'hardwareSpecs', 'systemRequirements',
        'coverUrl', 'heroImageUrl', 'heroBannerUrl', 'trailerUrl'
      ]
    });

    const updates = {};
    const changes = {};
    const setIfChanged = (field, value) => {
      if (value === undefined) return;
      if (JSON.stringify(game[field]) !== JSON.stringify(value)) {
        updates[field] = value;
        changes[field] = { from: game[field], to: value };
      }
    };

    setIfChanged('coverUrl', body.coverUrl);
    setIfChanged('coverObjectKey', body.coverObjectKey);
    setIfChanged('heroImageUrl', body.heroImageUrl);
    setIfChanged('heroBannerUrl', body.heroBannerUrl);
    setIfChanged('trailerUrl', body.trailerUrl);
    setIfChanged('trailerObjectKey', body.trailerObjectKey);

    const nextPriceType = body.priceType !== undefined
      ? body.priceType
      : game.priceType;
    const nextPrice = body.price !== undefined
      ? body.price
      : game.price;

    const priceTypeChanged = body.priceType !== undefined && nextPriceType !== game.priceType;
    const priceChanged = body.price !== undefined && nextPrice !== game.price;
    const pricingChanged = priceTypeChanged || priceChanged;

    if (pricingChanged && game.pricingUpdatedAt) {
      const nextAllowedAt = new Date(game.pricingUpdatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (Date.now() < nextAllowedAt.getTime()) {
        throw new HttpError(409, 'PRICING_CHANGE_TOO_SOON', 'Pricing can only be changed once per week', {
          nextAllowedAt: nextAllowedAt.toISOString()
        });
      }
    }

    if (priceTypeChanged) {
      const fromBucket = getRuntimeBucketForPriceType(game.priceType);
      const toBucket = getRuntimeBucketForPriceType(nextPriceType);
      if (nextPriceType === 'FREE') {
        // Moving to FREE: re-scan latest web build to generate runtime in public bucket.
        const latestBuild = game.latestBuildId
          ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } })
          : await prisma.gameBuild.findFirst({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' } });

        if (latestBuild && isWebRuntime(latestBuild.runtime || latestBuild.platform)) {
          await scanAndPrepareBuild(latestBuild, { ...game, priceType: 'FREE' });
        } else {
          await moveRuntimeObjects(game.id, fromBucket, toBucket);
        }
      } else {
        // Moving to PAID: Web games cannot be played online. Remove any public runtime.
        try {
          await deleteRuntimeObjects(game.id, fromBucket);
        } catch (error) {
          console.error('[runtime-update-failed]', { gameId: game.id, message: error?.message });
        }
      }
    }

    setIfChanged('title', body.title);
    setIfChanged('description', body.description);
    setIfChanged('tagline', body.tagline);
    setIfChanged('releaseDate', body.releaseDate);
    setIfChanged('publisher', body.publisher);
    if (body.price !== undefined) setIfChanged('price', nextPrice);
    if (body.priceType !== undefined) setIfChanged('priceType', nextPriceType);
    setIfChanged('genres', body.genres);
    setIfChanged('tags', body.tags);
    setIfChanged('platforms', body.platforms);
    setIfChanged('licensingModel', body.licensingModel);
    setIfChanged('hardwareSpecs', body.hardwareSpecs);
    setIfChanged('systemRequirements', body.systemRequirements);

    if (pricingChanged) updates.pricingUpdatedAt = new Date();

    if (Object.keys(updates).length === 0) return ok(game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        ...updates,
        status: 'DRAFT' // Mandatory review on any change
      }
    });

    let warning = null;
    if (nextPriceType !== 'FREE' || nextPrice > 0) {
      const webBuilds = await prisma.gameBuild.findFirst({
        where: {
          gameId: game.id,
          OR: [
            { runtime: { in: ['BROWSER', 'WEB', 'WEBGL', 'HTML5'] } },
            { platform: { in: ['BROWSER', 'WEB', 'WEBGL', 'HTML5'] } }
          ]
        }
      });
      if (webBuilds) {
        warning = 'Warning: This game has web-based builds. Since web games cannot be sold, these files will only be available for download and cannot be played online in the browser. Players can pay and play locally.';
      }
    }

    if (Object.keys(changes).length > 0) {
      await addAuditLog(user.id, 'GAME_METADATA_UPDATED', 'GAME', game.id, { changes });
    }

    return ok(updated, 200, warning ? { warning } : {});
  });

router.add('DELETE', '/developer/games/:gameId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: { media: true, builds: true }
    });
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    // Cleanup all media from storage
    for (const m of game.media) {
      await deleteStorageObjectFromUrl(m.url, getMediaBucket());
    }

    // Cleanup build artifacts from storage
    for (const b of game.builds) {
      await deleteStorageObject(b.artifactObjectKey, getPrivateGameBucket());
    }

    const deployments = await prisma.deployment.findMany({
      where: { gameId: game.id },
      select: { id: true }
    });
    const deploymentIds = deployments.map((deployment) => deployment.id);

    if (deploymentIds.length > 0) {
      await prisma.deploymentLog.deleteMany({
        where: { deploymentId: { in: deploymentIds } }
      });
    }

    await prisma.deployment.deleteMany({ where: { gameId: game.id } });
    await prisma.instancePlayer.deleteMany({ where: { instance: { gameId: game.id } } });
    await prisma.gameInstance.deleteMany({ where: { gameId: game.id } });
    await prisma.libraryItem.deleteMany({ where: { gameId: game.id } });
    await prisma.wishlistItem.deleteMany({ where: { gameId: game.id } });
    await prisma.entitlement.deleteMany({ where: { gameId: game.id } });
    await prisma.gameReview.deleteMany({ where: { gameId: game.id } });
    await prisma.gameMedia.deleteMany({ where: { gameId: game.id } });
    await prisma.gameBuild.deleteMany({ where: { gameId: game.id } });

    await prisma.game.delete({ where: { id: game.id } });
    return ok({ deleted: true });
  });

router.add('POST', '/developer/games/:gameId/submit', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const build = game.latestBuildId
      ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } })
      : await prisma.gameBuild.findFirst({ where: { gameId: game.id }, orderBy: { createdAt: 'desc' } });

    if (!build) throw new HttpError(409, 'BUILD_REQUIRED', 'Upload a build before submitting for review');
    if (build.status === 'WAITING_FOR_UPLOAD') {
      throw new HttpError(409, 'BUILD_NOT_UPLOADED', 'Build upload must be completed before submission');
    }

    await scanAndPrepareBuild(build, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date() }
    });

    return ok(updated);
  });

router.add('POST', '/developer/games/:gameId/publish', async (req) => {
    const user = await requireAuth(req, null, ['ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    });

    return ok(updated);
  });

router.add('POST', '/developer/games/:gameId/unpublish', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: 'DRAFT' }
    });

    return ok(updated);
  });

router.add('POST', '/developer/games/:gameId/visibility', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    const body = validateBody(req.body, {
      visibility: validators.enum(['PUBLIC', 'PRIVATE'])
    });

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { status: body.visibility === 'PUBLIC' ? 'PUBLISHED' : 'DRAFT' }
    });

    return ok(updated);
  });

router.add('POST', '/developer/games/:gameId/media', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);
    const body = validateBody(req.body, {
      type: validators.enum(['IMAGE', 'VIDEO']),
      alt: validators.enum(['SCREENSHOT', 'HERO_BANNER', 'VIDEO_TRAILER', 'PROJECT_COVER', 'COVER_IMAGE'], { required: false }),
      url: validators.url({ required: false }),
      objectKey: validators.objectKey({ required: false })
    });
    if (!body.url && !body.objectKey) {
      validationFailure([{ field: 'url|objectKey', message: 'url or objectKey is required' }]);
    }

    const mediaType = body.type;
    const mediaAlt = body.alt || '';
    const mediaBucket = getMediaBucket();
    const objectKey = body.objectKey || extractObjectKeyFromUrl(body.url, mediaBucket);
    const mediaUrl = objectKey ? publicObjectUrl(objectKey, mediaBucket) : body.url;

    if (!mediaUrl) throw new HttpError(400, 'VALIDATION_ERROR', 'Media URL is required');

    if (objectKey) {
      const resolvedBucket = resolveBucketForKey(objectKey);
      if (resolvedBucket && resolvedBucket !== mediaBucket) {
        throw new HttpError(400, 'INVALID_MEDIA_BUCKET', 'Media must be stored in the media bucket');
      }
    } else {
      const allowedOrigins = [config.r2MediaPublicUrl, config.r2PublicUrl]
        .filter(Boolean)
        .map((value) => new URL(value).origin);
      if (allowedOrigins.length > 0) {
        let origin;
        try {
          origin = new URL(mediaUrl).origin;
        } catch {
          throw new HttpError(400, 'INVALID_MEDIA_URL', 'Media URL is invalid');
        }
        if (!allowedOrigins.includes(origin)) {
          throw new HttpError(400, 'INVALID_MEDIA_URL', 'Media URL must use the public media domain');
        }
      }
    }

    const [totalCount, heroCount, screenshotCount, videoCount] = await Promise.all([
      prisma.gameMedia.count({ where: { gameId: game.id } }),
      prisma.gameMedia.count({ where: { gameId: game.id, alt: 'HERO_BANNER' } }),
      prisma.gameMedia.count({ where: { gameId: game.id, alt: 'SCREENSHOT' } }),
      prisma.gameMedia.count({
        where: {
          gameId: game.id,
          OR: [{ type: 'VIDEO' }, { alt: 'VIDEO_TRAILER' }]
        }
      })
    ]);

    const cleanupUpload = async () => {
      if (!objectKey) return;
      const inUse = await prisma.gameMedia.findFirst({ where: { url: mediaUrl } });
      if (inUse) return;
      await deleteStorageObject(objectKey, mediaBucket);
      await deleteStorageRecord(objectKey);
    };

    if (config.maxGameMediaItems > 0 && totalCount >= config.maxGameMediaItems) {
      await cleanupUpload();
      throw new HttpError(409, 'MEDIA_LIMIT_REACHED', 'Media limit reached. Delete existing media before uploading more.');
    }

    if (mediaAlt === 'HERO_BANNER' && config.maxGameMediaHeroBanners > 0 && heroCount >= config.maxGameMediaHeroBanners) {
      await cleanupUpload();
      throw new HttpError(409, 'MEDIA_LIMIT_REACHED', 'Hero banner limit reached. Delete the existing banner before uploading.');
    }

    if (mediaAlt === 'SCREENSHOT' && config.maxGameMediaScreenshots > 0 && screenshotCount >= config.maxGameMediaScreenshots) {
      await cleanupUpload();
      throw new HttpError(409, 'MEDIA_LIMIT_REACHED', 'Screenshot limit reached. Delete screenshots before uploading more.');
    }

    if ((mediaType === 'VIDEO' || mediaAlt === 'VIDEO_TRAILER') && config.maxGameMediaVideos > 0 && videoCount >= config.maxGameMediaVideos) {
      await cleanupUpload();
      throw new HttpError(409, 'MEDIA_LIMIT_REACHED', 'Video limit reached. Delete the existing trailer before uploading.');
    }

    const media = await prisma.gameMedia.create({
      data: {
        id: createId('media'),
        gameId: game.id,
        type: body.type,
        url: mediaUrl,
        alt: body.alt
      }
    });

    return ok(media, 201);
  });

router.add('DELETE', '/developer/games/:gameId/media/:mediaId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');
    await assertDeveloperOwnsGame(user, game);

    const media = await prisma.gameMedia.findFirst({
      where: { id: req.params.mediaId, gameId: game.id }
    });

    if (media) {
      await deleteStorageObjectFromUrl(media.url, getMediaBucket());
      await prisma.gameMedia.delete({
        where: { id: media.id }
      });
    }

    return ok({ deleted: true });
  });

router.add('GET', '/developer/games/:gameId/builds', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    await assertDeveloperOwnsGame(user, game);
    const builds = await prisma.gameBuild.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: 'desc' }
    });
    return ok(builds);
  });

router.add('POST', '/developer/games/:gameId/builds', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const game = await findGame(req.params.gameId);
    await assertDeveloperOwnsGame(user, game);
    const body = validateBody(req.body, {
      version: validators.string({ min: 1, max: 80 }),
      platform: validators.string({ min: 2, max: 80, upper: true }),
      runtime: validators.string({ required: false, min: 2, max: 80, upper: true }),
      entrypoint: validators.string({ required: false, min: 1, max: 255 }),
      changelog: validators.string({ required: false, min: 0, max: 4000, allowBlank: true }),
      checksumSha256: validators.string({ required: false, min: 0, max: 256, allowBlank: true })
    });

    const build = await prisma.gameBuild.create({
      data: {
        id: createId('build'),
        gameId: game.id,
        version: body.version,
        platform: body.platform,
        runtime: body.runtime,
        entrypoint: body.entrypoint,
        changelog: body.changelog,
        checksumSha256: body.checksumSha256 || null,
        status: 'WAITING_FOR_UPLOAD'
      }
    });
    return ok(build, 201);
  });

router.add('GET', '/developer/builds', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile && !user.roles.includes('ADMIN')) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

    const where = user.roles.includes('ADMIN') ? {} : { game: { developerId: profile.id } };
    const builds = await prisma.gameBuild.findMany({
      where,
      include: { game: true },
      orderBy: { createdAt: 'desc' }
    });
    return ok(builds);
  });

router.add('POST', '/developer/builds/:buildId/upload-url', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);
    const body = validateBody(req.body, {
      fileName: validators.fileName(),
      contentType: validators.string({ min: 3, max: 160, pattern: /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i }),
      sizeBytes: validators.bigint({ min: 1n })
    });

    const isWindows = build.platform?.toUpperCase() === 'WINDOWS' || build.runtime?.toUpperCase() === 'WINDOWS';
    if (isWindows) {
      throw new HttpError(400, 'WINDOWS_UPLOAD_RESTRICTED', 'Windows game builds cannot be uploaded through the web portal. To guarantee native DRM encryption and chunked distribution, please use the Creator Workspace inside the LazPlay Desktop Launcher.');
    }

    const isAndroid = build.platform?.toUpperCase() === 'ANDROID' || build.runtime?.toUpperCase() === 'ANDROID';
    if (isAndroid && body.sizeBytes > 5n * 1024n * 1024n * 1024n) {
      throw new HttpError(400, 'BUILD_LIMIT_EXCEEDED', 'Android game builds are strictly limited to 5GB (5,368,709,120 bytes)');
    }

    const isWeb = build.platform?.toUpperCase() === 'WEB' || build.runtime?.toUpperCase() === 'WEB';
    if (isWeb && body.sizeBytes > 500n * 1024n * 1024n) {
      throw new HttpError(400, 'BUILD_LIMIT_EXCEEDED', 'Web game builds are strictly limited to a maximum size of 500MB (524,288,000 bytes)');
    }

    const objectKey = `games/${build.gameId}/builds/${build.id}/${body.fileName}`;
    console.log('[build-upload-url]', { buildId: build.id, gameId: build.gameId, objectKey, sizeBytes: body.sizeBytes.toString() });
    const upload = await signedStorageUrl(objectKey, 'PUT', 3600, getPrivateGameBucket(), { contentType: body.contentType });
    return ok({ uploadUrl: upload.url, objectKey, expiresAt: upload.expiresAt });
  });

router.add('POST', '/developer/builds/:buildId/uploads/complete', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);
    const body = validateBody(req.body, {
      objectKey: validators.objectKey(),
      sizeBytes: validators.bigint({ required: false, min: 1n }),
      checksumSha256: validators.string({ required: false, min: 0, max: 256, allowBlank: true })
    });

    console.log('[build-upload-complete]', { buildId: build.id, gameId: build.gameId, objectKey: body.objectKey, sizeBytes: body.sizeBytes?.toString() });
    const updated = await prisma.gameBuild.update({
      where: { id: build.id },
      data: {
        status: 'PROCESSING',
        artifactObjectKey: body.objectKey,
        sizeBytes: body.sizeBytes,
        checksumSha256: body.checksumSha256 || undefined,
        uploadedAt: new Date()
      }
    });

    return ok(updated);
  });

router.add('POST', '/developer/builds/:buildId/scan', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    console.log('[build-scan-start]', { buildId: build.id, gameId: build.gameId, runtime: build.runtime, platform: build.platform, artifactObjectKey: build.artifactObjectKey });
    const updated = await scanAndPrepareBuild(build, build.game);
    console.log('[build-scan-complete]', { buildId: updated.id, status: updated.status, scanStatus: updated.scanStatus, entrypoint: updated.entrypoint });
    return ok(updated);
  });

router.add('POST', '/developer/builds/:buildId/make-latest', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    if (build.status === 'WAITING_FOR_UPLOAD') {
      throw new HttpError(409, 'BUILD_NOT_UPLOADED', 'Build upload must be completed before making it public');
    }

    if (build.scanStatus && build.scanStatus !== 'PASSED') {
      throw new HttpError(409, 'BUILD_NOT_SCANNED', 'Build must pass scan before making it public');
    }

    const updated = await setLatestBuild(build.gameId, build);
    return ok({ gameId: updated.id, latestBuildId: updated.latestBuildId, version: updated.version });
  });

router.add('POST', '/developer/builds/:buildId/deploy', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId }, include: { game: true } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);
    const body = validateBody(req.body, {
      makeLatest: validators.boolean({ required: false, defaultValue: false })
    });

    const deployment = await prisma.deployment.create({
      data: {
        id: createId('dep'),
        gameId: build.gameId,
        buildId: build.id,
        status: 'QUEUED',
        progress: 0,
        logs: {
          create: { id: createId('deplog'), level: 'INFO', message: 'Deployment triggered via build endpoint' }
        }
      }
    });

    if (body.makeLatest) {
      await setLatestBuild(build.gameId, build);
    }

    return ok(deployment, 201);
  });

router.add('POST', '/developer/games/:gameId/deploy', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const body = validateBody(req.body, {
      buildId: validators.id(),
      makeLatest: validators.boolean({ required: false, defaultValue: false })
    });
    const build = await prisma.gameBuild.findUnique({ where: { id: body.buildId } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build not found');
    const game = await findGame(build.gameId);
    await assertDeveloperOwnsGame(user, game);

    const deployment = await prisma.deployment.create({
      data: {
        id: createId('dep'),
        gameId: game.id,
        buildId: build.id,
        status: 'QUEUED',
        progress: 0,
        logs: {
          create: { id: createId('deplog'), level: 'INFO', message: 'Deployment queued by developer' }
        }
      }
    });

    if (body.makeLatest) {
      await setLatestBuild(game.id, build);
    }

    return ok(deployment, 201);
  });

router.add('GET', '/developer/builds/:buildId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = await findGame(build.gameId);
    await assertDeveloperOwnsGame(user, game);
    return ok(build);
  });

router.add('DELETE', '/developer/builds/:buildId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({ where: { id: req.params.buildId } });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    const game = await findGame(build.gameId);
    await assertDeveloperOwnsGame(user, game);
    if (build.status === 'DEPLOYED') throw new HttpError(409, 'BUILD_DEPLOYED', 'Cannot delete a deployed build');
    const deploymentIds = (await prisma.deployment.findMany({
      where: { buildId: build.id },
      select: { id: true }
    })).map((deployment) => deployment.id);

    if (deploymentIds.length > 0) {
      await prisma.deploymentLog.deleteMany({ where: { deploymentId: { in: deploymentIds } } });
      await prisma.deployment.deleteMany({ where: { id: { in: deploymentIds } } });
    }

    await deleteStorageObject(build.artifactObjectKey, getPrivateGameBucket());

    if (game.latestBuildId === build.id) {
      await prisma.game.update({ where: { id: game.id }, data: { latestBuildId: null, version: null } });
    }
    await prisma.gameBuild.delete({ where: { id: build.id } });
    return ok({ buildId: build.id, deleted: true });
  });

router.add('GET', '/developer/deployments/:deploymentId/logs', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const logs = await prisma.deploymentLog.findMany({
      where: { deploymentId: req.params.deploymentId },
      orderBy: { createdAt: 'asc' }
    });
    return ok(logs, 200, { nextCursor: logs.at(-1)?.id || null });
  });

router.add('GET', '/developer/deployments/:deploymentId', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const deployment = await prisma.deployment.findUnique({
      where: { id: req.params.deploymentId },
      include: { logs: { orderBy: { createdAt: 'asc' } } }
    });
    if (!deployment) throw new HttpError(404, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found');
    const game = await findGame(deployment.gameId);
    await assertDeveloperOwnsGame(user, game);
    return ok(deployment);
  });

router.add('GET', '/developer/deployments', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const profile = await developerForUser(user);
    if (!profile && !user.roles.includes('ADMIN')) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

    const where = user.roles.includes('ADMIN') ? {} : { game: { developerId: profile.id } };
    const deployments = await prisma.deployment.findMany({
      where,
      include: { game: true, build: true },
      orderBy: { createdAt: 'desc' }
    });
    return ok(deployments);
  });

router.add('GET', '/developer/dashboard', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');

    const games = await prisma.game.findMany({ where: { developerId: profile.id } });
    const gameIds = games.map(g => g.id);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [orderStats, instanceCount, currentPlayers, allSessions, gameStatsRaw, recentOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { gameId: { in: gameIds }, status: { in: ['PAID', 'COMPLETED'] } },
        _sum: { amount: true },
        _count: true
      }),
      prisma.gameInstance.count({
        where: { gameId: { in: gameIds } }
      }),
      prisma.gamePlaySession.count({
        where: { gameId: { in: gameIds }, endedAt: null }
      }),
      prisma.gamePlaySession.findMany({
        where: { gameId: { in: gameIds } },
        select: { gameId: true, userId: true }
      }),
      Promise.all(games.map(async (g) => {
        const [gOrders, gCurrent] = await Promise.all([
          prisma.order.aggregate({
            where: { gameId: g.id, status: { in: ['PAID', 'COMPLETED'] } },
            _sum: { amount: true },
            _count: true
          }),
          prisma.gamePlaySession.count({
            where: { gameId: g.id, endedAt: null }
          })
        ]);
        return { g, gOrders, gCurrent };
      })),
      prisma.order.findMany({
        where: { 
          gameId: { in: gameIds }, 
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: fourteenDaysAgo }
        },
        select: { amount: true, createdAt: true }
      })
    ]);

    // Group revenue by day
    const revenueByDay = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      revenueByDay[d.toISOString().split('T')[0]] = 0;
    }

    recentOrders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      if (revenueByDay[date] !== undefined) {
        revenueByDay[date] += o.amount;
      }
    });

    const dailyRevenue = Object.entries(revenueByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate unique players per game and total from the fetched sessions
    const totalPlayers = new Set(allSessions.map(s => s.userId)).size;
    const gameUniquePlayers = {};
    allSessions.forEach(s => {
      if (!gameUniquePlayers[s.gameId]) gameUniquePlayers[s.gameId] = new Set();
      gameUniquePlayers[s.gameId].add(s.userId);
    });

    const gameStats = gameStatsRaw.map(({ g, gOrders, gCurrent }) => ({
      id: g.id,
      title: g.title,
      currentPlayers: gCurrent,
      totalPlayers: gameUniquePlayers[g.id]?.size || 0,
      sales: gOrders._count || 0,
      revenue: gOrders._sum.amount || 0
    }));

    return ok({
      stats: {
        totalGames: games.length,
        totalRevenue: orderStats._sum.amount || 0,
        totalSales: orderStats._count,
        activeInstances: instanceCount,
        currentPlayers,
        totalPlayers,
        dailyRevenue
      },
      games: gameStats
    });
  });

router.add('GET', '/developer/analytics', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER']);
    const profile = await developerForUser(user);
    if (!profile) throw new HttpError(403, 'FORBIDDEN', 'Developer profile not found');

    const stats = await prisma.order.aggregate({
      where: { game: { developerId: profile.id }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true }
    });

    const recentSales = await prisma.order.findMany({
      where: { game: { developerId: profile.id }, status: 'COMPLETED' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { game: true }
    });

    return ok({
      totalRevenue: stats._sum.amount || 0,
      totalSales: stats._count.id || 0,
      recentSales
    });
  });

}
