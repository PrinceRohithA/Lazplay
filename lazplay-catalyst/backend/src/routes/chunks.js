import { prisma } from '../prisma.js';
import { validateBody, validators } from '../validation.js';
import {
  checkChunkHashes,
  chunkObjectKey,
  getBuildManifest,
  publishBuildManifest,
  registerChunk
} from '../services/distribution.js';

export function registerChunkRoutes(router, ctx) {
  const {
    HttpError, ok, createId, requireAuth, findGame, assertDeveloperOwnsGame,
    userOwnsGame, getPrivateGameBucket, getPublicGameBucket, isWebRuntime, signedStorageUrl, getBearerToken
  } = ctx;

  router.add('POST', '/developer/builds/:buildId/chunks/check', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({
      where: { id: req.params.buildId },
      include: { game: true }
    });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const body = validateBody(req.body, {
      hashes: validators.stringArray({ minItems: 1, maxItems: 10000, maxLength: 128 })
    });

    const result = await checkChunkHashes(body.hashes);
    return ok(result);
  });

  router.add('POST', '/developer/builds/:buildId/chunks/upload-url', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({
      where: { id: req.params.buildId },
      include: { game: true }
    });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const body = validateBody(req.body, {
      hash: validators.string({ min: 32, max: 128, pattern: /^[a-f0-9]+$/i }),
      sizeBytes: validators.bigint({ min: 1n, max: 52428800n })
    });

    const objectKey = chunkObjectKey(body.hash);
    const isWeb = isWebRuntime(build.runtime || build.platform);
    const bucket = isWeb ? getPublicGameBucket() : getPrivateGameBucket();
    const upload = await signedStorageUrl(
      objectKey,
      'PUT',
      3600,
      bucket,
      { contentType: 'application/octet-stream' }
    );

    return ok({
      uploadUrl: upload.url,
      objectKey,
      hash: body.hash,
      expiresAt: upload.expiresAt
    });
  });

  router.add('POST', '/developer/builds/:buildId/chunks/complete', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({
      where: { id: req.params.buildId },
      include: { game: true }
    });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const body = validateBody(req.body, {
      hash: validators.string({ min: 32, max: 128, pattern: /^[a-f0-9]+$/i }),
      sizeBytes: validators.bigint({ min: 1n })
    });

    const objectKey = chunkObjectKey(body.hash);
    await registerChunk(body.hash, body.sizeBytes, objectKey);
    return ok({ hash: body.hash, objectKey });
  });

  router.add('POST', '/developer/builds/:buildId/manifest', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({
      where: { id: req.params.buildId },
      include: { game: true }
    });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const body = validateBody(req.body, {
      manifest: validators.object({ required: true }),
      version: validators.string({ required: false, min: 1, max: 80 })
    });

    const manifest = body.manifest;
    if (!manifest.chunks || !Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
      throw new HttpError(400, 'INVALID_MANIFEST', 'Manifest must include chunks array');
    }

    const version = body.version || build.version;
    const manifestKey = `manifests/${build.gameId}/${build.id}/v${version.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;

    const record = await publishBuildManifest(build.id, version, manifest, createId);

    await prisma.gameBuild.update({
      where: { id: build.id },
      data: {
        manifestObjectKey: manifestKey,
        entrypoint: manifest.entrypoint || build.entrypoint,
        uploadedAt: new Date(),
        scanStatus: 'PASSED',
        status: 'READY'
      }
    });

    return ok({
      manifest: record,
      manifestObjectKey: manifestKey,
      chunkCount: record.chunkCount,
      totalBytes: Number(record.totalBytes)
    });
  });

  router.add('GET', '/developer/builds/:buildId/manifest', async (req) => {
    const user = await requireAuth(req, null, ['DEVELOPER', 'ADMIN']);
    const build = await prisma.gameBuild.findUnique({
      where: { id: req.params.buildId },
      include: { game: true }
    });
    if (!build) throw new HttpError(404, 'BUILD_NOT_FOUND', 'Build was not found');
    await assertDeveloperOwnsGame(user, build.game);

    const record = await getBuildManifest(build.id);
    if (!record) throw new HttpError(404, 'MANIFEST_NOT_FOUND', 'No manifest for this build');
    return ok(record);
  });

  router.add('GET', '/games/:gameId/distribution-manifest', async (req) => {
    const token = getBearerToken(req);
    const user = token ? await requireAuth(req) : null;
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');

    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    const owned = await userOwnsGame(user.id, game.id);
    const isFree = String(game.priceType || '').toUpperCase() === 'FREE';
    if (!owned && !isFree) {
      throw new HttpError(403, 'NOT_OWNED', 'You must own this game to download it');
    }

    const build = game.latestBuildId
      ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } })
      : null;

    if (!build || build.distributionType !== 'CHUNKED') {
      throw new HttpError(404, 'CHUNK_MANIFEST_NOT_AVAILABLE', 'This game uses legacy ZIP distribution');
    }

    const record = await getBuildManifest(build.id);
    if (!record) throw new HttpError(404, 'MANIFEST_NOT_FOUND', 'Manifest not found');

    return ok({
      gameId: game.id,
      buildId: build.id,
      version: record.version,
      entrypoint: build.entrypoint,
      platform: build.platform,
      manifest: record.manifest,
      chunkCount: record.chunkCount,
      totalBytes: Number(record.totalBytes)
    });
  });

  router.add('POST', '/games/:gameId/chunks/download-urls', async (req) => {
    const user = await requireAuth(req);
    const game = await findGame(req.params.gameId);
    if (!game) throw new HttpError(404, 'GAME_NOT_FOUND', 'Game not found');

    const owned = await userOwnsGame(user.id, game.id);
    const isFree = String(game.priceType || '').toUpperCase() === 'FREE';
    if (!owned && !isFree) {
      throw new HttpError(403, 'NOT_OWNED', 'You must own this game to download chunks');
    }

    const body = validateBody(req.body, {
      hashes: validators.stringArray({ minItems: 1, maxItems: 500, maxLength: 128 })
    });

    const build = game.latestBuildId
      ? await prisma.gameBuild.findUnique({ where: { id: game.latestBuildId } })
      : null;

    if (!build || build.distributionType !== 'CHUNKED') {
      throw new HttpError(404, 'CHUNK_DISTRIBUTION_NOT_AVAILABLE', 'Chunk distribution not available');
    }

    const buildChunks = await prisma.buildChunk.findMany({
      where: { buildId: build.id, hash: { in: body.hashes } },
      include: { chunk: true }
    });

    const allowedHashes = new Set(buildChunks.map((bc) => bc.hash));
    const urls = [];

    for (const hash of body.hashes) {
      if (!allowedHashes.has(hash)) {
        throw new HttpError(403, 'CHUNK_NOT_IN_BUILD', `Chunk ${hash} is not part of this build`);
      }
      const chunk = buildChunks.find((bc) => bc.hash === hash)?.chunk;
      const objectKey = chunk?.objectKey || chunkObjectKey(hash);
      const isWeb = isWebRuntime(build.runtime || build.platform);
      const bucket = isWeb ? getPublicGameBucket() : getPrivateGameBucket();
      const signed = await signedStorageUrl(objectKey, 'GET', 3600, bucket);
      urls.push({ hash, url: signed.url, expiresAt: signed.expiresAt, size: chunk ? Number(chunk.sizeBytes) : null });
    }

    return ok({ urls });
  });
}
