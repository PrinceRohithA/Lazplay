import AdmZip from 'adm-zip';
import { compress } from './compress-native.js';
import { chunkBuffer } from './chunk.js';
import { ZSTD_LEVEL } from './constants.js';

/**
 * Create a ZIP bundle from files, compress with zstd, and chunk.
 * @param {string} bundleName
 * @param {Array<{ relativePath: string, absolutePath: string }>} files
 * @returns {Promise<{ name: string, files: string[], chunks: Array<{ hash: string, size: number, index: number }> }>}
 */
export async function processBundle(bundleName, files) {
  if (files.length === 0) {
    return { name: bundleName, files: [], chunks: [] };
  }

  const zip = new AdmZip();
  for (const file of files) {
    zip.addLocalFile(file.absolutePath, '', file.relativePath);
  }

  const zipBuffer = zip.toBuffer();
  const compressed = await compress(zipBuffer, ZSTD_LEVEL);
  const chunks = await chunkBuffer(compressed);

  return {
    name: bundleName,
    files: files.map((f) => f.relativePath),
    chunks: chunks.map((c) => ({ hash: c.hash, size: c.size, index: c.index, data: c.data }))
  };
}
