import { blake3 } from 'hash-wasm';
import fs from 'node:fs';

/**
 * Hash buffer with BLAKE3 (hex digest).
 * @param {Buffer|Uint8Array} data
 * @returns {Promise<string>}
 */
export async function hashBytes(data) {
  return blake3(data);
}

/**
 * Hash a file on disk (streaming for large files).
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function hashFile(filePath) {
  const data = await fs.promises.readFile(filePath);
  return hashBytes(data);
}
