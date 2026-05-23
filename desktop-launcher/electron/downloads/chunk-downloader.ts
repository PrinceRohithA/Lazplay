import fs from "fs";
import axios from "axios";
import log from "electron-log";
import {
  runDownloadPipeline,
} from "@lazplay/distribution/launcher";
import {
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
  signal?: AbortSignal;
}

export class ChunkDownloader {
  async fetchManifest(gameId: string, token: string): Promise<{ manifest: any; entrypoint?: string }> {
    const platform = process.platform === "win32" ? "WINDOWS" : "LINUX";
    const res = await axios.get(`${API_BASE}/games/${gameId}/distribution-manifest?platform=${platform}`, {
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
    const platform = process.platform === "win32" ? "WINDOWS" : "LINUX";
    const res = await axios.post(
      `${API_BASE}/games/${gameId}/chunks/download-urls`,
      { hashes, platform },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const urls = res.data?.data?.urls ?? res.data?.urls ?? [];
    const map = new Map<string, string>();
    for (const item of urls) {
      map.set(item.hash, item.url);
    }
    return map;
  }

  async installFromChunks(
    options: ChunkInstallOptions,
    installPath: string,
  ): Promise<{ entrypoint: string | null }> {
    const chunkDir = getChunksCacheDir();

    const fetchManifest = async (gameId: string) => {
      const result = await this.fetchManifest(gameId, options.token);
      saveManifest(gameId, result.manifest);
      return result;
    };

    const getDownloadUrls = async (gameId: string, hashes: string[]) => {
      return this.getDownloadUrls(gameId, options.token, hashes);
    };

    const downloadChunk = async (hash: string, url: string, destPath: string) => {
      ensureCacheDirs();
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        signal: options.signal,
      });

      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", (err) => {
          writer.close();
          reject(err);
        });
        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            writer.close();
            reject(new Error("Aborted"));
          });
        }
      });
    };

    const result = await runDownloadPipeline({
      gameId: options.gameId,
      installPath,
      chunkDir,
      fetchManifest,
      getDownloadUrls,
      downloadChunk,
      onProgress: (progress: number, downloadedCount: number, totalCount: number) => {
        options.onProgress?.(progress, downloadedCount, totalCount);
      }
    });

    log.info(`Chunk install complete for ${options.gameId}`);
    return { entrypoint: result.entrypoint || options.entrypoint || null };
  }

  /** Verify local install and re-download corrupted chunks only (repair). */
  async repair(gameId: string, token: string, installPath: string, signal?: AbortSignal): Promise<void> {
    const chunkDir = getChunksCacheDir();

    const fetchManifest = async (gId: string) => {
      return this.fetchManifest(gId, token);
    };

    const getDownloadUrls = async (gId: string, hashes: string[]) => {
      return this.getDownloadUrls(gId, token, hashes);
    };

    const downloadChunk = async (hash: string, url: string, destPath: string) => {
      ensureCacheDirs();
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        signal,
      });

      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", (err) => {
          writer.close();
          reject(err);
        });
        if (signal) {
          signal.addEventListener("abort", () => {
            writer.close();
            reject(new Error("Aborted"));
          });
        }
      });
    };

    await runDownloadPipeline({
      gameId,
      installPath,
      chunkDir,
      fetchManifest,
      getDownloadUrls,
      downloadChunk
    });

    log.info(`Repair complete for ${gameId}`);
  }
}

export const chunkDownloader = new ChunkDownloader();
