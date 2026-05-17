import { prisma } from '../prisma.js';

const CHUNK_KEY_PREFIX = 'chunks/';

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
 * Link chunks to a build and store manifest.
 */
export async function publishBuildManifest(buildId, version, manifest, createId) {
  const chunkHashes = manifest.chunkHashes || [...new Set(manifest.chunks.map((c) => c.hash))];
  const totalBytes = manifest.chunks.reduce((sum, c) => sum + (c.size || 0), 0);

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
