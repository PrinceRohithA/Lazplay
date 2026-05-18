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

  // Change Verification Check: Fetch previous builds and compare chunk manifests
  try {
    onProgress?.(33, 'COMPARING_WITH_PREVIOUS_BUILDS');
    const buildsList = await requestApi('GET', `/developer/games/${gameId}/builds`);
    if (Array.isArray(buildsList)) {
      const prevBuild = buildsList
        .filter(b => b.platform === platform && b.status !== 'WAITING_FOR_UPLOAD' && b.id !== buildId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (prevBuild) {
        const prevManifestRecord = await requestApi('GET', `/developer/builds/${prevBuild.id}/manifest`).catch(() => null);
        if (prevManifestRecord && prevManifestRecord.manifest) {
          const prevManifest = prevManifestRecord.manifest;
          const prevHashes = new Set(prevManifest.chunkHashes || prevManifest.chunks.map(c => c.hash));
          const newHashes = new Set(hashList);

          let identical = prevHashes.size === newHashes.size;
          if (identical) {
            for (const h of newHashes) {
              if (!prevHashes.has(h)) {
                identical = false;
                break;
              }
            }
          }

          if (identical) {
            throw new Error('NO_CHANGES_FOUND: The local build is identical to the previous build. No changes detected.');
          }
        }
      }
    }
  } catch (err) {
    if (err.message.includes('NO_CHANGES_FOUND')) {
      throw err;
    }
    // If it is another error (like no manifest or 404), we gracefully ignore and proceed with uploading
  }

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
