import * as fzstd from 'fzstd';

/**
 * Decompress zstd data (pure JS — safe for Electron/Vite bundles).
 * @param {Buffer|Uint8Array} input
 * @returns {Buffer}
 */
export function decompress(input) {
  const bytes = input instanceof Buffer ? new Uint8Array(input) : input;
  const out = fzstd.decompress(bytes);
  return Buffer.from(out);
}
