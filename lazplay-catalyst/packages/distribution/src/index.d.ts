export * from './launcher';

export interface UploadPipelineOptions {
  gameId: string;
  buildId: string;
  folderPath: string;
  platform: string;
  version: string;
  entrypoint?: string | null;
  requestApi: (method: string, endpoint: string, body?: any) => Promise<any>;
  uploadChunkToUrl: (uploadUrl: string, chunkBuffer: Buffer) => Promise<void>;
  onProgress?: (progress: number, statusText: string) => void;
}

export function runUploadPipeline(
  options: UploadPipelineOptions
): Promise<{ success: boolean; manifestObjectKey: string; chunkCount: number; totalBytes: number }>;
