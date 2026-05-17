import { compress as zstdCompress } from '@mongodb-js/zstd';
import * as fzstd from 'fzstd';

/**
 * Compress with zstd (level 3 default per arch doc).
 * @param {Buffer} input
 * @param {number} [level]
 * @returns {Promise<Buffer>}
 */
export async function compress(input, level = 3) {
  const compressed = await zstdCompress(input, level);
  return Buffer.from(compressed);
}

/**
 * Decompress zstd data (pure JS for launcher portability).
 * @param {Buffer|Uint8Array} input
 * @returns {Buffer}
 */
export function decompress(input) {
  const out = fzstd.decompress(input instanceof Buffer ? new Uint8Array(input) : input);
  return Buffer.from(out);
}
