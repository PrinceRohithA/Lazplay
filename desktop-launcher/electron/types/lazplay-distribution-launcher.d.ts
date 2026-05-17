declare module "@lazplay/distribution/launcher" {
  export function decompress(input: Buffer | Uint8Array): Buffer;

  export function getMissingChunks(
    manifest: { chunks: Array<{ hash: string; size: number }> },
    chunkCacheDir: string,
  ): Promise<Array<{ hash: string; size: number }>>;

  export function reassembleFromManifest(
    manifest: { bundles: Array<{ chunks: string[] }> },
    chunkCacheDir: string,
    installDir: string,
  ): Promise<void>;

  export function verifyChunkFile(
    chunkPath: string,
    expectedHash: string,
  ): Promise<boolean>;
}
