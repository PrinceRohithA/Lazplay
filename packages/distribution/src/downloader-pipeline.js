import fs from 'node:fs';
import path from 'node:path';
import { getMissingChunks, reassembleFromManifest, verifyChunkFile } from './reassemble.js';

/**
 * High-level Player Download, Delta Download & Repair Pipeline Orchestrator.
 * Matches the LazPlay Player Download & Update Architecture perfectly.
 * Fetches the manifest, checks local cache for already downloaded/valid chunks (Delta Patching),
 * downloads only missing chunks, verifies hashes, and decompresses/reassembles files to target install dir.
 *
 * @param {object} params
 * @param {string} params.gameId
 * @param {string} params.installPath
 * @param {string} params.chunkDir
 * @param {function} params.fetchManifest - Async callback (gameId) => Promise<{ manifest: any, entrypoint?: string }>
 * @param {function} params.getDownloadUrls - Async callback (gameId, hashes) => Promise<Map<string, string>>
 * @param {function} params.downloadChunk - Async callback (hash, downloadUrl, destPath) => Promise<void>
 * @param {function} [params.onProgress] - Optional progress listener (progress, downloadedCount, totalCount) => void
 * @returns {Promise<{ success: boolean, manifest: any, entrypoint: string | null }>}
 */
export async function runDownloadPipeline({
  gameId,
  installPath,
  chunkDir,
  fetchManifest,
  getDownloadUrls,
  downloadChunk,
  onProgress
}) {
  // Step 1: Request Install/Update (Fetch Manifest)
  const { manifest, entrypoint: manifestEntrypoint } = await fetchManifest(gameId);

  // Ensure chunk cache directory exists
  await fs.promises.mkdir(chunkDir, { recursive: true });

  // Step 2: Local Cache Check (Delta Download / Cache check logic)
  const missingChunks = await getMissingChunks(manifest, chunkDir);
  const total = missingChunks.length;
  let done = 0;

  // Step 3: Download only missing chunks
  if (total > 0) {
    const hashes = missingChunks.map((c) => c.hash);
    const urlMap = await getDownloadUrls(gameId, hashes);

    for (const { hash } of missingChunks) {
      const url = urlMap.get(hash);
      if (!url) throw new Error(`No download URL generated for chunk ${hash}`);

      const destPath = path.join(chunkDir, hash);
      
      // Stream missing chunk
      await downloadChunk(hash, url, destPath);

      // Step 4: Verify chunk integrity (BLAKE3 checksum validation)
      await verifyChunkFile(destPath, hash);

      done += 1;
      onProgress?.((done / total) * 90, done, total);
    }
  }

  // Ensure install directory exists
  if (!fs.existsSync(installPath)) {
    fs.mkdirSync(installPath, { recursive: true });
  }

  // Step 5 & 6: Decompress & Reassemble bundles into target installation folder
  await reassembleFromManifest(manifest, chunkDir, installPath);
  
  onProgress?.(100, total, total);

  const entrypoint = manifest.entrypoint || manifestEntrypoint || null;
  return {
    success: true,
    manifest,
    entrypoint
  };
}
