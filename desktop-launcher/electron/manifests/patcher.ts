import log from "electron-log";
import { getMissingChunks, verifyChunkFile } from "@lazplay/distribution/launcher";
import { getChunksCacheDir, loadManifest } from "../downloads/chunk-cache";
import { chunkDownloader } from "../downloads/chunk-downloader";
import { db } from "../storage/db";

/**
 * Chunk-based repair: verify cached chunks against manifest hashes,
 * re-download corrupted/missing chunks only, then reassemble.
 */
export class PatchManager {
  async repairGame(gameId: string, token: string): Promise<void> {
    const game = db.getGame(gameId);
    if (!game?.installPath) {
      throw new Error("Game is not installed");
    }

    const manifest = loadManifest(gameId);
    if (!manifest) {
      log.info(`No local manifest for ${gameId}, fetching from server`);
      await chunkDownloader.repair(gameId, token, game.installPath);
      return;
    }

    const missing = await getMissingChunks(
      manifest as { chunks: Array<{ hash: string; size: number }> },
      getChunksCacheDir(),
    );
    if (missing.length === 0) {
      log.info(`All chunks valid for ${gameId}`);
      return;
    }

    log.info(`Repairing ${missing.length} chunks for ${gameId}`);
    await chunkDownloader.repair(gameId, token, game.installPath);
  }

  async verifyChunk(hash: string): Promise<boolean> {
    const filePath = `${getChunksCacheDir()}/${hash}`;
    try {
      await verifyChunkFile(filePath, hash);
      return true;
    } catch {
      return false;
    }
  }
}

export const patcher = new PatchManager();
