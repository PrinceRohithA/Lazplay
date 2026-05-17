import fs from "fs";
import axios from "axios";
import log from "electron-log";
import {
  getMissingChunks,
  reassembleFromManifest,
  verifyChunkFile,
} from "@lazplay/distribution/launcher";
import {
  chunkPath,
  ensureCacheDirs,
  getChunksCacheDir,
  saveManifest,
} from "./chunk-cache";

const API_BASE = process.env.LAZPLAY_API_URL || "https://play.lazplay.tech/api/v1";

export interface ChunkInstallOptions {
  gameId: string;
  title: string;
  token: string;
  entrypoint?: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  onProgress?: (progress: number, downloaded: number, total: number) => void;
}

export class ChunkDownloader {
  async fetchManifest(gameId: string, token: string): Promise<{ manifest: any; entrypoint?: string }> {
    const res = await axios.get(`${API_BASE}/games/${gameId}/distribution-manifest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data?.data ?? res.data;
    return { manifest: data.manifest, entrypoint: data.entrypoint };
  }

  async getDownloadUrls(
    gameId: string,
    token: string,
    hashes: string[],
  ): Promise<Map<string, string>> {
    const res = await axios.post(
      `${API_BASE}/games/${gameId}/chunks/download-urls`,
      { hashes },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const urls = res.data?.data?.urls ?? res.data?.urls ?? [];
    const map = new Map<string, string>();
    for (const item of urls) {
      map.set(item.hash, item.url);
    }
    return map;
  }

  async downloadChunk(hash: string, url: string): Promise<void> {
    ensureCacheDirs();
    const dest = chunkPath(hash);
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", () => resolve());
      writer.on("error", reject);
    });

    await verifyChunkFile(dest, hash);
  }

  async installFromChunks(
    options: ChunkInstallOptions,
    installPath: string,
  ): Promise<{ entrypoint: string | null }> {
    const { manifest, entrypoint: manifestEntrypoint } = await this.fetchManifest(
      options.gameId,
      options.token,
    );
    saveManifest(options.gameId, manifest);

    const chunkDir = getChunksCacheDir();
    const missingChunks = await getMissingChunks(manifest, chunkDir);
    const total = missingChunks.length;
    let done = 0;

    if (total > 0) {
      const hashes = missingChunks.map((c: { hash: string }) => c.hash);
      const urlMap = await this.getDownloadUrls(options.gameId, options.token, hashes);

      for (const { hash } of missingChunks) {
        const url = urlMap.get(hash);
        if (!url) throw new Error(`No download URL for chunk ${hash}`);
        await this.downloadChunk(hash, url);
        done += 1;
        options.onProgress?.((done / total) * 90, done, total);
      }
    }

    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    await reassembleFromManifest(manifest, chunkDir, installPath);
    options.onProgress?.(100, total, total);

    const entrypoint = manifestEntrypoint || manifest.entrypoint || options.entrypoint || null;
    log.info(`Chunk install complete for ${options.gameId}`);
    return { entrypoint };
  }

  /** Verify local install and re-download corrupted chunks only (repair). */
  async repair(gameId: string, token: string, installPath: string): Promise<void> {
    const { manifest } = await this.fetchManifest(gameId, token);
    const missing = await getMissingChunks(manifest, getChunksCacheDir());
    if (missing.length === 0) {
      log.info(`Repair: all chunks valid for ${gameId}`);
      return;
    }

    const urlMap = await this.getDownloadUrls(
      gameId,
      token,
      missing.map((c: { hash: string }) => c.hash),
    );
    for (const { hash } of missing) {
      const url = urlMap.get(hash);
      if (url) await this.downloadChunk(hash, url);
    }

    await reassembleFromManifest(manifest, getChunksCacheDir(), installPath);
  }
}

export const chunkDownloader = new ChunkDownloader();
