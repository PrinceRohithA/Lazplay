import { prisma } from '../prisma.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const CHUNK_KEY_PREFIX = 'chunks/';

// Initialize self-contained S3/R2 client for garbage collection side-effects
const r2 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
    : undefined,
  forcePathStyle: true,
  requestChecksumCalculation: 'NEVER',
  responseChecksumValidation: 'NEVER'
});

const PRIVATE_GAME_BUCKET = process.env.R2_PRIVATE_GAME_BUCKET || process.env.R2_GAME_BUCKET || process.env.R2_BUCKET;

export function chunkObjectKey(hash) {
  return `${CHUNK_KEY_PREFIX}${hash}`;
}

/**
 * Check which chunk hashes already exist in storage.
 * @param {string[]} hashes
 * @returns {Promise<{ existing: string[], missing: string[] }>}
 */
export async function checkChunkHashes(hashes) {
  const unique = [...new Set(hashes)];
  if (unique.length === 0) return { existing: [], missing: [] };

  const found = await prisma.contentChunk.findMany({
    where: { hash: { in: unique } },
    select: { hash: true }
  });
  const existingSet = new Set(found.map((c) => c.hash));
  const existing = unique.filter((h) => existingSet.has(h));
  const missing = unique.filter((h) => !existingSet.has(h));
  return { existing, missing };
}

/**
 * Register a chunk after successful upload.
 */
export async function registerChunk(hash, sizeBytes, objectKey) {
  return prisma.contentChunk.upsert({
    where: { hash },
    create: { hash, sizeBytes, objectKey, refCount: 0 },
    update: { sizeBytes }
  });
}

/**
 * Keeps only the latest 3 READY versions of a Windows game and garbage collects orphaned chunks.
 * @param {string} gameId
 */
export async function cleanupOldWindowsBuildsAndChunks(gameId) {
  // 1. Fetch all READY builds of platform WINDOWS for this game, ordered by createdAt desc
  const builds = await prisma.gameBuild.findMany({
    where: {
      gameId,
      platform: 'WINDOWS',
      status: 'READY'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // If we have 3 or fewer READY versions, there's nothing to clean up!
  if (builds.length <= 3) {
    return;
  }

  // Keep the 3 latest READY versions
  const keepIds = builds.slice(0, 3).map(b => b.id);
  const toDelete = builds.slice(3);

  console.log(`[retention] Windows game ${gameId} has ${builds.length} READY versions. Keeping: ${keepIds.join(', ')}. Deleting: ${toDelete.map(b => b.id).join(', ')}`);

  // We delete the old builds one by one to ensure proper CASCADE delete of BuildManifest and BuildChunk records
  for (const build of toDelete) {
    // Delete manifest file in storage if present
    if (build.manifestObjectKey) {
      await r2.send(new DeleteObjectCommand({
        Bucket: PRIVATE_GAME_BUCKET,
        Key: build.manifestObjectKey
      })).catch((err) => {
        console.error(`[retention-cleanup-error] Failed to delete manifest ${build.manifestObjectKey} from bucket ${PRIVATE_GAME_BUCKET}:`, err.message);
      });
    }

    // Delete artifact ZIP if present
    if (build.artifactObjectKey) {
      await r2.send(new DeleteObjectCommand({
        Bucket: PRIVATE_GAME_BUCKET,
        Key: build.artifactObjectKey
      })).catch((err) => {
        console.error(`[retention-cleanup-error] Failed to delete ZIP artifact ${build.artifactObjectKey} from bucket ${PRIVATE_GAME_BUCKET}:`, err.message);
      });
    }

    // Delete from DB (cascade deletes BuildChunk and BuildManifest rows)
    await prisma.gameBuild.delete({
      where: { id: build.id }
    });
  }

  // 2. Identify and garbage collect orphaned ContentChunk records
  // An orphaned chunk is a ContentChunk that has NO rows in BuildChunk table
  const orphanedChunks = await prisma.contentChunk.findMany({
    where: {
      buildChunks: {
        none: {}
      }
    }
  });

  if (orphanedChunks.length > 0) {
    console.log(`[retention-gc] Found ${orphanedChunks.length} orphaned chunks to clean up.`);
    
    // Delete files from Cloudflare R2
    for (const chunk of orphanedChunks) {
      await r2.send(new DeleteObjectCommand({
        Bucket: PRIVATE_GAME_BUCKET,
        Key: chunk.objectKey
      })).catch((err) => {
        console.error(`[retention-gc-error] Failed to delete chunk ${chunk.objectKey} from bucket ${PRIVATE_GAME_BUCKET}:`, err.message);
      });
    }

    // Delete records from database
    await prisma.contentChunk.deleteMany({
      where: {
        hash: {
          in: orphanedChunks.map(c => c.hash)
        }
      }
    });
    console.log(`[retention-gc] Successfully garbage collected ${orphanedChunks.length} orphaned chunks.`);
  }
}

/**
 * Link chunks to a build and store manifest.
 */
export async function publishBuildManifest(buildId, version, manifest, createId) {
  const chunkHashes = manifest.chunkHashes || [...new Set(manifest.chunks.map((c) => c.hash))];
  const totalBytes = manifest.chunks.reduce((sum, c) => sum + (c.size || 0), 0);

  const build = await prisma.gameBuild.findUnique({ where: { id: buildId } });

  await prisma.$transaction(async (tx) => {
    await tx.buildChunk.deleteMany({ where: { buildId } });

    for (const hash of chunkHashes) {
      const size = manifest.chunks.find((c) => c.hash === hash)?.size || 0;
      await tx.contentChunk.upsert({
        where: { hash },
        create: {
          hash,
          sizeBytes: size,
          objectKey: chunkObjectKey(hash),
          refCount: 1
        },
        update: { refCount: { increment: 1 } }
      });

      await tx.buildChunk.create({
        data: { buildId, hash }
      });
    }

    await tx.buildManifest.upsert({
      where: { buildId },
      create: {
        id: createId('manifest'),
        buildId,
        version,
        manifest,
        chunkCount: chunkHashes.length,
        totalBytes
      },
      update: {
        version,
        manifest,
        chunkCount: chunkHashes.length,
        totalBytes
      }
    });

    await tx.gameBuild.update({
      where: { id: buildId },
      data: {
        distributionType: 'CHUNKED',
        status: 'READY',
        sizeBytes: BigInt(totalBytes)
      }
    });
  });

  // If build is for Windows, trigger garbage collection of old versions and chunks
  if (build && build.platform === 'WINDOWS') {
    await cleanupOldWindowsBuildsAndChunks(build.gameId).catch((err) => {
      console.error('[retention-error] Failed to clean up old builds and chunks:', err);
    });
  }

  return prisma.buildManifest.findUnique({ where: { buildId } });
}

export async function getBuildManifest(buildId) {
  return prisma.buildManifest.findUnique({ where: { buildId } });
}

export async function getChunksForBuild(buildId) {
  const links = await prisma.buildChunk.findMany({
    where: { buildId },
    include: { chunk: true }
  });
  return links.map((l) => l.chunk);
}
