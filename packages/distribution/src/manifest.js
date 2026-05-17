import { COMPRESSION, CHUNK_SIZE_BYTES, HASH_ALGORITHM, ZSTD_LEVEL } from './constants.js';

/**
 * Build a distribution manifest from processed bundles.
 * @param {object} options
 * @param {string} options.version
 * @param {string} [options.entrypoint]
 * @param {string} [options.platform]
 * @param {Array<{ name: string, files: string[], chunks: Array<{ hash: string, size: number, index: number }> }>} options.bundles
 * @returns {object}
 */
export function buildManifest({ version, entrypoint, platform, bundles }) {
  const allChunks = [];
  const bundleEntries = [];

  for (const bundle of bundles) {
    const chunkHashes = bundle.chunks.map((c) => c.hash);
    bundleEntries.push({
      name: bundle.name,
      files: bundle.files,
      chunks: chunkHashes
    });

    for (const chunk of bundle.chunks) {
      allChunks.push({
        hash: chunk.hash,
        size: chunk.size,
        bundle: bundle.name,
        index: chunk.index
      });
    }
  }

  const uniqueHashes = [...new Set(allChunks.map((c) => c.hash))];

  return {
    version,
    entrypoint: entrypoint || null,
    platform: platform || null,
    compression: COMPRESSION,
    compressionLevel: ZSTD_LEVEL,
    hashAlgorithm: HASH_ALGORITHM,
    chunkSize: CHUNK_SIZE_BYTES,
    bundles: bundleEntries,
    chunks: allChunks,
    chunkHashes: uniqueHashes,
    createdAt: new Date().toISOString()
  };
}

/**
 * Collect all chunk payloads from processed bundles (for upload).
 * @param {Array<{ chunks: Array<{ hash: string, data: Buffer }> }>} bundles
 * @returns {Map<string, { hash: string, size: number, data: Buffer }>}
 */
export function collectUniqueChunks(bundles) {
  const map = new Map();
  for (const bundle of bundles) {
    for (const chunk of bundle.chunks) {
      if (!map.has(chunk.hash)) {
        map.set(chunk.hash, { hash: chunk.hash, size: chunk.size, data: chunk.data });
      }
    }
  }
  return map;
}
