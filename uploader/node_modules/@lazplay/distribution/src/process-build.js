import { scanBuildDirectory, groupIntoBundles } from './scan.js';
import { processBundle } from './bundle.js';
import { buildManifest, collectUniqueChunks } from './manifest.js';

/**
 * Full client-side pipeline: scan → bundle → compress → chunk → hash → manifest.
 * Compression and chunking run on the uploader machine (not the server).
 *
 * @param {string} buildDir
 * @param {object} options
 * @param {string} options.version
 * @param {string} [options.entrypoint]
 * @param {string} [options.platform]
 * @returns {Promise<{ manifest: object, chunks: Map<string, { hash: string, size: number, data: Buffer }>, scan: object }>}
 */
export async function processBuildDirectory(buildDir, { version, entrypoint, platform }) {
  const scan = await scanBuildDirectory(buildDir);
  const bundleGroups = groupIntoBundles(scan.files);

  const processedBundles = [];
  for (const [name, files] of Object.entries(bundleGroups)) {
    const bundle = await processBundle(name, files);
    processedBundles.push(bundle);
  }

  const manifest = buildManifest({
    version,
    entrypoint,
    platform,
    bundles: processedBundles
  });

  const chunks = collectUniqueChunks(processedBundles);

  return { manifest, chunks, scan, bundles: processedBundles };
}
