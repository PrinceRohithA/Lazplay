/**
 * Node-only zstd compression (native addon). Used by the uploader CLI only —
 * do not import from launcher/Electron code paths.
 */
import { compress as zstdCompress } from '@mongodb-js/zstd';

/**
 * @param {Buffer} input
 * @param {number} [level]
 * @returns {Promise<Buffer>}
 */
export async function compress(input, level = 3) {
  const compressed = await zstdCompress(input, level);
  return Buffer.from(compressed);
}
