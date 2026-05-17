export function decompress(input: Buffer | Uint8Array): Buffer;

export function hashBytes(data: Buffer | Uint8Array): Promise<string>;
export function hashFile(filePath: string): Promise<string>;

export function readChunksFromDir(
  hashesInOrder: string[],
  chunkDir: string,
): Promise<Buffer>;

export function verifyChunkFile(
  chunkPath: string,
  expectedHash: string,
): Promise<boolean>;

export function getMissingChunks(
  manifest: { chunks: Array<{ hash: string; size: number }> },
  chunkCacheDir: string,
): Promise<Array<{ hash: string; size: number }>>;

export function reassembleFromManifest(
  manifest: { bundles: Array<{ chunks: string[] }> },
  chunkCacheDir: string,
  installDir: string,
): Promise<void>;

export const CHUNK_SIZE_BYTES: number;
export const MAX_GAME_SIZE_BYTES: number;
