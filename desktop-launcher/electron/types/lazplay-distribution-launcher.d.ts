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

  export interface DownloadPipelineOptions {
    gameId: string;
    installPath: string;
    chunkDir: string;
    fetchManifest: (gameId: string) => Promise<{ manifest: any; entrypoint?: string }>;
    getDownloadUrls: (gameId: string, hashes: string[]) => Promise<Map<string, string>>;
    downloadChunk: (hash: string, url: string, destPath: string) => Promise<void>;
    onProgress?: (progress: number, downloadedCount: number, totalCount: number) => void;
  }

  export function runDownloadPipeline(
    options: DownloadPipelineOptions
  ): Promise<{ success: boolean; manifest: any; entrypoint: string | null }>;
}
