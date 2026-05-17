import { processBuildDirectory } from './process-build.js';

/**
 * High-level Client-side Upload & Delta Upload Pipeline Orchestrator.
 * Matches the LazPlay Uploader Architecture perfectly.
 * Performs scans, bundles, compresses, chunks, and hashes client-side.
 * Then performs delta deduplication and uploads only missing chunks before publishing the manifest.
 *
 * @param {object} params
 * @param {string} params.gameId
 * @param {string} params.buildId
 * @param {string} params.folderPath
 * @param {string} params.platform
 * @param {string} params.version
 * @param {string} [params.entrypoint]
 * @param {function} params.requestApi - Async callback (method, endpoint, body) => Promise<any>
 * @param {function} params.uploadChunkToUrl - Async callback (uploadUrl, chunkBuffer) => Promise<void>
 * @param {function} [params.onProgress] - Optional progress listener (progress, statusText) => void
 * @returns {Promise<{ success: boolean, manifestObjectKey: string, chunkCount: number, totalBytes: number }>}
 */
export async function runUploadPipeline({
  gameId,
  buildId,
  folderPath,
  platform,
  version,
  entrypoint,
  requestApi,
  uploadChunkToUrl,
  onProgress
}) {
  onProgress?.(10, 'SCANNING_AND_COMPRESSING');

  // Step 1 - 5: Scan -> Bundle -> Compress -> Chunk -> Hash
  const { manifest, chunks } = await processBuildDirectory(folderPath, {
    version,
    entrypoint,
    platform
  });

  onProgress?.(30, 'HASHING_AND_CHECKING_CHUNKS');

  const hashList = manifest.chunkHashes;

  // Step 6: Chunk Comparison (Deduplication / Delta Upload logic)
  const { existing, missing } = await requestApi('POST', `/developer/builds/${buildId}/chunks/check`, {
    hashes: hashList
  });

  let uploadedCount = 0;
  if (missing.length === 0) {
    onProgress?.(90, 'ALL_CHUNKS_EXIST_ON_SERVER');
  }

  // Step 7: Upload only missing chunks to Cloudflare R2
  for (const hash of missing) {
    const chunk = chunks.get(hash);
    if (!chunk) throw new Error(`Chunk data missing for hash ${hash}`);

    // Request signed upload URL
    const { uploadUrl } = await requestApi('POST', `/developer/builds/${buildId}/chunks/upload-url`, {
      hash,
      sizeBytes: String(chunk.size)
    });

    // PUT chunk binary payload
    await uploadChunkToUrl(uploadUrl, chunk.data);

    // Complete chunk registration
    await requestApi('POST', `/developer/builds/${buildId}/chunks/complete`, {
      hash,
      sizeBytes: String(chunk.size)
    });

    uploadedCount++;
    const progress = 40 + Math.round((uploadedCount / missing.length) * 50);
    onProgress?.(progress, `STREAMING_CHUNKS (${uploadedCount}/${missing.length})`);
  }

  onProgress?.(95, 'PUBLISHING_MANIFEST');

  // Step 8: Publish Manifest
  const result = await requestApi('POST', `/developer/builds/${buildId}/manifest`, {
    manifest,
    version
  });

  onProgress?.(100, 'DONE');

  return {
    success: true,
    manifestObjectKey: result.manifestObjectKey,
    chunkCount: result.chunkCount,
    totalBytes: result.totalBytes
  };
}
