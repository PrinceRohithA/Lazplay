import fs from 'node:fs';
import path from 'node:path';
import { CHUNK_SIZE_BYTES } from './constants.js';
import { hashBytes } from './hash.js';

/**
 * Split compressed data into fixed-size chunks and hash each.
 * @param {Buffer} data
 * @param {number} [chunkSize]
 * @returns {Promise<Array<{ hash: string, size: number, data: Buffer, index: number }>>}
 */
export async function chunkBuffer(data, chunkSize = CHUNK_SIZE_BYTES) {
  const chunks = [];
  let offset = 0;
  let index = 0;

  while (offset < data.length) {
    const slice = data.subarray(offset, offset + chunkSize);
    const hash = await hashBytes(slice);
    chunks.push({ hash, size: slice.length, data: Buffer.from(slice), index });
    offset += chunkSize;
    index += 1;
  }

  return chunks;
}

/**
 * Write chunks to a directory (for caching).
 * @param {Array<{ hash: string, data: Buffer }>} chunks
 * @param {string} dir
 */
export async function writeChunksToDir(chunks, dir) {
  await fs.promises.mkdir(dir, { recursive: true });
  for (const chunk of chunks) {
    const filePath = path.join(dir, chunk.hash);
    await fs.promises.writeFile(filePath, chunk.data);
  }
}

/**
 * Read and concatenate chunks in order.
 * @param {string[]} hashesInOrder
 * @param {string} chunkDir
 * @returns {Promise<Buffer>}
 */
export async function readChunksFromDir(hashesInOrder, chunkDir) {
  const parts = [];
  for (const hash of hashesInOrder) {
    const filePath = path.join(chunkDir, hash);
    parts.push(await fs.promises.readFile(filePath));
  }
  return Buffer.concat(parts);
}
