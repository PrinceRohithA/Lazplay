import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { decompress } from './compress.js';
import { readChunksFromDir } from './chunk.js';
import { hashBytes } from './hash.js';

/**
 * Verify a chunk file matches its BLAKE3 hash.
 * @param {string} chunkPath
 * @param {string} expectedHash
 */
export async function verifyChunkFile(chunkPath, expectedHash) {
  const data = await fs.promises.readFile(chunkPath);
  const actual = await hashBytes(data);
  if (actual !== expectedHash) {
    throw new Error(`Chunk hash mismatch: expected ${expectedHash}, got ${actual}`);
  }
  return true;
}

/**
 * Reassemble bundles from cached chunks into install directory.
 * @param {object} manifest
 * @param {string} chunkCacheDir
 * @param {string} installDir
 */
export async function reassembleFromManifest(manifest, chunkCacheDir, installDir) {
  await fs.promises.mkdir(installDir, { recursive: true });

  for (const bundle of manifest.bundles) {
    const chunkHashes = bundle.chunks;
    const compressed = await readChunksFromDir(chunkHashes, chunkCacheDir);
    const zipBuffer = decompress(compressed);

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(installDir, true);
  }
}

/**
 * List chunk hashes required by manifest that are missing from cache.
 * @param {object} manifest
 * @param {string} chunkCacheDir
 * @returns {Promise<Array<{ hash: string, size: number }>>}
 */
export async function getMissingChunks(manifest, chunkCacheDir) {
  const missing = [];
  const seen = new Set();

  for (const chunk of manifest.chunks) {
    if (seen.has(chunk.hash)) continue;
    seen.add(chunk.hash);

    const chunkPath = path.join(chunkCacheDir, chunk.hash);
    if (!fs.existsSync(chunkPath)) {
      missing.push({ hash: chunk.hash, size: chunk.size });
      continue;
    }

    try {
      await verifyChunkFile(chunkPath, chunk.hash);
    } catch {
      missing.push({ hash: chunk.hash, size: chunk.size });
    }
  }

  return missing;
}
